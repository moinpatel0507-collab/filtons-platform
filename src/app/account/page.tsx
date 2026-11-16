import { requireStaff } from "@/lib/access";
import AppShell from "@/components/app-shell";
import { roleLabel } from "@/lib/roles";
import PasswordForm from "./password-form";

export default async function AccountPage() {
  const access = await requireStaff();
  return (
    <AppShell access={access}>
      <h1 className="text-2xl font-semibold">My account</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="card text-sm">
          <h2 className="font-semibold">Details</h2>
          <dl className="mt-4 space-y-2">
            <div><dt className="text-slate-500">Name</dt><dd>{access.full_name}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd>{access.email}</dd></div>
            <div><dt className="text-slate-500">Roles</dt><dd>{access.roles.map(roleLabel).join(", ")}</dd></div>
            <div><dt className="text-slate-500">Branch</dt><dd>{access.branch_name}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">To change your name, email or roles, ask a Director.</p>
        </section>
        <section className="card">
          <h2 className="font-semibold">Change password</h2>
          <div className="mt-4"><PasswordForm /></div>
        </section>
      </div>
    </AppShell>
  );
}
