import os
import time
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth/otp", tags=["otp"])

TWOFACTOR_API_KEY = os.getenv("TWOFACTOR_API_KEY", "")
TWOFACTOR_BASE = "https://2factor.in/API/V1"

# phone -> {"session_id": str, "created_at": float, "purpose": "signup"|"login"}
# NOTE: in-memory store = resets on server restart and won't work across
# multiple backend processes/workers. Fine for a single-process dev/small
# deployment; move to a DB table (or Redis) before scaling to >1 worker.
_otp_sessions: dict[str, dict] = {}

OTP_TTL_SECONDS = 5 * 60  # 2Factor OTPs are valid ~5 min on their side too
RESEND_COOLDOWN_SECONDS = 30


class SendOtpRequest(BaseModel):
    phone: str          # 10-digit Indian mobile number, no country code
    purpose: str        # "signup" or "login"


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    purpose: str


def _clean_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10:
        return digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")


@router.post("/send")
def send_otp(payload: SendOtpRequest):
    if not TWOFACTOR_API_KEY:
        raise HTTPException(status_code=500, detail="OTP service not configured on server")
    if payload.purpose not in ("signup", "login"):
        raise HTTPException(status_code=400, detail="Invalid purpose")

    phone = _clean_phone(payload.phone)

    existing = _otp_sessions.get(phone)
    if existing and time.time() - existing["created_at"] < RESEND_COOLDOWN_SECONDS:
        wait = int(RESEND_COOLDOWN_SECONDS - (time.time() - existing["created_at"]))
        raise HTTPException(status_code=429, detail=f"Please wait {wait}s before requesting another OTP")

    url = f"{TWOFACTOR_BASE}/{TWOFACTOR_API_KEY}/SMS/{phone}/AUTOGEN"
    try:
        resp = httpx.get(url, timeout=10)
        data = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach OTP provider")

    if data.get("Status") != "Success":
        raise HTTPException(status_code=502, detail=data.get("Details", "Failed to send OTP"))

    _otp_sessions[phone] = {
        "session_id": data["Details"],
        "created_at": time.time(),
        "purpose": payload.purpose,
    }
    return {"status": "otp_sent", "phone": phone}


@router.post("/verify")
def verify_otp(payload: VerifyOtpRequest):
    if not TWOFACTOR_API_KEY:
        raise HTTPException(status_code=500, detail="OTP service not configured on server")

    phone = _clean_phone(payload.phone)
    session = _otp_sessions.get(phone)
    if not session or session["purpose"] != payload.purpose:
        raise HTTPException(status_code=400, detail="Request a new OTP first")

    if time.time() - session["created_at"] > OTP_TTL_SECONDS:
        del _otp_sessions[phone]
        raise HTTPException(status_code=400, detail="OTP expired, please request a new one")

    url = f"{TWOFACTOR_BASE}/{TWOFACTOR_API_KEY}/SMS/VERIFY/{session['session_id']}/{payload.otp}"
    try:
        resp = httpx.get(url, timeout=10)
        data = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach OTP provider")

    if data.get("Status") != "Success" or data.get("Details") != "OTP Matched":
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    # OTP correct — consume it so it can't be replayed, and mark this
    # phone+purpose as verified for a short window so /auth/register or
    # /auth/login can check it.
    del _otp_sessions[phone]
    _verified[phone] = {"purpose": payload.purpose, "verified_at": time.time()}
    return {"status": "verified", "phone": phone}


# phone -> {"purpose", "verified_at"} — short-lived proof that OTP passed,
# checked by /auth/register and /auth/login. Same in-memory caveat as above.
_verified: dict[str, dict] = {}
VERIFIED_TTL_SECONDS = 10 * 60


def consume_verified_phone(phone: str, purpose: str) -> bool:
    """Call this from /auth/register or /auth/login to confirm OTP was passed
    for this phone+purpose recently. Returns True and consumes the record if valid."""
    phone = _clean_phone(phone)
    record = _verified.get(phone)
    if not record or record["purpose"] != purpose:
        return False
    if time.time() - record["verified_at"] > VERIFIED_TTL_SECONDS:
        del _verified[phone]
        return False
    del _verified[phone]
    return True
