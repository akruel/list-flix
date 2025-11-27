import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Trash2, Users, ArrowLeft, Check, Pencil, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { listService } from '../services/listService';
import { tmdb } from '../services/tmdb';
import type { List, ListItem, ListMember } from '../types';
import { MovieCard } from './MovieCard';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface ListDetailsViewProps {
  id: string;
}

const ListDetailsSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="flex justify-between items-start">
      <div className="space-y-4 w-full max-w-lg">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} className="aspect-[2/3] rounded-xl" />
      ))}
    </div>
  </div>
);

export function ListDetailsView({ id }: ListDetailsViewProps) {
  const navigate = useNavigate();
  const { updateList } = useStore();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (!id) return;
    
    const loadList = async () => {
      try {
        setLoading(true);
        const { list, items, members } = await listService.getListDetails(id);
        
        // Fetch content details for each item
        const itemsWithContent = await Promise.all(items.map(async (item) => {
          try {
            const details = await tmdb.getDetails(item.content_id, item.content_type);
            return { ...item, content: details };
          } catch (e) {
            console.error(`Failed to fetch details for item ${item.id}`, e);
            return item;
          }
        }));

        setList(list);
        setItems(itemsWithContent);
        setMembers(members);
      } catch (err) {
        console.error(err);
        setError('Failed to load list');
      } finally {
        setLoading(false);
      }
    };
    
    loadList();
  }, [id]);

  const handleShare = async (role: 'editor' | 'viewer') => {
    if (!list) return;
    const url = listService.getShareUrl(list.id, role);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      await listService.removeListItem(itemId);
      setItems(items.filter(i => i.id !== itemId));
    } catch (err) {
      console.error(err);
      toast.error('Falha ao remover item');
    }
  };

  const startEditing = () => {
    if (!list) return;
    setIsEditing(true);
    setEditingName(list.name);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingName('');
  };

  const saveEditing = async () => {
    if (!list || !editingName.trim()) return;

    try {
      await updateList(list.id, editingName);
      setList({ ...list, name: editingName });
      toast.success('Nome da lista atualizado');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar nome da lista');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleDeleteList = async () => {
    if (!list) return;
    try {
      setIsDeleting(true);
      await listService.deleteList(list.id);
      toast.success('Lista excluída com sucesso');
      navigate('/lists');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir lista');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <ListDetailsSkeleton />;
  }

  if (error || !list) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl text-destructive mb-4">{error || 'List not found'}</h2>
        <Button
          variant="link"
          onClick={() => navigate('/lists')}
          className="mx-auto"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para minhas listas
        </Button>
      </div>
    );
  }

  const canEdit = list.role === 'owner' || list.role === 'editor';

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-start gap-4 mb-8">
        <div className="flex items-start gap-4 w-full md:w-auto flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/lists')}
            title="Voltar"
            className="mt-1 shrink-0"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex flex-col gap-2 mb-2">
                <Input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="text-2xl md:text-3xl font-bold h-auto py-1 px-3 w-full"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={saveEditing}
                    className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                  >
                    <Check className="h-4 w-4 mr-1" /> Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEditing}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 mb-2 group">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground break-words">{list.name}</h1>
                {list.role === 'owner' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startEditing}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0"
                    title="Editar nome"
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{items.length} items</span>
                <span>•</span>
                <span className="capitalize">
                  {list.role === 'owner' ? 'Dono' : list.role === 'editor' ? 'Editor' : 'Visualizador'}
                </span>
              </div>
              
              {/* Members List */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users size={16} className="shrink-0" />
                <div className="flex flex-wrap gap-2">
                  {members.map(member => (
                    <Badge 
                      key={member.user_id} 
                      variant="outline"
                      className={`gap-1 ${
                        member.role === 'owner' 
                          ? 'border-yellow-500/50 text-yellow-500' 
                          : member.role === 'editor'
                          ? 'border-purple-500/50 text-purple-500'
                          : 'border-blue-500/50 text-blue-500'
                      }`}
                      title={`Role: ${member.role}`}
                    >
                      {member.member_name || 'Anonymous'}
                      {member.role === 'owner' && <span>★</span>}
                      {member.role === 'editor' && <span>✏️</span>}
                      {member.role === 'viewer' && <span>👁️</span>}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto pl-[3.25rem] md:pl-0 mt-2 md:mt-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white flex-1 md:flex-none">
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
                {copied ? 'Copiado!' : 'Compartilhar'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onClick={() => handleShare('editor')} className="gap-3 py-3 cursor-pointer">
                <span className="text-xl">✏️</span>
                <div>
                  <div className="font-medium">Compartilhar como Editor</div>
                  <div className="text-xs text-muted-foreground">Poderá adicionar e remover itens</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleShare('viewer')} className="gap-3 py-3 cursor-pointer">
                <span className="text-xl">👁️</span>
                <div>
                  <div className="font-medium">Compartilhar como Visualizador</div>
                  <div className="text-xs text-muted-foreground">Acesso somente leitura</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {list.role === 'owner' && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              title="Excluir Lista"
              className="flex-1 md:flex-none"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            {item.content ? (
              <MovieCard item={item.content} showProgress={true} />
            ) : (
              <div className="bg-muted rounded-lg p-4 text-center aspect-[2/3] flex items-center justify-center">
                <p className="text-muted-foreground">Conteúdo indisponível</p>
              </div>
            )}
             
             {canEdit && (
               <Button
                 variant="destructive"
                 size="icon"
                 onClick={(e) => {
                   e.preventDefault();
                   handleRemoveItem(item.id);
                 }}
                 className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                 title="Remover item"
               >
                 <Trash2 className="h-4 w-4" />
               </Button>
             )}
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="col-span-full text-center py-20 text-muted-foreground">
            <p className="text-xl mb-2">Esta lista está vazia</p>
            {canEdit && <p className="text-sm">Adicione filmes e séries para começar.</p>}
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteList}
        title="Excluir Lista"
        description="Tem certeza que deseja excluir esta lista? Esta ação não pode ser desfeita e todos os itens da lista serão perdidos."
        isDeleting={isDeleting}
      />
    </div>
  );
}
