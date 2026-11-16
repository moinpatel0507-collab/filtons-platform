"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode =
  | { kind: "loading" }
  | { kind: "enrol"; factorId: string; qrCode: string; secret: string }
  | { kind: "verify"; factorId: string }
  | { kind: "error"; message: string };

export default function MfaForm() {
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) {
        if (!cancelled) setMode({ kind: "error", message: error.message });
        return;
      }
      const verified = data.totp[0];
      if (verified) {
        if (!cancelled) setMode({ kind: "verify", factorId: verified.id });
        return;
      }
      // Clear any half-finished set-up from an earlier attempt, then start fresh.
      for (const f of data.all.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrolError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Filtons ${new Date().toISOString().slice(0, 10)}`,
      });
      if (cancelled) return;
      if (enrolError || !enrolled) {
        setMode({ kind: "error", message: enrolError?.message ?? "Could not start 2FA set-up." });
        return;
      }
      setMode({
        kind: "enrol",
        factorId: enrolled.id,
        qrCode: enrolled.totp.qr_code,
        secret: enrolled.totp.secret,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode.kind !== "enrol" && mode.kind !== "verify") return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mode.factorId,
      code: code.replace(/\s/g, ""),
    });
    if (error) {
      setBusy(false);
      setError("That code didn't work. Codes change every 30 seconds: try the current one.");
      return;
    }
    await supabase.rpc("log_event", { p_action: mode.kind === "enrol" ? "mfa_enrolled" : "mfa_verified" });
    router.replace("/");
    router.refresh();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login?msg=signed-out");
    router.refresh();
  }

  if (mode.kind === "loading") return <p className="text-sm text-slate-500">Loading…</p>;
  if (mode.kind === "error") return <p className="alert-error">{mode.message}</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode.kind === "enrol" ? (
        <>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Open an authenticator app on your phone (Microsoft Authenticator, Google Authenticator or 1Password).</li>
            <li>Add an account and scan this QR code.</li>
            <li>Type the 6-digit code it shows.</li>
          </ol>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mode.qrCode} alt="QR code for your authenticator app" className="h-48 w-48" />
          </div>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer">Can&apos;t scan? Enter this key instead</summary>
            <code className="mt-2 block break-all rounded bg-slate-100 p-2">{mode.secret}</code>
          </details>
        </>
      ) : (
        <p className="text-sm text-slate-700">Enter the 6-digit code from your authenticator app.</p>
      )}

      <div>
        <label htmlFor="code" className="label">Code</label>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7}
          required autoFocus className="input text-center text-lg tracking-widest"
          value={code} onChange={(e) => setCode(e.target.value)} />
      </div>
      {error && <p className="alert-error">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Checking…" : mode.kind === "enrol" ? "Turn on 2FA" : "Continue"}
      </button>
      <button type="button" onClick={signOut} className="btn-secondary w-full">Sign out</button>
      <p className="text-xs text-slate-500">
        Lost your phone? A Director can reset your 2FA from the Staff page.
      </p>
    </form>
  );
}
