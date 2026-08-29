"""Part C hygiene — cheap recorded observations, pinned so they cannot return.

C1: frontend/src/lib held two byte-identical 30,913-byte copies of the shared
calculator module, `calc-shared.ts` and `calcShared.ts`. Only the first was
ever imported. Dead code today, but this module has already drifted three times
(R2-482, R2-519, R2-611) — a future rate correction applied to the wrong twin
would silently not ship. Deleted, and pinned here.

These are source pins rather than behavioural tests: the repo ships no React
test runner, and the property being guarded ("there is exactly one copy") is a
property of the file tree.
"""
import hashlib
import pathlib

REPO = pathlib.Path(__file__).resolve().parents[3]
FRONTEND_LIB = REPO / "frontend" / "src" / "lib"

# The surviving file, and the twin that was removed.
CALC_MODULE = "calc-shared.ts"
REMOVED_TWIN = "calcShared.ts"


def test_only_one_copy_of_the_shared_calc_module_exists():
    assert not (FRONTEND_LIB / REMOVED_TWIN).exists(), (
        f"{REMOVED_TWIN} is back. Two copies of this module drift silently -- "
        f"a correction applied to the unused one never ships (R2-482, R2-519, R2-611)."
    )

    # No other near-duplicate either: compare content hashes across lib.
    digests = {}
    for path in sorted(FRONTEND_LIB.glob("*.ts")):
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        digests.setdefault(digest, []).append(path.name)
    duplicates = {d: names for d, names in digests.items() if len(names) > 1}
    assert not duplicates, (
        "byte-identical duplicates in frontend/src/lib: "
        + ", ".join("/".join(v) for v in duplicates.values())
    )


def test_the_shared_calc_module_is_the_one_that_is_imported():
    """Whichever file exists must be the one the calculators page imports."""
    src = (REPO / "frontend" / "src" / "app" / "c" / "[company_id]" / "d" / "reports"
           / "calculators" / "page.tsx").read_text(encoding="utf-8-sig")
    # TS imports are extension-less: "@/lib/calc-shared", not ".ts".
    stem = CALC_MODULE[:-3] if CALC_MODULE.endswith(".ts") else CALC_MODULE
    assert f"@/lib/{stem}" in src, (
        "the calculators page no longer imports the shared calc module"
    )
    assert f"@/lib/{REMOVED_TWIN}" not in src and f"@/lib/{REMOVED_TWIN[:-3]}" not in src, (
        "the calculators page imports the removed twin"
    )
