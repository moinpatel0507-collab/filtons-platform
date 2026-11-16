import { requireStaff } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AppShell from "@/components/app-shell";
import { roleLabel, type Role } from "@/lib/roles";
import AddStaffForm from "./add-staff-form";
import StaffRowActions from "./staff-row-actions";

type StaffRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  deactivated_at: string | null;
};

export default async function StaffPage() {
  const access = await requireStaff();
  const supabase = await createClient();

  const [{ data: staff, error: staffError }, { data: roleRows, error: rolesError }] = await Promise.all([
    supabase.from("staff_profiles").select("id, full_name, email, phone, is_active, deactivated_at").order("full_name"),
    supabase.from("staff_roles").select("staff_id, role"),
  ]);
  if (staffError || rolesError) throw new Error(staffError?.message ?? rolesError?.message);

  const rolesByStaff = new Map<string, Role[]>();
  for (const r of roleRows ?? []) {
    rolesByStaff.set(r.staff_id, [...(rolesByStaff.get(r.staff_id) ?? []), r.role as Role]);
  }

  // Directors also see whether each person has 2FA set up (read from Supabase Auth).
  const mfaByStaff = new Map<string, boolean>();
  if (access.can_manage_staff && staff?.length) {
    const admin = createAdminClient();
    await Promise.all(
      staff.map(async (s) => {
        const { data } = await admin.auth.admin.mfa.listFactors({ userId: s.id });
        mfaByStaff.set(s.id, Boolean(data?.factors.some((f) => f.status === "verified")));
      }),
    );
  }

  return (
    <AppShell access={access}>
      <h1 className="text-2xl font-semibold">Staff</h1>
      <p className="mt-1 text-sm text-slate-500">
        Staff are never deleted: deactivate them instead, so their history stays in the audit log.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Roles</th>
              <th className="px-4 py-3">Status</th>
              {access.can_manage_staff && <th className="px-4 py-3">2FA</th>}
              {access.can_manage_staff && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(staff as StaffRow[] | null)?.map((s) => {
              const roles = rolesByStaff.get(s.id) ?? [];
              return (
                <tr key={s.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.full_name}{s.id === access.user_id && <span className="text-slate-400"> (you)</span>}</div>
                    <div className="text-xs text-slate-500">{s.email}{s.phone ? ` · ${s.phone}` : ""}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {roles.length ? roles.map((r) => <span key={r} className="badge">{roleLabel(r)}</span>) : <span className="text-xs text-slate-400">No roles</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.is_active ? (
                      <span className="badge bg-emerald-100 text-emerald-800">Active</span>
                    ) : (
                      <span className="badge bg-red-100 text-red-800">
                        Deactivated {s.deactivated_at ? new Date(s.deactivated_at).toLocaleDateString("en-GB") : ""}
                      </span>
                    )}
                  </td>
                  {access.can_manage_staff && (
                    <td className="px-4 py-3">{mfaByStaff.get(s.id) ? "Set up" : <span className="text-slate-400">Not set up</span>}</td>
                  )}
                  {access.can_manage_staff && (
                    <td className="px-4 py-3">
                      <StaffRowActions staffId={s.id} isSelf={s.id === access.user_id} isActive={s.is_active} roles={roles} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {access.can_manage_staff ? (
        <section className="card mt-8 max-w-xl">
          <h2 className="font-semibold">Add a staff member</h2>
          <p className="mt-1 text-xs text-slate-500">
            Creates their login with a temporary password. Give it to them in person or by phone, never by email,
            and ask them to change it under My account.
          </p>
          <div className="mt-4">
            <AddStaffForm />
          </div>
        </section>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Only a Director with two-factor authentication can add or change staff.</p>
      )}
    </AppShell>
  );
}
