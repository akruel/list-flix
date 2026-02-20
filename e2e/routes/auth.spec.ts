import { expect, test } from '../fixtures/test'

import { ROUTE_TEST_IDS, SCENARIO_IDS } from '../fixtures/routes'
import { mockTmdbApi } from '../fixtures/tmdb-mock'

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page)
})

test(`[${SCENARIO_IDS.AUTH_PAGE_RENDER}] renders authentication route`, async ({ page }) => {
  await page.goto('/auth')

  await expect(page.getByTestId(ROUTE_TEST_IDS.auth)).toBeVisible()
  await expect(page.getByText('Entrar no ListFlix')).toBeVisible()
})

test(`[${SCENARIO_IDS.AUTH_CALLBACK_REDIRECT}] redirects callback to /auth when session is missing`, async ({
  page,
}) => {
  await page.goto('/auth/callback')

  await expect(page).toHaveURL(/\/auth$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.auth)).toBeVisible()
})
