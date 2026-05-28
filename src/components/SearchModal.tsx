import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { tmdb } from "@/services/tmdb";

import { SearchResultItem } from "./SearchResultItem";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebouncedValue(query.trim(), 500);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => tmdb.search(debouncedQuery, { page: 1 }),
    enabled: isOpen && debouncedQuery.length > 0,
    select: (response) => response.results,
  });

  const results = data ?? [];
  const isSearching = debouncedQuery.length > 0 && isFetching;
  const showEmptyState =
    debouncedQuery.length > 0 && !isFetching && results.length === 0;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setQuery("");
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
        <button
          onClick={handleClose}
          aria-label="Fechar busca"
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            ref={inputRef}
            data-testid="search-modal-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar filmes ou séries..."
            className="w-full rounded-xl bg-gray-800 py-3 pl-10 pr-4 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-2">
        {isSearching ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-[72px] w-12 shrink-0 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : showEmptyState ? (
          <p className="py-12 text-center text-sm text-gray-500">
            Nenhum resultado encontrado.
          </p>
        ) : (
          <div>
            {results.map((item) => (
              <SearchResultItem
                key={`${item.media_type}:${item.id}`}
                item={item}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
