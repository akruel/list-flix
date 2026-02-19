import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase } from '../lib/supabase'
import { listService } from './listService'

vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    },
  }
})

type MockFn = ReturnType<typeof vi.fn>

const mockedSupabase = supabase as unknown as {
  auth: { getUser: MockFn }
  from: MockFn
  rpc: MockFn
}

function createThenableBuilder<T>(result: T) {
  const builder: {
    eq: MockFn
    select: MockFn
    insert: MockFn
    update: MockFn
    delete: MockFn
    single: MockFn
    then: Promise<T>['then']
  } = {
    eq: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  }

  builder.eq.mockReturnValue(builder)
  builder.select.mockReturnValue(builder)
  builder.insert.mockReturnValue(builder)
  builder.update.mockReturnValue(builder)
  builder.delete.mockReturnValue(builder)
  builder.single.mockResolvedValue(result)
  builder.then = (onFulfilled, onRejected) => Promise.resolve(result).then(onFulfilled, onRejected)

  return builder
}

describe('listService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps current user roles in getLists', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    const select = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'list-1',
          name: 'Editors',
          owner_id: 'owner-1',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          list_members: [
            { user_id: 'user-1', role: 'editor' },
            { user_id: 'owner-1', role: 'owner' },
          ],
        },
        {
          id: 'list-2',
          name: 'Viewers',
          owner_id: 'owner-2',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          list_members: [{ user_id: 'owner-2', role: 'owner' }],
        },
      ],
      error: null,
    })

    mockedSupabase.from.mockReturnValue({ select })

    const lists = await listService.getLists()

    expect(lists).toHaveLength(2)
    expect(lists[0]?.role).toBe('editor')
    expect(lists[1]?.role).toBe('viewer')
  })

  it('maps current user role in getListDetails', async () => {
    const listBuilder = createThenableBuilder({
      data: {
        id: 'list-1',
        name: 'Shared list',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        list_members: [
          {
            list_id: 'list-1',
            user_id: 'viewer-1',
            role: 'viewer',
            member_name: 'Viewer',
            created_at: '2026-01-01',
          },
          {
            list_id: 'list-1',
            user_id: 'owner-1',
            role: 'owner',
            member_name: 'Owner',
            created_at: '2026-01-01',
          },
        ],
      },
      error: null,
    })

    const itemsBuilder = createThenableBuilder({
      data: [
        {
          id: 'item-1',
          list_id: 'list-1',
          content_id: 100,
          content_type: 'movie',
          added_by: 'owner-1',
          created_at: '2026-01-01',
        },
      ],
      error: null,
    })

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'lists') {
        return {
          select: vi.fn().mockReturnValue(listBuilder),
        }
      }

      if (table === 'list_items') {
        return {
          select: vi.fn().mockReturnValue(itemsBuilder),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'viewer-1' },
      },
    })

    const details = await listService.getListDetails('list-1')

    expect(details.list.role).toBe('viewer')
    expect(details.items).toHaveLength(1)
    expect(details.members).toHaveLength(2)
  })

  it('does not insert duplicate membership in joinList', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    const existingBuilder = createThenableBuilder({
      data: { role: 'viewer' },
      error: null,
    })

    const insert = vi.fn()
    mockedSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(existingBuilder),
      insert,
    })

    await listService.joinList('list-1', 'Alice', 'viewer')

    expect(insert).not.toHaveBeenCalled()
  })

  it('creates a share URL using current origin', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://listflix.local',
      },
    })

    expect(listService.getShareUrl('list-1', 'editor')).toBe(
      'https://listflix.local/lists/list-1/join?role=editor',
    )
  })
})
