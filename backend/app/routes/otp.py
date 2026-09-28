import os
import time
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth/otp", tags=["otp"])

TWOFACTOR_API_KEY = os.getenv("TWOFACTOR_API_KEY", "")
TWOFACTOR_BASE = "https://2factor.in/API/V1"

# phone -> {"session_id": str, "created_at": float, "purpose": str, "attempts": int}
# NOTE: in-memory store = resets on server restart.
_otp_sessions: dict[str, dict] = {}

OTP_TTL_SECONDS = 5 * 60
RESEND_COOLDOWN_SECONDS = 30
MAX_VERIFY_ATTEMPTS = 5

# Purposes the PUBLIC /auth/otp/* endpoints accept. "reset" is only ever
# triggered through /auth/forgot-password + /auth/reset-password.
PUBLIC_PURPOSES = ("signup", "login")


class SendOtpRequest(BaseModel):
    phone: str
    purpose: str


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str
    purpose: str


def _clean_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if len(digits) == 10:
        return digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits[2:]
    raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")


def send_otp_sms(phone_raw: str, purpose: str) -> str:
    """Send an OTP via 2Factor. Returns the cleaned 10-digit phone."""
    if not TWOFACTOR_API_KEY:
        raise HTTPException(status_code=500, detail="OTP service not configured on server")

    phone = _clean_phone(phone_raw)

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
        "purpose": purpose,
        "attempts": 0,
    }
    return phone


def check_otp(phone_raw: str, otp: str, purpose: str) -> str:
    """Verify an OTP for phone+purpose. On success the session is consumed and
    the cleaned phone is returned; otherwise raises HTTPException."""
    if not TWOFACTOR_API_KEY:
        raise HTTPException(status_code=500, detail="OTP service not configured on server")

    phone = _clean_phone(phone_raw)
    session = _otp_sessions.get(phone)
    if not session or session["purpose"] != purpose:
        raise HTTPException(status_code=400, detail="Request a new OTP first")

    if time.time() - session["created_at"] > OTP_TTL_SECONDS:
        del _otp_sessions[phone]
        raise HTTPException(status_code=400, detail="OTP expired, please request a new one")

    session["attempts"] = session.get("attempts", 0) + 1
    if session["attempts"] > MAX_VERIFY_ATTEMPTS:
        del _otp_sessions[phone]
        raise HTTPException(status_code=429, detail="Too many wrong attempts, please request a new OTP")

    url = f"{TWOFACTOR_BASE}/{TWOFACTOR_API_KEY}/SMS/VERIFY/{session['session_id']}/{otp}"
    try:
        resp = httpx.get(url, timeout=10)
        data = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Could not reach OTP provider")

    if data.get("Status") != "Success" or data.get("Details") != "OTP Matched":
        raise HTTPException(status_code=400, detail="Incorrect OTP")

    del _otp_sessions[phone]
    return phone


@router.post("/send")
def send_otp(payload: SendOtpRequest):
    if payload.purpose not in PUBLIC_PURPOSES:
        raise HTTPException(status_code=400, detail="Invalid purpose")
    phone = send_otp_sms(payload.phone, payload.purpose)
    return {"status": "otp_sent", "phone": phone}


@router.post("/verify")
def verify_otp(payload: VerifyOtpRequest):
    if payload.purpose not in PUBLIC_PURPOSES:
        raise HTTPException(status_code=400, detail="Invalid purpose")
    phone = check_otp(payload.phone, payload.otp, payload.purpose)
    _verified[phone] = {"purpose": payload.purpose, "verified_at": time.time()}
    return {"status": "verified", "phone": phone}


# phone -> {"purpose", "verified_at"} - short-lived proof that OTP passed,
# checked by /auth/register and /auth/login.
_verified: dict[str, dict] = {}
VERIFIED_TTL_SECONDS = 10 * 60


def consume_verified_phone(phone: str, purpose: str) -> bool:
    """Returns True and consumes the record if OTP was passed recently."""
    phone = _clean_phone(phone)
    record = _verified.get(phone)
    if not record or record["purpose"] != purpose:
        return False
    if time.time() - record["verified_at"] > VERIFIED_TTL_SECONDS:
        del _verified[phone]
        return False
    del _verified[phone]
    return True
