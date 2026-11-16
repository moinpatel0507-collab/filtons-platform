import Link from "next/link";
import type { Access } from "@/lib/roles";
import { roleLabel } from "@/lib/roles";
import { signOut } from "@/app/actions";

/** Page frame: top bar with navigation, who is logged in, and sign out. */
export default function AppShell({ access, children }: { access: Access; children: React.ReactNode }) {
  const links = [
    { href: "/", label: "Home", show: true },
    { href: "/staff", label: "Staff", show: true },
    { href: "/audit", label: "Audit log", show: access.can_view_audit },
    { href: "/account", label: "My account", show: true },
  ].filter((l) => l.show);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold text-teal-800">Filtons Platform</Link>
            <nav className="flex gap-4 text-sm">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="text-slate-600 hover:text-slate-900">{l.label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {access.full_name} · {access.roles.map(roleLabel).join(", ")}
            </span>
            <form action={signOut}>
              <button className="btn-secondary py-1">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
