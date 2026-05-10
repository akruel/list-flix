import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const generateContent = vi.fn();
  const getGenerativeModel = vi.fn(() => ({ generateContent }));
  const GoogleGenerativeAI = vi.fn(() => ({ getGenerativeModel }));
  const getGenres = vi.fn();
  return {
    generateContent,
    getGenerativeModel,
    GoogleGenerativeAI,
    getGenres,
  };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: mocks.GoogleGenerativeAI,
}));

vi.mock("./tmdb", () => ({
  tmdb: {
    getGenres: mocks.getGenres,
  },
}));

import { ai } from "./ai";

describe("ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGenres.mockResolvedValue([
      { id: 28, name: "Action" },
      { id: 18, name: "Drama" },
    ]);
  });

  const strategyCases = [
    {
      caseName: "search strategy",
      responseText: JSON.stringify({
        strategy: "search",
        query: "Harry Potter",
        media_type: "movie",
        suggested_list_name: "Saga Harry Potter",
      }),
      expectedStrategy: "search",
    },
    {
      caseName: "discover strategy without code block",
      responseText: JSON.stringify({
        strategy: "discover",
        media_type: "movie",
        suggested_list_name: "Terror",
      }),
      expectedStrategy: "discover",
    },
    {
      caseName: "person strategy",
      responseText: JSON.stringify({
        strategy: "person",
        person_name: "Tom Cruise",
        role: "cast",
        media_type: "movie",
        suggested_list_name: "Filmes com Tom Cruise",
      }),
      expectedStrategy: "person",
    },
  ];

  it.each(strategyCases)(
    "parses $caseName response",
    async ({ responseText, expectedStrategy }) => {
      mocks.generateContent.mockResolvedValue({
        response: {
          text: () => responseText,
        },
      });

      const result = await ai.getSuggestions("filmes para o fim de semana");

      expect(result.strategy).toBe(expectedStrategy);
      expect(mocks.getGenerativeModel).toHaveBeenCalledWith({
        model: "gemini-2.0-flash",
      });
      expect(mocks.generateContent).toHaveBeenCalledOnce();
    },
  );

  it("includes genres list and user request in the generated prompt", async () => {
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            strategy: "discover",
            media_type: "movie",
            suggested_list_name: "Lista",
          }),
      },
    });

    await ai.getSuggestions("ação dos anos 90");

    const callArg = mocks.generateContent.mock.calls[0][0] as unknown as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    const prompt = callArg.contents[0].parts[0].text;
    expect(prompt).toContain("Available Genres (ID:Name): 28:Action, 18:Drama");
    expect(prompt).toContain('User Request: "ação dos anos 90"');
  });

  it("uses responseMimeType: application/json in generationConfig", async () => {
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            strategy: "discover",
            media_type: "movie",
            suggested_list_name: "Lista",
          }),
      },
    });

    await ai.getSuggestions("ação dos anos 90");

    const callArg = mocks.generateContent.mock.calls[0][0] as unknown as {
      generationConfig?: { responseMimeType?: string };
    };
    expect(callArg.generationConfig?.responseMimeType).toBe("application/json");
  });

  it("applies default suggested_list_name when missing", async () => {
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            strategy: "search",
            query: "Matrix",
            media_type: "movie",
          }),
      },
    });

    const result = await ai.getSuggestions("filmes do Matrix");
    expect(result.suggested_list_name).toBe("Lista Sugerida");
  });

  it("retries on gemini failure", async () => {
    mocks.generateContent
      .mockRejectedValueOnce(new Error("gemini transient error"))
      .mockResolvedValueOnce({
        response: {
          text: () =>
            JSON.stringify({
              strategy: "search",
              query: "Matrix",
              media_type: "movie",
              suggested_list_name: "Matrix",
            }),
        },
      });

    const result = await ai.getSuggestions("filmes do Matrix");
    expect(result.strategy).toBe("search");
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      caseName: "invalid json response",
      setup: () =>
        mocks.generateContent.mockResolvedValue({
          response: {
            text: () => "{not valid json}",
          },
        }),
      expectedError: /JSON/,
    },
    {
      caseName: "genre loading error",
      setup: () => mocks.getGenres.mockRejectedValue(new Error("tmdb failed")),
      expectedError: "tmdb failed",
    },
  ])("throws and logs on $caseName", async ({ setup, expectedError }) => {
    const loggerErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    setup();

    await expect(ai.getSuggestions("prompt")).rejects.toThrow(expectedError);

    loggerErrorSpy.mockRestore();
  });

  it("logs warning when API key is missing at module load", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_GEMINI_API_KEY", "");
    const loggerErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await import("./ai");

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ListFlix ERROR]"),
      "VITE_GEMINI_API_KEY is missing",
    );

    loggerErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});
