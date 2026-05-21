import { signIn } from "../fixtures/auth";
import {
  encodeSharedRouteData,
  ROUTE_TEST_IDS,
  SCENARIO_IDS,
} from "../fixtures/routes";
import { expect, test } from "../fixtures/test";
import { mockTmdbApi } from "../fixtures/tmdb-mock";

test.beforeEach(async ({ page }) => {
  await mockTmdbApi(page);
});

test(`[${SCENARIO_IDS.HOME_GUEST_RENDER}] signs in and lands on home route`, async ({
  page,
}) => {
  await signIn(page);

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId(ROUTE_TEST_IDS.home)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Em Alta" })).toBeVisible();
  await expect(page.getByText("Suspense")).toBeVisible();
  await expect(page.getByText("Sci-fi")).toBeVisible();
});

test(`[${SCENARIO_IDS.SEARCH_ROUTE_RENDER}] search route redirects to home`, async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/search");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId(ROUTE_TEST_IDS.home)).toBeVisible();
});

test(`[${SCENARIO_IDS.SEARCH_QUERY_RESULTS}] opens search modal and shows compact results`, async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/");

  const searchButton = page.getByTestId(ROUTE_TEST_IDS.searchOpenButton);
  await searchButton.click();

  await expect(page.getByTestId("search-modal-input")).toBeVisible();

  await page.getByTestId("search-modal-input").fill("mock movie");

  await expect(page.getByText("Mock Movie 101")).toBeVisible();
});

test(`[${SCENARIO_IDS.SEARCH_RESULT_OPENS_DETAILS}] opens details from search modal result`, async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/");

  await page.getByTestId(ROUTE_TEST_IDS.searchOpenButton).click();

  await expect(page.getByTestId("search-modal-input")).toBeVisible();
  await page.getByTestId("search-modal-input").fill("mock movie");

  await page.evaluate(() => {
    const link = document.querySelector('a[href="/details/movie/101"]');
    if (link) (link as HTMLAnchorElement).click();
  });

  await expect(page).toHaveURL(/\/details\/movie\/101$/);
  await expect(page.getByTestId(ROUTE_TEST_IDS.details)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Mock Movie 101/i }),
  ).toBeVisible();
});

test(`[${SCENARIO_IDS.SEARCH_MODAL_ADD_ITEM}] adds item to watchlist from search modal`, async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/");

  await page.getByTestId(ROUTE_TEST_IDS.searchOpenButton).click();
  await expect(page.getByTestId("search-modal-input")).toBeVisible();
  await page.getByTestId("search-modal-input").fill("mock movie");

  const addButton = page.getByTitle("Adicionar à lista").first();
  await expect(addButton).toBeVisible();
  await addButton.click();

  await expect(page.getByText("adicionado à lista")).toBeVisible();
});

test(`[${SCENARIO_IDS.HOME_MOOD_SELECT_FILTERS}] mood chip changes displayed content`, async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/");

  await expect(page.getByText("Em Alta")).toBeVisible();
  await expect(page.getByText("Mock Movie 101")).toBeVisible();

  await page.getByRole("button", { name: "Suspense" }).click();

  await expect(page.getByRole("heading", { name: "Suspense" })).toBeVisible();
  await expect(page.getByText("Em Alta · Suspense")).toBeVisible();
  // "Para Você" visível apenas se o usuário tem itens na watchlist (não seedado no E2E)
});

test(`[${SCENARIO_IDS.HOME_MOOD_DECADE_SECONDARY}] decade chips appear when mood selected`, async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Suspense" }).click();

  await expect(page.getByText("Mock Discover Movie 303")).toBeVisible();
  const decadeChip = page.locator(
    "button:has-text('2020'), button:has-text('1990'), button:has-text('2010')",
  );
  await expect(decadeChip.first()).toBeVisible();
});

test(`[${SCENARIO_IDS.ACTIVITY_PLACEHOLDER_RENDER}] renders activity route with placeholder`, async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/activity");

  await expect(page.getByTestId(ROUTE_TEST_IDS.activity)).toBeVisible();
  await expect(page.getByText("Em breve")).toBeVisible();
});

test(`[${SCENARIO_IDS.SHARED_ROUTE_RENDER_FROM_DATA}] renders shared route using encoded data payload`, async ({
  page,
}) => {
  await signIn(page);

  const sharedData = encodeSharedRouteData([{ id: 101, type: "movie" }]);
  await page.goto(`/shared?data=${encodeURIComponent(sharedData)}`);

  await expect(page).toHaveURL(/\/shared\?data=/);
  await expect(page.getByTestId(ROUTE_TEST_IDS.shared)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lista Compartilhada" }),
  ).toBeVisible();
  await expect(page.getByText("Mock Movie 101")).toBeVisible();
});

test(`[${SCENARIO_IDS.SHARED_ROUTE_INVALID_LINK}] shows validation error for invalid shared route`, async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/shared");

  await expect(page.getByTestId(ROUTE_TEST_IDS.shared)).toBeVisible();
  await expect(page.getByText("Link inválido ou incompleto.")).toBeVisible();
});

test(`[${SCENARIO_IDS.THIS_WEEK_RENDER}] renders this-week route for empty watchlist`, async ({
  page,
}) => {
  await signIn(page);

  await page.goto("/this-week");

  await expect(page.getByTestId(ROUTE_TEST_IDS.thisWeek)).toBeVisible();
  await expect(
    page.getByText("Você ainda não adicionou nenhuma série à sua lista."),
  ).toBeVisible();
});
