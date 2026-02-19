// Types for watched episodes metadata
export interface WatchedEpisodeMetadata {
  season_number: number;
  episode_number: number;
}

// Types for series metadata (total episodes, seasons, etc)
export interface SeriesMetadata {
  total_episodes: number;
  number_of_seasons: number;
}

export interface ContentItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  media_type: 'movie' | 'tv';
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

export interface UserContent {
  id: string;
  user_id: string;
  content_id: number;
  content_type: 'movie' | 'tv' | 'episode';
  interaction_type: 'watchlist' | 'watched';
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface List {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  role?: 'owner' | 'editor' | 'viewer'; // Computed from list_members
}

export interface ListMember {
  list_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  member_name?: string;
  created_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  content_id: number;
  content_type: 'movie' | 'tv';
  added_by: string;
  created_at: string;
  // Joined fields
  content?: ContentItem; 
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface Video {
  key: string;
  name: string;
  type: string;
}

export interface Genre {
  id: number;
  name: string;
  character?: string; // Some APIs might return this
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string;
  poster_path: string | null;
  overview: string;
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  runtime: number;
  show_id: number;
}

export interface ContentDetails extends ContentItem {
  genres: Genre[];
  status: string;
  credits: {
    cast: CastMember[];
  };
  videos: {
    results: Video[];
  };
  'watch/providers'?: {
    results: {
      BR?: {
        link: string;
        flatrate?: Provider[];
        rent?: Provider[];
        buy?: Provider[];
      };
    };
  };
  // Movie specific
  runtime?: number;
  budget?: number;
  revenue?: number;
  // TV specific
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  seasons?: Season[];
  next_episode_to_air?: Episode;
  last_episode_to_air?: Episode;
}

export interface SearchResponse {
  page: number;
  results: ContentItem[];
  total_pages: number;
  total_results: number;
}

export interface SeasonDetails {
  _id: string;
  air_date: string;
  episodes: Episode[];
  name: string;
  overview: string;
  id: number;
  poster_path: string | null;
  season_number: number;
}

export type AuthProvider = 'email' | 'google' | 'anonymous' | 'unknown';

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  isAnonymous: boolean;
}
