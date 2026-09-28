from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.schemas import UserCreate, UserLogin, Token, UserOut, PasswordChange, ForgotPassword, ResetPassword
from app.routes.otp import consume_verified_phone, send_otp_sms, check_otp

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if not consume_verified_phone(payload.phone, "signup"):
        raise HTTPException(
            status_code=400,
            detail="Please verify your phone number with OTP before registering",
        )
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login")
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Admin accounts (seeded, no OTP flow in the admin panel) skip phone OTP.
    if user.is_admin:
        token = create_access_token({"sub": str(user.id)})
        return Token(access_token=token, user=UserOut.model_validate(user))

    if not user.phone:
        raise HTTPException(status_code=400, detail="No phone number on this account. Contact support.")

    if not consume_verified_phone(user.phone, "login"):
        # Password is correct but OTP step hasn't been completed yet.
        # Frontend should now call POST /auth/otp/send with this phone
        # (purpose="login"), have the user enter the code, call
        # POST /auth/otp/verify, then retry this same /auth/login call —
        # it will succeed on the second pass since the OTP is now verified.
        return {"status": "otp_required", "phone": user.phone}

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(payload: PasswordChange, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is wrong")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"status": "password_changed"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or user.is_admin or not user.phone:
        raise HTTPException(status_code=404, detail="No account found with this email")
    phone = send_otp_sms(user.phone, "reset")
    return {"status": "otp_sent", "phone_hint": "******" + phone[-4:]}


@router.post("/reset-password")
def reset_password(payload: ResetPassword, db: Session = Depends(get_db)):
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or user.is_admin or not user.phone:
        raise HTTPException(status_code=400, detail="Invalid request")
    check_otp(user.phone, payload.otp, "reset")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"status": "password_reset"}
