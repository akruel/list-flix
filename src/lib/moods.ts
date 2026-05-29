export interface Mood {
  key: string;
  label: string;
  genreIds: number[];
  runtimeLte?: number;
}

export const MOODS: Mood[] = [
  { key: "suspense", label: "Suspense", genreIds: [53, 9648] },
  { key: "sci-fi", label: "Sci-fi", genreIds: [878] },
  { key: "dark", label: "Dark", genreIds: [27, 53, 80] },
  { key: "mindfuck", label: "Mindfuck", genreIds: [9648, 878] },
  { key: "true-crime", label: "True Crime", genreIds: [80, 99] },
  { key: "plot-twist", label: "Plot Twist", genreIds: [9648, 53] },
  { key: "animacao", label: "Animação", genreIds: [16] },
  { key: "violento", label: "Violento", genreIds: [28, 10752, 27] },
  { key: "divertido", label: "Divertido", genreIds: [35, 10751, 10749] },
  {
    key: "curtos",
    label: "Filmes curtos",
    genreIds: [28, 35, 10751],
    runtimeLte: 90,
  },
];

const genreIdTvMap = new Map<number, number>([
  [28, 10759],
  [12, 10759],
  [878, 10765],
  [10752, 10768],
]);

const validTvGenreIds = new Set([
  10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766,
  10767, 10768, 37,
]);

const moodsTvGenreIds: Record<string, number[]> = {};
for (const mood of MOODS) {
  moodsTvGenreIds[mood.key] = mood.genreIds
    .map((id) => genreIdTvMap.get(id) ?? id)
    .filter((id) => validTvGenreIds.has(id));
}

const moodMap = new Map<string, Mood>();
for (const mood of MOODS) {
  moodMap.set(mood.key, mood);
}

export function getMoodDiscoverParams(
  key: string | null,
  mediaType?: "movie" | "tv",
): Record<string, unknown> {
  if (!key) return {};

  const mood = moodMap.get(key);
  if (!mood) return {};

  const isTv = mediaType === "tv";
  const genreIds = isTv ? moodsTvGenreIds[key]! : mood.genreIds;

  const params: Record<string, unknown> = {
    sort_by: "popularity.desc",
    vote_count_gte: 100,
    media_type: mediaType ?? "movie",
  };

  params.with_genres = genreIds.join(",");

  if (!isTv && mood.runtimeLte) {
    params.with_runtime_lte = mood.runtimeLte;
  }

  return params;
}
