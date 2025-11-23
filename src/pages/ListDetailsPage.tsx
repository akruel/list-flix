import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, Trash2 } from 'lucide-react';
import { listService } from '../services/listService';
import { tmdb } from '../services/tmdb';
import type { List, ListItem } from '../types';
import { MovieCard } from '../components/MovieCard';

export function ListDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [list, setList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadList();
  }, [id]);

  const loadList = async () => {
    try {
      setLoading(true);
      const { list, items } = await listService.getListDetails(id!);
      
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
    } catch (err) {
      console.error(err);
      setError('Failed to load list');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!list) return;
    const url = listService.getShareUrl(list.id);
    await navigator.clipboard.writeText(url);
    alert('Share link copied to clipboard!');
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      await listService.removeListItem(itemId);
      setItems(items.filter(i => i.id !== itemId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove item');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl text-red-500 mb-4">{error || 'List not found'}</h1>
        <button
          onClick={() => navigate('/lists')}
          className="text-primary hover:underline"
        >
          Back to Lists
        </button>
      </div>
    );
  }

  const canEdit = list.role === 'owner' || list.role === 'editor';

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{list.name}</h1>
          <p className="text-gray-400 text-sm">
            {items.length} items • {list.role}
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handleShare}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition-colors"
          >
            <Share2 size={20} />
            Share
          </button>
          {/* TODO: Add item button could open a search modal or redirect to search with list context */}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items.map((item) => (
          <div key={item.id} className="relative group">
            {item.content ? (
              <MovieCard item={item.content} />
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 text-center aspect-[2/3] flex items-center justify-center">
                <p className="text-gray-400">Content unavailable</p>
              </div>
            )}
             
             {canEdit && (
               <button
                 onClick={(e) => {
                   e.preventDefault();
                   handleRemoveItem(item.id);
                 }}
                 className="absolute top-2 right-2 bg-red-500/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
               >
                 <Trash2 size={16} className="text-white" />
               </button>
             )}
          </div>
        ))}
      </div>
    </div>
  );
}
