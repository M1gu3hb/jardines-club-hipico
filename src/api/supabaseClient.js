import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // No romper el build; avisar en runtime.
  console.error("[supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
}

// Todo Jardines vive en el schema `jardines` (proyecto compartido con otro sitio).
export const supabase = createClient(url, anonKey, {
  db: { schema: "jardines" },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
