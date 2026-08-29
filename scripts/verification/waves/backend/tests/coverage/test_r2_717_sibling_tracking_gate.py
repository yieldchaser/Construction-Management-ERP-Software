"""R2-717 class gate: every SIBLING/follow-up note must carry a tracking id.

R2-717 found 40 of 315 closed rows disclose unresolved work in their own
note (hand-off phrasing) and 29 of those carry no tracking id. Disclosure
is good practice; the gap is that nothing converts it into a tracked row.
29 pieces of known remaining work exist only inside prose, where no worklist
can reach them.

Fix direction: make the closure checklist refuse a FIXED whose note contains
hand-off phrasing without an accompanying id - same shape as R2-711, a rule
that closes the class rather than the instances.

This gate scans audit/AUDIT_FIX_REGISTER.md (and AUDIT_ROUND2_FINDINGS.md if
present) for any closed row whose note contains hand-off phrasing but no
tracking id, and fails loudly.

Blast-radius: test-only.
"""
import os
import re


REPO_ROOT = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..")
)
REGISTER = os.path.join(REPO_ROOT, "audit", "AUDIT_FIX_REGISTER.md")
ROUND2 = os.path.join(REPO_ROOT, "audit", "AUDIT_ROUND2_FINDINGS.md")


# Hand-off phrasing per R2-717 method. Loose "still" excluded intentionally.
HANDOFF_PHRASES = [
    "Sibling:",
    "sibling:",
    "SIBLING:",
    "follow-up",
    "follow_up",
    "Follow-up",
    "Follow-Up",
    "is deferred",
    "Is deferred",
    "not implemented",
    "Not implemented",
    "left open",
    "Left open",
    "remains open",
    "Remains open",
    "out of scope",
    "Out of scope",
    "deferred",
    "Deferred",
]

# Tracking id is any of: R2-123, D-V4, D-012, #123, https://, GH-123
# Note: W\d+ (wave number) is intentionally excluded - it is the wave column,
# not a follow-up tracking id. Including it would mark every row as tracked.
TRACKING_RE = re.compile(r"(R2-\d+|D-[A-Z0-9V-]+\d*|#\d+|https?://|GH-\d+)", re.IGNORECASE)

# Also allow explicit "TODO(R2-xxx)" or "TODO: R2-xxx" as tracked.
TODO_TRACK_RE = re.compile(r"TODO.*(R2-\d+|D-[A-Z0-9-]+|#\d+|https?://)", re.IGNORECASE)


def _extract_note(line):
    """Extract the note column from a markdown table row."""
    cols = line.split("|")
    # cols[0] is empty before first |, cols[-1] is empty after last |
    # Note is typically the last non-empty column before the trailing empty.
    # For AUDIT_FIX_REGISTER, note is cols[7] or cols[-2]. Use last meaningful.
    if len(cols) <= 3:
        return line
    # The note is the last column that contains hand-off phrasing or prose.
    # In current register, note is after the commit hash column.
    # Take the second-to-last element if line ends with |, else last.
    if line.strip().endswith("|"):
        # cols[-1] is "" after trailing |, cols[-2] is note
        note = cols[-2] if len(cols) >= 2 else ""
    else:
        note = cols[-1]
    # Some rows have note spanning multiple |? The register's note itself
    # never contains |, so this is safe. If note is empty, try cols[7].
    if not note.strip() and len(cols) > 7:
        note = cols[7]
    return note


def _is_closed_row(line):
    # Closed rows are marked FIXED, FIX_VERIFIED, WONTFIX, or FIXED with a commit.
    # We treat any row that starts with "| R2-" and contains "FIXED" or "FIX_VERIFIED"
    # as closed. TODO rows are not closed and are excluded.
    if not line.strip().startswith("| R2-"):
        return False
    # Header/separator lines.
    if "---" in line and line.count("|") > 3:
        # Could be separator, but separator also contains ---; skip if line is mostly dashes.
        stripped = line.replace("|", "").replace("-", "").strip()
        if not stripped:
            return False
    # Check for closed status markers.
    if "TODO" in line.split("|")[5] if len(line.split("|")) > 5 else False:
        # If status column is TODO, not closed.
        pass
    # Simple: if line contains FIXED or FIX_VERIFIED and not TODO status, consider closed.
    # We check for FIXED/FIX_VERIFIED/WONTFIX anywhere in line, but exclude lines where
    # the status column is TODO. For robustness, just check if "FIXED" in line and "TODO" not in first 6 columns.
    cols = line.split("|")
    # cols[0] is empty before first |, cols[1] is ID, cols[2] sev, cols[3] wave, cols[4] file, cols[5] maybe status?
    # In current register, status is col 6? Let's just check: if any of FIXED/FIX_VERIFIED/WONTFIX appears
    # and the line is not a TODO row (status TODO).
    has_closed_marker = any(m in line for m in ("FIXED", "FIX_VERIFIED", "WONTFIX", "FIX_VERIFIED"))
    if not has_closed_marker:
        return False
    # Exclude rows where status is explicitly TODO (check column 6 if exists)
    if len(cols) > 6:
        status_col = cols[5] if len(cols) > 5 else ""
        if "TODO" in status_col and "FIXED" not in status_col:
            return False
    return True


def _has_handoff(line):
    # Only check the note column, not the wave/status columns.
    note = _extract_note(line)
    return any(phrase in note for phrase in HANDOFF_PHRASES)


def _has_tracking(line):
    # Only check the note column - the wave column's W\d+ must not count.
    note = _extract_note(line)
    if TRACKING_RE.search(note):
        return True
    if TODO_TRACK_RE.search(note):
        return True
    return False


def _scan_file(path):
    if not os.path.isfile(path):
        return []
    with open(path, encoding="utf-8", errors="ignore") as fh:
        lines = fh.readlines()
    violations = []
    for idx, line in enumerate(lines, start=1):
        if not _is_closed_row(line):
            continue
        if not _has_handoff(line):
            continue
        if _has_tracking(line):
            continue
        # This closed row discloses hand-off work without a tracking id.
        # Extract ID for reporting.
        m = re.search(r"R2-\d+", line)
        row_id = m.group(0) if m else f"line {idx}"
        # Find which phrase matched in the note.
        note = _extract_note(line)
        matched = [p for p in HANDOFF_PHRASES if p in note]
        snippet = note.strip()[:300] if note.strip() else line.strip()[:300]
        violations.append((row_id, idx, matched[:2], snippet, os.path.basename(path)))
    return violations


def test_no_sibling_followup_without_tracking_id():
    violations = []
    for path in (REGISTER, ROUND2):
        violations.extend(_scan_file(path))

    if violations:
        # Group by file for readability.
        by_file = {}
        for row_id, idx, phrases, snippet, fname in violations:
            by_file.setdefault(fname, []).append((row_id, idx, phrases, snippet))
        details = []
        for fname, items in by_file.items():
            details.append(f"  {fname}: {len(items)} violation(s)")
            for row_id, idx, phrases, snippet in items[:10]:
                details.append(f"    - {row_id} line {idx}: hand-off {phrases} without tracking id")
                details.append(f"      {snippet[:200]}")
            if len(items) > 10:
                details.append(f"    ... and {len(items) - 10} more in {fname}")
        detail_str = "\n".join(details)
        assert False, (
            f"R2-717 gate failed: {len(violations)} closed row(s) disclose unresolved work "
            f"without a tracking id.\n"
            f"Every note that contains hand-off phrasing (Sibling:, follow-up, is deferred, "
            f"not implemented, left open, remains open, out of scope) must also contain a "
            f"tracking id (R2-NNN, D-NNN, WNN, #NNN, or https://) so the residue is not lost "
            f"in prose.\n"
            f"See R2-717 (29 untracked of 40 hand-off rows; 1 CRITICAL, 3 HIGH).\n"
            f"Fix: open a row for each piece of residue, or add a tracking id like 'Sibling: R2-xxx'\n"
            f"or 'follow-up D-V4' to the note.\n"
            f"Violations:\n{detail_str}\n"
        )


def test_handoff_phrase_list_is_not_empty():
    """Sanity: the gate's hand-off list must contain the core Sibling/follow-up terms."""
    core = ["Sibling:", "follow-up"]
    for term in core:
        assert any(term.lower() in p.lower() for p in HANDOFF_PHRASES), f"hand-off list missing core term {term}"


def test_tracking_regex_catches_known_good_and_bad():
    """Self-test the gate's own detection so it does not produce false positives/negatives."""
    good = "Sibling: R2-520 (concrete response internally inconsistent)."
    bad = "Sibling: drawer save() still silent (try/finally no catch)."
    assert _has_tracking(good), "tracking regex should catch R2-520"
    assert not _has_tracking(bad), "bad example should not have tracking"
    assert _has_handoff(good) and _has_handoff(bad), "both should be detected as hand-off"
    assert _has_handoff("follow-up, needs RFQ API contract") and not _has_tracking("follow-up, needs RFQ API contract")
    assert _has_tracking("deferred per D-012") and _has_handoff("deferred per D-012")
