import React, { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Users, Trash2, Sparkles, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { MagicSearchModal } from './MagicSearchModal';
import { listService } from '../services/listService';
import type { ContentItem } from '../types';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export function CustomLists() {
  const { lists, fetchLists, createList, deleteList } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Magic Search State
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

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

  const closeDeleteModal = () => {
    setListToDelete(null);
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

  const closeMagicModal = () => {
    setIsMagicModalOpen(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Listas Personalizadas</h2>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Lista
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Lista Manual
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsMagicModalOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
              Lista Inteligente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isCreating && (
        <Card className="mb-8 bg-card border-border">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="flex gap-4">
              <Input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Nome da Lista"
                className="flex-1"
                autoFocus
              />
              <Button type="submit">
                Criar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreating(false)}
              >
                Cancelar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => (
          <Link
            key={list.id}
            to="/lists/$id"
            params={{ id: list.id }}
            className="block h-full"
          >
            <Card className="h-full hover:bg-accent/50 transition-colors group relative border-border bg-card">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                    {list.name}
                  </CardTitle>
                  <Badge variant={list.role === 'owner' ? 'default' : 'secondary'}>
                    {list.role === 'owner' ? 'Dono' : 'Visualizador'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-muted-foreground text-xs md:text-sm">
                  <Users size={16} />
                  <span>Lista Compartilhada</span>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Criado em {new Date(list.created_at).toLocaleDateString()}
                </div>

                {list.role === 'owner' && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault();
                      setListToDelete(list.id);
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    title="Excluir Lista"
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}

        {lists.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>Você ainda não criou nenhuma lista personalizada.</p>
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={!!listToDelete}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Excluir Lista"
        description="Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita e todos os itens da lista serão perdidos."
        isDeleting={isDeleting}
      />

      <MagicSearchModal
        isOpen={isMagicModalOpen}
        onClose={closeMagicModal}
        onSaveList={handleSaveMagicList}
      />
    </div>
  );
}
