import { RouterProvider } from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";
import { router } from "./router";

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
        queryClient,
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
