import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { authService } from './services/auth';
import { useStore } from './store/useStore';

// Placeholders for other pages to avoid build errors
import { Search } from './pages/Search';
import { MyList } from './pages/MyList';
import { Details } from './pages/Details';

import { SharedList } from './pages/SharedList';
import { ListsPage } from './pages/ListsPage';
import { ListDetailsPage } from './pages/ListDetailsPage';
import { JoinListPage } from './pages/JoinListPage';

function App() {
  const syncWithSupabase = useStore((state) => state.syncWithSupabase);

  useEffect(() => {
    const init = async () => {
      const userId = await authService.initializeAuth();
      if (userId) {
        await syncWithSupabase();
      }
    };
    init();
  }, [syncWithSupabase]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="my-list" element={<MyList />} />
          <Route path="shared" element={<SharedList />} />
          <Route path="details/:type/:id" element={<Details />} />
          <Route path="lists" element={<ListsPage />} />
          <Route path="lists/:id" element={<ListDetailsPage />} />
          <Route path="lists/:id/join" element={<JoinListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
