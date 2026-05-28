import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LayoutGrid, List, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CustomLists } from "@/components/CustomLists";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { ListDetailsView } from "@/components/ListDetailsView";
import { MovieCard } from "@/components/MovieCard";
import { Button } from "@/components/ui/button";
import { useToggleWatchlist } from "@/hooks/mutations";
import { logger } from "@/lib/logger";
import { watchingContextBatchQuery } from "@/services/listService.queries";
import { useUserContentStore } from "@/store/useUserContentStore";
import type { ContentItem } from "@/types";

type FilterType = "all" | "watched" | "unwatched";
type TabType = "watchlist" | "custom";

interface MyListScreenProps {
  listId?: string;
  initialTab?: TabType;
}

export function MyListScreen({ listId, initialTab }: MyListScreenProps) {
  const navigate = useNavigate();
  const myList = useUserContentStore((s) => s.myList);
  const watchedIds = useUserContentStore((s) => s.watchedIds);
  const toggleWatchlist = useToggleWatchlist();

  const [filter, setFilter] = useState<FilterType>("all");
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab || (listId ? "custom" : "watchlist"),
  );
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [itemToRemove, setItemToRemove] = useState<ContentItem | null>(null);

  const watchingContextItems = useMemo(
    () =>
      myList.map((item) => ({
        contentId: item.id,
        contentType: item.media_type as "movie" | "tv",
      })),
    [myList],
  );

  const watchingContextResult = useQuery({
    ...watchingContextBatchQuery(watchingContextItems),
    enabled: activeTab === "watchlist" && watchingContextItems.length > 0,
  });
  const watchingContextMap = useMemo(
    () => watchingContextResult.data ?? {},
    [watchingContextResult.data],
  );

  const allMembers = useMemo(() => {
    const names = new Set<string>();
    Object.values(watchingContextMap).forEach((contexts) =>
      contexts?.forEach((c) => {
        c.memberNames?.forEach((n) => {
          if (n) names.add(n);
        });
      }),
    );
    return Array.from(names).sort();
  }, [watchingContextMap]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate({
      to: "/lists",
      search: { tab },
      replace: !listId,
    });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemberFilter(null);
  }, [myList]);

  const handleRemoveFromWatchlist = async () => {
    if (!itemToRemove) return;
    try {
      await toggleWatchlist.mutateAsync({
        item: itemToRemove,
        action: "remove",
      });
      toast.success("Item removido da lista");
      setItemToRemove(null);
    } catch (err) {
      logger.error(err);
      toast.error("Erro ao remover item da lista");
    }
  };

  const watchedIdSet = useMemo(() => new Set(watchedIds), [watchedIds]);
  const watchedCount = myList.filter((item) =>
    watchedIdSet.has(item.id),
  ).length;
  const unwatchedCount = myList.length - watchedCount;

  const filteredList = myList.filter((item) => {
    const isWatched = watchedIdSet.has(item.id);
    if (filter === "watched" && !isWatched) return false;
    if (filter === "unwatched" && isWatched) return false;
    if (memberFilter) {
      const contexts = watchingContextMap[item.id];
      if (!contexts?.some((c) => c.memberNames?.includes(memberFilter)))
        return false;
    }
    return true;
  });

  return (
    <div data-testid="route-lists-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold md:text-3xl">Minhas Listas</h1>
      </div>

      <div className="mb-8 flex gap-4 border-b border-gray-800 pb-1">
        <button
          data-testid="lists-tab-watchlist"
          onClick={() => handleTabChange("watchlist")}
          className={`relative px-2 pb-3 text-sm font-medium transition-colors ${
            activeTab === "watchlist"
              ? "text-purple-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <List size={18} />
            Para Assistir
          </div>
          {activeTab === "watchlist" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-purple-500" />
          )}
        </button>
        <button
          data-testid="lists-tab-custom"
          onClick={() => handleTabChange("custom")}
          className={`relative px-2 pb-3 text-sm font-medium transition-colors ${
            activeTab === "custom"
              ? "text-purple-500"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} />
            Listas Personalizadas
          </div>
          {activeTab === "custom" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-purple-500" />
          )}
        </button>
      </div>

      {activeTab === "watchlist" ? (
        <>
          <div className="mb-6">
            <div className="flex w-full rounded-lg bg-gray-900 p-0.5 md:w-auto">
              <button
                data-testid="lists-filter-all"
                onClick={() => setFilter("all")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-2 py-1.5 text-xs font-medium transition-colors md:gap-2 md:px-4 md:py-2 md:text-sm ${
                  filter === "all"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <List size={14} className="md:size-4" />
                <span className="md:hidden">{myList.length}</span>
                <span className="hidden md:inline">
                  Todos ({myList.length})
                </span>
              </button>
              <button
                data-testid="lists-filter-watched"
                onClick={() => setFilter("watched")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-2 py-1.5 text-xs font-medium transition-colors md:gap-2 md:px-4 md:py-2 md:text-sm ${
                  filter === "watched"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <Eye size={14} className="md:size-4" />
                <span className="md:hidden">{watchedCount}</span>
                <span className="hidden md:inline">
                  Assistidos ({watchedCount})
                </span>
              </button>
              <button
                data-testid="lists-filter-unwatched"
                onClick={() => setFilter("unwatched")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[7px] px-2 py-1.5 text-xs font-medium transition-colors md:gap-2 md:px-4 md:py-2 md:text-sm ${
                  filter === "unwatched"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <EyeOff size={14} className="md:size-4" />
                <span className="md:hidden">{unwatchedCount}</span>
                <span className="hidden md:inline">
                  Não Assistidos ({unwatchedCount})
                </span>
              </button>
            </div>
          </div>

          {allMembers.length > 0 && (
            <div className="mb-6 flex flex-nowrap items-center gap-1.5 overflow-x-auto md:flex-wrap">
              <span className="flex text-gray-500">
                <Users size={14} />
              </span>
              <button
                onClick={() => setMemberFilter(null)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  memberFilter === null
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Todos
              </button>
              {allMembers.map((name) => (
                <button
                  key={name}
                  onClick={() => setMemberFilter(name)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    memberFilter === name
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {filteredList.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredList.map((item) => (
                <div key={item.id} className="group relative">
                  <MovieCard
                    item={item}
                    showProgress={true}
                    watchingWith={watchingContextMap[item.id]}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setItemToRemove(item)}
                    className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                    title="Remover da lista"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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

          <DeleteConfirmationModal
            isOpen={!!itemToRemove}
            onClose={() => setItemToRemove(null)}
            onConfirm={() => {
              void handleRemoveFromWatchlist();
            }}
            title="Remover da lista"
            description={
              itemToRemove
                ? `Tem certeza que deseja remover "${itemToRemove.title || itemToRemove.name || "este item"}" da sua lista?`
                : ""
            }
            isDeleting={toggleWatchlist.isPending}
          />
        </>
      ) : listId ? (
        <ListDetailsView id={listId} />
      ) : (
        <CustomLists />
      )}
    </div>
  );
}
