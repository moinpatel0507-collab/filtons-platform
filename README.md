# Filtons Platform: Section 1 (staff, roles, 2FA)

The first live screens of the Filtons platform. It connects to the Supabase database you've already set up.

**What it does**
- Staff sign in with email and password.
- Director and Accounts must use an authenticator app (2FA) every session. The database enforces this too.
- **Home** shows what your role is allowed to do, as worked out by the database.
- **Staff** (Director with 2FA): add staff with a temporary password, add or remove roles, deactivate or reactivate (this blocks their login), and reset 2FA if someone loses their phone. The database won't let you deactivate yourself or remove the last Director.
- **Audit log** (Director and Accounts): every change and sign-in, which can't be edited.
- **My account**: change your password.

**Built with:** Next.js 16, TypeScript, Supabase (`@supabase/ssr`), Tailwind CSS 4. 11 unit tests (`npm test`).

## Put it online (no coding needed)

### 1. GitHub: store the code
1. Sign up at https://github.com/signup. Use the office email.
2. Top right, click **+** → **New repository**. Name it `filtons-platform`, choose **Private**, then click **Create repository**.
3. On the next page, click **uploading an existing file**.
4. Unzip `filtons-app.zip` on your computer. Open the `filtons-app` folder, select **everything inside it** (including the `src` and `tests` folders) and drag it into the GitHub page.
   - On Mac, press Cmd+Shift+. in Finder to show `.gitignore` and `.env.example`, so they get uploaded too.
5. Click **Commit changes**.

### 2. Vercel: host the app
1. Sign up at https://vercel.com/signup → **Continue with GitHub**. The free Hobby plan is fine for testing. For business use, Vercel's terms require the Pro plan.
2. Click **Add New → Project**, find `filtons-platform` and click **Import**.
3. Open **Environment Variables** and add these three (from Supabase → Project Settings → API):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ajcpompnwwktxeaqvsjm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **anon** / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | the **service_role** / secret key |

4. Click **Deploy** and wait about 2 minutes. Vercel gives you an address like `filtons-platform.vercel.app`.

### 3. Tell Supabase the app's address
Supabase → **Authentication → URL Configuration** → set **Site URL** to your Vercel address → Save.

### 4. First sign in
1. Open the Vercel address and sign in with the login you created in Supabase.
2. Scan the QR code with your authenticator app and enter the 6-digit code.
3. You should land on Home with every permission showing **Yes**.
4. Open **Audit log**: you should see your sign in and "Turned on 2FA".

## Run it on your own computer (optional)
Install Node.js 22 (https://nodejs.org). Copy `.env.example` to `.env.local` and fill in the keys. Then:
```
npm install
npm test        # 11 unit tests
npm run dev     # opens on http://localhost:3000
```

## Security notes
- The **service_role** key is used only on the server, for creating logins, blocking logins and resetting 2FA. The file that uses it can't be loaded in the browser (`server-only`).
- Everything else runs as the signed-in person, so the database rules (roles, 2FA, row-level security, audit) apply to every action. A bug in the app can't get around them.
- Temporary passwords are shown once. Give them to the person in person or by phone, never by email.
