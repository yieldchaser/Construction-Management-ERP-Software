# SiteFlow Console — Final QA / Functional Audit Prompt (Phase-Wise)

Paste this whole document into Antigravity as your task prompt.

---

## 0. Non-negotiable rules — read this first, and re-read it before every phase

1. **Zero code changes.** You are not permitted to edit, refactor, "clean up," or fix anything in the codebase during this task, even if the fix seems trivial or obviously correct. Your only outputs are (a) actions taken inside the running application through its own UI, and (b) a written findings log. You may read code only to understand what a feature is *supposed* to do, never to change it.
2. **This is a live functional audit, not a code review.** Do not infer whether something works by reading the source. Actually click the button, submit the form, and observe what happens — in that screen and in any dependent screen elsewhere in the app.
3. **One phase at a time. Hard stop after each phase.** This document is split into numbered phases (Section 3). Complete every item in the current phase, write that phase's findings using the format in Section 4, then **stop completely**. Do not begin the next phase in the same turn. End your response with the phase summary and explicitly wait for me to say "continue" or "proceed to Phase N" before doing anything further. This applies even if you're confident the rest would go smoothly — no exceptions, no "since I'm already here I'll just also check the next one."
4. **No silent skipping within a phase.** If something can't be tested (missing credentials, env-gated feature, plan-tier lock), say so explicitly in that phase's log with the reason. Do not omit it and do not mark it passed by assumption.
5. **Do not fix anything you find.** Log every bug, mismatch, broken interlink, dead button, wrong calculation, or confusing state exactly as observed, with severity. Fixes happen in a separate pass later, only after I've reviewed the findings — not now.
6. **Use real demo data created through the actual UI.** Do not seed the database directly. Build out real records — projects, BOQs, POs, invoices, attendance, payroll runs — by clicking through the console like a real user would.
7. **Vary your dates deliberately.** Where a form lets you set a date, don't just accept "today" every time. Use some past dates (to exercise aging, statutory rollups, retention/TDS schedules, leave accrual) and some future due dates (overdue/upcoming logic). Note the date ranges used per item so results are reproducible.
8. **Scope: console only, not marketing pages.** Everything under `/c/[company_id]/...` and `/c/[company_id]/p/[project_id]/...`. Skip `/`, `/products`, `/blog`, `/resources`, `/pricing`, `/about`, etc.
9. **Append to one running log file continuously**, not from memory at the end of a phase. Test it, write it down immediately, then move to the next item.

---

## 1. Objective

Exhaustively test every module and submodule inside the SiteFlow console, using real UI-created data, verifying: every button/form does what it claims, every displayed calculation is numerically correct, every cross-module interlink actually propagates, every filter/dropdown works, and edge cases (empty states, validation, permission gates) behave correctly. This is a trustworthy inventory of what works and what doesn't — not a fast pass that declares things "done."

---

## 2. Setup (do this before Phase 1)

1. State which environment you're testing (local dev, or the live Vercel + Render deployment).
2. If a demo/sandbox company doesn't already exist, create one from scratch via the real signup/onboarding flow rather than starting inside an already-seeded account.
3. Create at least one demo project inside that company before Phase 7 (project-level modules).

---

## 3. Phase tracker

Copy this table into your findings log and update it as you go. Do not move a phase to ✅ until its findings have been written.

| Phase | Scope | Status |
|---|---|---|
| 1 | Auth & onboarding | ⬜ |
| 2 | Company dashboard, reports, theming | ⬜ |
| 3 | Company ops: Project, Team Schedule, CRM, Library, Services | ⬜ |
| 4 | Company Finance (full transaction suite) | ⬜ |
| 5 | Payroll & leave management | ⬜ |
| 6 | Settings, RBAC, Enterprise, Delete Logs | ⬜ |
| 7 | Project dashboard & execution (Task/Gantt/S-curve, To Do, BOQ, Drawings, DPR, Files, MOM, Towers) | ⬜ |
| 8 | Procurement & inventory (Material module) | ⬜ |
| 9 | Subcontractor & attendance | ⬜ |
| 10 | Quality, safety, equipment, production | ⬜ |
| 11 | Civil Engineering Calculators (all 7) | ⬜ |
| 12 | Integrations & statutory reports | ⬜ |
| 13 | Cross-module interlinking (end-to-end chains) | ⬜ |
| 14 | Final wrap-up & summary | ⬜ |

**After completing this table for the first time (blank, all ⬜), stop and confirm the environment and demo company/project are ready before starting Phase 1.**

---

## Phase 1 — Auth & onboarding
- [ ] Sign up via each method actually configured in this environment (phone OTP, email OTP, Google OAuth, email+password, Firebase phone auth); note which are env-gated/unavailable and why
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials (should fail cleanly)
- [ ] OTP expiry / max-attempt behavior, if testable
- [ ] First-time onboarding path (company creation, initial profile)
- [ ] Logout and re-login

**STOP. Write Phase 1 findings now. Wait for "continue."**

---

## Phase 2 — Company dashboard, reports, theming
- [ ] Dashboard — Operational tab: project counts, Project Health donut, filters, Last 7 Days Attendance, Last 7 Days Material Received
- [ ] Dashboard — Financial tab: all widgets and figures
- [ ] Chart-type switcher (bar, line, area, smooth, pie, donut, scatter, funnel, heatmap, sunburst, stacked, grouped, table) — confirm each renders correctly with your real data
- [ ] Report module — every report type (sales, payments, progress, purchase, party balances, tax, assets)
- [ ] Theme toggle (dark ⇄ light) — persists across reload, no broken/unstyled components in either theme

**STOP. Write Phase 2 findings now. Wait for "continue."**

---

## Phase 3 — Company ops: Project, Team Schedule, CRM, Library, Services
- [ ] Project module — create a new project via UI, edit it, confirm it appears everywhere it should (dashboard, switcher, project list)
- [ ] Team Schedule (company-level)
- [ ] CRM — leads, quotations, RFQ
- [ ] Library — parties, materials, cost codes (create/edit/delete each)
- [ ] Services
- [ ] Pinned-project quick actions: MOM, To Do, Chat

**STOP. Write Phase 3 findings now. Wait for "continue."**

---

## Phase 4 — Company Finance (full transaction suite)
- [ ] Finance — Party tab (create/edit a party)
- [ ] Finance — Transaction tab: Total Invoice / Total Expense / Company Balance widgets, date filter, Unbilled Materials, Pending Entries
- [ ] Finance → Create Transaction, every item one at a time — Payment In, Payment Out, Debit Note, Credit Note, Party to Party, Internal Transfer, Upload Payments, Sales Invoice, Material Sales, Material Purchase, Material Return, Material Transfer, Sub Con Bill, Other Expense, Equipment Expense — for each, create one and confirm the ledger/balance updates correctly afterward
- [ ] Finance — Payment Requests tab
- [ ] Finance — Accounts tab
- [ ] Finance — Tally Sync tab (connection status UI; if XML export is triggerable, generate one and sanity-check its structure)

**STOP. Write Phase 4 findings now. Wait for "continue."**

---

## Phase 5 — Payroll & leave management
- [ ] Payroll run (PF/ESI/TDS computed correctly — check the math)
- [ ] Payslip CSV export
- [ ] Leave application → approval flow
- [ ] Leave entitlement vs approved-used balance updates correctly
- [ ] Approved leave correctly excluded from attendance/payroll calculations

**STOP. Write Phase 5 findings now. Wait for "continue."**

---

## Phase 6 — Settings, RBAC, Enterprise, Delete Logs
- [ ] Company settings, branches, approval rules, company terms, company file assets
- [ ] Roles/Team RBAC editor — create a custom role with limited permissions, assign it to a member, confirm restricted actions are actually blocked in the UI (not just hidden) for that member
- [ ] Help section
- [ ] Enterprise — multi-company switching (if more than one company available); confirm strict data isolation between companies
- [ ] Delete Logs

**STOP. Write Phase 6 findings now. Wait for "continue."**

---

## Phase 7 — Project dashboard & execution
- [ ] Project Dashboard — Progress %, Cash In, Cash Out, Net Margin, Financial view widgets (Estimated Budget, Total BOQ Value, Total Sales Invoice, Total Expense till date, Work Done Value, Net Cash Position, Pending To-Dos, Project Value, Status)
- [ ] Task — hierarchical tasks, dependencies, Critical Path Method floats, Gantt view, list view, resources view, S-curve, milestones, baseline vs actual, rolling lookahead
- [ ] To Do (project-scoped)
- [ ] BOQ — Excel import, cost-code allocation, budgeting, budget-revision history
- [ ] Drawings — versioned revisions, pin-based RFI/clash/observation markups, approval workflow
- [ ] Daily Progress Report (DPR) — create one, confirm CSV export
- [ ] Client progress reports — generate one, confirm PDF export
- [ ] Files — upload, versioning, download
- [ ] MOM (project-scoped)
- [ ] Towers, custom fields, site chat
- [ ] Team Schedule (project-scoped)
- [ ] Party / Transaction (project-scoped) — confirm figures roll up correctly to the company-level Finance view from Phase 4

**STOP. Write Phase 7 findings now. Wait for "continue."**

---

## Phase 8 — Procurement & inventory (Material module)
- [ ] Material indents
- [ ] Purchase orders, including the approval workflow
- [ ] Goods receipt notes
- [ ] Warehouse inventory and material transactions
- [ ] Three-way PO/GRN/invoice matching
- [ ] RFQ and vendor performance scoring

**STOP. Write Phase 8 findings now. Wait for "continue."**

---

## Phase 9 — Subcontractor & attendance
- [ ] Subcontractor registration, directory, work orders
- [ ] RA bills with TDS/retention deductions — verify both pre-tax and post-tax paths by hand
- [ ] Subcontractor attendance, performance, scorecards
- [ ] Staff geofenced attendance (Haversine), face recognition if testable, weekly timesheets
- [ ] All four attendance language variants: English, Hinglish, Hindi, Tamil

**STOP. Write Phase 9 findings now. Wait for "continue."**

---

## Phase 10 — Quality, safety, equipment, production
- [ ] Quality checklists (IS-code library), site inspections, NCR, material/lab tests
- [ ] Safety incidents, toolbox talks, PPE compliance, LTIF rate
- [ ] Equipment fleet registry, fuel burn, maintenance
- [ ] Production recipes, batches, material consumption, variance tracking

**STOP. Write Phase 10 findings now. Wait for "continue."**

---

## Phase 11 — Civil Engineering Calculators
Test each with real inputs and manually verify the math, not just that a number appears:
- [ ] Paint Quantity (wall area deductions, 2-coat coverage tiers, putty/primer)
- [ ] Brick Calculator (Modular, Traditional, UK BS 3921, US ASTM presets)
- [ ] Concrete Volume & Mix (wet/dry 1.54 factor, slab/beam/column/circular column/stair, M5–M25)
- [ ] Steel Calculator (weight table, column bars, IS 13920 stirrups, one-way/two-way slab steel)
- [ ] Bar Bending Schedule (straight, stirrups, L-bend, U-bar, cranked, circular; IS 2502 vs IS 13920 hook toggle)
- [ ] Ready Mix Concrete (structure-specific pour estimation, M15–M45, transit mixer loads)
- [ ] House Construction Cost (Metro/Tier-2/GCC multipliers, phase-wise breakdown)

**STOP. Write Phase 11 findings now. Wait for "continue."**

---

## Phase 12 — Integrations & statutory reports
- [ ] Tally Prime voucher XML export — generate and inspect
- [ ] ZATCA e-invoice generation, if applicable to this deployment
- [ ] Google Sheets payroll export
- [ ] Google Drive file backup
- [ ] Zoho Books push (vendor bills)
- [ ] BI Data Export (per-company API key CSV/JSON feed)
- [ ] For anything blocked by missing OAuth credentials in this environment, confirm it fails gracefully and log as "blocked — reason," not skipped silently
- [ ] PWA install + offline punch queue, if testable
- [ ] Statutory reports — PF, ESI, BOCW cess, TDS, professional tax — confirm figures reconcile with payroll/finance data entered earlier

**STOP. Write Phase 12 findings now. Wait for "continue."**

---

## Phase 13 — Cross-module interlinking (end-to-end chains)
Perform every step of each chain in order in the actual UI, confirming the number/status changes correctly at each downstream point — don't assume propagation just because the upstream step succeeded.
- [ ] **Procurement → Finance**: Indent → PO → approval → GRN → warehouse inventory update → three-way match → Finance expense entry → company Dashboard "Total Expense" updates
- [ ] **Subcontractor billing**: Work Order → RA bill → TDS/retention computed correctly → Finance ledger and Project Dashboard Net Cash Position update
- [ ] **BOQ → Budget → P&L**: BOQ import → cost-code allocation → expense posted against a cost code → Project P&L and "Total BOQ Value / Estimated Margin" reflect it
- [ ] **Attendance → Payroll**: Multi-day attendance (including absences/late entries if supported) → weekly timesheet → payroll run → payslip matches
- [ ] **Task progress → S-curve → Dashboard**: Update task % complete/dates → confirm Gantt, S-curve, baseline-vs-actual, and Project Dashboard Progress % stay consistent with each other
- [ ] **Leave management**: Apply → approve → confirm balance updates and correct exclusion from attendance/payroll
- [ ] **Multi-tenant isolation**: No data/dropdown/search leakage between companies
- [ ] **RBAC enforcement**: Confirm the limited-permission role from Phase 6 is actually blocked from restricted actions, not just visually hidden

**STOP. Write Phase 13 findings now. Wait for "continue."**

---

## Phase 14 — Final wrap-up
- [ ] Update the Phase Tracker table to show final status of all 14 phases
- [ ] Produce a summary: total items tested, pass count, fail count, blocked count
- [ ] List Critical/Major issues only in this summary (minor/cosmetic issues stay in the full log, not repeated here)
- [ ] For any issue you believe is an obvious, low-risk fix, note it as a **suggested next step** — do not apply it. This session is testing and documentation only.

**This is the final stop. No further action after this.**

---

## 4. Findings log format

Keep one file, e.g. `docs/AUDIT_FINDINGS.md`, appended to continuously — not written from memory at the end of a phase. One entry per test:

```
### [Phase N] [Module] > [Submodule] > [Specific action]
Date/env: ...
Action performed: (exactly what you clicked/entered, including any dates/values used)
Expected result: ...
Actual result: ...
Status: PASS / FAIL / PARTIAL / BLOCKED
Severity (if FAIL/PARTIAL): Critical / Major / Minor / Cosmetic
Repro steps (if FAIL/PARTIAL): 1. ... 2. ... 3. ...
Notes: ...
```

At the end of each phase, add a short **Phase N Summary** block: items tested, pass/fail/blocked counts, and a one-line note on whether anything needs your attention before continuing.

---

## 5. Final reminder

No code is to be changed at any point in any phase. Findings only. Stop after every phase and wait to be told to continue.
