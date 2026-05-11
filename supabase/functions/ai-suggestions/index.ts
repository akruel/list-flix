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
      Você é um especialista em cinema e TV. Seu objetivo é recomendar uma lista de filmes ou séries baseada no pedido do usuário.

      Instruções:
      1. Analise o pedido do usuário (clima, gênero, ator, época, etc).
      2. Recomende entre 5 e 12 itens que melhor se encaixam no pedido.
      3. Forneça um título criativo e curto para a lista em Português.
      4. Para cada item, forneça o título exato e se é 'movie' ou 'tv'.

      O formato de saída deve ser estritamente JSON:
      {
        "suggested_list_name": "Título da Lista",
        "items": [
          { "title": "Nome do Filme/Série", "media_type": "movie" },
          ...
        ]
      }

      Exemplo:
      Usuário: "Filmes de terror psicológico dos anos 90"
      Saída:
      {
        "suggested_list_name": "Terror Psicológico 90s",
        "items": [
          { "title": "The Silence of the Lambs", "media_type": "movie" },
          { "title": "Seven", "media_type": "movie" },
          { "title": "Jacob's Ladder", "media_type": "movie" }
        ]
      }

      Pedido do Usuário: "${userRequest}"
    `;
}

// NOTE: This schema is mirrored in src/services/ai-schema.ts (frontend uses Zod v4,
// this edge function uses Zod v3 for Deno). Keep both in sync.
const AiSuggestionSchema = z.object({
  suggested_list_name: z.string().min(1).default("Lista Sugerida"),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        media_type: z.enum(["movie", "tv"]),
      }),
    )
    .min(1)
    .max(20),
});

async function verifyAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  try {
    const token = authHeader.replace("Bearer ", "");
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.aud === "authenticated" ? payload.sub || null : null;
  } catch {
    return null;
  }
}

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

  const userId = await verifyAuth(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
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
