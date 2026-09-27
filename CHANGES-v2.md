# Sugar & Spice — v2 changes

## 1. Unpaid orders no longer show in admin  (backend)
Cause: the order was being saved when the customer clicked **Pay**, before payment — with status `pending` —
and the admin list showed every order.

Now:
- Click **Pay** -> order saved as `awaiting_payment` (hidden from admin, dashboard, customer "My orders"; stock held).
- Payment success -> `paid` -> **only now** it appears in admin (as "New (Paid)").
- Popup closed / payment abandoned -> `abandoned`, stock returned automatically.
- Anything left `awaiting_payment` for 30 min is closed automatically (checked every 10 min + on every admin load).
- Old `pending` rows in your existing database are converted automatically on first start.
- Payments page hides "created"/abandoned attempts; dashboard counts only paid orders.
- Security fix: `/payments/verify` now checks the Razorpay order id belongs to that order.

## 2. Myntra-style filters  (backend `/filters`, `/products` + storefront)
- Category, Brand, Price slider (real selling price), Size, Color (swatches), Discount %, In stock, On sale
- Multi-select everywhere, live counts, options that would give 0 results disappear
- Applied-filter chips with ✕, "Clear all"
- Sort: What's New, Better Discount, Price low/high, A–Z
- Desktop: sticky sidebar. Mobile: bottom SORT | FILTER bar, full-screen filter sheet with left menu, "Show N items" button

## 3. Mobile-friendly storefront
Header (always-visible search, hides on scroll), category pills, 2-column product grid, swipeable product photos +
sticky Add-to-bag bar, cart with free-shipping progress + sticky checkout bar, checkout with sticky Pay button,
16px inputs (no iPhone zoom), bigger tap targets.

## 4. Admin on phone
Slide-in menu, orders shown as cards, tables scroll sideways, "New (Paid)" filter tab, tap-to-call phone.
