import Link from "next/link";
import { requireStaff } from "@/lib/access";
import AppShell from "@/components/app-shell";

export default async function HomePage() {
  const access = await requireStaff();

  const permissions: { label: string; allowed: boolean }[] = [
    { label: "Manage staff and roles", allowed: access.can_manage_staff },
    { label: "See client money", allowed: access.can_view_client_money },
    { label: "Post to the ledger", allowed: access.can_post_ledger },
    { label: "Approve payments", allowed: access.can_approve_payments },
    { label: "Read the audit log", allowed: access.can_view_audit },
  ];

  return (
    <AppShell access={access}>
      <h1 className="text-2xl font-semibold">Welcome, {access.full_name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {access.branch_name} branch · two-factor authentication{" "}
        {access.mfa_verified ? "on for this session" : access.requires_mfa ? "required" : "not required for your role"}
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">What you can do</h2>
          <p className="mt-1 text-xs text-slate-500">Decided by the database from your role. The app can&apos;t override it.</p>
          <ul className="mt-4 space-y-2 text-sm">
            {permissions.map((p) => (
              <li key={p.label} className="flex items-center justify-between">
                <span>{p.label}</span>
                <span className={p.allowed ? "badge bg-emerald-100 text-emerald-800" : "badge"}>
                  {p.allowed ? "Yes" : "No"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="font-semibold">Sections</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex justify-between">
              <Link href="/staff" className="text-teal-700 hover:underline">1. Foundations: staff, roles, 2FA</Link>
              <span className="badge bg-emerald-100 text-emerald-800">Live</span>
            </li>
            {["2. Contacts", "3. Properties", "8. Tenancies", "10. Client accounting"].map((s) => (
              <li key={s} className="flex justify-between text-slate-500">
                <span>{s}</span>
                <span className="badge">Database ready · screens next</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
