import { Loader2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { AiSuggestionItem } from "../services/ai";
import { ai } from "../services/ai";
import { useStore } from "../store/useStore";
import type { UserListTagType } from "../types";
import { MovieCard } from "./MovieCard";
import { TagSelector } from "./TagSelector";

interface AiRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "prompt" | "results";

export function AiRecommendationModal({
  isOpen,
  onClose,
}: AiRecommendationModalProps) {
  const [step, setStep] = useState<Step>("prompt");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<AiSuggestionItem[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<UserListTagType[]>([]);
  const [selectedTags, setSelectedTags] = useState<UserListTagType[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { addToListWithTags } = useStore();

  const handleRecommend = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await ai.getSuggestions(prompt);
      setResults(result.items);
      setSuggestedTags(result.suggested_tags);
      setSelectedTags(result.suggested_tags);
      setSelectedIds(new Set(result.items.map((_, i) => i)));
      setStep("results");
    } catch {
      setError("Não foi possível obter recomendações. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleToggleTag = (tag: UserListTagType) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAddToList = () => {
    const selectedItems = results.filter((_, i) => selectedIds.has(i));

    for (const item of selectedItems) {
      addToListWithTags(
        {
          id: 0,
          title: item.title,
          media_type: item.media_type,
          vote_average: 0,
        },
        selectedTags,
      );
    }

    handleClose();
  };

  const handleClose = () => {
    setStep("prompt");
    setPrompt("");
    setLoading(false);
    setError("");
    setResults([]);
    setSuggestedTags([]);
    setSelectedTags([]);
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles size={20} className="text-purple-400" />
            Recomendações com IA
          </DialogTitle>
        </DialogHeader>

        {step === "prompt" && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label htmlFor="ai-prompt" className="text-sm text-gray-400">
                O que você quer assistir?
              </label>
              <textarea
                id="ai-prompt"
                data-testid="ai-prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Filmes de suspense para o final de semana, séries de comédia dos anos 2000..."
                className="min-h-[100px] w-full resize-none rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                disabled={loading}
              />
            </div>

            {error ? (
              <p className="text-sm text-red-400" data-testid="ai-error">
                {error}
              </p>
            ) : null}

            <Button
              data-testid="ai-recommend-button"
              onClick={handleRecommend}
              disabled={loading || !prompt.trim()}
              className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Recomendando...
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  Recomendar
                </>
              )}
            </Button>
          </div>
        )}

        {step === "results" && (
          <div className="space-y-6 py-4">
            <p className="text-sm text-gray-400">
              Selecione os itens que deseja adicionar:
            </p>

            <div className="grid max-h-80 grid-cols-2 gap-4 overflow-y-auto sm:grid-cols-3">
              {results.map((item, index) => {
                const isSelected = selectedIds.has(index);
                return (
                  <button
                    key={index}
                    data-testid={`ai-result-item-${index}`}
                    onClick={() => toggleItem(index)}
                    className={`relative rounded-lg border-2 text-left transition-colors ${
                      isSelected
                        ? "border-purple-500 bg-purple-600/10"
                        : "hover:bg-gray-750 border-transparent bg-gray-800"
                    }`}
                  >
                    {isSelected ? (
                      <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs text-white">
                        <Plus size={14} />
                      </div>
                    ) : null}
                    <MovieCard
                      item={{
                        id: index,
                        title: item.title,
                        name: item.title,
                        media_type: item.media_type,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <div className="border-t border-gray-800 pt-4">
              {suggestedTags.length > 0 && (
                <div className="mb-4">
                  <p className="mb-3 text-sm text-gray-400">Tags sugeridas:</p>
                  <TagSelector
                    selectedTags={selectedTags}
                    onToggle={handleToggleTag}
                    availableTags={suggestedTags}
                  />
                </div>
              )}

              <Button
                data-testid="ai-add-to-list"
                onClick={handleAddToList}
                disabled={selectedIds.size === 0}
                className="w-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                <Plus size={16} className="mr-2" />
                Adicionar à Minha Lista ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
