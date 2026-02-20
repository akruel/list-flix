import type { Page } from '@playwright/test'

import { expect, test } from '../fixtures/test'

import { continueAsGuest } from '../fixtures/auth'
import { ROUTE_TEST_IDS, SCENARIO_IDS } from '../fixtures/routes'
import { mockTmdbApi } from '../fixtures/tmdb-mock'

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page)
})

async function openMovieDetails(page: Page): Promise<void> {
  await page.goto('/details/movie/101')
  await expect(page).toHaveURL(/\/details\/movie\/101$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.details)).toBeVisible()
  await expect(page.getByRole('heading', { name: /Mock Movie 101/i })).toBeVisible()
}

async function addCurrentDetailsToDefaultList(page: Page): Promise<void> {
  await page.getByTestId('details-add-button').click()
  await expect(page.getByTestId('list-selection-default')).toBeVisible()
  await page.getByTestId('list-selection-default').click()
  await page.getByTestId('list-selection-done').click()
}

test(`[${SCENARIO_IDS.DETAILS_VALID_RENDER}] renders valid details route`, async ({ page }) => {
  await continueAsGuest(page)
  await openMovieDetails(page)
})

test(`[${SCENARIO_IDS.DETAILS_ADD_TO_DEFAULT_LIST}] adds content from details into default watchlist`, async ({
  page,
}) => {
  await continueAsGuest(page)
  await openMovieDetails(page)
  await addCurrentDetailsToDefaultList(page)

  await page.goto('/lists')
  await expect(page).toHaveURL(/\/lists\/?$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.lists)).toBeVisible()
  await expect(page.getByRole('link', { name: /Mock Movie 101/i })).toBeVisible()
})

test(`[${SCENARIO_IDS.DETAILS_MARK_WATCHED_FILTERS}] marks content as watched and validates lists filters`, async ({
  page,
}) => {
  await continueAsGuest(page)
  await openMovieDetails(page)
  await addCurrentDetailsToDefaultList(page)

  await page.getByTestId('details-toggle-watched-button').click()
  await expect(page.getByTestId('details-toggle-watched-button')).toContainText('Assistido')

  await page.goto('/lists')
  await expect(page.getByTestId(ROUTE_TEST_IDS.lists)).toBeVisible()

  await page.getByTestId('lists-filter-watched').click()
  await expect(page.getByRole('link', { name: /Mock Movie 101/i })).toBeVisible()

  await page.getByTestId('lists-filter-unwatched').click()
  await expect(page.getByRole('link', { name: /Mock Movie 101/i })).toHaveCount(0)
  await expect(page.getByText('Nenhum item nesta categoria')).toBeVisible()
})

test(`[${SCENARIO_IDS.DETAILS_INVALID_TYPE_REDIRECT}] redirects invalid details type to home`, async ({
  page,
}) => {
  await continueAsGuest(page)

  await page.goto('/details/invalid/123')

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.home)).toBeVisible()
})
