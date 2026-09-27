# Lingerie Shop — Backend (Phase 1)

FastAPI backend with auth, product catalog, orders, Razorpay payments, and a full admin API.

## Run locally

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env — fill SECRET_KEY and (later) Razorpay keys

uvicorn app.main:app --reload --port 8000
```

Server runs at http://127.0.0.1:8000 — interactive API docs at http://127.0.0.1:8000/docs

## Create your first admin account

```bash
python seed_admin.py
```

It'll ask for email/name/password. This account will have `is_admin=True` and can access all `/admin/*` endpoints.

## What's built (Phase 1)

- **Auth**: register/login (JWT), separate admin flag on the same users table
- **Catalog**: categories, products with multiple images + size/color variants with per-variant stock
- **Orders**: cart checkout → order creation → stock reservation
- **Payments**: Razorpay order creation + signature verification (`/payments/create/{order_id}`, `/payments/verify`)
- **Admin API**: full CRUD on products/categories/banners, order status updates, payment/refund tracking, user list, analytics summary — everything the admin panel (Phase 4) will call

## Database

Defaults to local SQLite (`lingerie_shop.db`) so you can develop with zero setup.
For production, set `DATABASE_URL` in `.env` to a Postgres connection string (Render.com gives you one free).

## Next phases
- Phase 2: Customer storefront (React)
- Phase 3: Razorpay checkout UI wiring
- Phase 4: Admin dashboard (React)
- Phase 5: Deployment (Render + Vercel)
