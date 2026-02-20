import type { Page } from '@playwright/test'

function createMovieDetails(id: number) {
  return {
    id,
    media_type: 'movie' as const,
    title: `Mock Movie ${id}`,
    poster_path: null,
    backdrop_path: null,
    overview: `Mock overview for movie ${id}`,
    vote_average: 7.8,
    release_date: '2025-01-01',
    genres: [{ id: 1, name: 'Ação' }],
    status: 'Released',
    runtime: 120,
    credits: { cast: [] },
    videos: { results: [] },
    'watch/providers': { results: {} },
  }
}

function createTvDetails(id: number) {
  return {
    id,
    media_type: 'tv' as const,
    name: `Mock Show ${id}`,
    poster_path: null,
    backdrop_path: null,
    overview: `Mock overview for show ${id}`,
    vote_average: 8.2,
    first_air_date: '2024-05-20',
    genres: [{ id: 2, name: 'Drama' }],
    status: 'Returning Series',
    number_of_seasons: 1,
    number_of_episodes: 2,
    episode_run_time: [50],
    seasons: [
      {
        id: 9000 + id,
        name: 'Temporada 1',
        season_number: 1,
        episode_count: 2,
        air_date: '2024-05-20',
        poster_path: null,
      },
    ],
    credits: { cast: [] },
    videos: { results: [] },
    'watch/providers': { results: {} },
  }
}

const trendingResponse = {
  page: 1,
  results: [
    {
      id: 101,
      media_type: 'movie',
      title: 'Mock Movie 101',
      poster_path: null,
      backdrop_path: null,
      overview: 'Mock overview',
      vote_average: 7.8,
      release_date: '2025-01-01',
    },
    {
      id: 202,
      media_type: 'tv',
      name: 'Mock Show 202',
      poster_path: null,
      backdrop_path: null,
      overview: 'Mock tv overview',
      vote_average: 8.2,
      first_air_date: '2024-05-20',
    },
  ],
  total_pages: 1,
  total_results: 2,
}

const searchResponse = {
  page: 1,
  results: [
    {
      id: 101,
      media_type: 'movie',
      title: 'Mock Movie 101',
      poster_path: null,
      backdrop_path: null,
      overview: 'Mock overview',
      vote_average: 7.8,
      release_date: '2025-01-01',
    },
  ],
  total_pages: 1,
  total_results: 1,
}

const discoverResponse = {
  page: 1,
  results: [
    {
      id: 303,
      media_type: 'movie',
      title: 'Mock Discover Movie 303',
      poster_path: null,
      backdrop_path: null,
      overview: 'Mock discover overview',
      vote_average: 7.2,
      release_date: '2023-09-20',
    },
  ],
  total_pages: 1,
  total_results: 1,
}

const searchPersonResponse = {
  page: 1,
  results: [
    {
      id: 10001,
      name: 'Mock Actor',
    },
  ],
  total_pages: 1,
  total_results: 1,
}

export async function mockTmdbApi(page: Page) {
  await page.route('https://api.themoviedb.org/3/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path.endsWith('/trending/all/week') || path.endsWith('/trending/all/day')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(trendingResponse),
      })
      return
    }

    if (path.endsWith('/search/multi')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(searchResponse),
      })
      return
    }

    if (path.endsWith('/search/person')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(searchPersonResponse),
      })
      return
    }

    if (path.endsWith('/discover/movie') || path.endsWith('/discover/tv')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(discoverResponse),
      })
      return
    }

    if (/\/genre\/(movie|tv)\/list$/.test(path)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ genres: [] }),
      })
      return
    }

    const movieMatch = path.match(/\/movie\/(\d+)$/)
    if (movieMatch) {
      const id = Number(movieMatch[1])
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMovieDetails(id)),
      })
      return
    }

    const tvMatch = path.match(/\/tv\/(\d+)$/)
    if (tvMatch) {
      const id = Number(tvMatch[1])
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createTvDetails(id)),
      })
      return
    }

    const tvSeasonMatch = path.match(/\/tv\/(\d+)\/season\/(\d+)$/)
    if (tvSeasonMatch) {
      const tvId = Number(tvSeasonMatch[1])
      const seasonNumber = Number(tvSeasonMatch[2])

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: tvId,
          season_number: seasonNumber,
          episodes: [
            {
              id: tvId * 1000 + seasonNumber * 10 + 1,
              name: `Episode 1`,
              season_number: seasonNumber,
              episode_number: 1,
              air_date: '2024-05-20',
              overview: 'Mock episode overview',
              vote_average: 7.5,
              still_path: null,
            },
            {
              id: tvId * 1000 + seasonNumber * 10 + 2,
              name: `Episode 2`,
              season_number: seasonNumber,
              episode_number: 2,
              air_date: '2024-05-27',
              overview: 'Mock episode overview 2',
              vote_average: 7.7,
              still_path: null,
            },
          ],
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
  })
}
