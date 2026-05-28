import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SeasonList } from "./SeasonList";

const mocks = vi.hoisted(() => ({
  getSeasonDetails: vi.fn(),
  toastError: vi.fn(),
  mutateEpisodeWatched: vi.fn(),
  mutateSeasonWatched: vi.fn(),
  useStoreValue: {
    watchedEpisodes: {} as Record<
      number,
      Record<number, { season_number: number; episode_number: number }>
    >,
  },
  useSeasonProgress: vi.fn(),
}));

function buildWatchedEpisodes(perSeason: Record<number, number>) {
  let episodeId = 1;
  const map: Record<number, { season_number: number; episode_number: number }> =
    {};
  Object.entries(perSeason).forEach(([seasonNumber, count]) => {
    for (let i = 0; i < count; i++) {
      map[episodeId++] = {
        season_number: Number(seasonNumber),
        episode_number: i + 1,
      };
    }
  });
  return map;
}

vi.mock("../services/tmdb", () => ({
  tmdb: {
    getSeasonDetails: (...args: unknown[]) => mocks.getSeasonDetails(...args),
    getImageUrl: vi.fn(() => "https://img.local/poster.jpg"),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mocks.toastError(...args),
  },
}));

vi.mock("@/hooks/mutations", () => ({
  useToggleEpisodeWatched: () => ({ mutate: mocks.mutateEpisodeWatched }),
  useToggleSeasonWatched: () => ({ mutate: mocks.mutateSeasonWatched }),
}));

vi.mock("../store/useUserContentStore", () => ({
  useUserContentStore: (
    selector: (state: typeof mocks.useStoreValue) => unknown,
  ) => selector(mocks.useStoreValue),
}));

vi.mock("../hooks/useSeasonProgress", () => ({
  useSeasonProgress: (...args: unknown[]) => mocks.useSeasonProgress(...args),
}));

vi.mock("./skeletons", () => ({
  EpisodeListSkeleton: () => <div data-testid="episode-skeleton" />,
}));

describe("SeasonList", () => {
  const seasons = [
    {
      id: 2,
      name: "Season 2",
      season_number: 2,
      episode_count: 2,
      air_date: "2021-01-01",
      poster_path: "/season2.jpg",
    },
    {
      id: 1,
      name: "Season 1",
      season_number: 1,
      episode_count: 2,
      air_date: "2020-01-01",
      poster_path: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useStoreValue.watchedEpisodes = {};

    mocks.useSeasonProgress.mockReturnValue({
      watchedCount: 0,
      totalCount: 2,
      percentage: 0,
    });
    mocks.getSeasonDetails.mockResolvedValue({
      episodes: [
        {
          id: 101,
          name: "Episode 1",
          season_number: 1,
          episode_number: 1,
          still_path: null,
          air_date: "2020-01-10",
          vote_average: 7.5,
          overview: "Overview 1",
        },
        {
          id: 102,
          name: "Episode 2",
          season_number: 1,
          episode_number: 2,
          still_path: "/still.jpg",
          air_date: "2020-01-17",
          vote_average: 8.1,
          overview: "Overview 2",
        },
      ],
    });
  });

  it("renders seasons sorted by number", () => {
    const renderComponent = () =>
      render(<SeasonList tvId={100} seasons={seasons} />);
    renderComponent();

    const seasonHeadings = screen
      .getAllByRole("heading", { level: 3 })
      .map((node) => node.textContent);
    expect(seasonHeadings).toEqual(["Season 1", "Season 2"]);
  });

  it("renders N/A when season air_date is missing", () => {
    render(
      <SeasonList
        tvId={100}
        seasons={[
          {
            id: 1,
            name: "Season sem data",
            season_number: 1,
            episode_count: 2,
            air_date: "",
            poster_path: null,
          },
        ]}
      />,
    );

    expect(screen.getByText(/2 episódios • N\/A/i)).toBeInTheDocument();
  });

  it("expands season and loads episodes", async () => {
    render(<SeasonList tvId={100} seasons={seasons} />);

    await userEvent.click(screen.getByText("Season 1"));

    await waitFor(() => {
      expect(mocks.getSeasonDetails).toHaveBeenCalledWith(100, 1);
    });
    expect(await screen.findByText("Episode 1")).toBeInTheDocument();
  });

  it("marks season as watched without refetch when expanded episodes already belong to same season", async () => {
    render(<SeasonList tvId={100} seasons={seasons} />);

    await userEvent.click(screen.getByText("Season 1"));
    await screen.findByText("Episode 1");

    mocks.getSeasonDetails.mockClear();
    const seasonToggleButtons = screen.getAllByRole("button", {
      name: /Marcar como/i,
    });
    await userEvent.click(seasonToggleButtons[0]);

    expect(mocks.getSeasonDetails).not.toHaveBeenCalled();
    expect(mocks.mutateSeasonWatched).toHaveBeenCalledWith({
      showId: 100,
      seasonNumber: 1,
      episodes: expect.arrayContaining([expect.objectContaining({ id: 101 })]),
      action: "watch",
    });
  });

  it("collapses season when clicking expanded season again", async () => {
    render(<SeasonList tvId={100} seasons={seasons} />);

    await userEvent.click(screen.getByText("Season 1"));
    await screen.findByText("Episode 1");

    await userEvent.click(screen.getByText("Season 1"));

    expect(screen.queryByText("Episode 1")).not.toBeInTheDocument();
  });

  it("re-fetches episodes on re-expand", async () => {
    render(<SeasonList tvId={100} seasons={seasons} />);

    await userEvent.click(screen.getByText("Season 1"));
    await screen.findByText("Episode 1");
    expect(mocks.getSeasonDetails).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText("Season 1"));
    await userEvent.click(screen.getByText("Season 1"));

    await waitFor(() => {
      expect(mocks.getSeasonDetails).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Episode 1")).toBeInTheDocument();
  });

  it("renders watched season with green styling and Eye icon", () => {
    mocks.useStoreValue.watchedEpisodes = {
      100: buildWatchedEpisodes({ 1: 2, 2: 2 }),
    };

    render(<SeasonList tvId={100} seasons={seasons} />);

    const buttons = screen.getAllByRole("button", {
      name: /Marcar como não assistido/i,
    });
    expect(buttons.length).toBeGreaterThan(0);

    const button = buttons[0];
    expect(button.className).toContain("text-green-500");
  });

  it("fetches season details when marking as watched without expanding", async () => {
    render(<SeasonList tvId={100} seasons={seasons} />);

    const seasonToggleButtons = screen.getAllByRole("button", {
      name: /Marcar como/i,
    });
    await userEvent.click(seasonToggleButtons[0]);

    await waitFor(() => {
      expect(mocks.getSeasonDetails).toHaveBeenCalledWith(100, 1);
    });
    await waitFor(() => {
      expect(mocks.mutateSeasonWatched).toHaveBeenCalledWith({
        showId: 100,
        seasonNumber: 1,
        episodes: expect.arrayContaining([
          expect.objectContaining({ id: 101, name: "Episode 1" }),
        ]),
        action: "watch",
      });
    });
  });

  it.each([
    {
      caseName: "marks season as unwatched when fully watched",
      watchedCount: 2,
      expectedWatchedCall: false,
      expectedUnwatchedCall: true,
    },
    {
      caseName: "marks season as watched when not fully watched",
      watchedCount: 0,
      expectedWatchedCall: true,
      expectedUnwatchedCall: false,
    },
  ])(
    "toggles season watched state for $caseName",
    async ({ watchedCount, expectedWatchedCall }) => {
      mocks.useStoreValue.watchedEpisodes = {
        100: buildWatchedEpisodes({ 1: watchedCount }),
      };

      render(<SeasonList tvId={100} seasons={seasons} />);

      const seasonToggleButtons = screen.getAllByRole("button", {
        name: /Marcar como/i,
      });
      await userEvent.click(seasonToggleButtons[0]);

      await waitFor(() => {
        expect(mocks.mutateSeasonWatched).toHaveBeenCalledTimes(1);
      });
      expect(mocks.mutateSeasonWatched).toHaveBeenCalledWith(
        expect.objectContaining({
          showId: 100,
          seasonNumber: 1,
          action: expectedWatchedCall ? "watch" : "unwatch",
        }),
      );
    },
  );

  it("handles retry button after expand error", async () => {
    mocks.getSeasonDetails
      .mockRejectedValueOnce(new Error("expand failed"))
      .mockResolvedValueOnce({
        episodes: [
          {
            id: 401,
            name: "Retried Episode",
            season_number: 1,
            episode_number: 1,
            still_path: null,
            air_date: "2020-01-10",
            vote_average: 7.5,
            overview: "Retry success",
          },
        ],
      });

    render(<SeasonList tvId={100} seasons={seasons} />);

    await userEvent.click(screen.getByText("Season 1"));
    expect(
      await screen.findByText("Erro ao carregar episódios. Tente novamente."),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Tentar novamente/i }),
    );
    expect(await screen.findByText("Retried Episode")).toBeInTheDocument();
    expect(mocks.getSeasonDetails).toHaveBeenCalledTimes(2);
  });

  it("shows toast error when season details fail on watched toggle", async () => {
    mocks.getSeasonDetails.mockRejectedValue(new Error("season failed"));

    render(<SeasonList tvId={100} seasons={seasons} />);

    const seasonToggleButtons = screen.getAllByRole("button", {
      name: /Marcar como/i,
    });
    await userEvent.click(seasonToggleButtons[0]);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Erro ao marcar temporada como assistida / não assistida",
      );
    });
  });

  it("handles expand season fetch errors and shows error UI", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.getSeasonDetails.mockRejectedValue(new Error("expand failed"));

    render(<SeasonList tvId={100} seasons={seasons} />);

    await userEvent.click(screen.getByText("Season 1"));

    expect(
      await screen.findByText("Erro ao carregar episódios. Tente novamente."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tentar novamente/i }),
    ).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("clears stale episodes when expanding a new season", async () => {
    render(<SeasonList tvId={100} seasons={seasons} />);

    await userEvent.click(screen.getByText("Season 1"));
    expect(await screen.findByText("Episode 1")).toBeInTheDocument();

    mocks.getSeasonDetails.mockRejectedValue(new Error("fetch failed"));

    await userEvent.click(screen.getByText("Season 2"));
    expect(
      await screen.findByText("Erro ao carregar episódios. Tente novamente."),
    ).toBeInTheDocument();

    const seasonToggleButtons = screen.getAllByRole("button", {
      name: /Marcar como/i,
    });
    await userEvent.click(seasonToggleButtons[1]);

    await waitFor(() => {
      expect(mocks.mutateSeasonWatched).not.toHaveBeenCalled();
    });
    expect(mocks.toastError).toHaveBeenCalled();
  });

  it("shows episode fallbacks for missing air date and overview", async () => {
    mocks.getSeasonDetails.mockResolvedValue({
      episodes: [
        {
          id: 201,
          name: "Episode sem dados",
          season_number: 1,
          episode_number: 1,
          still_path: null,
          air_date: "",
          vote_average: 7.0,
          overview: "",
        },
      ],
    });

    render(<SeasonList tvId={100} seasons={seasons} />);

    await userEvent.click(screen.getByText("Season 1"));

    expect(await screen.findByText("TBA")).toBeInTheDocument();
    expect(screen.getByText("Sinopse não disponível.")).toBeInTheDocument();
  });

  it.each([
    { caseName: "zero episodes", episodeCount: 0, expectedLabel: "1/0" },
    { caseName: "non-zero episodes", episodeCount: 2, expectedLabel: "1/2" },
  ])(
    "renders season progress when watchedCount is greater than zero for $caseName",
    ({ episodeCount, expectedLabel }) => {
      mocks.useSeasonProgress.mockReturnValue({
        watchedCount: 1,
        totalCount: episodeCount,
        percentage: 50,
      });

      render(
        <SeasonList
          tvId={100}
          seasons={[
            {
              id: 1,
              name: "Season 1",
              season_number: 1,
              episode_count: episodeCount,
              air_date: "2020-01-01",
              poster_path: null,
            },
          ]}
        />,
      );

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it.each([
    {
      caseName: "marks episode as watched",
      isEpisodeWatched: false,
      expectedWatchedCall: true,
      expectedUnwatchedCall: false,
    },
    {
      caseName: "marks episode as unwatched",
      isEpisodeWatched: true,
      expectedWatchedCall: false,
      expectedUnwatchedCall: true,
    },
  ])(
    "toggles episode watched state for $caseName",
    async ({ isEpisodeWatched, expectedWatchedCall }) => {
      mocks.useStoreValue.watchedEpisodes = isEpisodeWatched
        ? { 100: { 101: { season_number: 1, episode_number: 1 } } }
        : {};

      render(<SeasonList tvId={100} seasons={seasons} />);

      await userEvent.click(screen.getByText("Season 1"));
      expect(await screen.findByText("Episode 1")).toBeInTheDocument();

      const episodeRow = screen.getByTestId("episode-row-101");
      expect(episodeRow).not.toBeNull();
      const episodeButton = within(episodeRow).getByRole("button", {
        name: /Marcar como/i,
      });
      await userEvent.click(episodeButton);

      expect(mocks.mutateEpisodeWatched).toHaveBeenCalledTimes(1);
      expect(mocks.mutateEpisodeWatched).toHaveBeenCalledWith(
        expect.objectContaining({
          showId: 100,
          episodeId: 101,
          action: expectedWatchedCall ? "watch" : "unwatch",
        }),
      );
    },
  );
});
