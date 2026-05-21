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

  it("getMoodDiscoverParams returns genre params for suspense", () => {
    const params = getMoodDiscoverParams("suspense");
    expect(params.sort_by).toBe("popularity.desc");
    expect(params.with_genres).toContain("53");
    expect(params.with_genres).toContain("9648");
  });

  it("getMoodDiscoverParams includes runtime filter for curtos", () => {
    const params = getMoodDiscoverParams("curtos");
    expect(params.with_runtime_lte).toBe(90);
  });

  it("getMoodDiscoverParams returns empty for unknown key", () => {
    const params = getMoodDiscoverParams("nonexistent");
    expect(params).toEqual({});
  });
});
