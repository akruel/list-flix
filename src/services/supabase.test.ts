import { beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase } from '../lib/supabase'
import { supabaseService } from './supabase'

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

type MockFn = ReturnType<typeof vi.fn>

const mockedSupabase = supabase as unknown as {
  from: MockFn
}

function createQueryResult<T>(result: T) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockResolvedValue(result)
  return builder
}

describe('supabaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    {
      caseName: 'movie item',
      rows: [{ content_id: 10, content_type: 'movie' }],
      expected: [{ id: 10, type: 'movie' }],
    },
    {
      caseName: 'tv item',
      rows: [{ content_id: 20, content_type: 'tv' }],
      expected: [{ id: 20, type: 'tv' }],
    },
    {
      caseName: 'mixed items',
      rows: [
        { content_id: 10, content_type: 'movie' },
        { content_id: 20, content_type: 'tv' },
      ],
      expected: [
        { id: 10, type: 'movie' },
        { id: 20, type: 'tv' },
      ],
    },
  ])('maps shared list for $caseName', async ({ rows, expected }) => {
    const builder = createQueryResult({
      data: rows,
      error: null,
    })
    mockedSupabase.from.mockReturnValue(builder)

    await expect(supabaseService.getSharedList('list-1')).resolves.toEqual(expected)

    expect(mockedSupabase.from).toHaveBeenCalledWith('list_items')
    expect(builder.select).toHaveBeenCalledWith('content_id, content_type')
    expect(builder.eq).toHaveBeenCalledWith('list_id', 'list-1')
  })

  it('throws when query fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const builder = createQueryResult({
      data: null,
      error: new Error('load failed'),
    })
    mockedSupabase.from.mockReturnValue(builder)

    await expect(supabaseService.getSharedList('list-1')).rejects.toThrow('load failed')
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
