"""Exhaustive sweep for fabricated hardcoded DATA in the console.

The class R2-712 covers: a value that should come from the tenant's database is instead a string
literal in the component. Four shapes, each a distinct way the bug is written:

  A  <option value="..."> whose value is an entity name (a party, project, account, branch)
     rather than domain vocabulary (an invoice type, a status)
  B  readOnly / defaultValue inputs carrying an entity name
  C  useState("<entity name>") - the default is submitted when the user does not touch the field
  D  a fallback array of object literals assigned in a catch block or as an initial value

Distinguishing DATA from VOCABULARY is the whole difficulty and cannot be fully automated, so this
script reports candidates and the known-vocabulary list is explicit and reviewable below.

Self-tested against the five instances already confirmed by hand.
"""
import os
import re
import sys
from collections import defaultdict

ROOT = r"C:/Users/Dell/AppData/Local/Temp/claude/verif-scratch/frontend/src/app/c"

# Domain vocabulary - legitimate to hardcode. Reviewed by hand; extend deliberately.
VOCAB = {
    # statuses / workflow
    "on hold", "in progress", "not started", "completed", "cancelled", "draft", "sent", "won",
    "lost", "pending", "approved", "rejected", "active", "inactive", "closed", "open",
    "quality check", "this week", "last week", "this month", "last month", "this year",
    "all projects", "all clients", "all items", "all types", "all parties", "all",
    # document / invoice vocabulary
    "tax invoice", "retail invoice", "proforma invoice", "credit note", "debit note",
    "sales invoice", "purchase invoice", "material sales", "material purchase",
    "material return", "material transfer", "sub con bill", "other expense",
    "equipment expense", "payment in", "payment out", "party to party", "internal transfer",
    # construction domain
    "ready mix", "site mix", "concrete batch", "tower crane", "concrete mixer", "public works",
    "security deposit", "material recovery", "advance recovery", "select project",
    "select company address", "select party", "select item",
}

PLACEHOLDER_RE = re.compile(r"^(select|choose|all|none|e\.g\.|search)\b", re.I)


def is_vocab(v):
    s = v.strip().lower()
    return s in VOCAB or PLACEHOLDER_RE.match(s) is not None


def looks_like_entity(v):
    """A proper-noun-ish multiword string, or a name carrying a brand/bank/branch marker."""
    s = v.strip()
    if len(s) < 4 or len(s) > 60:
        return False
    if is_vocab(s):
        return False
    if re.search(r"\((HDFC|SBI|ICICI|Axis|Kotak|Branch)\b", s, re.I):
        return True
    words = s.split()
    if len(words) < 2:
        return False
    caps = sum(1 for w in words if w[:1].isupper())
    return caps >= 2


def walk():
    for root, _d, files in os.walk(ROOT):
        for fn in files:
            if fn.endswith((".tsx", ".ts")):
                yield os.path.join(root, fn)


def rel(p):
    return os.path.relpath(p, ROOT).replace("\\", "/")


OPTION = re.compile(r'<option\s+value="([^"]{2,60})"')
READONLY = re.compile(r'value="([^"]{2,60})"[^>]*\breadOnly|readOnly[^>]*\bvalue="([^"]{2,60})"')
USESTATE = re.compile(r'useState(?:<[^>]*>)?\(\s*"([^"]{4,60})"\s*\)')
FALLBACK = re.compile(r'set[A-Z]\w*\(\s*\[\s*\{')


def main():
    hits = defaultdict(list)
    for path in walk():
        try:
            src = open(path, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        lines = src.split("\n")
        for i, line in enumerate(lines, 1):
            for m in OPTION.finditer(line):
                v = m.group(1)
                if looks_like_entity(v):
                    hits["A option"].append((rel(path), i, v))
            # JSX splits attributes across lines, so readOnly and value= are rarely on the
            # same one. Look at the surrounding element, not the line.
            if re.search(r"\breadOnly\b|\bdefaultValue=", line):
                window = "\n".join(lines[max(0, i - 6):min(len(lines), i + 6)])
                for m in re.finditer(r'value="([^"{}]{2,60})"', window):
                    v = m.group(1)
                    if looks_like_entity(v):
                        hits["B readOnly"].append((rel(path), i, v))
            for m in USESTATE.finditer(line):
                v = m.group(1)
                if looks_like_entity(v):
                    hits["C useState default"].append((rel(path), i, v))
            if FALLBACK.search(line):
                ctx = "\n".join(lines[max(0, i - 6):i])
                if re.search(r"\bcatch\b", ctx):
                    hits["D catch fallback"].append((rel(path), i, line.strip()[:70]))
    return hits


def selftest(hits):
    """The five instances already confirmed by hand MUST appear."""
    flat = {(f, v) for k in hits for f, _i, v in hits[k]}
    want = [
        ("[company_id]/d/finance/page.tsx", "Skyline Premium Towers"),
        ("[company_id]/d/finance/page.tsx", "Prestige Developers"),
        ("[company_id]/d/finance/page.tsx", "Main Savings Account"),
        ("[company_id]/reports/item-wise-sales/page.tsx", "Alpha Builders"),
        ("[company_id]/d/attendance/page.tsx", "Pune Main Office"),
    ]
    ok = True
    for f, v in want:
        if not any(f == ff and v in vv for ff, vv in flat):
            print(f"SELFTEST FAIL: known instance not detected -> {f} :: {v}")
            ok = False
    # known-negative: pure vocabulary must NOT be reported
    for bad in ("Tax Invoice", "On Hold", "Ready Mix"):
        if any(bad == vv for _ff, vv in flat):
            print(f"SELFTEST FAIL: vocabulary reported as data -> {bad}")
            ok = False
    print("SELFTEST OK" if ok else "SELFTEST FAILED")
    return ok


if __name__ == "__main__":
    h = main()
    if not selftest(h):
        sys.exit(1)
    total = sum(len(v) for v in h.values())
    print(f"\n{total} candidate sites across {len(h)} shapes\n")
    for kind in sorted(h):
        print(f"--- {kind} ({len(h[kind])}) ---")
        byfile = defaultdict(list)
        for f, i, v in h[kind]:
            byfile[f].append((i, v))
        for f in sorted(byfile):
            vals = ", ".join(f"{v}@{i}" for i, v in sorted(byfile[f]))
            print(f"  {f}\n      {vals}")
        print()
