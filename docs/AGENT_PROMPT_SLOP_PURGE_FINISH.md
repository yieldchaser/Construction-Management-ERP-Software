# AGENT PROMPT: finish the UI slop purge

`f38a81d` reported all six parts of `AGENT_PROMPT_UI_SLOP_PURGE.md` complete. Independent verification found four of the six genuinely complete and **two materially unfinished**. This run closes them. Dispatch after the native-controls run has landed.

## What was verified correct. Do not redo any of it.

- **Part 2, raw palette classes: 0.** Confirmed.
- **Part 3, gradients: 0.** Confirmed.
- **Part 4, glyphs: 301 down to 158.** Every control glyph converted, the nine no-icon glyphs correctly left in place, and the multiplication-sign exclusion **correctly widened** beyond what the prompt specified. The prompt said 47 arithmetic `×` in the two calculator files; you found 24 more that are genuinely arithmetic (`Basic × PF Employee %`, `{qty} {unit} × ₹{rate}`, `Position: x × y`). That judgement was right and the prompt was wrong. Leave all of them.
- **Part 6, the Safety incident card.** `fatality` resolves to `danger`, unknown types fall back to `neutral`, the severity stripe is gone. Confirmed.
- **Floating shadows intact.** Zero `shadow-2xl` were removed, so no modal lost its shadow.
- Help validator still `[PASS]` at 37 / 38 / 73 / 116. Backend still 1114 passed, 4 skipped.

---

# PART 1: 23 inline shadows remain

The report said 92 to 0. The actual count is **23 still present**, on elements that sit in the page flow. The rule is unchanged: an element in the flow gets no shadow, only modals, drawers, popovers, dropdowns and the flyout keep one.

```
5  app/c/[company_id]/d/home/page.tsx
3  app/c/[company_id]/d/chat/page.tsx
2  app/c/[company_id]/d/finance/page.tsx
2  components/resources/CalculatorTools.tsx
1  each: d/attendance, d/billing, d/equipment, d/help, d/hr, d/procurement
1  each: components/resources/CalcGuide.tsx, ResourceIndexGrid.tsx,
        comparison/ComparisonArticle.tsx, ComparisonMatrix.tsx, VerdictCards.tsx
```

These are unambiguous: chat message bubbles (`max-w-lg rounded-2xl p-4 shadow-sm`), `bg-card border border-border-custom` tiles in `d/home` and `d/finance`, and primary buttons. Delete the `shadow-*` class and add nothing in its place.

The five `components/resources/**` files are console-side resource pages, not the marketing site, so they are in scope.

**Verify:** report the inline count before and after. It must reach 0 while the floating count stays where it is.

---

# PART 2: 86 of the 101 pill sites still do not use Badge

`components/ui/Badge.tsx` was built correctly, including the `chart-1` through `chart-8` extension for maps that need more than six tones. **Only 7 files import it.** The report claimed adoption across all status pills in the console; the real figure is 15 sites converted out of 101.

**86 hand-rolled pill sites remain across 39 files:**

```
14  app/c/[company_id]/d/finance/page.tsx
 8  app/c/[company_id]/settings/page.tsx
 6  app/c/[company_id]/d/procurement/page.tsx
 5  app/c/[company_id]/d/home/page.tsx
 5  app/c/[company_id]/d/production/page.tsx
 4  app/c/[company_id]/d/billing/page.tsx
 4  app/c/[company_id]/d/drawings/page.tsx
 2  app/c/[company_id]/d/attendance/page.tsx
```

plus the remaining 31 files. Find them with the shape the earlier sweep used: an element carrying `rounded-full`, a `px-` padding class, and a small text size (`text-[9px]`, `text-[10px]`, `text-[11px]` or `text-xs`).

Convert every one to `<Badge>`. The rules from the original prompt still hold and are repeated because this is the part that drifted:

- One visual language. No solid fill with white text anywhere. That count is already 0 and must stay 0.
- **Never collapse two states in the same map onto one tone.** Count each map's states and its distinct tones before and after; if the tone count would drop, use the `chart-N` tones for the overflow. `statusColors` in `d/quality/page.tsx` and `p/[project_id]/quality/page.tsx` carries 7 states and is the known case.
- A pill that is not a status, for example a count badge inside a button, is not a `Badge`. Leave those and say which you skipped.

**Verify:** report the hand-rolled pill count before and after, and the number of files importing `Badge`.

---

# PART 3: one emoji

`app/c/[company_id]/d/planning/gantt/page.tsx:659`:

```jsx
{baselineSaving ? "Freezing..." : "📸 Freeze New Baseline"}
```

The console emoji purge missed this and so did the previous prompt. It is the only emoji left in the console. Replace it with an existing icon from the closed 120-name union, sized to match the neighbouring buttons, and keep the label text exactly as it reads. If no icon fits, drop the emoji and keep the words alone.

---

# Definition of done

- [ ] Inline console shadows: **23 to 0**. Floating count unchanged, and still zero `shadow-2xl` removed.
- [ ] Hand-rolled pill sites: **86 to 0**. Report the count of files importing `Badge`.
- [ ] No status map loses a tone. Report states and distinct tones per converted map.
- [ ] Console emoji: **1 to 0**.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` still 1114 passed, 4 skipped.
- [ ] `cd frontend && npx tsc --noEmit` clean, `npm run build` completes.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.

**Report the measured number for every box, produced by a command, not asserted.** Two of the six parts in the last run were reported complete when they were not, so a count without the command that produced it will not be accepted.
