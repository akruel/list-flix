import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSeasonProgress } from './useSeasonProgress'

const mocks = vi.hoisted(() => ({
  useStore: vi.fn(),
  getSeasonProgress: vi.fn(),
}))

vi.mock('../store/useStore', () => ({
  useStore: () => mocks.useStore(),
}))

describe('useSeasonProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useStore.mockReturnValue({
      getSeasonProgress: mocks.getSeasonProgress,
    })
  })

  it.each([
    {
      caseName: 'normal percentage',
      watchedCount: 4,
      totalEpisodes: 10,
      expectedPercentage: 40,
    },
    {
      caseName: 'rounded percentage',
      watchedCount: 1,
      totalEpisodes: 3,
      expectedPercentage: 33,
    },
    {
      caseName: 'zero total episodes',
      watchedCount: 4,
      totalEpisodes: 0,
      expectedPercentage: 0,
    },
  ])(
    'returns progress for $caseName',
    ({ watchedCount, totalEpisodes, expectedPercentage }) => {
      mocks.getSeasonProgress.mockReturnValue({ watchedCount })

      const { result } = renderHook(() => useSeasonProgress(100, 2, totalEpisodes))

      expect(mocks.getSeasonProgress).toHaveBeenCalledWith(100, 2)
      expect(result.current).toEqual({
        watchedCount,
        totalCount: totalEpisodes,
        percentage: expectedPercentage,
      })
    },
  )
})
