# Load backend/.env before anything else reads os.getenv (SECRET_KEY, Razorpay keys, DATABASE_URL...)
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
