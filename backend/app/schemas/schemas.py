from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str  # required — signup is OTP-verified on this number
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    is_admin: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Category ----------
class CategoryCreate(BaseModel):
    name: str
    slug: str
    image_url: Optional[str] = None


class CategoryOut(CategoryCreate):
    id: int

    class Config:
        from_attributes = True


# ---------- Product ----------
class ProductVariantCreate(BaseModel):
    size: str
    color: Optional[str] = None
    stock: int = 0
    sku: Optional[str] = None


class ProductVariantOut(ProductVariantCreate):
    id: int

    class Config:
        from_attributes = True


class ProductImageOut(BaseModel):
    id: int
    image_url: str
    is_primary: bool

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    discount_price: Optional[float] = None
    category_id: int
    brand: Optional[str] = None
    variants: List[ProductVariantCreate] = []
    image_urls: List[str] = []


class ProductOut(BaseModel):
    id: int
    product_code: str
    name: str
    slug: str
    description: Optional[str]
    price: float
    discount_price: Optional[float]
    brand: Optional[str]
    is_active: bool
    category: Optional[CategoryOut]
    images: List[ProductImageOut] = []
    variants: List[ProductVariantOut] = []

    class Config:
        from_attributes = True


class ProductListOut(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------- Orders ----------
class OrderItemCreate(BaseModel):
    product_id: int
    variant_id: int
    quantity: int


class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address: str
    phone: str


class OrderItemOut(BaseModel):
    id: int
    product_name: str
    product_code: Optional[str] = None
    size: Optional[str] = None
    image_url: Optional[str] = None
    quantity: int
    price: float

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    total_amount: float
    status: str
    shipping_address: str
    phone: str
    razorpay_order_id: Optional[str]
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


# ---------- Payments ----------
class RazorpayVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: int


# ---------- Banner ----------
class BannerCreate(BaseModel):
    title: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    display_order: int = 0
