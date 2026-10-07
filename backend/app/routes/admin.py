from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
import os
import uuid
import cloudinary
import cloudinary.uploader

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.user import User
from app.models.product import Product, ProductImage, ProductVariant, Category
from app.models.order import Order, Payment, Banner
from app.core.order_cleanup import UNPAID_STATUSES, release_stale_orders
from app.schemas.schemas import (
    ProductCreate, ProductOut, CategoryCreate, CategoryOut, OrderOut, BannerCreate, UserOut
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "")
CLOUDINARY_ENABLED = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

if CLOUDINARY_ENABLED:
    cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )

# Local fallback (dev only — files here don't survive a Render redeploy)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}


# ---------- Image upload (for non-technical admin — no URLs needed) ----------
@router.post("/upload")
async def upload_image(request: Request, file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, or WEBP images are allowed")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    if CLOUDINARY_ENABLED:
        result = cloudinary.uploader.upload(
            contents,
            folder="lingerie-shop",
            resource_type="image",
        )
        return {"url": result["secure_url"], "public_id": result["public_id"]}

    # Fallback: local disk (only for local dev without Cloudinary configured).
    # IMPORTANT: the storefront and admin panel run on a DIFFERENT domain than
    # this backend, so a relative "/uploads/xxx.jpg" URL would 404 there even
    # though it works fine when tested directly against the backend. We build
    # a full absolute URL here (using BACKEND_PUBLIC_URL if set, else the
    # request's own host) so the image loads correctly from any domain.
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(contents)
    base = os.getenv("BACKEND_PUBLIC_URL", "").strip().rstrip("/") or str(request.base_url).rstrip("/")
    return {"url": f"{base}/uploads/{filename}"}


# ---------- Categories ----------
@router.post("/categories", response_model=CategoryOut)
def create_category(payload: CategoryCreate, db: Session = Depends(get_db)):
    if db.query(Category).filter((Category.slug == payload.slug) | (Category.name == payload.name)).first():
        raise HTTPException(status_code=400, detail="A category with this name already exists")
    cat = Category(**payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if db.query(Product).filter(Product.category_id == cat.id).count():
        raise HTTPException(status_code=400, detail="This category still has products. Move or remove them first.")
    db.delete(cat)
    db.commit()
    return {"status": "deleted"}


# ---------- Products ----------
@router.get("/products", response_model=list[ProductOut])
def list_all_products(db: Session = Depends(get_db)):
    return db.query(Product).options(
        joinedload(Product.images), joinedload(Product.variants), joinedload(Product.category)
    ).order_by(Product.created_at.desc()).all()


@router.post("/products", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    if db.query(Product).filter(Product.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="A product with this slug already exists")

    product = Product(
        name=payload.name, slug=payload.slug, description=payload.description,
        price=payload.price, discount_price=payload.discount_price,
        category_id=payload.category_id, brand=payload.brand,
    )
    db.add(product)
    db.flush()  # get product.id before commit

    for idx, url in enumerate(payload.image_urls):
        db.add(ProductImage(product_id=product.id, image_url=url, is_primary=(idx == 0)))
    for v in payload.variants:
        db.add(ProductVariant(product_id=product.id, **v.model_dump()))

    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductCreate, db: Session = Depends(get_db)):
    from app.models.order import OrderItem

    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = payload.name
    product.slug = payload.slug
    product.description = payload.description
    product.price = payload.price
    product.discount_price = payload.discount_price
    product.category_id = payload.category_id
    product.brand = payload.brand

    old_images = db.query(ProductImage).filter(ProductImage.product_id == product.id).all()
    old_urls = {img.image_url for img in old_images}
    new_urls = set(payload.image_urls)
    for url in old_urls - new_urls:
        _delete_upload_file(url)

    db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
    for idx, url in enumerate(payload.image_urls):
        db.add(ProductImage(product_id=product.id, image_url=url, is_primary=(idx == 0)))

    # variants: update in place (old orders point at these rows, so never delete them blindly)
    existing = {
        (v.size, v.color or None): v
        for v in db.query(ProductVariant).filter(ProductVariant.product_id == product.id).all()
    }
    wanted = set()
    for v in payload.variants:
        data = v.model_dump()
        key = (data["size"], data.get("color") or None)
        wanted.add(key)
        if key in existing:
            existing[key].stock = data["stock"]
        else:
            db.add(ProductVariant(product_id=product.id, **data))
    for key, variant in existing.items():
        if key not in wanted:
            used = db.query(OrderItem).filter(OrderItem.variant_id == variant.id).first()
            if used:
                variant.stock = 0
            else:
                db.delete(variant)

    db.commit()
    db.refresh(product)
    return product

@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False  # soft delete (hides from storefront) keeps order history intact
    db.commit()
    return {"status": "deactivated"}


@router.patch("/products/{product_id}/active")
def set_product_active(product_id: int, active: bool, db: Session = Depends(get_db)):
    """Restore a hidden product back to the live storefront."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = active
    db.commit()
    return {"status": "updated", "is_active": product.is_active}


@router.delete("/products/{product_id}/permanent")
def delete_product_permanently(product_id: int, db: Session = Depends(get_db)):
    """Fully erase a product (and its photos) — cannot be undone.
    Blocked if the product appears in any past order, so order history / invoices stay intact;
    hide it (soft delete) instead in that case."""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    from app.models.order import OrderItem
    if db.query(OrderItem).filter(OrderItem.product_id == product.id).first():
        raise HTTPException(
            status_code=400,
            detail="This product has past orders and can't be permanently deleted. Use 'Remove' to hide it instead.",
        )
    image_urls = [img.image_url for img in product.images]
    db.delete(product)
    db.commit()
    for url in image_urls:
        _delete_upload_file(url)
    return {"status": "deleted_permanently"}


@router.patch("/products/{product_id}/stock/{variant_id}")
def update_stock(product_id: int, variant_id: int, stock: int, db: Session = Depends(get_db)):
    if stock < 0:
        raise HTTPException(status_code=400, detail="Stock cannot be negative")
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id, ProductVariant.product_id == product_id
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    variant.stock = stock
    db.commit()
    return {"status": "updated", "stock": variant.stock}


def _delete_upload_file(image_url: str) -> None:
    """Best-effort delete of a product image when it's replaced/removed —
    works for both Cloudinary-hosted and (legacy) local-disk images."""
    if not image_url:
        return
    if "res.cloudinary.com" in image_url or "cloudinary.com" in image_url:
        if not CLOUDINARY_ENABLED:
            return
        try:
            # Extract public_id from a Cloudinary URL, e.g.
            # https://res.cloudinary.com/<cloud>/image/upload/v123/lingerie-shop/<id>.jpg
            after_upload = image_url.split("/upload/", 1)[1]
            parts = after_upload.split("/")
            if parts and parts[0].startswith("v") and parts[0][1:].isdigit():
                parts = parts[1:]
            public_id = "/".join(parts)
            public_id = os.path.splitext(public_id)[0]
            cloudinary.uploader.destroy(public_id, resource_type="image")
        except Exception:
            pass  # never block the request over a cleanup failure
        return

    if "/uploads/" not in image_url:
        return  # external URL — nothing on our disk to clean up
    filename = os.path.basename(image_url)
    filepath = os.path.join(UPLOAD_DIR, filename)
    try:
        if os.path.isfile(filepath):
            os.remove(filepath)
    except OSError:
        pass  # never block the request over a cleanup failure


# ---------- Orders ----------
@router.get("/orders", response_model=list[OrderOut])
def list_all_orders(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Only orders that were actually paid for. Unpaid checkouts ("awaiting_payment"/"abandoned") are never listed."""
    release_stale_orders(db)
    q = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.status.notin_(UNPAID_STATUSES))
        .order_by(Order.created_at.desc())
    )
    if status:
        q = q.filter(Order.status == status)
    return q.all()


@router.get("/orders/export")
def export_orders_csv(status: Optional[str] = None, db: Session = Depends(get_db)):
    import csv
    import io
    from fastapi.responses import StreamingResponse

    release_stale_orders(db)
    q = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.status.notin_(UNPAID_STATUSES))
        .order_by(Order.created_at.desc())
    )
    if status:
        q = q.filter(Order.status == status)
    orders = q.all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Order ID", "Date", "Status", "Amount (INR)", "Phone", "Shipping Address", "Items", "Razorpay Order ID"])
    for o in orders:
        items_summary = "; ".join(f"{i.product_name} [{i.product_code}] x{i.quantity}" for i in o.items)
        writer.writerow([
            o.id, o.created_at.strftime("%Y-%m-%d %H:%M"), o.status, o.total_amount,
            o.phone, o.shipping_address, items_summary, o.razorpay_order_id or "",
        ])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders_export.csv"},
    )


@router.patch("/orders/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    valid_statuses = {"paid", "shipped", "delivered", "cancelled", "refunded"}
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid_statuses}")
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = status
    db.commit()
    return {"status": "updated", "order_status": order.status}


# ---------- Payments ----------
@router.get("/payments")
def list_payments(db: Session = Depends(get_db)):
    # hide payment attempts that never completed (popup opened and closed)
    payments = (
        db.query(Payment)
        .options(joinedload(Payment.order))
        .filter(Payment.status.notin_(["created", "abandoned"]))
        .order_by(Payment.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "order_id": p.order_id,
            "amount": p.amount,
            "status": p.status,
            "razorpay_payment_id": p.razorpay_payment_id,
            "created_at": p.created_at,
        }
        for p in payments
    ]


@router.patch("/payments/{payment_id}/refund")
def mark_refunded(payment_id: int, db: Session = Depends(get_db)):
    """Marks payment as refunded in our records. Actual refund must be triggered in Razorpay dashboard or via their refund API."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = "refunded"
    if payment.order:
        payment.order.status = "refunded"
    db.commit()
    return {"status": "marked_refunded"}


# ---------- Users ----------
@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).filter(User.is_admin == False).order_by(User.created_at.desc()).all()


@router.get("/users/{user_id}")
def get_user_detail(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    orders = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == user.id, Order.status.notin_(UNPAID_STATUSES))
        .order_by(Order.created_at.desc())
        .all()
    )
    total_spent = sum(o.total_amount for o in orders if o.status in ("paid", "shipped", "delivered"))
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "is_active": user.is_active,
        "total_orders": len(orders),
        "total_spent": round(total_spent, 2),
        "orders": [
            {
                "id": o.id,
                "total_amount": o.total_amount,
                "status": o.status,
                "created_at": o.created_at,
                "item_count": len(o.items),
            }
            for o in orders
        ],
    }


@router.patch("/users/{user_id}/active")
def set_user_active(user_id: int, active: bool, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    user.is_active = active
    db.commit()
    return {"status": "updated", "is_active": user.is_active}


# ---------- Banners ----------
@router.get("/banners")
def list_banners(db: Session = Depends(get_db)):
    return db.query(Banner).order_by(Banner.display_order).all()


@router.post("/banners")
def create_banner(payload: BannerCreate, db: Session = Depends(get_db)):
    banner = Banner(**payload.model_dump())
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return banner


@router.patch("/banners/{banner_id}")
def update_banner(banner_id: int, payload: BannerCreate, db: Session = Depends(get_db)):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    old_image = banner.image_url
    banner.title = payload.title
    banner.image_url = payload.image_url
    banner.link_url = payload.link_url
    banner.display_order = payload.display_order
    db.commit()
    db.refresh(banner)
    if old_image != payload.image_url:
        _delete_upload_file(old_image)
    return banner


@router.delete("/banners/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    db.delete(banner)
    db.commit()
    _delete_upload_file(banner.image_url)
    return {"status": "deleted"}


# ---------- Analytics ----------
@router.get("/analytics/summary")
def analytics_summary(db: Session = Depends(get_db)):
    release_stale_orders(db)
    real = Order.status.notin_(UNPAID_STATUSES)   # only orders that were actually paid for
    total_orders = db.query(func.count(Order.id)).filter(real).scalar()
    total_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0)).filter(Order.status.in_(["paid", "shipped", "delivered"])).scalar()
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    total_users = db.query(func.count(User.id)).filter(User.is_admin == False).scalar()
    # "pending_orders" = paid orders the admin still has to ship
    pending_orders = db.query(func.count(Order.id)).filter(Order.status == "paid").scalar()
    low_stock = db.query(func.count(ProductVariant.id)).filter(ProductVariant.stock <= 5).scalar()

    return {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue or 0, 2),
        "total_products": total_products,
        "total_users": total_users,
        "pending_orders": pending_orders,
        "low_stock_variants": low_stock,
    }
