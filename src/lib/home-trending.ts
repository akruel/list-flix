import type { ContentItem } from "@/types";

const MAX_RESULTS = 20;

function interleave(
  movies: ContentItem[],
  tvShows: ContentItem[],
): ContentItem[] {
  const merged: ContentItem[] = [];
  const maxLen = Math.max(movies.length, tvShows.length);
  for (let i = 0; i < maxLen && merged.length < MAX_RESULTS; i++) {
    if (i < movies.length) merged.push(movies[i]);
    if (i < tvShows.length) merged.push(tvShows[i]);
  }
  return merged;
}

export interface DeriveHomeTrendingParams {
  selectedMood: string | null;
  selectedMediaType: "movie" | "tv" | null;
  trendingDefault: ContentItem[];
  moodResults: (ContentItem[] | undefined)[];
}

export function deriveHomeTrending(
  params: DeriveHomeTrendingParams,
): ContentItem[] {
  const { selectedMood, selectedMediaType, trendingDefault, moodResults } =
    params;

  if (selectedMood) {
    if (selectedMediaType) {
      return (moodResults[0] ?? []).slice(0, MAX_RESULTS);
    }
    return interleave(moodResults[0] ?? [], moodResults[1] ?? []);
  }

  if (selectedMediaType) {
    return trendingDefault.filter(
      (item) => item.media_type === selectedMediaType,
    );
  }

  return trendingDefault;
}
