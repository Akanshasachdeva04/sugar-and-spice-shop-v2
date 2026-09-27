from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.product import Product, ProductVariant
from app.models.order import Order, OrderItem
from app.schemas.schemas import OrderCreate, OrderOut
from app.core.order_cleanup import release_order, release_stale_orders, UNPAID_STATUSES

router = APIRouter(prefix="/orders", tags=["orders"])

FREE_SHIPPING_THRESHOLD = 999
SHIPPING_FEE = 119


@router.post("", response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    # free up stock held by people who opened checkout and never paid
    release_stale_orders(db)

    total = 0.0
    order_items = []
    for item in payload.items:
        variant = db.query(ProductVariant).filter(ProductVariant.id == item.variant_id).first()
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not variant or not product:
            raise HTTPException(status_code=404, detail=f"Product/variant {item.product_id} not found")
        if variant.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name} ({variant.size})")

        price = product.discount_price or product.price
        total += price * item.quantity
        order_items.append(OrderItem(
            product_id=product.id,
            variant_id=variant.id,
            product_name=f"{product.name} ({variant.size}{'/' + variant.color if variant.color else ''})",
            quantity=item.quantity,
            price=price,
        ))
        # reserve stock
        variant.stock -= item.quantity

    # Match the storefront's cart/checkout shipping rule so the amount charged
    # via Razorpay is exactly what the customer was shown, not just the subtotal.
    shipping = 0.0 if total >= FREE_SHIPPING_THRESHOLD else SHIPPING_FEE
    total += shipping

    order = Order(
        user_id=user.id,
        total_amount=round(total, 2),
        shipping_address=payload.shipping_address,
        phone=payload.phone,
        status="awaiting_payment",  # becomes "paid" only after Razorpay verification
        items=order_items,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=list[OrderOut])
def my_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Order).options(joinedload(Order.items)).filter(Order.user_id == user.id, Order.status.notin_(UNPAID_STATUSES)).order_by(Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/{order_id}/abort")
def abort_unpaid_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Called when the customer closes the payment popup without paying. Releases the reserved stock."""
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "awaiting_payment":
        release_order(db, order)
        db.commit()
    return {"status": order.status}
