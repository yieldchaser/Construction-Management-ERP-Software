# SiteFlow — Services + Help (last two tabs) + Delete Logs status

## Delete Logs — no action needed
Already fully built: `DeleteLog` model, `list`/`purge` endpoints, 219-line frontend page. Don't touch it.
One minor backlog item (not blocking, not this round): `log_deletion()` is only called from `library.py`, `planning.py`, `projects.py` — most other DELETE endpoints across the app (billing, budgeting, procurement, finance, hr, crm, files, todos, team_schedule, settings) don't log deletions. That's an audit-trail coverage gap, worth a dedicated future pass, not part of this round.

## Help — verify existing 234-line page, don't rebuild
`frontend/src/app/c/[company_id]/d/help/page.tsx` already exists. Recon showed: video-tutorial gallery, cards with thumbnail + play icon + title (RFQ Tutorial, Procurement - PO Management, Warehouse Management, Material Transfer, Material Return & Debit Note, Petty Cash Management to Supervisor, Company Dashboard, ToDo Management, BOQ/Budgeting and Invoicing, Payroll, Staff Payroll, Attendance & Salary Management). Static content, no backend. Quick check: does the existing page already match this card-grid pattern? If yes, just confirm in your report. If it's missing or very different, bring it up to this pattern — but this is static content, don't over-invest.

## Services — build fresh, doesn't exist yet, not even in sidebar nav
Static marketing/upsell page. Recon: header "Services" + back arrow, "Our services" title, grid of cards (icon + title + price/description + "Contact Us >" external link — these route to an external Zoho Forms URL like `zfrmz.in/...`, not an in-app checkout).

Cards observed (verbatim):
1. Customisation Request — wrench icon — "Use this form to request onsite customizations. Our team will review your needs and schedule the service accordingly."
2. Offline Support (3 days) — headset icon — "Rs 25000 + Travel + Accommodation + Taxes"
3. Tally Integration — doc icon — "Rs 20000 One Time + Taxes" / "Rs 5000 Annual Maintenance + Taxes"
4. Zoho Books Integration — book icon — "Rs 30000 One Time + Taxes" / "Rs 5000 Annual Maintenance + Taxes"
5. Zoho CRM Integration — people icon — "Rs 30000 One Time + Taxes" / "Rs 5000 Annual Maintenance + Taxes"
6. Facebook Lead Integration — Facebook icon — "Rs 20000 One Time + Taxes" / "Rs 5000 Annual Maintenance + Taxes"
7. User Add On — person+ icon — "As per subscription plan"
8. GPS Attendance Addon (50 users) — pin icon — "Rs 20000 Yearly + Taxes"
9. Website Development (15 pages) — monitor icon — "Rs 20000 + Taxes"
10. Social Media Package [15 post + 4 Reels] — Instagram icon — "Rs 10000 + Taxes"
11. Whatsapp Alerts (10000 msgs per year) — chat icon — "Rs 5000 + Taxes"

Bottom banner: "Onsite Referral Program" (or SiteFlow-branded equivalent) — "Refer and earn cashback with each successful referral" + "Refer Now" button.

Each "Contact Us" link — since SiteFlow doesn't have a real sales/support form yet, use a `mailto:` link or a simple placeholder route rather than fabricating a working external form integration. Flag this explicitly rather than pretending it connects anywhere real.

Add "Services" to the sidebar nav (it's currently missing entirely — `Sidebar.tsx` has no Services entry).

## Rules (unchanged, last time)
- No backend needed for Services — purely static content + sidebar nav entry.
- Verbatim card text/pricing from recon, no invented services.
- Full file-touch disclosure.
- This closes out the entire tab-by-tab build. Report back when done.
