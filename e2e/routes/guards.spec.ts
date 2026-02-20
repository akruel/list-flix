import { expect, test } from '../fixtures/test'

import { ROUTE_TEST_IDS, SCENARIO_IDS } from '../fixtures/routes'
import { mockTmdbApi } from '../fixtures/tmdb-mock'

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page)
})

test(`[${SCENARIO_IDS.PROTECTED_GUARD_REDIRECTS_TO_AUTH}] redirects protected route to /auth when unauthenticated`, async ({
  page,
}) => {
  await page.goto('/lists')

  await expect(page).toHaveURL(/\/auth$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.auth)).toBeVisible()
  await expect(page.getByText('Entrar no ListFlix')).toBeVisible()
})

test(`[${SCENARIO_IDS.NOT_FOUND_RENDER}] renders global not found page on invalid route`, async ({
  page,
}) => {
  await page.goto('/rota-que-nao-existe')

  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})
