"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDirector } from "@/lib/access";
import { friendlyDbError, generateTempPassword, isRole, validateNewStaff } from "@/lib/roles";

export type ActionResult = { ok: boolean; message: string; tempPassword?: string; email?: string };

const BAN_FOREVER = "876000h"; // 100 years: Supabase's way of blocking a login

/**
 * Add a staff member: creates their login, then their staff record and roles.
 * The staff record is written AS YOU (not with the admin key), so the database
 * itself checks you are a Director with 2FA. If that fails, the new login is removed again.
 */
export async function addStaff(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const checked = validateNewStaff({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    roles: formData.getAll("roles"),
  });
  if (!checked.ok) return { ok: false, message: checked.error };
  const input = checked.value;

  let access;
  try {
    access = await requireDirector();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (createError || !created.user) {
    return { ok: false, message: friendlyDbError(createError?.message ?? "Could not create the login.") };
  }
  const userId = created.user.id;

  const supabase = await createClient();
  const { error: profileError } = await supabase.from("staff_profiles").insert({
    id: userId,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone || null,
    branch_id: access.branch_id,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(userId); // undo: no half-created staff
    return { ok: false, message: friendlyDbError(profileError.message) };
  }

  const { error: rolesError } = await supabase
    .from("staff_roles")
    .insert(input.roles.map((role) => ({ staff_id: userId, role })));
  if (rolesError) {
    // The profile can't be deleted (by design), so deactivate it and block the login.
    await supabase.from("staff_profiles").update({ is_active: false }).eq("id", userId);
    await admin.auth.admin.updateUserById(userId, { ban_duration: BAN_FOREVER });
    return { ok: false, message: `Staff record created but roles failed: ${friendlyDbError(rolesError.message)}. The account was deactivated; reactivate it and add roles.` };
  }

  revalidatePath("/staff");
  return {
    ok: true,
    message: `${input.fullName} added.`,
    tempPassword,
    email: input.email,
  };
}

export async function grantRole(staffId: string, role: string): Promise<ActionResult> {
  if (!isRole(role)) return { ok: false, message: "Unknown role." };
  try {
    await requireDirector();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("staff_roles").insert({ staff_id: staffId, role });
  if (error) return { ok: false, message: friendlyDbError(error.message) };
  revalidatePath("/staff");
  return { ok: true, message: "Role added." };
}

export async function removeRole(staffId: string, role: string): Promise<ActionResult> {
  if (!isRole(role)) return { ok: false, message: "Unknown role." };
  try {
    await requireDirector();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("staff_roles")
    .delete({ count: "exact" })
    .eq("staff_id", staffId)
    .eq("role", role);
  if (error) return { ok: false, message: friendlyDbError(error.message) };
  if (!count) return { ok: false, message: "Nothing was removed. You may not have permission." };
  revalidatePath("/staff");
  return { ok: true, message: "Role removed." };
}

/** Deactivate or reactivate. The database blocks deactivating yourself or the last Director. */
export async function setActive(staffId: string, active: boolean): Promise<ActionResult> {
  try {
    await requireDirector();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_profiles")
    .update({ is_active: active })
    .eq("id", staffId)
    .select("id");
  if (error) return { ok: false, message: friendlyDbError(error.message) };
  if (!data?.length) return { ok: false, message: "Nothing was changed. You may not have permission." };

  // Also block / unblock the login itself, so a deactivated person can't sign in at all.
  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(staffId, {
    ban_duration: active ? "none" : BAN_FOREVER,
  });
  if (banError) {
    return { ok: false, message: `Staff record updated, but the login could not be ${active ? "unblocked" : "blocked"}: ${banError.message}` };
  }
  revalidatePath("/staff");
  return { ok: true, message: active ? "Reactivated." : "Deactivated. Their login is blocked." };
}

/** Remove someone's 2FA so they can set it up again (lost phone). */
export async function resetMfa(staffId: string): Promise<ActionResult> {
  let access;
  try {
    access = await requireDirector();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  if (staffId === access.user_id) {
    return { ok: false, message: "You can't reset your own 2FA here. Ask another Director." };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: staffId });
  if (error) return { ok: false, message: error.message };
  for (const factor of data.factors) {
    const { error: delError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: staffId });
    if (delError) return { ok: false, message: delError.message };
  }
  const supabase = await createClient();
  await supabase.rpc("log_event", {
    p_action: "mfa_reset",
    p_note: "2FA reset by a Director",
    p_details: { staff_id: staffId, factors_removed: data.factors.length },
  });
  revalidatePath("/staff");
  return { ok: true, message: data.factors.length ? "2FA reset. They'll set it up again at next sign in." : "They had no 2FA set up." };
}
