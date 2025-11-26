import React, { useState } from 'react';
import { X, Sparkles, Loader2, Save } from 'lucide-react';
import { ai } from '../services/ai';
import { tmdb } from '../services/tmdb';
import type { ContentItem } from '../types';
import { MovieCard } from './MovieCard';
import { toast } from 'sonner';

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

  if (!isOpen) return null;

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const filters = await ai.getSuggestions(prompt);
      setSuggestedName(filters.suggested_list_name || 'Lista Sugerida');
      
      const items = await tmdb.discover(filters);
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
      onClose();
      // Reset state
      setPrompt('');
      setResults([]);
      setStep('input');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar a lista.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-800 shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles size={24} />
            <h2 className="text-xl font-bold text-white">Criar Lista Inteligente</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' ? (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <p className="text-gray-400 mb-6 text-center max-w-md">
                Descreva o que você quer assistir. A IA vai sugerir filmes ou séries baseados no seu pedido.
              </p>
              <form onSubmit={handleSuggest} className="w-full max-w-lg">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Filmes de suspense para assistir no final de semana..."
                  className="w-full bg-gray-800 text-white p-4 rounded-xl border border-gray-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-32 mb-4"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Pensando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Sugerir
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-sm text-gray-400 mb-2">Nome da Lista</label>
                  <input
                    type="text"
                    value={suggestedName}
                    onChange={(e) => setSuggestedName(e.target.value)}
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-primary outline-none"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 whitespace-nowrap"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Salvar Lista
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((item) => (
                  <MovieCard key={item.id} item={item} />
                ))}
              </div>
              
              {results.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  Nenhum resultado encontrado. Tente outro pedido.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
