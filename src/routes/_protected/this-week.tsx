import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ChevronRight, Clock, Tv } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getDateKey,
  getDayLabel,
  getFormattedDate,
  isDateInCurrentWeek,
} from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { tmdb } from "@/services/tmdb";
import { useStore } from "@/store/useStore";
import type { ContentDetails } from "@/types";

export const Route = createFileRoute("/_protected/this-week")({
  component: ThisWeekComponent,
});

interface WeekEpisode {
  showId: number;
  showName: string;
  showPoster: string | null;
  episode: NonNullable<ContentDetails["next_episode_to_air"]>;
}

function ThisWeekComponent() {
  const { myList } = useStore();
  const [episodes, setEpisodes] = useState<WeekEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tvShows = myList.filter((item) => item.media_type === "tv");

    if (tvShows.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchEpisodes = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          tvShows.map((show) => tmdb.getDetails(show.tmdb_id, "tv")),
        );

        if (cancelled) return;

        const weekEpisodes: WeekEpisode[] = [];
        let failCount = 0;

        for (const result of results) {
          if (result.status === "fulfilled") {
            const details = result.value;
            const nextEp = details.next_episode_to_air;
            if (nextEp && isDateInCurrentWeek(nextEp.air_date)) {
              weekEpisodes.push({
                showId: details.id,
                showName: details.name || "",
                showPoster: details.poster_path ?? null,
                episode: nextEp,
              });
            }
          } else {
            failCount++;
          }
        }

        if (weekEpisodes.length === 0 && failCount === results.length) {
          setError("Erro ao carregar episódios da semana.");
          return;
        }

        weekEpisodes.sort((a, b) =>
          a.episode.air_date.localeCompare(b.episode.air_date),
        );

        setEpisodes(weekEpisodes);
      } catch (err) {
        logger.error("Erro ao buscar episódios da semana:", err);
        setError("Erro ao carregar episódios da semana.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEpisodes();

    return () => {
      cancelled = true;
    };
  }, [myList]);

  const groupedEpisodes = episodes.reduce<Record<string, WeekEpisode[]>>(
    (acc, ep) => {
      const key = getDateKey(ep.episode.air_date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(ep);
      return acc;
    },
    {},
  );

  const sortedDays = Object.keys(groupedEpisodes).sort();

  return (
    <div data-testid="route-this-week" className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-purple-400" />
        <h1 className="text-2xl font-bold">Esta Semana</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <Card className="h-24 animate-pulse bg-muted" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {!loading &&
        !error &&
        myList.filter((i) => i.media_type === "tv").length === 0 && (
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

      {!loading &&
        !error &&
        sortedDays.length === 0 &&
        myList.filter((i) => i.media_type === "tv").length > 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Nenhum episódio estreia esta semana.
            </p>
          </div>
        )}

      {!loading && !error && sortedDays.length > 0 && (
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
