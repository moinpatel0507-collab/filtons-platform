import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Access } from "@/lib/roles";

/**
 * Asks the database what the logged-in person can do (public.my_access()).
 * The database is the single source of truth: the app never decides permissions itself.
 * Returns null when the login isn't linked to a staff record.
 */
export async function getAccess(): Promise<Access | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_access");
  if (error) throw new Error(`Could not load your access: ${error.message}`);
  return (data as Access | null) ?? null;
}

/**
 * Use at the top of every staff page.
 * - Not logged in → /login
 * - Logged in but no staff record or deactivated → /login with a message
 * - Director/Accounts who haven't done 2FA this session → /mfa
 */
export async function requireStaff(): Promise<Access> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const access = await getAccess();
  if (!access) redirect("/login?error=no-staff-record");
  if (!access.is_active) redirect("/login?error=deactivated");
  if (access.requires_mfa && !access.mfa_verified) redirect("/mfa");
  return access;
}

/** Director with 2FA only (staff management, 2FA resets). */
export async function requireDirector(): Promise<Access> {
  const access = await requireStaff();
  if (!access.can_manage_staff) {
    throw new Error("Only a Director (with two-factor authentication) can do this.");
  }
  return access;
}
