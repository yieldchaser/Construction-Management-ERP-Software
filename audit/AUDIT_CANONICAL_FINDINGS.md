# SiteFlow — CANONICAL FINDING LIST

Generated from `docs/AUDIT_ROUND2_FINDINGS.md` by `scratchpad/mkcanon.py`. **This file, not the
32k-line register, is the input for fix-prompt authoring.** Regenerate after any new batch.

| Bucket | Count |
|---|---|
| Numbers issued (R2-001 … R2-601) | **601** |
| Retracted as duplicates (Round 11) | 14 |
| Duplicate filed by the audit itself | 1 |
| Already FIX_VERIFIED (in register, for reference) | 93 |
| FIXED this session (awaiting founder live-verify) | 6 |
| WONTFIX | 1 |
| **ACTIONABLE — need a fix prompt** | **576** |

**Actionable by severity:** CRITICAL **172** · HIGH **231** · MEDIUM **161** · LOW **12**

---

## DO NOT WRITE PROMPTS FOR THESE

| Number | Reason | Use instead |
|---|---|---|
| R2-567 | retracted duplicate | **R2-177** |
| R2-569 | retracted duplicate | **R2-221** |
| R2-571 | retracted duplicate | **R2-432** |
| R2-574 | retracted duplicate | **R2-246** |
| R2-575 | retracted duplicate | **R2-364** |
| R2-576 | retracted duplicate | **R2-386** |
| R2-577 | retracted duplicate | **R2-143** |
| R2-579 | retracted duplicate | **R2-552** |
| R2-581 | retracted duplicate | **R2-552** |
| R2-584 | retracted duplicate | **R2-275** |
| R2-585 | retracted duplicate | **R2-258** |
| R2-586 | retracted duplicate | **R2-257** |
| R2-587 | retracted duplicate | **R2-052** |
| R2-591 | retracted duplicate | **R2-098** |
| R2-439 | same defect as R2-098, filed twice | **R2-098** |
| R2-109 | retracted duplicate — same defect as R2-032 (CTC formula double-counting employee PF; closed by `261bd41`) | **R2-032** |
| R2-009 | FIXED by commit `cd01b15`; drawings SITE_PHOTOS/FOLDERS scope closed by `769ba9b` | — |
| R2-058 | FIXED by commit `cd01b15` | — |
| R2-223 | FIXED by commit `cd01b15` | — |
| R2-234 | FIXED by commit `cd01b15` | — |

---

## ACTIONABLE FINDINGS

### CRITICAL (172)

| # | Finding | Register line |
|---|---|---|
| R2-014 | "Sync Offline Queue" DELETES offline attendance punches | 707 |
| R2-017 | The main "Dashboard" shows 4 fabricated projects and hides the real one | 857 |
| R2-024 | Production UI has a "Create Demo Request" button that calls the OTP auth endpoint with hardcoded demo credentials | 1099 |
| R2-025 | Enterprise Rollup "Net Balance" formula subtracts receivables (sign error) | 1163 |
| R2-027 | Face Recognition log endpoint 500s on every call; UI disguises it as "no data" | 1240 |
| R2-028 | `NameError: models is not defined` breaks 3 billing endpoints (STILL LIVE) | 1330 |
| R2-035 | Project progress ignores task progress entirely; buckets by status instead | 1550 |
| R2-036 | Analytics "Spend" counts sales invoices as expenditure | 1582 |
| R2-039 | Reports ship 91 hardcoded-empty columns across 21 builders (incl. Balance Due) | 1672 |
| R2-042 | Payments recorded in the UI can never settle an invoice (no party sent) | 1784 |
| R2-043 | Tally export pushes receipts and transfers into Tally as PURCHASE vouchers | 1827 |
| R2-046 | 28 project-level routes have zero inbound links (unreachable by clicking) | 2209 |
| R2-047 | 9 company-level routes are completely unreachable, including the Project Hub | 2232 |
| R2-049 | Equipment code uniqueness is global, not per company (cross-tenant) | 2286 |
| R2-050 | Indent and PO approvals mark themselves approved regardless of the server | 2318 |
| R2-051 | GRN creation sends placeholder item IDs and falls back to "local only" | 2347 |
| R2-052 | `PaymentRequest.party_company_user_id` points at `users`, not `company_team` | 2390 |
| R2-060 | Attendance fabricates a GPS location when geolocation is denied or times out | 2622 |
| R2-067 | Cost Control: two of four budget lines are hardcoded to zero, and a third is incomplete | 2849 |
| R2-068 | Every photo-evidence control substitutes a hardcoded Unsplash stock photo | 2963 |
| R2-073 | Emptying a role's permissions grants that role FULL ACCESS | 3112 |
| R2-074 | Three approval endpoints are gated on permission keys no role can hold | 3151 |
| R2-075 | 58 of the 82 reports in the catalogue have no backend implementation | 3225 |
| R2-076 | Report handler exceptions are swallowed and returned as an empty report | 3285 |
| R2-080 | The Render keep-alive does not work; the backend cold-starts in normal use | 3397 |
| R2-081 | Analytics counts sales revenue as project SPEND (live, exact figures) | 3510 |
| R2-083 | The Company Dashboard decorates real projects with fabricated attributes | 3565 |
| R2-086 | R2-027 is NOT fixed: face-recognition logs still 500, and the audit table has no timestamp | 3655 |
| R2-090 | R2-050 PROVEN LIVE: PO shows "Approved / Sent" after the server returns 403 | 3784 |
| R2-091 | The Purchase Order vendor dropdown is a hardcoded list of invented companies | 3813 |
| R2-092 | "Compare RFQs" recommends awarding business to vendors that do not exist, and hands the wrong vendor to the PO | 3844 |
| R2-096 | The party ledger subtracts receivables from the balance, inverting every party's position | 3918 |
| R2-099 | Company-level Finance loads nothing unless a project happens to be selected | 3999 |
| R2-105 | R2-014 REPRODUCED LIVE: "Sync Offline Queue" destroyed 3 punches and reported success | 4178 |
| R2-106 | "Simulate GPS lock (On-Site)" is a production checkbox that defaults to ON and forges location verification | 4211 |
| R2-109 | "Total Monthly CTC" double-counts the employee's own PF contribution | 4289 |
| R2-110 | R2-013 #3 REPRODUCED: the Holiday Calendar is local-only and seeded with a fabricated, factually wrong holiday | 4322 |
| R2-112 | R2-074 CONFIRMED IN THE UI: the permission matrix itself marks the three enforced approve keys as ungrantable | 4407 |
| R2-113 | "Clear All" + "Save Permissions" is a two-click path to R2-073's privilege escalation | 4430 |
| R2-116 | The Delete Logs page fires ~16 requests/second forever and never loads | 4500 |
| R2-123 | The product has a proper Library Hub as the single source of truth, and three modules ignore it in favour of hardcoded fiction | 4774 |
| R2-126 | Statutory returns are computed from *today's* master data, not the return period's payroll | 4900 |
| R2-127 | ESI is charged for every employee if *any* single employee is ESI-applicable | 4936 |
| R2-128 | BOCW cess is levied on wages instead of the cost of construction | 4963 |
| R2-131 | Six backend sites resolve party names through `users` and fall back to "Unknown"; the correct two-step lookup exists in exactly one file and was never | 5051 |
| R2-132 | Every match is created as "pending"; the matched/mismatch classification is unreachable | 5140 |
| R2-133 | The caller can dictate the match verdict and who approved it | 5165 |
| R2-137 | 219 of 307 `if (res.ok)` checks have no `else`; this is the mechanism that hid a live outage from an entire audit round | 5505 |
| R2-138 | R2-116 exhausts the database connection pool and takes down authentication | 5567 |
| R2-139 | The delete-logs route is mounted at the API root and swallows any single-segment path, 500ing on an unhandled `ValueError` | 5602 |
| R2-140 | chat membership is checked in one ID space and stored in another, so the group-membership gate can never pass | 5691 |
| R2-148 | on the company To-Do list, "complete" and "delete" only change React state; the server is never told | 5841 |
| R2-157 | `POST /custom-fields/values` never checks that the target entity belongs to the company being authorised against | 6057 |
| R2-169 | R2-073's precondition is confirmed — the API accepts and stores an empty permission set | 6384 |
| R2-171 | two seeded roles hold nine permission keys that no longer exist in the taxonomy, and those roles can no longer be saved at all | 6423 |
| R2-172 | the permissions modal silently strips any stored key it does not recognise, so saving Manager or Project partner revokes ten approve rights without sa | 6507 |
| R2-173 | the project Transaction page reports ₹0 received on a project the server says has ₹90,000 in | 6552 |
| R2-178 | the approval-rules screen offers 15 categories; only 2 are consulted by any code, and the other 13 configure nothing | 6719 |
| R2-181 | there is no way to add a person to a company; the entire RBAC system governs a tenant that can only ever have one member | 6857 |
| R2-184 | generated client-report PDFs are written to the container's local disk on Render, so every report is destroyed on the next deploy or restart while the | 6929 |
| R2-187 | pushing a bill to Zoho Books is not idempotent and nothing records that it was pushed, so every click creates another bill in the customer's accountin | 7012 |
| R2-194 | CRITICAL (raises R2-139): the greedy delete-logs route swallows *plausible* API paths, turning them into unhandled 500s — reproduced live, twice, and  | 7277 |
| R2-198 | 29 redirect routes send the user to `/c/undefined/...`, and every company-scoped API call on the destination page carries the literal string `undefine | 7530 |
| R2-201 | an employee with **no attendance records at all** is paid a full month | 7675 |
| R2-205 | reporting material wastage does not reduce stock; the material stays on the books as available | 7890 |
| R2-209 | the Zoho Books bill push fails 100% of the time — no bill has ever reached Zoho, and it has been broken for at least two weeks | 8295 |
| R2-210 | **punch-OUT always fails.** Attendance can be started and never completed, so `hours_worked` is never written for anybody | 8405 |
| R2-214 | "✓ Auditor Approve" on a bill approves nothing | 8847 |
| R2-215 | "Record Usage" decrements stock on screen and saves nothing | 8859 |
| R2-219 | approving a PO **overwrites its fulfilment status**, resetting a fully-received PO to "sent" and re-opening goods receipt | 8931 |
| R2-221 | `/finance/pl` 500s whenever **any equipment deployment is open**, and that single failure blanks the entire Finance module | 9068 |
| R2-222 | CRITICAL (class finding): naive/aware `datetime` arithmetic crashes **five** endpoints, three of them silently | 9123 |
| R2-226 | **project deletion is fire-and-forget** — the response is never checked, on the most destructive action in the product | 9269 |
| R2-228 | per-tower P&L is not per-tower — every tower is credited with the **entire project's** POs, work orders and billing | 9319 |
| R2-231 | no bill can ever be marked paid from the product — the only settlement engine is unreachable, so every invoice is permanently "Unpaid" with `paid_amou | 9544 |
| R2-232 | a bill can never be cancelled, voided or deleted — a mistyped invoice permanently distorts every financial report | 9647 |
| R2-235 | every party balance and the enterprise rollup subtract receivables instead of adding them — money owed *to* the company is reported as if the company  | 9859 |
| R2-236 | `/finance/ledger` returns a deterministic 500 on the real project, the failure never reaches Sentry, and the 500 carries no CORS headers so the browse | 9920 |
| R2-239 | goods receipt accepts unlimited over-receipt against an unapproved PO — 300 units were booked into stock against a purchase order for 100 | 10127 |
| R2-240 | the three-way match measures the invoice against the goods *received*, with no cap on receipt — so over-receiving raises the amount a vendor may over- | 10172 |
| R2-243 | the project P&L counts every subcontractor bill twice — once as Material Cost and again as Subcontractor Cost | 10340 |
| R2-244 | R2-221 root cause found — one equipment deployment with no end date makes the whole project P&L return 500, because `utcnow()` is subtracted from a ti | 10396 |
| R2-246 | a Critical NCR can be closed in one call, straight from `open`, with no review and no reviewer recorded | 10477 |
| R2-248 | every per-tower report ignores the tower and returns the whole project, so a project's spend is multiplied by its number of towers | 10557 |
| R2-252 | an incident typed "Fatality" is excluded from the safety statistics, because `incident_type` is unvalidated free text and the LTIF calculation matches | 10839 |
| R2-257 | stored XSS — a timesheet's `file_url` accepts a `javascript:` URL and the Team Action page renders it as a clickable link | 11102 |
| R2-262 | punching out always fails with a 500, which leaves the attendance record open forever and locks the worker out of attendance for the rest of the day | 11354 |
| R2-266 | CSV formula injection — free text typed into the product is written into exports unescaped, and executes when the file is opened in Excel, LibreOffice | 11595 |
| R2-270 | creating a chat group from the console always fails — the UI sends a `users.id` into a column that references `company_team` | 11773 |
| R2-271 | the invoice PDF's line items and its totals are never reconciled — a ₹10 line item is printed on a ₹1,00,000 invoice | 11831 |
| R2-283 | the statutory compliance module cannot create a single record — every write 500s because the code passes a column that does not exist | 12433 |
| R2-288 | statutory payroll percentages are completely unbounded — a 999% PF deduction and a negative employer contribution are both accepted | 12645 |
| R2-300 | deleting a project silently destroys every financial record under it, and the audit trail records only that "a project" was deleted | 13346 |
| R2-303 | the budget burn-down curve compounds — each month adds the running total again, so month N reports N times the real spend | 13489 |
| R2-304 | analytics invents eight hours of labour for every attendance record that has no hours — and because punch-out always fails, that is every record | 13529 |
| R2-307 | the face-recognition attendance module is non-functional in three of its four endpoints, and its one write endpoint commits the record *before* failin | 13674 |
| R2-308 | the database connection pool is being exhausted on `/auth/me`, 26 times in 24 hours, and the trend is escalating | 13823 |
| R2-310 | the Delete Logs page contains an unbounded React fetch loop, caused by one object literal in a dependency array — this is the cause of the pool exhaus | 13927 |
| R2-312 | sixteen reports swallow every exception and return an empty list, so the Party Ledger reports a company with nine invoices as having no transactions | 14268 |
| R2-313 | the Party Ledger's "Balance" is one company-wide running total, not a per-party balance — and All Party Balances publishes it as each party's closing  | 14529 |
| R2-315 | `BankAccount.balance` is written once at account creation and never again — so the Finance dashboard's Company Balance ignores every bank payment ever | 14604 |
| R2-326 | the Finance tab and the enterprise rollup call every bill that is not literally `"sale"` an expense — including `material_sale`, which is revenue | 15019 |
| R2-327 | the project P&L counts subcontractor cost twice, and equipment bills never reach the Plant & Machinery line | 15066 |
| R2-337 | the rate limiter keys on Render's internal proxy address, so every user of the platform shares one bucket — and the proxy address rotates, so nobody's | 15583 |
| R2-339 | the client progress report always states 0% timeline completion, because it counts a status string nothing ever writes | 15796 |
| R2-342 | `PATCH /finance/approve/{id}` approves a bill or a payment in one call — no rule, no level, no state check, and no record of who did it | 15935 |
| R2-344 | a payment recorded as `transfer` settles the party's expense bills, marking vendor invoices Paid for money that was never a payment to them | 16091 |
| R2-348 | a goods receipt accepts any quantity against a PO line — over-receipt inflates stock and flips the PO to "received" | 16257 |
| R2-352 | when an employee has no attendance, payroll pays them a full month — so the attendance-driven payroll is a full-salary default | 16437 |
| R2-353 | payroll runs are not idempotent — running the same month twice creates a second finalized run and doubles the liability | 16473 |
| R2-356 | `GET /finance/pl` returns 500 whenever a project has an open equipment deployment — the normal state of a working site | 16605 |
| R2-362 | an inspection's pass/fail summary is computed from the current request instead of from its stored responses, so a failed inspection becomes a pass by  | 16914 |
| R2-365 | a drawing can hold any number of simultaneously-approved revisions, and no field, flag or ordering identifies the current one | 17078 |
| R2-371 | `Bill` has no `po_id`, so "billed versus ordered" cannot be computed anywhere in the product | 17366 |
| R2-374 | every tower shows the whole project's figures, so a three-tower project reports its costs three times | 17487 |
| R2-380 | `negative_stock_lock` guards one of the two endpoints that consume material, and the unguarded one creates negative stock out of nothing | 17779 |
| R2-389 | the entire team-management module 500s on every company, because it reads a column that does not exist | 18662 |
| R2-392 | the Zoho Books push fails for every bill that carries GST, so the integration cannot export a normal Indian vendor bill | 19238 |
| R2-396 | the CSV export is formula-injectable, and the product already stores a formula payload | 19622 |
| R2-399 | the invoice PDF is not a valid Indian tax invoice — it carries no GSTIN, no HSN/SAC, no CGST/SGST split, no place of supply and no signature block | 19749 |
| R2-407 | the server-side CSV exports are formula-injectable, and the payload already sitting in the database comes straight out | 20082 |
| R2-410 | the Tally export creates no tax ledgers and posts the GST-inclusive total to Sales/Purchase, so input credit is expensed and output liability is burie | 20196 |
| R2-416 | the company-level Finance dashboard never loads its data, because its effect is gated on a project being selected | 20647 |
| R2-418 | the party balances and the TO PAY tile on the same screen differ by ₹1,96,000 — exactly the receivable | 20858 |
| R2-423 | four fabricated projects with invented clients and personnel are the initial state of the dashboard, and they render whenever the projects fetch fails | 21023 |
| R2-426 | the Payment Approval screen ships a "+ Create Demo Request" button that creates a genuine ₹45,000 payment request against a real party | 21170 |
| R2-430 | `GET /hr/attendance/company/{cid}/{date}` returns 500 whenever the day has any attendance rows, and 200 when it has none | 21389 |
| R2-431 | the same missing data makes the attendance screen say "Absent" and the payroll engine pay a full month | 21423 |
| R2-432 | goods can be received against a purchase order that has never been approved | 21581 |
| R2-434 | every inspection is attributed to a hardcoded fictional inspector, and the filter offers her as the only choice | 21684 |
| R2-435 | every drawing pin created from the console is rejected with 422, and the failure is caught and hidden behind a local-only pin | 21762 |
| R2-437 | the CRM's shipped status vocabulary and the Lead Status Funnel's expected vocabulary are disjoint sets, so the funnel can never advance past stage 1 f | 21871 |
| R2-444 | "MATERIAL USED TODAY — No consumption logged" is displayed directly above the DPR that logged today's consumption | 22245 |
| R2-447 | the company-wide task rollup returns 500, so Team Schedule renders "0 tasks" and "Loading schedule…" permanently | 22443 |
| R2-448 | the project dashboard's financial view drops the `expense` and `payment_in` invoice types entirely, so a ₹5,900 expense and an ₹11,800 payment-in appe | 22733 |
| R2-455 | every task comment and every progress entry is written under a hardcoded fictional identity, "Vikram Joshi (Site Engineer)", and the server stores wha | 23074 |
| R2-456 | "PROGRESS ENTRY & MEASUREMENT BOOK" does not record progress — the button labelled `Log Progress` posts a comment, and the measured quantity never rea | 23123 |
| R2-458 | the 14-Day Lookahead excludes overdue open work, so a critical task 23 days late at 75% complete appears in no forward schedule | 23168 |
| R2-459 | a task card shows neither progress, status, end date nor overdue state, so a 75%-complete critical task 23 days late is visually identical to a fresh  | 23204 |
| R2-462 | twenty-one project module tabs navigate to `/c/undefined/…`, breaking every company-scoped request on the destination screen | 23322 |
| R2-464 | the drawings module contains no file input at all, and `Upload New Revision` attaches the *first existing revision's* file to the new one | 23379 |
| R2-468 | no chat group can ever be readable, because `verify_group_membership` compares `chat_group_members.user_id` to `users.id` while the column is a foreig | 23554 |
| R2-469 | creating a chat group from the console always returns a CORS-less 500, because the client sends `users.id` into `ChatGroup.created_by`, a foreign key  | 23615 |
| R2-470 | a group with no members can never gain one — the add-member route is itself gated on being a member | 23651 |
| R2-473 | "Today's Attendance" opens on a hardcoded date literal, so today's punches are never displayed — and four more screens ship the same fiction | 23751 |
| R2-474 | "GPS Verified" is a checkbox the user ticks, not a measurement — a punch submitted from London coordinates was accepted as verified and Present | 23791 |
| R2-476 | the subcontractor crew drawer is pre-loaded with fifteen invented workers, and submitting posts them as real attendance without checking a single resp | 23875 |
| R2-477 | "Restrict creating entries older than N days" is enforced on three write paths and silently ignored by every other dated write — proved on one company | 23964 |
| R2-482 | the M5 and M7.5 cement factors do not follow the mix ratios and the 1.54 dry factor the same screen declares — M7.5 over-orders cement by 17% | 24159 |
| R2-487 | the project's Party register is empty and reports ₹0 payable, on a project carrying ₹1,35,700 of unpaid bills — raising a bill against a party never l | 24473 |
| R2-490 | `TOTAL OUT ₹0.00` is printed immediately above a table of ₹1,41,600 of outflows, and the four tiles use three different bases — none of them money act | 24621 |
| R2-497 | the budget-burn series adds an already-cumulative monthly total into a running cumulative, so reported spend multiplies by the number of months elapse | 24947 |
| R2-503 | every depreciation figure is supplied by the client and stored verbatim — the schedule's own parameters never compute or validate anything | 25164 |
| R2-509 | the Enterprise Rollup's net balance subtracts receivables instead of adding them, so money owed to the company makes its position look worse | 25450 |
| R2-511 | every rate limit in the product is keyed on Render's proxy IP, so all users of the platform share about three buckets — one attacker exhausts the logi | 25601 |
| R2-515 | the offline punch queue is deleted, not transmitted — "Synced 2 queued punches successfully" is printed while zero rows reach the server | 26127 |
| R2-522 | `/statutory/{cid}/gstr1` cannot produce a GSTR-1 — it reads the payroll table and returns wages and TDS, and the company's actual GST outward supply i | 26557 |
| R2-523 | the PF ECR cannot be filed — every line carries `uan: "NOT_LINKED"`, and the employer's 12% is never split into EPS and EPF | 26605 |
| R2-524 | Form 26Q is built from the salary population, so it excludes the only 194C deduction the company actually has and stamps `pan: "NOPANAVAIL"` on every  | 26650 |
| R2-533 | the cashbook payments importer has no idempotency and silently coerces every field it cannot read — re-uploading one file books every payment a second | 27145 |
| R2-538 | `POST /three-way` computes the match verdict correctly and then accepts the client's verdict instead — a live record shows `"matched"` against a ₹7,17 | 27457 |
| R2-540 | `GET /hr/timesheets/company/{company_id}` filters on `Timesheet.company_id`, a column that does not exist — it 500s for every company, always | 27683 |
| R2-541 | thirteen write routes require company membership but no permission — including the one that replaces the signature and stamp printed on tax invoices | 27736 |
| R2-543 | the duplicate-reference guard on payments loses the race — six concurrent identical requests created two payments with the same reference number | 28036 |
| R2-544 | a payment with no project is excluded from the Finance summary's transactions and its In/Out totals, but still moves the company cash balance — the sc | 28090 |
| R2-547 | the company-wide payroll defaults accept a **negative** PF deduction rate and a 99.9% ESI rate, while the per-employee form rejects the identical valu | 28332 |
| R2-549 | a party-to-party transfer is invisible in the Finance module that hosts it — no ledger row, no movement in In/Out, no change in the balance | 28469 |
| R2-557 | `DELETE /projects/{id}` cascades to 51 child tables with no warning, no impact count and no way back, and the audit trail records one line that names  | 28985 |
| R2-565 | adding a task dependency permanently breaks the planning module for that project, and no route exists to undo it | 29573 |
| R2-568 | one physical machine can be deployed to unlimited projects at the same time, and every concurrent deployment bills the project separately | 29770 |
| R2-588 | the Weekly Timesheet Approvals table is never populated, so no timesheet can ever be submitted or approved through the console | 30505 |
| R2-599 | creating a Daily Progress Report mutates a task that belongs to a different project, because the task is looked up by id alone | 31644 |

### HIGH (231)

| # | Finding | Register line |
|---|---|---|
| R2-006 | Drawings module cannot create a first drawing; failure is silent | 2045 |
| R2-007 | Purchase Order vendor is never saved; UI shows a fabricated vendor instead | 2086 |
| R2-008 | "RFQ Analysis Center" presents fabricated vendor quotes as real data | 2113 |
| R2-011 | `party_type`: 6 of 9 dropdown options return 422 and fail silently | 563 |
| R2-013 | HR module: three flows report "success" while saving nothing | 654 |
| R2-019 | HR Holidays feature is entirely disconnected from the backend | 908 |
| R2-021 | Project dashboard: "Cash In" isn't cash, and Margin disagrees with the Transaction tab | 964 |
| R2-032 | "Total Monthly CTC" double-counts employee PF and hardcodes 24% | 1439 |
| R2-033 | Payroll pays a full pro-rated month when there is NO attendance data, shown as if measured | 1471 |
| R2-034 | RA Bills cannot be submitted: subcontractor dropdown never populates; WOs show "Unassigned" | 1512 |
| R2-041 | GSTR-1/GSTR-2 can never produce IGST; tax is always split 50/50 CGST/SGST | 1745 |
| R2-055 | 16 confirmed unchecked writes, covering every edit and delete flow | 2473 |
| R2-059 | Payment approve / reject / mark-paid fails silently | 2596 |
| R2-069 | Payment attachment records a filename; the file is never uploaded | 3005 |
| R2-087 | Zoho Books bill push is broken three separate ways, one caused by R2-052 | 3692 |
| R2-093 | "Take Item Photo" fabricates photo evidence — proven live | 3873 |
| R2-111 | R2-013 #2 REPRODUCED: "Add Workforce" saves nothing, and its cost codes are invented | 4352 |
| R2-141 | "Delete Group" calls a route that does not exist, and the 405 is swallowed | 5720 |
| R2-142 | chat group roles are enforced only in the browser; any member can add, remove and promote anyone, including demoting the admin | 5734 |
| R2-143 | creating a chat group writes an FK-invalid member row from a client-supplied `created_by`, and the group row is committed first | 5760 |
| R2-149 | the entire "Repeat Settings" modal is decorative — the value is never sent, and nothing in the backend ever expands a recurrence | 5864 |
| R2-151 | Labour and Equipment committed *and* actual are hardcoded `0.0`, and the UI renders them as measured ₹0 rows | 5923 |
| R2-152 | `GET /budget/committed/{project_id}` writes to the database and commits | 5947 |
| R2-153 | the budget's "actual" ignores two of the four expense invoice types, including the one named `equipment` | 5964 |
| R2-155 | the "Set Value" screen is write-only — values are posted, fetched, and thrown away without ever being rendered | 6013 |
| R2-156 | the field builder offers six entity types; only three surfaces in the product read custom fields, so four of the six are unfillable | 6036 |
| R2-158 | a `date` custom field cannot be given a date from this screen — the value is collected, marked required, and never sent | 6097 |
| R2-160 | the Concrete calculator's "Column" mode silently reuses the Steel Column calculator's inputs, so two tabs corrupt each other | 6133 |
| R2-161 | every number in the House Construction Cost calculator is invented, and the output is presented as a rupee total | 6156 |
| R2-163 | the console and the API compute a *different* house cost — R2-010's duplication has produced a live divergence | 6189 |
| R2-165 | Chat has no responsive layout at all; on a phone the message pane is 171 px wide | 6247 |
| R2-166 | on Attendance the mobile header is clipped by an `overflow:hidden` ancestor, so its right-hand controls cannot be reached at all | 6267 |
| R2-167 | the Attendance page opens on a hardcoded date — 30 June 2026 — and will drift further every day | 6283 |
| R2-168 | the hardcoded-date defect is systemic — five frozen dates across four screens, including the payroll month | 6314 |
| R2-170 | three permissions the server requires cannot be granted by any means — confirmed mechanically and live | 6399 |
| R2-175 | there is no way to delete an uploaded file, at any level | 6610 |
| R2-177 | 26 routers create records and can never delete them, and the core transactional documents have no general edit either | 6660 |
| R2-179 | enforcement is bound to the UI's category label by exact string match, with the fragility documented in a comment instead of fixed | 6746 |
| R2-180 | every write endpoint accepts unknown fields, ignores them, and returns 200 — a client field-name typo is a silent no-op with a success response | 6781 |
| R2-182 | signing into a second account silently replaces the session in every open tab | 6888 |
| R2-185 | every CSV export is vulnerable to formula injection, and the values come from free-text fields users control | 6958 |
| R2-186 | a user can belong to several companies, and there is no way to switch between them | 6980 |
| R2-188 | when the vendor cannot be resolved, the bill is pushed to Zoho Books under a vendor literally named "Vendor" | 7027 |
| R2-189 | `push_bill` has no permission check, unlike every other endpoint in the same file | 7044 |
| R2-192 | integration *actions* require only company membership, and Google Sheets has no permission check anywhere — including the OAuth grant | 7114 |
| R2-195 | 120 N+1 query sites across 23 routers, concentrated in exactly the endpoints that return the most rows | 7331 |
| R2-196 | there is no sign-out — anywhere in the product | 7380 |
| R2-197 | ESI eligibility is decided from **basic salary** instead of gross wages, so employees over the statutory ceiling are enrolled | 7438 |
| R2-199 | "Enable Push" reports success and subscribes to nothing; push notifications cannot be delivered at all | 7624 |
| R2-202 | a BOQ budget revision is a write-only log entry; the "Budget vs Actual" screen it sits next to never uses it | 7788 |
| R2-203 | HIGH the LTIF caption hardcodes "Calculated on 50,000 manhours basis", which is wrong precisely when the data is real | 7843 |
| R2-204 | an NCR records no accountability — nobody can tell who raised it or who closed it | 7862 |
| R2-211 | the transaction modal applies invoice semantics to money-receipt types — an ₹10,000 receipt was booked as ₹11,800 with GST added | 8530 |
| R2-212 | a Lost Time Injury can be closed with **no root cause and no corrective action** | 8775 |
| R2-216 | "Mark as Billed" on a GRN is a local flag | 8874 |
| R2-220 | date-only values are stored as IST-shifted timestamps, so a holiday entered as 15 Aug persists as 14 Aug 18:30 UTC | 9046 |
| R2-224 | timesheet times are stamped with a `Z` suffix on local wall-clock values, so every entry is stored 5½ hours off | 9223 |
| R2-229 | "Billed" sums **every** bill type — purchases, expenses and even payment receipts count as billed value | 9346 |
| R2-230 | the Blueprints module cannot accept a drawing file, and a "new revision" silently reuses the previous revision's file | 9396 |
| R2-233 | Budget "Actual" is wrong four separate ways — two cost types are hardcoded to zero, two invoice types are filtered out, and unapproved bills are count | 9699 |
| R2-237 | R2-233 confirmed live — 83% of a project's spend is missing from Budget vs Actual | 10016 |
| R2-238 | settlement vouchers are booked into the ledger as material costs — recording a receipt makes the project look like it spent money | 10055 |
| R2-241 | the three-way match never classifies itself, and the verdict is caller-supplied — a ₹717,777 variance was stored as "matched" on request | 10228 |
| R2-242 | Budget counts draft, unapproved purchase orders as committed cost | 10285 |
| R2-245 | wastage can exceed the stock that exists, does not reduce stock, and reaches no financial report | 10447 |
| R2-249 | the tower budget report's "Committed" column is the budget itself, so committed spend can never differ from the budget | 10623 |
| R2-250 | the tower reports count sales invoices as project spend — ₹118,000 of revenue is reported as ₹118,000 of cost | 10647 |
| R2-253 | a subcontractor bill is never compared to its work order — ₹5,90,000 was billed against a ₹50,000 work order and accepted without comment | 10901 |
| R2-254 | a production batch can consume material the project does not have, driving stock to −9,699 | 10940 |
| R2-258 | a one-hour typo in a timesheet is silently recorded as a 23-hour shift | 11156 |
| R2-259 | a drawing revision's approval can be flipped back and forth indefinitely, and each flip erases who approved it | 11191 |
| R2-260 | custom fields enforce nothing they promise — the type is ignored, the required flag is ignored, and values attach to records that do not exist | 11219 |
| R2-263 | a muster roll accepts 240 hours worked by zero workers | 11418 |
| R2-264 | subcontractor attendance bills overtime and allowances for zero workers, at any shift multiplier | 11439 |
| R2-265 | depreciation is not calculated — every figure is supplied by the caller, none are reconciled, and the schedule's own rate contradicts the asset's usef | 11458 |
| R2-267 | the Tally export books customer receipts as purchases, so money received becomes a payable in the statutory books of account | 11641 |
| R2-272 | the invoice PDF omits the party for some members and carries none of the fields an Indian tax invoice requires | 11876 |
| R2-274 | a BOQ revision is recorded, changes nothing, and does not even record what changed | 11993 |
| R2-275 | a BOQ can report 99 of 5 milestones complete, and the contradiction is printed on the client-facing PDF | 12030 |
| R2-276 | party names fail to resolve on three separate surfaces, each with a different placeholder, for ids that resolve correctly elsewhere | 12064 |
| R2-279 | the brickwork calculator ignores wall thickness when counting bricks, so a 230 mm wall is quoted the same brick count as a 115 mm wall | 12267 |
| R2-280 | calculators return negative material quantities — negative bags of cement, negative litres of paint — as ordinary 200 responses | 12310 |
| R2-281 | the concrete calculator's wastage input changes the displayed dry volume but has no effect on the materials to order | 12344 |
| R2-284 | a party-to-party cash transfer can be made from a party to itself, creating two payment records out of nothing | 12527 |
| R2-285 | an approval rule can be created that can never match and that requires zero approvals | 12549 |
| R2-289 | the BI analytics feed omits `expense` and `equipment` bills, and disagrees with the Budget module on the same project | 12691 |
| R2-291 | the delete-logs router is mounted at the API root, so every mistyped or unknown path returns a 500 instead of a 404 | 12811 |
| R2-292 | any role's permissions can be set to `{"all": true}` or `{}` through the API, and both grant more than the UI can express | 12867 |
| R2-294 | `/admin/migrations/backfill-rbac` is declared twice, so requests run one implementation while the API documentation describes the other | 12969 |
| R2-296 | a work-order amendment is stored, accepts invented fields, names whoever the caller says — and changes nothing | 13102 |
| R2-297 | an inventory item's unit can be changed without converting the quantity, silently rescaling the stock by whatever the conversion factor is | 13145 |
| R2-299 | rate limiting does not enforce its policy — 20 requests against a "5 per hour" limit on the public, unauthenticated endpoint were accepted 13 times | 13242 |
| R2-301 | the deletion audit trail never records who performed the deletion | 13400 |
| R2-305 | "material wastage" is computed as stock not yet consumed, ignores every wastage record, and clamps to zero — reporting 0% wastage on a project that co | 13573 |
| R2-306 | the two analytics endpoints disagree about the same project's spend, because one filters `invoice_type` and the other does not | 13606 |
| R2-311 | HIGH (upgraded from R2-295/R2-299): the service runs on at least three instances, so the in-memory rate limiter is structurally incapable of enforcing | 14081 |
| R2-314 | party identity in the ledger is a display-name string, so unnamed counterparties merge into four fallback buckets and same-named parties merge into on | 14579 |
| R2-316 | `payment_type: "transfer"` is accepted by the API and no consumer handles it — five surfaces, five different wrong answers | 14645 |
| R2-317 | Bank Statement buckets on a free-text account name, and drops every payment that has none | 14673 |
| R2-318 | GSTR-2 Purchase counts the bill and the payment that settles it, so the purchase return is overstated by every settled expense | 14704 |
| R2-320 | Project-wise Payment Summary mixes money-in and money-out in the same row — "Amount Paid" counts only receipts | 14765 |
| R2-323 | Material Stock Movement keys its running balance on the material name alone — merging projects and units — while blanking the UOM column that would sh | 14840 |
| R2-324 | the swallow is not sixteen builders, it is all twenty-four — the outer handler catches whatever the inner ones miss | 14875 |
| R2-325 | the Attendance & Salary report counts only exact-match `"Present"`, so every off-site punch is reported as an absence — and disagrees with the payroll | 14907 |
| R2-328 | the Finance tab scopes bills and payments by project membership, so every company-level record is invisible — and the cash balance in the same payload | 15113 |
| R2-329 | the analytics "material wastage" figure is ordered-minus-used across every material and every unit, so normal unconsumed stock is reported as waste | 15229 |
| R2-330 | recording material wastage changes nothing — no stock is decremented, no transaction is written, and no surface anywhere reads the record | 15266 |
| R2-332 | subcontractor attendance de-duplicates on an unvalidated free-text role, so `"Mason"` and `"mason"` book the same crew twice on the same day | 15329 |
| R2-333 | the muster roll — a statutory register — has no de-duplication at all, and no surface in the product can print it | 15364 |
| R2-334 | five tables carry a free-text `cost_code`, a `library_cost_codes` master table exists, and not one of them references it | 15424 |
| R2-335 | two unreconciled budget systems, and nothing sums actuals by cost code | 15460 |
| R2-338 | the vendor-performance aggregator has no callers, so the scorecard is permanently empty — and the schema cannot measure on-time delivery even if it we | 15669 |
| R2-340 | `Task.progress` is the only field the product actually maintains, and no progress consumer reads it | 15830 |
| R2-343 | the Finance tab labels every transaction "Approved" regardless of its actual approval flag, and nothing in the product gates on that flag anyway | 16005 |
| R2-345 | a payment with no project settles bills across every project the party has, and is then invisible on the screen that would show it | 16125 |
| R2-346 | settlement ignores approval entirely — unapproved bills are marked Paid by the engine | 16161 |
| R2-349 | the three-way match reconciles against an invoice amount the caller types, not against the invoice | 16310 |
| R2-350 | the one hard gate in the billing module is bypassed by the sibling endpoint that creates the record it checks | 16338 |
| R2-354 | the pro-rata ratio is uncapped and its divisor is caller-supplied, so a normal month pays 115% | 16516 |
| R2-357 | plant cost is billed at 24 hours a day of wall-clock time, and the real usage figure sits unread in the same module | 16652 |
| R2-359 | the CRM has three company-scoped lookup tables for source, category and status, six endpoints to maintain them, and writes all three fields as free te | 16756 |
| R2-360 | a won quotation cannot become an invoice — there is no conversion path, and no column that could record one | 16805 |
| R2-363 | inspection responses are never checked against the inspection's own checklist, so any checklist item in the database can be answered on any inspection | 16970 |
| R2-364 | a material test logged without acceptance bounds is counted as a failure in the client report's quality pass rate | 17002 |
| R2-366 | `file_url` is an unvalidated free string, so a revision can point anywhere, at nothing, or at the previous revision's file | 17132 |
| R2-368 | the Zoho Books push stores nothing about what it pushed, so re-pushing a bill duplicates it — and that is what three of the live Sentry issues are | 17220 |
| R2-369 | the Tally export does not mark what it exported — a second export re-sends every voucher, and the flag depends on the user calling a separate endpoint | 17270 |
| R2-372 | an approved indent never constrains the PO raised from it, and is never marked consumed — so one approval can be ordered any number of times | 17397 |
| R2-375 | a tower's "committed" figure is a copy of its budget, so the budget-versus-committed comparison is arithmetically incapable of showing anything | 17543 |
| R2-377 | retention is deducted from every subcontractor bill and never recorded as a liability, with no release path and no outstanding balance anywhere | 17640 |
| R2-381 | the back-dating window is enforced on three writes and on no money entry at all | 17832 |
| R2-382 | the edit window has a single call site, so every record except a task can be edited into a closed period | 17866 |
| R2-383 | recurring to-dos never recur — `repeat_type` is stored and echoed, and no scheduler exists in the codebase | 17913 |
| R2-384 | five kinds of assignment exist and nothing is ever sent to the person assigned | 17950 |
| R2-386 | no document number in the product has a database uniqueness constraint, and the application checks that stand in for them are check-then-insert races  | 18068 |
| R2-387 | there is no way to correct a stock quantity in the product — the only route is to fabricate a consumption event | 18282 |
| R2-390 | a role change commits and then returns 500, so a privilege change succeeds while telling the caller it failed | 18719 |
| R2-391 | per-item inspection results cannot be read back through any endpoint, so the contradiction R2-362 creates is invisible | 18859 |
| R2-393 | the Lead Status Funnel is computed in the browser against a hardcoded status vocabulary that nothing keeps in sync with the company's own lead statuse | 19461 |
| R2-394 | the Cost Code Expense Analysis calls an endpoint that does not exist, and renders "no expenses recorded" instead of an error | 19509 |
| R2-395 | "Export as Excel" writes a CSV and names it `.xlsx` | 19597 |
| R2-397 | "Export as PDF" is a print popup, and the HTML/PDF exports interpolate cell values unescaped | 19653 |
| R2-400 | the invoice PDF prints `Party: N/A` whenever the counterparty is not a registered platform user — which is the normal case for a vendor | 19780 |
| R2-401 | invoices print `(No line items)` because line items live in a nullable JSON blob the create path does not populate | 19815 |
| R2-403 | the company's GSTIN, legal name and address are stored and printed on no document | 19905 |
| R2-404 | uploaded Logo, Signature, Stamp and Watermark are stored and used by nothing | 19932 |
| R2-405 | the Team screen renders the 500 from R2-389 as "No team members found" | 19998 |
| R2-408 | the DPR export identifies its author as a raw UUID, or as free text, depending on the row | 20115 |
| R2-409 | the payslip export carries no pay period, no employee code and no statutory identifiers, so it cannot be filed or reconciled | 20131 |
| R2-412 | rupees are labelled `SAR` and an Indian GSTIN is presented as a Saudi VAT registration number | 20303 |
| R2-413 | the invoice line is fabricated — one line of `Item` at 10.00 against a 100,000 total | 20329 |
| R2-415 | the BOCW cess return is typed by hand — nothing derives it, nothing validates it, and it is disconnected from the labour records in the same module | 20535 |
| R2-417 | `GET /finance/ledger` returns 500, and to the browser it is indistinguishable from being offline | 20688 |
| R2-419 | the same page names a party in one tab and calls it "Unknown Party" in the other | 20884 |
| R2-421 | a project whose status is `Planning` is counted in none of the dashboard's four status tiles | 20967 |
| R2-422 | the "Tally Agent: Connected" badge is a hardcoded string with a green dot, and no agent is registered | 20993 |
| R2-424 | two report screens filter by a hardcoded list of projects that do not exist, so their filters can never match the company's data | 21077 |
| R2-425 | the HR "Live Geofence Map" is a static drawing with invented workers and a hardcoded site name | 21108 |
| R2-427 | Equipment and BOQ silently replace the company's data with invented records when a request fails | 21214 |
| R2-429 | the payroll roster lists the same employee twice, and the screen's own default filter hides most of the workforce it pays | 21329 |
| R2-433 | the vendor column on every purchase order reads the literal string "Vendor" | 21613 |
| R2-438 | invalid contact data renders as valid contact data, decorated by the UI | 21904 |
| R2-440 | the two subcontractors — including the ₹5,90,000 counterparty — have no party ID at all | 21996 |
| R2-441 | every project reports 0% progress on the list screen, including one with recorded execution | 22088 |
| R2-442 | a stored `javascript:` URL is still live in production and now renders on a screen with a Delete action but no way to see or clear the URL | 22154 |
| R2-445 | "SITE STAFF PRESENT: 1 — Clocked via geofence" contradicts the Attendance screen's "0 Present · 1 Absent" for the same day | 22276 |
| R2-449 | a BOQ line item can only be created by uploading an Excel file, and once created it can never be edited or deleted through the product | 22833 |
| R2-450 | the importer silently discards rows and reports only the rows it kept, so a partial import is indistinguishable from a complete one | 22871 |
| R2-451 | an item's amount is `qty × (rate + supply_rate + installation_rate)`, so a sheet carrying both a composite rate and its split double-counts the whole  | 22899 |
| R2-453 | every user-fixable import error is returned as a 500 with a raw library message, because the handler's outer `except Exception` also swallows its own  | 22944 |
| R2-454 | every document-download control in the console is a plain link carrying no Authorization header, and every one of those endpoints requires one — so th | 22978 |
| R2-457 | the project Planning tab navigates to `/c/undefined/…`, and three company-scoped requests fail with `undefined` as the id | 23048 |
| R2-463 | the same 21 stubs discard the project id, so a project's Finance, Billing, DPR or Safety tab shows company-wide data with no indication the scope chan | 23348 |
| R2-465 | a failed revision publish is caught, logged, and then rendered as a successful revision anyway | 23416 |
| R2-466 | `file_url` is an unvalidated arbitrary URL and the viewer loads it as `<img src>`, so opening a drawing makes every viewer's browser call an attacker- | 23437 |
| R2-471 | the group list is not membership-filtered, so the sidebar advertises conversations that every route behind it refuses | 23671 |
| R2-475 | a project with no site coordinates passes every geofence check, and the log prints `0m (Inside)` for a distance that was never measured | 23841 |
| R2-478 | six company settings are stored, exposed on the API and rendered as controls, and read by nothing | 24006 |
| R2-479 | Multi Level Approval ships a complete rule editor for fifteen document categories, and no flow consults the rules | 24035 |
| R2-480 | internal engineering notes are shipped as customer-facing Settings copy — three more instances after R2-406's fix — and one of them is factually wrong | 24052 |
| R2-483 | the brick calculator's default state pairs modular bricks with a wall-thickness list calibrated to traditional bricks, and the mortar it reports is 2. | 24208 |
| R2-484 | the stirrup cutting length adds 14d while the screen's own note describes a method that yields 6d–8d | 24254 |
| R2-485 | the House Cost estimator silently adds a 120-foot compound wall and a 10% contingency the user never entered, and its Currency Mode selector changes n | 24287 |
| R2-488 | the Material screen adds bags, tonnes and cft together and prints the sum as a headline stock figure | 24517 |
| R2-491 | the server returns the literal name `"Unknown"` for any team row without a linked user, so the ₹1,11,100 subcontractor bill is booked against a party  | 24676 |
| R2-494 | the subcontractor work-order register renders `0%` progress and `₹0.00` billed as hardcoded literals, on a work order with ₹1,11,100 already billed ag | 24772 |
| R2-498 | `MATERIAL WASTAGE 0%` is printed directly above `Ordered 300 · Consumed 20515`, because the wastage quantity is clamped at zero | 24992 |
| R2-499 | the subcontractor scorecard names its subcontractor `Team 331b67d5` | 25018 |
| R2-502 | the Production screen clamps "Output progress" at 120%, so a batch that produced twice its planned output displays 120% | 25119 |
| R2-506 | the LTIF panel tells the user the rate is calculated on a 50,000-manhour basis; the code uses 10,000, or attendance hours | 25316 |
| R2-507 | the BOCW register and the muster roll are standalone hand-typed tables, disconnected from the attendance, payroll and bill data the product already ho | 25354 |
| R2-510 | row-level security is enabled on 139 tables and every policy is unconditional, so the database enforces no tenant isolation at all | 25505 |
| R2-513 | the Face Recognition audit trail's only data source fails, and the screen reports "No face recognition logs found" | 25769 |
| R2-516 | a queued punch does not record which worker it belongs to, so no correct sync could be written against the current data structure | 26195 |
| R2-517 | the signed download URL is built without `/storage/v1`, so every file download redirects to a Supabase 404 | 26217 |
| R2-519 | the product ships two calculator engines that disagree, and on the defect filed as R2-482 the **server is right and the screen is wrong** | 26418 |
| R2-520 | the server calculator accepts a wastage percentage, prints it into `dry_volume`, and then derives every material quantity from the volume *without* it | 26464 |
| R2-525 | the penalty estimate is computed from a wage figure the caller supplies, so it returns whatever the caller asks for | 26694 |
| R2-526 | any draft return can be marked "filed" with any acknowledgment number, by any name the caller types | 26724 |
| R2-527 | `employee_id` is optional on a leave request, and when it is omitted the same leave is counted against every employee sharing that name — while the em | 26813 |
| R2-528 | leave status is an unvalidated string, and any casing other than exactly `"Approved"` removes the leave from every balance while the record still read | 26861 |
| R2-530 | a PPE compliance audit accepts negative worker counts, because the only validation compares the two numbers to each other | 26956 |
| R2-531 | equipment availability is driven by a maintenance record's *status* and ignores its *date* — booking a December service takes the machine off the road | 26989 |
| R2-534 | the importer resolves the paying party by name against the **global** users table, so the wrong user can win and a legitimate company member can be le | 27209 |
| R2-536 | no deletion anywhere in the product records who performed it — `log_deletion` accepts a `deleted_by` argument and all 30 call sites omit it | 27350 |
| R2-539 | the approver of a three-way match is a query parameter that defaults to nothing, and a rejection records no actor and no time at all | 27497 |
| R2-542 | `POST /tally/mark-synced` permanently removes vouchers from the export queue, with no permission check and no way to undo, and `/tally/pending` silent | 27796 |
| R2-545 | a captured lead is readable by nothing — no API route, no screen — so if the notification email fails the lead is silently unreachable, which is the e | 28210 |
| R2-546 | the company settings write accepts out-of-range decimal places and unknown enum values, and they persist into the formatter and document generator the | 28243 |
| R2-550 | a party can transfer money to itself, and the product records it as a successful transfer | 28510 |
| R2-551 | a concrete cube test accepts an inverted acceptance range, which makes the pass predicate unsatisfiable — every test on that material fails regardless | 28614 |
| R2-552 | a project accepts a negative contract value, an end date seven years before its start date, and a negative geofence radius that silently marks every p | 28661 |
| R2-554 | the company GSTIN has no format validation, so an invalid tax identity is accepted and printed on every document that carries it | 28790 |
| R2-556 | a reference to a row that does not exist is never checked by the application — it reaches the database and returns a 500 | 28885 |
| R2-559 | the entire schema carries 13 unique constraints, and not one of them is on a document number | 29118 |
| R2-560 | the two party reports return `rows: []` behind a bare `except Exception: return []`, on a company with six parties and ₹2.71 lakh of bills against the | 29155 |
| R2-561 | a timesheet entry carries three independent representations of the same time and the server cross-validates none of them; `duration` is taken from the | 29446 |
| R2-562 | `end_time` before `start_time` is accepted and stored as a negative duration, which the console prints as "-8 Hr 0 Min" | 29482 |
| R2-564 | when the timesheet header fails, the console silently discards the hours the user typed and shows neither an error nor a success | 29517 |
| R2-570 | fuel logs accept a backwards odometer, a date 73 years in the future, and fuel for a machine that was never deployed to the project being charged | 29839 |
| R2-580 | project `status` is a free-text string — any value is accepted and stored | 30244 |
| R2-582 | attempting to deactivate a project party silently **activates** it — every unrecognised status is coerced to `Active` | 30288 |
| R2-583 | setting an opening balance on a party already linked to the project is silently discarded and reported as success | 30320 |
| R2-589 | a lab test with no acceptance limits is displayed with a **fabricated** "0–100" range and simultaneously marked FAIL — the row contradicts itself | 30544 |
| R2-590 | **91 of 189 write controls (48%) fail silently** — `if (res.ok)` with no `else` and no error surfacing anywhere in the handler | 30611 |
| R2-593 | a face-recognition punch never becomes an attendance record — `AttendanceLog` is constructed at exactly one site, and it is not the face endpoint | 31102 |
| R2-594 | the same PO/GRN pair can hold unlimited three-way match records with contradictory verdicts, and a bill links to whichever one was approved | 31194 |
| R2-595 | every payment exported to Tally posts to a single hardcoded cash ledger, because the bank-mapping table has no writer and the payment's own bank accou | 31298 |
| R2-597 | the subcontractor scorecard reports a perfect 100% on every metric for a contractor with no activity, and "Billing Accuracy %" is a hardcoded constant | 31481 |
| R2-598 | an RFQ can never be sent, closed or awarded — quotes are collected and there is no mechanism by which they can affect a purchase order | 31550 |
| R2-601 | the steel calculator prices every takeoff at a hardcoded ₹62/kg the user cannot see or change, and the concrete calculator silently omits aggregate co | 32163 |

### MEDIUM (164)

| # | Finding | Register line |
|---|---|---|
| R2-003 | Delete Logs entity filter: 2 options can never match, 21 logged types unlisted | 434 |
| R2-004 | Concrete calculator silently inflates quantities by 5% (undisclosed wastage) | 458 |
| R2-010 | Console calculators never call the backend; the math is duplicated | 522 |
| R2-012 | "Payment Method" radio group is dead (selection silently discarded) | 636 |
| R2-015 | Dashboard "+" quick-add creates no task and inflates the pending counter | 760 |
| R2-016 | Task progress saves without checking the response, then shows it as saved | 784 |
| R2-020 | DPR measurement book is pre-filled with fabricated quantities | 937 |
| R2-022 | Company-wide Finance data only loads if a project happens to be active | 1049 |
| R2-026 | "TO DO (PENDING)" on the home dashboard is a hardcoded `3` | 1216 |
| R2-029 | Zoho vendor duplicate (3062) remediation re-runs the query that already failed | 1356 |
| R2-030 | BOQ line items can ONLY be created by Excel import; no manual entry exists | 1417 |
| R2-031 | Task status never derives from progress, and can't be changed from the Gantt | 835 |
| R2-037 | "Material Wastage" reports 100% for material that simply hasn't been issued yet | 1636 |
| R2-040 | "Export as Excel" writes a CSV file with a `.xlsx` extension | 1711 |
| R2-044 | `billing.py` gates use bare `"sale"` where a bucket is meant (ZATCA + 3-way match) | 1919 |
| R2-045 | BI export silently omits "Other Expense" and "Equipment Expense" bills | 1957 |
| R2-048 | 14 modules are reachable only via links buried in Help article prose | 2248 |
| R2-053 | Payment request `details` is required by the API but supplied from "Ship To" | 2426 |
| R2-054 | `request_no` is generated by counting rows, so numbers repeat after a deletion | 2440 |
| R2-056 | the correct helper throws, but callers have no catch, so failures are silent | 2522 |
| R2-061 | Equipment page renders an invented fleet whenever a fetch fails | 2655 |
| R2-062 | Company dashboard invents an employee and two materials when the company has none | 2676 |
| R2-063 | Quality module writes a hardcoded remark and mislabels unresolved checklists | 2697 |
| R2-066 | BI export understates project cost: `expense` and `equipment` bills omitted | 2832 |
| R2-071 | Work-order terms are captured as raw `innerHTML` from a contentEditable div | 3037 |
| R2-072 | 20 buttons have no click handler, including KYC upload and "Copy Key" | 3058 |
| R2-077 | CSV export headers are hand-maintained, drift from the data, and some are OCR transcription notes | 3317 |
| R2-078 | The notification bell is local-only and has no backend | 3358 |
| R2-082 | Analytics KPIs render nonsense on real data | 3541 |
| R2-084 | Dashboard project-status counters read 0 while a project exists | 3603 |
| R2-088 | App startup mounts a `static` directory that is not in the repository | 3719 |
| R2-089 | Project status counts: the backend silently reports Planning and Cancelled projects as "Ongoing" | 3743 |
| R2-094 | "Log Usage" is a dead button, and its label is broken | 3885 |
| R2-097 | The Party ledger's default filter hides 5 of 6 parties | 3965 |
| R2-098 | Party custom IDs duplicate and skip (`PID-2` twice, `PID-3` missing, one blank) | 3978 |
| R2-100 | "Company Balance ₹0" is displayed directly above "In: ₹90,000" | 4040 |
| R2-101 | Unbilled-materials count differs three ways across two screens | 4063 |
| R2-102 | Every company's Tally vouchers default to an unexplained `ONS-` prefix | 4097 |
| R2-103 | Auto-generated payment reference numbers collide, and a collision is a hard 400 | 4113 |
| R2-107 | Attendance and HR pages open on hardcoded dates in the past | 4243 |
| R2-108 | Duplicate employees are offered as separate selectable people | 4263 |
| R2-114 | GSTIN has no validation of any kind | 4448 |
| R2-115 | A GET endpoint writes to the database | 4469 |
| R2-117 | Internal build-plan and implementation notes are rendered as user-facing copy | 4561 |
| R2-118 | Two Holiday Calendars exist and disagree | 4586 |
| R2-119 | Multi Level Approval offers approver chains for documents whose approval cannot be delegated | 4606 |
| R2-121 | The Subcon tab shows a definitive "you have none" empty state while it is still loading | 4659 |
| R2-122 | BOQ confirms R2-030 live: a document exists but can hold no line items | 4688 |
| R2-124 | Modules render a bare header with no content and no empty state | 4810 |
| R2-125 | Quotations carry CGST/SGST columns with no IGST, repeating the D4 defect in CRM | 4836 |
| R2-129 | Statutory due dates are a month early, and the TDS date arithmetic is wrong | 4982 |
| R2-130 | The late-filing penalty is an invented formula applied to the wrong base | 5013 |
| R2-134 | Matching tolerance is zero, so any rounding difference reads as a mismatch | 5195 |
| R2-135 | The Depreciation module collects every input needed to compute depreciation, then makes the user do the arithmetic | 5230 |
| R2-136 | 16 discriminator fields have no validation at all, and five document their allowed values only in a comment | 5450 |
| R2-144 | voice notes and media attachments exist in the model, the schema and the read path, and cannot be produced by any UI control | 5781 |
| R2-145 | adding someone to a chat group requires typing their raw UUID | 5793 |
| R2-146 | the company-level Chat route is a project chat that silently shows nothing when no project is active | 5802 |
| R2-147 | the message poll refetches the whole thread every 4 seconds and the group list never refreshes | 5814 |
| R2-150 | `created_by` on a to-do is whatever the client says, and this client says nothing | 5887 |
| R2-154 | committed cost counts every purchase order and work order regardless of state, and the variance display has no "budget not set" case | 5982 |
| R2-159 | `field_type` and `entity_type` are unconstrained strings on both create paths | 6116 |
| R2-162 | the House Cost currency selector is dead, and Riyadh is priced in US dollars | 6177 |
| R2-164 | Paint applies three undisclosed allowances and hardcodes opening sizes (extends R2-004) | 6211 |
| R2-174 | every party on the Transaction ledger reads as the logged-in user's login name, and the server is the one saying it | 6578 |
| R2-176 | any file type is accepted, and the `download=1` flag is silently ignored for stored files | 6628 |
| R2-183 | company onboarding accepts any string as a GSTIN, and asks for the city twice | 6909 |
| R2-190 | Zoho's raw response body is echoed to the API caller inside error details | 7056 |
| R2-191 | `company_team` has no uniqueness on `(company_id, user_id)`, so a user can hold duplicate memberships of the same company with different roles | 7074 |
| R2-193 | every BI feed request performs a database write | 7138 |
| R2-200 | the service worker caches every same-origin GET forever under a hardcoded cache name, and its offline fallback is the login page | 7643 |
| R2-206 | `wastage_type` accepts any string, and `reported_by` is free text with no link to a person | 7916 |
| R2-207 | a production recipe's `wastage_pct` is collected, stored, displayed — and never applied to anything | 7959 |
| R2-208 | LOW/MEDIUM: a toolbox talk accepts a negative attendee count | 8042 |
| R2-213 | PPE compliance shows **0% with a red indicator** for a project that has never recorded a check | 8792 |
| R2-217 | resolving a drawing markup pin is local-only | 8879 |
| R2-218 | the RA Bill list does not refresh after a successful submit | 8915 |
| R2-225 | silent early-return guards are systemic across the forms | 9247 |
| R2-227 | the Pin control cannot work — the list endpoint the page reads does not return `is_pinned` | 9294 |
| R2-247 | quality inspections and NCRs are attributed to whichever member the caller names | 10501 |
| R2-251 | minutes of meeting record whatever author the caller names, as free text | 10680 |
| R2-255 | a schedule task accepts a negative duration and ends before it starts | 10972 |
| R2-256 | a fatality was closed 40 seconds after it was logged, with no investigation and no record of who closed it | 10992 |
| R2-261 | a project can have any number of Daily Progress Reports for the same day | 11260 |
| R2-268 | the DPR export identifies the author by raw UUID | 11672 |
| R2-269 | the payslip export contains no employee identifier, so employees with the same name produce indistinguishable rows | 11688 |
| R2-273 | CRM leads accept a phone number that is not a phone number and an email that is not an email | 11908 |
| R2-277 | a drawing pin placed outside the numeric column's range crashes with an unhandled 500, and the pin's `created_by` is a third instance of the untyped-i | 12095 |
| R2-278 | a to-do accepts a `javascript:` URL, another member as its author, and a due date six years in the past | 12127 |
| R2-282 | the steel calculator accepts two competing parameter sets and silently uses the legacy one; house-cost quotes ₹0 for a building with zero floors | 12380 |
| R2-286 | a generated report advertises a PDF URL that 404s, and its author can approve it | 12577 |
| R2-287 | a party's opening balance is accepted and never applied | 12601 |
| R2-290 | a branch accepts an invalid GSTIN, and a salary template's components can total 250% of salary | 12754 |
| R2-293 | Tally ledger mappings accept transaction and voucher types that do not exist | 12906 |
| R2-295 | the login rate limit is real but its enforcement is inconsistent, because the limiter keeps its counters in process memory | 13015 |
| R2-298 | quotes can be submitted against an RFQ that is still a draft and expired six years ago, and the "comparison" endpoint performs no comparison | 13171 |
| R2-302 | a project location accepts impossible coordinates | 13433 |
| R2-309 | the Sentry board carries fixed issues as unresolved, which is why it gets ignored | 13860 |
| R2-319 | both GST returns file every invoice as intra-state, splitting tax 50/50 CGST/SGST with IGST permanently zero | 14735 |
| R2-321 | Item-wise Sales reads CRM quotation lines, ignores the project filter, and can never populate an invoice number or amount | 14796 |
| R2-322 | every Party Ledger row attributes itself to the counterparty as its creator | 14818 |
| R2-331 | the wastage status endpoint takes an arbitrary string as a query parameter, and `wastage_type` is unconstrained | 15298 |
| R2-336 | a single material issue can silently reclassify a material for the whole project, retroactively | 15494 |
| R2-341 | `PurchaseOrder.status` is maintained correctly by the server and read by nothing | 15862 |
| R2-347 | all 30 `log_deletion` call sites swallow their own failure, so the delete register can silently miss a deletion it was built to record | 16181 |
| R2-351 | goods receipts enter the stock ledger with no unit and no category | 16372 |
| R2-355 | `payroll_month` passes its regex and then crashes the request | 16554 |
| R2-358 | a zero hourly rate silently removes a machine from all costing, and `Equipment.code` is unique across every company in the database | 16692 |
| R2-361 | `quotations` is a second, orphaned quotation table created on every boot | 16838 |
| R2-367 | an approved revision cannot be returned to pending, and `approved_by` is still whatever the caller sends | 17155 |
| R2-370 | `Bill.status != "Cancelled"` guards the Tally export against a state the product cannot reach | 17310 |
| R2-373 | indent approval has no state guard and records no approver | 17427 |
| R2-376 | the tower loops re-run identical project-wide queries per tower, and the no-tower fallback hardcodes `variance = 0.0` | 17582 |
| R2-378 | a dedicated `transaction_retentions` table exists, is created on every deploy, and has zero code references | 17687 |
| R2-379 | `Advance Recovery` is an accepted deduction type with no advance record to recover against | 17719 |
| R2-385 | two to-do systems, two completion vocabularies | 17982 |
| R2-388 | existence is checked before permission, so an unauthorised user can enumerate which record ids exist | 18410 |
| R2-398 | exported columns come from the UI's column list, and dates export as raw ISO strings | 19693 |
| R2-402 | the PO PDF prints `Status: received` while showing only the ordered quantity, so the over-receipt of R2-348 is invisible on the document | 19842 |
| R2-406 | an internal build-plan note is displayed to customers in the production console | 20015 |
| R2-411 | the export re-issues `ACTION="Create"` for every ledger on every run, and carries no invoice reference | 20236 |
| R2-414 | the quality pass rate prints `0%` when no tests exist, asserting failure where there is no data | 20452 |
| R2-420 | balances are shown negative *and* labelled `TO PAY`, and project ids are printed as truncated UUIDs | 20904 |
| R2-428 | the payments CSV template ships sample rows that name fictitious parties and a project that does not exist | 21248 |
| R2-436 | MOM records are created with an empty `created_by` | 21818 |
| R2-443 | an item 6½ years overdue is displayed identically to a current one, and `repeat_type: "daily"` has produced nothing | 22174 |
| R2-446 | the MOM register's status filter cannot select the status its own records carry | 22381 |
| R2-452 | imported quantities are silently rounded, to whole numbers for `Nos`, bags and bricks | 22922 |
| R2-460 | schedule dates render in US month-first order in a rupee/IST product, so 1 July displays as `7/1/2026` | 23222 |
| R2-461 | `end_date = start_date + duration_days` makes every task span one day too many | 23235 |
| R2-467 | the drawing opens on the superseded revision, the current revision is one whose approval status is `rejected`, and the "Active:" label renders empty | 23492 |
| R2-472 | message attachments are a free-text "Image URL" field, comma-split into `<img>` tags — the same unvalidated-URL surface as R2-466 | 23687 |
| R2-481 | the Holiday Calendar and Weekly Off configuration feed nothing — payroll divides by a client-supplied `days_in_month` that defaults to 26 | 24087 |
| R2-486 | the Paint calculator's quality dropdown advertises a coverage it does not use, and its Interior/Exterior selector is never read | 24335 |
| R2-489 | the Quality register's "Inspected By" filter offers the placeholder dash as a selectable inspector | 24549 |
| R2-492 | `/projects/{project_id}/members` ignores the project and returns the whole company | 24715 |
| R2-493 | a ZATCA (Saudi e-invoicing) action is offered on every sale invoice of an Indian GST company that has ZATCA switched off | 24733 |
| R2-495 | the project Equipment screen lists the whole company's fleet | 24823 |
| R2-496 | the 3-Way Matching screen formats rupees with Western thousands grouping, alone in the console | 24845 |
| R2-500 | the page header is the internal build-phase label `PHASE 14` | 25049 |
| R2-501 | this screen writes rupees as `Rs`, a third currency convention in one console | 25066 |
| R2-504 | a schedule stores `useful_life_years`, `salvage_value` and `depreciation_pct` as independent inputs, and the live record is internally contradictory | 25218 |
| R2-505 | `PHASE 16` — a second internal build-phase header, confirming R2-500 is a pattern not an oversight | 25247 |
| R2-508 | the safety module is built on US OSHA conventions in an Indian construction product — second wrong-jurisdiction standard after ZATCA | 25401 |
| R2-512 | `POST /admin/migrations/backfill-rbac` is defined twice, so the second implementation is permanently unreachable | 25675 |
| R2-514 | the Help Centre tells customers that multi-level approval "is being rolled out category by category", under a banner promising every step reflects a r | 25811 |
| R2-518 | when geolocation is unavailable the punch is stamped with hardcoded Bangalore coordinates and an invented site name, and still marked verified | 26259 |
| R2-521 | the two engines use different steel unit-weight constants | 26489 |
| R2-529 | an approved timesheet records no approver, and any company member can submit someone else's timesheet | 26891 |
| R2-532 | the safety writers declare `project_id` and datetimes as `str` and parse them with raw constructors, so malformed input becomes an unhandled exception | 27040 |
| R2-535 | the dedicated duplicate-PO check is case-sensitive and untrimmed, so the product's only guard against a repeated PO number is defeated by a capital le | 27246 |
| R2-537 | the audit-log write is wrapped in `except Exception: pass` at the call site **and** swallows internally, so a deletion whose logging fails proceeds un | 27395 |
| R2-548 | the same gap runs through the settings schemas — five of them carry unbounded numerics or free-string enums | 28378 |
| R2-553 | the face-recognition punch accepts an unbounded confidence score and unbounded coordinates | 28703 |
| R2-555 | an oversized string is a 500, not a validation error — the database column is the only length check in the product | 28826 |
| R2-558 | 18 foreign keys carry no `ondelete` rule, so deleting their parent fails with a 500 rather than a message | 29043 |
| R2-563 | an entry's `entry_date` is not constrained to its own timesheet's week | 29500 |
| R2-566 | `POST /planning/tasks` silently discards the client's `status` | 29657 |
| R2-572 | a purchase order with no line items is accepted, creating a ₹0 order | 29934 |
| R2-573 | a GRN can be dated 73 years in the future | 29948 |
| R2-578 | MEDIUM (latent): `send_message` stamps the real sender only conditionally — the client-supplied `user_id` survives when the sender has no `company_tea | 30164 |
| R2-592 | nine display fields substitute invented values for missing data, including the geofence radius on two screens | 30680 |
| R2-596 | MEDIUM (latent): the timesheet submit/approve handler treats a network failure as success | 31372 |
| R2-600 | the Project Hub's summary card ignores the active filter and displays a project the filter has just excluded, contradicting the table beside it | 31802 |

### LOW (15)

| # | Finding | Register line |
|---|---|---|
| R2-001 | "Material (Pending)" dashboard card is not clickable (dead card) | 400 |
| R2-002 | Console emoji purge incomplete: 4 emoji remain across 2 files | 415 |
| R2-005 | Plaster calculator shows brick reference notes, no plaster guidance | 2027 |
| R2-018 | Dead date filter on the DPR report (hardcoded stale date, never read) | 893 |
| R2-023 | Internal build labels ("Phase 14" / "Phase 16") rendered in the console UI | 1080 |
| R2-038 | Currency rendered as "Rs" on Analytics, "₹" everywhere else | 1662 |
| R2-057 | Gantt predecessor failures are all reported as "Link loop detected" | 2536 |
| R2-064 | BOQ import claims it is "using demo data" when it loads none | 2731 |
| R2-065 | Dead duplicate payroll calculator in the HR page | 2748 |
| R2-070 | Indent photo preview is local-only and never persisted | 3024 |
| R2-079 | Missing `company_id` silently produces links to a non-existent "demo-construction" company | 3374 |
| R2-085 | Internal build-phase labels are rendered as user-facing headings | 3625 |
| R2-095 | Two procurement tabs render a bare header with no empty state | 3896 |
| R2-104 | "Last marked synced: Not yet" contradicts the sync history directly below it | 4133 |
| R2-120 | The Integrations settings page exposes only Google Sheets, and its instructions point somewhere that does not exist | 4627 |

