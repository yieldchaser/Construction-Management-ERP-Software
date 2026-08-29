"""Item C8: Verification that dead newIndentPhoto state and UI are removed from procurement page.
"""
from pathlib import Path


def test_c8_no_dead_newindentphoto_in_procurement_page():
    page_path = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "d" / "procurement" / "page.tsx"
    )
    src = page_path.read_text(encoding="utf-8")

    assert "newIndentPhoto" not in src, "Found dead newIndentPhoto in procurement page.tsx"
