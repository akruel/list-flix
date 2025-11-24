import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Calendar } from 'lucide-react';
import { tmdb } from '../services/tmdb';
import { useStore } from '../store/useStore';
import type { Episode } from '../types';
import { EpisodeListSkeleton } from './skeletons';
import { useSeasonProgress } from '../hooks/useSeasonProgress';

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
  
  const { isEpisodeWatched, markEpisodeAsWatched, markEpisodeAsUnwatched } = useStore();

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
      console.error('Error fetching episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEpisodeWatched = (episode: Episode) => {
    if (isEpisodeWatched(tvId, episode.id)) {
      markEpisodeAsUnwatched(tvId, episode.id);
    } else {
      markEpisodeAsWatched(tvId, episode.id, episode.season_number, episode.episode_number);
    }
  };

  // Filter out season 0 (Specials) if desired, or keep it. Usually season 0 is specials.
  const sortedSeasons = [...seasons].sort((a, b) => a.season_number - b.season_number);

  // Component to show progress for a season
  const SeasonProgress: React.FC<{ seasonNumber: number; totalEpisodes: number }> = ({ seasonNumber, totalEpisodes }) => {
    const progress = useSeasonProgress(tvId, seasonNumber, totalEpisodes);
    
    if (progress.watchedCount === 0) return null;
    
    const progressPercentage = totalEpisodes > 0 ? (progress.watchedCount / totalEpisodes) * 100 : 0;
    const progressColor = progressPercentage === 100 ? 'bg-green-500' : progressPercentage >= 50 ? 'bg-blue-500' : 'bg-yellow-500';
    
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">{progress.watchedCount}/{totalEpisodes}</span>
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progressColor} transition-all duration-300`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 mt-8">
      <h2 className="text-xl font-bold mb-4">Temporadas</h2>
      <div className="space-y-2">
        {sortedSeasons.map((season) => (
          <div key={season.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
            <button
              onClick={() => handleExpandSeason(season.season_number)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-4">
                {season.poster_path ? (
                  <img
                    src={tmdb.getImageUrl(season.poster_path, 'w300')}
                    alt={season.name}
                    className="w-12 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-16 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">
                    N/A
                  </div>
                )}
                <div className="text-left space-y-1">
                  <h3 className="font-semibold text-white">{season.name}</h3>
                  <p className="text-sm text-gray-400">
                    {season.episode_count} episódios • {season.air_date ? new Date(season.air_date).getFullYear() : 'N/A'}
                  </p>
                  <SeasonProgress seasonNumber={season.season_number} totalEpisodes={season.episode_count} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                {expandedSeason === season.season_number ? (
                  <ChevronUp className="text-gray-400" />
                ) : (
                  <ChevronDown className="text-gray-400" />
                )}
              </div>
            </button>

            {expandedSeason === season.season_number && (
              <div className="border-t border-gray-800 bg-gray-900/50">
                {loading ? (
                  <EpisodeListSkeleton />
                ) : (
                  <div className="divide-y divide-gray-800">
                    {episodes.map((episode) => {
                      const isWatched = isEpisodeWatched(tvId, episode.id);
                      return (
                        <div key={episode.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                          <div className="flex gap-4">
                            <div className="relative flex-shrink-0 w-32 aspect-video bg-gray-800 rounded overflow-hidden">
                              {episode.still_path ? (
                                <img
                                  src={tmdb.getImageUrl(episode.still_path, 'w300')}
                                  alt={episode.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                  Sem imagem
                                </div>
                              )}
                              <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                Ep. {episode.episode_number}
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h4 className="font-medium text-white truncate pr-2">{episode.name}</h4>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                    <span className="flex items-center gap-1">
                                      <Calendar size={12} />
                                      {episode.air_date ? new Date(episode.air_date).toLocaleDateString('pt-BR') : 'TBA'}
                                    </span>
                                    <span>•</span>
                                    <span>{episode.vote_average.toFixed(1)} ★</span>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => toggleEpisodeWatched(episode)}
                                  className={`p-2 rounded-full transition-colors ${
                                    isWatched 
                                      ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' 
                                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                  }`}
                                  title={isWatched ? "Marcar como não assistido" : "Marcar como assistido"}
                                >
                                  {isWatched ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                              </div>
                              
                              <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                                {episode.overview || "Sinopse não disponível."}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
