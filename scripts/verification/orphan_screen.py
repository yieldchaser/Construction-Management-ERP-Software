"""Screen the orphan-cited rows (R2-727) for fixes that were never reproduced on campaign/waves.

Logic: for a row whose cited commit lives only on the abandoned branch, that commit's REMOVED
lines are the defect as it stood. If a removed line is still present verbatim in the live tree,
the live tree still carries that defect text -> the fix was very likely not reproduced.

This is deliberately idiom-independent in the direction that matters. It does NOT ask whether the
live tree contains my replacement (it will not - the campaign re-fixed in its own style). It asks
whether the live tree still contains the ORIGINAL BUGGY LINE, which no re-fix would leave behind.

Signal, not verdict. Every hit needs reading before it is believed:
  * a removed line may be cosmetic (an import, a blank, a comment)
  * a line may legitimately survive at a different, correct call site
Self-tests on R2-025, whose sign error is known to still be live.
"""
import io
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
REPO = (r"C:/Users/Dell/Github/Construction-Management-ERP-Software/.claude/worktrees/"
        r"siteflow-audit-continuation-945943")
LIVE = r"C:/Users/Dell/AppData/Local/Temp/claude/verif-scratch"


def git(*a):
    return subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout


# --- live tree, loaded once ---------------------------------------------------
LIVE_TEXT = {}
for root, _d, files in os.walk(LIVE):
    if any(s in root for s in (".git", "node_modules", "__pycache__", ".next")):
        continue
    for fn in files:
        if fn.endswith((".py", ".tsx", ".ts")):
            p = os.path.join(root, fn)
            try:
                LIVE_TEXT[p] = io.open(p, encoding="utf-8", errors="replace").read()
            except OSError:
                pass
ALL_LIVE = "\n".join(LIVE_TEXT.values())

TRIVIAL = re.compile(r"^\s*($|#|//|\*|import |from |\)|\{|\}|\]|\[|else:?$|try:|except)")


def removed_lines(sha):
    out = git("show", "--format=", "-M", sha)
    keep = []
    for l in out.split("\n"):
        if l.startswith("-") and not l.startswith("---"):
            body = l[1:].strip()
            if len(body) < 25 or TRIVIAL.match(body):
                continue
            keep.append(body)
    return keep


def screen(sha):
    """-> (n_removed_checked, [lines still present live])"""
    rem = removed_lines(sha)
    still = [l for l in rem if l in ALL_LIVE]
    return len(rem), still


def selftest():
    # R2-025's orphan commit removed the buggy rollup formula; it is still live.
    n, still = screen("f32ca77")
    hit = any("advance_received" in s and "to_receive" in s for s in still)
    print("SELFTEST", "OK" if hit else "FAILED",
          f"(R2-025: {n} substantive removed lines, {len(still)} still live)")
    return hit


if __name__ == "__main__":
    if not selftest():
        sys.exit(1)
    rows = [l.split() for l in io.open("orphan_rows.txt", encoding="utf-8").read().split("\n") if l.strip()]
    reg = io.open("register.md", encoding="utf-8").read()
    sha_of = {}
    for line in reg.split("\n"):
        if not line.startswith("| R2-"):
            continue
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        m = re.findall(r"\b([0-9a-f]{7,40})\b", " ".join(c[6:]))
        if m:
            sha_of[c[0]] = m[0]
    print(f"\nscreening {len([r for r in rows if r[1]=='CRITICAL'])} orphan-cited CRITICALs\n")
    flagged = []
    for rid, sev, status in rows:
        if sev != "CRITICAL":
            continue
        sha = sha_of.get(rid)
        if not sha:
            continue
        n, still = screen(sha)
        if still:
            flagged.append((rid, sha, n, still))
    print(f"rows where a removed (buggy) line is STILL PRESENT live: {len(flagged)}\n")
    for rid, sha, n, still in flagged:
        print(f"--- {rid}  ({sha}, {n} removed lines checked, {len(still)} still live)")
        for s in still[:3]:
            print(f"      {s[:100]}")
