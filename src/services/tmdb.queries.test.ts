import { describe, expect, it, vi } from "vitest";

import { detailsQuery, seasonQuery, tmdbKeys } from "./tmdb.queries";

vi.mock("./tmdb", () => ({
  tmdb: {
    getDetails: vi.fn().mockResolvedValue({ id: 1 }),
    getSeasonDetails: vi.fn().mockResolvedValue({ id: 10 }),
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

    await query.queryFn();
    expect(tmdb.getSeasonDetails).toHaveBeenCalledWith(11, 3);
  });
});
