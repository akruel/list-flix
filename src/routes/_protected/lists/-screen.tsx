import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LayoutGrid, List } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CustomLists } from "@/components/CustomLists";
import { ListDetailsView } from "@/components/ListDetailsView";
import { MovieCard } from "@/components/MovieCard";
import { logger } from "@/lib/logger";
import { listService } from "@/services/listService";
import { useStore } from "@/store/useStore";
import type { WatchingContext } from "@/types";

type FilterType = "all" | "watched" | "unwatched";
type TabType = "watchlist" | "custom";

interface MyListScreenProps {
  listId?: string;
}

export function MyListScreen({ listId }: MyListScreenProps) {
  const navigate = useNavigate();
  const { myList, isWatched } = useStore();

  const [filter, setFilter] = useState<FilterType>("all");
  const [activeTab, setActiveTab] = useState<TabType>(
    listId ? "custom" : "watchlist",
  );
  const [watchingContextMap, setWatchingContextMap] = useState<
    Record<number, WatchingContext[]>
  >({});
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const allMembers = useMemo(() => {
    const names = new Set<string>();
    Object.values(watchingContextMap).forEach((contexts) =>
      contexts.forEach((c) => c.memberNames.forEach((n) => names.add(n))),
    );
    return Array.from(names).sort();
  }, [watchingContextMap]);

  useEffect(() => {
    if (listId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab("custom");
    }
  }, [listId]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (listId) {
      navigate({ to: "/lists" });
    }
  };

  // Fetch watching contexts for all watchlist items
  useEffect(() => {
    if (activeTab !== "watchlist" || myList.length === 0) return;

    let cancelled = false;

    const fetchContexts = async () => {
      const items = myList.map((item) => ({
        contentId: item.id,
        contentType: item.media_type as "movie" | "tv",
      }));

      const map = await listService
        .getWatchingContextBatch(items)
        .catch(() => ({}) as Record<number, WatchingContext[]>);

      if (cancelled) return;
      setWatchingContextMap(map);
    };

    fetchContexts().catch((err) =>
      logger.error("Error fetching watching contexts:", err),
    );

    return () => {
      cancelled = true;
    };
  }, [activeTab, myList]);

  // Reset member filter when watchlist changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemberFilter(null);
  }, [myList]);

  const filteredList = myList.filter((item) => {
    if (filter === "watched" && !isWatched(item.id)) return false;
    if (filter === "unwatched" && isWatched(item.id)) return false;
    if (memberFilter) {
      const contexts = watchingContextMap[item.id];
      if (!contexts?.some((c) => c.memberNames.includes(memberFilter)))
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
            <div className="flex w-full flex-nowrap gap-1 md:flex-wrap md:gap-2">
              <button
                data-testid="lists-filter-all"
                onClick={() => setFilter("all")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors md:flex-initial md:px-4 md:text-sm ${
                  filter === "all"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <List size={16} className="hidden md:inline" />
                Todos ({myList.length})
              </button>
              <button
                data-testid="lists-filter-watched"
                onClick={() => setFilter("watched")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors md:flex-initial md:px-4 md:text-sm ${
                  filter === "watched"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <Eye size={16} className="hidden md:inline" />
                Assistidos ({myList.filter((item) => isWatched(item.id)).length}
                )
              </button>
              <button
                data-testid="lists-filter-unwatched"
                onClick={() => setFilter("unwatched")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors md:flex-initial md:px-4 md:text-sm ${
                  filter === "unwatched"
                    ? "bg-orange-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <EyeOff size={16} className="hidden md:inline" />
                Não Assistidos (
                {myList.filter((item) => !isWatched(item.id)).length})
              </button>
            </div>
          </div>

          {allMembers.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs text-gray-500">
                Assistindo com:
              </span>
              <button
                onClick={() => setMemberFilter(null)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
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
                <MovieCard
                  key={item.id}
                  item={item}
                  showProgress={true}
                  watchingWith={watchingContextMap[item.id]}
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
        </>
      ) : listId ? (
        <ListDetailsView id={listId} />
      ) : (
        <CustomLists />
      )}
    </div>
  );
}
