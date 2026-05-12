import { Link } from "@tanstack/react-router";
import { Check, Clapperboard, Popcorn, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { useSeriesProgress } from "../hooks/useSeriesProgress";
import { tmdb } from "../services/tmdb";
import { useStore } from "../store/useStore";
import type { ContentItem, UserListTag, UserListTagType } from "../types";

interface MovieCardProps {
  item: ContentItem;
  showProgress?: boolean;
  disableLink?: boolean;
  tags?: UserListTag[];
}

const TAG_ICONS: Record<UserListTagType, typeof Popcorn> = {
  noite_de_pipoca: Popcorn,
  fim_de_semana: Clapperboard,
};

const TAG_LABELS: Record<UserListTagType, string> = {
  noite_de_pipoca: "Noite de Pipoca",
  fim_de_semana: "Fim de Semana",
};

const TAG_COLORS: Record<UserListTagType, string> = {
  noite_de_pipoca: "bg-yellow-500/80",
  fim_de_semana: "bg-blue-500/80",
};

export function MovieCard({
  item,
  showProgress = false,
  disableLink = false,
  tags,
}: MovieCardProps) {
  const title = item.media_type === "movie" ? item.title : item.name;
  const date =
    item.media_type === "movie" ? item.release_date : item.first_air_date;
  const year = date ? new Date(date).getFullYear() : "N/A";
  const { isWatched, getSeriesMetadata } = useStore();
  const watched = isWatched(item.id);

  const { watchedCount } = useSeriesProgress(item.id, 0);
  const seriesMetadata =
    item.media_type === "tv" ? getSeriesMetadata(item.id) : undefined;

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
        {tags != null && tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-col gap-1">
            {tags.map((t) => {
              const tagType = t.tag as UserListTagType;
              const Icon = TAG_ICONS[tagType];
              return (
                <div
                  key={t.id || t.tag}
                  className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow-lg ${TAG_COLORS[tagType]}`}
                  title={TAG_LABELS[tagType]}
                >
                  <Icon size={10} />
                  <span className="hidden group-hover:inline">
                    {TAG_LABELS[tagType]}
                  </span>
                </div>
              );
            })}
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
