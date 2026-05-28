import { useQueries, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Clock, Tv, Users } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getDateKey,
  getDayLabel,
  getFormattedDate,
  isDateInCurrentWeek,
} from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { watchingContextBatchQuery } from "@/services/listService.queries";
import { tmdb } from "@/services/tmdb";
import { detailsQuery, seasonQuery } from "@/services/tmdb.queries";
import { useUserContentStore } from "@/store/useUserContentStore";
import type { ContentDetails, ContentItem, Episode } from "@/types";

import { sharedTvItemsSafeQuery } from "./-this-week.queries";

// The route-level errorComponent is a safety net for unexpected loader failures
// only. The tolerant sharedTvItemsSafeQuery means it should almost never
// trigger. Per-query TMDB errors are handled inline via isError / partial
// failure banner.
export const Route = createFileRoute("/_protected/this-week")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(sharedTvItemsSafeQuery()),
  pendingComponent: ThisWeekSkeleton,
  errorComponent: ThisWeekErrorComponent,
  component: ThisWeekComponent,
});

interface WeekEpisode {
  showId: number;
  showName: string;
  showPoster: string | null;
  episode: Episode;
}

function ThisWeekSkeleton() {
  return (
    <div data-testid="route-this-week" className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-bold">Esta Semana</h1>
      </div>
      <div data-testid="loading-skeleton" className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
            <Card className="h-24 animate-pulse bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ThisWeekErrorComponent({ error }: { error: Error }) {
  logger.error("This Week route error:", error);
  return (
    <div
      data-testid="route-this-week"
      className="flex flex-col items-center gap-4 py-16 text-center"
    >
      <p className="text-muted-foreground">
        Não foi possível carregar os episódios desta semana.
      </p>
      {import.meta.env.DEV ? (
        <pre className="max-w-full overflow-auto rounded-md bg-muted px-4 py-2 text-left text-xs text-muted-foreground">
          {error.message}
        </pre>
      ) : null}
      <Button variant="outline" onClick={() => window.location.reload()}>
        Tentar novamente
      </Button>
    </div>
  );
}

export function ThisWeekComponent() {
  const myList = useUserContentStore((s) => s.myList);
  const watchedEpisodes = useUserContentStore((s) => s.watchedEpisodes);

  const { data: sharedItems } = useSuspenseQuery(sharedTvItemsSafeQuery());

  const personalTvShows = useMemo(
    () => myList.filter((item) => item.media_type === "tv"),
    [myList],
  );

  const allTvShows = useMemo<ContentItem[]>(() => {
    const personalIds = new Set(personalTvShows.map((i) => i.id));
    const combined: ContentItem[] = [...personalTvShows];
    for (const item of sharedItems) {
      if (!personalIds.has(item.content_id)) {
        combined.push({ id: item.content_id, media_type: "tv" } as ContentItem);
      }
    }
    return combined;
  }, [personalTvShows, sharedItems]);

  const watchingContextItems = useMemo(
    () =>
      sharedItems.map((i) => ({
        contentId: i.content_id,
        contentType: i.content_type as "movie" | "tv",
      })),
    [sharedItems],
  );

  const { data: watchingContextMap = {} } = useQuery(
    watchingContextBatchQuery(watchingContextItems),
  );

  const detailsCombined = useQueries({
    queries: allTvShows.map((show) => detailsQuery("tv", show.id)),
    combine: (results) => ({
      details: results.flatMap((r) => (r.data ? [r.data] : [])),
      isPending: results.some((r) => r.isPending),
      allError: results.length > 0 && results.every((r) => r.isError),
      anyError: results.some((r) => r.isError),
      refetch: () => {
        results.forEach((r) => {
          void r.refetch();
        });
      },
    }),
  });

  const seasonInputs = useMemo(() => {
    const inputs: Array<{ tvId: number; seasonNumber: number }> = [];
    for (const details of detailsCombined.details) {
      const activeSeason =
        details.next_episode_to_air?.season_number ??
        details.last_episode_to_air?.season_number;
      if (activeSeason != null) {
        inputs.push({ tvId: details.id, seasonNumber: activeSeason });
      }
    }
    return inputs;
  }, [detailsCombined.details]);

  const seasonCombined = useQueries({
    queries: seasonInputs.map(({ tvId, seasonNumber }) =>
      seasonQuery(tvId, seasonNumber),
    ),
    combine: (results) => ({
      seasons: results.map((r) => r.data),
      isPending: results.some((r) => r.isPending),
      allError: results.length > 0 && results.every((r) => r.isError),
      anyError: results.some((r) => r.isError),
      refetch: () => {
        results.forEach((r) => {
          void r.refetch();
        });
      },
    }),
  });

  const isLoading =
    detailsCombined.isPending ||
    (seasonInputs.length > 0 && seasonCombined.isPending);

  const episodes = useMemo(() => {
    const weekEpisodes: WeekEpisode[] = [];

    const detailsById = new Map<number, ContentDetails>(
      detailsCombined.details.map((d) => [d.id, d]),
    );

    seasonCombined.seasons.forEach((seasonData, idx) => {
      if (!seasonData) return;
      const input = seasonInputs[idx];
      if (!input) return;
      const details = detailsById.get(input.tvId);
      if (!details) return;

      const showWatched = watchedEpisodes[details.id] ?? {};

      for (const episode of seasonData.episodes) {
        const isWatched = Object.hasOwn(showWatched, episode.id);
        if (
          episode.air_date &&
          isDateInCurrentWeek(episode.air_date) &&
          !isWatched
        ) {
          weekEpisodes.push({
            showId: details.id,
            showName: details.name ?? "",
            showPoster: details.poster_path ?? null,
            episode,
          });
        }
      }
    });

    return weekEpisodes.sort((a, b) =>
      a.episode.air_date.localeCompare(b.episode.air_date),
    );
  }, [
    seasonCombined.seasons,
    seasonInputs,
    detailsCombined.details,
    watchedEpisodes,
  ]);

  // Main-parity: surface the error UI when fetches collapsed entirely
  // (no episodes derived AND either every detailsQuery failed OR every
  // seasonQuery failed). Single-show successes with no current-week
  // episode still show the empty state.
  const isError =
    !isLoading &&
    episodes.length === 0 &&
    (detailsCombined.allError ||
      (seasonInputs.length > 0 && seasonCombined.allError));

  const hasPartialFailure =
    !isLoading &&
    !isError &&
    (detailsCombined.anyError || seasonCombined.anyError);

  const handleRetry = () => {
    detailsCombined.refetch();
    seasonCombined.refetch();
  };

  const groupedEpisodes = useMemo(
    () =>
      episodes.reduce<Record<string, WeekEpisode[]>>((acc, ep) => {
        const key = getDateKey(ep.episode.air_date);
        if (!acc[key]) acc[key] = [];
        acc[key].push(ep);
        return acc;
      }, {}),
    [episodes],
  );

  const sortedDays = useMemo(
    () => Object.keys(groupedEpisodes).sort(),
    [groupedEpisodes],
  );

  if (isLoading) {
    return <ThisWeekSkeleton />;
  }

  return (
    <div data-testid="route-this-week" className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-bold">Esta Semana</h1>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">
            Erro ao carregar episódios da semana.
          </p>
          <Button variant="outline" onClick={handleRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {!isError && hasPartialFailure ? (
        <p
          data-testid="partial-failure"
          className="text-sm text-muted-foreground"
        >
          Algumas séries não puderam ser carregadas.
        </p>
      ) : null}

      {!isError && allTvShows.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Tv className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Você ainda não adicionou nenhuma série à sua lista.
          </p>
          <Button asChild>
            <Link to="/search">Buscar séries</Link>
          </Button>
        </div>
      )}

      {!isError && allTvShows.length > 0 && sortedDays.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            Nenhum episódio estreia esta semana.
          </p>
        </div>
      )}

      {!isError && sortedDays.length > 0 && (
        <div className="space-y-6">
          {sortedDays.map((dayKey) => (
            <section key={dayKey}>
              <h2 className="mb-3 text-lg font-semibold capitalize text-foreground">
                {getDayLabel(dayKey)}, {getFormattedDate(dayKey)}
              </h2>
              <div className="space-y-3">
                {groupedEpisodes[dayKey].map((item) => (
                  <Link
                    key={`${item.showId}-${item.episode.id}`}
                    to={"/details/$type/$id"}
                    params={{ type: "tv", id: String(item.showId) }}
                    className="block"
                  >
                    <Card className="flex gap-4 border-border bg-card p-4 transition-colors hover:bg-accent/50">
                      <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-muted">
                        {item.showPoster ? (
                          <img
                            src={tmdb.getImageUrl(item.showPoster, "w300")}
                            alt={item.showName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            Sem imagem
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.showName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.episode.name}
                            </p>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Temporada {item.episode.season_number} &bull; Ep.{" "}
                            {item.episode.episode_number}
                          </span>
                          {!!watchingContextMap[item.showId] &&
                            watchingContextMap[item.showId].length > 0 && (
                              <>
                                <span>&bull;</span>
                                <span className="flex items-center gap-1 text-purple-400">
                                  <Users size={12} />
                                  <span className="max-w-[120px] truncate">
                                    {[
                                      ...new Set(
                                        watchingContextMap[item.showId]
                                          .flatMap((c) => c.memberNames)
                                          .filter(Boolean),
                                      ),
                                    ].join(", ")}
                                  </span>
                                </span>
                              </>
                            )}
                        </div>
                        {!!item.episode.overview && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {item.episode.overview}
                          </p>
                        )}
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
