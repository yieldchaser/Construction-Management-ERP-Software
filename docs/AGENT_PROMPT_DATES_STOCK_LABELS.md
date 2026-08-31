# AGENT PROMPT: ambiguous dates, contradictory stock figures, mangled acronyms

Four items, found by driving the app against a company that has real data. The earlier sweeps were mostly against an empty company, so these are things only populated screens show.

Report as before: command, exit code, one sentence. No pasted output. "Not run" is acceptable.

---

# PART 1: the same date renders in two different formats

The console formats dates two ways, and which one you get depends on which call site rendered it:

```
32 calls   toLocaleDateString()          browser locale, renders 7/1/2026 on a US-locale browser
15 calls   toLocaleDateString("en-IN")   renders 01 Jul 2026
```

Seen live on the same session: the depreciation schedule shows `7/1/2026` while safety shows `26 Jul 2026`.

**On this product that is not cosmetic.** `7/1/2026` is 7 January or 1 July depending on where the reader is from, and these dates sit on bills, statutory filings, muster rolls and work orders. A subcontractor and a site engineer reading the same screen in different browsers can read a different date.

## The fix

Add one shared date formatter beside `formatLabel` in `lib/siteflow.ts` and use it everywhere a date is displayed. Format `DD Mon YYYY`, explicitly `en-IN`, never the browser default.

Replace all 32 bare `toLocaleDateString()` calls. Leave `<input type="date">` values alone, since those must stay ISO. Where a call already passes `en-IN` explicitly, route it through the shared helper anyway so there is one definition.

Report the count of bare `toLocaleDateString()` calls before and after. It must reach 0.

---

# PART 2: negative stock is hidden on one screen and shown on another

Two screens render the same figure and disagree:

```
d/procurement/page.tsx:922,1126   Math.max(0, onHand - reserved)   clamps, shows 0
d/production/page.tsx:489         formatQty(item.available_qty)     shows -500 available
```

Live, `ZZ R8 Phantom Sand` reads **"-500 available · 0 reserved"** on Production and would read 0 on Procurement.

## The decision, and it reverses an earlier instruction of mine

An earlier prompt told you to clamp the procurement display with `Math.max(0, ...)`. **That was the wrong call and it is being reversed.** Hiding a negative balance hides a broken ledger. A storekeeper who sees zero assumes the bin is empty; one who sees minus 500 knows the books are wrong and raises it.

**Show the true value on both screens. Remove the clamp from procurement.** When available stock is negative, render it in the danger tone with a short label saying the recorded stock is negative and needs reconciling. Do not add a blocking dialog and do not change any backend figure.

Negative stock is reachable by design: `enforce_stock_availability` is opt-in per company, so a company with the guard off can issue beyond on-hand. The display must tell the truth about that rather than paper over it.

---

# PART 3: `formatLabel` mangles acronyms

`lib/siteflow.ts:98` maps known snake_case values and title-cases everything else. So a depreciation method stored as `slm` renders as **`Slm`**. It is SLM, straight line method, and the same will happen to every domain acronym this product is full of.

Add an acronym set that is upper-cased rather than title-cased, covering at least:

```
SLM  WDV  GST  IGST  CGST  SGST  TDS  PF  ESI  BOCW  HSN  SAC
PO   WO   GRN  RFQ   BOQ   NCR   DPR  RA   MOM  LTI   PPE  WBS  CPM
```

Check each against how the product already writes it in headings before adding, so the helper agrees with the rest of the UI. Do not invent expansions the product does not use.

---

# PART 4: the label helper is not applied everywhere

`p/[project_id]/three-way` renders a match status as a bare lowercase `pending`. The previous run applied `formatLabel` to task statuses, entity types and planning records, but not here.

Sweep for remaining raw renders of `status`, `type`, `state`, `priority` and `entity_type` and route them through `formatLabel`. The earlier count was 70 sites; report what it is now and what it is after.

**Single-word values still need the helper**, because `pending` should read `Pending`. The helper already handles that; it just is not being called.

---

## A correction to the record

An earlier prompt said `d/finance` and `p/[project_id]/finance` sit on "Loading transactions..." permanently. **That was wrong.** Waiting 15 seconds, the transactions do load and render real invoices. The page is slow, not hung, and the previous run's fix to isolate the sub-fetches works.

Do not spend time on it. If anything is worth doing there later it is performance, and that is not this run.

---

# Rules

- No authoring scripts.
- Semantic tokens only; use the existing danger tone for the negative stock case.
- Plain language. No endpoint paths, table names or permission keys. No em dashes in prose.
- Do not change any backend figure or endpoint in this run. Every item here is presentation.

# Definition of done

- [ ] One shared date formatter exists and bare `toLocaleDateString()` calls are 0. Report before and after.
- [ ] Procurement no longer clamps; both screens show the same value, and a negative reads as a warning.
- [ ] `formatLabel` upper-cases the acronym set. State what `slm` renders as now.
- [ ] Raw status renders routed through `formatLabel`. Report the count before and after.
- [ ] `python scripts/verification/check_route_reachability.py` reports **0 unreachable**, exemptions still 30.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is **1152 passed, 4 skipped** today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both run and both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 / 38 / 73 / 116.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13, with **one command that covers all five**.
- [ ] **Commit and push to `origin/main`.**
