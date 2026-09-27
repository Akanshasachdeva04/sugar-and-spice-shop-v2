import os
import hmac
import hashlib
import razorpay
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.order import Order, Payment
from app.models.product import ProductVariant
from app.schemas.schemas import RazorpayVerify

router = APIRouter(prefix="/payments", tags=["payments"])

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)) if RAZORPAY_KEY_ID else None


@router.post("/create/{order_id}")
def create_razorpay_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "awaiting_payment":
        raise HTTPException(status_code=400, detail="This order can no longer be paid. Please place a new order.")
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay keys not configured on server")

    amount_paise = int(order.total_amount * 100)
    rzp_order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": f"order_{order.id}",
        "payment_capture": 1,
    })

    order.razorpay_order_id = rzp_order["id"]
    db.add(Payment(order_id=order.id, amount=order.total_amount, status="created"))
    db.commit()

    return {
        "razorpay_order_id": rzp_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
    }


@router.post("/verify")
def verify_payment(payload: RazorpayVerify, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == payload.order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # The Razorpay order being confirmed must be the one we created for THIS order
    # (otherwise a payment made for a cheap order could be replayed against an expensive one).
    if not order.razorpay_order_id or payload.razorpay_order_id != order.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment does not match this order")

    # Verify signature: HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    body = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}"
    expected_signature = hmac.new(
        RAZORPAY_KEY_SECRET.encode(), body.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    # Customer paid after we had already released the stock (took very long in the payment popup):
    # take the stock again where possible. The money is already received, so the order is kept as paid.
    if order.status == "abandoned":
        for item in order.items:
            variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
            if variant:
                variant.stock = max(0, variant.stock - item.quantity)

    order.status = "paid"
    payment = (
        db.query(Payment).filter(Payment.order_id == order.id).order_by(Payment.id.desc()).first()
    )
    if payment:
        payment.razorpay_payment_id = payload.razorpay_payment_id
        payment.razorpay_signature = payload.razorpay_signature
        payment.status = "captured"
    db.commit()

    return {"status": "success", "order_id": order.id}
