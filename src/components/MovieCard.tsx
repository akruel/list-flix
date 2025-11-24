import React from 'react';
import type { ContentItem } from '../types';
import { tmdb } from '../services/tmdb';
import { Star, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useSeriesProgress } from '../hooks/useSeriesProgress';

interface MovieCardProps {
  item: ContentItem;
}

export const MovieCard: React.FC<MovieCardProps> = ({ item }) => {
  const title = item.media_type === 'movie' ? item.title : item.name;
  const date = item.media_type === 'movie' ? item.release_date : item.first_air_date;
  const year = date ? new Date(date).getFullYear() : 'N/A';
  const { isWatched } = useStore();
  const watched = isWatched(item.id);

  // Get progress for TV series (note: item doesn't have number_of_episodes here)
  // We'll show progress only if there are watched episodes, without total
  const { watchedCount } = useSeriesProgress(item.id, 0);
  const hasProgress = item.media_type === 'tv' && watchedCount > 0;

  return (
    <Link 
      to={`/details/${item.media_type}/${item.id}`}
      className="group relative block bg-gray-800 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-200 shadow-lg"
    >
      <div className="aspect-[2/3] w-full">
        <img 
          src={tmdb.getImageUrl(item.poster_path, 'w500')} 
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {watched && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-2 shadow-lg">
            <Check size={16} />
          </div>
        )}
        {hasProgress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${Math.min(watchedCount * 5, 100)}%` }}
              title={`${watchedCount} episódios assistidos`}
            />
          </div>
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white font-semibold px-4 py-2 bg-primary rounded-full">Ver Detalhes</span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-bold text-white truncate" title={title}>{title}</h3>
        <div className="flex items-center justify-between text-gray-400 text-sm mt-1">
          <span>{year}</span>
          <div className="flex items-center gap-1 text-yellow-400">
            <Star size={14} fill="currentColor" />
            <span>{(item.vote_average || 0).toFixed(1)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
