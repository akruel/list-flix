import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listService } from '../services/listService';

export function JoinListPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining');

  useEffect(() => {
    if (!id) return;
    joinList();
  }, [id]);

  const joinList = async () => {
    try {
      await listService.joinList(id!);
      setStatus('success');
      setTimeout(() => {
        navigate(`/lists/${id}`);
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white">
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
        <>
          <div className="text-red-500 text-5xl mb-4">✕</div>
          <p className="text-xl">Failed to join list.</p>
          <button 
            onClick={() => navigate('/lists')}
            className="mt-4 text-primary hover:underline"
          >
            Go to My Lists
          </button>
        </>
      )}
    </div>
  );
}
