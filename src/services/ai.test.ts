import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const generateContent = vi.fn();
  const getGenerativeModel = vi.fn(() => ({ generateContent }));
  const GoogleGenerativeAI = vi.fn(() => ({ getGenerativeModel }));

  const groqCreate = vi.fn();
  const Groq = vi.fn(() => ({
    chat: {
      completions: {
        create: groqCreate,
      },
    },
  }));

  return {
    generateContent,
    getGenerativeModel,
    GoogleGenerativeAI,
    groqCreate,
    Groq,
  };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: mocks.GoogleGenerativeAI,
}));

vi.mock("groq-sdk", () => ({
  default: mocks.Groq,
}));

vi.mock("./tmdb", () => ({
  tmdb: {
    getGenres: vi.fn().mockResolvedValue([]),
  },
}));

import { ai } from "./ai";

const EXPECTED_MODEL = import.meta.env.VITE_GEMINI_MODEL ?? "gemini-2.0-flash";

describe("ai service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses valid recommendation response", async () => {
    const responseText = JSON.stringify({
      suggested_list_name: "Terror Psicológico",
      items: [
        { title: "The Silence of the Lambs", media_type: "movie" },
        { title: "Seven", media_type: "movie" },
      ],
    });

    mocks.generateContent.mockResolvedValue({
      response: {
        text: () => responseText,
      },
    });

    const result = await ai.getSuggestions("filmes de terror");

    expect(result.suggested_list_name).toBe("Terror Psicológico");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("The Silence of the Lambs");
    expect(mocks.getGenerativeModel).toHaveBeenCalledWith({
      model: EXPECTED_MODEL,
    });
  });

  it("includes user request in the generated prompt and not the genres", async () => {
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            suggested_list_name: "Lista",
            items: [{ title: "Item", media_type: "movie" }],
          }),
      },
    });

    await ai.getSuggestions("ação dos anos 90");

    const callArg = mocks.generateContent.mock.calls[0][0] as unknown as {
      contents: Array<{ parts: Array<{ text: string }> }>;
    };
    const prompt = callArg.contents[0].parts[0].text;
    expect(prompt).not.toContain("Available Genres");
    expect(prompt).toContain('Pedido do Usuário: "ação dos anos 90"');
  });

  it("uses responseMimeType: application/json in generationConfig", async () => {
    mocks.generateContent.mockResolvedValue({
      response: {
        text: () =>
          JSON.stringify({
            suggested_list_name: "Lista",
            items: [{ title: "Item", media_type: "movie" }],
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
            items: [{ title: "Matrix", media_type: "movie" }],
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
              suggested_list_name: "Matrix",
              items: [{ title: "Matrix", media_type: "movie" }],
            }),
        },
      });

    const result = await ai.getSuggestions("filmes do Matrix");
    expect(result.items).toHaveLength(1);
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
      caseName: "missing items array",
      setup: () =>
        mocks.generateContent.mockResolvedValue({
          response: {
            text: () => JSON.stringify({ suggested_list_name: "Lista" }),
          },
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

  it("works with groq provider", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_AI_PROVIDER", "groq");
    vi.stubEnv("VITE_GROQ_API_KEY", "dummy-key");

    const { ai: groqAi } = await import("./ai");

    mocks.groqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggested_list_name: "Groq List",
              items: [{ title: "Groq Movie", media_type: "movie" }],
            }),
          },
        },
      ],
    });

    const result = await groqAi.getSuggestions("prompt");

    expect(result.suggested_list_name).toBe("Groq List");
    expect(mocks.groqCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
      }),
    );

    vi.unstubAllEnvs();
  });
});
