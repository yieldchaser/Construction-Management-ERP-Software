#!/usr/bin/env python3
"""Deep gap analysis: Onsite Teams OCR/PDF/HAR vs SiteFlow implementation."""
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

def aggregate_ocr():
    """Aggregate all structured data from improved OCR batches."""
    batches = sorted(REPORT_DIR.glob("09-IMAGES-IMPROVED-OCR-BATCH-*.md"))
    all_nav = Counter()
    all_forms = Counter()
    all_buttons = Counter()
    all_tables = Counter()
    all_raw = []
    
    for bf in batches:
        text = read_text(bf)
        lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if not line or not line.startswith("- "):
                continue
            content = line[2:].strip()
            if "Headers/Nav" in content or "Form Fields" in content or "Buttons/Actions" in content or "Table Rows" in content:
                continue
            all_raw.append(content)
            # nav
            if len(content) < 80 and not ":" in content:
                all_nav[content] += 1
            # forms
            if ":" in content and len(content) < 120:
                all_forms[content] += 1
            # buttons
            if any(w in content for w in ["Download", "Upload", "Export", "Import", "Filter", "Search", "Add New", "Delete", "Edit", "Save", "Cancel", "Submit", "Approve", "Reject", "Generate", "Create", "Update", "Print", "View", "Send", "Apply", "Reset", "OK", "Yes", "No"]):
                all_buttons[content] += 1
            # tables
            if "|" in content and len(content) > 5:
                all_tables[content] += 1
    return {"nav": all_nav, "forms": all_forms, "buttons": all_buttons, "tables": all_tables, "raw": all_raw}

def aggregate_pdf_text():
    """Get full combined text from all PDF reports."""
    pdf_files = sorted(REPORT_DIR.glob("06-PDF-FULLTEXT-*.md"))
    all_text = []
    for pf in pdf_files:
        t = read_text(pf)
        # Remove markdown headers
        lines = [l for l in t.split("\n") if not l.startswith("#")]
        all_text.append("\n".join(lines))
    return "\n".join(all_text)

def aggregate_har_endpoints():
    """Get structured endpoints from HAR map."""
    har_files = sorted(REPORT_DIR.glob("07-HAR-API-MAP-*.md"))
    all_text = []
    for hf in har_files:
        all_text.append(read_text(hf))
    return "\n".join(all_text)

def extract_keywords(text):
    """Extract meaningful keywords/phrases from text."""
    words = []
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        # Match common module/feature patterns
        if re.match(r'^[A-Z][A-Za-z\s/&()-]{3,60}$', line):
            words.append(line)
    return words

def main():
    print("Aggregating OCR...")
    ocr = aggregate_ocr()
    print("Aggregating PDFs...")
    pdf_text = aggregate_pdf_text()
    print("Aggregating HARs...")
    har_text = aggregate_har_endpoints()
    print("Mapping SiteFlow...")
    sf = get_siteflow_backend_map()
    sf_routes = get_siteflow_frontend_routes()
    
    # Build keyword sets
    ocr_nav = set(ocr["nav"].keys())
    ocr_forms = set(ocr["forms"].keys())
    ocr_buttons = set(ocr["buttons"].keys())
    ocr_tables = set(ocr["tables"].keys())
    
    pdf_keywords = Counter(extract_keywords(pdf_text))
    har_lines = [l for l in har_text.split("\n") if l.startswith("- `")]
    har_endpoints = [l.split("`")[1] for l in har_lines]
    
    sf_routers_set = set(sf["routers"])
    sf_models_set = set(sf["model_names"])
    sf_tables_set = set(sf["models"].keys())
    sf_routes_set = set(sf_routes)
    
    # Gap analysis
    out = REPORT_DIR / "10-DEEP-GAP-ANALYSIS.md"
    lines = [
        "# Deep Gap Analysis: Onsite Teams vs SiteFlow",
        f"Generated: {datetime.now().isoformat()}",
        "",
        "---",
        "",
        "## 1. SITEFLOW BACKEND EXISTS",
        f"- Routers: {len(sf_routers_set)}",
        f"- Models: {len(sf_models_set)}",
        f"- Tables: {len(sf_tables_set)}",
        "",
        "### Routers",
        ""
    ]
    for r in sorted(sf_routers_set):
        lines.append(f"- `{r}`")
    
    lines += [
        "",
        "### Models",
        ""
    ]
    for m in sorted(sf_models_set):
        lines.append(f"- `{m}`")
    
    lines += [
        "",
        "---",
        "",
        "## 2. SITEFLOW FRONTEND ROUTES",
        f"Total: {len(sf_routes_set)}",
        ""
    ]
    for r in sorted(sf_routes_set):
        lines.append(f"- `{r}`")
    
    lines += [
        "",
        "---",
        "",
        "## 3. ONSITE TEAMS EXTRACTED UI (from 586 screenshots)",
        "",
        "### Navigation / Menu Items (unique: " + str(len(ocr_nav)) + ")",
        ""
    ]
    for item, cnt in ocr["nav"].most_common(100):
        lines.append(f"- `{item}` ({cnt}x)")
    
    lines += [
        "",
        "### Form Fields / Labels (unique: " + str(len(ocr_forms)) + ")",
        ""
    ]
    for item, cnt in ocr["forms"].most_common(150):
        lines.append(f"- `{item}` ({cnt}x)")
    
    lines += [
        "",
        "### Buttons / Actions (unique: " + str(len(ocr_buttons)) + ")",
        ""
    ]
    for item, cnt in ocr["buttons"].most_common(100):
        lines.append(f"- `{item}` ({cnt}x)")
    
    lines += [
        "",
        "### Table Headers / Rows (unique: " + str(len(ocr_tables)) + ")",
        ""
    ]
    for item, cnt in ocr["tables"].most_common(100):
        lines.append(f"- `{item}` ({cnt}x)")
    
    lines += [
        "",
        "---",
        "",
        "## 4. ONSITE PDF FEATURE CLAIMS (top keywords)",
        ""
    ]
    for item, cnt in pdf_keywords.most_common(100):
        lines.append(f"- `{item}` ({cnt}x)")
    
    lines += [
        "",
        "---",
        "",
        "## 5. ONSITE HAR API ENDPOINTS (unique: " + str(len(set(har_endpoints))) + ")",
        ""
    ]
    for ep in sorted(set(har_endpoints))[:200]:
        lines.append(f"- `{ep}`")
    if len(set(har_endpoints)) > 200:
        lines.append(f"- ... and {len(set(har_endpoints))-200} more")
    
    lines += [
        "",
        "---",
        "",
        "## 6. GAP ANALYSIS: ONSITE UI vs SITEFLOW BACKEND",
        ""
    ]
    
    # Compare nav items to routers/models
    missing_in_sf = []
    for item in ocr_nav:
        clean = item.replace(":", "").replace("/", " ").strip()
        found = False
        for sf_item in list(sf_routers_set) + list(sf_models_set) + list(sf_tables_set):
            if clean.lower() in sf_item.lower() or sf_item.lower() in clean.lower():
                found = True
                break
        if not found and len(clean) > 3:
            missing_in_sf.append(item)
    
    lines.append("### Navigation/Modules UI exists in Onsite but MISSING in SiteFlow backend:")
    lines.append("")
    for item in missing_in_sf[:100]:
        lines.append(f"- `{item}`")
    
    # Compare form fields to model columns
    lines += [
        "",
        "### Form Fields / Columns UI exists in Onsite but potentially MISSING in SiteFlow models:",
        ""
    ]
    all_form_items = list(ocr_forms) + list(ocr_tables)
    missing_cols = []
    for item in all_form_items:
        clean = re.sub(r'[|:\s]+', ' ', item).strip()
        clean = clean.replace("_", " ")
        if len(clean) < 3:
            continue
        found = False
        for sf_table, cols in sf["models"].items():
            for col in cols:
                if clean.lower() in col.lower():
                    found = True
                    break
        if not found:
            missing_cols.append(item)
    
    for item in sorted(set(missing_cols))[:150]:
        lines.append(f"- `{item}`")
    
    lines += [
        "",
        "---",
        "",
        "## 7. BUSINESS LOGIC INDICATORS & FORMULAS FROM OCR",
        ""
    ]
    formula_lines = []
    for line in ocr["raw"]:
        if any(w in line for w in ["GST", "TDS", "%", "Rate", "Formula", "Calculate", "Total", "Sub Total", "Net Amount", "Grand Total", "Tax", "Deduction", "Advance", "Retention", "Wastage", "Qty", "Quantity", "Unit", "Rate", "Amount", "Balance", "Due", "Paid", "Unpaid", "Approval", "Status", "Filter", "All", "Select"]):
            if 5 < len(line) < 150:
                formula_lines.append(line)
    unique_formulas = list(dict.fromkeys(formula_lines))[:200]
    for item in unique_formulas:
        lines.append(f"- `{item}`")
    
    lines += [
        "",
        "---",
        "",
        "## 8. ONSITE JSON SCHEMA KEYS (from HAR response bodies)",
        ""
    ]
    har_dir = ONSITE_RECON / "Extra HAR + Image Recon" / "Har Files"
    har_files = sorted(har_dir.glob("*.har"))
    json_keys = Counter()
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
                            for k in list(parsed.keys())[:30]:
                                json_keys[k] += 1
                    except Exception:
                        pass
        except Exception:
            pass
    
    for key, cnt in json_keys.most_common(100):
        lines.append(f"- `{key}` ({cnt}x)")
    
    lines += [
        "",
        "---",
        "",
        "## 9. SUMMARY GAPS",
        "",
        f"- Onsite Navigation items missing in SiteFlow backend: {len(missing_in_sf)}",
        f"- Onsite form fields/columns potentially missing in SiteFlow models: {len(missing_cols)}",
        f"- Onsite JSON keys found in HAR: {len(json_keys)}",
        f"- SiteFlow routers: {len(sf_routers_set)}",
        f"- SiteFlow models: {len(sf_models_set)}",
        "",
        "---",
        "",
        "## 10. DETAILED COMPARISON TABLES",
        "",
        "### Onsite Module vs SiteFlow Router/Model",
        ""
    ]
    # Build comparison table
    all_onsite_modules = sorted(ocr_nav)
    seen = set()
    for mod in all_onsite_modules:
        if mod in seen or len(mod) < 3:
            continue
        seen.add(mod)
        matched = []
        for sf_item in list(sf_routers_set) + list(sf_models_set) + list(sf_tables_set):
            if mod.lower() in sf_item.lower() or sf_item.lower() in mod.lower():
                matched.append(sf_item)
        status = "MATCHED" if matched else "MISSING"
        lines.append(f"- `{mod}` | {status} | {', '.join(matched[:5]) if matched else 'None'}")
    
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out.name}")

if __name__ == "__main__":
    main()
