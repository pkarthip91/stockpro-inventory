# Deploying StockPro to Production

## The one thing that changes: your database

Locally you're using MongoDB running on your own laptop (`mongodb://127.0.0.1:27017`). Once this app is deployed, it runs on someone else's server (Vercel, Render, etc.) — and that server **cannot reach `127.0.0.1` on your laptop** (that address means "this machine," and "this machine" will be a cloud server, not yours).

**So: before deploying, switch back to MongoDB Atlas** (the free cloud database from earlier in this project's setup) so both your laptop and your deployed app can reach the same database over the internet. If you still have your Atlas cluster from before, you already have everything you need — just grab that connection string again.

## Step-by-step: Deploy to Vercel (recommended — built by the makers of Next.js, free tier is generous)

### 1. Push your code to GitHub
```bash
cd stockpro-inventory-web
git init
git add .
git commit -m "Initial commit"
```
Create a new empty repository on github.com, then:
```bash
git remote add origin https://github.com/yourusername/stockpro-inventory-web.git
git branch -M main
git push -u origin main
```
(`.env.local` is already gitignored — your secrets won't be pushed, which is correct.)

### 2. Import into Vercel
- Go to vercel.com, sign up/log in (GitHub login is easiest)
- **Add New → Project** → select your `stockpro-inventory-web` repo → **Import**
- Vercel auto-detects it's a Next.js app — leave build settings as default

### 3. Add your environment variables
Before clicking Deploy, expand **Environment Variables** and add every line from your `.env.local`:
```
MONGODB_URI          → your Atlas connection string (mongodb+srv://...)
JWT_SECRET            → same long random string you used locally
CALLMEBOT_API_KEY      → your CallMeBot key
NOTIFY_WHATSAPP_TO      → +60146723686
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO  → your email values
```
**Important:** your `MONGODB_URI` here must be the **Atlas** one (`mongodb+srv://...`), not `mongodb://127.0.0.1...` — the local one won't work once deployed, for the reason explained above.

### 4. Deploy
Click **Deploy**. Takes 1-2 minutes. You'll get a live URL like:
```
https://stockpro-inventory-web.vercel.app
```

### 5. Seed the production database (one time)
Locally, temporarily point your `.env.local`'s `MONGODB_URI` at the same Atlas cluster (if it isn't already), then run:
```bash
node scripts/seed-mongo.js
```
This seeds the same Atlas database your deployed app now reads from.

### 6. Visit your live app
Open the Vercel URL, log in with `admin@84liquorland.com` / `admin123` — you're live.

---

## Connecting the mobile app to your deployed API

This is the good part: **no new mobile-specific API needed.** The mobile app already talks to the exact same `/api/*` routes the web app uses — you're just changing *which* URL it points to.

Open `stockpro-mobile/src/api/config.js` and change:
```js
export const API_BASE_URL = "http://192.168.1.42:3000"; // old: your laptop's local IP
```
to:
```js
export const API_BASE_URL = "https://stockpro-inventory-web.vercel.app"; // new: your live URL
```

That's the entire change. Once this is set:
- The mobile app works from **anywhere** — same Wi-Fi is no longer required, since it's hitting a real internet URL now instead of your laptop
- Both web and mobile stay in sync automatically, since they share one database and one API

---

## Alternatives to Vercel
If you'd rather not use Vercel:
- **Render.com** — also has a generous free tier, supports Next.js, slightly more manual setup (you pick "Web Service," point it at your repo, set the same env vars)
- **Railway.app** — similar to Render, popular for side projects

The steps are the same in spirit for any of them: push to GitHub → connect the repo → set the same environment variables → deploy → update `API_BASE_URL` in the mobile app to the new live URL.
