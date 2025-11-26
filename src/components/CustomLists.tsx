import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Trash2, Sparkles, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { MagicSearchModal } from './MagicSearchModal';
import { listService } from '../services/listService';
import type { ContentItem } from '../types';

export function CustomLists() {
  const { lists, fetchLists, createList, deleteList } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Magic Search State
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    
    await createList(newListName);
    setNewListName('');
    setIsCreating(false);
  };

  const handleDelete = async () => {
    if (!listToDelete) return;
    try {
      setIsDeleting(true);
      await deleteList(listToDelete);
      toast.success('Lista excluída com sucesso');
      setListToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir lista');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveMagicList = async (name: string, items: ContentItem[]) => {
    try {
      // 1. Create the list
      const newList = await createList(name);
      
      // 2. Add items to the list
      // We do this sequentially to avoid overwhelming the server/rate limits, 
      // but parallel could be faster. Given it's a POC, sequential is safer.
      for (const item of items) {
        await listService.addListItem(newList.id, item);
      }
      
      // 3. Refresh lists
      fetchLists();
    } catch (error) {
      console.error('Error saving magic list:', error);
      throw error; // Propagate to modal to show error toast
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Listas Personalizadas</h2>
        
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/80 transition-colors"
          >
            <Plus size={20} />
            Nova Lista
            <ChevronDown size={16} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-20 overflow-hidden">
              <button
                onClick={() => {
                  setIsCreating(true);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <Plus size={18} />
                Lista Manual
              </button>
              <button
                onClick={() => {
                  setIsMagicModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 flex items-center gap-2 transition-colors border-t border-gray-700"
              >
                <Sparkles size={18} className="text-yellow-400" />
                Lista Inteligente
              </button>
            </div>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="mb-8 bg-gray-800 p-4 rounded-lg">
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nome da Lista"
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/80 transition-colors"
            >
              Criar
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-white px-4 py-2"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => (
          <Link
            key={list.id}
            to={`/lists/${list.id}`}
            className="bg-gray-800 p-4 md:p-6 rounded-lg hover:bg-gray-700 transition-colors group relative"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg md:text-xl font-semibold text-white group-hover:text-primary transition-colors">
                {list.name}
              </h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                list.role === 'owner' ? 'bg-primary/20 text-primary' : 'bg-gray-600 text-gray-300'
              }`}>
                {list.role === 'owner' ? 'Dono' : 'Visualizador'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-xs md:text-sm">
              <Users size={16} />
              <span>Lista Compartilhada</span>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Criado em {new Date(list.created_at).toLocaleDateString()}
            </div>

            {list.role === 'owner' && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setListToDelete(list.id);
                }}
                className="absolute top-4 right-4 p-2 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 text-white z-10"
                title="Excluir Lista"
              >
                <Trash2 size={16} />
              </button>
            )}
          </Link>
        ))}

        {lists.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p>Você ainda não criou nenhuma lista personalizada.</p>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={!!listToDelete}
        onClose={() => setListToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Lista"
        description="Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita e todos os itens da lista serão perdidos."
        isDeleting={isDeleting}
      />

      <MagicSearchModal
        isOpen={isMagicModalOpen}
        onClose={() => setIsMagicModalOpen(false)}
        onSaveList={handleSaveMagicList}
      />
    </div>
  );
}
