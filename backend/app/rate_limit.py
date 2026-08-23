"""Shared slowapi rate limiter instance.

Kept in its own module (rather than app.main) so routers can import and
apply @limiter.limit(...) decorators to specific endpoints without creating
a circular import with app.main (which imports the routers).

Enforcement notes (audit R2-295 / R2-299):
  - Counters must live in a backend shared by every worker and instance.
    Set RATE_LIMIT_STORAGE_URI (e.g. redis://...) wherever more than one
    process serves traffic; the in-memory fallback is per-process, so with
    N workers a "5/hour" policy really allows N x 5 per hour and the
    measured pattern alternates 200/429 as the balancer hops buckets.
  - get_remote_address() keys on the direct socket peer. Behind Render or
    Cloudflare that peer is the edge proxy for every visitor, so without
    proxy-aware keys all humans share one bucket while an attacker who can
    reach the origin directly gets their own. Flip
    RATE_LIMIT_TRUST_PROXY_HEADERS to true only after confirming your edge
    actually overwrites these headers; CF-Connecting-IP is set by the
    Cloudflare edge itself and is preferred over X-Forwarded-For, whose
    first hop is client-supplied and therefore spoofable.
"""
import logging

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

logger = logging.getLogger("app.rate_limit")


def _rate_limit_key(request: Request) -> str:
    """Client identity for bucketing rate limits.

    Defaults to slowapi's socket-peer key so behaviour is unchanged unless
    the operator has explicitly declared a proxy topology via
    RATE_LIMIT_TRUST_PROXY_HEADERS. When trusted, prefer CF-Connecting-IP
    (edge-set) then the X-Forwarded-For first hop, else fall back to the
    socket peer.
    """
    if settings.RATE_LIMIT_TRUST_PROXY_HEADERS:
        cf_ip = (request.headers.get("cf-connecting-ip") or "").strip()
        if cf_ip:
            return cf_ip
        forwarded = (request.headers.get("x-forwarded-for") or "").strip()
        if forwarded:
            first_hop = forwarded.split(",")[0].strip()
            if first_hop:
                return first_hop
    return get_remote_address(request)


_storage_uri = (settings.RATE_LIMIT_STORAGE_URI or "").strip()
if _storage_uri:
    limiter = Limiter(key_func=_rate_limit_key, storage_uri=_storage_uri)
else:
    logger.warning(
        "[rate_limit] RATE_LIMIT_STORAGE_URI is empty: counters live in "
        "per-process memory and are NOT shared across workers or instances, "
        "so decorated limits (5/hour on /public/leads, OTP sends, BI feeds) "
        "do not hold fleet-wide; set it to a redis:// URL in production"
    )
    limiter = Limiter(key_func=_rate_limit_key)
