export interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  media_type: 'movie';
  budget?: number;
  revenue?: number;
}

export interface TVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  first_air_date: string;
  vote_average: number;
  media_type: 'tv';
}

export type ContentItem = Movie | TVShow;

export interface SearchResponse {
  page: number;
  results: ContentItem[];
  total_pages: number;
  total_results: number;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviders {
  link: string;
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
}

export type ContentDetails = (Movie | TVShow) & {
  genres: { id: number; name: string }[];
  runtime?: number; // For movies
  episode_run_time?: number[]; // For TV
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  last_episode_to_air?: Episode;
  next_episode_to_air?: Episode;
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string }[];
  };
  videos?: {
    results: { key: string; name: string; site: string; type: string }[];
  };
  'watch/providers'?: {
    results: {
      [countryCode: string]: WatchProviders;
    };
  };
  seasons?: {
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    air_date: string;
    poster_path: string | null;
  }[];
};
