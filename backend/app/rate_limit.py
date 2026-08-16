"""Shared slowapi rate limiter instance.

Kept in its own module (rather than app.main) so routers can import and
apply @limiter.limit(...) decorators to specific endpoints without creating
a circular import with app.main (which imports the routers).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.config import settings

_storage_uri = (settings.RATE_LIMIT_STORAGE_URI or "").strip()
limiter = Limiter(key_func=get_remote_address, storage_uri=_storage_uri) if _storage_uri else Limiter(key_func=get_remote_address)
