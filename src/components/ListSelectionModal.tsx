import React, { useEffect, useState } from 'react';
import { X, Check, Loader2, Lock, Globe } from 'lucide-react';
import { useStore } from '../store/useStore';
import { listService } from '../services/listService';
import type { ContentItem } from '../types';

interface ListSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: ContentItem;
}

export const ListSelectionModal: React.FC<ListSelectionModalProps> = ({ isOpen, onClose, content }) => {
  const { lists, fetchLists, addToList, removeFromList, isInList } = useStore();
  const [loading, setLoading] = useState(false);
  const [membership, setMembership] = useState<Record<string, string>>({}); // listId -> itemId
  const [toggling, setToggling] = useState<Record<string, boolean>>({}); // listId -> boolean

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setLoading(true);
        try {
          await fetchLists();
          const memberMap = await listService.getListsContainingContent(content.id, content.media_type);
          setMembership(memberMap);
        } catch (error) {
          console.error('Error loading lists:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [isOpen, content.id, content.media_type, fetchLists]);

  const handleToggleDefaultList = () => {
    if (isInList(content.id)) {
      removeFromList(content.id);
    } else {
      addToList(content);
    }
  };

  const handleToggleCustomList = async (listId: string) => {
    setToggling(prev => ({ ...prev, [listId]: true }));
    try {
      const itemId = membership[listId];
      if (itemId) {
        // Remove
        await listService.removeListItem(itemId);
        setMembership(prev => {
          const next = { ...prev };
          delete next[listId];
          return next;
        });
      } else {
        // Add
        await listService.addListItem(listId, content);
        // We need to fetch the new item ID or just reload. 
        // Reloading is safer to get the correct ID for future removal.
        const memberMap = await listService.getListsContainingContent(content.id, content.media_type);
        setMembership(memberMap);
      }
    } catch (error) {
      console.error('Error toggling list:', error);
    } finally {
      setToggling(prev => ({ ...prev, [listId]: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 w-full max-w-md rounded-2xl border border-gray-800 shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Salvar em...</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-2 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="space-y-1">
              {/* Default List */}
              <button
                onClick={handleToggleDefaultList}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-800 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-600/20 p-2 rounded-lg text-purple-400">
                    <Lock size={18} />
                  </div>
                  <span className="font-medium text-white">Minha Lista</span>
                </div>
                {isInList(content.id) && (
                  <Check size={20} className="text-purple-500" />
                )}
              </button>

              <div className="h-px bg-gray-800 my-2 mx-3" />

              {/* Custom Lists */}
              {lists.map(list => {
                const isMember = !!membership[list.id];
                const isToggling = toggling[list.id];
                
                return (
                  <button
                    key={list.id}
                    onClick={() => handleToggleCustomList(list.id)}
                    disabled={isToggling}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600/20 p-2 rounded-lg text-blue-400">
                        <Globe size={18} />
                      </div>
                      <div className="text-left">
                        <span className="font-medium text-white block">{list.name}</span>
                        <span className="text-xs text-gray-500 capitalize">{list.role === 'owner' ? 'Dono' : list.role}</span>
                      </div>
                    </div>
                    {isToggling ? (
                      <Loader2 size={20} className="animate-spin text-gray-500" />
                    ) : isMember && (
                      <Check size={20} className="text-blue-500" />
                    )}
                  </button>
                );
              })}
              
              {lists.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Nenhuma lista personalizada encontrada.
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
