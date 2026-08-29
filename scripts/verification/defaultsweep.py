"""Sweep for the R2-083 pattern: a falsy-coalesce that invents a DEFINITE value for absent data.

    health: uiHealth || "Healthy"      <- absent risk data renders as reassuring
    status: dbProj.status || "Ongoing" <- absent status renders as a real state
    endDate: dbProj.end_date || "2027-12-31"

versus the honest form, which the same file already uses:

    category: dbProj.category || "—"

The distinction is whether the fallback ADMITS absence or ASSERTS a fact. An honest fallback is a
placeholder a human reads as "no data"; a fabricated one is indistinguishable from a real value,
so it silently enters counts, filters and badges.

Reports `X || "literal"` and `X ?? "literal"` in the console, classified against an explicit
honest-marker list. Self-tests on the four known R2-083 lines before emitting.
"""
import os
import re
import sys
from collections import defaultdict

ROOT = r"C:/Users/Dell/AppData/Local/Temp/claude/verif-scratch/frontend/src/app/c"

# Fallbacks that admit absence. Anything else asserts a fact.
HONEST = {
    "—", "-", "--", "", " ", "N/A", "n/a", "NA", "None", "none", "null", "Unknown",
    "unknown", "Unassigned", "unassigned", "Not set", "Not Set", "not set", "TBD",
    "Select", "All", "0", "—/—", "?", "No data", "No Data", "Untitled", "Unnamed",
    "Uncategorized", "Uncategorised", "Other", "General Enquiry",
}

# A fallback that reads as a real, definite value is worse when it is also POSITIVE:
# it does not merely invent data, it invents good news.
REASSURING = re.compile(
    r"^(Healthy|Good|Active|Ongoing|Approved|Completed|Complete|Paid|Success|Verified|"
    r"Passed|Pass|On Track|Normal|OK|Available|Open|Confirmed|Delivered|Received)$", re.I)

COALESCE = re.compile(r'([A-Za-z_$][\w.$?\[\]]*)\s*(\|\||\?\?)\s*"([^"]{1,40})"')


def walk():
    for root, _d, files in os.walk(ROOT):
        for fn in files:
            if fn.endswith((".tsx", ".ts")):
                yield os.path.join(root, fn)


# `err.detail || "Failed to save"` is correct code, not fabrication: the fallback is a message
# shown to a human, not a value written to a record. Excluded, and counted so the exclusion is
# visible rather than silent.
ERR_EXPR = re.compile(r"(^|\.)(err|error|e|ex|detail|message|msg)\b|detail|message", re.I)
ERR_LIT = re.compile(
    r"fail|error|unable|unknown error|went wrong|try again|not found|no reason|timed out", re.I)

UUID_LIT = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)


def is_error_fallback(expr, lit):
    return bool(ERR_LIT.search(lit)) and bool(ERR_EXPR.search(expr))


def classify(lit):
    if lit.strip() in HONEST:
        return None
    if REASSURING.match(lit.strip()):
        return "REASSURING"
    # a date, a number-with-units, or any proper-noun-ish string asserts a fact
    if re.match(r"^\d{4}-\d{2}-\d{2}$", lit.strip()):
        return "FABRICATED-DATE"
    if lit.strip()[:1].isupper() or re.search(r"\d", lit):
        return "FABRICATED-VALUE"
    return None


def main():
    hits = defaultdict(list)
    for path in walk():
        try:
            src = open(path, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        for i, line in enumerate(src.split("\n"), 1):
            st = line.strip()
            if st.startswith("//") or st.startswith("*"):
                continue
            for m in COALESCE.finditer(line):
                expr, _op, lit = m.group(1), m.group(2), m.group(3)
                # placeholder=, className=, and label text are not data defaults
                if re.search(r'(placeholder|className|aria-|title|alt)\s*=\s*\{?$',
                             line[:m.start()]):
                    continue
                if is_error_fallback(expr, lit):
                    hits["_excluded-error-message"].append((os.path.relpath(path, ROOT), i, expr, lit))
                    continue
                kind = "FABRICATED-UUID" if UUID_LIT.match(lit) else classify(lit)
                if kind:
                    rl = os.path.relpath(path, ROOT).replace("\\", "/")
                    hits[kind].append((rl, i, expr, lit))
    return hits


def selftest(hits):
    flat = {(f, e, l) for k in hits for f, _i, e, l in hits[k]}
    dash = "[company_id]/dashboard/page.tsx"
    want = [(dash, "uiHealth", "Healthy"),
            (dash, "dbProj.status", "Ongoing"),
            (dash, "dbProj.end_date", "2027-12-31")]
    ok = True
    for f, e, l in want:
        if not any(ff == f and ee == e and ll == l for ff, ee, ll in flat):
            print(f"SELFTEST FAIL: missed known instance {f} :: {e} || {l}")
            ok = False
    # known-negative: the honest sibling in the very same literal must NOT be flagged
    if any(ff == dash and ll == "—" for ff, _ee, ll in flat):
        print("SELFTEST FAIL: an honest em-dash fallback was reported")
        ok = False
    print("SELFTEST OK" if ok else "SELFTEST FAILED")
    return ok


if __name__ == "__main__":
    h = main()
    if not selftest(h):
        sys.exit(1)
    n_data = sum(len(v) for k, v in h.items() if not k.startswith("_"))
    n_err = len(h.get("_excluded-error-message", []))
    print(f"\n{n_data} data-fabrication sites")
    print(f"{n_err} excluded as legitimate error-message fallbacks\n")
    for kind in ("FABRICATED-UUID", "REASSURING", "FABRICATED-DATE", "FABRICATED-VALUE"):
        rows = h.get(kind, [])
        print(f"--- {kind} ({len(rows)}) ---")
        for f, i, e, l in sorted(rows):
            print(f"  {f}:{i}  {e} || \"{l}\"")
        print()
