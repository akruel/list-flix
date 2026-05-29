// Tests mock @tanstack/react-query at the hook level (layout/state assertions).
// They do not exercise QueryClient cache, suspense boundaries, or retry behavior.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sharedTvItemsSafeQuery } from "@/services/listService.queries";

import { ThisWeekComponent, ThisWeekErrorComponent } from "./this-week";

type MockQueryResult<T = unknown> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  refetch?: () => void;
};

const mocks = vi.hoisted(() => ({
  myList: [] as Array<{ id: number; media_type: "movie" | "tv" }>,
  watchedEpisodes: {} as Record<number, Record<number, unknown>>,
  sharedItems: [] as Array<{ content_id: number; content_type: string }>,
  watchingContextMap: {} as Record<
    number,
    Array<{ listName: string; memberNames: string[] }>
  >,
  detailsResults: [] as MockQueryResult[],
  seasonResults: [] as MockQueryResult[],
  isDateInCurrentWeek: vi.fn<(date: string) => boolean>(() => true),
  loggerError: vi.fn(),
  getAllSharedTvItems: vi.fn(),
}));

vi.mock("@/hooks/userContent", () => ({
  useMyList: () => mocks.myList,
  useWatchedEpisodes: () => mocks.watchedEpisodes,
}));

vi.mock("@/contexts/SearchModalContext", () => ({
  useSearchModal: () => ({
    isOpen: false,
    openSearch: vi.fn(),
    closeSearch: vi.fn(),
  }),
}));

function pickMockResults(queries: Array<{ queryKey: readonly unknown[] }>) {
  if (queries.length === 0) return [];
  const firstKey = queries[0]?.queryKey?.[1];
  if (firstKey === "details")
    return mocks.detailsResults.slice(0, queries.length);
  if (firstKey === "season")
    return mocks.seasonResults.slice(0, queries.length);
  return [];
}

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({ data: mocks.sharedItems }),
  useQuery: () => ({ data: mocks.watchingContextMap }),
  useQueries: ({
    queries,
    combine,
  }: {
    queries: Array<{ queryKey: readonly unknown[] }>;
    combine?: (results: MockQueryResult[]) => Record<string, unknown>;
  }) => {
    const results = pickMockResults(queries);
    return combine ? combine(results) : results;
  },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
    className?: string;
  }) => (
    <a
      href="https://test.com"
      data-to={to}
      data-params={JSON.stringify(params)}
      className={className}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/services/tmdb", () => ({
  tmdb: {
    getImageUrl: vi.fn(
      (path: string) => `https://image.tmdb.org/t/p/w300${path}`,
    ),
  },
}));

vi.mock("@/lib/date-utils", () => ({
  isDateInCurrentWeek: (date: string) => mocks.isDateInCurrentWeek(date),
  getDateKey: (date: string) => date.slice(0, 10),
  getDayLabel: (key: string) => `Day(${key})`,
  getFormattedDate: (key: string) => key,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mocks.loggerError(...args),
  },
}));

vi.mock("@/services/listService", () => ({
  listService: {
    getAllSharedTvItems: () => mocks.getAllSharedTvItems(),
  },
}));

vi.mock("@/services/listService.queries", () => ({
  sharedTvItemsSafeQuery: () => ({
    queryKey: ["listService", "sharedTvItems"] as const,
    queryFn: async () => {
      try {
        return await mocks.getAllSharedTvItems();
      } catch (err) {
        mocks.loggerError(
          "Erro ao buscar séries de listas compartilhadas:",
          err,
        );
        return [];
      }
    },
  }),
  sharedTvItemsQuery: () => ({
    queryKey: ["listService", "sharedTvItems"] as const,
  }),
  watchingContextBatchQuery: () => ({
    queryKey: ["listService", "watchingContext", "batch"] as const,
    enabled: false,
  }),
}));

vi.mock("@/services/tmdb.queries", () => ({
  detailsQuery: (type: string, id: number) => ({
    queryKey: ["tmdb", "details", type, id] as const,
  }),
  seasonQuery: (tvId: number, seasonNumber: number) => ({
    queryKey: ["tmdb", "season", tvId, seasonNumber] as const,
  }),
}));

describe("ThisWeek route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.myList = [];
    mocks.watchedEpisodes = {};
    mocks.sharedItems = [];
    mocks.watchingContextMap = {};
    mocks.detailsResults = [];
    mocks.seasonResults = [];
    mocks.isDateInCurrentWeek.mockReturnValue(true);
  });

  it("renders the page title", () => {
    render(<ThisWeekComponent />);

    expect(screen.getByText("Esta Semana")).toBeInTheDocument();
    expect(screen.getByTestId("route-this-week")).toBeInTheDocument();
  });

  it("shows empty state when user has no TV shows", () => {
    mocks.myList = [];
    mocks.sharedItems = [];
    mocks.detailsResults = [];

    render(<ThisWeekComponent />);

    expect(
      screen.getByText(/Você ainda não adicionou nenhuma série/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Buscar séries" }),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton while details queries are pending", () => {
    mocks.myList = [{ id: 1, media_type: "tv" }];
    mocks.detailsResults = [
      { data: undefined, isPending: true, isError: false },
    ];
    mocks.seasonResults = [];

    render(<ThisWeekComponent />);

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("shows 'no episodes this week' when no air dates match current week", () => {
    mocks.isDateInCurrentWeek.mockReturnValue(false);
    mocks.myList = [{ id: 1, media_type: "tv" }];
    mocks.detailsResults = [
      {
        data: {
          id: 1,
          name: "Show 1",
          poster_path: "/poster1.jpg",
          last_episode_to_air: { season_number: 2 },
        },
        isPending: false,
        isError: false,
      },
    ];
    mocks.seasonResults = [
      {
        data: {
          season_number: 2,
          episodes: [
            {
              id: 101,
              name: "Old Ep",
              air_date: "2020-01-01",
              season_number: 2,
              episode_number: 1,
              overview: "",
            },
          ],
        },
        isPending: false,
        isError: false,
      },
    ];

    render(<ThisWeekComponent />);

    expect(
      screen.getByText("Nenhum episódio estreia esta semana."),
    ).toBeInTheDocument();
  });

  it("renders episodes airing this week", () => {
    mocks.isDateInCurrentWeek.mockReturnValue(true);
    mocks.myList = [{ id: 42, media_type: "tv" }];
    mocks.detailsResults = [
      {
        data: {
          id: 42,
          name: "My Show",
          poster_path: "/show.jpg",
          next_episode_to_air: { season_number: 3 },
        },
        isPending: false,
        isError: false,
      },
    ];
    mocks.seasonResults = [
      {
        data: {
          season_number: 3,
          episodes: [
            {
              id: 201,
              name: "Premiere",
              air_date: "2026-05-28",
              season_number: 3,
              episode_number: 1,
              overview: "Great episode",
            },
          ],
        },
        isPending: false,
        isError: false,
      },
    ];

    render(<ThisWeekComponent />);

    expect(screen.getByText("My Show")).toBeInTheDocument();
    expect(screen.getByText("Premiere")).toBeInTheDocument();
    expect(screen.getByText(/Temporada 3/)).toBeInTheDocument();
  });

  it("skips episodes that have already been watched", () => {
    mocks.isDateInCurrentWeek.mockReturnValue(true);
    mocks.myList = [{ id: 42, media_type: "tv" }];
    mocks.watchedEpisodes = {
      42: { 201: { season_number: 3, episode_number: 1 } },
    };
    mocks.detailsResults = [
      {
        data: {
          id: 42,
          name: "My Show",
          poster_path: null,
          next_episode_to_air: { season_number: 3 },
        },
        isPending: false,
        isError: false,
      },
    ];
    mocks.seasonResults = [
      {
        data: {
          season_number: 3,
          episodes: [
            {
              id: 201,
              name: "Already Watched",
              air_date: "2026-05-28",
              season_number: 3,
              episode_number: 1,
              overview: "",
            },
          ],
        },
        isPending: false,
        isError: false,
      },
    ];

    render(<ThisWeekComponent />);

    expect(screen.queryByText("Already Watched")).not.toBeInTheDocument();
    expect(
      screen.getByText("Nenhum episódio estreia esta semana."),
    ).toBeInTheDocument();
  });

  it("shows watching context members for shared list items", () => {
    mocks.isDateInCurrentWeek.mockReturnValue(true);
    mocks.myList = [{ id: 42, media_type: "tv" }];
    mocks.watchingContextMap = {
      42: [{ listName: "Squad", memberNames: ["Alice", "Bob"] }],
    };
    mocks.detailsResults = [
      {
        data: {
          id: 42,
          name: "Shared Show",
          poster_path: null,
          next_episode_to_air: { season_number: 1 },
        },
        isPending: false,
        isError: false,
      },
    ];
    mocks.seasonResults = [
      {
        data: {
          season_number: 1,
          episodes: [
            {
              id: 301,
              name: "Ep With Context",
              air_date: "2026-05-28",
              season_number: 1,
              episode_number: 1,
              overview: "",
            },
          ],
        },
        isPending: false,
        isError: false,
      },
    ];

    render(<ThisWeekComponent />);

    expect(screen.getByText("Alice, Bob")).toBeInTheDocument();
  });

  it("shows error UI when all details queries fail and refetches on retry", async () => {
    const user = userEvent.setup();
    const detailsRefetch = vi.fn();
    mocks.myList = [{ id: 1, media_type: "tv" }];
    mocks.detailsResults = [
      {
        data: undefined,
        isPending: false,
        isError: true,
        refetch: detailsRefetch,
      },
    ];
    mocks.seasonResults = [];

    render(<ThisWeekComponent />);

    expect(
      screen.getByText("Erro ao carregar episódios da semana."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Nenhum episódio estreia esta semana."),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(detailsRefetch).toHaveBeenCalledTimes(1);
  });

  it("shows error UI when all season queries fail and retries both stages", async () => {
    const user = userEvent.setup();
    const detailsRefetch = vi.fn();
    const seasonRefetch = vi.fn();
    mocks.myList = [{ id: 42, media_type: "tv" }];
    mocks.detailsResults = [
      {
        data: {
          id: 42,
          name: "My Show",
          poster_path: null,
          next_episode_to_air: { season_number: 3 },
        },
        isPending: false,
        isError: false,
        refetch: detailsRefetch,
      },
    ];
    mocks.seasonResults = [
      {
        data: undefined,
        isPending: false,
        isError: true,
        refetch: seasonRefetch,
      },
    ];

    render(<ThisWeekComponent />);

    expect(
      screen.getByText("Erro ao carregar episódios da semana."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(detailsRefetch).toHaveBeenCalledTimes(1);
    expect(seasonRefetch).toHaveBeenCalledTimes(1);
  });

  it("renders successful episodes and a partial-failure banner when some queries fail", () => {
    mocks.isDateInCurrentWeek.mockReturnValue(true);
    mocks.myList = [
      { id: 42, media_type: "tv" },
      { id: 99, media_type: "tv" },
    ];
    mocks.detailsResults = [
      {
        data: {
          id: 42,
          name: "Working Show",
          poster_path: null,
          next_episode_to_air: { season_number: 1 },
        },
        isPending: false,
        isError: false,
      },
      {
        data: undefined,
        isPending: false,
        isError: true,
      },
    ];
    mocks.seasonResults = [
      {
        data: {
          season_number: 1,
          episodes: [
            {
              id: 501,
              name: "Cool Episode",
              air_date: "2026-05-28",
              season_number: 1,
              episode_number: 1,
              overview: "",
            },
          ],
        },
        isPending: false,
        isError: false,
      },
    ];

    render(<ThisWeekComponent />);

    expect(screen.getByText("Working Show")).toBeInTheDocument();
    expect(screen.getByText("Cool Episode")).toBeInTheDocument();
    expect(screen.getByTestId("partial-failure")).toBeInTheDocument();
  });
});

describe("ThisWeekErrorComponent", () => {
  beforeEach(() => {
    mocks.loggerError.mockClear();
  });

  it("renders the failure message and the retry button", () => {
    render(<ThisWeekErrorComponent error={new Error("boom")} />);

    expect(
      screen.getByText("Não foi possível carregar os episódios desta semana."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "This Week route error:",
      expect.any(Error),
    );
  });
});

describe("sharedTvItemsSafeQuery", () => {
  beforeEach(() => {
    mocks.getAllSharedTvItems.mockReset();
    mocks.loggerError.mockClear();
  });

  it("returns the shared items when listService resolves", async () => {
    const items = [{ content_id: 1, content_type: "tv" }];
    mocks.getAllSharedTvItems.mockResolvedValue(items);

    const result = await sharedTvItemsSafeQuery().queryFn();

    expect(result).toEqual(items);
    expect(mocks.loggerError).not.toHaveBeenCalled();
  });

  it("resolves to an empty array and logs when listService rejects", async () => {
    const err = new Error("network down");
    mocks.getAllSharedTvItems.mockRejectedValue(err);

    const result = await sharedTvItemsSafeQuery().queryFn();

    expect(result).toEqual([]);
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Erro ao buscar séries de listas compartilhadas:",
      err,
    );
  });
});
