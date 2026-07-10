"""Shared slowapi rate limiter instance.

Kept in its own module (rather than app.main) so routers can import and
apply @limiter.limit(...) decorators to specific endpoints without creating
a circular import with app.main (which imports the routers).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
