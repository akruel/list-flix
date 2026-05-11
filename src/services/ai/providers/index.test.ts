import { describe, expect, it, vi } from "vitest";

vi.mock("groq-sdk", () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

describe("AI provider selection", () => {
  it("selects groq provider when VITE_AI_PROVIDER is groq", async () => {
    vi.stubEnv("VITE_AI_PROVIDER", "groq");
    vi.resetModules();

    const { aiProvider } = await import("./index");

    expect(aiProvider).toBeDefined();
    expect(typeof aiProvider.getSuggestions).toBe("function");

    vi.unstubAllEnvs();
  });

  it("defaults to groq when VITE_AI_PROVIDER is not set", async () => {
    const original = process.env.VITE_AI_PROVIDER;
    delete process.env.VITE_AI_PROVIDER;
    vi.resetModules();

    const { aiProvider } = await import("./index");

    expect(aiProvider).toBeDefined();
    expect(typeof aiProvider.getSuggestions).toBe("function");

    process.env.VITE_AI_PROVIDER = original;
  });

  it("throws for unknown provider", async () => {
    vi.stubEnv("VITE_AI_PROVIDER", "nonexistent");
    vi.resetModules();

    await expect(async () => {
      await import("./index");
    }).rejects.toThrow("Unknown AI provider");

    vi.unstubAllEnvs();
  });
});
