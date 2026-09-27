"""
Unpaid-order housekeeping.

Flow now:
  1. Customer clicks "Pay"  -> order is created with status "awaiting_payment" (stock is reserved)
  2. Payment succeeds       -> status becomes "paid"  (ONLY now does the admin see it)
  3. Customer closes Razorpay / never pays -> order becomes "abandoned" and stock goes back

"awaiting_payment" and "abandoned" orders are never shown to the admin or counted in analytics.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.order import Order, Payment
from app.models.product import ProductVariant

UNPAID_STATUSES = ("awaiting_payment", "abandoned")
STALE_AFTER_MINUTES = 30


def release_order(db: Session, order: Order, new_status: str = "abandoned") -> None:
    """Give reserved stock back and close an unpaid order. Caller must commit."""
    if order.status != "awaiting_payment":
        return
    for item in order.items:
        variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
        if variant:
            variant.stock += item.quantity
    order.status = new_status
    db.query(Payment).filter(Payment.order_id == order.id, Payment.status == "created").update(
        {"status": "abandoned"}
    )


def release_stale_orders(db: Session) -> int:
    """Close every unpaid order older than STALE_AFTER_MINUTES. Returns how many were closed."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=STALE_AFTER_MINUTES)
    stale = (
        db.query(Order)
        .filter(Order.status == "awaiting_payment", Order.created_at < cutoff)
        .all()
    )
    for order in stale:
        release_order(db, order)
    if stale:
        db.commit()
    return len(stale)


def migrate_legacy_pending(db: Session) -> int:
    """
    Old versions saved unpaid orders as "pending". A real paid order is always "paid",
    so every "pending" order is really an unpaid one. Move them to "awaiting_payment";
    the stale cleanup then releases their stock and hides them from the admin.
    """
    n = db.query(Order).filter(Order.status == "pending").update({"status": "awaiting_payment"})
    if n:
        db.commit()
    return n
