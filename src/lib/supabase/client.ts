import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for the browser (login and 2FA screens). Uses the public anon key only. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
