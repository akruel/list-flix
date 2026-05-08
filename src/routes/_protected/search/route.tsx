import { createFileRoute } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { MovieCard } from "@/components/MovieCard";
import { ContentGridSkeleton } from "@/components/skeletons";
import { logger } from "@/lib/logger";
import { tmdb } from "@/services/tmdb";
import type { ContentItem } from "@/types";

export const Route = createFileRoute("/_protected/search")({
  component: SearchRouteComponent,
});

function SearchRouteComponent() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const search = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await tmdb.search(debouncedQuery);
        setResults(data);
      } catch (error) {
        logger.error("Error searching:", error);
      } finally {
        setLoading(false);
      }
    };

    void search();
  }, [debouncedQuery]);

  return (
    <div data-testid="route-search">
      <div className="relative mb-8">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          data-testid="search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar filmes ou séries..."
          className="w-full rounded-xl bg-gray-800 py-4 pl-12 pr-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {loading ? (
        <ContentGridSkeleton count={8} />
      ) : (
        <>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.map((item) => (
                <MovieCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            debouncedQuery && (
              <div className="py-12 text-center text-gray-500">
                Nenhum resultado encontrado para "{debouncedQuery}"
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
