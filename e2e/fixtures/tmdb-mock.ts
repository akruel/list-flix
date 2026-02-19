import type { Page } from '@playwright/test'

const trendingResponse = {
  page: 1,
  results: [
    {
      id: 101,
      media_type: 'movie',
      title: 'Mock Trending Movie',
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

const searchResponse = {
  page: 1,
  results: [
    {
      id: 101,
      media_type: 'movie',
      title: 'Mock Trending Movie',
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

const movieDetailsResponse = {
  id: 101,
  media_type: 'movie',
  title: 'Mock Trending Movie',
  poster_path: null,
  backdrop_path: null,
  overview: 'Mock overview',
  vote_average: 7.8,
  release_date: '2025-01-01',
  genres: [],
  status: 'Released',
  credits: { cast: [] },
  videos: { results: [] },
  'watch/providers': { results: {} },
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

    if (/\/genre\/(movie|tv)\/list$/.test(path)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ genres: [] }),
      })
      return
    }

    if (/\/(movie|tv)\/\d+$/.test(path)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(movieDetailsResponse),
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
