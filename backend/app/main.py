import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.database import Base, engine, SessionLocal
from app.core.seed import seed_categories, seed_admin
from app.core.order_cleanup import migrate_legacy_pending, release_stale_orders
from app import models  # noqa: F401 — ensures models are registered before create_all
from app.routes import auth, products, orders, payments, admin, otp

Base.metadata.create_all(bind=engine)

_db = SessionLocal()
try:
    seed_categories(_db)
    seed_admin(_db)
    migrate_legacy_pending(_db)   # old unpaid "pending" orders -> hidden "awaiting_payment"
    release_stale_orders(_db)
finally:
    _db.close()



async def _cleanup_loop():
    """Every 10 minutes: close unpaid orders older than 30 min and give their stock back."""
    while True:
        await asyncio.sleep(600)
        db = SessionLocal()
        try:
            release_stale_orders(db)
        except Exception:
            db.rollback()
        finally:
            db.close()


@asynccontextmanager
async def lifespan(_app):
    task = asyncio.create_task(_cleanup_loop())
    yield
    task.cancel()


app = FastAPI(title="Lingerie Shop API", version="1.0.0", lifespan=lifespan)

_origins_env = os.getenv("FRONTEND_ORIGINS", "").strip()
if _origins_env:
    _allowed_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]
else:
    # Dev fallback only. In production set FRONTEND_ORIGINS in .env, e.g.
    # FRONTEND_ORIGINS=https://yourshop.com,https://admin.yourshop.com
    _allowed_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(admin.router)
app.include_router(otp.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Lingerie Shop API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
