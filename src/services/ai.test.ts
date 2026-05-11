import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const groqCreate = vi.fn();
  const Groq = vi.fn(() => ({
    chat: {
      completions: {
        create: groqCreate,
      },
    },
  }));

  return {
    groqCreate,
    Groq,
  };
});

vi.mock("groq-sdk", () => ({
  default: mocks.Groq,
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
    mocks.groqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggested_list_name: "Terror Psicológico",
              items: [
                { title: "The Silence of the Lambs", media_type: "movie" },
                { title: "Seven", media_type: "movie" },
              ],
            }),
          },
        },
      ],
    });

    const result = await ai.getSuggestions("filmes de terror");

    expect(result.suggested_list_name).toBe("Terror Psicológico");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].title).toBe("The Silence of the Lambs");
    expect(mocks.groqCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
      }),
    );
  });

  it("includes user request in the generated prompt", async () => {
    mocks.groqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggested_list_name: "Lista",
              items: [{ title: "Item", media_type: "movie" }],
            }),
          },
        },
      ],
    });

    await ai.getSuggestions("ação dos anos 90");

    const callArg = mocks.groqCreate.mock.calls[0][0] as unknown as {
      messages: Array<{ role: string; content: string }>;
    };
    const prompt = callArg.messages[1].content;
    expect(prompt).not.toContain("Available Genres");
    expect(prompt).toContain('Pedido do Usuário: "ação dos anos 90"');
  });

  it("applies default suggested_list_name when missing", async () => {
    mocks.groqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [{ title: "Matrix", media_type: "movie" }],
            }),
          },
        },
      ],
    });

    const result = await ai.getSuggestions("filmes do Matrix");
    expect(result.suggested_list_name).toBe("Lista Sugerida");
  });

  it.each([
    {
      caseName: "invalid json response",
      setup: () =>
        mocks.groqCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: "{not valid json}",
              },
            },
          ],
        }),
      expectedError: /JSON/,
    },
    {
      caseName: "missing items array",
      setup: () =>
        mocks.groqCreate.mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({ suggested_list_name: "Lista" }),
              },
            },
          ],
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

  it("retries on groq failure", async () => {
    mocks.groqCreate
      .mockRejectedValueOnce(new Error("groq transient error"))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggested_list_name: "Matrix",
                items: [{ title: "Matrix", media_type: "movie" }],
              }),
            },
          },
        ],
      });

    const result = await ai.getSuggestions("filmes do Matrix");
    expect(result.items).toHaveLength(1);
    expect(mocks.groqCreate).toHaveBeenCalledTimes(2);
  });

  it("throws when groq returns empty response content", async () => {
    mocks.groqCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    await expect(ai.getSuggestions("prompt")).rejects.toThrow(
      "Groq returned empty response",
    );
  });

  it("logs error when groq API key is missing", async () => {
    vi.stubEnv("VITE_GROQ_API_KEY", "");
    vi.stubEnv("VITE_GROQ_MODEL", "test-model");
    vi.resetModules();

    const loggerErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { groqProvider } = await import("./ai/providers/groq");

    mocks.groqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggested_list_name: "Lista",
              items: [{ title: "Item", media_type: "movie" }],
            }),
          },
        },
      ],
    });

    await groqProvider.getSuggestions("test");

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      "[ListFlix ERROR]",
      expect.stringContaining("VITE_GROQ_API_KEY is missing"),
    );

    loggerErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it("uses default groq model when VITE_GROQ_MODEL is not set", async () => {
    vi.stubEnv("VITE_GROQ_MODEL", "");
    vi.resetModules();

    const { groqProvider } = await import("./ai/providers/groq");

    mocks.groqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggested_list_name: "Lista",
              items: [{ title: "Item", media_type: "movie" }],
            }),
          },
        },
      ],
    });

    await groqProvider.getSuggestions("test");

    expect(mocks.groqCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "llama-3.3-70b-versatile" }),
    );

    vi.unstubAllEnvs();
  });

  it("uses configured groq model when VITE_GROQ_MODEL is set", async () => {
    vi.stubEnv("VITE_GROQ_MODEL", "custom-model");
    vi.stubEnv("VITE_GROQ_API_KEY", "dummy-key");
    vi.resetModules();

    const { groqProvider } = await import("./ai/providers/groq");

    mocks.groqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              suggested_list_name: "Lista",
              items: [{ title: "Item", media_type: "movie" }],
            }),
          },
        },
      ],
    });

    await groqProvider.getSuggestions("test");

    expect(mocks.groqCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "custom-model" }),
    );

    vi.unstubAllEnvs();
  });
});
