// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listService } from '../services/listService'
import { useStore } from './useStore'

vi.mock('../services/listService', () => ({
  listService: {
    getLists: vi.fn(),
    createList: vi.fn(),
    deleteList: vi.fn(),
    updateList: vi.fn(),
  },
}))

vi.mock('../services/userContent', () => ({
  userContentService: {
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn(),
    markAsWatched: vi.fn(),
    markAsUnwatched: vi.fn(),
    markSeasonAsWatched: vi.fn(),
    markSeasonAsUnwatched: vi.fn(),
    saveSeriesMetadata: vi.fn(),
    syncLocalData: vi.fn(),
    getUserContent: vi.fn().mockResolvedValue({
      watchlist: [],
      watchedIds: [],
      watchedEpisodes: {},
      seriesMetadata: {},
    }),
  },
}))

type MockFn = ReturnType<typeof vi.fn>

const mockedListService = listService as unknown as {
  deleteList: MockFn
  updateList: MockFn
}

const baselineState = {
  myList: [],
  watchedIds: [],
  watchedEpisodes: {},
  seriesMetadata: {},
  lists: [],
}

describe('useStore shared lists actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useStore.setState(baselineState)
  })

  it('removes list from state after deleteList', async () => {
    mockedListService.deleteList.mockResolvedValue(undefined)

    useStore.setState({
      lists: [
        {
          id: 'list-1',
          name: 'List 1',
          owner_id: 'owner-1',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          role: 'owner',
        },
        {
          id: 'list-2',
          name: 'List 2',
          owner_id: 'owner-1',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          role: 'owner',
        },
      ],
    })

    await useStore.getState().deleteList('list-1')

    expect(mockedListService.deleteList).toHaveBeenCalledWith('list-1')
    expect(useStore.getState().lists).toEqual([
      {
        id: 'list-2',
        name: 'List 2',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role: 'owner',
      },
    ])
  })

  it('updates list name in state after updateList', async () => {
    mockedListService.updateList.mockResolvedValue(undefined)

    useStore.setState({
      lists: [
        {
          id: 'list-1',
          name: 'Old Name',
          owner_id: 'owner-1',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          role: 'owner',
        },
      ],
    })

    await useStore.getState().updateList('list-1', 'New Name')

    expect(mockedListService.updateList).toHaveBeenCalledWith('list-1', 'New Name')
    expect(useStore.getState().lists[0]?.name).toBe('New Name')
  })
})
