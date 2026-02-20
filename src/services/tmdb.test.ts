import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const get = vi.fn()
  const create = vi.fn(() => ({ get }))
  return { get, create }
})

vi.mock('axios', () => ({
  default: {
    create: mocks.create,
  },
  create: mocks.create,
}))

import { tmdb } from './tmdb'

describe('tmdb service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.create.mockReturnValue({ get: mocks.get })
  })

  it.each([
    { caseName: 'default week', timeWindow: undefined, expectedPath: '/trending/all/week' },
    { caseName: 'day window', timeWindow: 'day' as const, expectedPath: '/trending/all/day' },
  ])('gets trending for $caseName', async ({ timeWindow, expectedPath }) => {
    mocks.get.mockResolvedValue({
      data: {
        results: [{ id: 1, media_type: 'movie' }],
      },
    })

    const result = timeWindow ? await tmdb.getTrending(timeWindow) : await tmdb.getTrending()

    expect(mocks.get).toHaveBeenCalledWith(expectedPath)
    expect(result).toEqual([{ id: 1, media_type: 'movie' }])
  })

  it.each([
    {
      caseName: 'first person id',
      results: [{ id: 101 }, { id: 102 }],
      expected: 101,
    },
    {
      caseName: 'no people found',
      results: [],
      expected: null,
    },
  ])('searchPerson returns $caseName', async ({ results, expected }) => {
    mocks.get.mockResolvedValue({
      data: { results },
    })

    await expect(tmdb.searchPerson('tom cruise')).resolves.toBe(expected)
    expect(mocks.get).toHaveBeenCalledWith('/search/person', {
      params: { query: 'tom cruise' },
    })
  })

  it('search filters non movie/tv entries', async () => {
    mocks.get.mockResolvedValue({
      data: {
        results: [
          { id: 1, media_type: 'movie' },
          { id: 2, media_type: 'tv' },
          { id: 3, media_type: 'person' },
        ],
      },
    })

    const result = await tmdb.search('matrix')

    expect(result).toEqual([
      { id: 1, media_type: 'movie' },
      { id: 2, media_type: 'tv' },
    ])
  })

  it.each([
    { caseName: 'movie details', type: 'movie' as const, id: 10 },
    { caseName: 'tv details', type: 'tv' as const, id: 20 },
  ])('getDetails returns $caseName with media_type', async ({ type, id }) => {
    mocks.get.mockResolvedValue({
      data: { id, title: 'Title' },
    })

    const result = await tmdb.getDetails(id, type)

    expect(mocks.get).toHaveBeenCalledWith(`/${type}/${id}`, {
      params: {
        append_to_response: 'credits,videos,watch/providers',
      },
    })
    expect(result).toMatchObject({ id, media_type: type })
  })

  it('getSeasonDetails loads tv season endpoint', async () => {
    mocks.get.mockResolvedValue({
      data: { id: 1, episodes: [] },
    })

    await expect(tmdb.getSeasonDetails(33, 2)).resolves.toEqual({ id: 1, episodes: [] })
    expect(mocks.get).toHaveBeenCalledWith('/tv/33/season/2')
  })

  it.each([
    {
      caseName: 'fallback image for empty path',
      path: null,
      size: undefined,
      expected: 'https://via.placeholder.com/500x750?text=No+Image',
    },
    {
      caseName: 'default size image',
      path: '/poster.jpg',
      size: undefined,
      expected: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    },
    {
      caseName: 'custom size image',
      path: '/poster.jpg',
      size: 'w300' as const,
      expected: 'https://image.tmdb.org/t/p/w300/poster.jpg',
    },
  ])('getImageUrl handles $caseName', ({ path, size, expected }) => {
    const result = size ? tmdb.getImageUrl(path, size) : tmdb.getImageUrl(path)
    expect(result).toBe(expected)
  })

  it('getGenres combines and deduplicates movie/tv genres', async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: {
          genres: [
            { id: 1, name: 'Action' },
            { id: 2, name: 'Drama' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          genres: [
            { id: 2, name: 'Drama' },
            { id: 3, name: 'Comedy' },
          ],
        },
      })

    await expect(tmdb.getGenres()).resolves.toEqual([
      { id: 1, name: 'Action' },
      { id: 2, name: 'Drama' },
      { id: 3, name: 'Comedy' },
    ])
  })

  it.each([
    {
      caseName: 'movie discover default',
      filters: { with_genres: '28' },
      expectedPath: '/discover/movie',
      expectedMediaType: 'movie',
      expectedSortBy: 'popularity.desc',
    },
    {
      caseName: 'tv discover keeps explicit sort',
      filters: { media_type: 'tv', sort_by: 'vote_average.desc' },
      expectedPath: '/discover/tv',
      expectedMediaType: 'tv',
      expectedSortBy: 'vote_average.desc',
    },
  ])(
    'discover handles $caseName',
    async ({ filters, expectedPath, expectedMediaType, expectedSortBy }) => {
      mocks.get.mockResolvedValue({
        data: {
          results: [{ id: 100, title: 'X' }],
        },
      })

      const result = await tmdb.discover(filters)

      expect(mocks.get).toHaveBeenCalledWith(expectedPath, {
        params: expect.objectContaining({
          sort_by: expectedSortBy,
        }),
      })
      expect(result).toEqual([
        {
          id: 100,
          title: 'X',
          media_type: expectedMediaType,
        },
      ])
    },
  )
})
