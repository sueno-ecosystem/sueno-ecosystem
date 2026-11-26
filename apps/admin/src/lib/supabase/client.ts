import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@galene/shared";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return createBrowserClient<Database>(url, anon);
}
