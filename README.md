# Sugar & Spice — Lingerie E-Commerce Platform

Full-stack e-commerce site: customer storefront + non-technical admin panel + Razorpay payments.

## What's inside

```
backend/      FastAPI + SQLite/Postgres — auth, catalog, orders, Razorpay, admin API
storefront/   React (Vite) — customer-facing website, cart, checkout
admin/        React (Vite) — admin dashboard (products, orders, payments, banners)
```

## Easiest way to run (Windows)

Just double-click **`start.bat`** in this folder. It opens 3 windows (backend,
storefront, admin panel) and installs everything it needs automatically the
first time. Keep all 3 windows open while using the site.

**First time only** — after the backend window says "Uvicorn running", open
`backend\create-admin.bat` (double-click it) to set up your admin login.

Prerequisites: Python and Node.js must already be installed (see below if not).

## Manual way to run (any OS, or if you prefer the terminal)

### 1. Backend (start this first)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # Mac/Linux: cp .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Runs at **http://localhost:8000** — check `http://localhost:8000/docs` to confirm it's up.

Create your admin login (new terminal, backend still running):
```bash
cd backend
venv\Scripts\activate
python seed_admin.py
```

### 2. Storefront (customer website)

```bash
cd storefront
npm install
copy .env.example .env
npm run dev
```

Runs at **http://localhost:5173**

### 3. Admin panel

```bash
cd admin
npm install
copy .env.example .env
npm run dev
```

Runs at **http://localhost:5174** (or whatever port Vite picks — check the terminal output) — sign in with the admin account you created in step 1.

## If Python or Node.js aren't installed

```cmd
winget install Python.Python.3.12 --scope machine
winget install OpenJS.NodeJS.LTS
```

Close and reopen your terminal after installing, then verify with `python --version` and `node --version`.

## Using the admin panel (non-technical, no code needed)

1. Sign in
2. **Products → + New category** first (e.g. Bras, Nightwear, Sets)
3. **Products → + Add product** — fill in name, price, pick category, click **+ Add photo** to upload images directly from your computer/phone, add sizes with stock counts
4. Product appears on the storefront immediately
5. **Orders** — see all orders, change status (pending → paid → shipped → delivered) with a dropdown
6. **Payments** — see all Razorpay payments; mark as refunded after you process the actual refund in your Razorpay dashboard
7. **Banners** — upload homepage promotional images
8. **Customers** — list of everyone with an account

## Storefront features

- Myntra-style browsing: sort (price/newest), price filters, mobile filter drawer, wishlist
- Product pages with related products and SEO-friendly structured data
- Fully mobile responsive (hamburger menu, touch-friendly filters)
- SEO: per-page titles/meta descriptions, Open Graph tags, `robots.txt`

## Going live with real payments

In `backend/.env`, replace the test Razorpay keys with your live ones from
[dashboard.razorpay.com](https://dashboard.razorpay.com) → Settings → API Keys.
Payments settle to your linked bank account automatically (T+2 business days) —
no manual transfer needed.

## Deployment

- **Backend**: Render.com (free tier to start) — set `DATABASE_URL` to a Postgres instance for production instead of SQLite
- **Storefront + Admin**: Vercel or Netlify (both free, both support custom `.com` domains at no extra cost)
- Point your domain's DNS at whichever host you use — see `backend/README.md` for more detail
