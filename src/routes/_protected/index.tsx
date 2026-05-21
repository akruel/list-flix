import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { MovieCard } from "@/components/MovieCard";
import { ContentGridSkeleton } from "@/components/skeletons";
import { logger } from "@/lib/logger";
import { getMoodDiscoverParams, MOODS } from "@/services/moods";
import { tasteService } from "@/services/taste";
import { tmdb } from "@/services/tmdb";
import { useStore } from "@/store/useStore";
import type { ContentItem } from "@/types";

export const Route = createFileRoute("/_protected/")({
  component: HomeRouteComponent,
});

function HomeRouteComponent() {
  const [trending, setTrending] = useState<ContentItem[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<
    "movie" | "tv" | null
  >(null);
  const [decadeFilter, setDecadeFilter] = useState<number | null>(null);
  const { myList, watchedIds, tasteSuggestions } = useStore();

  const currentMood = selectedMood
    ? MOODS.find((m) => m.key === selectedMood)
    : undefined;

  const prevMoodRef = useRef(selectedMood);
  const prevMediaTypeRef = useRef(selectedMediaType);

  useEffect(() => {
    if (myList.length === 0 && watchedIds.length === 0) {
      useStore.getState().clearTasteSuggestions();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestionsLoading(false);
      return;
    }

    const moodChanged = prevMoodRef.current !== selectedMood;
    prevMoodRef.current = selectedMood;

    const mediaTypeChanged = prevMediaTypeRef.current !== selectedMediaType;
    prevMediaTypeRef.current = selectedMediaType;

    if (moodChanged || mediaTypeChanged) {
      useStore.getState().clearTasteSuggestions();
    }

    let cancelled = false;

    const loadSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        await tasteService.getAiSuggestions(
          myList,
          watchedIds,
          [],
          undefined,
          selectedMood ?? undefined,
          selectedMediaType ?? undefined,
        );
      } catch {
        // handled by tasteService
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    };

    void loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [myList, watchedIds, selectedMood, selectedMediaType]);

  useEffect(() => {
    let cancelled = false;

    const fetchContent = async () => {
      setTrendingLoading(true);

      try {
        if (selectedMood) {
          if (selectedMediaType) {
            const params = getMoodDiscoverParams(
              selectedMood,
              selectedMediaType,
            );
            const data = await tmdb.discover(params);
            if (!cancelled) setTrending(data.slice(0, 20));
          } else {
            const [movies, tvShows] = await Promise.all([
              tmdb.discover(getMoodDiscoverParams(selectedMood, "movie")),
              tmdb.discover(getMoodDiscoverParams(selectedMood, "tv")),
            ]);
            const merged: ContentItem[] = [];
            const maxLen = Math.max(movies.length, tvShows.length);
            for (let i = 0; i < maxLen && merged.length < 20; i++) {
              if (i < movies.length) merged.push(movies[i]);
              if (i < tvShows.length) merged.push(tvShows[i]);
            }
            if (!cancelled) setTrending(merged);
          }
        } else {
          const data = await tmdb.getTrending("week");
          if (selectedMediaType) {
            if (!cancelled)
              setTrending(
                data.filter((item) => item.media_type === selectedMediaType),
              );
          } else {
            if (!cancelled) setTrending(data);
          }
        }
      } catch (error) {
        if (!cancelled) {
          logger.error("Error fetching content:", error);
          toast.error("Erro ao carregar conteúdo.");
        }
      } finally {
        if (!cancelled) setTrendingLoading(false);
      }
    };

    void fetchContent();
    return () => {
      cancelled = true;
    };
  }, [selectedMood, selectedMediaType]);

  const dataYears = useMemo(() => {
    const years = new Set<number>();
    for (const item of trending) {
      const date = item.release_date ?? item.first_air_date;
      if (date) years.add(new Date(date).getFullYear());
    }
    return years;
  }, [trending]);

  const decadeCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const year of dataYears) {
      const decade = Math.floor(year / 10) * 10;
      counts.set(decade, (counts.get(decade) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[0] - a[0]);
  }, [dataYears]);

  const displayDecades =
    selectedMood && decadeCounts.length >= 2 ? decadeCounts : [];

  const displayedResults = decadeFilter
    ? trending.filter((item) => {
        const date = item.release_date ?? item.first_air_date;
        const year = date ? new Date(date).getFullYear() : null;
        return (
          year !== null && year >= decadeFilter && year < decadeFilter + 10
        );
      })
    : trending;

  const showForYou =
    !decadeFilter &&
    (suggestionsLoading || (tasteSuggestions && tasteSuggestions.length > 0));
  const showInitialLoading = trendingLoading && trending.length === 0;

  return (
    <div data-testid="route-home">
      <div className="mb-6 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            { key: null, label: "Todos" },
            { key: "movie" as const, label: "Filmes" },
            { key: "tv" as const, label: "Séries" },
          ] as const
        ).map((option) => (
          <button
            key={option.label}
            onClick={() => {
              setDecadeFilter(null);
              setSelectedMediaType(
                selectedMediaType === option.key ? null : option.key,
              );
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedMediaType === option.key
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            onClick={() => {
              const newMood = selectedMood === mood.key ? null : mood.key;
              if (newMood) useStore.getState().clearTasteSuggestions();
              setDecadeFilter(null);
              setSelectedMood(newMood);
            }}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedMood === mood.key
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {mood.label}
          </button>
        ))}
      </div>

      {displayDecades.length > 0 ? (
        <div className="mb-6 flex gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {displayDecades.map(([decade, count]) => (
            <button
              key={decade}
              onClick={() =>
                setDecadeFilter(decadeFilter === decade ? null : decade)
              }
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                decadeFilter === decade
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {decade}&rsquo;s ({count})
            </button>
          ))}
        </div>
      ) : null}

      {showForYou ? (
        <div className="mb-8">
          <h2 className="mb-6 text-3xl font-bold text-white">
            Para Você
            {selectedMood && currentMood ? ` · ${currentMood.label}` : ""}
          </h2>
          {suggestionsLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-36 shrink-0 sm:w-40">
                  <div className="aspect-[2/3] animate-pulse rounded-lg bg-gray-800" />
                  <div className="mt-2 h-4 animate-pulse rounded bg-gray-800" />
                  <div className="mt-1 h-3 animate-pulse rounded bg-gray-800" />
                </div>
              ))}
            </div>
          ) : tasteSuggestions && tasteSuggestions.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tasteSuggestions.map((item) => (
                <div key={item.id} className="w-36 shrink-0 sm:w-40">
                  <MovieCard item={item} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <h1 className="mb-6 text-3xl font-bold text-white">
        {selectedMood && currentMood
          ? `Em Alta · ${currentMood.label}`
          : "Em Alta"}
      </h1>

      {showInitialLoading ? (
        <ContentGridSkeleton />
      ) : displayedResults.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-500">Nenhum resultado encontrado.</p>
          {decadeFilter !== null && (
            <button
              onClick={() => setDecadeFilter(null)}
              className="mt-2 text-xs text-purple-400 hover:text-purple-300"
            >
              Limpar filtro de década
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {displayedResults.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
