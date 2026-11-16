import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/app-shell";

type AuditRow = {
  id: number;
  occurred_at: string;
  actor_email: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  changed_fields: string[] | null;
  note: string | null;
};

function describe(row: AuditRow): string {
  if (row.action.startsWith("app.")) {
    const labels: Record<string, string> = {
      "app.sign_in": "Signed in",
      "app.sign_out": "Signed out",
      "app.mfa_enrolled": "Turned on 2FA",
      "app.mfa_verified": "Entered 2FA code",
      "app.mfa_reset": "Reset someone's 2FA",
      "app.password_changed": "Changed their password",
      "app.bank_details_viewed": "Viewed full bank details",
    };
    return labels[row.action] ?? row.action.replace(/^app\./, "").replaceAll("_", " ");
  }
  const verb = { INSERT: "Added", UPDATE: "Changed", DELETE: "Removed" }[row.action] ?? row.action;
  const fields = row.changed_fields?.length ? ` (${row.changed_fields.join(", ")})` : "";
  return `${verb} ${row.table_name?.replaceAll("_", " ") ?? "record"}${fields}`;
}

export default async function AuditPage() {
  const access = await requireStaff();
  if (!access.can_view_audit) redirect("/");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, occurred_at, actor_email, action, table_name, record_id, changed_fields, note")
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  return (
    <AppShell access={access}>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-slate-500">
        Latest 200 entries. Every change in the database is recorded here automatically and can never be edited or deleted.
      </p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">What</th>
            </tr>
          </thead>
          <tbody>
            {(data as AuditRow[]).map((row) => (
              <tr key={row.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                  {new Date(row.occurred_at).toLocaleString("en-GB", { timeZone: "Europe/London" })}
                </td>
                <td className="px-4 py-2">{row.actor_email ?? <span className="text-slate-400">System / SQL editor</span>}</td>
                <td className="px-4 py-2">
                  {describe(row)}
                  {row.note && <span className="text-slate-500"> · {row.note}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
