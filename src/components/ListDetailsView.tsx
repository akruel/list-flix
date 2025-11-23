import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Share2, Trash2, Users, ArrowLeft, Check } from 'lucide-react';
import { listService } from '../services/listService';
import { tmdb } from '../services/tmdb';
import type { List, ListItem, ListMember } from '../types';
import { MovieCard } from './MovieCard';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

interface ListDetailsViewProps {
  id: string;
}

const ListDetailsSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex justify-between items-start mb-8">
      <div className="w-full">
        <div className="h-10 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-5 bg-gray-800 rounded w-1/4 mb-4"></div>
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-gray-800 rounded-full"></div>
          <div className="h-6 w-20 bg-gray-800 rounded-full"></div>
        </div>
      </div>
      <div className="h-10 w-32 bg-gray-800 rounded"></div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="aspect-[2/3] bg-gray-800 rounded-lg"></div>
      ))}
    </div>
  </div>
);

export function ListDetailsView({ id }: ListDetailsViewProps) {
  const navigate = useNavigate();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setShowShareMenu(false);
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
        <h2 className="text-2xl text-red-500 mb-4">{error || 'List not found'}</h2>
        <button
          onClick={() => navigate('/lists')}
          className="text-primary hover:underline flex items-center justify-center gap-2 mx-auto"
        >
          <ArrowLeft size={20} />
          Voltar para minhas listas
        </button>
      </div>
    );
  }

  const canEdit = list.role === 'owner' || list.role === 'editor';

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/lists')}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
          title="Voltar"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-2">{list.name}</h1>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{items.length} items</span>
              <span>•</span>
              <span className="capitalize">
                {list.role === 'owner' ? 'Dono' : list.role === 'editor' ? 'Editor' : 'Visualizador'}
              </span>
            </div>
            
            {/* Members List */}
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users size={16} className="text-gray-400" />
              <div className="flex flex-wrap gap-2">
                {members.map(member => (
                  <span 
                    key={member.user_id} 
                    className={`px-2 py-1 rounded-full text-xs border flex items-center gap-1 ${
                      member.role === 'owner' 
                        ? 'bg-yellow-600/20 border-yellow-500/50 text-yellow-400' 
                        : member.role === 'editor'
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                        : 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                    }`}
                    title={`Role: ${member.role}`}
                  >
                    {member.member_name || 'Anonymous'}
                    {member.role === 'owner' && <span>★</span>}
                    {member.role === 'editor' && <span>✏️</span>}
                    {member.role === 'viewer' && <span>👁️</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
          {/* Share Button with Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {copied ? <Check size={20} className="text-white" /> : <Share2 size={20} />}
              {copied ? 'Copiado!' : 'Compartilhar'}
            </button>
            
            {/* Dropdown Menu */}
            {showShareMenu && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowShareMenu(false)}
                />
                
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden z-20">
                  <button
                    onClick={() => handleShare('editor')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3 border-b border-gray-700"
                  >
                    <span className="text-2xl">✏️</span>
                    <div className="flex-1">
                      <div className="text-white font-medium">Compartilhar como Editor</div>
                      <div className="text-xs text-gray-400">Poderá adicionar e remover itens</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleShare('viewer')}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors flex items-center gap-3"
                  >
                    <span className="text-2xl">👁️</span>
                    <div className="flex-1">
                      <div className="text-white font-medium">Compartilhar como Visualizador</div>
                      <div className="text-xs text-gray-400">Acesso somente leitura</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {list.role === 'owner' && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-red-500/20"
              title="Excluir Lista"
            >
              <Trash2 size={20} />
              Excluir
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            {item.content ? (
              <MovieCard item={item.content} />
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 text-center aspect-[2/3] flex items-center justify-center">
                <p className="text-gray-400">Conteúdo indisponível</p>
              </div>
            )}
             
             {canEdit && (
               <button
                 onClick={(e) => {
                   e.preventDefault();
                   handleRemoveItem(item.id);
                 }}
                 className="absolute top-2 right-2 bg-red-500/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                 title="Remover item"
               >
                 <Trash2 size={16} className="text-white" />
               </button>
             )}
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-500">
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
