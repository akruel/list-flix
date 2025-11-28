import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { authService } from './services/auth';
import { useStore } from './store/useStore';
import { MigrationConflictModal } from './components/MigrationConflictModal';

// Placeholders for other pages to avoid build errors
import { Search } from './pages/Search';
import { MyList } from './pages/MyList';
import { Details } from './pages/Details';

import { SharedList } from './pages/SharedList';
import { JoinListPage } from './pages/JoinListPage';

function App() {
  const syncWithSupabase = useStore((state) => state.syncWithSupabase);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const result = await authService.initializeAuth();
      
      if (result && typeof result === 'object' && 'migrationConflict' in result) {
        if (result.migrationConflict) {
          setShowMigrationModal(true);
        } else if (result.userId) {
          await syncWithSupabase();
        }
      } else if (result) {
        // Fallback for any legacy return type or unexpected case
        await syncWithSupabase();
      }
    };
    init();
  }, [syncWithSupabase]);

  const handleKeepLocal = async () => {
    const oldUserId = localStorage.getItem('migration_old_user_id');
    const newUserId = await authService.getUserId();
    
    if (oldUserId && newUserId) {
      try {
        await authService.migrateAnonymousData(oldUserId, newUserId);
      } catch (error) {
        console.error('Manual migration failed:', error);
      }
    }
    
    localStorage.removeItem('migration_old_user_id');
    setShowMigrationModal(false);
    await syncWithSupabase();
  };

  const handleUseAccount = async () => {
    localStorage.removeItem('migration_old_user_id');
    setShowMigrationModal(false);
    await syncWithSupabase();
  };

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
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="lists" element={<MyList />} />
          <Route path="shared" element={<SharedList />} />
          <Route path="details/:type/:id" element={<Details />} />
          <Route path="lists/:id" element={<MyList />} />
          <Route path="lists/:id/join" element={<JoinListPage />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
