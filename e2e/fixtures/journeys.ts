import { SCENARIO_IDS, type ScenarioId } from "./routes";

export const JOURNEY_IDS = {
  GUEST_DISCOVERY: "JOURNEY_GUEST_DISCOVERY",
  ACCESS_GUARDS: "JOURNEY_ACCESS_GUARDS",
  LIST_MANAGEMENT: "JOURNEY_LIST_MANAGEMENT",
} as const;

export type JourneyId = (typeof JOURNEY_IDS)[keyof typeof JOURNEY_IDS];

export interface JourneyCoverageEntry {
  journeyId: JourneyId;
  persona: string;
  objective: string;
  blocking: true;
  requiredScenarioIds: ScenarioId[];
  touchedPaths: string[];
}

export const journeyCoverageManifest: JourneyCoverageEntry[] = [
  {
    journeyId: JOURNEY_IDS.GUEST_DISCOVERY,
    persona: "guest",
    objective: "Autenticar como visitante e navegar discovery básico",
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.AUTH_PAGE_RENDER,
      SCENARIO_IDS.HOME_GUEST_RENDER,
      SCENARIO_IDS.THIS_WEEK_RENDER,
      SCENARIO_IDS.SEARCH_ROUTE_RENDER,
      SCENARIO_IDS.SEARCH_QUERY_RESULTS,
      SCENARIO_IDS.SEARCH_RESULT_OPENS_DETAILS,
      SCENARIO_IDS.SHARED_ROUTE_RENDER_FROM_DATA,
      SCENARIO_IDS.SHARED_ROUTE_INVALID_LINK,
      SCENARIO_IDS.DETAILS_VALID_RENDER,
    ],
    touchedPaths: [
      "/auth",
      "/",
      "/this-week",
      "/search",
      "/shared",
      "/details/$type/$id",
    ],
  },
  {
    journeyId: JOURNEY_IDS.ACCESS_GUARDS,
    persona: "guest",
    objective: "Validar redirects e página not found",
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.AUTH_CALLBACK_REDIRECT,
      SCENARIO_IDS.PROTECTED_GUARD_REDIRECTS_TO_AUTH,
      SCENARIO_IDS.DETAILS_INVALID_TYPE_REDIRECT,
      SCENARIO_IDS.NOT_FOUND_RENDER,
    ],
    touchedPaths: [
      "/auth/callback",
      "/lists/",
      "/details/$type/$id",
      "NOT_FOUND",
    ],
  },
  {
    journeyId: JOURNEY_IDS.LIST_MANAGEMENT,
    persona: "guest",
    objective:
      "Adicionar conteúdo pela tela de detalhes e validar filtros de assistidos",
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.LISTS_INDEX_RENDER,
      SCENARIO_IDS.DETAILS_ADD_TO_LIST,
      SCENARIO_IDS.DETAILS_MARK_WATCHED_FILTERS,
    ],
    touchedPaths: ["/auth", "/details/$type/$id", "/lists/"],
  },
];
