# Recon Extraction Master Index

Generated: 2026-07-06T17:22:00+05:30

## Summary

| Category | Count | Reports |
|---|---|---|
| Excel / CSV | 12 | `01-EXCEL-AND-CSV-REPORT.md` |
| HAR Files | 4 | `02-HAR-REPORT.md` |
| PDFs | 44 | `03-PDF-REPORT.md` |
| Images | 586 | `04-IMAGES-BATCH-001.md` through `04-IMAGES-BATCH-118.md` |

## Report Locations

All reports saved under:
```
onsiteteams-recon/recon-extraction-reports/
```

## Key Findings So Far

### Excel / CSV
- **Attendance Reports**: Company-level attendance exports with party names, dates, in/out times, locations, durations, photo/location verification flags.
- **Payment Reports**: Payment type (In/Out), party names, project names, amounts, modes, categories, payment request IDs.
- **Project Reports**: Ongoing and completed projects with codes, categories, addresses, values, dimensions, key personnel, status, progress %, planned/actual start/end.
- **GSTR Reports**: Tax/GST related data exports.
- **Sales Order Invoices**: Invoice-level data.
- **Payroll Upload Template**: Staff name, staff type, shift hours, day off, overtime rate, designation, cost code, salary basis/type, CTC, basic, allowances, deductions.
- **Payment Upload Template**: Payment date, type, party, project, amount, remark, mode, bank account, category, payment request ID.
- **Staff Punch Report**: S.NO., party name, designation, punch date, punch in/out times, locations, duration, photo verified, location verified flags.
- **Staff Muster Roll**: Monthly muster with party code, employee name, designation, phone, bank details, salary type, gross salary, work days, PL, WO, payable days, OT, earnings, deductions, net salary, CTC.
- **Company Expense Report**: S.NO., expense date, type, project, party, notes, cost code, status, total/net/paid/unpaid amount, due date, approval status.

### HAR Files
- 4 large HAR files (total ~299 MB) from:
  - `mainwebsiteonsiteteams.com.har`
  - `demoprojectwebsiteweb.onsiteteams.com.har`
  - `fromprojectinternalwebsiteweb.onsiteteams.com.har`
  - `tillreportinternalwebsiteweb.onsiteteams.com.har`
- All URLs point to `https://web.onsiteteams.com/` routes under `/c/{company_id}/...`.
- See `02-HAR-REPORT.md` for raw JSON previews.

### PDFs
- 44 product/solution PDFs covering every Onsite module.
- Extractable text and tables available in `03-PDF-REPORT.md`.
- Categories: Infrastructure, Project Management, CRM, Procurement, Finance, Labour, Equipment, Quality, Production, Material Management, Subcontractor Billing, Budgeting, Reporting, Help Center, Pricing, Terms/Privacy, Careers, Channel Partner, Customer Stories.

### Images
- 586 PNG screenshots totaling ~118 MB.
- Two source folders:
  - `Extra HAR + Image Recon/All Images Documented/` — 443 images
  - `Recon Pictures/` — 143 images
- All images are Screenshot (#) PNGs.
- Per-image metadata in `04-IMAGES-BATCH-###.md` (dimensions, format, average RGB, size, MD5).

## Next Steps

1. OCR the 586 screenshots with Tesseract for full text extraction.
2. Extract structured data from the 4 HAR files (API endpoints, request/response bodies).
3. Cross-reference extracted business logic against SiteFlow backend models and routers.
4. Identify missing features, UX patterns, and competitive gaps.
