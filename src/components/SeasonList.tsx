import { Calendar, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";

import { useSeasonProgress } from "../hooks/useSeasonProgress";
import { tmdb } from "../services/tmdb";
import { useStore } from "../store/useStore";
import type { Episode } from "../types";
import { EpisodeListSkeleton } from "./skeletons";

interface SeasonListProps {
  tvId: number;
  seasons: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    air_date: string;
    poster_path: string | null;
  }[];
}

export const SeasonList: React.FC<SeasonListProps> = ({ tvId, seasons }) => {
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    isEpisodeWatched,
    markEpisodeAsWatched,
    markEpisodeAsUnwatched,
    markSeasonAsWatched,
    markSeasonAsUnwatched,
    getSeasonProgress,
  } = useStore();

  const handleSeasonToggle = async (
    e: React.MouseEvent,
    seasonNumber: number,
    totalEpisodes: number,
  ) => {
    e.stopPropagation(); // Prevent expanding/collapsing

    const { watchedCount } = getSeasonProgress(tvId, seasonNumber);
    const isFullyWatched = watchedCount === totalEpisodes && totalEpisodes > 0;

    if (isFullyWatched) {
      markSeasonAsUnwatched(tvId, seasonNumber);
    } else {
      try {
        let seasonEpisodes = episodes;
        // If episodes are not loaded or belong to a different season, fetch them
        if (expandedSeason !== seasonNumber || episodes.length === 0) {
          const data = await tmdb.getSeasonDetails(tvId, seasonNumber);
          seasonEpisodes = data.episodes;
        }

        markSeasonAsWatched(tvId, seasonNumber, seasonEpisodes);
      } catch (error) {
        console.error("Error fetching season details:", error);
        toast.error("Erro ao marcar temporada como assistida / não assistida");
      }
    }
  };

  const handleExpandSeason = async (seasonNumber: number) => {
    if (expandedSeason === seasonNumber) {
      setExpandedSeason(null);
      return;
    }

    setExpandedSeason(seasonNumber);
    setLoading(true);
    try {
      const data = await tmdb.getSeasonDetails(tvId, seasonNumber);
      setEpisodes(data.episodes);
    } catch (error) {
      console.error("Error fetching episodes:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEpisodeWatched = (episode: Episode) => {
    if (isEpisodeWatched(tvId, episode.id)) {
      markEpisodeAsUnwatched(tvId, episode.id);
    } else {
      markEpisodeAsWatched(
        tvId,
        episode.id,
        episode.season_number,
        episode.episode_number,
      );
    }
  };

  // Filter out season 0 (Specials) if desired, or keep it. Usually season 0 is specials.
  const sortedSeasons = [...seasons].sort(
    (a, b) => a.season_number - b.season_number,
  );

  // Component to show progress for a season
  const SeasonProgress: React.FC<{
    seasonNumber: number;
    totalEpisodes: number;
  }> = ({ seasonNumber, totalEpisodes }) => {
    const progress = useSeasonProgress(tvId, seasonNumber, totalEpisodes);

    if (progress.watchedCount === 0) return null;

    const progressPercentage =
      totalEpisodes > 0 ? (progress.watchedCount / totalEpisodes) * 100 : 0;
    // Shadcn Progress doesn't support custom colors easily via props, using default primary color.
    // If needed, we can use utility classes or inline styles on the indicator if exposed,
    // but standard Shadcn Progress is clean.

    return (
      <div className="flex w-full max-w-[200px] items-center gap-2 text-xs">
        <span className="whitespace-nowrap text-muted-foreground">
          {progress.watchedCount}/{totalEpisodes}
        </span>
        <Progress value={progressPercentage} className="h-1.5" />
      </div>
    );
  };

  return (
    <div className="mt-8 space-y-4">
      <h2 className="mb-4 text-xl font-bold">Temporadas</h2>
      <div className="space-y-2">
        {sortedSeasons.map((season) => (
          <Card
            key={season.id}
            className="overflow-hidden border-border bg-card"
          >
            <Collapsible
              open={expandedSeason === season.season_number}
              onOpenChange={() => handleExpandSeason(season.season_number)}
            >
              <div className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50">
                <CollapsibleTrigger asChild>
                  <div className="flex flex-1 cursor-pointer items-center gap-4">
                    {season.poster_path ? (
                      <img
                        src={tmdb.getImageUrl(season.poster_path, "w300")}
                        alt={season.name}
                        className="h-16 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                        N/A
                      </div>
                    )}
                    <div className="flex-1 space-y-1 text-left">
                      <h3 className="font-semibold text-foreground">
                        {season.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {season.episode_count} episódios •{" "}
                        {season.air_date
                          ? new Date(season.air_date).getFullYear()
                          : "N/A"}
                      </p>
                      <SeasonProgress
                        seasonNumber={season.season_number}
                        totalEpisodes={season.episode_count}
                      />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) =>
                      handleSeasonToggle(
                        e,
                        season.season_number,
                        season.episode_count,
                      )
                    }
                    className={`z-10 rounded-full ${
                      getSeasonProgress(tvId, season.season_number)
                        .watchedCount === season.episode_count &&
                      season.episode_count > 0
                        ? "text-green-500 hover:bg-green-500/10 hover:text-green-600"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title={
                      getSeasonProgress(tvId, season.season_number)
                        .watchedCount === season.episode_count
                        ? "Marcar como não assistido"
                        : "Marcar como assistido"
                    }
                  >
                    {getSeasonProgress(tvId, season.season_number)
                      .watchedCount === season.episode_count &&
                    season.episode_count > 0 ? (
                      <Eye size={20} />
                    ) : (
                      <EyeOff size={20} />
                    )}
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon">
                      {expandedSeason === season.season_number ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              <CollapsibleContent>
                <div className="border-t border-border bg-muted/30">
                  {loading ? (
                    <EpisodeListSkeleton />
                  ) : (
                    <div className="divide-y divide-border">
                      {episodes.map((episode) => {
                        const isWatched = isEpisodeWatched(tvId, episode.id);
                        return (
                          <div
                            key={episode.id}
                            className="p-3 transition-colors hover:bg-accent/50 md:p-4"
                          >
                            <div className="flex gap-3 md:gap-4">
                              <div className="relative aspect-video w-24 flex-shrink-0 overflow-hidden rounded bg-muted md:w-32">
                                {episode.still_path ? (
                                  <img
                                    src={tmdb.getImageUrl(
                                      episode.still_path,
                                      "w300",
                                    )}
                                    alt={episode.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                    Sem imagem
                                  </div>
                                )}
                                <div className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white md:px-1.5 md:text-[10px]">
                                  Ep. {episode.episode_number}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="truncate pr-2 text-sm font-medium text-foreground md:text-base">
                                      {episode.name}
                                    </h4>
                                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground md:gap-2 md:text-xs">
                                      <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {episode.air_date
                                          ? new Date(
                                              episode.air_date,
                                            ).toLocaleDateString("pt-BR")
                                          : "TBA"}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {episode.vote_average.toFixed(1)} ★
                                      </span>
                                    </div>
                                  </div>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      toggleEpisodeWatched(episode)
                                    }
                                    className={`h-8 w-8 flex-shrink-0 rounded-full ${
                                      isWatched
                                        ? "text-green-500 hover:bg-green-500/10 hover:text-green-600"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                    title={
                                      isWatched
                                        ? "Marcar como não assistido"
                                        : "Marcar como assistido"
                                    }
                                  >
                                    {isWatched ? (
                                      <Eye size={16} />
                                    ) : (
                                      <EyeOff size={16} />
                                    )}
                                  </Button>
                                </div>

                                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground md:text-sm">
                                  {episode.overview ||
                                    "Sinopse não disponível."}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};
