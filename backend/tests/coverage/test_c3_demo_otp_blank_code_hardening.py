"""Item C3: 503 Service Unavailable when demo OTP is enabled for an allowlisted identifier but OTP_DEMO_CODE is empty.
"""
from unittest.mock import patch
from app.config import settings


def test_c3_mobile_demo_otp_blank_code_returns_503(client):
    with patch.object(settings, "OTP_DEMO_ALLOWLIST", "+919999999999"), \
         patch.object(settings, "OTP_DEMO_CODE", ""), \
         patch("app.routers.auth.sms.is_configured", return_value=False):
        res = client.post("/apis/v3/auth/otp/send", json={"mobile": "+919999999999"})
        assert res.status_code == 503
        assert "Demo OTP code is not configured" in res.json()["detail"]


def test_c3_email_demo_otp_blank_code_returns_503(client):
    with patch.object(settings, "EMAIL_OTP_DEMO_ALLOWLIST", "demo@example.com"), \
         patch.object(settings, "OTP_DEMO_CODE", ""), \
         patch("app.routers.auth.email_otp.is_configured", return_value=False):
        res = client.post("/apis/v3/auth/email-otp/send", json={"email": "demo@example.com"})
        assert res.status_code == 503
        assert "Demo OTP code is not configured" in res.json()["detail"]
