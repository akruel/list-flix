/// <reference types="vite-plugin-pwa/client" />

import type { SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __supabase?: SupabaseClient;
  }
}
