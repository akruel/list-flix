import { useState, useEffect } from 'react';
import type { UserProfile } from '../types';
import { authService } from '../services/auth';
import { UserMenu } from './UserMenu';
import { LogIn, Mail, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export function LoginButton() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const profile = await authService.getUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSendingLink(true);
    try {
      await authService.signInWithOtp(email);
      toast.success('Link de login enviado para seu email!', {
        id: 'login-link-sent',
        duration: 3000,
        closeButton: false,
      });
      setShowEmailInput(false);
      setEmail('');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro ao enviar link de login');
    } finally {
      setSendingLink(false);
    }
  };

  if (loading) {
    return <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse" />;
  }

  if (user && !user.isAnonymous) {
    return <UserMenu user={user} onLogout={loadUser} />;
  }

  if (showEmailInput) {
    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
        <form onSubmit={handleSendLink} className="flex items-center gap-2">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 w-48 sm:w-64"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={sendingLink}
            className="px-4 py-1.5 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sendingLink ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Entrar'
            )}
          </button>
        </form>
        <button
          onClick={() => setShowEmailInput(false)}
          className="p-1.5 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowEmailInput(true)}
      className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
    >
      <LogIn className="w-4 h-4" />
      <span className="hidden sm:inline">Fazer Login</span>
    </button>
  );
}
