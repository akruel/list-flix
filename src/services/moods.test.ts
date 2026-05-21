import { describe, expect, it } from "vitest";

import { getMoodDiscoverParams, MOODS } from "./moods";

describe("moods", () => {
  it("has 10 moods defined", () => {
    expect(MOODS).toHaveLength(10);
  });

  it.each([
    { key: "suspense", label: "Suspense" },
    { key: "sci-fi", label: "Sci-fi" },
    { key: "dark", label: "Dark" },
    { key: "mindfuck", label: "Mindfuck" },
    { key: "true-crime", label: "True Crime" },
    { key: "plot-twist", label: "Plot Twist" },
    { key: "animacao", label: "Animação" },
    { key: "violento", label: "Violento" },
    { key: "divertido", label: "Divertido" },
    { key: "curtos", label: "Filmes curtos" },
  ])("mood $key has label $label", ({ key, label }) => {
    const mood = MOODS.find((m) => m.key === key);
    expect(mood).toBeDefined();
    expect(mood?.label).toBe(label);
  });

  it("getMoodDiscoverParams returns empty for null key", () => {
    const params = getMoodDiscoverParams(null);
    expect(params).toEqual({});
  });

  it("getMoodDiscoverParams defaults to movie media type", () => {
    const params = getMoodDiscoverParams("suspense");
    expect(params.media_type).toBe("movie");
  });

  it("getMoodDiscoverParams includes media_type for tv", () => {
    const params = getMoodDiscoverParams("suspense", "tv");
    expect(params.media_type).toBe("tv");
  });

  it("getMoodDiscoverParams returns movie genre params for suspense", () => {
    const params = getMoodDiscoverParams("suspense", "movie");
    expect(params.sort_by).toBe("popularity.desc");
    expect(params.with_genres).toContain("53");
    expect(params.with_genres).toContain("9648");
  });

  it("getMoodDiscoverParams returns TV genre params for suspense (no Thriller)", () => {
    const params = getMoodDiscoverParams("suspense", "tv");
    expect(params.with_genres).not.toContain("53");
    expect(params.with_genres).toContain("9648");
  });

  it("getMoodDiscoverParams maps sci-fi movie genre to TV equivalent", () => {
    const movieParams = getMoodDiscoverParams("sci-fi", "movie");
    expect(movieParams.with_genres).toBe("878");

    const tvParams = getMoodDiscoverParams("sci-fi", "tv");
    expect(tvParams.with_genres).toBe("10765");
  });

  it("getMoodDiscoverParams includes runtime filter for curtos movie", () => {
    const params = getMoodDiscoverParams("curtos", "movie");
    expect(params.with_runtime_lte).toBe(90);
  });

  it("getMoodDiscoverParams omits runtime filter for curtos tv", () => {
    const params = getMoodDiscoverParams("curtos", "tv");
    expect(params.with_runtime_lte).toBeUndefined();
  });

  it("getMoodDiscoverParams returns empty for unknown key", () => {
    const params = getMoodDiscoverParams("nonexistent");
    expect(params).toEqual({});
  });

  it("maps violento movie genres correctly", () => {
    const params = getMoodDiscoverParams("violento", "tv");
    expect(params.with_genres).toContain("10759");
    expect(params.with_genres).toContain("10768");
    expect(params.with_genres).not.toContain("28");
    expect(params.with_genres).not.toContain("10752");
    expect(params.with_genres).not.toContain("27");
  });
});
