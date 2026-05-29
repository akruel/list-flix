/* eslint-disable security/detect-non-literal-regexp */
import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";

import {
  installClipboardStub,
  mockAiSuggestions,
  readClipboardStub,
} from "../fixtures/ai-mock";
import { signIn } from "../fixtures/auth";
import {
  buildJoinRoutePath,
  ROUTE_TEST_IDS,
  SCENARIO_IDS,
} from "../fixtures/routes";
import { seedListOwnedByNewUser } from "../fixtures/supabase-seed";
import { expect, test } from "../fixtures/test";
import { mockTmdbApi } from "../fixtures/tmdb-mock";

async function completeJoinFlow(page: Page, memberName: string): Promise<void> {
  const joinButton = page.getByRole("button", { name: "Entrar na lista" });
  const confirmButton = page.getByRole("button", { name: "Confirmar entrada" });

  if (await joinButton.isVisible()) {
    await page.getByLabel("Seu nome").fill(memberName);
    await joinButton.click();
    return;
  }

  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
}

function getListIdFromUrl(url: string): string {
  const match = url.match(/\/lists\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Unable to parse list id from URL: ${url}`);
  }
  return decodeURIComponent(match[1]);
}

async function openCustomLists(page: Page): Promise<void> {
  await page.goto("/lists");
  await expect(page).toHaveURL(/\/lists\/?$/);
  await expect(page.getByTestId(ROUTE_TEST_IDS.lists)).toBeVisible();
  await page.getByTestId("lists-tab-custom").click();
  await expect(page.getByTestId("custom-lists")).toBeVisible();
}

async function openManualListForm(page: Page): Promise<void> {
  await page.getByTestId("custom-lists-new-list-trigger").click();
  await page.getByTestId("custom-lists-option-manual").click();
  await expect(
    page.getByTestId("custom-lists-manual-name-input"),
  ).toBeVisible();
}

async function createManualList(page: Page, listName: string): Promise<void> {
  await openManualListForm(page);
  await page.getByTestId("custom-lists-manual-name-input").fill(listName);
  await page.getByTestId("custom-lists-manual-submit").click();
  await expect(
    page
      .getByTestId("custom-lists-card-link")
      .filter({ hasText: listName })
      .first(),
  ).toBeVisible();
}

async function openSmartListModal(page: Page): Promise<void> {
  await page.getByTestId("custom-lists-new-list-trigger").click();
  await page.getByTestId("custom-lists-option-smart").click();
  await expect(page.getByTestId("magic-list-modal")).toBeVisible();
}

async function runSmartSuggestion(page: Page, prompt: string): Promise<void> {
  await page.getByTestId("magic-list-prompt-input").fill(prompt);
  await page.getByTestId("magic-list-suggest-button").click();
  await expect(page.getByTestId("magic-list-results-grid")).toBeVisible();
  await expect(page.getByText("Mock Movie 101")).toBeVisible();
}

async function openListDetailsFromCard(
  page: Page,
  listName: string,
): Promise<string> {
  await page
    .getByTestId("custom-lists-card-link")
    .filter({ hasText: listName })
    .first()
    .click();
  await expect(page.getByTestId(ROUTE_TEST_IDS.listDetails)).toBeVisible();
  return getListIdFromUrl(page.url());
}

async function copyShareLink(
  page: Page,
  role: "editor" | "viewer",
): Promise<string> {
  await page.getByTestId("list-details-share-trigger").click();
  await page.getByTestId(`list-details-share-${role}`).click();
  await expect(page.getByRole("button", { name: "Copiado!" })).toBeVisible();
  return readClipboardStub(page);
}

async function expectListDetailsLoaded(
  page: Page,
  listName: string,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await expect(page.getByTestId(ROUTE_TEST_IDS.listDetails)).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByRole("heading", { name: listName })).toBeVisible({
        timeout: 5000,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 3) {
        break;
      }

      await page.reload();
    }
  }

  throw lastError;
}

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page);
  await mockAiSuggestions(page);
});

test(`[${SCENARIO_IDS.LISTS_INDEX_RENDER}] renders lists index route`, async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/lists");

  await expect(page).toHaveURL(/\/lists\/?$/);
  await expect(page.getByTestId(ROUTE_TEST_IDS.lists)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Minhas Listas" }),
  ).toBeVisible();
});

test(`[${SCENARIO_IDS.LIST_MANUAL_CREATE_OPEN_FORM}] opens manual list form from lists route`, async ({
  page,
}) => {
  await signIn(page);
  await openCustomLists(page);
  await openManualListForm(page);

  await expect(page.getByTestId("custom-lists-manual-submit")).toBeVisible();
  await expect(page.getByTestId("custom-lists-manual-cancel")).toBeVisible();
});

test(`[${SCENARIO_IDS.LIST_MANUAL_CREATE_SUBMIT_SUCCESS}] creates manual list and opens list details`, async ({
  page,
}) => {
  const listName = `Lista Manual ${randomUUID().slice(0, 8)}`;

  await signIn(page);
  await openCustomLists(page);
  await createManualList(page, listName);
  const createdListId = await openListDetailsFromCard(page, listName);

  await expect(page).toHaveURL(new RegExp(`/lists/${createdListId}$`));
  await expect(page.getByRole("heading", { name: listName })).toBeVisible();
});

test(`[${SCENARIO_IDS.LIST_SMART_OPEN_MODAL}] opens smart list modal`, async ({
  page,
}) => {
  await signIn(page);
  await openCustomLists(page);
  await openSmartListModal(page);

  await expect(page.getByTestId("magic-list-prompt-input")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Criar Lista Inteligente" }),
  ).toBeVisible();
});

test(`[${SCENARIO_IDS.LIST_SMART_SUGGEST_RESULTS}] generates smart list suggestions`, async ({
  page,
}) => {
  await signIn(page);
  await openCustomLists(page);
  await openSmartListModal(page);
  await runSmartSuggestion(page, "filmes de aventura para a família");

  await expect(page.getByTestId("magic-list-name-input")).toHaveValue(
    "Lista Inteligente E2E",
  );
});

test(`[${SCENARIO_IDS.LIST_SMART_SAVE_SUCCESS}] saves smart list and opens created list`, async ({
  page,
}) => {
  const listName = `Lista IA ${randomUUID().slice(0, 8)}`;

  await signIn(page);
  await openCustomLists(page);
  await openSmartListModal(page);
  await runSmartSuggestion(page, "filmes de aventura para a família");

  await page.getByTestId("magic-list-name-input").fill(listName);
  await page.getByTestId("magic-list-save-button").click();

  await expect(page.getByTestId("magic-list-modal")).toHaveCount(0);
  await expect(
    page
      .getByTestId("custom-lists-card-link")
      .filter({ hasText: listName })
      .first(),
  ).toBeVisible();

  const createdListId = await openListDetailsFromCard(page, listName);
  await expect(page).toHaveURL(new RegExp(`/lists/${createdListId}$`));
  await expect(page.getByRole("heading", { name: listName })).toBeVisible();
});

test(`[${SCENARIO_IDS.LIST_SMART_BACK_BUTTON}] navigates back from results to input and preserves prompt`, async ({
  page,
}) => {
  await signIn(page);
  await openCustomLists(page);
  await openSmartListModal(page);

  const prompt = "filmes de aventura para a família";
  await page.getByTestId("magic-list-prompt-input").fill(prompt);
  await page.getByTestId("magic-list-suggest-button").click();
  await expect(page.getByTestId("magic-list-results-grid")).toBeVisible();

  await page.getByTestId("magic-list-back-button").click();

  await expect(page.getByTestId("magic-list-prompt-input")).toBeVisible();
  await expect(page.getByTestId("magic-list-prompt-input")).toHaveValue(prompt);
});

test(`[${SCENARIO_IDS.LIST_SMART_EXAMPLE_CHIPS}] fills prompt when clicking example chip`, async ({
  page,
}) => {
  await signIn(page);
  await openCustomLists(page);
  await openSmartListModal(page);

  await expect(page.getByTestId("magic-list-example-chips")).toBeVisible();

  const chips = page.getByTestId("magic-list-example-chips").locator("button");
  const chipCount = await chips.count();
  expect(chipCount).toBeGreaterThan(0);

  await chips.first().click();
  const textareaValue = await page
    .getByTestId("magic-list-prompt-input")
    .inputValue();
  expect(textareaValue.length).toBeGreaterThan(0);
});

const shareLinkCopyCases = [
  {
    scenarioId: SCENARIO_IDS.LIST_SHARE_COPY_EDITOR_LINK,
    role: "editor" as const,
    listNamePrefix: "Lista Share",
  },
  {
    scenarioId: SCENARIO_IDS.LIST_SHARE_COPY_VIEWER_LINK,
    role: "viewer" as const,
    listNamePrefix: "Lista Share Viewer",
  },
];

for (const { scenarioId, role, listNamePrefix } of shareLinkCopyCases) {
  test(`[${scenarioId}] copies ${role} invite link from list share menu`, async ({
    page,
  }) => {
    const listName = `${listNamePrefix} ${randomUUID().slice(0, 8)}`;

    await installClipboardStub(page);
    await signIn(page);
    await openCustomLists(page);
    await createManualList(page, listName);
    const createdListId = await openListDetailsFromCard(page, listName);
    const inviteLink = await copyShareLink(page, role);

    expect(inviteLink).toContain(`/lists/${createdListId}/join?role=${role}`);
  });
}

test(`[${SCENARIO_IDS.LIST_SHARE_OPEN_LINK_AND_JOIN}] shares list and joins invite in a second guest session`, async ({
  page,
  browser,
}) => {
  const listName = `Lista Invite ${randomUUID().slice(0, 8)}`;

  await installClipboardStub(page);
  await signIn(page);
  await openCustomLists(page);
  await createManualList(page, listName);
  const createdListId = await openListDetailsFromCard(page, listName);
  const inviteLink = await copyShareLink(page, "editor");

  const invitedContext = await browser.newContext();
  const invitedPage = await invitedContext.newPage();

  try {
    await mockTmdbApi(invitedPage);
    await signIn(invitedPage);
    await invitedPage.goto(inviteLink);

    await expect(
      invitedPage.getByTestId(ROUTE_TEST_IDS.listJoin),
    ).toBeVisible();
    await expect(invitedPage.getByText("✏️ Editor")).toBeVisible();

    await completeJoinFlow(invitedPage, "Guest Invitee");

    await expect(invitedPage).toHaveURL(new RegExp(`/lists/${createdListId}$`));
    await expect(invitedPage.getByTestId(ROUTE_TEST_IDS.lists)).toBeVisible();
    await expectListDetailsLoaded(invitedPage, listName);
  } finally {
    await invitedContext.close();
  }
});

test(`[${SCENARIO_IDS.LISTS_JOIN_EDITOR_FLOW}] joins invite as editor and redirects to list details`, async ({
  page,
}) => {
  const { list, cleanup } = await seedListOwnedByNewUser("join-editor");

  try {
    await signIn(page);

    await page.goto(buildJoinRoutePath(list.id, "editor"));

    await expect(page.getByTestId(ROUTE_TEST_IDS.listJoin)).toBeVisible();
    await expect(page.getByText("✏️ Editor")).toBeVisible();

    await completeJoinFlow(page, "Guest Editor");

    await expect(page).toHaveURL(new RegExp(`/lists/${list.id}$`));
    await expect(page.getByTestId(ROUTE_TEST_IDS.lists)).toBeVisible();
    await expectListDetailsLoaded(page, list.name);
  } finally {
    await cleanup.run();
  }
});

test(`[${SCENARIO_IDS.LISTS_JOIN_VIEWER_READ_ONLY}] joins invite as viewer and keeps list details read-only`, async ({
  page,
  browser,
}) => {
  const listName = `Lista Viewer ${randomUUID().slice(0, 8)}`;

  await installClipboardStub(page);
  await signIn(page);
  await openCustomLists(page);
  await createManualList(page, listName);
  const createdListId = await openListDetailsFromCard(page, listName);
  const inviteLink = await copyShareLink(page, "viewer");

  const invitedContext = await browser.newContext();
  const invitedPage = await invitedContext.newPage();

  try {
    await mockTmdbApi(invitedPage);
    await signIn(invitedPage);
    await invitedPage.goto(inviteLink);

    await expect(
      invitedPage.getByTestId(ROUTE_TEST_IDS.listJoin),
    ).toBeVisible();
    await expect(invitedPage.getByText("👁️ Visualizador")).toBeVisible();

    await completeJoinFlow(invitedPage, "Guest Viewer");

    await expect(invitedPage).toHaveURL(new RegExp(`/lists/${createdListId}$`));
    await expect(invitedPage.getByTestId(ROUTE_TEST_IDS.lists)).toBeVisible();
    await expectListDetailsLoaded(invitedPage, listName);
    await expect(invitedPage.getByText("Visualizador")).toBeVisible();

    await expect(
      invitedPage.locator('button[title="Editar nome"]'),
    ).toHaveCount(0);
    await expect(
      invitedPage.locator('button[title="Excluir Lista"]'),
    ).toHaveCount(0);
    await expect(
      invitedPage.locator('button[title="Remover membro"]'),
    ).toHaveCount(0);
  } finally {
    await invitedContext.close();
  }
});

test(`[${SCENARIO_IDS.LISTS_JOIN_INVALID_ROLE_FALLBACK}] falls back to viewer role for invalid invite role`, async ({
  page,
}) => {
  const { list, cleanup } = await seedListOwnedByNewUser("join-invalid-role");

  try {
    await signIn(page);

    await page.goto(buildJoinRoutePath(list.id, "invalid-role"));

    await expect(page.getByTestId(ROUTE_TEST_IDS.listJoin)).toBeVisible();
    await expect(page.getByText("✏️ Editor")).not.toBeVisible();
    await expect(page.getByText("👁️ Visualizador")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar entrada" }),
    ).toBeVisible();
  } finally {
    await cleanup.run();
  }
});
