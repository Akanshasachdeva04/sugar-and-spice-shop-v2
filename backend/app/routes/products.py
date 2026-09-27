from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
import math
from sqlalchemy import or_, and_, asc, desc, func, case
from typing import Optional

from app.core.database import get_db
from app.models.product import Product, Category, ProductVariant
from app.schemas.schemas import ProductOut, CategoryOut, ProductListOut

router = APIRouter(tags=["catalog"])

# Price the customer actually pays: the discount price when there is a real discount, else the normal price.
EFFECTIVE_PRICE = case(
    (and_(Product.discount_price.isnot(None), Product.discount_price < Product.price), Product.discount_price),
    else_=Product.price,
)
# Discount percentage (0-100) as a SQL expression
DISCOUNT_PCT = case(
    (and_(Product.discount_price.isnot(None), Product.discount_price < Product.price, Product.price > 0),
     (Product.price - Product.discount_price) * 100.0 / Product.price),
    else_=0.0,
)

SORT_OPTIONS = {
    "newest": desc(Product.created_at),
    "price_asc": asc(EFFECTIVE_PRICE),
    "price_desc": desc(EFFECTIVE_PRICE),
    "discount": desc(DISCOUNT_PCT),
    "name_asc": asc(Product.name),
}
SORT_PATTERN = "^(" + "|".join(SORT_OPTIONS.keys()) + ")$"


def _csv(value: Optional[str]) -> list[str]:
    return [x.strip() for x in (value or "").split(",") if x.strip()]


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


# ---------- Filter helpers (Myntra-style facets) ----------
def _eff_price(p: Product) -> float:
    if p.discount_price is not None and p.discount_price < p.price:
        return p.discount_price
    return p.price


def _disc_pct(p: Product) -> float:
    if p.discount_price is not None and p.discount_price < p.price and p.price > 0:
        return (p.price - p.discount_price) * 100.0 / p.price
    return 0.0


def _size_key(sz: str):
    order = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "FREE SIZE", "FREE"]
    u = sz.upper()
    if u in order:
        return (0, order.index(u), u)
    return (1, 0, u)


def _matches(p: Product, f: dict, skip: Optional[str] = None) -> bool:
    """Does product p pass every active filter (except the one named in `skip`)?"""
    if skip != "category" and f["cats"]:
        if not p.category or p.category.slug.lower() not in f["cats"]:
            return False
    if skip != "brand" and f["brands"]:
        if (p.brand or "").lower() not in f["brands"]:
            return False
    if skip != "price":
        price = _eff_price(p)
        if f["min_price"] is not None and price < f["min_price"]:
            return False
        if f["max_price"] is not None and price > f["max_price"]:
            return False
    if skip != "discount" and f["discount"] and _disc_pct(p) < f["discount"]:
        return False
    if skip != "sale" and f["on_sale"] and _disc_pct(p) <= 0:
        return False
    # size / color / stock must all hold on ONE variant (e.g. size S in Black, in stock)
    need_size = skip != "size" and f["sizes"]
    need_color = skip != "color" and f["colors"]
    need_stock = skip != "stock" and f["in_stock"]
    if need_size or need_color or need_stock:
        if not any(_variant_ok(v, f, need_size, need_color, need_stock) for v in p.variants):
            return False
    return True


def _variant_ok(v: ProductVariant, f: dict, need_size, need_color, need_stock) -> bool:
    if need_size and (v.size or "").strip().lower() not in f["sizes"]:
        return False
    if need_color and (v.color or "").strip().lower() not in f["colors"]:
        return False
    if need_stock and v.stock <= 0:
        return False
    return True


@router.get("/filters")
def get_filters(
    category_slug: Optional[str] = None,   # comma separated
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sizes: Optional[str] = None,
    colors: Optional[str] = None,
    brand: Optional[str] = None,          # comma separated
    discount: Optional[float] = None,
    in_stock: bool = False,
    on_sale: bool = False,
    db: Session = Depends(get_db),
):
    """
    Options for the storefront filters, with live counts.
    Just like Myntra, each group's counts reflect all OTHER selected filters
    (so you never see an option that would lead to 0 results).
    """
    q = db.query(Product).options(
        joinedload(Product.variants), joinedload(Product.category)
    ).filter(Product.is_active == True)
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.name.ilike(like), Product.brand.ilike(like), Product.description.ilike(like)))
    products = q.all()

    f = {
        "cats": [c.lower() for c in _csv(category_slug)],
        "brands": [b.lower() for b in _csv(brand)],
        "sizes": [x.lower() for x in _csv(sizes)],
        "colors": [x.lower() for x in _csv(colors)],
        "min_price": min_price, "max_price": max_price,
        "discount": discount or 0, "in_stock": in_stock, "on_sale": on_sale,
    }

    # categories
    cat_counts, cat_names = {}, {}
    for p in products:
        if p.category and _matches(p, f, skip="category"):
            cat_counts[p.category.slug] = cat_counts.get(p.category.slug, 0) + 1
            cat_names[p.category.slug] = p.category.name
    categories = [{"slug": k, "name": cat_names[k], "count": v} for k, v in sorted(cat_counts.items(), key=lambda kv: cat_names[kv[0]])]

    # brands
    brand_counts = {}
    for p in products:
        if p.brand and _matches(p, f, skip="brand"):
            brand_counts[p.brand] = brand_counts.get(p.brand, 0) + 1
    brands = [{"name": k, "count": v} for k, v in sorted(brand_counts.items(), key=lambda kv: kv[0].lower())]

    # sizes and colors (count products, not variants)
    size_counts, color_counts = {}, {}
    for p in products:
        if _matches(p, f, skip="size"):
            seen = set()
            for v in p.variants:
                sz = (v.size or "").strip()
                if not sz or sz in seen:
                    continue
                if f["colors"] and (v.color or "").strip().lower() not in f["colors"]:
                    continue
                if f["in_stock"] and v.stock <= 0:
                    continue
                seen.add(sz)
                size_counts[sz] = size_counts.get(sz, 0) + 1
        if _matches(p, f, skip="color"):
            seen = set()
            for v in p.variants:
                col = (v.color or "").strip()
                if not col or col in seen:
                    continue
                if f["sizes"] and (v.size or "").strip().lower() not in f["sizes"]:
                    continue
                if f["in_stock"] and v.stock <= 0:
                    continue
                seen.add(col)
                color_counts[col] = color_counts.get(col, 0) + 1
    sizes_out = [{"name": k, "count": size_counts[k]} for k in sorted(size_counts, key=_size_key)]
    colors_out = [{"name": k, "count": color_counts[k]} for k in sorted(color_counts, key=str.lower)]

    # price range (ignoring the price filter itself so the slider keeps its full range)
    prices = [_eff_price(p) for p in products if _matches(p, f, skip="price")]

    # discount buckets
    discount_opts = []
    for pct in (10, 20, 30, 40, 50):
        n = sum(1 for p in products if _matches(p, f, skip="discount") and _disc_pct(p) >= pct)
        if n:
            discount_opts.append({"value": pct, "count": n})

    on_sale_count = sum(1 for p in products if _matches(p, f, skip="sale") and _disc_pct(p) > 0)
    in_stock_count = sum(
        1 for p in products if _matches(p, f, skip="stock") and any(v.stock > 0 for v in p.variants)
    )

    return {
        "total": sum(1 for p in products if _matches(p, f)),
        "categories": categories,
        "brands": brands,
        "sizes": sizes_out,
        "colors": colors_out,
        "discounts": discount_opts,
        "on_sale_count": on_sale_count,
        "in_stock_count": in_stock_count,
        "min_price": math.floor(min(prices)) if prices else None,
        "max_price": math.ceil(max(prices)) if prices else None,
    }


@router.get("/products", response_model=ProductListOut)
def list_products(
    category_slug: Optional[str] = None,   # one or several slugs, comma separated
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sizes: Optional[str] = None,      # comma separated, e.g. "S,M,34B"
    colors: Optional[str] = None,     # comma separated, e.g. "Black,Red"
    brand: Optional[str] = None,      # one or several brands, comma separated
    discount: Optional[float] = None, # minimum discount %, e.g. 30
    in_stock: bool = False,
    on_sale: bool = False,
    sort: str = Query("newest", pattern=SORT_PATTERN),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Product).options(
        joinedload(Product.images), joinedload(Product.variants), joinedload(Product.category)
    ).filter(Product.is_active == True)

    cat_list = [c.lower() for c in _csv(category_slug)]
    if cat_list:
        q = q.join(Category).filter(func.lower(Category.slug).in_(cat_list))
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Product.name.ilike(like), Product.brand.ilike(like), Product.description.ilike(like)))
    brand_list = [b.lower() for b in _csv(brand)]
    if brand_list:
        q = q.filter(func.lower(Product.brand).in_(brand_list))
    if min_price is not None:
        q = q.filter(EFFECTIVE_PRICE >= min_price)
    if max_price is not None:
        q = q.filter(EFFECTIVE_PRICE <= max_price)
    if discount:
        q = q.filter(DISCOUNT_PCT >= discount)

    size_list = _csv(sizes)
    color_list = _csv(colors)
    if size_list or color_list or in_stock:
        vq = db.query(ProductVariant.product_id)
        if size_list:
            vq = vq.filter(func.lower(ProductVariant.size).in_([x.lower() for x in size_list]))
        if color_list:
            vq = vq.filter(func.lower(ProductVariant.color).in_([x.lower() for x in color_list]))
        if in_stock:
            vq = vq.filter(ProductVariant.stock > 0)
        q = q.filter(Product.id.in_(vq))
    if on_sale:
        q = q.filter(DISCOUNT_PCT > 0)

    total = q.count()
    items = q.order_by(SORT_OPTIONS[sort], desc(Product.id)).offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/products/{slug}", response_model=ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = db.query(Product).options(
        joinedload(Product.images), joinedload(Product.variants), joinedload(Product.category)
    ).filter(Product.slug == slug, Product.is_active == True).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.get("/products/{slug}/related", response_model=list[ProductOut])
def get_related_products(slug: str, limit: int = Query(4, ge=1, le=12), db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.slug == slug).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    q = db.query(Product).options(
        joinedload(Product.images), joinedload(Product.variants), joinedload(Product.category)
    ).filter(
        Product.is_active == True,
        Product.id != product.id,
        Product.category_id == product.category_id,
    ).limit(limit)
    return q.all()
