import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

import { MovieCard } from '../components/MovieCard';
import { CustomLists } from '../components/CustomLists';
import { ListDetailsView } from '../components/ListDetailsView';
import { List, LayoutGrid, Eye, EyeOff } from 'lucide-react';


type FilterType = 'all' | 'watched' | 'unwatched';
type TabType = 'watchlist' | 'custom';

export const MyList: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { myList, isWatched } = useStore();
  
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<TabType>(id ? 'custom' : 'watchlist');

  

  useEffect(() => {
    if (id) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('custom');
    }
  }, [id]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (id) {
      navigate('/lists');
    }
  };

  const filteredList = myList.filter(item => {
    if (filter === 'watched') return isWatched(item.id);
    if (filter === 'unwatched') return !isWatched(item.id);
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Minhas Listas</h1>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-800 pb-1">
        <button
          onClick={() => handleTabChange('watchlist')}
          className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'watchlist' ? 'text-purple-500' : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <List size={18} />
            Para Assistir
          </div>
          {activeTab === 'watchlist' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => handleTabChange('custom')}
          className={`pb-3 px-2 text-sm font-medium transition-colors relative ${
            activeTab === 'custom' ? 'text-purple-500' : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid size={18} />
            Listas Personalizadas
          </div>
          {activeTab === 'custom' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-t-full" />
          )}
        </button>
      </div>

      {activeTab === 'watchlist' ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm font-medium ${
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
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm font-medium ${
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
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg transition-colors text-xs md:text-sm font-medium ${
                  filter === 'unwatched' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                <EyeOff size={16} />
                Não Assistidos ({myList.filter(item => !isWatched(item.id)).length})
              </button>
            </div>

          </div>

          {filteredList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredList.map((item) => (
                <MovieCard key={item.id} item={item} showProgress={true} />
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
        </>
      ) : (
        id ? <ListDetailsView id={id} /> : <CustomLists />
      )}
    </div>
  );
};
