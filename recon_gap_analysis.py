#!/usr/bin/env python3
"""Deep gap analysis: Onsite Teams (from OCR/PDF/HAR) vs SiteFlow implementation."""
from pathlib import Path
from datetime import datetime
from collections import Counter, defaultdict
import re
import json

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

def extract_from_ocr_batch(text):
    """Extract structured elements from a single OCR batch markdown."""
    items = {
        "headers": [],
        "forms": [],
        "buttons": [],
        "tables": [],
        "nav_items": [],
        "filters": [],
        "columns": [],
        "raw_lines": []
    }
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue
        items["raw_lines"].append(line)
        
        # Extract from structured sections
        if line.startswith("- "):
            content = line[2:].strip()
            if "Headers/Nav" in content or "Form Fields" in content or "Buttons/Actions" in content or "Table Rows" in content:
                continue
            # Classify
            if any(w in content for w in ["Dashboard", "Report", "Attendance", "Payroll", "Project", "Task", "Billing", "Finance", "Procurement", "Equipment", "Safety", "Quality", "Planning", "Gantt", "Library", "Settings", "HR", "CRM", "Chat", "MOM", "Leave", "Employee", "Subcontractor", "Vendor", "Material", "Inventory", "PO", "GRN", "Work Order", "DPR", "Drawing", "RFI", "Budget", "Asset", "Wastage", "Production", "Statutory", "Tally", "Zoho", "Analytics", "Team", "Schedule", "Timesheet", "Invoice", "Payment", "Ledger", "P&L", "Bank", "Cash", "Cheque", "Material Transfer", "Issue", "Muster", "Punch", "Expense", "Party"]):
                if ":" not in content and len(content) < 80:
                    items["nav_items"].append(content)
            if ":" in content and len(content) < 120:
                items["forms"].append(content)
            if any(w in content for w in ["Download", "Upload", "Export", "Import", "Filter", "Search", "Add New", "Delete", "Edit", "Save", "Cancel", "Submit", "Approve", "Reject", "Generate", "Create", "Update", "Print", "View", "Send", "Apply", "Reset"]):
                items["buttons"].append(content)
            if "|" in content or "\t" in content:
                items["tables"].append(content)
        # Direct table detection
        if "|" in line and len(line) > 5:
            items["tables"].append(line)
    return items

def aggregate_ocr():
    """Aggregate all structured data from improved OCR batches."""
    batches = sorted(REPORT_DIR.glob("09-IMAGES-IMPROVED-OCR-BATCH-*.md"))
    all_nav = Counter()
    all_forms = Counter()
    all_buttons = Counter()
    all_tables = Counter()
    all_columns = Counter()
    all_filters = Counter()
    
    for bf in batches:
        text = read_text(bf)
        data = extract_from_ocr_batch(text)
        for item in data["nav_items"]:
            all_nav[item] += 1
        for item in data["forms"]:
            all_forms[item] += 1
        for item in data["buttons"]:
            all_buttons[item] += 1
        for item in data["tables"]:
            all_tables[item] += 1
    return {
        "nav": all_nav,
        "forms": all_forms,
        "buttons": all_buttons,
        "tables": all_tables
    }

def get_siteflow_backend_map():
    """Map SiteFlow backend routers and models."""
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
    """List frontend routes."""
    app_dir = SITEFLOW_FRONTEND / "src" / "app"
    routes = []
    for f in app_dir.rglob("page.tsx"):
        rel = f.relative_to(app_dir)
        route = "/" + str(rel.parent if rel.parent != Path(".") else Path(""))
        routes.append(route)
    return sorted(set(routes))

def analyze_pdf_features():
    """Extract feature claims from PDFs."""
    pdf_dir = REPORT_DIR
    pdf_files = sorted(pdf_dir.glob("06-PDF-FULLTEXT-*.md"))
    features = Counter()
    for pf in pdf_files:
        text = read_text(pf)
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("#") or not line:
                continue
            # Look for feature descriptions
            if any(w in line for w in ["Attendance", "Payroll", "Procurement", "Billing", "Finance", "CRM", "Reports", "Equipment", "Safety", "Quality", "Planning", "Gantt", "Chat", "MOM", "Library", "Settings", "HR", "Material", "Inventory", "PO", "GRN", "Work Order", "DPR", "Leave", "Employee", "Subcontractor", "Vendor", "RFQ", "Tally", "Zoho", "Statutory", "Asset", "Wastage", "Production", "Drawing", "RFI", "Budget", "Timesheet", "Invoice", "Payment", "Ledger", "P&L", "Bank", "Cash", "Cheque"]):
                if len(line) > 10 and len(line) < 200:
                    features[line] += 1
    return features

def analyze_har_json():
    """Extract JSON schemas from HAR response bodies."""
    har_dir = ONSITE_RECON / "Extra HAR + Image Recon" / "Har Files"
    har_files = sorted(har_dir.glob("*.har"))
    json_schemas = []
    for hf in har_files:
        text = read_text(hf)
        try:
            data = json.loads(text)
            entries = data.get("log", {}).get("entries", [])
            for entry in entries:
                resp = entry.get("response", {})
                content = resp.get("content", {})
                body = content.get("text", "")
                if body and ("json" in content.get("mimeType", "").lower() or body.strip().startswith("{")):
                    try:
                        parsed = json.loads(body)
                        if isinstance(parsed, dict):
                            json_schemas.append({
                                "url": entry.get("request", {}).get("url", ""),
                                "keys": list(parsed.keys())[:50],
                                "size": len(body)
                            })
                    except Exception:
                        pass
        except Exception:
            pass
    return json_schemas

def main():
    print("Aggregating OCR data...")
    ocr_data = aggregate_ocr()
    
    print("Mapping SiteFlow backend...")
    sf_backend = get_siteflow_backend_map()
    
    print("Mapping SiteFlow frontend routes...")
    sf_routes = get_siteflow_frontend_routes()
    
    print("Analyzing PDF features...")
    pdf_features = analyze_pdf_features()
    
    print("Analyzing HAR JSON schemas...")
    har_schemas = analyze_har_json()
    
    # Write comprehensive gap analysis report
    out = REPORT_DIR / "10-DEEP-GAP-ANALYSIS.md"
    lines = [
        "# Deep Gap Analysis: Onsite Teams vs SiteFlow",
        f"Generated: {datetime.now().isoformat()}",
        "",
        "---",
        "",
        "## 1. SITEFLOW BACKEND CAPABILITY MAP",
        "",
        "### Routers (" + str(len(sf_backend["routers"])) + " modules)",
        ""
    ]
    for r in sf_backend["routers"]:
        lines.append(f"- `{r}`")
    
    lines += [
        "",
        "### Models & Tables (" + str(len(sf_backend["models"])) + " tables)",
        ""
    ]
    for table, cols in sorted(sf_backend["models"].items()):
        lines.append(f"- `{table}`: {', '.join(cols[:10])}{'...' if len(cols)>10 else ''}")
    
    lines += [
        "",
        "---",
        "",
        "## 2. SITEFLOW FRONTEND ROUTES (" + str(len(sf_routes)) + " routes)",
        ""
    ]
    for r in sf_routes[:100]:
        lines.append(f"- `{r}`")
    if len(sf_routes) > 100:
        lines.append(f"- ... and {len(sf_routes)-100} more")
    
    lines += [
        "",
        "---",
        "",
        "## 3. ONSITE TEAMS UI ELEMENTS (from " + str(len(list(REPORT_DIR.glob('09-IMAGES-IMPROVED-OCR-BATCH-*.md')))) + " screenshots)",
        "",
        "### Navigation Items (Top " + str(min(50, len(ocr_data["nav"]))) + ")",
        ""
    ]
    for item, count in ocr_data["nav"].most_common(50):
        lines.append(f"- `{item}` ({count}x)")
    
    lines += [
        "",
        "### Form Fields / Labels (Top " + str(min(100, len(ocr_data["forms"]))) + ")",
        ""
    ]
    for item, count in ocr_data["forms"].most_common(100):
        lines.append(f"- `{item}` ({count}x)")
    
    lines += [
        "",
        "### Buttons / Actions (Top " + str(min(50, len(ocr_data["buttons"]))) + ")",
        ""
    ]
    for item, count in ocr_data["buttons"].most_common(50):
        lines.append(f"- `{item}` ({count}x)")
    
    lines += [
        "",
        "### Table Headers / Row Patterns (Top " + str(min(50, len(ocr_data["tables"]))) + ")",
        ""
    ]
    for item, count in ocr_data["tables"].most_common(50):
        lines.append(f"- `{item}` ({count}x)")
    
    lines += [
        "",
        "---",
        "",
        "## 4. PDF FEATURE CLAIMS (Top " + str(min(100, len(pdf_features))) + ")",
        ""
    ]
    for item, count in pdf_features.most_common(100):
        lines.append(f"- `{item}` ({count}x)")
    
    lines += [
        "",
        "---",
        "",
        "## 5. HAR JSON SCHEMA SAMPLES (" + str(len(har_schemas)) + " unique JSON responses)",
        ""
    ]
    for i, schema in enumerate(har_schemas[:30]):
        lines.append(f"\n### Schema {i+1}")
        lines.append(f"- URL: {schema['url'][:120]}")
        lines.append(f"- Keys: {', '.join(schema['keys'][:20])}")
        lines.append(f"- Size: {schema['size']} bytes")
    
    lines += [
        "",
        "---",
        "",
        "## 6. GAP ANALYSIS SUMMARY",
        "",
        "### Onsite Teams UI Elements NOT Found in SiteFlow Backend:",
        ""
    ]
    # Cross-reference nav items against SiteFlow routers
    sf_router_names = set(sf_backend["routers"])
    sf_model_names = set(sf_backend["model_names"])
    sf_tables = set(sf_backend["models"].keys())
    
    onsite_nav_lower = {k.lower(): k for k in ocr_data["nav"].keys()}
    onsite_forms_lower = {k.lower(): k for k in ocr_data["forms"].keys()}
    onsite_buttons_lower = {k.lower(): k for k in ocr_data["buttons"].keys()}
    
    missing_nav = []
    for onsite_item in onsite_nav_lower.values():
        found = False
        for sf_item in list(sf_router_names) + list(sf_model_names) + list(sf_tables):
            if onsite_item.lower() in sf_item.lower() or sf_item.lower() in onsite_item.lower():
                found = True
                break
        if not found and len(onsite_item) > 3:
            missing_nav.append(onsite_item)
    
    for item in missing_nav[:50]:
        lines.append(f"- `{item}`")
    
    lines += [
        "",
        "### Onsite Table Columns / Form Fields Potentially Missing in SiteFlow Models:",
        ""
    ]
    for item in list(ocr_data["forms"].keys())[:50] + list(ocr_data["tables"].keys())[:50]:
        found = False
        for sf_table, cols in sf_backend["models"].items():
            for col in cols:
                if item.lower().replace(":", "").replace("_", " ") in col.lower():
                    found = True
                    break
        if not found and len(item) > 3:
            lines.append(f"- `{item}`")
    
    lines += [
        "",
        "### Key Business Logic / Formula Indicators from OCR:",
        ""
    ]
    formula_indicators = []
    for line in ocr_data["raw_lines"]:
        if any(w in line for w in ["GST", "TDS", "%", "Rate", "Formula", "Calculate", "Total", "Sub Total", "Net Amount", "Grand Total", "Tax", "Deduction", "Advance", "Retention", "Wastage", "Qty", "Quantity", "Unit", "Rate", "Amount", "Balance", "Due", "Paid", "Unpaid", "Approval", "Status"]):
            if len(line) > 5 and len(line) < 150:
                formula_indicators.append(line)
    unique_indicators = list(dict.fromkeys(formula_indicators))[:100]
    for item in unique_indicators:
        lines.append(f"- `{item}`")
    
    lines += [
        "",
        "---",
        "",
        "## 7. STRUCTURED ONSCREEN UI COMPONENTS (Column Names, Filters, Dropdowns)",
        ""
    ]
    all_structured = list(ocr_data["forms"].keys()) + list(ocr_data["tables"].keys())
    for item in sorted(set(all_structured))[:200]:
        lines.append(f"- `{item}`")
    
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out.name}")

if __name__ == "__main__":
    main()
