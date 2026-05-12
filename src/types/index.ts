export type UserListTagType =
  | "noite_de_pipoca"
  | "fim_de_semana"
  | "assistir_com";

export interface UserListTag {
  id: string;
  user_list_id: string;
  tag: UserListTagType;
  partner_user_id?: string;
  created_at: string;
}

export interface WatchPartner {
  id: string;
  user_id: string;
  partner_user_id: string;
  created_at: string;
}

export interface AvailableUser {
  user_id: string;
  display_name: string;
}

export interface UserListItem {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  created_at: string;
  tags?: UserListTag[];
}

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
  media_type: "movie" | "tv";
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface Video {
  key: string;
  name: string;
  type: string;
}

interface Genre {
  id: number;
  name: string;
  character?: string;
}

interface Season {
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
  "watch/providers"?: {
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

export type AuthProvider = "email" | "google" | "anonymous" | "unknown";

export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  provider: AuthProvider;
  isAnonymous: boolean;
}
