import { Clock, Star } from "lucide-react";

import { parseLocalDate } from "@/lib/date-utils";
import { getTmdbImageUrl } from "@/lib/tmdb-images";
import type { ContentDetails } from "@/types";

interface DetailsHeroProps {
  details: ContentDetails;
}

export function DetailsHero({ details }: DetailsHeroProps) {
  const title =
    (details.media_type === "movie" ? details.title : details.name) || "";
  const date =
    details.media_type === "movie"
      ? details.release_date
      : details.first_air_date;
  const year = date ? parseLocalDate(date).getFullYear() : "N/A";

  return (
    <div className="relative h-[40vh] w-full md:h-[60vh]">
      <div className="absolute inset-0">
        <img
          src={getTmdbImageUrl(details.backdrop_path || "", "original")}
          alt={title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />
      </div>

      <div className="container absolute bottom-0 left-0 right-0 mx-auto flex flex-col items-end gap-6 p-4 md:flex-row">
        <img
          src={getTmdbImageUrl(details.poster_path || "", "w300")}
          alt={title}
          className="hidden w-48 rounded-lg shadow-2xl md:block"
        />
        <div className="mb-4 flex-1">
          <h1 className="mb-2 text-3xl font-bold md:text-5xl">{title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 md:text-base">
            <span className="flex items-center gap-1 text-yellow-400">
              <Star size={16} fill="currentColor" />{" "}
              {(details.vote_average || 0).toFixed(1)}
            </span>
            <span>{year}</span>
            {!!details.runtime && (
              <span className="flex items-center gap-1">
                <Clock size={16} /> {Math.floor(details.runtime / 60)}h{" "}
                {details.runtime % 60}m
              </span>
            )}
            <div className="flex gap-2">
              {details.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-md bg-gray-800 px-2 py-1 text-xs"
                >
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
