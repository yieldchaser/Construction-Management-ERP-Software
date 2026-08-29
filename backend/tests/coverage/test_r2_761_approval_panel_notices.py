"""Finding R2-761: Multi Level Approval panel notices consistency and parity.

Clauses:
1. The panel's enforcement notice must explicitly cover every category offered in APPROVAL_CATEGORIES (including Payment Entries).
2. No contradicting or stale notice claiming un-enforced 'remaining categories' exists in the panel.
3. The two previous amber notices are collapsed to a single consistent notice.
"""
import re
from pathlib import Path
from app.approvals import APPROVAL_FEATURE_TYPES


def test_r2_761_approval_panel_notices_parity():
    frontend_path = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "settings" / "page.tsx"
    )
    src = frontend_path.read_text(encoding="utf-8")

    # Locate the approval section specifically
    approval_match = re.search(
        r'\{activeSection === "approval" && \(.*?(?=\{/\* ════════════════════════════ INTEGRATIONS)',
        src,
        re.S,
    )
    assert approval_match, "Multi Level Approval section not found in settings/page.tsx"
    approval_section = approval_match.group(0)

    # 1. No stale "remaining categories" clause
    assert "remaining categories" not in approval_section.lower(), (
        "Found stale 'remaining categories' clause in approval section notice"
    )

    # 2. Every category in APPROVAL_FEATURE_TYPES must be referenced in the enforcement notice
    for category in APPROVAL_FEATURE_TYPES:
        assert (
            category in approval_section
            or "APPROVAL_CATEGORIES.join" in approval_section
        ), f"Approval notice does not cover category '{category}'"

    # 3. Only ONE amber notice in the approval section
    amber_boxes = re.findall(r'<div className="[^"]*bg-amber-500/10[^"]*"[^>]*>(.*?)</div>', approval_section, re.S)
    assert len(amber_boxes) == 1, (
        f"Expected exactly 1 collapsed notice in approval panel, found {len(amber_boxes)}: {amber_boxes}"
    )
