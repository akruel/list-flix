import { expect, test, type Page } from '@playwright/test'

import { mockTmdbApi } from './fixtures/tmdb-mock'

async function continueAsGuest(page: Page) {
  await page.goto('/auth')
  await page.getByRole('button', { name: 'Continuar como visitante' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Em Alta' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page)
})

test('redirects protected route to /auth when unauthenticated', async ({ page }) => {
  await page.goto('/lists')

  await expect(page).toHaveURL(/\/auth$/)
  await expect(page.getByText('Entrar no ListFlix')).toBeVisible()
})

test('allows guest login and navigation across main tabs', async ({ page }) => {
  await continueAsGuest(page)

  await page.getByRole('link', { name: 'Buscar' }).first().click()
  await expect(page).toHaveURL(/\/search$/)
  await expect(page.getByPlaceholder('Buscar filmes ou séries...')).toBeVisible()

  await page.getByRole('link', { name: 'Minhas Listas' }).first().click()
  await expect(page).toHaveURL(/\/lists$/)
  await expect(page.getByRole('heading', { name: 'Minhas Listas' })).toBeVisible()

  await page.getByRole('link', { name: 'Início' }).first().click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Em Alta' })).toBeVisible()
})

test('renders global not found page on invalid route', async ({ page }) => {
  await page.goto('/rota-que-nao-existe')

  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})

test('redirects invalid details type to home after authentication', async ({ page }) => {
  await continueAsGuest(page)

  await page.goto('/details/invalid/123')

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: 'Em Alta' })).toBeVisible()
})
