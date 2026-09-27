# Lingerie Shop — Storefront (Phase 2 & 3)

React + Vite storefront: browsing, cart, checkout, and Razorpay payment — wired to the Phase 1 backend.

## Run locally

```bash
cd storefront
npm install
cp .env.example .env
# edit .env — set VITE_API_URL to your running backend (e.g. http://localhost:8000)

npm run dev
```

Opens at http://localhost:5173 — make sure the backend (Phase 1) is running first.

## What's built

**Phase 2 — Storefront**
- Home page (editorial hero, recently-added products)
- Shop/listing page with category filter + search
- Product detail page (image gallery, size/color variant picker, stock-aware)
- Cart (persists in browser storage, quantity controls)
- Login / Register
- Order history

**Phase 3 — Razorpay checkout**
- Checkout page collects delivery address + phone
- Creates order in backend → creates Razorpay order → opens Razorpay's payment modal (UPI/cards/netbanking)
- On successful payment, verifies the signature with the backend, then shows an order confirmation page
- Handles payment failure / modal-dismiss gracefully with a retry-friendly error message

## Design

Distinctive editorial look — deep aubergine + blush + rose palette, Fraunces serif headlines + Inter body text. Not a generic template; built specifically for a lingerie brand's tone (soft, considered, not over-decorated).

## Build for production

```bash
npm run build
```

Outputs to `dist/` — deploy that folder to Vercel/Netlify (or any static host).

## Next: Phase 4 (Admin Panel)
