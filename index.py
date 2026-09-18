import sys
import os

# Make the project root importable so `from app import app` works
# regardless of Vercel's working directory during the build.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: E402  (Vercel's Python runtime needs this "app" object)
