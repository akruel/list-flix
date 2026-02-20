import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MovieCard } from './MovieCard'
import type { ContentItem } from '../types'

const mocks = vi.hoisted(() => ({
  isWatched: vi.fn(),
  getSeriesMetadata: vi.fn(),
  useSeriesProgress: vi.fn(),
  getImageUrl: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode
    to: string
    params: Record<string, string>
  }) => (
    <a data-to={to} data-params={JSON.stringify(params)}>
      {children}
    </a>
  ),
}))

vi.mock('../store/useStore', () => ({
  useStore: () => ({
    isWatched: mocks.isWatched,
    getSeriesMetadata: mocks.getSeriesMetadata,
  }),
}))

vi.mock('../hooks/useSeriesProgress', () => ({
  useSeriesProgress: (...args: unknown[]) => mocks.useSeriesProgress(...args),
}))

vi.mock('../services/tmdb', () => ({
  tmdb: {
    getImageUrl: (...args: unknown[]) => mocks.getImageUrl(...args),
  },
}))

describe('MovieCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isWatched.mockReturnValue(false)
    mocks.getSeriesMetadata.mockReturnValue(undefined)
    mocks.useSeriesProgress.mockReturnValue({ watchedCount: 0 })
    mocks.getImageUrl.mockReturnValue('https://img.local/poster.jpg')
  })

  const metadataCases: Array<{
    caseName: string
    item: ContentItem
    expectedTitle: string
    expectedYear: string
  }> = [
    {
      caseName: 'movie metadata',
      item: {
        id: 10,
        media_type: 'movie' as const,
        title: 'Movie One',
        release_date: '2020-07-01',
        vote_average: 8.5,
      },
      expectedTitle: 'Movie One',
      expectedYear: '2020',
    },
    {
      caseName: 'tv metadata',
      item: {
        id: 20,
        media_type: 'tv' as const,
        name: 'Series One',
        first_air_date: '2019-07-01',
        vote_average: 7.2,
      },
      expectedTitle: 'Series One',
      expectedYear: '2019',
    },
  ]

  it.each(metadataCases)('renders $caseName', ({ item, expectedTitle, expectedYear }) => {
    render(<MovieCard item={item} />)

    expect(screen.getByText(expectedTitle)).toBeInTheDocument()
    expect(screen.getByText(expectedYear)).toBeInTheDocument()
    expect(mocks.getImageUrl).toHaveBeenCalledWith(item.poster_path, 'w500')
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://img.local/poster.jpg')
  })

  it('shows watched badge when content is watched', () => {
    mocks.isWatched.mockReturnValue(true)

    render(
      <MovieCard
        item={{
          id: 10,
          media_type: 'movie',
          title: 'Movie One',
        }}
      />,
    )

    const watchedBadge = document.querySelector('.bg-blue-600.text-white.rounded-full')
    expect(watchedBadge).not.toBeNull()
  })

  it.each([
    {
      caseName: 'tv progress shown',
      showProgress: true,
      mediaType: 'tv' as const,
      metadata: { total_episodes: 10, number_of_seasons: 1 },
      watchedCount: 4,
      shouldShow: true,
      expectedWidth: '40%',
    },
    {
      caseName: 'hidden when showProgress false',
      showProgress: false,
      mediaType: 'tv' as const,
      metadata: { total_episodes: 10, number_of_seasons: 1 },
      watchedCount: 4,
      shouldShow: false,
      expectedWidth: null,
    },
    {
      caseName: 'hidden for movies',
      showProgress: true,
      mediaType: 'movie' as const,
      metadata: { total_episodes: 10, number_of_seasons: 1 },
      watchedCount: 4,
      shouldShow: false,
      expectedWidth: null,
    },
    {
      caseName: 'hidden when no metadata',
      showProgress: true,
      mediaType: 'tv' as const,
      metadata: undefined,
      watchedCount: 4,
      shouldShow: false,
      expectedWidth: null,
    },
    {
      caseName: 'hidden when watchedCount is zero',
      showProgress: true,
      mediaType: 'tv' as const,
      metadata: { total_episodes: 10, number_of_seasons: 1 },
      watchedCount: 0,
      shouldShow: false,
      expectedWidth: null,
    },
  ])(
    'handles progress for $caseName',
    ({ showProgress, mediaType, metadata, watchedCount, shouldShow, expectedWidth }) => {
      mocks.getSeriesMetadata.mockReturnValue(metadata)
      mocks.useSeriesProgress.mockReturnValue({ watchedCount })

      render(
        <MovieCard
          item={{
            id: 30,
            media_type: mediaType,
            title: 'Item',
            name: 'Item',
          }}
          showProgress={showProgress}
        />,
      )

      const progressFill = document.querySelector('.bg-gradient-to-r.from-blue-500.to-purple-500') as
        | HTMLDivElement
        | null

      if (shouldShow) {
        expect(progressFill).not.toBeNull()
        expect(progressFill?.style.width).toBe(expectedWidth)
      } else {
        expect(progressFill).toBeNull()
      }
    },
  )

  it('defaults rating to 0.0 when vote_average is missing', () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: 'movie',
          title: 'Movie One',
        }}
      />,
    )

    expect(screen.getByText('0.0')).toBeInTheDocument()
  })
})
