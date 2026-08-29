"""R3: for every closed register row, is its cited fix commit on origin/main?

lineage_audit.py asked whether the cited sha was reachable from campaign/waves.
Production ships from main, so the question that decides whether a fix is LIVE
is whether the sha is an ancestor of origin/main. This asks that.

Uses `git merge-base --is-ancestor` per trap 9 - `git rev-parse` resolves
orphan-branch commits happily and would report them as present.

SELF-TEST (runs first, aborts on failure): a commit known to be main-only must
report ON_MAIN, and bef6c73 - which `git branch --contains` places solely on
claude/siteflow-audit-round10-cont-f6961b - must report OFF_MAIN.
"""
import io
import re
import subprocess
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

REPO = r"C:/Users/Dell/Github/Construction-Management-ERP-Software/.claude/worktrees/siteflow-audit-round-5-c53b63"
REGISTER = r"C:/Users/Dell/AppData/Local/Temp/claude/C--Users-Dell-Github-Construction-Management-ERP-Software--claude-worktrees-siteflow-audit-round-5-c53b63/c4d65758-87fc-441b-bf3c-7c4c6b6c4314/scratchpad/audit/AUDIT_FIX_REGISTER.md"

_cache = {}


def is_ancestor(sha):
    """True if sha is an ancestor of origin/main. None if the sha is unknown."""
    if sha in _cache:
        return _cache[sha]
    exists = subprocess.run(
        ["git", "-C", REPO, "cat-file", "-e", sha + "^{commit}"],
        capture_output=True,
    ).returncode == 0
    if not exists:
        _cache[sha] = None
        return None
    rc = subprocess.run(
        ["git", "-C", REPO, "merge-base", "--is-ancestor", sha, "origin/main"],
        capture_output=True,
    ).returncode
    _cache[sha] = rc == 0
    return rc == 0


def selftest():
    main_sha = subprocess.run(
        ["git", "-C", REPO, "rev-parse", "origin/main~1"],
        capture_output=True, text=True,
    ).stdout.strip()
    pos = is_ancestor(main_sha)
    neg = is_ancestor("bef6c73")
    print("SELF-TEST known-positive origin/main~1 -> %s (want True)" % pos)
    print("SELF-TEST known-negative bef6c73       -> %s (want False)" % neg)
    if pos is not True or neg is not False:
        print("SELF-TEST FAILED - not trusting this tool")
        sys.exit(2)
    print("SELF-TEST PASSED\n")


def main():
    selftest()
    rows = []
    for line in io.open(REGISTER, encoding="utf-8", errors="replace"):
        if not line.startswith("| R2-"):
            continue
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        if len(c) < 7 or c[5] not in ("FIXED", "FIX_VERIFIED"):
            continue
        shas = re.findall(r"\b([0-9a-f]{7,40})\b", " ".join(c[6:]))
        if not shas:
            rows.append((c[0], c[1], c[5], "NO_SHA", ""))
            continue
        results = {s: is_ancestor(s) for s in shas}
        if any(v is True for v in results.values()):
            state = "ON_MAIN"
        elif all(v is None for v in results.values()):
            state = "SHA_UNKNOWN"
        else:
            state = "OFF_MAIN"
        rows.append((c[0], c[1], c[5], state, ",".join(shas[:3])))

    print("closed rows scanned:", len(rows))
    print("by state:", dict(Counter(r[3] for r in rows)))
    off = [r for r in rows if r[3] == "OFF_MAIN"]
    print("\nOFF_MAIN by severity:", dict(Counter(r[1] for r in off)))
    print("OFF_MAIN by status  :", dict(Counter(r[2] for r in off)))
    with io.open("scripts/verification/offmain_rows.txt", "w", encoding="utf-8", newline="\n") as fh:
        for r in off:
            fh.write("%s %s %s %s\n" % (r[0], r[1], r[2], r[4]))
    print("\nwrote scripts/verification/offmain_rows.txt (%d rows)" % len(off))
    print("first 25:", ", ".join(r[0] for r in off[:25]))


if __name__ == "__main__":
    main()
