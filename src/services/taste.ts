import { logger } from "../lib/logger";
import type { ContentItem } from "../types";
import { ai } from "./ai";
import { tmdb } from "./tmdb";

export interface GetAiSuggestionsInput {
  myList: ContentItem[];
  watchedIds: number[];
  listItemIds: { id: number; mediaType: "movie" | "tv" }[];
  mood?: string;
  mediaType?: "movie" | "tv";
  signal?: AbortSignal;
}

export const tasteService = {
  async getProfile(
    myList: ContentItem[],
    signal?: AbortSignal,
  ): Promise<{ genreNames: string[]; recentTitles: string[] }> {
    const itemsToAnalyze = myList.slice(0, 15);
    if (itemsToAnalyze.length === 0) {
      return { genreNames: [], recentTitles: [] };
    }

    const results = await Promise.allSettled(
      itemsToAnalyze.map((item) => {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        return tmdb.getDetails(
          item.id,
          item.media_type as "movie" | "tv",
          signal,
        );
      }),
    );

    const genreMap = new Map<string, number>();
    const titles: string[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const genre of result.value.genres) {
          genreMap.set(genre.name, (genreMap.get(genre.name) ?? 0) + 1);
        }
        titles.push(result.value.title ?? result.value.name ?? "");
      }
    }

    const topGenres = [...genreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    return {
      genreNames: topGenres,
      recentTitles: titles.filter(Boolean).slice(0, 5),
    };
  },

  async getAiSuggestions(input: GetAiSuggestionsInput): Promise<ContentItem[]> {
    const {
      myList,
      watchedIds,
      listItemIds,
      mood: moodContext,
      mediaType: mediaTypeContext,
      signal,
    } = input;

    const { genreNames, recentTitles } = await this.getProfile(myList, signal);

    if (genreNames.length === 0) return [];

    const titlesStr =
      recentTitles.length > 0
        ? `. Some of my favorites include ${recentTitles.join(", ")}`
        : "";

    const moodStr = moodContext
      ? `. I'm in the mood for ${moodContext} content`
      : "";

    const prompt = `I enjoy ${genreNames.join(", ")} movies and TV shows${titlesStr}${moodStr}. Based on these preferences, suggest 8 to 10 popular and well-rated${mediaTypeContext === "movie" ? " movies" : mediaTypeContext === "tv" ? " TV shows" : " movies and TV shows"} I would enjoy.`;

    try {
      const suggestion = await ai.getSuggestions(prompt);

      const knownIds = new Set([
        ...watchedIds,
        ...myList.map((i) => i.id),
        ...listItemIds.map((i) => i.id),
      ]);

      const searchPromises = suggestion.items.map((item) =>
        tmdb.findBestMatch(item.title, item.media_type, item.year),
      );

      const rawItems = (await Promise.all(searchPromises)).filter(
        (item): item is ContentItem => !!item,
      );

      const uniqueItems = Array.from(
        new Map(rawItems.map((item) => [item.id, item])).values(),
      );

      const filtered = uniqueItems.filter((item) => !knownIds.has(item.id));

      const mediaFiltered = mediaTypeContext
        ? filtered.filter((item) => item.media_type === mediaTypeContext)
        : filtered;

      return mediaFiltered;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      logger.error("Error fetching AI suggestions:", err);
      return [];
    }
  },
};
