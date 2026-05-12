import { z } from "npm:zod@^3.23.8";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "llama-3.3-70b-versatile";

if (!GROQ_API_KEY) {
  throw new Error("Missing GROQ_API_KEY environment variable");
}

const SYSTEM_INSTRUCTION =
  "You are a movie and TV show expert. Return ONLY valid JSON.";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-client-info, apikey",
};

function buildPrompt(userRequest: string): string {
  return `
Você é um curador de cinema e TV com conhecimento enciclopédico.

Analise o pedido do usuário e recomende filmes e/ou séries.

INSTRUÇÕES:
1. Interpretação: Considere gênero, época, diretor, ator, nacionalidade, clima, classificação indicativa, ou qualquer combinação.
2. Quantidade: Recomende entre 6 e 10 itens (idealmente 8), no mínimo 5 e no máximo 12.
3. Títulos: Use o TÍTULO ORIGINAL (em inglês para filmes internacionais). Essencial para encontrar no catálogo.
4. Ano: Inclua o ANO DE LANÇAMENTO para cada título — ajuda a buscar o filme correto no TMDB.
5. Curadoria: Prefira filmes e séries POPULARES e BEM AVALIADOS. Escolha títulos que realmente existem e são conhecidos.
6. Variedade: Dentro do tema, diversifique anos, países ou subgêneros quando possível.
7. Tags: Analise o contexto do pedido e sugira tags apropriadas:
   - "noite_de_pipoca": se o pedido sugere filmes leves, divertidos, para assistir em grupo ou com a família
   - "fim_de_semana": se o pedido sugere maratona, binge-watch, ou algo para o tempo livre
   - Pode sugerir ambas ou nenhuma, dependendo do contexto
8. Precisão: Todos os títulos devem ser de obras REAIS. Não invente.
9. Evite repetir o mesmo título.
10. Para séries, indique o título da série, não de um episódio específico.
11. NÃO crie um nome de lista. Apenas retorne os itens e as tags.

FORMATO DE SAÍDA (JSON obrigatório):
{
  "items": [
    { "title": "Original English Title", "year": 1999, "media_type": "movie" },
    { "title": "Original Series Title", "year": 2015, "media_type": "tv" }
  ],
  "suggested_tags": ["noite_de_pipoca", "fim_de_semana"]
}

EXEMPLO 1:
Usuário: "Filmes de suspense para assistir no final de semana"
{
  "items": [
    { "title": "Gone Girl", "year": 2014, "media_type": "movie" },
    { "title": "Prisoners", "year": 2013, "media_type": "movie" },
    { "title": "Shutter Island", "year": 2010, "media_type": "movie" },
    { "title": "The Girl with the Dragon Tattoo", "year": 2011, "media_type": "movie" },
    { "title": "Se7en", "year": 1995, "media_type": "movie" },
    { "title": "Rear Window", "year": 1954, "media_type": "movie" }
  ],
  "suggested_tags": ["fim_de_semana"]
}

EXEMPLO 2:
Usuário: "Séries de comédia dos anos 2000"
{
  "items": [
    { "title": "The Office", "year": 2005, "media_type": "tv" },
    { "title": "Arrested Development", "year": 2003, "media_type": "tv" },
    { "title": "30 Rock", "year": 2006, "media_type": "tv" },
    { "title": "Curb Your Enthusiasm", "year": 2000, "media_type": "tv" }
  ],
  "suggested_tags": []
}

PEDIDO DO USUÁRIO: "${userRequest}"
    `;
}

const AiSuggestionSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        year: z.number().optional(),
        media_type: z.enum(["movie", "tv"]),
      }),
    )
    .min(1)
    .max(20),
  suggested_tags: z
    .array(z.enum(["noite_de_pipoca", "fim_de_semana"]))
    .default([]),
});

async function callGroq(prompt: string) {
  const fullPrompt = buildPrompt(prompt);

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: fullPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Groq returned empty response");
  }

  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "Prompt is required and must be a non-empty string",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const raw = await callGroq(prompt);
    const result = AiSuggestionSchema.parse(raw);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("ai-suggestions error:", (error as Error).message);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid response format",
          details: error.errors,
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
