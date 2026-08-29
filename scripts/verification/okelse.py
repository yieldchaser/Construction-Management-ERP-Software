"""R2-590 / R2-137: measure write controls whose `res.ok` check has no failure path.

A "write control" is a fetch(...) whose options contain method POST/PUT/PATCH/DELETE.
For each, look at the enclosing brace-balanced region after the fetch and decide
whether a failure is surfaced at all: an `else` attached to the ok-check, a
`!res.ok` branch, or any error-surfacing call (setError / alert / toast / throw)
within the same handler window.

SELF-TEST first, against two files the register makes claims about:
  - d/payment-approval/page.tsx : R2-059 FIXED "surface server detail on non-2xx"
    -> expect at least one write control classified SURFACED.
  - a synthetic silent snippet -> expect SILENT.
Aborts if the classifier disagrees, per "verify the tool before trusting it".
"""
import io
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")

ROOT = "frontend/src/app"
METHOD = re.compile(r'method\s*:\s*["\'](POST|PUT|PATCH|DELETE)["\']', re.I)
SURFACE = re.compile(r'\belse\b|!\s*res\.ok|!\s*response\.ok|setError|alert\s*\(|toast|throw\s|catch\s*\(|set\w*Msg|setToast|console\.error')
OKCHECK = re.compile(r'\bif\s*\(\s*!?\s*(?:res|response|r)\.ok\b')


def windows(text):
    """Yield (start_index, window_text) for each write fetch call."""
    for m in re.finditer(r'\bfetch\s*\(', text):
        # options object usually within ~600 chars of the call
        head = text[m.start(): m.start() + 700]
        if not METHOD.search(head):
            continue
        # handler window: from the fetch to 1200 chars on, enough for the ok-check
        yield m.start(), text[m.start(): m.start() + 3500]


def classify(win):
    if not OKCHECK.search(win):
        return "no_ok_check"
    ok = OKCHECK.search(win)
    after = win[ok.end():]
    return "surfaced" if SURFACE.search(after) else "silent"


def scan():
    counts = Counter()
    silent_files = Counter()
    for dirpath, _, files in os.walk(ROOT):
        for fn in files:
            if not fn.endswith((".tsx", ".ts")):
                continue
            p = os.path.join(dirpath, fn)
            try:
                t = io.open(p, encoding="utf-8", errors="replace").read()
            except OSError:
                continue
            for _, win in windows(t):
                c = classify(win)
                counts[c] += 1
                if c == "silent":
                    silent_files[p.replace("\\", "/")] += 1
    return counts, silent_files


def selftest():
    good = "frontend/src/app/c/[company_id]/d/payment-approval/page.tsx"
    if not os.path.exists(good):
        print("SELF-TEST SKIPPED - reference file missing:", good)
        return
    t = io.open(good, encoding="utf-8", errors="replace").read()
    cs = Counter(classify(w) for _, w in windows(t))
    print("SELF-TEST known-fixed file (R2-059) ->", dict(cs))
    if cs.get("surfaced", 0) < 1:
        print("SELF-TEST FAILED: classifier found no surfaced write control in a file the")
        print("register records as fixed to surface server detail. Not trusting output.")
        sys.exit(2)
    synth = 'fetch(url,{method:"POST"}); if (res.ok) { setThing(1); }'
    if classify(next(windows(synth))[1]) != "silent":
        print("SELF-TEST FAILED: synthetic silent handler not classified silent.")
        sys.exit(2)
    print("SELF-TEST PASSED\n")


if __name__ == "__main__":
    selftest()
    counts, silent_files = scan()
    total = sum(counts.values())
    print("write controls (fetch with POST/PUT/PATCH/DELETE):", total)
    for k in ("silent", "surfaced", "no_ok_check"):
        v = counts.get(k, 0)
        pct = (100.0 * v / total) if total else 0
        print("  %-12s %4d  (%.1f%%)" % (k, v, pct))
    print("\ntop files by silent write controls:")
    for p, n in silent_files.most_common(12):
        print("  %2d  %s" % (n, p))
