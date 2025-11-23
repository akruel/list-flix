import React, { useState, useEffect } from 'react';
import { tmdb } from '../services/tmdb';
import type { ContentItem } from '../types';
import { MovieCard } from '../components/MovieCard';
import { Search as SearchIcon } from 'lucide-react';
import { ContentGridSkeleton } from '../components/skeletons';

export const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce effect
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
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  return (
    <div>
      <div className="relative mb-8">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar filmes ou séries..."
          className="w-full bg-gray-800 text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
          autoFocus
        />
      </div>

      {loading ? (
        <ContentGridSkeleton count={8} />
      ) : (
        <>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((item) => (
                <MovieCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            debouncedQuery && (
              <div className="text-center text-gray-500 py-12">
                Nenhum resultado encontrado para "{debouncedQuery}"
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};
