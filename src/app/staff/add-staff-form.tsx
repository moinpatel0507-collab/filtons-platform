"use client";

import { useActionState, useRef, useEffect } from "react";
import { addStaff, type ActionResult } from "./actions";
import { ROLES, ROLE_LABELS } from "@/lib/roles";

export default function AddStaffForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(addStaff, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fullName" className="label">Full name</label>
          <input id="fullName" name="fullName" required className="input" />
        </div>
        <div>
          <label htmlFor="email" className="label">Work email</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone (optional)</label>
          <input id="phone" name="phone" className="input" />
        </div>
      </div>
      <fieldset>
        <legend className="label">Roles</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2">
              <input type="checkbox" name="roles" value={r} className="h-4 w-4" />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">Director and Accounts will have to set up 2FA at first sign in.</p>
      </fieldset>

      {state && !state.ok && <p className="alert-error">{state.message}</p>}
      {state?.ok && state.tempPassword && (
        <div className="alert-ok space-y-1">
          <p className="font-medium">{state.message}</p>
          <p>Email: <code>{state.email}</code></p>
          <p>Temporary password: <code className="select-all rounded bg-white px-1">{state.tempPassword}</code></p>
          <p className="text-xs">This password is shown once. Copy it now.</p>
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add staff member"}
      </button>
    </form>
  );
}
