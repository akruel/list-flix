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
  {
    key: "curtos",
    label: "Filmes curtos",
    genreIds: [28, 35, 10751],
    runtimeLte: 90,
  },
];

const moodMap = new Map<string, Mood>();
for (const mood of MOODS) {
  moodMap.set(mood.key, mood);
}

export function getMoodDiscoverParams(
  key: string | null,
): Record<string, unknown> {
  if (!key) return {};

  const mood = moodMap.get(key);
  if (!mood) return {};

  const params: Record<string, unknown> = {
    sort_by: "popularity.desc",
    vote_count_gte: 100,
  };

  if (mood.genreIds.length > 0) {
    params.with_genres = mood.genreIds.join(",");
  }

  if (mood.runtimeLte) {
    params.with_runtime_lte = mood.runtimeLte;
  }

  return params;
}
