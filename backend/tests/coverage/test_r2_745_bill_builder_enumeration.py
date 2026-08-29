"""R2-745 gate: every path that constructs a Bill must validate its lines.

R2-401's validator is real, but R2-745's complaint was about its *coverage*, not
its behaviour: it was wired into create_bill alone, and the second
bill-creation surface (quotation conversion) hand-assembled a Bill and called
nothing. A per-file pin would have stayed green under that defect -- both
before and after, `grep _validate_bill_line_items billing.py` returns the same
two lines.

So this gate enumerates by mechanism: parse every router, find every function
that constructs a `Bill(...)`, and require that the same function calls the
validator. Adding a third creation path without validating it fails here.

It also pins the known site set, so a new surface cannot arrive unnoticed.
"""
import ast
import pathlib

ROUTERS = pathlib.Path(__file__).resolve().parents[2] / "app" / "routers"


def _bill_construction_sites():
    """Every function that constructs a Bill, and whether it validates it."""
    sites = []
    for path in sorted(ROUTERS.glob("*.py")):
        # utf-8-sig: at least one router file carries a BOM.
        tree = ast.parse(path.read_text(encoding="utf-8-sig"))
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            constructs = [
                n for n in ast.walk(node)
                if isinstance(n, ast.Call)
                and isinstance(n.func, ast.Name)
                and n.func.id == "Bill"
            ]
            if not constructs:
                continue
            called = {
                n.func.id for n in ast.walk(node)
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
            }
            sites.append(
                (path.name, node.name, node.lineno, len(constructs),
                 "_validate_bill_line_items" in called)
            )
    return sites


def test_the_scan_finds_bill_constructions_at_all():
    sites = _bill_construction_sites()
    assert sites, "the scan found no Bill() construction -- the mechanism moved"


def test_every_bill_construction_is_validated():
    sites = _bill_construction_sites()
    unvalidated = [
        f"{fname}:{lineno} {fn}()" for fname, fn, lineno, _n, ok in sites if not ok
    ]
    assert not unvalidated, (
        "these paths construct a Bill without calling _validate_bill_line_items, "
        "so the line-item reconciliation and the HSN/SAC rule do not reach them: "
        + ", ".join(unvalidated)
    )


def test_bill_construction_sites_are_the_expected_two():
    """Pin the known set: a third surface must be reviewed, not absorbed."""
    names = {(fname, fn) for fname, fn, _ln, _n, _ok in _bill_construction_sites()}
    assert names == {
        ("billing.py", "create_bill"),
        ("crm.py", "convert_quotation_to_invoice"),
    }, (
        "a Bill-construction path was added or removed; confirm the new one "
        "validates its line items before updating this gate"
    )
