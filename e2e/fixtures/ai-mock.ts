import type { Page } from '@playwright/test'

interface AiSuggestionPayload {
  strategy: 'search' | 'discover' | 'person'
  query?: string
  person_name?: string
  role?: 'cast' | 'crew'
  media_type?: 'movie' | 'tv'
  suggested_list_name?: string
  [key: string]: unknown
}

const DEFAULT_AI_SUGGESTION: AiSuggestionPayload = {
  strategy: 'search',
  query: 'Mock Movie 101',
  media_type: 'movie',
  suggested_list_name: 'Lista Inteligente E2E',
}

export async function mockAiSuggestions(
  page: Page,
  payload: AiSuggestionPayload = DEFAULT_AI_SUGGESTION,
): Promise<void> {
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify(payload),
                },
              ],
              role: 'model',
            },
            finishReason: 'STOP',
            index: 0,
          },
        ],
      }),
    })
  })
}

export async function installClipboardStub(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const clipboardState = { text: '' }
    ;(window as Window & { __E2E_CLIPBOARD__?: { text: string } }).__E2E_CLIPBOARD__ = clipboardState

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          clipboardState.text = value
        },
        readText: async () => clipboardState.text,
      },
    })
  })
}

export async function readClipboardStub(page: Page): Promise<string> {
  return page.evaluate(() => {
    const state = (window as Window & { __E2E_CLIPBOARD__?: { text: string } }).__E2E_CLIPBOARD__
    return state?.text ?? ''
  })
}
