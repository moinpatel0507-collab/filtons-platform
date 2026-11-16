"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkNewPassword } from "@/lib/roles";

export default function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = checkNewPassword(password, confirm);
    if (problem) {
      setMessage({ ok: false, text: problem });
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage({ ok: false, text: error.message });
      return;
    }
    await supabase.rpc("log_event", { p_action: "password_changed" });
    setPassword("");
    setConfirm("");
    setMessage({ ok: true, text: "Password changed." });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="pw" className="label">New password</label>
        <input id="pw" type="password" autoComplete="new-password" className="input"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="mt-1 text-xs text-slate-500">At least 12 characters, with upper case, lower case and numbers.</p>
      </div>
      <div>
        <label htmlFor="pw2" className="label">Type it again</label>
        <input id="pw2" type="password" autoComplete="new-password" className="input"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {message && <p className={message.ok ? "alert-ok" : "alert-error"}>{message.text}</p>}
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
    </form>
  );
}
