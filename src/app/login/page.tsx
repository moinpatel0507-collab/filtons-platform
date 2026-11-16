import LoginForm from "./login-form";

const MESSAGES: Record<string, string> = {
  "no-staff-record": "Your login works, but it isn't linked to a staff record yet. Ask a Director to add you.",
  deactivated: "Your account has been deactivated. Speak to a Director.",
  "signed-out": "You've signed out.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const key = typeof params.error === "string" ? params.error : typeof params.msg === "string" ? params.msg : "";
  const message = MESSAGES[key];

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Filtons Platform</h1>
          <p className="mt-1 text-sm text-slate-500">Filtons Stratford Ltd · staff sign in</p>
        </div>
        <div className="card">
          {message && <p className={key === "signed-out" ? "alert-ok mb-4" : "alert-error mb-4"}>{message}</p>}
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
