export interface AiSuggestionResult {
  strategy: "search" | "discover" | "person";
  query?: string;
  person_name?: string;
  role?: "cast" | "crew";
  media_type?: "movie" | "tv";
  suggested_list_name?: string;
  with_genres?: string;
  "primary_release_date.gte"?: string;
  "primary_release_date.lte"?: string;
  "vote_average.gte"?: number;
  "vote_count.gte"?: number;
  with_original_language?: string;
  sort_by?: string;
  with_keywords?: string;
  [key: string]: unknown;
}

export interface AiProvider {
  getSuggestions(prompt: string): Promise<AiSuggestionResult>;
}
