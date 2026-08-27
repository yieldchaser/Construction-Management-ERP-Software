"""Guard: no *_DEMO_* setting may ship with a non-empty default.

EMAIL_OTP_DEMO_ALLOWLIST used to default to "demo@siteflow.co" while the
SMS pair defaulted to "" - safe by luck, not design. This pin fails closed:
any future *_DEMO_* field must be empty by default or the test breaks.
"""

from app.config import Settings


def test_no_demo_defaults():
    for field_name, field in Settings.model_fields.items():
        if "DEMO" in field_name:
            default = field.default
            assert default == "" or default is None or default == [], (
                f"{field_name} has non-empty default {default!r} - demo credential exposure"
            )


def test_no_demo_defaults_runtime():
    settings = Settings()
    for field_name in Settings.model_fields:
        if "DEMO" in field_name:
            val = getattr(settings, field_name)
            assert val == "" or val is None or val == [], (
                f"{field_name} runtime value {val!r} is non-empty without env - demo path armed"
            )
