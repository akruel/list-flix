import { describe, expect, it } from "vitest";

import { buildPrompt, SYSTEM_INSTRUCTION } from "./prompt";

describe("AI Providers: prompt", () => {
  it("exports a technical system instruction in English", () => {
    expect(SYSTEM_INSTRUCTION).toContain("movie and TV show expert");
    expect(SYSTEM_INSTRUCTION).toContain("ONLY valid JSON");
  });

  it("builds a Portuguese prompt with the user request", () => {
    const userRequest = "filmes de ação";
    const prompt = buildPrompt(userRequest);

    expect(prompt).toContain("especialista em cinema e TV");
    expect(prompt).toContain('Pedido do Usuário: "filmes de ação"');
    expect(prompt).toContain("media_type");
  });
});
