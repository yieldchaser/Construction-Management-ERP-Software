"""Item C11: Audit for sentinel company/user IDs and verify no fabricated sentinel fallbacks exist in write paths.
"""
from pathlib import Path
import re


def test_c11_no_nil_sentinel_uuid_in_frontend_app():
    app_dir = Path(__file__).resolve().parents[3] / "frontend" / "src" / "app"
    nil_uuid = "00000000-0000-0000-0000-000000000000"

    offenders = []
    for file_path in app_dir.rglob("*.tsx"):
        content = file_path.read_text(encoding="utf-8")
        if nil_uuid in content:
            offenders.append(str(file_path.relative_to(app_dir)))

    assert not offenders, f"Found nil sentinel UUID in frontend files: {offenders}"


def test_c11_attendance_offline_queue_sends_captured_at():
    d_att = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "d" / "attendance" / "page.tsx"
    ).read_text(encoding="utf-8")
    p_att = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "p" / "[project_id]" / "attendance" / "page.tsx"
    ).read_text(encoding="utf-8")

    assert "captured_at: punch.time" in d_att, "d/attendance flushQueue does not send captured_at"
    assert "captured_at: punch.time" in p_att, "p/attendance flushQueue does not send captured_at"
