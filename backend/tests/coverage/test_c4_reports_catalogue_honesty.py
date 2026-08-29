"""Item C4: Report catalogue honesty — frontend IMPLEMENTED_REPORT_SLUGS matches backend _REPORT_HANDLERS.
"""
import re
from pathlib import Path
from app.routers.reports import _REPORT_HANDLERS


def test_c4_reports_catalogue_slugs_mirror_backend_handlers():
    frontend_path = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "reports" / "page.tsx"
    )
    src = frontend_path.read_text(encoding="utf-8")

    # 1. Extract IMPLEMENTED_REPORT_SLUGS from reports/page.tsx
    m = re.search(r"const IMPLEMENTED_REPORT_SLUGS = new Set\(\[(.*?)\]\);", src, re.S)
    assert m, "IMPLEMENTED_REPORT_SLUGS not found in reports/page.tsx"
    slugs = set(re.findall(r'"([^"]+)"', m.group(1)))

    backend_slugs = set(_REPORT_HANDLERS.keys())
    assert slugs == backend_slugs, (
        f"Mismatch between frontend implemented slugs and backend handlers: "
        f"frontend-only={slugs - backend_slugs}, backend-only={backend_slugs - slugs}"
    )

    # 2. Assert 'Coming soon' badge exists in reports/page.tsx for unimplemented reports
    assert "Coming soon" in src, "Expected 'Coming soon' badge in reports/page.tsx"
