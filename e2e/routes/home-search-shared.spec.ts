import { expect, test } from '../fixtures/test'

import { continueAsGuest } from '../fixtures/auth'
import {
  ROUTE_TEST_IDS,
  SCENARIO_IDS,
  encodeSharedRouteData,
} from '../fixtures/routes'
import { mockTmdbApi } from '../fixtures/tmdb-mock'

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page)
})

test(`[${SCENARIO_IDS.HOME_GUEST_RENDER}] allows guest login and lands on home route`, async ({
  page,
}) => {
  await continueAsGuest(page)

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.home)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Em Alta' })).toBeVisible()
})

test(`[${SCENARIO_IDS.SEARCH_ROUTE_RENDER}] renders search route for authenticated guest`, async ({ page }) => {
  await continueAsGuest(page)

  await page.goto('/search')

  await expect(page).toHaveURL(/\/search$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.search)).toBeVisible()
  await expect(page.getByPlaceholder('Buscar filmes ou séries...')).toBeVisible()
})

test(`[${SCENARIO_IDS.SEARCH_QUERY_RESULTS}] renders TMDB search results after user query`, async ({
  page,
}) => {
  await continueAsGuest(page)
  await page.goto('/search')

  await expect(page.getByTestId(ROUTE_TEST_IDS.search)).toBeVisible()
  await page.getByTestId('search-input').fill('mock movie')

  await expect(page.getByText('Mock Movie 101')).toBeVisible()
})

test(`[${SCENARIO_IDS.SEARCH_RESULT_OPENS_DETAILS}] opens details route when clicking a search result`, async ({
  page,
}) => {
  await continueAsGuest(page)
  await page.goto('/search')

  await page.getByTestId('search-input').fill('mock movie')
  const resultLink = page.getByRole('link', { name: /Mock Movie 101/i }).first()
  await expect(resultLink).toBeVisible()
  await resultLink.click()

  await expect(page).toHaveURL(/\/details\/movie\/101$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.details)).toBeVisible()
  await expect(page.getByRole('heading', { name: /Mock Movie 101/i })).toBeVisible()
})

test(`[${SCENARIO_IDS.SHARED_ROUTE_RENDER_FROM_DATA}] renders shared route using encoded data payload`, async ({
  page,
}) => {
  await continueAsGuest(page)

  const sharedData = encodeSharedRouteData([{ id: 101, type: 'movie' }])
  await page.goto(`/shared?data=${encodeURIComponent(sharedData)}`)

  await expect(page).toHaveURL(/\/shared\?data=/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.shared)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Lista Compartilhada' })).toBeVisible()
  await expect(page.getByText('Mock Movie 101')).toBeVisible()
})

test(`[${SCENARIO_IDS.SHARED_ROUTE_INVALID_LINK}] shows validation error for invalid shared route`, async ({
  page,
}) => {
  await continueAsGuest(page)

  await page.goto('/shared')

  await expect(page.getByTestId(ROUTE_TEST_IDS.shared)).toBeVisible()
  await expect(page.getByText('Link inválido ou incompleto.')).toBeVisible()
})
