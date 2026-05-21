import { logger } from "../lib/logger";
import { useStore } from "../store/useStore";
import type { ContentItem } from "../types";
import { ai } from "./ai";
import { tmdb } from "./tmdb";

const SUGGESTIONS_CACHE_TTL = 30 * 60 * 1000;

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
        return tmdb.getDetails(item.id, item.media_type as "movie" | "tv");
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

  async getAiSuggestions(
    myList: ContentItem[],
    watchedIds: number[],
    listItemIds: { id: number; mediaType: "movie" | "tv" }[],
    signal?: AbortSignal,
    moodContext?: string,
    mediaTypeContext?: "movie" | "tv",
  ): Promise<ContentItem[]> {
    const cacheKey = [
      "ai_suggestions",
      moodContext ?? "",
      mediaTypeContext ?? "",
    ]
      .filter(Boolean)
      .join("_");

    const { tasteSuggestions, tasteSuggestionsTimestamp } = useStore.getState();

    if (
      !moodContext &&
      !mediaTypeContext &&
      tasteSuggestions &&
      tasteSuggestionsTimestamp &&
      Date.now() - tasteSuggestionsTimestamp < SUGGESTIONS_CACHE_TTL
    ) {
      return tasteSuggestions;
    }

    if (moodContext || mediaTypeContext) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          items: ContentItem[];
          ts: number;
        };
        if (Date.now() - parsed.ts < SUGGESTIONS_CACHE_TTL) {
          useStore.getState().setTasteSuggestions(parsed.items);
          return parsed.items;
        }
      }
    }

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

      if (moodContext || mediaTypeContext) {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ items: mediaFiltered, ts: Date.now() }),
        );
      }
      useStore.getState().setTasteSuggestions(mediaFiltered);

      return mediaFiltered;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      logger.error("Error fetching AI suggestions:", err);
      return [];
    }
  },

  async getPersonalizedSuggestions(
    myList: ContentItem[],
    watchedIds: number[],
    listItemIds: { id: number; mediaType: "movie" | "tv" }[],
    signal?: AbortSignal,
  ): Promise<ContentItem[]> {
    const { tasteSuggestions, tasteSuggestionsTimestamp } = useStore.getState();

    if (
      tasteSuggestions &&
      tasteSuggestionsTimestamp &&
      Date.now() - tasteSuggestionsTimestamp < SUGGESTIONS_CACHE_TTL
    ) {
      return tasteSuggestions;
    }

    const knownIds = new Set([
      ...watchedIds,
      ...myList.map((i) => i.id),
      ...listItemIds.map((i) => i.id),
    ]);

    const itemsToAnalyze = [
      ...myList.map((i) => ({
        id: i.id,
        mediaType: i.media_type as "movie" | "tv",
      })),
      ...listItemIds,
    ].slice(0, 15);

    if (itemsToAnalyze.length === 0) return [];

    const genreCounts = new Map<number, { name: string; count: number }>();

    const results = await Promise.allSettled(
      itemsToAnalyze.map((item) => tmdb.getDetails(item.id, item.mediaType)),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        for (const genre of result.value.genres) {
          const existing = genreCounts.get(genre.id);
          if (existing) {
            existing.count++;
          } else {
            genreCounts.set(genre.id, { name: genre.name, count: 1 });
          }
        }
      }
    }

    if (genreCounts.size === 0) return [];

    const topGenres = [...genreCounts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([id]) => id);

    try {
      const suggestions = await tmdb.discover(
        { with_genres: topGenres.join(","), sort_by: "popularity.desc" },
        signal,
      );

      const filtered = suggestions.filter((item) => !knownIds.has(item.id));

      useStore.getState().setTasteSuggestions(filtered);

      return filtered;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      logger.error("Error fetching personalized suggestions:", err);
      return [];
    }
  },

  clearCache(): void {
    useStore.getState().clearTasteSuggestions();
  },
};
