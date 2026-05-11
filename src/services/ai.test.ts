import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const functionsInvoke = vi.fn();

  return {
    functionsInvoke,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: mocks.functionsInvoke,
    },
  },
}));

vi.mock("./tmdb", () => ({
  tmdb: {
    getGenres: vi.fn().mockResolvedValue([]),
  },
}));

import { ai } from "./ai";

describe("ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses valid recommendation response", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        suggested_list_name: "Terror Psicológico",
        items: [
          { title: "The Silence of the Lambs", media_type: "movie" },
          { title: "Seven", media_type: "movie" },
        ],
      },
      error: null,
    });

    const result = await ai.getSuggestions("filmes de terror");

    expect(result.suggested_list_name).toBe("Terror Psicológico");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("The Silence of the Lambs");
    expect(mocks.functionsInvoke).toHaveBeenCalledWith(
      "ai-suggestions",
      expect.objectContaining({
        body: { prompt: "filmes de terror" },
      }),
    );
  });

  it("includes user request in the generated prompt", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        suggested_list_name: "Lista",
        items: [{ title: "Item", media_type: "movie" }],
      },
      error: null,
    });

    await ai.getSuggestions("ação dos anos 90");

    expect(mocks.functionsInvoke).toHaveBeenCalledWith(
      "ai-suggestions",
      expect.objectContaining({
        body: { prompt: "ação dos anos 90" },
      }),
    );
  });

  it("applies default suggested_list_name when missing", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: {
        items: [{ title: "Matrix", media_type: "movie" }],
      },
      error: null,
    });

    const result = await ai.getSuggestions("filmes do Matrix");
    expect(result.suggested_list_name).toBe("Lista Sugerida");
  });

  it.each([
    {
      caseName: "invalid json response",
      setup: () =>
        mocks.functionsInvoke.mockResolvedValue({
          data: { not_valid: true },
          error: null,
        }),
      expectedError: /items/,
    },
    {
      caseName: "missing items array",
      setup: () =>
        mocks.functionsInvoke.mockResolvedValue({
          data: { suggested_list_name: "Lista" },
          error: null,
        }),
      expectedError: /items/,
    },
  ])("throws and logs on $caseName", async ({ setup, expectedError }) => {
    const loggerErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    setup();

    await expect(ai.getSuggestions("prompt")).rejects.toThrow(expectedError);

    loggerErrorSpy.mockRestore();
  });

  it("retries on edge function failure", async () => {
    mocks.functionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: { message: "transient error" },
      })
      .mockResolvedValueOnce({
        data: {
          suggested_list_name: "Matrix",
          items: [{ title: "Matrix", media_type: "movie" }],
        },
        error: null,
      });

    const result = await ai.getSuggestions("filmes do Matrix");
    expect(result.items).toHaveLength(1);
    expect(mocks.functionsInvoke).toHaveBeenCalledTimes(2);
  });

  it("throws when edge function returns error", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: null,
      error: { message: "Edge Function request failed" },
    });

    await expect(ai.getSuggestions("prompt")).rejects.toThrow(
      "Edge Function request failed",
    );
  });

  it("throws default message when edge function error has no message", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: null,
      error: {},
    });

    await expect(ai.getSuggestions("prompt")).rejects.toThrow(
      "Edge Function request failed",
    );
  });

  it("throws when edge function returns empty data", async () => {
    mocks.functionsInvoke.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(ai.getSuggestions("prompt")).rejects.toThrow();
  });
});
