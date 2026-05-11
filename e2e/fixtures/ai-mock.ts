import type { Page } from "@playwright/test";

interface AiSuggestionPayload {
  suggested_list_name?: string;
  items: Array<{
    title: string;
    media_type: "movie" | "tv";
  }>;
  [key: string]: unknown;
}

const DEFAULT_AI_SUGGESTION: AiSuggestionPayload = {
  suggested_list_name: "Lista Inteligente E2E",
  items: [{ title: "Mock Movie 101", media_type: "movie" }],
};

export async function mockAiSuggestions(
  page: Page,
  payload: AiSuggestionPayload = DEFAULT_AI_SUGGESTION,
): Promise<void> {
  // Mock Groq
  await page.route(
    "https://api.groq.com/openai/v1/chat/completions",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify(payload),
              },
              finish_reason: "stop",
              index: 0,
            },
          ],
        }),
      });
    },
  );
}

export async function installClipboardStub(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const clipboardState = { text: "" };
    (
      window as Window & { __E2E_CLIPBOARD__?: { text: string } }
    ).__E2E_CLIPBOARD__ = clipboardState;

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          clipboardState.text = value;
        },
        readText: async () => clipboardState.text,
      },
    });
  });
}

export async function readClipboardStub(page: Page): Promise<string> {
  return page.evaluate(() => {
    const state = (window as Window & { __E2E_CLIPBOARD__?: { text: string } })
      .__E2E_CLIPBOARD__;
    return state?.text ?? "";
  });
}
