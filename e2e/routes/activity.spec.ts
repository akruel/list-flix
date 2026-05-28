import type { Page } from "@playwright/test";

import { signIn } from "../fixtures/auth";
import { ROUTE_TEST_IDS, SCENARIO_IDS } from "../fixtures/routes";
import {
  seedListOwnedByNewUser,
  seedMemberJoinsList,
} from "../fixtures/supabase-seed";
import { expect, test } from "../fixtures/test";
import { mockTmdbApi } from "../fixtures/tmdb-mock";

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page);
});

interface FakeActivity {
  id: string;
  actor_id: string;
  activity_type: string;
  list_id: string;
  content_id: number | null;
  content_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function buildItemAddedActivities(
  startIndex: number,
  count: number,
): FakeActivity[] {
  const baseDate = new Date("2026-05-22T10:00:00Z").getTime();
  return Array.from({ length: count }, (_, i) => {
    const n = startIndex + i;
    return {
      id: `e2e-act-${n}`,
      actor_id: "actor-e2e",
      activity_type: "item_added",
      list_id: "list-e2e",
      content_id: 1000 + n,
      content_type: "movie",
      metadata: {
        actor_name: "Mock Actor",
        content_title: `E2E Item ${n}`,
        list_name: "E2E List",
      },
      created_at: new Date(baseDate - n * 60_000).toISOString(),
    };
  });
}

interface FeedResponse {
  status: number;
  body: unknown;
}

type FeedHandler = (offset: number, callIndex: number) => FeedResponse;

function activityItemTitle(page: Page, index: number) {
  return page
    .getByTestId(ROUTE_TEST_IDS.activity)
    .getByText(`E2E Item ${index}`, { exact: true });
}

async function interceptActivityFeed(
  page: Page,
  handler: FeedHandler,
): Promise<void> {
  const callsPerOffset = new Map<number, number>();

  await page.route("**/rest/v1/rpc/get_activity_feed*", async (route) => {
    const req = route.request();
    if (req.method() !== "POST") {
      await route.continue();
      return;
    }

    const parsed = req.postDataJSON() as {
      p_offset?: number;
      p_limit?: number;
    } | null;
    const offset = typeof parsed?.p_offset === "number" ? parsed.p_offset : 0;
    const callIndex = callsPerOffset.get(offset) ?? 0;
    callsPerOffset.set(offset, callIndex + 1);

    const { status, body } = handler(offset, callIndex);
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

test(`[${SCENARIO_IDS.ACTIVITY_FEED_RENDER}] renders activity route`, async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/activity");

  await expect(page.getByTestId(ROUTE_TEST_IDS.activity)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Atividades" })).toBeVisible();
});

test(`[${SCENARIO_IDS.ACTIVITY_FEED_EMPTY_STATE}] shows empty state when user has no shared lists`, async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/activity");

  await expect(page.getByTestId(ROUTE_TEST_IDS.activity)).toBeVisible();
  await expect(page.getByText("Nenhuma atividade ainda")).toBeVisible();

  await expect(
    page.getByRole("link", { name: /Ver minhas listas/i }),
  ).toBeVisible();
});

test(`[${SCENARIO_IDS.ACTIVITY_FEED_SHOWS_LIST_EVENT}] shows member_joined activity when someone joins owner's list`, async ({
  page,
}) => {
  const {
    owner,
    list,
    cleanup: ownerCleanup,
  } = await seedListOwnedByNewUser("activity-owner");
  const { member, cleanup: memberCleanup } = await seedMemberJoinsList(
    list,
    "activity-member",
  );

  try {
    await page.goto("/auth");
    await page.evaluate(
      async ({ email, password }) => {
        const sb = window.__supabase;
        if (!sb) throw new Error("__supabase not available on window");
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      { email: owner.email, password: owner.password },
    );

    await expect(page.getByTestId(ROUTE_TEST_IDS.home)).toBeVisible();

    await page.goto("/activity");
    await expect(page.getByTestId(ROUTE_TEST_IDS.activity)).toBeVisible();

    await expect(page.getByText(/entrou na lista/i)).toBeVisible();

    const memberPrefix = member.email.split("@")[0] ?? "";
    await expect(page.getByText(memberPrefix, { exact: false })).toBeVisible();
  } finally {
    await memberCleanup.run();
    await ownerCleanup.run();
  }
});

test(`[${SCENARIO_IDS.ACTIVITY_FEED_LOAD_MORE}] appends next page when "Carregar mais" is clicked`, async ({
  page,
}) => {
  await signIn(page);

  await interceptActivityFeed(page, (offset) => {
    if (offset === 0) {
      return { status: 200, body: buildItemAddedActivities(1, 50) };
    }
    if (offset === 50) {
      return { status: 200, body: buildItemAddedActivities(51, 10) };
    }
    return { status: 200, body: [] };
  });

  await page.goto("/activity");

  await expect(page.getByTestId(ROUTE_TEST_IDS.activity)).toBeVisible();
  await expect(activityItemTitle(page, 1)).toBeVisible();
  await expect(activityItemTitle(page, 50)).toBeVisible();
  await expect(activityItemTitle(page, 51)).toBeHidden();

  const loadMore = page.getByRole("button", { name: "Carregar mais" });
  await expect(loadMore).toBeVisible();
  await loadMore.click();

  await expect(activityItemTitle(page, 60)).toBeVisible();
  await expect(activityItemTitle(page, 51)).toBeVisible();
  await expect(loadMore).toBeHidden();
});

test(`[${SCENARIO_IDS.ACTIVITY_FEED_LOAD_MORE_ERROR}] shows inline error and retries without dropping the list`, async ({
  page,
}) => {
  await signIn(page);

  await interceptActivityFeed(page, (offset, callIndex) => {
    if (offset === 0) {
      return { status: 200, body: buildItemAddedActivities(1, 50) };
    }
    if (offset === 50) {
      if (callIndex < 2) {
        return { status: 500, body: { message: "boom" } };
      }
      return { status: 200, body: buildItemAddedActivities(51, 10) };
    }
    return { status: 200, body: [] };
  });

  await page.goto("/activity");

  await expect(activityItemTitle(page, 1)).toBeVisible();

  await page.getByRole("button", { name: "Carregar mais" }).click();

  await expect(
    page.getByText("Não foi possível carregar mais atividades."),
  ).toBeVisible();
  await expect(activityItemTitle(page, 1)).toBeVisible();
  await expect(activityItemTitle(page, 50)).toBeVisible();

  await page
    .getByTestId(ROUTE_TEST_IDS.activity)
    .getByRole("button", { name: "Tentar novamente" })
    .click();

  await expect(activityItemTitle(page, 60)).toBeVisible();
  await expect(
    page.getByText("Não foi possível carregar mais atividades."),
  ).toBeHidden();
});

test(`[${SCENARIO_IDS.ACTIVITY_FEED_INITIAL_ERROR_RETRY}] surfaces errorComponent on initial failure and recovers via retry`, async ({
  page,
}) => {
  await signIn(page);

  await interceptActivityFeed(page, (offset, callIndex) => {
    if (offset === 0) {
      if (callIndex < 2) {
        return { status: 500, body: { message: "boom" } };
      }
      return { status: 200, body: buildItemAddedActivities(1, 5) };
    }
    return { status: 200, body: [] };
  });

  await page.goto("/activity");

  await expect(
    page.getByText("Não foi possível carregar as atividades."),
  ).toBeVisible();

  await page
    .getByTestId(ROUTE_TEST_IDS.activity)
    .getByRole("button", { name: "Tentar novamente" })
    .click();

  await expect(activityItemTitle(page, 1)).toBeVisible();
  await expect(
    page.getByText("Não foi possível carregar as atividades."),
  ).toBeHidden();
});

test(`[${SCENARIO_IDS.ACTIVITY_FEED_REFRESH_RESETS}] refresh resets the feed back to page one`, async ({
  page,
}) => {
  await signIn(page);

  await interceptActivityFeed(page, (offset) => {
    if (offset === 0) {
      return { status: 200, body: buildItemAddedActivities(1, 50) };
    }
    if (offset === 50) {
      return { status: 200, body: buildItemAddedActivities(51, 10) };
    }
    return { status: 200, body: [] };
  });

  await page.goto("/activity");

  await expect(activityItemTitle(page, 1)).toBeVisible();

  const loadMore = page.getByRole("button", { name: "Carregar mais" });
  await loadMore.click();
  await expect(activityItemTitle(page, 60)).toBeVisible();

  await page.getByRole("button", { name: "Atualizar feed" }).click();

  await expect(activityItemTitle(page, 60)).toBeHidden();
  await expect(activityItemTitle(page, 51)).toBeHidden();
  await expect(activityItemTitle(page, 1)).toBeVisible();
  await expect(loadMore).toBeVisible();
});
