import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin client using the service_role key. It bypasses every database rule,
 * so it is ONLY used for three login-account jobs Supabase Auth can't do otherwise:
 *   1. create a staff member's login,
 *   2. block / unblock the login of a deactivated staff member,
 *   3. reset someone's 2FA.
 * Every caller must check the person is a Director with 2FA first (see requireDirector).
 * "server-only" makes the build fail if this file is ever imported into browser code.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel → Settings → Environment Variables.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
