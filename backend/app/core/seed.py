"""Runs on every backend start. Only creates what is missing — never overwrites your data."""
import os

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.product import Category
from app.models.user import User

# Slugs here MUST match the links on the storefront (Home page + header menu).
DEFAULT_CATEGORIES = [
    ("Bra", "bra"),
    ("Panty", "panty"),
    ("Thongs", "thongs"),
    ("Nightwear", "nightwear"),
    ("Bodysuit", "bodysuit"),
    ("Swimsuit", "swimsuit"),
    ("Bikini", "bikini"),
    ("Sets", "sets"),
    ("Clothes", "clothes"),
    ("Accessories", "accessories"),
    ("Goodies", "goodies"),
]


def seed_categories(db: Session) -> None:
    existing = {c.slug for c in db.query(Category).all()}
    for name, slug in DEFAULT_CATEGORIES:
        if slug not in existing:
            db.add(Category(name=name, slug=slug))
    db.commit()


def seed_admin(db: Session) -> None:
    email = os.getenv("ADMIN_EMAIL", "meenutandon@gmail.com").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "meenu123@")
    name = os.getenv("ADMIN_NAME", "Meenu")

    user = db.query(User).filter(User.email == email).first()
    if user:
        if not user.is_admin:
            user.is_admin = True
            db.commit()
        return  # already exists — password is NOT touched (change it from Admin > Settings)
    db.add(User(name=name, email=email, hashed_password=hash_password(password), is_admin=True))
    db.commit()
