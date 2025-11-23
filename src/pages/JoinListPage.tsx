import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listService } from '../services/listService';

export function JoinListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'input' | 'joining' | 'success' | 'error'>('loading');
  const [listName, setListName] = useState<string>('');
  const [memberName, setMemberName] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    
    const fetchListName = async () => {
      try {
        const name = await listService.getListName(id);
        setListName(name);
        setStatus('input');
      } catch (err) {
        console.error(err);
        setStatus('error');
        setError('Failed to load list details.');
      }
    };
    
    fetchListName();
  }, [id]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    setStatus('joining');
    try {
      await listService.joinList(id!, memberName);
      setStatus('success');
      setTimeout(() => {
        navigate(`/lists/${id}`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Failed to join list.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
      {status === 'loading' && (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p>Loading list details...</p>
        </>
      )}

      {status === 'input' && (
        <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-2 text-center">Join List</h1>
          <p className="text-gray-400 text-center mb-6">
            You've been invited to join <span className="text-white font-semibold">"{listName}"</span>
          </p>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-white"
                placeholder="Enter your name"
                required
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              Join List
            </button>
          </form>
        </div>
      )}

      {status === 'joining' && (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p>Joining list...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <p className="text-xl">Successfully joined list!</p>
          <p className="text-gray-400 mt-2">Redirecting...</p>
        </>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">✕</div>
          <p className="text-xl mb-2">Something went wrong</p>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/lists')}
            className="text-primary hover:underline"
          >
            Go to My Lists
          </button>
        </div>
      )}
    </div>
  );
}
