import axios from 'axios';
import type { SearchResponse, ContentDetails, ContentItem, SeasonDetails } from '../types';

const ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN;
const BASE_URL = 'https://api.themoviedb.org/3';

const tmdbClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  params: {
    language: 'pt-BR', // Default to Portuguese as requested implicitly by user language
  },
});

export const tmdb = {
  getTrending: async (timeWindow: 'day' | 'week' = 'week'): Promise<ContentItem[]> => {
    const response = await tmdbClient.get<SearchResponse>(`/trending/all/${timeWindow}`);
    return response.data.results;
  },

  search: async (query: string): Promise<ContentItem[]> => {
    const response = await tmdbClient.get<SearchResponse>('/search/multi', {
      params: { query },
    });
    return response.data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  },

  getDetails: async (id: number, type: 'movie' | 'tv'): Promise<ContentDetails> => {

    const response = await tmdbClient.get<ContentDetails>(`/${type}/${id}`, {
      params: {
        append_to_response: 'credits,videos,watch/providers',
      },
    });
    return { ...response.data, media_type: type } as ContentDetails;
  },

  getSeasonDetails: async (tvId: number, seasonNumber: number): Promise<SeasonDetails> => {
    const response = await tmdbClient.get<SeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
    return response.data;
  },
  
  getImageUrl: (path: string | null | undefined, size: 'w300' | 'w500' | 'original' = 'w500') => {
    if (!path) return 'https://via.placeholder.com/500x750?text=No+Image';
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }
};
