from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    image_url = Column(String(500), nullable=True)

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(200), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    discount_price = Column(Float, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"))
    brand = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("Category", back_populates="products")
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.id")
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan", order_by="ProductVariant.id")

    @property
    def product_code(self) -> str:
        """Human-readable code shown to the admin/customer, e.g. BRA-00123.
        Derived from the category name + id â€” never stored, so it needs no
        database migration and always matches the current category."""
        source = self.category.name if self.category else "PRD"
        prefix = "".join(ch for ch in source if ch.isalnum()).upper()[:3] or "PRD"
        return f"{prefix}-{self.id:05d}"


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    image_url = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)

    product = relationship("Product", back_populates="images")


class ProductVariant(Base):
    """Size + color combination with its own stock count."""
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    size = Column(String(20), nullable=False)   # e.g. S, M, L, 32B, 34C
    color = Column(String(50), nullable=True)
    stock = Column(Integer, default=0)
    sku = Column(String(100), unique=True, nullable=True)

    product = relationship("Product", back_populates="variants")
