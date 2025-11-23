import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { useStore } from '../store/useStore';

export function ListsPage() {
  const { lists, fetchLists, createList } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState('');

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

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">My Lists</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/80 transition-colors"
        >
          <Plus size={20} />
          New List
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 bg-gray-800 p-4 rounded-lg">
          <form onSubmit={handleCreate} className="flex gap-4">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List Name"
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button
              type="submit"
              className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/80 transition-colors"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-gray-400 hover:text-white px-4 py-2"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lists.map((list) => (
          <Link
            key={list.id}
            to={`/lists/${list.id}`}
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors group"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-white group-hover:text-primary transition-colors">
                {list.name}
              </h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                list.role === 'owner' ? 'bg-primary/20 text-primary' : 'bg-gray-600 text-gray-300'
              }`}>
                {list.role}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Users size={16} />
              <span>Shared List</span>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Created {new Date(list.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}

        {lists.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p>You haven't created any lists yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
