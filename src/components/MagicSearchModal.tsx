import { ArrowLeft, Check, Loader2, Save, Sparkles } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

import { ai } from "../services/ai";
import { tmdb } from "../services/tmdb";
import type { ContentItem } from "../types";
import { MovieCard } from "./MovieCard";

interface MagicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveList: (name: string, items: ContentItem[]) => Promise<void>;
}

const EXAMPLE_PROMPTS = [
  "Filmes de suspense para assistir no final de semana",
  "Séries de comédia dos anos 2000",
  "Melhores filmes de ficção científica da última década",
  "Clássicos do cinema dos anos 80",
  "Filmes premiados no Oscar de 2024",
  "Séries de fantasia com mundo novo imersivo",
  "Filmes de animação com histórias profundas",
];

export function MagicSearchModal({
  isOpen,
  onClose,
  onSaveList,
}: MagicSearchModalProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"input" | "results">("input");
  const [suggestedName, setSuggestedName] = useState("");
  const [loadingStep, setLoadingStep] = useState<
    "analyzing" | "searching" | null
  >(null);

  const toggleItem = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      setLoadingStep("analyzing");
      const suggestion = await ai.getSuggestions(prompt);

      setSuggestedName(suggestion.suggested_list_name);
      setLoadingStep("searching");

      const searchPromises = suggestion.items.map(async (item) => {
        return tmdb.findBestMatch(item.title, item.media_type, item.year);
      });

      const rawItems = (await Promise.all(searchPromises)).filter(
        (item): item is ContentItem => !!item,
      );

      const items = Array.from(
        new Map(rawItems.map((item) => [item.id, item])).values(),
      );

      setResults(items);
      setSelectedIds(new Set(items.map((item) => item.id)));
      setStep("results");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao gerar sugestões. Tente novamente.");
    } finally {
      setIsLoading(false);
      setLoadingStep(null);
    }
  };

  const handleBack = () => {
    setStep("input");
    setResults([]);
    setSuggestedName("");
    setSelectedIds(new Set());
  };

  const handleSave = async () => {
    if (!suggestedName.trim()) {
      toast.error("Por favor, dê um nome para a lista.");
      return;
    }

    const selectedItems = results.filter((item) => selectedIds.has(item.id));

    setIsLoading(true);
    try {
      await onSaveList(suggestedName, selectedItems);
      toast.success("Lista criada com sucesso!");
      handleClose();
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao salvar a lista.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleItem(id);
    }
  };

  const handleClose = () => {
    setPrompt("");
    setResults([]);
    setSuggestedName("");
    setStep("input");
    setSelectedIds(new Set());
    setLoadingStep(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        data-testid="magic-list-modal"
        className="flex h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden border-gray-800 bg-gray-900 p-0"
      >
        <DialogHeader className="border-b border-gray-800 p-6">
          <div className="flex items-center gap-2">
            {step === "results" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                data-testid="magic-list-back-button"
                className="h-8 w-8 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <Sparkles className="h-6 w-6 text-primary" />
              Criar Lista Inteligente
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          {step === "input" ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-8">
              <p className="mb-6 max-w-md text-center text-gray-400">
                Descreva o que você quer assistir. A IA vai sugerir filmes ou
                séries baseados no seu pedido.
              </p>
              <form
                onSubmit={handleSuggest}
                className="w-full max-w-lg space-y-4"
                data-testid="magic-list-form"
              >
                <Textarea
                  data-testid="magic-list-prompt-input"
                  value={prompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setPrompt(e.target.value)
                  }
                  placeholder="Ex: Filmes de suspense para assistir no final de semana..."
                  className="h-32 resize-none border-gray-700 bg-gray-800 focus:border-primary"
                />

                <div
                  className="flex flex-wrap gap-2"
                  data-testid="magic-list-example-chips"
                >
                  {EXAMPLE_PROMPTS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setPrompt(example)}
                      className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-primary hover:text-primary"
                    >
                      {example}
                    </button>
                  ))}
                </div>

                <Button
                  data-testid="magic-list-suggest-button"
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {loadingStep === "analyzing"
                        ? "Analisando seu pedido..."
                        : "Buscando no TMDB..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Sugerir
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-1 flex-col">
              <div className="border-b border-gray-800 bg-gray-900/50 p-6">
                <div className="flex flex-col items-end gap-4 md:flex-row">
                  <div className="w-full flex-1 space-y-2">
                    <label
                      htmlFor="magic-list-name-input"
                      className="text-sm text-gray-400"
                    >
                      Nome da Lista
                    </label>
                    <Input
                      id="magic-list-name-input"
                      data-testid="magic-list-name-input"
                      type="text"
                      value={suggestedName}
                      onChange={(e) => setSuggestedName(e.target.value)}
                      className="border-gray-700 bg-gray-800"
                    />
                  </div>

                  <Button
                    data-testid="magic-list-save-button"
                    onClick={handleSave}
                    disabled={isLoading || selectedIds.size === 0}
                    className="whitespace-nowrap"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-5 w-5" />
                    )}
                    Salvar Lista ({selectedIds.size})
                  </Button>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="p-6">
                  <div
                    data-testid="magic-list-results-grid"
                    className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
                  >
                    {results.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          onKeyDown={(e) => handleKeyDown(e, item.id)}
                          role="button"
                          tabIndex={0}
                          data-testid={`magic-item-button-${item.id}`}
                          className={`relative cursor-pointer rounded-lg transition-all ${
                            isSelected
                              ? "opacity-100"
                              : "opacity-60 hover:opacity-80"
                          }`}
                        >
                          {isSelected ? (
                            <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 shadow-lg">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          ) : null}
                          <MovieCard item={item} disableLink />
                        </div>
                      );
                    })}
                  </div>

                  {results.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      Nenhum resultado encontrado. Tente outro pedido.
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
