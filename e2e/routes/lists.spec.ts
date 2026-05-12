import { continueAsGuest } from "../fixtures/auth";
import { ROUTE_TEST_IDS, SCENARIO_IDS } from "../fixtures/routes";
import { expect, test } from "../fixtures/test";
import { mockTmdbApi } from "../fixtures/tmdb-mock";

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page);
});

test(`[${SCENARIO_IDS.LISTS_INDEX_RENDER}] renders lists index route`, async ({
  page,
}) => {
  await continueAsGuest(page);

  await page.goto("/lists");

  await expect(page).toHaveURL(/\/lists\/?$/);
  await expect(page.getByTestId(ROUTE_TEST_IDS.lists)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Minha Lista" }),
  ).toBeVisible();
});
