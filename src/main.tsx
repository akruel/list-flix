import "./index.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
// Register Service Worker for PWA
import { registerSW } from "virtual:pwa-register";

import App from "./App.tsx";
import ErrorFallback from "./components/ErrorFallback";
import { logger } from "./lib/logger";
import { queryClient } from "./lib/queryClient";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nova versão disponível! Deseja atualizar?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    logger.info("App pronto para funcionar offline!");
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <App />
        {import.meta.env.DEV ? (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        ) : null}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
