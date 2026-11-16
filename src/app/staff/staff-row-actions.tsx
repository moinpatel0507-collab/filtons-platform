"use client";

import { useState, useTransition } from "react";
import { grantRole, removeRole, resetMfa, setActive, type ActionResult } from "./actions";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";

export default function StaffRowActions({
  staffId,
  isSelf,
  isActive,
  roles,
}: {
  staffId: string;
  isSelf: boolean;
  isActive: boolean;
  roles: Role[];
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<string>("");

  function run(fn: () => Promise<ActionResult>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    startTransition(async () => setResult(await fn()));
  }

  const missingRoles = ROLES.filter((r) => !roles.includes(r));

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-1">
        {roles.map((r) => (
          <button key={r} type="button" disabled={pending} className="btn-secondary px-2 py-0.5 text-xs"
            onClick={() => run(() => removeRole(staffId, r), `Remove the ${ROLE_LABELS[r]} role?`)}>
            − {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
      {missingRoles.length > 0 && (
        <div className="flex gap-1">
          <select className="input py-0.5 text-xs" value={roleToAdd} onChange={(e) => setRoleToAdd(e.target.value)}>
            <option value="">Add role…</option>
            {missingRoles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <button type="button" disabled={pending || !roleToAdd} className="btn-secondary px-2 py-0.5 text-xs"
            onClick={() => run(async () => { const r = await grantRole(staffId, roleToAdd); setRoleToAdd(""); return r; })}>
            Add
          </button>
        </div>
      )}
      {!isSelf && (
        <div className="flex gap-1">
          <button type="button" disabled={pending} className="btn-secondary px-2 py-0.5 text-xs"
            onClick={() => run(() => resetMfa(staffId), "Reset this person's 2FA? They'll set it up again at next sign in.")}>
            Reset 2FA
          </button>
          {isActive ? (
            <button type="button" disabled={pending} className="btn-danger px-2 py-0.5 text-xs"
              onClick={() => run(() => setActive(staffId, false), "Deactivate this person? Their login will be blocked straight away.")}>
              Deactivate
            </button>
          ) : (
            <button type="button" disabled={pending} className="btn-secondary px-2 py-0.5 text-xs"
              onClick={() => run(() => setActive(staffId, true))}>
              Reactivate
            </button>
          )}
        </div>
      )}
      {result && <p className={`text-xs ${result.ok ? "text-emerald-700" : "text-red-700"}`}>{result.message}</p>}
    </div>
  );
}
