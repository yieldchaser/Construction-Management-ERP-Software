# Phase 11 — Client Portal & PDF Progress Reports

## Goal
Enable site managers to automatically compile and generate progress reports for clients, summarizing project scope, task timelines, billing records, procurement activity, and quality indicators, and outputting them into a portable PDF format.

## Proposed Changes

### Backend

#### [MODIFY] [models.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/models.py)
Add the `ClientReport` table to store report metadata and file links.
```python
class ClientReport(Base):
    """Client Portal - Generated PDF Progress Reports for clients."""
    __tablename__ = "client_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    report_name = Column(String(255), nullable=False)
    report_date = Column(DateTime(timezone=True), nullable=False)
    summary_markdown = Column(String, nullable=True)
    pdf_url = Column(String(500), nullable=True)
    generated_by = Column(UUID(as_uuid=True), nullable=True)
    is_approved = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
```

#### [NEW] [pdf_generator.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/utils/pdf_generator.py)
Create a pure-Python, zero-dependency PDF generator that outputs standard PDF 1.4 syntax.
- Formats structured pages.
- Includes a title header, timestamp, and sections for:
  - Timeline & Execution Progress
  - Financials & Billing
  - Quality Control & NCRs
  - Summary Notes

#### [NEW] [reports.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/routers/reports.py)
Implement report router:
- `POST /reports/generate/{project_id}`: Renders aggregated stats from tasks, subcontractor bills, indents, and inspections. Invokes `pdf_generator`, stores PDF on disk, and logs to database.
- `GET /reports/{project_id}`: Lists reports.
- `PATCH /reports/{report_id}/approve`: Approves a report for client viewing.
- `GET /reports/{report_id}/download`: Serves the generated PDF file using FastAPI's `FileResponse`.

#### [MODIFY] [main.py](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/backend/app/main.py)
- Register `reports` router under `/apis/v3`.
- Mount static reports directory so generated files can be downloaded.

---

### Frontend

#### [NEW] [page.tsx](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/src/app/c/[company_id]/p/[project_id]/reports/page.tsx)
Build a glassmorphic report dashboard:
- **Left Column**: List of reports (approved and draft) with status badges and timestamps. Includes a "Generate Report" modal.
- **Right Column**: Live PDF viewer using an iframe or direct PDF viewer container, with buttons to Download PDF and Approve Report.
- Uses crimson highlights and dark glassmorphic panels.

#### [MODIFY] [page.tsx](file:///c:/Users/Dell/Github/Construction-Management-ERP-Software/frontend/src/app/c/[company_id]/dashboard/page.tsx)
- Add "Client Portal" sidebar item with a link to the reports page.

---

## Verification Plan

### Automated Tests
- Create `backend/test_phase11.py` to:
  1. Generate a report for a project.
  2. Fetch the report list.
  3. Validate the PDF download endpoint returns a valid `%PDF` payload.
  4. Toggle approval and verify status changes.

- Run the tests with `python backend/test_phase11.py`.
- Run frontend compilation build check with `npm run build` via command prompt.
