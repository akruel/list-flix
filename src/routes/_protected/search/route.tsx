import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { MovieCard } from "@/components/MovieCard";
import { ContentGridSkeleton } from "@/components/skeletons";
import { logger } from "@/lib/logger";
import { tmdb } from "@/services/tmdb";
import type { ContentItem } from "@/types";

type SearchType = "all" | "movie" | "tv";

type SearchSearch = {
  q?: string;
  type?: "movie" | "tv";
};

export const Route = createFileRoute("/_protected/search")({
  validateSearch: (search: Record<string, unknown>): SearchSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    type:
      search.type === "movie" || search.type === "tv" ? search.type : undefined,
  }),
  component: SearchRouteComponent,
});

function SearchRouteComponent() {
  const navigate = useNavigate();
  const { q: urlQuery, type: urlMediaType } = Route.useSearch();

  const [inputValue, setInputValue] = useState(urlQuery ?? "");
  const [results, setResults] = useState<ContentItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [decadeFilter, setDecadeFilter] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    page: 1,
    totalPages: 0,
    loading: false,
    urlQuery: "",
    activeType: "all" as SearchType,
  });

  const activeType: SearchType = urlMediaType ?? "all";

  useEffect(() => {
    stateRef.current = {
      page,
      totalPages,
      loading,
      urlQuery: urlQuery ?? "",
      activeType: urlMediaType ?? "all",
    };
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      navigate({
        search: { q: trimmed || undefined, type: urlMediaType },
        replace: true,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, navigate, urlMediaType]);

  useEffect(() => {
    if (!urlQuery) {
      const clear = async () => {
        setResults([]);
        setTotalResults(0);
        setTotalPages(0);
        setPage(1);
        setLoading(false);
        setError(null);
      };
      void clear();
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const doSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await tmdb.search(urlQuery, {
          mediaType: activeType === "all" ? undefined : activeType,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setResults(response.results);
        setTotalResults(response.total_results);
        setTotalPages(response.total_pages);
        setPage(1);
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.error("Error searching:", err);
        setError("Erro ao buscar resultados. Tente novamente.");
        toast.error("Erro ao buscar resultados.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void doSearch();

    return () => controller.abort();
  }, [urlQuery, activeType]);

  const loadMore = useCallback(() => {
    const s = stateRef.current;
    if (!s.urlQuery || s.page >= s.totalPages || s.loading) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const doLoadMore = async () => {
      setLoading(true);

      try {
        const response = await tmdb.search(s.urlQuery, {
          mediaType: s.activeType === "all" ? undefined : s.activeType,
          page: s.page + 1,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setResults((prev) => [...prev, ...response.results]);
        setPage(response.page);
        setTotalPages(response.total_pages);
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.error("Error loading more:", err);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void doLoadMore();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const displayedResults = decadeFilter
    ? results.filter((item) => {
        const year = item.release_date
          ? new Date(item.release_date).getFullYear()
          : item.first_air_date
            ? new Date(item.first_air_date).getFullYear()
            : null;
        return (
          year !== null && year >= decadeFilter && year < decadeFilter + 10
        );
      })
    : results;

  const handleTypeChange = (newType: SearchType) => {
    navigate({
      search: { q: urlQuery, type: newType === "all" ? undefined : newType },
      replace: true,
    });
  };

  const showInitialLoading = loading && results.length === 0;
  const showLoadingMore = loading && results.length > 0;
  const showEndOfResults = results.length > 0 && page >= totalPages;
  const showEmpty =
    !loading && !error && !!urlQuery && displayedResults.length === 0;

  return (
    <div data-testid="route-search">
      <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-lg transition-shadow focus-within:border-purple-600/40 focus-within:ring-1 focus-within:ring-purple-600/30">
        <div className="flex items-center gap-3">
          <SearchIcon className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            data-testid="search-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Buscar filmes ou séries..."
            className="flex-1 bg-transparent text-lg text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        <div className="mb-4 mt-4 h-px bg-gray-800" />

        <div className="flex flex-wrap items-start gap-2">
          <div className="flex gap-1 rounded-lg bg-gray-800 p-1">
            {(["all", "movie", "tv"] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeType === type
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {type === "all"
                  ? "Todos"
                  : type === "movie"
                    ? "Filmes"
                    : "Séries"}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-1 rounded-lg bg-gray-800 p-1">
              {[1970, 1980, 1990, 2000, 2010, 2020].map((decade) => (
                <button
                  key={decade}
                  onClick={() =>
                    setDecadeFilter(decadeFilter === decade ? null : decade)
                  }
                  className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    decadeFilter === decade
                      ? "bg-purple-600 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {decade}&rsquo;s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {urlQuery && !loading && results.length > 0 ? (
        <p className="mb-6 text-sm text-gray-500">
          {decadeFilter
            ? `${displayedResults.length} de ${totalResults} resultado${totalResults !== 1 ? "s" : ""}`
            : `${totalResults} resultado${totalResults !== 1 ? "s" : ""}`}{" "}
          para &ldquo;{urlQuery}&rdquo;
        </p>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg bg-red-900/50 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {showInitialLoading ? <ContentGridSkeleton count={8} /> : null}

      {displayedResults.length > 0 && (
        <div
          className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${
            showLoadingMore ? "opacity-50 transition-opacity" : ""
          }`}
        >
          {displayedResults.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {showLoadingMore ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        </div>
      ) : null}

      {showEndOfResults && !loading ? (
        <div className="py-6 text-center text-sm text-gray-500">
          {totalResults > 0 ? "Todos os resultados carregados." : ""}
        </div>
      ) : null}

      {showEmpty ? (
        <div className="py-12 text-center text-gray-500">
          Nenhum resultado encontrado para {urlQuery}
          {decadeFilter ? ` na década de ${decadeFilter}` : null}.
        </div>
      ) : null}

      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
