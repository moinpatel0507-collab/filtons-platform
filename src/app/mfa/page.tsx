import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import MfaForm from "./mfa-form";

/**
 * Two-factor step after sign in.
 * - Roles that need 2FA (Director, Accounts): must enter a code every session.
 * - Other roles go straight through (they can still choose to set it up later).
 */
export default async function MfaPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const access = await getAccess();
  if (!access) redirect("/login?error=no-staff-record");
  if (!access.is_active) redirect("/login?error=deactivated");
  if (!access.requires_mfa || access.mfa_verified) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-slate-500">
            Required for Director and Accounts logins, because they can move client money.
          </p>
        </div>
        <div className="card">
          <MfaForm />
        </div>
      </div>
    </main>
  );
}
