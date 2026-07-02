# D.STUDIO — Client Portal setup

A bilingual (EN / 中文) client portal built on **Supabase** (auth + database +
file storage) and hosted as static pages on **GitHub Pages** — no server to run.

```
index.html      Landing page (public)
portal/         Client portal — clients log in, see their progress
admin/          Admin panel — you manage projects, stages, files, replies
js/             config.js · i18n.js · portal.js · admin.js
css/app.css     Portal + admin styles
supabase/schema.sql   Database schema (run once)
```

## One-time setup (≈5 minutes)

### 1. Create the database
1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the tables, security rules (RLS) and the `project-files` storage bucket.
   It's safe to re-run.

### 2. Create your first user + make yourself admin
1. **Authentication → Users → Add user** → enter your email + a password
   (tick *Auto Confirm* so you can log in right away).
2. Back in **SQL Editor**, run (use your email):
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   That account is now the admin.

### 3. Allow the login redirect (only needed for "email login link")
**Authentication → URL Configuration** → add your portal URLs to
*Redirect URLs*:
```
https://jason9932-ong.github.io/D/portal/
https://jason9932-ong.github.io/D/admin/
```
(Password login works without this; the magic-link option needs it.)

## Day-to-day use

### Adding a client
Two ways:

**A) From the admin panel (easiest)** — open **Clients → Add new client**, enter
their name + email, click **Generate** for a password, then **Create account**.
You'll get a copyable `email · password` to send them, along with the portal link.

> For the password to work immediately, turn **off** email confirmation:
> **Authentication → Providers → Email → uncheck "Confirm email"**. Otherwise the
> client must click a confirmation link before the password works.

**B) From Supabase** — **Authentication → Users → Add user** (Auto Confirm on).
A profile row is created automatically.

Then send the client their email + password and the portal link
**https://jason9932-ong.github.io/D/portal/** (they can also use “Email me a
login link”).

### Managing a project (admin)
Go to **https://jason9932-ong.github.io/D/admin/**, log in, then:
- **New project** → pick the client, service type, title → *Create*.
- Open a project to **change its stage**, add **notes**, **upload** preview/final
  files, and **reply** to messages.

The client sees all of this live at `/portal/` — progress bar, files (download +
image previews) and the message thread.

## Security notes
- The key in `js/config.js` is the **anon public key** — safe to expose. Every
  read/write is checked by Row Level Security, so a client can only ever see
  their own projects.
- **Never** put the `service_role` key in this repo or any frontend file.
- The 4 stages are defined in `js/config.js` (`STAGES`) if you ever want to
  rename them.

### Editing a client's name / email / password
On **Clients**, click ✏️ on a card to edit. **Name** works out of the box.
Changing **email or password** needs a small server-side function (the
service_role key can't live in the browser):

1. Install the Supabase CLI and log in, then from the repo root:
   ```
   supabase link --project-ref zuiwiahqdexvqcokknpn
   supabase functions deploy admin-update-client
   ```
   (Or create the function in the Dashboard → **Edge Functions** and paste the
   contents of `supabase/functions/admin-update-client/index.ts`.)
2. That's it — the function auto-receives the URL + keys. Editing email/password
   from the admin panel will now work. Until it's deployed, name edits still work
   and email/password edits show a hint.

### Forgot password (clients)
The portal login has a **Forgot password?** link. It emails the client a reset
link (Supabase's built-in email); clicking it returns them to the portal to set
a new password. Make sure the portal URL is in **Authentication → URL
Configuration → Redirect URLs** (same list as above).

## Realtime messages
Messages are **live** — when you or a client posts, the other side sees it
appear without refreshing. The schema already adds the `comments` table to
Supabase Realtime, so no extra setup is needed. (If you ever reset the project,
just re-run `supabase/schema.sql`.)
