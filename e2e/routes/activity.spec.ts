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
