# StockPro — Nectar Heaven Inventory System

A full-stack inventory, stock, and invoicing web app built for Nectar Heaven.

## Stack
- **Frontend:** Next.js 16 (App Router), JavaScript, Tailwind CSS v4, hand-built ShadCN-style components, React Hook Form, Recharts, sonner (toasts), next-themes (light/dark)
- **Backend:** Next.js API routes — all endpoints under `/app/api/*`
- **Database:** MongoDB via Mongoose (`lib/mongodb.js` + `models/index.js`)
- **Notifications:** WhatsApp via Twilio (`lib/whatsapp.js`), fired on product creation, stock in, and stock out
- **Auth:** JWT session cookie (httpOnly), bcrypt password hashing

## Quick start
```bash
npm install
cp .env.local.example .env.local
```
Fill in `.env.local` (see the two setup guides below for where each value comes from), then:
```bash
node scripts/seed-mongo.js   # one-time — seeds demo data
npm run dev
```
Open **http://localhost:3000** — redirects to `/login`.

**Demo login:** `admin@nectarheaven.com` / `admin123`

---

## Connect MongoDB (step by step)

You need a MongoDB **connection string** — a URL that tells the app where your database lives and how to authenticate. The easiest way to get one, with zero server setup, is MongoDB Atlas (MongoDB's free hosted tier).

1. **Create an account** at mongodb.com/cloud/atlas/register — free, no credit card needed for the free tier.
2. **Create a cluster** — choose the **M0 Free** tier, pick any cloud provider/region close to you, and click Create.
3. **Create a database user** — Atlas will prompt you during setup (or go to *Database Access* in the sidebar): set a username and password. **Save these somewhere** — you'll need them in step 6.
4. **Allow network access** — go to *Network Access* in the sidebar → *Add IP Address* → choose **"Allow Access from Anywhere"** (`0.0.0.0/0`). Fine for development; for production you'd restrict it to your server's IP.
5. **Get your connection string** — go to your cluster → **Connect** → **Drivers** → copy the string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **Paste it into `.env.local`** as `MONGODB_URI`, replacing `<username>` and `<password>` with the values from step 3, and adding a database name right after `.net/`:
   ```
   MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/stockpro?retryWrites=true&w=majority
   ```
   (The database `stockpro` doesn't need to exist beforehand — MongoDB creates it automatically on first write.)
7. **Seed initial data** (one time only):
   ```bash
   node scripts/seed-mongo.js
   ```
   Creates the admin user, categories, a sample supplier/customer, your 6 real products, and the original INV899 invoice. Safe to re-run — it skips anything that already exists.
8. **Run the app** — `npm run dev`. Every page and API route now reads/writes MongoDB instead of the old local SQLite file.

**Where things live in code:**
- `lib/mongodb.js` — opens and caches the connection
- `models/index.js` — one Mongoose schema per collection (User, Product, Category, Supplier, Customer, StockIn, StockOut, Invoice, Notification)
- `app/api/*/route.js` — every API route calls `connectDB()` then queries these models directly

---

## WhatsApp notifications (step by step)

Notifications fire automatically when you **add a product**, **record stock in**, or **record stock out** (stock out also sends a low-stock warning if the level drops to/below the reorder point). Three free/low-cost providers are supported — pick whichever fits, and only fill in **one** in `.env.local`.

### Option 1 (recommended) — Green API: instant, no waiting on anyone
You connect your own WhatsApp by scanning a QR code (like WhatsApp Web) — API access is ready the moment you scan, no bot reply to wait for.

1. Go to green-api.com → **Sign up free**
2. After logging in, click **Create Instance** (the free tier gives you one)
3. You'll see an **idInstance** and **apiTokenInstance** right on the dashboard — copy both
4. Still on the dashboard, click **Get QR code**, then scan it with the WhatsApp app on the phone that should receive alerts (WhatsApp → Settings → Linked Devices → Link a Device)
5. Once scanned, it shows "Authorized" — you're ready immediately
6. Fill in `.env.local`:
   ```
   GREENAPI_INSTANCE_ID=1101123456
   GREENAPI_API_TOKEN=abcdef0123456789abcdef0123456789abcdef0123456789
   NOTIFY_WHATSAPP_TO=+60146723686
   ```
7. Restart `npm run dev`, then test: `node scripts/test-whatsapp.mjs`

**Free tier limits:** enough messages/month for this use case (low-stock alerts, not bulk marketing). If you hit a limit, paid tiers are inexpensive.

### Option 2 — CallMeBot: also free, but can be slow
1. Save `+34 644 59 71 67` as a WhatsApp contact
2. Message it exactly: `I allow callmebot to send me messages`
3. It eventually replies with your API key — **this can take anywhere from a minute to several hours**, since it's a free community-run bot with no uptime guarantee
4. Fill in `.env.local`:
   ```
   CALLMEBOT_API_KEY=123456
   NOTIFY_WHATSAPP_TO=+60146723686
   ```

### Option 3 — Twilio: sandbox for testing, paid for a real business sender
See the commented-out block in `.env.local.example`. Better if you eventually need a verified business WhatsApp sender at scale.

### Testing whichever you set up
```bash
node scripts/test-whatsapp.mjs
```
This automatically uses whichever provider you've configured — Green API first if set, then CallMeBot, then Twilio.

**Where things live in code:**
- `lib/whatsapp.js` — the `sendWhatsAppMessage()` helper. Tries Green API → CallMeBot → Twilio, in that order, using whichever has its env vars filled in. Never throws — if nothing is configured or the send fails, it logs to the console and the request still succeeds normally.
- Called from `app/api/products/route.js` (POST), `app/api/stock-in/route.js` (POST), and `app/api/stock-out/route.js` (POST).
- Want it on more actions (e.g. new invoice)? Import `sendWhatsAppMessage` from `@/lib/whatsapp` and call it the same way inside that route.

---

## Email notifications (step by step)

Stock In and Stock Out also send an email, in addition to WhatsApp — same trigger, two channels. Uses plain SMTP via `nodemailer`, so any email provider works, but the easiest for testing is your own Gmail with an **App Password**.

1. Go to your Google Account → **Security** → make sure **2-Step Verification** is turned on (required for App Passwords)
2. Still in Security, search for **"App Passwords"** (or go directly to myaccount.google.com/apppasswords)
3. Create a new App Password — name it something like "StockPro" — Google gives you a 16-character password (e.g. `abcd efgh ijkl mnop`)
4. Fill in `.env.local`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_gmail_address@gmail.com
   SMTP_PASS=abcdefghijklmnop
   NOTIFY_EMAIL_TO=pkarthip25@gmail.com
   ```
   `SMTP_USER`/`SMTP_PASS` is the account **sending** the email (your Gmail + its App Password). `NOTIFY_EMAIL_TO` is who **receives** the alert — can be any address, doesn't need to be a Gmail account.
5. Restart `npm run dev`, then do a Stock In or Stock Out — check the inbox at `NOTIFY_EMAIL_TO`.

**Using a different provider (Outlook, Zoho, a business domain, etc.)?** Just change `SMTP_HOST`/`SMTP_PORT` to that provider's SMTP settings and use its own password (not an "app password" concept for all providers — check your provider's docs).

**Where things live in code:**
- `lib/email.js` — the `sendEmailNotification(subject, message)` helper, same never-throws pattern as WhatsApp.
- Called from `app/api/stock-in/route.js` and `app/api/stock-out/route.js`, right alongside the WhatsApp call.

---

## Project structure — Frontend vs Backend

Everything lives in **one Next.js project**, but it's cleanly split by folder — you can think of it as two halves of the same app rather than two separate apps:

```
stockpro-inventory-web/
│
├── FRONTEND (pages the user sees)
│   ├── app/
│   │   ├── login/page.js
│   │   ├── dashboard/page.js
│   │   ├── products/page.js
│   │   ├── invoices/page.js
│   │   └── ...one folder per page
│   └── components/
│       ├── layout/      ← Sidebar, Header, AppShell (the shell every page sits in)
│       ├── forms/       ← ProductForm and future forms
│       └── ui/          ← Button, Card, Badge, Input — small reusable pieces
│
├── BACKEND (API + data)
│   ├── app/api/         ← every route.js here IS an API endpoint (Next.js convention)
│   │   ├── products/route.js       → /api/products
│   │   ├── stock-in/route.js       → /api/stock-in
│   │   └── ...
│   ├── lib/
│   │   ├── mongodb.js   ← database connection
│   │   ├── auth.js      ← JWT session helpers
│   │   ├── whatsapp.js  ← WhatsApp notification sender
│   │   └── email.js     ← Email notification sender
│   ├── models/
│   │   └── index.js     ← every MongoDB collection's schema (Product, Invoice, etc.)
│   └── scripts/
│       ├── seed-mongo.js       ← one-time database seeding
│       └── test-whatsapp.mjs   ← standalone notification test
│
└── .env.local            ← your secrets (MongoDB URI, API keys) — never committed
```

**Why there's no separate `backend/` folder:** Next.js's whole design is that `app/api/*` files run on the server while everything else in `app/` runs in the browser — that separation already exists, enforced by the framework, without needing two projects. Introducing a second, standalone backend (its own `server.js`, its own database connection) is what caused the duplicate-database confusion earlier in this project's setup — two codebases, each thinking it owned the data. Keeping one project with clearly-named folders avoids that entirely while still being just as easy to navigate.

---

## How the frontend and backend actually talk to each other

There's no separate backend server — Next.js API routes **are** the backend, running in the same project. Concretely:

1. A page like `app/products/page.js` is a React component running in the browser. When it needs data, it calls `fetch("/api/products")`.
2. That request hits `app/api/products/route.js` — this file exports a `GET` function that Next.js automatically wires up to serve `/api/products`. There's no manual routing config; the **file path is the URL**.
3. Inside that function, `await connectDB()` opens (or reuses) the MongoDB connection, then `Product.find(...)` queries it via Mongoose.
4. The route returns `NextResponse.json({ products })`, which the browser's `fetch` call receives as JSON and renders.
5. For actions like stock-in, the same route also calls `sendWhatsAppMessage(...)` before returning — so one API call updates the database **and** fires the notification, without the frontend knowing or caring that WhatsApp is involved at all.

The mobile app (`stockpro-mobile`) talks to this exact same set of `/api/*` routes over the network — see its own README for how to point it at your running server.

## Modules built (Milestone 1)
1. Login (JWT cookie auth)
2. Dashboard — KPIs, sales trend chart, category valuation chart, low-stock alerts, live stock ledger, recent invoices
3. Products — search, filter by category, low-stock badges
4. Add / Edit Product — WhatsApp alert on create
5. Stock In — auto-increments product quantity, WhatsApp alert
6. Stock Out — blocks over-selling, WhatsApp alert (+ low-stock warning)
7. Invoices — list, filter by status/search
8. New Invoice — multi-line item builder, live totals, optional auto stock dispatch
9. Invoice Detail — printable, styled like your original invoice layout, with your real logo
10. Customers — CRUD + lifetime spend
11. Suppliers — CRUD + linked product counts
12. Categories — CRUD
13. Reports — inventory valuation, reorder watchlist, movement history
14. Settings — business profile (read-only for now), light/dark toggle

In-app notifications (bell icon, top right) still fire too — separate from WhatsApp, polls every 15s.

## API Endpoints
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET/POST         /api/products
GET/PUT/DELETE   /api/products/:id

GET/POST/DELETE  /api/categories
GET/POST/DELETE  /api/suppliers
GET/POST/DELETE  /api/customers

GET/POST         /api/stock-in
GET/POST         /api/stock-out

GET/POST         /api/invoices
GET/PUT/DELETE   /api/invoices/:id

GET              /api/dashboard/stats
GET/PUT          /api/notifications
```

## Next steps
- Editable Settings (business profile, tax, users/roles)
- PDF export for invoices
- Role-based permissions (admin/staff)
- WhatsApp alerts on new invoices too (same pattern, just add the call)
