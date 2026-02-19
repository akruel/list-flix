import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, matchPath, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { MigrationConflictModal } from './components/MigrationConflictModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { authService } from './services/auth';
import { useStore } from './store/useStore';

import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { MyList } from './pages/MyList';
import { Details } from './pages/Details';
import { SharedList } from './pages/SharedList';
import { JoinListPage } from './pages/JoinListPage';
import { AuthPage } from './pages/AuthPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

function ProtectedRoute({ blocked }: { blocked: boolean }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <FullScreenLoader />;
  }

  if (status === 'none') {
    const isInviteRoute = Boolean(matchPath('/lists/:id/join', location.pathname));
    if (isInviteRoute) {
      authService.savePostLoginTarget(`${location.pathname}${location.search}`);
    }

    return <Navigate to="/auth" replace />;
  }

  if (blocked) {
    return <FullScreenLoader />;
  }

  return <Outlet />;
}

function AppContent() {
  const { status, user } = useAuth();
  const syncWithSupabase = useStore((state) => state.syncWithSupabase);
  const location = useLocation();

  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [isSessionProcessing, setIsSessionProcessing] = useState(false);
  const lastHandledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (status === 'none') {
      setShowMigrationModal(false);
      setIsSessionProcessing(false);
      lastHandledUserIdRef.current = null;
    }
  }, [status]);

  useEffect(() => {
    const isAuthRoute = location.pathname.startsWith('/auth');
    if (isAuthRoute) return;

    if (status !== 'anonymous' && status !== 'authenticated') return;

    const userId = user?.id;
    if (!userId) return;
    if (lastHandledUserIdRef.current === userId) return;

    let cancelled = false;

    const initializeSession = async () => {
      setIsSessionProcessing(true);

      try {
        const finalizeResult = await authService.finalizePostLogin();
        if (cancelled) return;

        if (finalizeResult.migrationConflict) {
          setShowMigrationModal(true);
          return;
        }

        await syncWithSupabase();
        if (cancelled) return;
        lastHandledUserIdRef.current = userId;
      } catch (error) {
        console.error('Session initialization failed:', error);
      } finally {
        if (!cancelled) {
          setIsSessionProcessing(false);
        }
      }
    };

    void initializeSession();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, status, syncWithSupabase, user?.id]);

  const handleKeepLocal = async () => {
    const oldUserId = localStorage.getItem(authService.MIGRATION_OLD_USER_ID_KEY);
    const newUserId = user?.id ?? await authService.getUserId();

    if (oldUserId && newUserId) {
      try {
        await authService.migrateAnonymousData(oldUserId, newUserId);
      } catch (error) {
        console.error('Manual migration failed:', error);
      }
    }

    authService.clearMigrationOldUserId();
    setShowMigrationModal(false);

    try {
      await syncWithSupabase();
      if (newUserId) {
        lastHandledUserIdRef.current = newUserId;
      }
    } catch (error) {
      console.error('Sync after manual migration failed:', error);
    }
  };

  const handleUseAccount = async () => {
    const currentUserId = user?.id ?? await authService.getUserId();

    authService.clearMigrationOldUserId();
    setShowMigrationModal(false);

    try {
      await syncWithSupabase();
      if (currentUserId) {
        lastHandledUserIdRef.current = currentUserId;
      }
    } catch (error) {
      console.error('Sync after selecting account data failed:', error);
    }
  };

  const isProtectedBlocked = isSessionProcessing || showMigrationModal;

  return (
    <>
      <Toaster
        position="top-center"
        expand={false}
        richColors
        closeButton
        toastOptions={{
          style: {
            background: 'rgb(31 41 55)',
            border: '1px solid rgb(55 65 81)',
            color: 'rgb(243 244 246)',
          },
        }}
      />

      <MigrationConflictModal
        isOpen={showMigrationModal}
        onKeepLocal={handleKeepLocal}
        onUseAccount={handleUseAccount}
      />

      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<ProtectedRoute blocked={isProtectedBlocked} />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="lists" element={<MyList />} />
            <Route path="shared" element={<SharedList />} />
            <Route path="details/:type/:id" element={<Details />} />
            <Route path="lists/:id" element={<MyList />} />
            <Route path="lists/:id/join" element={<JoinListPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
