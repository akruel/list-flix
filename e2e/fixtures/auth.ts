import { expect, type Page } from '@playwright/test'

import { ROUTE_TEST_IDS } from './routes'

export async function continueAsGuest(page: Page): Promise<void> {
  await page.goto('/auth')

  if (new URL(page.url()).pathname === '/auth') {
    await expect(page.getByTestId(ROUTE_TEST_IDS.auth)).toBeVisible()
    await page.getByRole('button', { name: 'Continuar como visitante' }).click()
  }

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId(ROUTE_TEST_IDS.home)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Em Alta' })).toBeVisible()
}
