import { describe, expect, it } from "vitest";

import type { ContentItem } from "@/types";

import { deriveHomeTrending } from "./home-trending";

function movie(id: number): ContentItem {
  return { id, media_type: "movie", title: `Movie ${id}` } as ContentItem;
}

function tv(id: number): ContentItem {
  return { id, media_type: "tv", name: `Show ${id}` } as ContentItem;
}

describe("deriveHomeTrending", () => {
  const trendingDefault: ContentItem[] = [movie(1), tv(2), movie(3), tv(4)];

  it("returns trendingDefault as-is when no mood and no mediaType", () => {
    expect(
      deriveHomeTrending({
        selectedMood: null,
        selectedMediaType: null,
        trendingDefault,
        moodResults: [],
      }),
    ).toEqual(trendingDefault);
  });

  it("filters trendingDefault by mediaType when only mediaType is set", () => {
    expect(
      deriveHomeTrending({
        selectedMood: null,
        selectedMediaType: "tv",
        trendingDefault,
        moodResults: [],
      }),
    ).toEqual([tv(2), tv(4)]);
  });

  it("slices the first mood result to 20 when mood + mediaType are set", () => {
    const moodMovies = Array.from({ length: 25 }, (_, i) => movie(100 + i));

    const result = deriveHomeTrending({
      selectedMood: "suspense",
      selectedMediaType: "movie",
      trendingDefault,
      moodResults: [moodMovies],
    });

    expect(result).toHaveLength(20);
    expect(result[0]).toEqual(movie(100));
    expect(result[19]).toEqual(movie(119));
  });

  it("returns an empty array when mood + mediaType are set but the query has no data yet", () => {
    expect(
      deriveHomeTrending({
        selectedMood: "suspense",
        selectedMediaType: "movie",
        trendingDefault,
        moodResults: [undefined],
      }),
    ).toEqual([]);
  });

  it("interleaves movie and tv results when mood is set without mediaType", () => {
    const result = deriveHomeTrending({
      selectedMood: "suspense",
      selectedMediaType: null,
      trendingDefault,
      moodResults: [
        [movie(10), movie(11)],
        [tv(20), tv(21)],
      ],
    });

    expect(result).toEqual([movie(10), tv(20), movie(11), tv(21)]);
  });

  it("interleaves when one side is shorter than the other", () => {
    const result = deriveHomeTrending({
      selectedMood: "suspense",
      selectedMediaType: null,
      trendingDefault,
      moodResults: [[movie(10)], [tv(20), tv(21), tv(22)]],
    });

    expect(result).toEqual([movie(10), tv(20), tv(21), tv(22)]);
  });

  it("caps the interleaved result at 20 items", () => {
    const moodMovies = Array.from({ length: 15 }, (_, i) => movie(200 + i));
    const moodTv = Array.from({ length: 15 }, (_, i) => tv(300 + i));

    const result = deriveHomeTrending({
      selectedMood: "suspense",
      selectedMediaType: null,
      trendingDefault,
      moodResults: [moodMovies, moodTv],
    });

    expect(result).toHaveLength(20);
    expect(result[0]).toEqual(movie(200));
    expect(result[1]).toEqual(tv(300));
    expect(result[18]).toEqual(movie(209));
    expect(result[19]).toEqual(tv(309));
  });

  it("falls back to empty arrays when both mood results are undefined", () => {
    expect(
      deriveHomeTrending({
        selectedMood: "suspense",
        selectedMediaType: null,
        trendingDefault,
        moodResults: [undefined, undefined],
      }),
    ).toEqual([]);
  });
});
