import { z } from "zod";

const BaseFields = {
  suggested_list_name: z.string().default("Lista Sugerida"),
  media_type: z.enum(["movie", "tv"]).optional(),
};

const searchStrategy = z
  .object({
    ...BaseFields,
    strategy: z.literal("search"),
    query: z.string().min(1),
  })
  .passthrough();

const discoverStrategy = z
  .object({
    ...BaseFields,
    strategy: z.literal("discover"),
    with_genres: z.string().optional(),
    "primary_release_date.gte": z.string().optional(),
    "primary_release_date.lte": z.string().optional(),
    "vote_average.gte": z.number().optional(),
    "vote_count.gte": z.number().optional(),
    with_original_language: z.string().optional(),
    sort_by: z.string().optional(),
    with_keywords: z.string().optional(),
  })
  .passthrough();

const personStrategy = z
  .object({
    ...BaseFields,
    strategy: z.literal("person"),
    person_name: z.string().min(1),
    role: z.enum(["cast", "crew"]),
  })
  .passthrough();

export const AiSuggestionSchema = z.discriminatedUnion("strategy", [
  searchStrategy,
  discoverStrategy,
  personStrategy,
]);
