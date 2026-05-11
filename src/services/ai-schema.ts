import { z } from "zod";

export const AiSuggestionSchema = z.object({
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
