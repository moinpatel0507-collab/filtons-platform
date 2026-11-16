import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for server pages and server actions.
 * It acts AS THE LOGGED-IN STAFF MEMBER, so every database rule
 * (roles, 2FA, row-level security) applies exactly as written.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a server page (read-only cookies). The proxy refreshes
            // the session on the next request, so this is safe to ignore.
          }
        },
      },
    },
  );
}
