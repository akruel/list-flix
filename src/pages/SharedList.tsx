import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tmdb } from '../services/tmdb';
import type{ ContentItem } from '../types';
import { MovieCard } from '../components/MovieCard';
import { ContentGridSkeleton } from '../components/skeletons';

import { supabaseService } from '../services/supabase';

export const SharedList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const dataParam = searchParams.get('data');
  const idParam = searchParams.get('id');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSharedItems = async () => {
      if (!dataParam && !idParam) {
        setError('Link inválido ou incompleto.');
        setLoading(false);
        return;
      }

      try {
        let listData: { id: number; type: 'movie' | 'tv' }[] = [];

        if (idParam) {
          listData = await supabaseService.getSharedList(idParam);
        } else if (dataParam) {
          // Decode base64 (Legacy support)
          const decoded = atob(dataParam);
          listData = JSON.parse(decoded);
        }

        // Fetch details for each item
        // Note: In a real app, we might want a bulk endpoint or better error handling
        const promises = listData.map(item => tmdb.getDetails(item.id, item.type));
        const results = await Promise.all(promises);
        
        setItems(results);
      } catch (err) {
        console.error('Error loading shared list:', err);
        setError('Erro ao carregar a lista compartilhada.');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedItems();
  }, [dataParam, idParam]);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Lista Compartilhada</h1>
        <ContentGridSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-400">
        <p className="text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Lista Compartilhada</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <MovieCard key={item.id} item={item} showProgress={true} />
        ))}
      </div>
    </div>
  );
};
