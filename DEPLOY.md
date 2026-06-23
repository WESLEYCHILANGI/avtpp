# Deploying AVTPP (permanent, stable URL)

AVTPP runs as **one Node service** (Express serves both the REST API and the
built React frontend) plus **one managed MySQL database**. That keeps the
deployment simple: a single web service + a database.

Everything in the code is already prepared:

- `Dockerfile` — builds the client and packages it with the server into one image.
- `config/database.js` — reads `DATABASE_URL`/`MYSQL_URL`, discrete `DB_*` vars, or
  managed `MYSQL*` vars; supports TLS via `DB_SSL=true`.
- The server **auto-creates tables and seeds reference data on first boot**
  (toll gates, tariffs, the admin account, and a demo user). Disable with
  `SEED_ON_START=false`.
- `server/.env.example` — the full list of environment variables.

> The only thing that needs **you**: free accounts. I can't create them or pay for
> anything. Create the accounts below, then I can drive the rest with you.

---

## Free-tier setup (no credit card)

One free **Render** web service (runs the Docker image — API + frontend together)
plus one **free MySQL** database. Total cost: $0.

> Render's free web service **sleeps after ~15 min of inactivity**, so the first
> request after idle takes ~30–50s to wake. Fine for a demo/portfolio; not for
> production traffic.

### Step 1 — Create a free MySQL database

Pick one (both are MySQL-compatible and require TLS, which the app already supports):

- **Aiven** (https://aiven.io) → free plan → **MySQL** → create service. Copy the
  **Service URI** (looks like `mysql://avnadmin:****@host:port/defaultdb`).
- **TiDB Cloud Serverless** (https://tidbcloud.com) → free cluster → **Connect** →
  copy the connection string and build `mysql://USER:PASSWORD@HOST:4000/test`.

No credit card is required for either free tier.

### Step 2 — Put the code on GitHub

Render's free plan deploys from a Git repo. Push the `avtpp/` folder as the repo
root (`.gitignore` already excludes `node_modules`, `dist`, `.env`). I can do this
with you.

### Step 3 — Deploy on Render

1. https://render.com → sign up (GitHub login is easiest).
2. **New → Blueprint** → pick your repo. Render reads `render.yaml` and creates the
   `avtpp` web service (free, Docker).
3. When prompted (or in the service's **Environment** tab) set the one secret:
   - `DATABASE_URL` = the MySQL URI from Step 1.
   - (`JWT_SECRET` and `GATE_API_KEY` are auto-generated; `DB_SSL=true` is preset.)
4. Create / deploy. First boot builds the image, creates the schema, and seeds data.
5. Your stable URL is the service's `onrender.com` address.

That's it — no Railway, no cost.

---

## Paid alternative: Railway (has managed MySQL, ~$5/mo)

Railway supports MySQL directly, so no database-engine changes are needed.

### Option A — Deploy from GitHub (simplest, gives auto-deploys)

1. Push this project to a GitHub repo (the `avtpp/` folder as the repo root).
   `.gitignore` already excludes `node_modules`, `dist`, and `.env`.
2. In Railway: **New Project → Deploy from GitHub repo** → select the repo.
3. Railway detects the `Dockerfile` and builds the single image.
4. In the project, **+ New → Database → Add MySQL**.
5. Open the web service → **Variables** → reference the MySQL service vars and add app secrets:
   - `DATABASE_URL` = `${{MySQL.MYSQL_URL}}` (Railway reference), **or** leave the
     discrete `MYSQLHOST/MYSQLPORT/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE` — the app reads both.
   - `DB_SSL` = `true`
   - `JWT_SECRET` = a long random string
   - `GATE_API_KEY` = a random string
   - `FLUTTERWAVE_LIVE` = `false`
   - (`PORT` is provided by Railway automatically.)
6. Deploy. On first boot the app creates the schema and seeds data.
7. Web service → **Settings → Networking → Generate Domain** → that's your stable URL.

### Option B — Deploy with the Railway CLI (no GitHub needed)

```bash
npm i -g @railway/cli
railway login           # opens your browser to authenticate
cd avtpp
railway init            # create a new project
railway add --database mysql
railway up              # uploads & builds via the Dockerfile
# then set the variables (Option A, step 5) in the dashboard or via `railway variables set`
railway domain          # generate the public URL
```

---

## Alternatives

- **Render** — great Node hosting, but its managed database is **PostgreSQL**, not
  MySQL. You'd either add an external MySQL (e.g. Clever Cloud / Aiven) and point
  `DATABASE_URL` at it, or migrate the schema to Postgres (more work). Use the
  `Dockerfile` as a Web Service; add a managed MySQL elsewhere; set the env vars.
- **Fly.io** — `fly launch` (uses the Dockerfile). MySQL is self-managed, so a
  hosted MySQL add-on is still simpler.
- **Any container host / VPS** — `docker build -t avtpp ./avtpp && docker run -p 5000:5000 --env-file avtpp/server/.env avtpp`, pointing the DB vars at a reachable MySQL.

---

## Post-deploy checklist

- [ ] Visit the URL — the login page loads.
- [ ] `GET /api/health` returns `{ "status": "ok" }`.
- [ ] Log in with the seeded demo user, or register a new account.
- [ ] **Change the seeded admin password** (`admin@nrfa.gov.zm` / `Admin@2026`) —
      it ships only for first access. Use the admin UI or update the DB.
- [ ] Rotate `JWT_SECRET` and `GATE_API_KEY` to fresh random values.

## Local sanity check before deploying

```bash
# Build the same image locally (requires Docker)
docker build -t avtpp ./avtpp
docker run -p 5000:5000 \
  -e DB_HOST=host.docker.internal -e DB_USER=root -e DB_PASSWORD= -e DB_NAME=avtpp_db \
  avtpp
# open http://localhost:5000
```
