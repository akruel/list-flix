const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
const TMDB_IMAGE_PLACEHOLDER =
  "https://via.placeholder.com/500x750?text=No+Image";

export function getTmdbImageUrl(
  path: string | null | undefined,
  size: "w300" | "w500" | "original" = "w500",
) {
  if (!path) return TMDB_IMAGE_PLACEHOLDER;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}
