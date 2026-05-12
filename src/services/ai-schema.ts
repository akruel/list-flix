import { z } from "zod";

// NOTE: This schema is mirrored in supabase/functions/ai-suggestions/index.ts
// (uses different Zod version due to Deno). Keep both in sync.
export const AiSuggestionSchema = z.object({
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
