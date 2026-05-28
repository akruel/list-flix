import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  // Use a predicate so we can safely match the configured Supabase URL without
  // building a regex from user-controlled input (lint rule
  // security/detect-non-literal-regexp).
  const supabaseRestPattern = ({ url }: { url: URL }) => {
    if (!url.pathname.startsWith("/rest/v1/")) return false;
    if (supabaseUrl) return url.href.startsWith(`${supabaseUrl}/rest/v1/`);
    return /\.supabase\.(co|in)$/i.test(url.hostname);
  };

  return {
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "apple-touch-icon.png",
          "masked-icon.svg",
        ],
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
          importScripts: ["/sw-push.js"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "tmdb-api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: supabaseRestPattern,
              method: "GET",
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-rest-cache",
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          name: "ListFlix - Seu Guia de Streaming",
          short_name: "ListFlix",
          description: "Encontre onde assistir seus filmes e séries favoritos",
          theme_color: "#111827",
          background_color: "#111827",
          display: "standalone",
          start_url: "/",
          scope: "/",
          orientation: "portrait-primary",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "maskable",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            // Keep React itself isolated without accidentally matching packages like
            // @tanstack/react-router or @radix-ui/react-*.
            if (id.includes("/node_modules/react/")) return "react-vendor";
            if (id.includes("/node_modules/react-dom/")) return "react-vendor";
            if (id.includes("/node_modules/scheduler/")) return "react-vendor";

            if (id.includes("/node_modules/@tanstack/")) return "router-vendor";
            if (id.includes("/node_modules/@supabase/"))
              return "supabase-vendor";
            if (id.includes("/node_modules/@radix-ui/")) return "radix-vendor";
            if (id.includes("/node_modules/lucide-react/"))
              return "icons-vendor";

            return "vendor";
          },
        },
      },
    },
  };
});
