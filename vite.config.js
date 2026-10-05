import { defineConfig } from "vite";

export default defineConfig({
  // Vercel's Supabase Marketplace integration exposes these browser-safe
  // variables with NEXT_PUBLIC_ names. Never expose SUPABASE_SECRET_KEY.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
});
