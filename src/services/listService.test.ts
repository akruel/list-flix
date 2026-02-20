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
    match: MockFn
    single: MockFn
    then: Promise<T>['then']
  } = {
    eq: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    match: vi.fn(),
    single: vi.fn(),
    then: vi.fn(),
  }

  builder.eq.mockReturnValue(builder)
  builder.select.mockReturnValue(builder)
  builder.insert.mockReturnValue(builder)
  builder.update.mockReturnValue(builder)
  builder.delete.mockReturnValue(builder)
  builder.match.mockReturnValue(builder)
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

  const roleCases = [
    { caseName: 'owner role', role: 'owner' as const },
    { caseName: 'editor role', role: 'editor' as const },
    { caseName: 'viewer role', role: 'viewer' as const },
  ]

  it.each(roleCases)('maps current user in getLists for $caseName', async ({ role }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    const select = vi.fn().mockResolvedValue({
      data: [
        {
          id: `list-${role}`,
          name: role,
          owner_id: 'owner-1',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          list_members: [
            { user_id: 'user-1', role },
            { user_id: 'owner-1', role: 'owner' },
          ],
        },
      ],
      error: null,
    })

    mockedSupabase.from.mockReturnValue({ select })

    const [list] = await listService.getLists()

    expect(list?.role).toBe(role)
  })

  it('defaults to viewer when current user membership is missing', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    const select = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'list-1',
          name: 'No membership',
          owner_id: 'owner-1',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          list_members: [{ user_id: 'owner-1', role: 'owner' }],
        },
      ],
      error: null,
    })

    mockedSupabase.from.mockReturnValue({ select })

    const [list] = await listService.getLists()

    expect(list?.role).toBe('viewer')
  })

  it('throws when getLists has no authenticated user', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    })

    await expect(listService.getLists()).rejects.toThrow('User not authenticated')
  })

  it('throws when getLists returns a query error', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    const select = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('boom'),
    })
    mockedSupabase.from.mockReturnValue({ select })

    await expect(listService.getLists()).rejects.toThrow('boom')
  })

  it('creates list and updates member_name with display_name', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: { display_name: 'Alice' },
        },
      },
    })

    const listRow = {
      id: 'list-1',
      name: 'Shared',
      owner_id: 'owner-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    }

    const createBuilder = createThenableBuilder({
      data: listRow,
      error: null,
    })

    const memberBuilder = createThenableBuilder({
      data: null,
      error: null,
    })

    const update = vi.fn().mockReturnValue(memberBuilder)
    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'lists') {
        return {
          insert: vi.fn().mockReturnValue(createBuilder),
        }
      }

      if (table === 'list_members') {
        return { update }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const created = await listService.createList('Shared')

    expect(created.id).toBe('list-1')
    expect(update).toHaveBeenCalledWith({ member_name: 'Alice' })
  })

  it.each([
    {
      caseName: 'full_name fallback',
      userMetadata: { full_name: 'Bob Full' },
      expectedDisplayName: 'Bob Full',
    },
    {
      caseName: 'name fallback',
      userMetadata: { name: 'Carol Name' },
      expectedDisplayName: 'Carol Name',
    },
  ])('uses metadata fallback for $caseName in createList', async ({ userMetadata, expectedDisplayName }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: userMetadata,
        },
      },
    })

    const createBuilder = createThenableBuilder({
      data: {
        id: 'list-1',
        name: 'Shared',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      error: null,
    })
    const memberBuilder = createThenableBuilder({
      data: null,
      error: null,
    })
    const update = vi.fn().mockReturnValue(memberBuilder)

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'lists') {
        return {
          insert: vi.fn().mockReturnValue(createBuilder),
        }
      }
      if (table === 'list_members') {
        return { update }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await listService.createList('Shared')

    expect(update).toHaveBeenCalledWith({ member_name: expectedDisplayName })
  })

  it('creates list without touching list_members when display name is missing', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: {},
        },
      },
    })

    const createBuilder = createThenableBuilder({
      data: {
        id: 'list-1',
        name: 'Shared',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      error: null,
    })

    const update = vi.fn()

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'lists') {
        return {
          insert: vi.fn().mockReturnValue(createBuilder),
        }
      }
      if (table === 'list_members') {
        return { update }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await listService.createList('Shared')

    expect(update).not.toHaveBeenCalled()
  })

  it('throws when createList fails on insert', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
    })

    const createBuilder = createThenableBuilder({
      data: null,
      error: new Error('insert failed'),
    })

    mockedSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue(createBuilder),
    })

    await expect(listService.createList('Shared')).rejects.toThrow('insert failed')
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

  it('defaults role to viewer in getListDetails when current membership is missing', async () => {
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
      data: [],
      error: null,
    })

    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'viewer-1' },
      },
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

    const details = await listService.getListDetails('list-1')

    expect(details.list.role).toBe('viewer')
  })

  it('throws when getListDetails fails loading list', async () => {
    const listBuilder = createThenableBuilder({
      data: null,
      error: new Error('list failed'),
    })

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === 'lists') {
        return {
          select: vi.fn().mockReturnValue(listBuilder),
        }
      }

      return {
        select: vi.fn().mockReturnValue(createThenableBuilder({ data: [], error: null })),
      }
    })

    await expect(listService.getListDetails('list-1')).rejects.toThrow('list failed')
  })

  it('throws when getListDetails fails loading items', async () => {
    const listBuilder = createThenableBuilder({
      data: {
        id: 'list-1',
        name: 'Shared list',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        list_members: [],
      },
      error: null,
    })
    const itemsBuilder = createThenableBuilder({
      data: null,
      error: new Error('items failed'),
    })

    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
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

    await expect(listService.getListDetails('list-1')).rejects.toThrow('items failed')
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

  it('throws in joinList when there is no authenticated user', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    })

    await expect(listService.joinList('list-1', 'Alice')).rejects.toThrow('User not authenticated')
  })

  const joinRoleCases = [
    { caseName: 'editor invite', role: 'editor' as const },
    { caseName: 'viewer invite', role: 'viewer' as const },
  ]

  it.each(joinRoleCases)('inserts new membership for $caseName', async ({ role }) => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    const existingBuilder = createThenableBuilder({
      data: null,
      error: null,
    })
    const inserted: Array<Record<string, unknown>> = []
    const insert = vi.fn().mockImplementation((payload: Array<Record<string, unknown>>) => {
      inserted.push(...payload)
      return createThenableBuilder({ data: null, error: null })
    })

    mockedSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(existingBuilder),
      insert,
    })

    await listService.joinList('list-1', 'Alice', role)

    expect(insert).toHaveBeenCalledOnce()
    expect(inserted[0]).toMatchObject({
      list_id: 'list-1',
      user_id: 'user-1',
      role,
      member_name: 'Alice',
    })
  })

  it('throws when joining list fails', async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    const existingBuilder = createThenableBuilder({
      data: null,
      error: null,
    })
    const insertBuilder = createThenableBuilder({
      data: null,
      error: new Error('join failed'),
    })

    mockedSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(existingBuilder),
      insert: vi.fn().mockReturnValue(insertBuilder),
    })

    await expect(listService.joinList('list-1', 'Alice')).rejects.toThrow('join failed')
  })

  const shareRoleCases = [
    { caseName: 'viewer share', role: 'viewer' as const },
    { caseName: 'editor share', role: 'editor' as const },
  ]

  it.each(shareRoleCases)('creates share URL for $caseName', ({ role }) => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://listflix.local',
      },
    })

    expect(listService.getShareUrl('list-1', role)).toBe(
      `https://listflix.local/lists/list-1/join?role=${role}`,
    )
  })

  it('returns list name from RPC', async () => {
    mockedSupabase.rpc.mockResolvedValue({
      data: 'My List',
      error: null,
    })

    await expect(listService.getListName('list-1')).resolves.toBe('My List')
    expect(mockedSupabase.rpc).toHaveBeenCalledWith('get_list_name', { list_id: 'list-1' })
  })

  it('throws when getListName RPC fails', async () => {
    mockedSupabase.rpc.mockResolvedValue({
      data: null,
      error: new Error('rpc failed'),
    })

    await expect(listService.getListName('list-1')).rejects.toThrow('rpc failed')
  })

  it.each([
    { caseName: 'movie memberships', contentType: 'movie' as const },
    { caseName: 'tv memberships', contentType: 'tv' as const },
  ])('maps list memberships for $caseName', async ({ contentType }) => {
    const builder = createThenableBuilder({
      data: [
        { list_id: 'list-a', id: 'item-a' },
        { list_id: 'list-b', id: 'item-b' },
      ],
      error: null,
    })

    mockedSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(builder),
    })

    await expect(listService.getListsContainingContent(10, contentType)).resolves.toEqual({
      'list-a': 'item-a',
      'list-b': 'item-b',
    })
  })

  it('throws when getListsContainingContent fails', async () => {
    const builder = createThenableBuilder({
      data: null,
      error: new Error('membership failed'),
    })

    mockedSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(builder),
    })

    await expect(listService.getListsContainingContent(10, 'movie')).rejects.toThrow(
      'membership failed',
    )
  })

  it('returns an empty map when getListsContainingContent returns null data', async () => {
    const builder = createThenableBuilder({
      data: null,
      error: null,
    })

    mockedSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(builder),
    })

    await expect(listService.getListsContainingContent(10, 'movie')).resolves.toEqual({})
  })

  it.each([
    {
      caseName: 'add list item',
      run: () =>
        listService.addListItem('list-1', {
          id: 100,
          media_type: 'movie',
          title: 'Movie',
        }),
      table: 'list_items',
      method: 'insert',
    },
    {
      caseName: 'remove list item',
      run: () => listService.removeListItem('item-1'),
      table: 'list_items',
      method: 'delete',
    },
    {
      caseName: 'remove list member',
      run: () => listService.removeListMember('list-1', 'user-1'),
      table: 'list_members',
      method: 'delete',
    },
    {
      caseName: 'delete list',
      run: () => listService.deleteList('list-1'),
      table: 'lists',
      method: 'delete',
    },
  ])('runs query for $caseName', async ({ run, table, method }) => {
    const builder = createThenableBuilder({
      data: null,
      error: null,
    })

    const chain = {
      insert: vi.fn().mockReturnValue(builder),
      delete: vi.fn().mockReturnValue(builder),
    }
    mockedSupabase.from.mockReturnValue(chain)

    await run()

    expect(mockedSupabase.from).toHaveBeenCalledWith(table)
    expect(chain[method as keyof typeof chain]).toHaveBeenCalled()
  })

  it.each([
    {
      caseName: 'add list item error',
      run: () =>
        listService.addListItem('list-1', {
          id: 100,
          media_type: 'movie',
          title: 'Movie',
        }),
      table: 'list_items',
      method: 'insert',
      expectedMessage: 'add failed',
    },
    {
      caseName: 'remove list item error',
      run: () => listService.removeListItem('item-1'),
      table: 'list_items',
      method: 'delete',
      expectedMessage: 'remove item failed',
    },
    {
      caseName: 'remove list member error',
      run: () => listService.removeListMember('list-1', 'user-1'),
      table: 'list_members',
      method: 'delete',
      expectedMessage: 'remove member failed',
    },
    {
      caseName: 'delete list error',
      run: () => listService.deleteList('list-1'),
      table: 'lists',
      method: 'delete',
      expectedMessage: 'delete list failed',
    },
  ])('throws for $caseName', async ({ run, table, method, expectedMessage }) => {
    const builder = createThenableBuilder({
      data: null,
      error: new Error(expectedMessage),
    })

    const chain = {
      insert: vi.fn().mockReturnValue(builder),
      delete: vi.fn().mockReturnValue(builder),
    }
    mockedSupabase.from.mockReturnValue(chain)

    await expect(run()).rejects.toThrow(expectedMessage)
    expect(mockedSupabase.from).toHaveBeenCalledWith(table)
    expect(chain[method as keyof typeof chain]).toHaveBeenCalled()
  })

  it('updates list name and throws on update failure', async () => {
    const okBuilder = createThenableBuilder({
      data: null,
      error: null,
    })

    mockedSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue(okBuilder),
    })

    await expect(listService.updateList('list-1', 'New')).resolves.toBeUndefined()

    const failBuilder = createThenableBuilder({
      data: null,
      error: new Error('update failed'),
    })
    mockedSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue(failBuilder),
    })
    await expect(listService.updateList('list-1', 'New')).rejects.toThrow('update failed')
  })
})
