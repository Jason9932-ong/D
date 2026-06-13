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
1. **Authentication → Users → Add user** → client's email + a password
   (Auto Confirm on). A profile row is created automatically.
2. Send the client their email + password and the link
   **https://jason9932-ong.github.io/D/portal/**
   (They can also use “Email me a login link” instead of the password.)

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

## Realtime messages
Messages are **live** — when you or a client posts, the other side sees it
appear without refreshing. The schema already adds the `comments` table to
Supabase Realtime, so no extra setup is needed. (If you ever reset the project,
just re-run `supabase/schema.sql`.)
