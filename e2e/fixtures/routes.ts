export const ROUTE_TEST_IDS = {
  auth: "route-auth",
  authCallback: "route-auth-callback",
  home: "route-home",
  search: "route-search",
  shared: "route-shared",
  details: "route-details",
  lists: "route-lists-screen",
  thisWeek: "route-this-week",
} as const;

export const SCENARIO_IDS = {
  AUTH_PAGE_RENDER: "AUTH_PAGE_RENDER",
  AUTH_CALLBACK_REDIRECT: "AUTH_CALLBACK_REDIRECT",
  PROTECTED_GUARD_REDIRECTS_TO_AUTH: "PROTECTED_GUARD_REDIRECTS_TO_AUTH",
  HOME_GUEST_RENDER: "HOME_GUEST_RENDER",
  SEARCH_ROUTE_RENDER: "SEARCH_ROUTE_RENDER",
  SEARCH_QUERY_RESULTS: "SEARCH_QUERY_RESULTS",
  THIS_WEEK_RENDER: "THIS_WEEK_RENDER",
  SEARCH_RESULT_OPENS_DETAILS: "SEARCH_RESULT_OPENS_DETAILS",
  SHARED_ROUTE_RENDER_FROM_DATA: "SHARED_ROUTE_RENDER_FROM_DATA",
  SHARED_ROUTE_INVALID_LINK: "SHARED_ROUTE_INVALID_LINK",
  LISTS_INDEX_RENDER: "LISTS_INDEX_RENDER",
  DETAILS_VALID_RENDER: "DETAILS_VALID_RENDER",
  DETAILS_ADD_TO_LIST: "DETAILS_ADD_TO_LIST",
  DETAILS_MARK_WATCHED_FILTERS: "DETAILS_MARK_WATCHED_FILTERS",
  DETAILS_INVALID_TYPE_REDIRECT: "DETAILS_INVALID_TYPE_REDIRECT",
  NOT_FOUND_RENDER: "NOT_FOUND_RENDER",
} as const;

export type ScenarioId = (typeof SCENARIO_IDS)[keyof typeof SCENARIO_IDS];

export function encodeSharedRouteData(
  items: Array<{ id: number; type: "movie" | "tv" }>,
): string {
  return Buffer.from(JSON.stringify(items)).toString("base64");
}
