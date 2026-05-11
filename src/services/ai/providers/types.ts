interface AiSuggestionItem {
  title: string;
  media_type: "movie" | "tv";
}

export interface AiSuggestionResult {
  suggested_list_name: string;
  items: AiSuggestionItem[];
}

export interface AiProvider {
  getSuggestions(prompt: string): Promise<AiSuggestionResult>;
}
