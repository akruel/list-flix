import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { MovieCard } from '../components/MovieCard';
import { Share2, Check, Eye, EyeOff, List } from 'lucide-react';

type FilterType = 'all' | 'watched' | 'unwatched';

export const MyList: React.FC = () => {
  const { myList, isWatched } = useStore();
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const handleShare = () => {
    // For POC: Create a JSON string of IDs and encode it in the URL
    // In a real app, this would save to a DB and return a short ID
    const listData = myList.map(item => ({ id: item.id, type: item.media_type }));

    const encodedData = btoa(JSON.stringify(listData));
    const url = `${window.location.origin}/shared?data=${encodedData}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredList = myList.filter(item => {
    if (filter === 'watched') return isWatched(item.id);
    if (filter === 'unwatched') return !isWatched(item.id);
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Minha Lista</h1>
        {myList.length > 0 && (
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
          >
            {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
            {copied ? 'Link Copiado!' : 'Compartilhar Lista'}
          </button>
        )}
      </div>

      {myList.length > 0 && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              filter === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            <List size={16} />
            Todos ({myList.length})
          </button>
          <button
            onClick={() => setFilter('watched')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              filter === 'watched' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            <Eye size={16} />
            Assistidos ({myList.filter(item => isWatched(item.id)).length})
          </button>
          <button
            onClick={() => setFilter('unwatched')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              filter === 'unwatched' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            <EyeOff size={16} />
            Não Assistidos ({myList.filter(item => !isWatched(item.id)).length})
          </button>
        </div>
      )}

      {filteredList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredList.map((item) => (
            <MovieCard key={item.id} item={item} />
          ))}
        </div>
      ) : myList.length > 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-xl mb-2">Nenhum item nesta categoria</p>
          <p className="text-sm">Tente selecionar outro filtro.</p>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-xl mb-2">Sua lista está vazia</p>
          <p className="text-sm">Adicione filmes e séries para assistir depois.</p>
        </div>
      )}
    </div>
  );
};
