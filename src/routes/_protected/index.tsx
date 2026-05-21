import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { MovieCard } from "@/components/MovieCard";
import { ContentGridSkeleton } from "@/components/skeletons";
import { logger } from "@/lib/logger";
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
  const { myList, watchedIds, tasteSuggestions } = useStore();

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await tmdb.getTrending("week");
        setTrending(data);
      } catch (error) {
        logger.error("Error fetching trending:", error);
      } finally {
        setTrendingLoading(false);
      }
    };

    void fetchTrending();
  }, []);

  useEffect(() => {
    if (myList.length === 0 && watchedIds.length === 0) return;
    if (tasteSuggestions) return;

    const loadSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        if (tasteSuggestions) return;
        await tasteService.getAiSuggestions(myList, watchedIds, []);
      } catch {
        // handled by tasteService
      } finally {
        setSuggestionsLoading(false);
      }
    };

    void loadSuggestions();
  }, [myList, watchedIds, tasteSuggestions]);

  const showParaVoce =
    suggestionsLoading || (tasteSuggestions && tasteSuggestions.length > 0);
  const showInitialLoading = trendingLoading && trending.length === 0;

  return (
    <div data-testid="route-home">
      {showParaVoce ? (
        <div className="mb-8">
          <h2 className="mb-6 text-3xl font-bold text-white">Para Você</h2>
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

      <h1 className="mb-6 text-3xl font-bold">Em Alta</h1>

      {showInitialLoading ? (
        <ContentGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {trending.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
