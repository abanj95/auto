# Backups and restore

## What's backed up

- **Database** (every table, including staff accounts in `auth`): nightly by
  `.github/workflows/backup.yml` → an encrypted file in a **private** GitHub
  repository, one per day, last 30 days kept.
- **Not included: photo files** in Supabase Storage (`vehicle-photos`,
  `site-images`). Demo photos can be re-created with `pnpm db:seed-demo`; for real
  photos, download the buckets occasionally (Supabase Dashboard → Storage), or
  upgrade to Pro, which adds daily database backups (7 days) — Storage still isn't
  included there either.

The Supabase **Free** plan has no downloadable backups, which is why this
workflow exists. (Pro adds daily backups; point-in-time recovery is a paid add-on.)

## One-time setup

1. **Create the backup repository** on GitHub: e.g. `abanj95/auto-backups`,
   **Private**, with a README so it has a `main` branch.
2. **Token for pushing to it:** GitHub → Settings → Developer settings →
   Fine-grained tokens → _Generate new token_
   - Repository access: _Only select repositories_ → `auto-backups`
   - Permissions: _Contents: Read and write_
   - Expiration: up to 1 year (put a reminder in your calendar to renew it).
3. **Database connection string:** Supabase Dashboard → _Connect_ → **Session
   pooler** URI (port 5432), with your database password filled in:
   `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`
   (Forgot the password? Project Settings → Database → _Reset database password_.)
4. **Passphrase:** generate one and store it in your password manager —
   **without it the backups can't be opened**: `openssl rand -base64 32`
5. In the **app** repository (`abanj95/auto`) → Settings → Secrets and variables → Actions:
   - Secrets: `SUPABASE_DB_URL`, `BACKUP_PASSPHRASE`, `BACKUP_REPO_TOKEN`
   - Variables: `BACKUP_REPO` = `abanj95/auto-backups`
6. Actions → _Nightly database backup_ → **Run workflow** once, and check that a
   file appears in `auto-backups/daily/`.

## Restore

You need: the `.gpg` file, the passphrase, the `supabase` CLI and `psql`
(`brew install libpq && brew link --force libpq`).

```sh
# 1. Decrypt and unpack
gpg --decrypt backup-2026-10-01.tar.gz.gpg > backup.tar.gz
mkdir restore && tar -xzf backup.tar.gz -C restore

# 2. Restore into a NEW, empty Supabase project (safest — never over the live one)
#    Get its Session pooler URI as above.
export TARGET_DB_URL='postgresql://postgres.<new-ref>:<password>@...:5432/postgres'
psql "$TARGET_DB_URL" \
  --single-transaction --variable ON_ERROR_STOP=1 \
  --file restore/roles.sql \
  --file restore/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file restore/data.sql
```

`session_replication_role = replica` loads the data without firing triggers
(e.g. the append-only audit log and stock-number triggers), exactly as it was.

3. Point the app at the new project: update `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` in Vercel and
   `.env.local`, redeploy, then `supabase link --project-ref <new-ref>`.
4. Re-apply the manual settings in the new project (Auth URL configuration,
   captcha, rate limits — see the checklist in `docs/security-audit.md`) and
   re-upload photos if needed.
5. Staff sign in with their existing passwords (users are part of the `auth` schema).

To restore a **single table** instead, restore into a scratch project as above,
then copy the rows you need across with `psql` / the SQL editor.

## Test the restore

Once after setup, and then every few months: restore the latest backup into a
throwaway Supabase project and open the site against it. A backup you have
never restored is a guess.
