"""Public, UNAUTHENTICATED lead capture from the marketing site.

The POST side is the first internet-exposed write endpoint in this codebase
with no auth dependency, so it is hardened accordingly:
  - strict per-IP rate limiting (slowapi)
  - hard length caps on every field (Pydantic)
  - a honeypot field that silently no-ops bot submissions
  - the lead is persisted FIRST and committed; the notification email is a
    best-effort side effect that can never lose the lead if the mail
    provider hiccups
  - no user-submitted content is ever echoed back in an error response
  - only a salted hash of the submitter IP is retained (never the raw IP)

GET /leads is NOT public: it is an operator-only console read (audit
R2-545) gated by the ADMIN_MIGRATION_SECRET header scheme, so a captured
lead stays reachable even when its notification email fails.
"""
import hashlib
import hmac
import logging
import re

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.rate_limit import limiter
from app import models, mailer

router = APIRouter(prefix="/public", tags=["Public"])
logger = logging.getLogger("app.public_leads")

_MAIL_NOT_CONFIGURED_WARNED = False

# Matches CR, LF, and other control characters. `lead.name` / `lead.company`
# are attacker-controlled free text used to build the notification subject
# line; stripping these here is defence in depth on top of mailer.py's own
# header sanitization, so the subject stays readable even before it reaches
# the mailer.
_SUBJECT_CONTROL_CHARS_RE = re.compile(r"[\r\n\x00-\x08\x0b\x0c\x0e-\x1f]")

_MAX_SUBJECT_LENGTH = 180


def _sanitize_subject_part(value: str) -> str:
    cleaned = _SUBJECT_CONTROL_CHARS_RE.sub(" ", value or "")
    return " ".join(cleaned.split())


class LeadRequest(BaseModel):
    name: str = Field(..., max_length=120)
    company: str | None = Field(None, max_length=200)
    email: EmailStr = Field(..., max_length=255)
    phone: str | None = Field(None, max_length=32)
    role: str | None = Field(None, max_length=120)
    sites: str | None = Field(None, max_length=120)
    message: str | None = Field(None, max_length=4000)
    source: str | None = Field("contact_form", max_length=60)
    page_url: str | None = Field(None, max_length=500)
    # Honeypot: real users never see or fill this field. Left blank by the
    # marketing site's form (hidden, aria-hidden, autoComplete off). A
    # non-empty value marks the submission as a bot: we return the same 200
    # success shape but never persist or email it.
    website: str | None = Field(None, max_length=200)


def _client_ip(request: Request) -> str:
    """Best-effort client IP for the abuse-investigation hash only.

    This deploys behind Render's proxy, so the direct socket peer is the
    proxy, not the visitor. Prefer the first hop of X-Forwarded-For when
    present. NEVER trusted for anything security-critical (rate limiting
    already uses slowapi's own key func); this is only ever hashed and used
    to spot abuse patterns after the fact.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        first_hop = forwarded.split(",")[0].strip()
        if first_hop:
            return first_hop
    return request.client.host if request.client else ""


def _hash_ip(ip: str) -> str | None:
    if not ip:
        return None
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), ip.encode("utf-8"), hashlib.sha256).hexdigest()


def _notify_email_body(lead: models.MarketingLead) -> tuple[str, str]:
    safe_name = _sanitize_subject_part(lead.name)
    safe_company = _sanitize_subject_part(lead.company) if lead.company else "no company given"
    subject = f"New SiteFlow demo request: {safe_name} ({safe_company})"[:_MAX_SUBJECT_LENGTH]
    lines = [
        f"Name: {lead.name}",
        f"Company: {lead.company or '-'}",
        f"Email: {lead.email}",
        f"Phone: {lead.phone or '-'}",
        f"Role: {lead.role or '-'}",
        f"Active sites: {lead.sites or '-'}",
        f"Source: {lead.source}",
        f"Page: {lead.page_url or '-'}",
        f"Submitted at: {lead.created_at}",
        "",
        "Message:",
        lead.message or "(none)",
    ]
    return subject, "\n".join(lines)


def _require_lead_console_secret(x_admin_secret: str | None = Header(default=None)) -> None:
    """Operator-only gate for reading captured leads (audit R2-545).

    MarketingLead is tenant-less: these are PROSPECTS, not customers, so the
    rows must never be readable by an ordinary authenticated company user
    (that would leak the founder's sales pipeline to the customer base).
    There is no platform-admin role in this product, so the read reuses the
    one operator gate that already exists (the ADMIN_MIGRATION_SECRET header
    scheme from admin_migrations.py): fail-closed 403 when unset, constant-
    time comparison when set.
    """
    if not settings.ADMIN_MIGRATION_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lead console is not enabled",
        )
    if not hmac.compare_digest(x_admin_secret or "", settings.ADMIN_MIGRATION_SECRET):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin secret",
        )


@router.get("/leads")
def list_leads(
    db: Session = Depends(get_db),
    limit: int = Query(200, ge=1, le=500),
    _: None = Depends(_require_lead_console_secret),
):
    """Read back captured leads so a failed notification email can never make
    a lead silently unreachable (audit R2-545).

    The capture endpoint below is deliberately public and stays untouched;
    this listing is operator-only and returns email_sent plus created_at for
    every row so undelivered notifications are visible at a glance. ip_hash
    and user_agent are internal abuse-forensics fields and are withheld.
    """
    rows = (
        db.query(models.MarketingLead)
        .order_by(models.MarketingLead.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "company": r.company,
            "email": r.email,
            "phone": r.phone,
            "role": r.role,
            "sites": r.sites,
            "source": r.source,
            "page_url": r.page_url,
            "message": r.message,
            "email_sent": r.email_sent,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/leads")
@limiter.limit("5/hour")
def create_lead(request: Request, payload: LeadRequest, db: Session = Depends(get_db)):
    """Persist a marketing lead and best-effort notify the founder by email.

    Always returns {"ok": true} on success (including the honeypot no-op
    path) so a bot never learns it was flagged.
    """
    if (payload.website or "").strip():
        # Honeypot tripped: pretend success, persist and email nothing.
        return {"ok": True}

    lead = models.MarketingLead(
        name=payload.name.strip(),
        company=(payload.company or "").strip() or None,
        email=str(payload.email).strip(),
        phone=(payload.phone or "").strip() or None,
        role=(payload.role or "").strip() or None,
        sites=(payload.sites or "").strip() or None,
        message=(payload.message or "").strip() or None,
        source=(payload.source or "contact_form").strip() or "contact_form",
        page_url=(payload.page_url or "").strip() or None,
        user_agent=(request.headers.get("user-agent") or "")[:400] or None,
        ip_hash=_hash_ip(_client_ip(request)),
        email_sent=False,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    global _MAIL_NOT_CONFIGURED_WARNED
    if not mailer.is_configured():
        if not _MAIL_NOT_CONFIGURED_WARNED:
            logger.warning("[public_leads] mail transport not configured; lead notifications are disabled")
            _MAIL_NOT_CONFIGURED_WARNED = True
        return {"ok": True}

    recipient = (settings.LEAD_NOTIFY_EMAIL or settings.SMTP_FROM or "").strip()
    if not recipient:
        return {"ok": True}

    subject, body = _notify_email_body(lead)
    try:
        mailer.send_email(recipient, subject, body, reply_to=lead.email)
        lead.email_sent = True
        db.commit()
    except Exception:
        # Never log the prospect's PII (email/phone/message). The lead is
        # already committed, so this failure never loses it, only the
        # notification.
        logger.warning("[public_leads] notification email failed for lead id=%s", lead.id)

    return {"ok": True}
