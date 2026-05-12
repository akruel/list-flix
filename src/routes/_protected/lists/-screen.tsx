import { Eye, EyeOff, List, Sparkles, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AiRecommendationModal } from "@/components/AiRecommendationModal";
import { MovieCard } from "@/components/MovieCard";
import { PartnerAddModal } from "@/components/PartnerAddModal";
import { TagFilter } from "@/components/TagFilter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/store/useStore";
import type { UserListTagType } from "@/types";

type FilterType = "all" | "watched" | "unwatched";

export function MyListScreen() {
  const { user } = useAuth();
  const {
    myList,
    isWatched,
    activeTags,
    toggleTag,
    partners,
    availableUsers,
    activePartnerId,
    fetchPartners,
    fetchAvailableUsers,
    setActivePartnerId,
  } = useStore();
  const [filter, setFilter] = useState<FilterType>("all");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  useEffect(() => {
    fetchPartners();
    fetchAvailableUsers();
  }, [fetchPartners, fetchAvailableUsers]);

  const partnerOptions = useMemo(
    () =>
      partners
        .map((p) => {
          const partnerUserId =
            p.user_id === user?.id ? p.partner_user_id : p.user_id;
          const partnerUser = availableUsers.find(
            (u) => u.user_id === partnerUserId,
          );
          return {
            partnerUserId,
            displayName: partnerUser?.display_name ?? "Usuário",
          };
        })
        .filter((p) => p.partnerUserId),
    [partners, availableUsers, user?.id],
  );

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {
      noite_de_pipoca: 0,
      fim_de_semana: 0,
      assistir_com: 0,
    };
    for (const item of myList) {
      if (item.tags) {
        for (const t of item.tags) {
          if (t.tag in counts) counts[t.tag]++;
        }
      }
    }
    return counts as Record<UserListTagType, number>;
  }, [myList]);

  const filteredList = useMemo(() => {
    let items = myList;

    if (activeTags.length > 0) {
      items = items.filter((item) =>
        item.tags?.some((t) => activeTags.includes(t.tag as UserListTagType)),
      );
    }

    if (activePartnerId) {
      items = items.filter((item) =>
        item.tags?.some(
          (t) =>
            t.tag === "assistir_com" && t.partner_user_id === activePartnerId,
        ),
      );
    }

    if (filter === "watched")
      return items.filter((item) => isWatched(item.tmdb_id));
    if (filter === "unwatched")
      return items.filter((item) => !isWatched(item.tmdb_id));
    return items;
  }, [myList, activeTags, activePartnerId, filter, isWatched]);

  const handlePartnerChange = useCallback(
    (partnerId: string | null) => {
      setActivePartnerId(partnerId);
    },
    [setActivePartnerId],
  );

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
        <button
          data-testid="open-partner-modal"
          onClick={() => setShowPartnerModal(true)}
          className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 md:text-sm"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Parceiros</span>
        </button>
      </div>

      <div className="mb-6 space-y-4">
        <TagFilter
          activeTags={activeTags}
          onToggle={toggleTag}
          counts={tagCounts}
          partnerOptions={partnerOptions}
          activePartnerId={activePartnerId}
          onPartnerChange={handlePartnerChange}
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
      <PartnerAddModal
        isOpen={showPartnerModal}
        onClose={() => setShowPartnerModal(false)}
      />
    </div>
  );
}
