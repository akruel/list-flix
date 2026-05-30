import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ContentItem } from "../types";
import { MovieCard } from "./MovieCard";

const mocks = vi.hoisted(() => ({
  watchedIds: [] as number[],
  seriesMetadataMap: {} as Record<
    number,
    { total_episodes: number; number_of_seasons: number } | undefined
  >,
  useSeriesProgress: vi.fn(),
  getImageUrl: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: ReactNode;
    to: string;
    params: Record<string, string>;
  }) => (
    <a
      href="https://test.com"
      data-to={to}
      data-params={JSON.stringify(params)}
    >
      {children}
    </a>
  ),
}));

vi.mock("../hooks/userContent", () => ({
  useIsWatched: (id: number) => mocks.watchedIds.includes(id),
  useSeriesMetadata: (id: number) => mocks.seriesMetadataMap[id],
}));

vi.mock("../hooks/useSeriesProgress", () => ({
  useSeriesProgress: (...args: unknown[]) => mocks.useSeriesProgress(...args),
}));

vi.mock("@/lib/tmdb-images", () => ({
  getTmdbImageUrl: (...args: unknown[]) => mocks.getImageUrl(...args),
}));

describe("MovieCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.watchedIds = [];
    mocks.seriesMetadataMap = {};
    mocks.useSeriesProgress.mockReturnValue({ watchedCount: 0 });
    mocks.getImageUrl.mockReturnValue("https://img.local/poster.jpg");
  });

  const metadataCases: Array<{
    caseName: string;
    item: ContentItem;
    expectedTitle: string;
    expectedYear: string;
  }> = [
    {
      caseName: "movie metadata",
      item: {
        id: 10,
        media_type: "movie" as const,
        title: "Movie One",
        release_date: "2020-07-01",
        vote_average: 8.5,
      },
      expectedTitle: "Movie One",
      expectedYear: "2020",
    },
    {
      caseName: "tv metadata",
      item: {
        id: 20,
        media_type: "tv" as const,
        name: "Series One",
        first_air_date: "2019-07-01",
        vote_average: 7.2,
      },
      expectedTitle: "Series One",
      expectedYear: "2019",
    },
  ];

  it.each(metadataCases)(
    "renders $caseName",
    ({ item, expectedTitle, expectedYear }) => {
      render(<MovieCard item={item} />);

      expect(screen.getByText(expectedTitle)).toBeInTheDocument();
      expect(screen.getByText(expectedYear)).toBeInTheDocument();
      expect(mocks.getImageUrl).toHaveBeenCalledWith(item.poster_path, "w500");
      expect(screen.getByRole("img")).toHaveAttribute(
        "src",
        "https://img.local/poster.jpg",
      );
    },
  );

  it("shows watched badge when content is watched", () => {
    mocks.watchedIds = [10];

    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
      />,
    );

    expect(screen.getByTestId("watched-badge")).toBeInTheDocument();
  });

  it("renders with explicit watched and series props without hook queries", () => {
    render(
      <MovieCard
        item={{
          id: 40,
          media_type: "tv",
          name: "Series",
          first_air_date: "2020-01-01",
        }}
        watched={true}
        seriesMetadata={{ total_episodes: 10, number_of_seasons: 2 }}
        seriesWatchedCount={5}
        showProgress
      />,
    );

    expect(screen.queryByTestId("watched-badge")).not.toBeInTheDocument();
    expect(screen.getByTestId("progress-fill")).toHaveStyle({ width: "50%" });
  });

  it("shows amber progress bar for tv series with partial progress", () => {
    render(
      <MovieCard
        item={{
          id: 43,
          media_type: "tv",
          name: "Ongoing Show",
          first_air_date: "2022-01-01",
        }}
        seriesMetadata={{ total_episodes: 10, number_of_seasons: 1 }}
        seriesWatchedCount={3}
        showProgress
      />,
    );

    expect(screen.queryByTestId("watched-badge")).not.toBeInTheDocument();
    const fill = screen.getByTestId("progress-fill");
    expect(fill).toHaveStyle({ width: "30%" });
    expect(fill.className).toContain("bg-amber-500");
    expect(fill.className).not.toContain("bg-green-500");
  });

  it("shows green progress bar and no badge when tv series is 100% complete", () => {
    render(
      <MovieCard
        item={{
          id: 42,
          media_type: "tv",
          name: "Finished Show",
          first_air_date: "2021-01-01",
        }}
        watched={true}
        seriesMetadata={{ total_episodes: 8, number_of_seasons: 1 }}
        seriesWatchedCount={8}
        showProgress
      />,
    );

    expect(screen.queryByTestId("watched-badge")).not.toBeInTheDocument();
    const fill = screen.getByTestId("progress-fill");
    expect(fill).toHaveStyle({ width: "100%" });
    expect(fill.className).toContain("bg-green-500");
  });

  it.each([
    {
      caseName: "series metadata only",
      props: {
        seriesMetadata: {
          total_episodes: 10,
          number_of_seasons: 1,
        },
      },
    },
    {
      caseName: "series watched count only",
      props: { seriesWatchedCount: 2 },
    },
    {
      caseName: "explicit unwatched flag",
      props: { watched: false },
    },
  ])("uses parent props when $caseName is provided", ({ props }) => {
    render(
      <MovieCard
        item={{
          id: 41,
          media_type: "tv",
          name: "Parent Props Show",
        }}
        {...props}
      />,
    );

    expect(screen.getByText("Parent Props Show")).toBeInTheDocument();
    expect(screen.queryByTestId("watched-badge")).not.toBeInTheDocument();
  });

  it.each([
    {
      caseName: "tv progress shown",
      showProgress: true,
      mediaType: "tv" as const,
      metadata: { total_episodes: 10, number_of_seasons: 1 },
      watchedCount: 4,
      shouldShow: true,
      expectedWidth: "40%",
    },
    {
      caseName: "hidden when showProgress false",
      showProgress: false,
      mediaType: "tv" as const,
      metadata: { total_episodes: 10, number_of_seasons: 1 },
      watchedCount: 4,
      shouldShow: false,
      expectedWidth: null,
    },
    {
      caseName: "hidden for movies",
      showProgress: true,
      mediaType: "movie" as const,
      metadata: { total_episodes: 10, number_of_seasons: 1 },
      watchedCount: 4,
      shouldShow: false,
      expectedWidth: null,
    },
    {
      caseName: "hidden when no metadata",
      showProgress: true,
      mediaType: "tv" as const,
      metadata: undefined,
      watchedCount: 4,
      shouldShow: false,
      expectedWidth: null,
    },
    {
      caseName: "hidden when watchedCount is zero",
      showProgress: true,
      mediaType: "tv" as const,
      metadata: { total_episodes: 10, number_of_seasons: 1 },
      watchedCount: 0,
      shouldShow: false,
      expectedWidth: null,
    },
    {
      caseName: "shows 0% when total_episodes is zero",
      showProgress: true,
      mediaType: "tv" as const,
      metadata: { total_episodes: 0, number_of_seasons: 1 },
      watchedCount: 1,
      shouldShow: true,
      expectedWidth: "0%",
    },
  ])(
    "handles progress for $caseName",
    ({
      showProgress,
      mediaType,
      metadata,
      watchedCount,
      shouldShow,
      expectedWidth,
    }) => {
      mocks.seriesMetadataMap = metadata ? { 30: metadata } : {};
      mocks.useSeriesProgress.mockReturnValue({ watchedCount });

      render(
        <MovieCard
          item={{
            id: 30,
            media_type: mediaType,
            title: "Item",
            name: "Item",
          }}
          showProgress={showProgress}
        />,
      );

      const progressFill = screen.queryByTestId("progress-fill");

      expect(progressFill !== null).toBe(shouldShow);
      expect(progressFill?.style.width ?? null).toBe(expectedWidth);
    },
  );

  it("defaults rating to 0.0 when vote_average is missing", () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
      />,
    );

    expect(screen.getByText("0.0")).toBeInTheDocument();
  });

  it("renders without link when disableLink is true", () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
        disableLink
      />,
    );

    expect(screen.getByText("Movie One")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("hides 'Ver Detalhes' overlay when disableLink is true", () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
        disableLink
      />,
    );

    expect(screen.queryByText("Ver Detalhes")).not.toBeInTheDocument();
  });

  it("shows watching-with badge when context has members", () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
        watchingWith={[
          {
            listName: "Amigos",
            memberNames: ["Amanda"],
          },
        ]}
      />,
    );

    expect(screen.getByTestId("watching-with-badge")).toBeInTheDocument();
    expect(screen.getByText("Amanda")).toBeInTheDocument();
  });

  it("shows multiple member names in watching-with badge", () => {
    render(
      <MovieCard
        item={{
          id: 20,
          media_type: "movie",
          title: "Movie Two",
        }}
        watchingWith={[
          {
            listName: "Amigos",
            memberNames: ["Amanda", "João"],
          },
        ]}
      />,
    );

    expect(screen.getByTestId("watching-with-badge")).toBeInTheDocument();
    expect(screen.getByText("Amanda, João")).toBeInTheDocument();
  });

  it("hides watching-with badge when context is empty", () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
        watchingWith={[]}
      />,
    );

    expect(screen.queryByTestId("watching-with-badge")).not.toBeInTheDocument();
  });

  it("hides watching-with badge when context is undefined", () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
      />,
    );

    expect(screen.queryByTestId("watching-with-badge")).not.toBeInTheDocument();
  });

  it("shows watching-with badge alongside watched badge", () => {
    mocks.watchedIds = [10];

    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
        watchingWith={[
          {
            listName: "Amigos",
            memberNames: ["Amanda"],
          },
        ]}
      />,
    );

    expect(screen.getByTestId("watched-badge")).toBeInTheDocument();
    expect(screen.getByTestId("watching-with-badge")).toBeInTheDocument();
  });

  it("deduplicates member names across multiple contexts", () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Movie One",
        }}
        watchingWith={[
          { listName: "Amigos", memberNames: ["Amanda"] },
          { listName: "Família", memberNames: ["Amanda", "João"] },
        ]}
      />,
    );

    expect(screen.getByText("Amanda, João")).toBeInTheDocument();
    expect(screen.queryByText("Amanda, Amanda, João")).not.toBeInTheDocument();
  });

  it("handles empty memberNames gracefully", () => {
    render(
      <MovieCard
        item={{
          id: 10,
          media_type: "movie",
          title: "Test Movie",
        }}
        watchingWith={[
          { listName: "Amigos", memberNames: null as unknown as string[] },
        ]}
      />,
    );
    expect(screen.getByText("Test Movie")).toBeInTheDocument();
  });
});
