import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('lib/supabase', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('throws when required supabase env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    await expect(import('./supabase')).rejects.toThrow('Missing Supabase environment variables')
  })

  it('creates and exports supabase client when env vars are present', async () => {
    const createClient = vi.fn(() => ({ __client: true }))
    vi.doMock('@supabase/supabase-js', () => ({
      createClient,
    }))

    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.local')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')

    const module = await import('./supabase')

    expect(createClient).toHaveBeenCalledWith('https://supabase.local', 'anon-key')
    expect(module.supabase).toEqual({ __client: true })
  })
})
