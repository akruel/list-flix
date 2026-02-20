import React, { useEffect, useState } from 'react';
import { Check, Loader2, Lock, Globe } from 'lucide-react';
import { useStore } from '../store/useStore';
import { listService } from '../services/listService';
import type { ContentItem } from '../types';
import { ListSelectionModalSkeleton } from './skeletons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Salvar em...</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <ListSelectionModalSkeleton />
          ) : (
            <div className="space-y-1">
              {/* Default List */}
              <Button
                data-testid="list-selection-default"
                variant="ghost"
                onClick={handleToggleDefaultList}
                className="w-full justify-between h-auto py-3 px-3 hover:bg-gray-800"
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
              </Button>

              <div className="h-px bg-gray-800 my-2 mx-3" />

              {/* Custom Lists */}
              {lists
                .filter(list => list.role === 'owner' || list.role === 'editor')
                .map(list => {
                  const isMember = !!membership[list.id];
                  const isToggling = toggling[list.id];
                  
                  return (
                  <Button
                    key={list.id}
                    variant="ghost"
                    onClick={() => handleToggleCustomList(list.id)}
                    disabled={isToggling}
                    className="w-full justify-between h-auto py-3 px-3 hover:bg-gray-800"
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
                  </Button>
                );
              })}
              
              {lists.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Nenhuma lista personalizada encontrada.
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        <div className="pt-4 border-t border-gray-800">
          <Button 
            data-testid="list-selection-done"
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            Concluído
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
