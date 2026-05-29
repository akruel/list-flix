import { describe, expect, it, vi } from "vitest";

import {
  detailsQuery,
  discoverQuery,
  seasonQuery,
  tmdbKeys,
  trendingQuery,
} from "./tmdb.queries";

vi.mock("./tmdb", () => ({
  tmdb: {
    getDetails: vi.fn().mockResolvedValue({ id: 1 }),
    getSeasonDetails: vi.fn().mockResolvedValue({ id: 10 }),
    getTrending: vi.fn().mockResolvedValue([{ id: 100 }]),
    discover: vi.fn().mockResolvedValue([{ id: 200 }]),
  },
}));

describe("tmdb.queries", () => {
  it("builds a stable key hierarchy", () => {
    expect(tmdbKeys.all).toEqual(["tmdb"]);
    expect(tmdbKeys.details("movie", 42)).toEqual([
      "tmdb",
      "details",
      "movie",
      42,
    ]);
    expect(tmdbKeys.season(7, 2)).toEqual(["tmdb", "season", 7, 2]);
    expect(tmdbKeys.trending("week")).toEqual(["tmdb", "trending", "week"]);
    expect(tmdbKeys.discover({ mood: "suspense", mediaType: "movie" })).toEqual(
      ["tmdb", "discover", "suspense", "movie"],
    );
  });

  it("detailsQuery wires tmdb.getDetails with abort signal", async () => {
    const { tmdb } = await import("./tmdb");
    const controller = new AbortController();

    const query = detailsQuery("tv", 99);
    expect(query.queryKey).toEqual(["tmdb", "details", "tv", 99]);

    await query.queryFn({ signal: controller.signal });
    expect(tmdb.getDetails).toHaveBeenCalledWith(99, "tv", controller.signal);
  });

  it("seasonQuery wires tmdb.getSeasonDetails", async () => {
    const { tmdb } = await import("./tmdb");

    const query = seasonQuery(11, 3);
    expect(query.queryKey).toEqual(["tmdb", "season", 11, 3]);

    const controller = new AbortController();
    await query.queryFn({ signal: controller.signal });
    expect(tmdb.getSeasonDetails).toHaveBeenCalledWith(
      11,
      3,
      controller.signal,
    );
  });

  it("trendingQuery defaults to week and calls tmdb.getTrending", async () => {
    const { tmdb } = await import("./tmdb");

    const query = trendingQuery();
    expect(query.queryKey).toEqual(["tmdb", "trending", "week"]);

    await query.queryFn();
    expect(tmdb.getTrending).toHaveBeenCalledWith("week");
  });

  it("trendingQuery accepts a custom time window", async () => {
    const { tmdb } = await import("./tmdb");

    const query = trendingQuery("day");
    expect(query.queryKey).toEqual(["tmdb", "trending", "day"]);

    await query.queryFn();
    expect(tmdb.getTrending).toHaveBeenCalledWith("day");
  });

  it("discoverQuery wires mood discover params and forwards signal", async () => {
    const { tmdb } = await import("./tmdb");
    const controller = new AbortController();

    const query = discoverQuery({ mood: "suspense", mediaType: "tv" });
    expect(query.queryKey).toEqual(["tmdb", "discover", "suspense", "tv"]);

    await query.queryFn({ signal: controller.signal });
    expect(tmdb.discover).toHaveBeenCalledTimes(1);
    const [params, signal] = vi.mocked(tmdb.discover).mock.calls[0];
    expect(params).toMatchObject({
      media_type: "tv",
      sort_by: "popularity.desc",
    });
    expect(signal).toBe(controller.signal);
  });
});
