import { SCENARIO_IDS, type ScenarioId } from './routes'

export const JOURNEY_IDS = {
  GUEST_DISCOVERY: 'JOURNEY_GUEST_DISCOVERY',
  ACCESS_GUARDS: 'JOURNEY_ACCESS_GUARDS',
  WATCHLIST_MANAGEMENT: 'JOURNEY_WATCHLIST_MANAGEMENT',
  CREATE_MANUAL_LIST: 'JOURNEY_CREATE_MANUAL_LIST',
  CREATE_SMART_LIST: 'JOURNEY_CREATE_SMART_LIST',
  SHARE_LIST_END_TO_END: 'JOURNEY_SHARE_LIST_END_TO_END',
  INVITE_ROLE_FALLBACK: 'JOURNEY_INVITE_ROLE_FALLBACK',
} as const

export type JourneyId = (typeof JOURNEY_IDS)[keyof typeof JOURNEY_IDS]

export interface JourneyCoverageEntry {
  journeyId: JourneyId
  persona: string
  objective: string
  blocking: true
  requiredScenarioIds: ScenarioId[]
  touchedPaths: string[]
}

export const journeyCoverageManifest: JourneyCoverageEntry[] = [
  {
    journeyId: JOURNEY_IDS.GUEST_DISCOVERY,
    persona: 'guest',
    objective: 'Autenticar como visitante e navegar discovery básico',
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.AUTH_PAGE_RENDER,
      SCENARIO_IDS.HOME_GUEST_RENDER,
      SCENARIO_IDS.SEARCH_ROUTE_RENDER,
      SCENARIO_IDS.SEARCH_QUERY_RESULTS,
      SCENARIO_IDS.SEARCH_RESULT_OPENS_DETAILS,
      SCENARIO_IDS.SHARED_ROUTE_RENDER_FROM_DATA,
      SCENARIO_IDS.SHARED_ROUTE_INVALID_LINK,
      SCENARIO_IDS.DETAILS_VALID_RENDER,
    ],
    touchedPaths: ['/auth', '/', '/search', '/shared', '/details/$type/$id'],
  },
  {
    journeyId: JOURNEY_IDS.ACCESS_GUARDS,
    persona: 'guest',
    objective: 'Validar redirects e página not found',
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.AUTH_CALLBACK_REDIRECT,
      SCENARIO_IDS.PROTECTED_GUARD_REDIRECTS_TO_AUTH,
      SCENARIO_IDS.DETAILS_INVALID_TYPE_REDIRECT,
      SCENARIO_IDS.NOT_FOUND_RENDER,
    ],
    touchedPaths: ['/auth/callback', '/lists/', '/details/$type/$id', 'NOT_FOUND'],
  },
  {
    journeyId: JOURNEY_IDS.WATCHLIST_MANAGEMENT,
    persona: 'guest',
    objective: 'Adicionar conteúdo pela tela de detalhes e validar filtros de assistidos',
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.DETAILS_ADD_TO_DEFAULT_LIST,
      SCENARIO_IDS.DETAILS_MARK_WATCHED_FILTERS,
    ],
    touchedPaths: ['/auth', '/details/$type/$id', '/lists/'],
  },
  {
    journeyId: JOURNEY_IDS.CREATE_MANUAL_LIST,
    persona: 'guest',
    objective: 'Criar lista manual pela UI e abrir detalhes da lista',
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.LISTS_INDEX_RENDER,
      SCENARIO_IDS.LIST_MANUAL_CREATE_OPEN_FORM,
      SCENARIO_IDS.LIST_MANUAL_CREATE_SUBMIT_SUCCESS,
    ],
    touchedPaths: ['/auth', '/lists/', '/lists/$id'],
  },
  {
    journeyId: JOURNEY_IDS.CREATE_SMART_LIST,
    persona: 'guest',
    objective: 'Criar lista inteligente com IA e salvar lista com itens',
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.LIST_SMART_OPEN_MODAL,
      SCENARIO_IDS.LIST_SMART_SUGGEST_RESULTS,
      SCENARIO_IDS.LIST_SMART_SAVE_SUCCESS,
    ],
    touchedPaths: ['/auth', '/lists/', '/lists/$id'],
  },
  {
    journeyId: JOURNEY_IDS.SHARE_LIST_END_TO_END,
    persona: 'owner->guest',
    objective: 'Compartilhar lista como editor e concluir entrada pelo convite',
    blocking: true,
    requiredScenarioIds: [
      SCENARIO_IDS.LIST_SHARE_COPY_EDITOR_LINK,
      SCENARIO_IDS.LIST_SHARE_COPY_VIEWER_LINK,
      SCENARIO_IDS.LIST_SHARE_OPEN_LINK_AND_JOIN,
      SCENARIO_IDS.LISTS_JOIN_EDITOR_FLOW,
      SCENARIO_IDS.LISTS_JOIN_VIEWER_READ_ONLY,
    ],
    touchedPaths: ['/auth', '/lists/', '/lists/$id', '/lists/$id/join'],
  },
  {
    journeyId: JOURNEY_IDS.INVITE_ROLE_FALLBACK,
    persona: 'guest',
    objective: 'Validar fallback de role inválido para viewer',
    blocking: true,
    requiredScenarioIds: [SCENARIO_IDS.LISTS_JOIN_INVALID_ROLE_FALLBACK],
    touchedPaths: ['/auth', '/lists/$id/join'],
  },
]
