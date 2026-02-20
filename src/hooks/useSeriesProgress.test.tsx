import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useSeriesProgress } from './useSeriesProgress'

const mocks = vi.hoisted(() => ({
  useStore: vi.fn(),
  getSeriesProgress: vi.fn(),
}))

vi.mock('../store/useStore', () => ({
  useStore: () => mocks.useStore(),
}))

describe('useSeriesProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useStore.mockReturnValue({
      getSeriesProgress: mocks.getSeriesProgress,
    })
  })

  it.each([
    {
      caseName: 'normal percentage',
      watchedCount: 8,
      totalEpisodes: 16,
      expectedPercentage: 50,
    },
    {
      caseName: 'rounded percentage',
      watchedCount: 2,
      totalEpisodes: 3,
      expectedPercentage: 67,
    },
    {
      caseName: 'zero total episodes',
      watchedCount: 2,
      totalEpisodes: 0,
      expectedPercentage: 0,
    },
  ])(
    'returns progress for $caseName',
    ({ watchedCount, totalEpisodes, expectedPercentage }) => {
      mocks.getSeriesProgress.mockReturnValue({ watchedCount })

      const { result } = renderHook(() => useSeriesProgress(200, totalEpisodes))

      expect(mocks.getSeriesProgress).toHaveBeenCalledWith(200)
      expect(result.current).toEqual({
        watchedCount,
        totalCount: totalEpisodes,
        percentage: expectedPercentage,
      })
    },
  )
})
