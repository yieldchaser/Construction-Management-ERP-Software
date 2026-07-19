# HY-3 task — fix legal page header alignment (privacy + terms)

```
ROLE: Fix a layout alignment bug on the legal pages. FIRST read frontend/AGENTS.md.

REPO ROOT: C:/Users/Dell/Github/Construction-Management-ERP-Software
BUG: On /privacy (and /terms), the page header (the "LEGAL" eyebrow chip + the H1 "Privacy Policy"/
"Terms of Service") hangs to the LEFT, aligned to the table-of-contents sidebar column, while the actual
body content starts further right in the main content column. The header sits outside the content
container, so its left edge does not line up with where the body text begins.

LOCATE: frontend/src/app/privacy/ and frontend/src/app/terms/ (and any shared legal layout/component they
use). The header is likely rendered outside or above the two-column (sidebar + content) grid, or in a
container with different horizontal padding/max-width than the content.

FIX: make the header share the SAME container/grid alignment as the body content so the eyebrow chip and
H1 line up with the left edge of the main content column (or span the container consistently). Apply the
same fix to BOTH privacy and terms. Do not change the copy. Keep the TOC sidebar working.

STAGING OUTPUT: docs/hy3-output/legal/ (changed files + NOTES.md with exact target src paths and a one-line
description of the alignment change).

HARD RULES: minimal change, alignment only; blue Alexandria unchanged; TypeScript strict; build green.
VERIFY: build green; /privacy and /terms return 200; describe how header + content now share alignment.
REPORT: files changed (target paths), the exact CSS/layout change made.
```
