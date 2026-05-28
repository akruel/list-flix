import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThisWeekComponent } from "./this-week";

type MockQueryResult<T = unknown> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
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
  isDateInCurrentWeek: vi.fn(() => true),
}));

vi.mock("@/store/useUserContentStore", () => ({
  useUserContentStore: (selector: (s: typeof mocks) => unknown) =>
    selector(mocks as unknown as Parameters<typeof selector>[0]),
}));

vi.mock("@tanstack/react-query", () => ({
  useSuspenseQuery: () => ({ data: mocks.sharedItems }),
  useQuery: () => ({ data: mocks.watchingContextMap }),
  useQueries: ({
    queries,
  }: {
    queries: Array<{ queryKey: readonly unknown[] }>;
  }) => {
    if (queries.length === 0) return [];
    const firstKey = queries[0]?.queryKey?.[1];
    if (firstKey === "details")
      return mocks.detailsResults.slice(0, queries.length);
    if (firstKey === "season")
      return mocks.seasonResults.slice(0, queries.length);
    return [];
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
  isDateInCurrentWeek: (...args: unknown[]) =>
    mocks.isDateInCurrentWeek(...args),
  getDateKey: (date: string) => date.slice(0, 10),
  getDayLabel: (key: string) => `Day(${key})`,
  getFormattedDate: (key: string) => key,
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn() },
}));

vi.mock("@/services/listService.queries", () => ({
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
    expect(screen.getByRole("link", { name: "Buscar séries" })).toHaveAttribute(
      "data-to",
      "/search",
    );
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
});
