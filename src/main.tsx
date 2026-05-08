import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
// Register Service Worker for PWA
import { registerSW } from "virtual:pwa-register";

import App from "./App.tsx";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nova versão disponível! Deseja atualizar?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App pronto para funcionar offline!");
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
