import { Link } from "@tanstack/react-router";
import { Check, Star, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { useSeriesProgress } from "../hooks/useSeriesProgress";
import { tmdb } from "../services/tmdb";
import { useStore } from "../store/useStore";
import type { ContentItem, WatchingContext } from "../types";

interface MovieCardProps {
  item: ContentItem;
  showProgress?: boolean;
  disableLink?: boolean;
  watchingWith?: WatchingContext[];
}

export function MovieCard({
  item,
  showProgress = false,
  disableLink = false,
  watchingWith,
}: MovieCardProps) {
  const title = item.media_type === "movie" ? item.title : item.name;
  const date =
    item.media_type === "movie" ? item.release_date : item.first_air_date;
  const year = date ? new Date(date).getFullYear() : "N/A";
  const { isWatched, getSeriesMetadata } = useStore();
  const watched = isWatched(item.id);

  // Get progress for TV series
  const { watchedCount } = useSeriesProgress(item.id, 0);
  const seriesMetadata =
    item.media_type === "tv" ? getSeriesMetadata(item.id) : undefined;

  // Only show progress if:
  // 1. showProgress prop is true
  // 2. It's a TV series
  // 3. We have metadata available
  // 4. There are watched episodes
  const shouldShowProgress =
    showProgress &&
    item.media_type === "tv" &&
    seriesMetadata &&
    watchedCount > 0;

  const progressPercentage =
    seriesMetadata && seriesMetadata.total_episodes > 0
      ? Math.round((watchedCount / seriesMetadata.total_episodes) * 100)
      : 0;

  const cardContent = (
    <Card className="group relative overflow-hidden border-0 bg-card shadow-lg transition-transform duration-200 hover:scale-105">
      <div className="relative aspect-[2/3] w-full">
        <img
          src={tmdb.getImageUrl(item.poster_path, "w500")}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {!!watched && (
          <div
            className="absolute right-2 top-2 rounded-full bg-blue-600 p-2 text-white shadow-lg"
            data-testid="watched-badge"
          >
            <Check size={16} />
          </div>
        )}
        {!!watchingWith && watchingWith.length > 0 && (
          <div
            className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs text-white shadow-lg backdrop-blur-sm"
            data-testid="watching-with-badge"
          >
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span className="max-w-[100px] truncate">
                {watchingWith
                  .flatMap((c) => c.memberNames)
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          </div>
        )}
        {!!shouldShowProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              data-testid="progress-fill"
              style={{ width: `${progressPercentage}%` }}
              title={`${watchedCount} de ${seriesMetadata?.total_episodes} episódios (${progressPercentage}%)`}
            />
          </div>
        )}
        {!disableLink && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
            <Badge
              variant="secondary"
              className="px-4 py-2 text-sm font-semibold"
            >
              Ver Detalhes
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="truncate font-bold text-foreground" title={title}>
          {title}
        </h3>
        <div className="mt-1 flex items-center justify-between text-sm text-muted-foreground">
          <span>{year}</span>
          <div className="flex items-center gap-1 text-yellow-400">
            <Star size={14} fill="currentColor" />
            <span>{(item.vote_average || 0).toFixed(1)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (disableLink) {
    return <div className="block">{cardContent}</div>;
  }

  return (
    <Link
      to="/details/$type/$id"
      params={{ type: item.media_type, id: String(item.id) }}
      className="block"
    >
      {cardContent}
    </Link>
  );
}
