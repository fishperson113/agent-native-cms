# Deploy to Render with Supabase

This deployment keeps the Next.js CMS kernel on one Render Free web-service
instance and uses Supabase Free as the durable PostgreSQL database.

```text
GitHub push
  ↓ GitHub Actions quality gate
Render Blueprint auto-deploy
  ↓ DATABASE_URL (secret)
Supabase PostgreSQL
```

## Runtime characteristics

- Render runs one Node.js instance from `render.yaml`.
- The hosted MCP endpoint remains part of the CMS kernel at `/api/mcp`.
- The public landing page aggregates every published article across tenants.
- Public article URLs use `/articles/ARTICLE_ID/SLUG`; the UUID is authoritative
  and prevents collisions when different tenants choose the same slug.
- Every process start applies existing Drizzle migrations before `next start`.
- Render Free sleeps after 15 minutes without inbound traffic. In-memory MCP
  sessions disappear when the instance sleeps or restarts, so agents must be
  able to reconnect and initialize a new session.
- PostgreSQL remains the source of truth for content, presentations,
  credentials, admin sessions, and audit events.

## 1. Create the Supabase project

Create a Free Supabase project, preferably in Singapore to keep it near the
Render service. Store the generated database password in a password manager.

In the Supabase project, select **Connect → Session pooler** and copy the URI
that uses port `5432`:

```text
postgresql://postgres.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Use either the Session Pooler URI or a direct IPv6 URI. Do not use the
Transaction Pooler on port `6543`: the audit SSE implementation relies on
session-level PostgreSQL `LISTEN/NOTIFY` behavior.

No Supabase service-role key or anon key is required. The CMS connects directly
to PostgreSQL through `DATABASE_URL`.

## 2. Verify and initialize the remote database

Set the Supabase Session Pooler URI only in your local shell for this session:

```powershell
$env:DATABASE_URL = "YOUR_SUPABASE_SESSION_POOLER_URI"
pnpm db:migrate
pnpm db:seed
```

Optional browser demo content:

```powershell
pnpm db:seed:delivery
```

Bootstrap the single admin credential against Supabase:

```powershell
pnpm mcp:admin bootstrap-admin --name "Hosted operator" --confirm
```

Save the returned admin plaintext key immediately. Clear the temporary shell
variable when initialization is complete:

```powershell
Remove-Item Env:DATABASE_URL
```

Never place the Supabase URI, database password, or admin key in Git, `.env.example`,
`render.yaml`, GitHub Actions logs, or a coding-agent prompt.

## 3. Create the Render Blueprint

1. Push this repository to GitHub.
2. In Render, select **New → Blueprint**.
3. Connect the GitHub repository.
4. Keep the Blueprint path as `render.yaml`.
5. When prompted for `DATABASE_URL`, paste the Supabase Session Pooler URI.
6. Apply the Blueprint.

`autoDeployTrigger: checksPass` makes future commits deploy only after the
repository's GitHub Actions checks pass. Render receives the secret from its
dashboard; the value is never synced back into the Blueprint.

The service uses:

```text
Build: pnpm install --frozen-lockfile && pnpm build
Start: pnpm db:migrate && pnpm start
Health: GET /
```

Render injects `PORT`; `next start` reads it automatically.
`CMS_ADMIN_ALLOWED_ORIGINS` contains the exact public admin origin so the
same-origin guard remains effective when Render forwards requests to Next.js
through its internal reverse proxy. Add a future custom domain to the
comma-separated allowlist before using the admin UI on that domain.

`GET /api/health` is the public uptime endpoint. It performs one lightweight
PostgreSQL query and returns only kernel/database readiness, never credentials,
connection details, tenant data, or runtime session counts. External uptime
monitors should call this endpoint instead of authenticated admin or MCP routes.

## 4. Complete hosted setup

After the first deploy succeeds:

1. Open `https://YOUR_SERVICE.onrender.com/admin`.
2. Sign in with the hosted admin key.
3. Issue a tenant key from the admin UI.
4. Copy its generated coding-agent setup prompt.
5. Confirm the prompt points to
   `https://YOUR_SERVICE.onrender.com/api/mcp`.

The admin key must never be configured in an MCP client.

## 5. Smoke test

Check the public and protected surfaces:

```powershell
curl.exe -I https://YOUR_SERVICE.onrender.com/
curl.exe -i https://YOUR_SERVICE.onrender.com/api/health
curl.exe -i https://YOUR_SERVICE.onrender.com/api/mcp/health
curl.exe -i https://YOUR_SERVICE.onrender.com/api/admin/audit
```

The public page should return successfully. The MCP health and audit endpoints
should reject unauthenticated requests. Then connect with an issued tenant key,
create a draft article, publish it, and verify it on the landing page.

## Free-tier caveats

- The first request after Render sleeps can take about a minute.
- A sleeping/restarted Render instance loses only in-memory MCP sessions, not
  PostgreSQL content or audit history.
- Supabase Free projects can pause after prolonged inactivity.
- Supabase Free database size is limited; uploaded TSX, compiled artifacts, and
  indefinitely retained audit events all count toward it.
- Free tiers provide no production SLA or backups suitable for critical data.

Before treating the service as production, upgrade the Render instance or move
to an always-on host, add database backups, and define audit retention.
