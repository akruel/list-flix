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

  searchPerson: async (query: string): Promise<number | null> => {
    const response = await tmdbClient.get<SearchResponse>('/search/person', {
      params: { query },
    });
    const person = response.data.results[0];
    return person ? person.id : null;
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
  },

  getGenres: async (): Promise<{ id: number; name: string }[]> => {
    const [movieGenres, tvGenres] = await Promise.all([
      tmdbClient.get<{ genres: { id: number; name: string }[] }>('/genre/movie/list'),
      tmdbClient.get<{ genres: { id: number; name: string }[] }>('/genre/tv/list'),
    ]);
    
    // Combine and deduplicate genres
    const allGenres = [...movieGenres.data.genres, ...tvGenres.data.genres];
    const uniqueGenres = Array.from(new Map(allGenres.map(item => [item.id, item])).values());
    
    return uniqueGenres;
  },

  discover: async (filters: Record<string, unknown>): Promise<ContentItem[]> => {
    // Determine if we are searching for movies or tv shows based on filters or default to movie
    // Ideally the AI should tell us which endpoint to use, but for now let's assume we might need to query both or just one.
    // To simplify, if the AI doesn't specify, we default to movie discovery.
    
    const mediaType = (filters.media_type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';
    const endpoint = mediaType === 'tv' ? '/discover/tv' : '/discover/movie';
    
    // Remove media_type from filters as it's not a valid param for discover endpoint
    const params = { ...filters };
    delete params.media_type;

    const response = await tmdbClient.get<SearchResponse>(endpoint, {
      params: {
        ...params,
        sort_by: params.sort_by || 'popularity.desc',
      },
    });

    return response.data.results.map(item => ({
      ...item,
      media_type: mediaType
    }));
  }
};
