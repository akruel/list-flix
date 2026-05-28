import type { ContentItem } from "../types";
import { tasteService } from "./taste";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export const tasteKeys = {
  all: ["taste"] as const,
  suggestions: (userId: string, scope: string) =>
    [...tasteKeys.all, userId, scope] as const,
};

export interface TasteSuggestionsInput {
  userId: string;
  myList: ContentItem[];
  watchedIds: number[];
  listItemIds: { id: number; mediaType: "movie" | "tv" }[];
  mood?: string;
  mediaType?: "movie" | "tv";
}

function buildScope(input: TasteSuggestionsInput): string {
  const parts = [input.mood ?? "", input.mediaType ?? ""].filter(Boolean);
  return parts.length === 0 ? "default" : parts.join("_");
}

export const tasteSuggestionsQuery = (input: TasteSuggestionsInput) => ({
  queryKey: tasteKeys.suggestions(input.userId, buildScope(input)),
  queryFn: ({ signal }: { signal?: AbortSignal }) =>
    tasteService.getAiSuggestions({
      myList: input.myList,
      watchedIds: input.watchedIds,
      listItemIds: input.listItemIds,
      mood: input.mood,
      mediaType: input.mediaType,
      signal,
    }),
  staleTime: TWELVE_HOURS_MS,
  gcTime: TWELVE_HOURS_MS,
});
