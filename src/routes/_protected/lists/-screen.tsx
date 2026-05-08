import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";

import { CustomLists } from "@/components/CustomLists";
import { ListDetailsView } from "@/components/ListDetailsView";
import { MovieCard } from "@/components/MovieCard";
import { useStore } from "@/store/useStore";

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

  const filteredList = myList.filter((item) => {
    if (filter === "watched") return isWatched(item.id);
    if (filter === "unwatched") return !isWatched(item.id);
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
          <div className="mb-6 flex items-center justify-between">
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
                Todos ({myList.length})
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
                Assistidos ({myList.filter((item) => isWatched(item.id)).length}
                )
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
                {myList.filter((item) => !isWatched(item.id)).length})
              </button>
            </div>
          </div>

          {filteredList.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredList.map((item) => (
                <MovieCard key={item.id} item={item} showProgress={true} />
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
