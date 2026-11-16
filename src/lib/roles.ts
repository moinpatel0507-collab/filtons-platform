/**
 * Plain helpers with no server or browser dependencies, so they can be unit tested.
 */

export const ROLES = ["director", "accounts", "property_manager", "negotiator"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  director: "Director",
  accounts: "Accounts",
  property_manager: "Property Manager",
  negotiator: "Negotiator",
};

/** Shape returned by public.my_access() in the database. */
export type Access = {
  user_id: string;
  full_name: string;
  email: string;
  branch_id: string;
  branch_name: string;
  is_active: boolean;
  roles: Role[];
  requires_mfa: boolean;
  mfa_verified: boolean;
  can_manage_staff: boolean;
  can_approve_payments: boolean;
  can_post_ledger: boolean;
  can_view_client_money: boolean;
  can_view_audit: boolean;
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function roleLabel(role: string): string {
  return isRole(role) ? ROLE_LABELS[role] : role;
}

/** Director and Accounts must use 2FA (same rule as private.requires_mfa() in the database). */
export function roleNeedsMfa(roles: readonly string[]): boolean {
  return roles.includes("director") || roles.includes("accounts");
}

export type NewStaffInput = {
  fullName: string;
  email: string;
  phone: string;
  roles: Role[];
};

export type ValidationResult =
  | { ok: true; value: NewStaffInput }
  | { ok: false; error: string };

/** Checks the "Add staff member" form before anything is created. */
export function validateNewStaff(input: {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  roles?: unknown;
}): ValidationResult {
  const fullName = typeof input.fullName === "string" ? input.fullName.trim().replace(/\s+/g, " ") : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const rawRoles = Array.isArray(input.roles) ? input.roles : [];

  if (fullName.length < 2) return { ok: false, error: "Enter the person's full name." };
  if (fullName.length > 120) return { ok: false, error: "Name is too long." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (phone && !/^[0-9+()\s-]{7,20}$/.test(phone)) return { ok: false, error: "Phone number doesn't look right." };

  if (!rawRoles.every(isRole)) return { ok: false, error: "Unknown role selected." };
  const roles = Array.from(new Set(rawRoles as Role[]));
  if (roles.length === 0) return { ok: false, error: "Choose at least one role." };

  return { ok: true, value: { fullName, email, phone, roles } };
}

/**
 * A temporary password for a new login: 16 characters, mixed, no look-alike characters
 * (no 0/O, 1/l/I). Uses the secure random generator built into Node and browsers.
 */
export function generateTempPassword(length = 16): string {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%*?";
  const all = lower + upper + digits + symbols;
  const pick = (set: string) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return set[buf[0] % set.length];
  };
  const chars = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  // Shuffle so the guaranteed characters aren't always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

/** Password rule for "Change my password". */
export function checkNewPassword(password: string, confirm: string): string | null {
  if (password.length < 12) return "Use at least 12 characters.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Use a mix of upper case, lower case and numbers.";
  }
  if (password !== confirm) return "The two passwords don't match.";
  return null;
}

/** Turns a database error into a sentence staff can act on. */
export function friendlyDbError(message: string): string {
  if (/at least one active Director/i.test(message)) return "There must always be at least one active Director.";
  if (/deactivate your own/i.test(message)) return "You can't deactivate your own account.";
  if (/staff_profiles_email_unique|duplicate key/i.test(message)) return "That person is already on the staff list.";
  if (/row-level security|permission denied/i.test(message)) {
    return "You don't have permission to do that. Directors need two-factor authentication switched on.";
  }
  if (/already been registered|already registered/i.test(message)) return "A login with that email already exists.";
  return message;
}
