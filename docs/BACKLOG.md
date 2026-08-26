# Backlog

Feature requests confirmed by founder decisions D-008 and D-010. Not defects. No due dates. The defect register count reflects known defects only.

| ID | Priority | Source finding | Description | Decision | Notes |
|---|---|---|---|---|---|
| R2-335 | HIGH | finance.py / models.py, reports.py (reg L15460) | Two unreconciled budget systems (ProjectBudget four fixed heads vs LibraryCostCode per cost code with parent_id hierarchy) and no GROUP BY cost_code anywhere. Three cost-code reports are unimplemented (budget-vs-actual-cost-code etc). Needs unified cost-code budgeting and actuals aggregation as a funded feature. | D-008 | Confirmed as feature request per D-008, moved off defect register. No due date. |
| R2-184 | HIGH | reports.py / supabase_storage.py, files.py (reg L6929) | Persistent object storage for generated client-report PDFs and uploads. Reports currently written to ephemeral container disk (static/reports) and lost on deploy or restart while DB retains pdf_url; uploads need Supabase Storage bucket with signed URLs. Defect half (false affordance, original CRITICAL) closed by ab9623e removing 5 upload controls. Remaining storage work is a funded feature. | D-010 | Defect half closed in ab9623e. Feature needs object storage. No due date. |

No due dates. Priorities reflect feature value, not defect severity. R2-184 de-escalated from CRITICAL (false affordance) to feature needing object storage.
