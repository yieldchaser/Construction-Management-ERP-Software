#!/usr/bin/env python3
"""Clean gap analysis using high-confidence signals only."""
from pathlib import Path
from datetime import datetime
from collections import Counter, defaultdict
import re

BASE = Path(r"C:\Users\Dell\Github\Construction-Management-ERP-Software")
ONSITE_RECON = BASE / "onsiteteams-recon"
REPORT_DIR = ONSITE_RECON / "recon-extraction-reports"
SITEFLOW_BACKEND = BASE / "backend"
SITEFLOW_FRONTEND = BASE / "frontend"

def read_text(path):
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""

def get_siteflow_backend_map():
    router_dir = SITEFLOW_BACKEND / "app" / "routers"
    routers = sorted([f.stem for f in router_dir.glob("*.py") if f.stem != "__init__"])
    models_text = read_text(SITEFLOW_BACKEND / "app" / "models.py")
    model_names = re.findall(r'class (\w+)\(Base\):', models_text)
    model_columns = defaultdict(list)
    for mname in model_names:
        pattern = rf'class {mname}\(Base\):.*?__tablename__ = "([^"]+)"(.*?)(?=class |\Z)'
        match = re.search(pattern, models_text, re.DOTALL)
        if match:
            table_name = match.group(1)
            body = match.group(2)
            cols = re.findall(r'^\s+(\w+)\s*=\s*Column', body, re.MULTILINE)
            model_columns[table_name] = cols
    return {"routers": routers, "models": dict(model_columns), "model_names": model_names}

def get_siteflow_frontend_routes():
    app_dir = SITEFLOW_FRONTEND / "src" / "app"
    routes = []
    for f in app_dir.rglob("page.tsx"):
        rel = f.relative_to(app_dir)
        route = "/" + str(rel.parent if rel.parent != Path(".") else Path(""))
        routes.append(route)
    return sorted(set(routes))

def aggregate_pdf_features():
    pdf_files = sorted(REPORT_DIR.glob("06-PDF-FULLTEXT-*.md"))
    features = Counter()
    full_texts = []
    for pf in pdf_files:
        text = read_text(pf)
        lines = [l.strip() for l in text.split("\n") if l.strip() and not l.startswith("#") and len(l) > 3]
        full_texts.extend(lines)
    combined = "\n".join(full_texts)
    return combined

def aggregate_har_apis():
    har_files = sorted(REPORT_DIR.glob("07-HAR-API-MAP-*.md"))
    endpoints = []
    for hf in har_files:
        text = read_text(hf)
        for line in text.split("\n"):
            m = re.match(r'- `(?:GET|POST|PUT|DELETE|PATCH) ([^`]+)`', line)
            if m:
                endpoints.append(m.group(1))
    return sorted(set(endpoints))

def aggregate_image_ocr():
    batches = sorted(REPORT_DIR.glob("05-IMAGES-OCR-BATCH-*.md"))
    all_text = []
    for bf in batches:
        text = read_text(bf)
        blocks = re.findall(r'```\n(.*?)\n```', text, re.DOTALL)
        for b in blocks:
            all_text.append(b)
    return "\n".join(all_text)

def main():
    print("Mapping SiteFlow...")
    sf = get_siteflow_backend_map()
    sf_routes = get_siteflow_frontend_routes()
    
    print("Aggregating PDFs...")
    pdf_text = aggregate_pdf_features()
    
    print("Aggregating HARs...")
    har_apis = aggregate_har_apis()
    
    print("Aggregating OCR...")
    ocr_text = aggregate_image_ocr()
    
    out = REPORT_DIR / "11-CLEAN-GAP-ANALYSIS.md"
    lines = [
        "# Clean Gap Analysis: Onsite Teams vs SiteFlow",
        f"Generated: {datetime.now().isoformat()}",
        "",
        "---",
        "",
        "## 1. SITEFLOW BACKEND CAPABILITY",
        "",
        f"- Routers: {len(sf['routers'])}",
        f"- Models: {len(sf['models'])}",
        "",
        "### Routers",
        ""
    ]
    for r in sorted(sf["routers"]):
        lines.append(f"- `{r}`")
    
    lines += [
        "",
        "### Models & Columns",
        ""
    ]
    for table, cols in sorted(sf["models"].items()):
        lines.append(f"- `{table}`: {', '.join(cols)}")
    
    lines += [
        "",
        "---",
        "",
        "## 2. SITEFLOW FRONTEND ROUTES",
        ""
    ]
    for r in sorted(sf_routes):
        lines.append(f"- `{r}`")
    
    lines += [
        "",
        "---",
        "",
        "## 3. ONSITE PDF FEATURE TEXT (cleaned)",
        ""
    ]
    # Extract lines that look like feature descriptions or headings
    pdf_lines = [l.strip() for l in pdf_text.split("\n") if l.strip() and not l.startswith("#") and len(l) > 10]
    seen = set()
    feature_lines = []
    for l in pdf_lines:
        key = l[:120]
        if key not in seen:
            seen.add(key)
            feature_lines.append(l)
    for l in feature_lines[:300]:
        lines.append(f"- {l}")
    
    lines += [
        "",
        "---",
        "",
        "## 4. ONSITE API ENDPOINTS (from HAR)",
        ""
    ]
    for ep in har_apis[:200]:
        lines.append(f"- `{ep}`")
    
    lines += [
        "",
        "---",
        "",
        "## 5. ONSITE OCR UI ELEMENTS (filtered for quality)",
        ""
    ]
    # Only keep lines that look like actual UI, not OCR garbage
    ocr_lines = [l.strip() for l in ocr_text.split("\n") if l.strip() and len(l) > 5 and len(l) < 150]
    ui_elements = []
    seen = set()
    for l in ocr_lines:
        # Filter out obvious noise
        if re.search(r'[a-zA-Z]{3,}', l):
            key = re.sub(r'[^a-zA-Z0-9]', '', l).lower()[:50]
            if key not in seen:
                seen.add(key)
                ui_elements.append(l)
    
    # Classify
    nav_items = []
    form_fields = []
    buttons = []
    table_headers = []
    for item in ui_elements:
        if any(w in item for w in ["Dashboard", "Report", "Attendance", "Payroll", "Project", "Task", "Billing", "Finance", "Procurement", "Equipment", "Safety", "Quality", "Planning", "Gantt", "Library", "Settings", "HR", "CRM", "Chat", "MOM", "Leave", "Employee", "Subcontractor", "Vendor", "Material", "Inventory", "PO", "GRN", "Work Order", "DPR", "Drawing", "RFI", "Budget", "Asset", "Wastage", "Production", "Statutory", "Tally", "Zoho", "Analytics", "Team", "Schedule", "Timesheet", "Invoice", "Payment", "Ledger", "P&L", "Bank", "Cash", "Cheque", "Material Transfer", "Muster", "Punch", "Expense", "Party", "RFQ", "Three-way", "Matching"]):
            if len(item) < 80 and not ":" in item:
                nav_items.append(item)
        if ":" in item and len(item) < 100:
            form_fields.append(item)
        if any(w in item for w in ["Save", "Cancel", "Submit", "Approve", "Reject", "Download", "Upload", "Export", "Import", "Filter", "Search", "Add", "Edit", "Delete", "Print", "View", "Send", "Generate", "Create", "Update", "Confirm", "OK"]):
            buttons.append(item)
        if "|" in item and len(item) < 200:
            table_headers.append(item)
    
    lines += [
        "\n### Navigation / Modules",
        ""
    ]
    for item in sorted(set(nav_items))[:100]:
        lines.append(f"- `{item}`")
    
    lines += [
        "\n### Form Fields / Labels",
        ""
    ]
    for item in sorted(set(form_fields))[:150]:
        lines.append(f"- `{item}`")
    
    lines += [
        "\n### Buttons / Actions",
        ""
    ]
    for item in sorted(set(buttons))[:100]:
        lines.append(f"- `{item}`")
    
    lines += [
        "\n### Table Headers / Rows",
        ""
    ]
    for item in sorted(set(table_headers))[:100]:
        lines.append(f"- `{item}`")
    
    lines += [
        "",
        "---",
        "",
        "## 6. CLEAN GAP ANALYSIS",
        "",
        "### A. Modules present in Onsite UI but not mapped to SiteFlow routers/models:",
        ""
    ]
    sf_all = set(sf["routers"]) | set(sf["model_names"]) | set(sf["models"].keys())
    ocr_nav_clean = sorted(set(nav_items))
    missing = []
    for item in ocr_nav_clean:
        clean = re.sub(r'[^a-zA-Z0-9]', '', item).lower()
        found = False
        for sf_item in sf_all:
            if clean in re.sub(r'[^a-zA-Z0-9]', '', sf_item).lower() or re.sub(r'[^a-zA-Z0-9]', '', sf_item).lower() in clean:
                found = True
                break
        if not found and len(clean) > 4:
            missing.append(item)
    
    for item in missing[:100]:
        lines.append(f"- `{item}`")
    
    lines += [
        "",
        "### B. Table columns / form fields missing in SiteFlow models:",
        ""
    ]
    all_fields = sorted(set(form_fields + table_headers))
    missing_fields = []
    for item in all_fields:
        clean = re.sub(r'[^a-zA-Z0-9]', ' ', item).lower().strip()
        clean = re.sub(r'\s+', ' ', clean)
        if len(clean) < 4:
            continue
        found = False
        for table, cols in sf["models"].items():
            for col in cols:
                if clean in col.lower() or col.lower() in clean:
                    found = True
                    break
        if not found:
            missing_fields.append(item)
    
    for item in sorted(set(missing_fields))[:150]:
        lines.append(f"- `{item}`")
    
    lines += [
        "",
        "### C. Business logic / formula indicators from UI text:",
        ""
    ]
    logic_lines = []
    for l in ocr_lines:
        if any(w in l for w in ["GST", "TDS", "Rate", "Calculate", "Total", "Tax", "Deduction", "Advance", "Retention", "Wastage", "Qty", "Amount", "Balance", "Due", "Paid", "Filter", "Search"]):
            if 8 < len(l) < 120:
                logic_lines.append(l)
    unique_logic = list(dict.fromkeys(logic_lines))[:150]
    for item in unique_logic:
        lines.append(f"- `{item}`")
    
    lines += [
        "",
        "---",
        "",
        "## 7. SUMMARY",
        "",
        f"- SiteFlow routers: {len(sf['routers'])}",
        f"- SiteFlow models: {len(sf['models'])}",
        f"- Onsite HAR endpoints: {len(har_apis)}",
        f"- Onsite UI nav items: {len(ocr_nav_clean)}",
        f"- Onsite form fields: {len(form_fields)}",
        f"- Onsite table headers: {len(table_headers)}",
        f"- Potential missing Onsite modules in SiteFlow: {len(missing)}",
        f"- Potential missing columns/fields in SiteFlow: {len(missing_fields)}",
        "",
        "Next step: Manually review the MISSING lists above and map them to SiteFlow enhancement tickets.",
    ]
    
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out.name}")

if __name__ == "__main__":
    main()
