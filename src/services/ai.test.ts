import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const generateContent = vi.fn()
  const getGenerativeModel = vi.fn(() => ({ generateContent }))
  const GoogleGenerativeAI = vi.fn(() => ({ getGenerativeModel }))
  const getGenres = vi.fn()
  return {
    generateContent,
    getGenerativeModel,
    GoogleGenerativeAI,
    getGenres,
  }
})

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mocks.GoogleGenerativeAI,
}))

vi.mock('./tmdb', () => ({
  tmdb: {
    getGenres: mocks.getGenres,
  },
}))

import { ai } from './ai'

describe('ai service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getGenres.mockResolvedValue([
      { id: 28, name: 'Action' },
      { id: 18, name: 'Drama' },
    ])
  })

  const strategyCases = [
    {
      caseName: 'search strategy',
      responseText: JSON.stringify({
        strategy: 'search',
        query: 'Harry Potter',
        media_type: 'movie',
        suggested_list_name: 'Saga Harry Potter',
      }),
      expectedStrategy: 'search',
    },
    {
      caseName: 'discover strategy',
      responseText: '```json\n{"strategy":"discover","media_type":"movie","suggested_list_name":"Terror"}\n```',
      expectedStrategy: 'discover',
    },
    {
      caseName: 'person strategy',
      responseText: JSON.stringify({
        strategy: 'person',
        person_name: 'Tom Cruise',
        role: 'cast',
        media_type: 'movie',
        suggested_list_name: 'Filmes com Tom Cruise',
      }),
      expectedStrategy: 'person',
    },
  ]

  it.each(strategyCases)('parses $caseName response', async ({ responseText, expectedStrategy }) => {
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () => responseText,
      },
    })

    const result = await ai.getSuggestions('filmes para o fim de semana')

    expect(result.strategy).toBe(expectedStrategy)
    expect(mocks.getGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-2.0-flash' })
    expect(mocks.generateContent).toHaveBeenCalledOnce()
  })

  it('includes genres list and user request in the generated prompt', async () => {
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            strategy: 'discover',
            media_type: 'movie',
            suggested_list_name: 'Lista',
          }),
      },
    })

    await ai.getSuggestions('ação dos anos 90')

    const [prompt] = mocks.generateContent.mock.calls[0] as [string]
    expect(prompt).toContain('Available Genres (ID:Name): 28:Action, 18:Drama')
    expect(prompt).toContain('User Request: "ação dos anos 90"')
  })

  it.each([
    {
      caseName: 'invalid json response',
      setup: () =>
        mocks.generateContent.mockResolvedValue({
          response: {
            text: () => '{not valid json}',
          },
        }),
      expectedError: /JSON/,
    },
    {
      caseName: 'genre loading error',
      setup: () => mocks.getGenres.mockRejectedValue(new Error('tmdb failed')),
      expectedError: 'tmdb failed',
    },
    {
      caseName: 'gemini request error',
      setup: () => mocks.generateContent.mockRejectedValue(new Error('gemini failed')),
      expectedError: 'gemini failed',
    },
  ])('throws and logs on $caseName', async ({ setup, expectedError }) => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    setup()

    await expect(ai.getSuggestions('prompt')).rejects.toThrow(expectedError)
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('logs warning when API key is missing at module load', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_GEMINI_API_KEY', '')
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await import('./ai')

    expect(consoleErrorSpy).toHaveBeenCalledWith('VITE_GEMINI_API_KEY is missing')

    consoleErrorSpy.mockRestore()
    vi.unstubAllEnvs()
  })
})
