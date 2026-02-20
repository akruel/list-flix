import React, { useState } from 'react';
import { Sparkles, Loader2, Save } from 'lucide-react';
import { ai } from '../services/ai';
import { tmdb } from '../services/tmdb';
import type { ContentItem } from '../types';
import { MovieCard } from './MovieCard';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MagicSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveList: (name: string, items: ContentItem[]) => Promise<void>;
}

export function MagicSearchModal({ isOpen, onClose, onSaveList }: MagicSearchModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ContentItem[]>([]);
  const [suggestedName, setSuggestedName] = useState('');
  const [step, setStep] = useState<'input' | 'results'>('input');

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const filters = await ai.getSuggestions(prompt);
      setSuggestedName(filters.suggested_list_name || 'Lista Sugerida');

      let items: ContentItem[] = [];

      if (filters.strategy === 'search' && filters.query) {
        items = await tmdb.search(filters.query);
      } else if (filters.strategy === 'person' && filters.person_name && filters.role) {
        // Find person ID
        const personId = await tmdb.searchPerson(filters.person_name);
        if (personId) {
          const discoverFilters = {
            ...filters,
            // TMDB discover uses with_cast for actors and with_crew for directors
            ...(filters.role === 'cast' ? { with_cast: personId } : { with_crew: personId })
          };
          items = await tmdb.discover(discoverFilters);
        } else {
          toast.error('Pessoa não encontrada. Tente outro nome.');
        }
      } else {
        items = await tmdb.discover(filters);
      }

      setResults(items);
      setStep('results');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar sugestões. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!suggestedName.trim()) {
      toast.error('Por favor, dê um nome para a lista.');
      return;
    }
    
    setIsLoading(true);
    try {
      await onSaveList(suggestedName, results);
      toast.success('Lista criada com sucesso!');
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar a lista.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPrompt('');
    setResults([]);
    setSuggestedName('');
    setStep('input');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        data-testid="magic-list-modal"
        className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 bg-gray-900 border-gray-800"
      >
        <DialogHeader className="p-6 border-b border-gray-800">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <Sparkles className="h-6 w-6 text-primary" />
            Criar Lista Inteligente
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 'input' ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-6">
              <p className="text-gray-400 mb-6 text-center max-w-md">
                Descreva o que você quer assistir. A IA vai sugerir filmes ou séries baseados no seu pedido.
              </p>
              <form onSubmit={handleSuggest} className="w-full max-w-lg space-y-4">
                <Textarea
                  data-testid="magic-list-prompt-input"
                  value={prompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                  placeholder="Ex: Filmes de suspense para assistir no final de semana..."
                  className="h-32 resize-none bg-gray-800 border-gray-700 focus:border-primary"
                  autoFocus
                />
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
                      Pensando...
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
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-gray-800 bg-gray-900/50">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full space-y-2">
                    <label className="text-sm text-gray-400">Nome da Lista</label>
                    <Input
                      data-testid="magic-list-name-input"
                      type="text"
                      value={suggestedName}
                      onChange={(e) => setSuggestedName(e.target.value)}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                  <Button
                    data-testid="magic-list-save-button"
                    onClick={handleSave}
                    disabled={isLoading}
                    className="whitespace-nowrap"
                  >
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Salvar Lista
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div data-testid="magic-list-results-grid" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.map((item) => (
                    <MovieCard key={item.id} item={item} />
                  ))}
                </div>
                
                {results.length === 0 && (
                  <div className="text-center text-gray-500 py-12">
                    Nenhum resultado encontrado. Tente outro pedido.
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
