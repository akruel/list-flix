// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listService } from '../services/listService'
import { userContentService } from '../services/userContent'
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
  getLists: MockFn
  createList: MockFn
  deleteList: MockFn
  updateList: MockFn
}

const mockedUserContentService = userContentService as unknown as {
  addToWatchlist: MockFn
  removeFromWatchlist: MockFn
  markAsWatched: MockFn
  markAsUnwatched: MockFn
  markSeasonAsWatched: MockFn
  markSeasonAsUnwatched: MockFn
  saveSeriesMetadata: MockFn
  syncLocalData: MockFn
  getUserContent: MockFn
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
    useStore.setState({ ...baselineState })
  })

  it.each([
    { caseName: 'movie item', mediaType: 'movie' as const },
    { caseName: 'tv item', mediaType: 'tv' as const },
  ])('adds to watchlist for $caseName', ({ mediaType }) => {
    useStore.getState().addToList({
      id: 10,
      media_type: mediaType,
      title: 'Item',
    })

    expect(useStore.getState().myList).toEqual([
      {
        id: 10,
        media_type: mediaType,
        title: 'Item',
      },
    ])
    expect(mockedUserContentService.addToWatchlist).toHaveBeenCalledWith({
      id: 10,
      media_type: mediaType,
      title: 'Item',
    })
  })

  it('does not add duplicate item to watchlist', () => {
    useStore.setState({
      myList: [{ id: 10, media_type: 'movie', title: 'Item' }],
    })

    useStore.getState().addToList({
      id: 10,
      media_type: 'movie',
      title: 'Item',
    })

    expect(useStore.getState().myList).toHaveLength(1)
    expect(mockedUserContentService.addToWatchlist).not.toHaveBeenCalled()
  })

  it('removes from watchlist and calls service', () => {
    useStore.setState({
      myList: [{ id: 10, media_type: 'movie', title: 'Item' }],
    })

    useStore.getState().removeFromList(10)

    expect(useStore.getState().myList).toEqual([])
    expect(mockedUserContentService.removeFromWatchlist).toHaveBeenCalledWith(10)
  })

  it('checks list membership with isInList', () => {
    useStore.setState({
      myList: [{ id: 10, media_type: 'movie', title: 'Item' }],
    })

    expect(useStore.getState().isInList(10)).toBe(true)
    expect(useStore.getState().isInList(999)).toBe(false)
  })

  it.each([
    {
      caseName: 'movie metadata from myList',
      myList: [{ id: 20, media_type: 'movie' as const, title: 'Movie' }],
      id: 20,
      expectedType: 'movie',
    },
    {
      caseName: 'tv metadata from myList',
      myList: [{ id: 30, media_type: 'tv' as const, name: 'Show' }],
      id: 30,
      expectedType: 'tv',
    },
    {
      caseName: 'fallback movie when item is missing',
      myList: [],
      id: 99,
      expectedType: 'movie',
    },
  ])('markAsWatched handles $caseName', ({ myList, id, expectedType }) => {
    useStore.setState({
      myList,
      watchedIds: [],
    })

    useStore.getState().markAsWatched(id)

    expect(useStore.getState().watchedIds).toContain(id)
    expect(mockedUserContentService.markAsWatched).toHaveBeenCalledWith(
      id,
      expectedType,
      expect.any(Object),
    )
  })

  it('does not duplicate watched ids', () => {
    useStore.setState({
      watchedIds: [10],
    })

    useStore.getState().markAsWatched(10)

    expect(useStore.getState().watchedIds).toEqual([10])
    expect(mockedUserContentService.markAsWatched).not.toHaveBeenCalled()
  })

  it('markAsUnwatched removes watched id and calls service', () => {
    useStore.setState({
      watchedIds: [10, 20],
    })

    useStore.getState().markAsUnwatched(10)

    expect(useStore.getState().watchedIds).toEqual([20])
    expect(mockedUserContentService.markAsUnwatched).toHaveBeenCalledWith(10)
  })

  it('isWatched reflects watched ids', () => {
    useStore.setState({
      watchedIds: [10],
    })

    expect(useStore.getState().isWatched(10)).toBe(true)
    expect(useStore.getState().isWatched(20)).toBe(false)
  })

  it('marks and unmarks episodes as watched', () => {
    useStore.getState().markEpisodeAsWatched(1, 101, 2, 3)

    expect(useStore.getState().watchedEpisodes[1]?.[101]).toEqual({
      season_number: 2,
      episode_number: 3,
    })
    expect(mockedUserContentService.markAsWatched).toHaveBeenCalledWith(101, 'episode', {
      show_id: 1,
      season_number: 2,
      episode_number: 3,
    })

    useStore.getState().markEpisodeAsUnwatched(1, 101)
    expect(useStore.getState().watchedEpisodes[1]).toEqual({})
    expect(mockedUserContentService.markAsUnwatched).toHaveBeenCalledWith(101)
  })

  it('markEpisodeAsUnwatched handles missing show bucket', () => {
    useStore.setState({
      watchedEpisodes: {},
    })

    useStore.getState().markEpisodeAsUnwatched(99, 1001)

    expect(useStore.getState().watchedEpisodes[99]).toEqual({})
    expect(mockedUserContentService.markAsUnwatched).toHaveBeenCalledWith(1001)
  })

  it('checks episode watched status', () => {
    useStore.setState({
      watchedEpisodes: {
        1: {
          101: { season_number: 1, episode_number: 1 },
        },
      },
    })

    expect(useStore.getState().isEpisodeWatched(1, 101)).toBe(true)
    expect(useStore.getState().isEpisodeWatched(1, 999)).toBe(false)
    expect(useStore.getState().isEpisodeWatched(99, 101)).toBe(false)
  })

  it('does not re-mark an already watched episode', () => {
    useStore.setState({
      watchedEpisodes: {
        1: {
          101: { season_number: 2, episode_number: 1 },
        },
      },
    })

    useStore.getState().markEpisodeAsWatched(1, 101, 2, 1)

    expect(mockedUserContentService.markAsWatched).not.toHaveBeenCalled()
  })

  it('marks and unmarks a full season', () => {
    const episodes = [
      {
        id: 101,
        season_number: 1,
        episode_number: 1,
      },
      {
        id: 102,
        season_number: 1,
        episode_number: 2,
      },
    ]

    useStore.setState({
      watchedEpisodes: {
        1: {
          201: { season_number: 2, episode_number: 1 },
        },
      },
    })

    useStore.getState().markSeasonAsWatched(1, 1, episodes as never)

    expect(mockedUserContentService.markSeasonAsWatched).toHaveBeenCalledWith(1, 1, episodes)
    expect(useStore.getState().watchedEpisodes[1]?.[101]).toEqual({
      season_number: 1,
      episode_number: 1,
    })

    useStore.getState().markSeasonAsUnwatched(1, 1)
    expect(mockedUserContentService.markSeasonAsUnwatched).toHaveBeenCalledWith(1, 1)
    expect(useStore.getState().watchedEpisodes[1]?.[201]).toEqual({
      season_number: 2,
      episode_number: 1,
    })
    expect(useStore.getState().watchedEpisodes[1]?.[101]).toBeUndefined()
  })

  it('markSeasonAsWatched initializes show bucket when absent', () => {
    useStore.setState({
      watchedEpisodes: {},
    })

    useStore.getState().markSeasonAsWatched(
      5,
      3,
      [
        { id: 301, season_number: 3, episode_number: 1 },
      ] as never,
    )

    expect(useStore.getState().watchedEpisodes[5]?.[301]).toEqual({
      season_number: 3,
      episode_number: 1,
    })
  })

  it('markSeasonAsUnwatched handles missing show bucket', () => {
    useStore.setState({
      watchedEpisodes: {},
    })

    useStore.getState().markSeasonAsUnwatched(5, 3)

    expect(useStore.getState().watchedEpisodes[5]).toEqual({})
    expect(mockedUserContentService.markSeasonAsUnwatched).toHaveBeenCalledWith(5, 3)
  })

  it.each([
    {
      caseName: 'season progress counts only matching season',
      watchedEpisodes: {
        1: {
          100: { season_number: 1, episode_number: 1 },
          200: { season_number: 2, episode_number: 1 },
        },
      },
      seasonNumber: 1,
      expected: 1,
    },
    {
      caseName: 'series progress excludes specials',
      watchedEpisodes: {
        1: {
          100: { season_number: 0, episode_number: 1 },
          200: { season_number: 1, episode_number: 1 },
          300: { season_number: 2, episode_number: 1 },
        },
      },
      seasonNumber: 999,
      expected: 2,
    },
  ])('computes progress for $caseName', ({ watchedEpisodes, seasonNumber, expected }) => {
    useStore.setState({
      watchedEpisodes,
    })

    if (seasonNumber === 999) {
      expect(useStore.getState().getSeriesProgress(1)).toEqual({ watchedCount: expected })
    } else {
      expect(useStore.getState().getSeasonProgress(1, seasonNumber)).toEqual({
        watchedCount: expected,
      })
    }
  })

  it('returns zero progress when show has no watched episodes', () => {
    useStore.setState({
      watchedEpisodes: {},
    })

    expect(useStore.getState().getSeasonProgress(999, 1)).toEqual({ watchedCount: 0 })
    expect(useStore.getState().getSeriesProgress(999)).toEqual({ watchedCount: 0 })
  })

  it('saveSeriesMetadata updates state and syncs remote cache', () => {
    useStore.getState().saveSeriesMetadata(1, {
      total_episodes: 10,
      number_of_seasons: 2,
    })

    expect(useStore.getState().seriesMetadata[1]).toEqual({
      total_episodes: 10,
      number_of_seasons: 2,
    })
    expect(useStore.getState().getSeriesMetadata(1)).toEqual({
      total_episodes: 10,
      number_of_seasons: 2,
    })
    expect(mockedUserContentService.saveSeriesMetadata).toHaveBeenCalledWith(1, {
      total_episodes: 10,
      number_of_seasons: 2,
    })
  })

  it('syncWithSupabase uploads local state and refreshes from remote source', async () => {
    mockedUserContentService.getUserContent.mockResolvedValue({
      watchlist: [{ id: 1, media_type: 'movie', title: 'Movie' }],
      watchedIds: [1],
      watchedEpisodes: { 5: { 55: { season_number: 1, episode_number: 1 } } },
      seriesMetadata: { 5: { total_episodes: 8, number_of_seasons: 1 } },
    })

    useStore.setState({
      myList: [{ id: 9, media_type: 'movie', title: 'Local' }],
      watchedIds: [9],
      watchedEpisodes: { 9: { 99: { season_number: 1, episode_number: 1 } } },
    })

    await useStore.getState().syncWithSupabase()

    expect(mockedUserContentService.syncLocalData).toHaveBeenCalledWith(
      [{ id: 9, media_type: 'movie', title: 'Local' }],
      [9],
      { 9: { 99: { season_number: 1, episode_number: 1 } } },
    )
    expect(useStore.getState().myList).toEqual([{ id: 1, media_type: 'movie', title: 'Movie' }])
    expect(useStore.getState().watchedIds).toEqual([1])
  })

  it('fetchLists loads lists from service', async () => {
    mockedListService.getLists.mockResolvedValue([
      {
        id: 'list-1',
        name: 'Fetched',
        owner_id: 'owner-1',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        role: 'owner',
      },
    ])

    await useStore.getState().fetchLists()

    expect(useStore.getState().lists).toHaveLength(1)
  })

  it('createList returns created list and triggers fetchLists', async () => {
    mockedListService.createList.mockResolvedValue({
      id: 'list-1',
      name: 'New',
      owner_id: 'owner-1',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      role: 'owner',
    })
    mockedListService.getLists.mockResolvedValue([])

    const created = await useStore.getState().createList('New')

    expect(created.name).toBe('New')
    expect(mockedListService.createList).toHaveBeenCalledWith('New')
    expect(mockedListService.getLists).toHaveBeenCalled()
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

  it.each([
    { caseName: 'owner list', role: 'owner' as const },
    { caseName: 'editor list', role: 'editor' as const },
    { caseName: 'viewer list', role: 'viewer' as const },
  ])('updates list name in state for $caseName', async ({ role }) => {
    mockedListService.updateList.mockResolvedValue(undefined)

    useStore.setState({
      lists: [
        {
          id: 'list-1',
          name: 'Old Name',
          owner_id: 'owner-1',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          role,
        },
      ],
    })

    await useStore.getState().updateList('list-1', 'New Name')

    expect(mockedListService.updateList).toHaveBeenCalledWith('list-1', 'New Name')
    expect(useStore.getState().lists[0]?.name).toBe('New Name')
  })

  it('updateList keeps non-targeted lists unchanged', async () => {
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
        {
          id: 'list-2',
          name: 'Keep Me',
          owner_id: 'owner-1',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          role: 'viewer',
        },
      ],
    })

    await useStore.getState().updateList('list-1', 'New Name')

    expect(useStore.getState().lists).toEqual([
      expect.objectContaining({ id: 'list-1', name: 'New Name' }),
      expect.objectContaining({ id: 'list-2', name: 'Keep Me' }),
    ])
  })
})
