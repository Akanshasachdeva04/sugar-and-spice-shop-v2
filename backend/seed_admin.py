"""
Create a new admin OR reset an existing admin's password.
Usage: python seed_admin.py     (or double-click create-admin.bat)
"""
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User

db = SessionLocal()

email = input("Admin email: ").strip().lower()
password = input("New password: ").strip()

user = db.query(User).filter(User.email == email).first()
if user:
    user.hashed_password = hash_password(password)
    user.is_admin = True
    db.commit()
    print(f"Password updated for {email}")
else:
    name = input("Admin name: ").strip() or "Admin"
    db.add(User(name=name, email=email, hashed_password=hash_password(password), is_admin=True))
    db.commit()
    print(f"Admin account created: {email}")

db.close()
