import { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { router } from './router';

function AppRouter() {
  const { status, user } = useAuth();

  useEffect(() => {
    void router.invalidate();
  }, [status, user?.id]);

  return (
    <RouterProvider
      router={router}
      context={{
        auth: {
          status,
          user,
        },
      }}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
