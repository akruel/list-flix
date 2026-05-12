import { Eye, EyeOff, List, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { AiRecommendationModal } from "@/components/AiRecommendationModal";
import { MovieCard } from "@/components/MovieCard";
import { TagFilter } from "@/components/TagFilter";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import type { UserListTagType } from "@/types";

type FilterType = "all" | "watched" | "unwatched";

export function MyListScreen() {
  const { myList, isWatched, activeTags, toggleTag } = useStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const tagCounts = useMemo(() => {
    const counts: Record<UserListTagType, number> = {
      noite_de_pipoca: 0,
      fim_de_semana: 0,
    };
    for (const item of myList) {
      if (item.tags) {
        for (const t of item.tags) {
          if (t.tag in counts) counts[t.tag as UserListTagType]++;
        }
      }
    }
    return counts;
  }, [myList]);

  const filteredList = useMemo(() => {
    let items = myList;

    if (activeTags.length > 0) {
      items = items.filter((item) =>
        item.tags?.some((t) => activeTags.includes(t.tag as UserListTagType)),
      );
    }

    if (filter === "watched")
      return items.filter((item) => isWatched(item.tmdb_id));
    if (filter === "unwatched")
      return items.filter((item) => !isWatched(item.tmdb_id));
    return items;
  }, [myList, activeTags, filter, isWatched]);

  return (
    <div data-testid="route-lists-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">Minha Lista</h1>
        <Button
          data-testid="ai-recommendations-button"
          onClick={() => setAiModalOpen(true)}
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          <Sparkles size={16} className="mr-2" />
          IA
        </Button>
      </div>

      <div className="mb-6 space-y-4">
        <TagFilter
          activeTags={activeTags}
          onToggle={toggleTag}
          counts={tagCounts}
        />

        <div className="flex flex-wrap gap-2">
          <button
            data-testid="lists-filter-all"
            onClick={() => setFilter("all")}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:px-4 md:text-sm ${
              filter === "all"
                ? "bg-purple-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <List size={16} />
            Todos ({filteredList.length})
          </button>
          <button
            data-testid="lists-filter-watched"
            onClick={() => setFilter("watched")}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:px-4 md:text-sm ${
              filter === "watched"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Eye size={16} />
            Assistidos (
            {myList.filter((item) => isWatched(item.tmdb_id)).length})
          </button>
          <button
            data-testid="lists-filter-unwatched"
            onClick={() => setFilter("unwatched")}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors md:px-4 md:text-sm ${
              filter === "unwatched"
                ? "bg-orange-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <EyeOff size={16} />
            Não Assistidos (
            {myList.filter((item) => !isWatched(item.tmdb_id)).length})
          </button>
        </div>
      </div>

      {filteredList.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredList.map((item) => (
            <MovieCard
              key={item.tmdb_id}
              item={{
                id: item.tmdb_id,
                media_type: item.media_type,
                title: item.title,
                name: item.name,
                poster_path: item.poster_path,
                backdrop_path: item.backdrop_path,
                vote_average: item.vote_average,
                release_date: item.release_date,
                first_air_date: item.first_air_date,
                overview: item.overview,
              }}
              showProgress={true}
              tags={item.tags}
            />
          ))}
        </div>
      ) : myList.length > 0 ? (
        <div className="py-20 text-center text-gray-500">
          <p className="mb-2 text-xl">Nenhum item nesta categoria</p>
          <p className="text-sm">Tente selecionar outro filtro.</p>
        </div>
      ) : (
        <div className="py-20 text-center text-gray-500">
          <p className="mb-2 text-xl">Sua lista está vazia</p>
          <p className="text-sm">
            Adicione filmes e séries para assistir depois.
          </p>
        </div>
      )}

      <AiRecommendationModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
      />
    </div>
  );
}
