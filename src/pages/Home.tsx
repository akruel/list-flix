import React, { useEffect, useState } from 'react';
import { tmdb } from '../services/tmdb';
import type { ContentItem } from '../types';
import { MovieCard } from '../components/MovieCard';
import { ContentGridSkeleton } from '../components/skeletons';

export const Home: React.FC = () => {
  const [trending, setTrending] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await tmdb.getTrending('week');
        setTrending(data);
      } catch (error) {
        console.error('Error fetching trending:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Em Alta</h1>
        <ContentGridSkeleton />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Em Alta</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {trending.map((item) => (
          <MovieCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
