"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      // Same message for wrong email or wrong password, so nobody can test which emails exist.
      setError("Email or password is incorrect.");
      return;
    }
    await supabase.rpc("log_event", { p_action: "sign_in" });
    // /mfa decides whether a 2FA code is needed. refresh() makes the server read the new session cookie.
    router.replace("/mfa");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" type="email" autoComplete="username" required className="input"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="label">Password</label>
        <input id="password" type="password" autoComplete="current-password" required className="input"
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="alert-error">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
