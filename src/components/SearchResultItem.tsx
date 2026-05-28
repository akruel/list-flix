import { Link } from "@tanstack/react-router";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { useToggleWatchlist } from "@/hooks/mutations";
import { logger } from "@/lib/logger";
import { tmdb } from "@/services/tmdb";
import type { ContentItem } from "@/types";

interface SearchResultItemProps {
  item: ContentItem;
}

export function SearchResultItem({ item }: SearchResultItemProps) {
  const { mutate: toggleWatchlist } = useToggleWatchlist();
  const title = item.media_type === "movie" ? item.title : item.name;
  const date =
    item.media_type === "movie" ? item.release_date : item.first_air_date;
  const year = date ? new Date(date).getFullYear() : "—";
  const posterUrl = tmdb.getImageUrl(item.poster_path, "w300");
  const typeLabel = item.media_type === "movie" ? "Filme" : "Série";

  const handleAdd = () => {
    toggleWatchlist(
      { item, action: "add" },
      {
        onSuccess: () => {
          toast.success(`"${title}" adicionado à lista`);
        },
        onError: (err) => {
          logger.error("Error adding to list:", err);
          toast.error("Erro ao adicionar");
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3 border-b border-gray-800 px-1 py-3 transition-colors hover:bg-gray-800/50">
      <Link
        to="/details/$type/$id"
        params={{ type: item.media_type, id: String(item.id) }}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <img
          src={posterUrl}
          alt={title}
          className="h-[72px] w-12 shrink-0 rounded object-cover"
          loading="lazy"
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-white">{title}</span>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
            <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500">
              {typeLabel}
            </span>
            <span>{year}</span>
            {item.vote_average ? (
              <span className="flex items-center gap-0.5 text-yellow-400">
                <Star size={10} fill="currentColor" />
                {item.vote_average.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleAdd}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-500"
        aria-label="Adicionar à lista"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
