import { ai } from "@/services/ai";
import { tmdb } from "@/services/tmdb";
import type { ContentItem } from "@/types";

export async function getMagicSearchResults(
  prompt: string,
  onSearchStart?: () => void,
): Promise<{
  suggestedName: string;
  items: ContentItem[];
}> {
  const suggestion = await ai.getSuggestions(prompt);
  onSearchStart?.();
  const searchPromises = suggestion.items.map((item) =>
    tmdb.findBestMatch(item.title, item.media_type, item.year),
  );
  const rawItems = (await Promise.all(searchPromises)).filter(
    (item): item is ContentItem => !!item,
  );
  const items = Array.from(
    new Map(rawItems.map((item) => [item.id, item])).values(),
  );

  return {
    suggestedName: suggestion.suggested_list_name,
    items,
  };
}
