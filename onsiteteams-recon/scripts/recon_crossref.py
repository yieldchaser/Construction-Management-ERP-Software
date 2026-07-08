#!/usr/bin/env python3
"""Cross-reference analysis: Onsite Teams features vs SiteFlow implementation."""
from pathlib import Path
from datetime import datetime
import re
from collections import Counter, defaultdict

BASE = Path(r"C:\Users\Dell\Github\Construction-Management-ERP-Software")
ONSITE_RECON = BASE / "onsiteteams-recon"
REPORT_DIR = ONSITE_RECON / "recon-extraction-reports"
SITEFLOW_BACKEND = BASE / "backend"

def read_text(path):
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return ""

def extract_keywords_from_text(text):
    """Extract likely module/feature names from text."""
    keywords = []
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        # Look for capitalized words/phrases that look like module names
        if re.match(r'^[A-Z][A-Za-z\s]{3,40}$', line):
            keywords.append(line)
        # Look for lines with specific keywords
        if any(w in line for w in ["Dashboard", "Attendance", "Payroll", "Procurement", "Billing", "Finance", "CRM", "Reports", "Equipment", "Safety", "Quality", "Planning", "Gantt", "Chat", "MOM", "Library", "Settings", "HR", "Material", "Inventory", "PO", "GRN", "RA Bill", "Work Order", "Task", "ToDo", "DPR", "Leave", "Employee", "Subcontractor", "Vendor", "RFQ", "Tally", "Zoho", "Statutory", "Asset", "Wastage", "Production"]):
            keywords.append(line)
    return keywords

def analyze_images_ocr():
    """Aggregate OCR text from all image batches."""
    ocr_dir = REPORT_DIR
    all_text = []
    batch_files = sorted(ocr_dir.glob("05-IMAGES-OCR-BATCH-*.md"))
    print(f"Found {len(batch_files)} OCR batch files")
    for bf in batch_files:
        text = read_text(bf)
        # Extract text between ``` markers
        matches = re.findall(r'```\n(.*?)\n```', text, re.DOTALL)
        for m in matches:
            all_text.append(m)
    combined = "\n".join(all_text)
    return combined

def analyze_pdfs():
    """Aggregate text from all PDF extraction files."""
    pdf_files = sorted(REPORT_DIR.glob("06-PDF-FULLTEXT-*.md"))
    all_text = []
    for pf in pdf_files:
        text = read_text(pf)
        # Remove markdown headers, keep content
        lines = text.split("\n")
        content = []
        for line in lines:
            if line.startswith("#"):
                continue
            content.append(line)
        all_text.append("\n".join(content))
    return "\n".join(all_text)

def analyze_har():
    """Parse HAR API map."""
    har_files = sorted(REPORT_DIR.glob("07-HAR-API-MAP-*.md"))
    all_text = []
    for hf in har_files:
        all_text.append(read_text(hf))
    return "\n".join(all_text)

def analyze_siteflow_backend():
    """List SiteFlow backend routers and models."""
    routers = list((SITEFLOW_BACKEND / "app" / "routers").glob("*.py"))
    router_names = [r.stem for r in routers if r.stem != "__init__"]
    return router_names

def main():
    print("Analyzing Onsite OCR text...")
    ocr_text = analyze_images_ocr()
    
    print("Analyzing PDF text...")
    pdf_text = analyze_pdfs()
    
    print("Analyzing HAR APIs...")
    har_text = analyze_har()
    
    print("Analyzing SiteFlow backend...")
    sf_routers = analyze_siteflow_backend()
    
    # Extract keywords from each source
    ocr_keywords = extract_keywords_from_text(ocr_text)
    pdf_keywords = extract_keywords_from_text(pdf_text)
    har_keywords = extract_keywords_from_text(har_text)
    
    ocr_counts = Counter(ocr_keywords)
    pdf_counts = Counter(pdf_keywords)
    har_counts = Counter(har_keywords)
    
    # Write cross-reference report
    out = REPORT_DIR / "08-CROSS-REFERENCE-ANALYSIS.md"
    lines = [
        "# Cross-Reference Analysis: Onsite Teams vs SiteFlow",
        f"Generated: {datetime.now().isoformat()}",
        "",
        "## Summary",
        f"- OCR text samples: {len(ocr_keywords)} keyword hits",
        f"- PDF feature mentions: {len(pdf_keywords)} keyword hits",
        f"- HAR API endpoints analyzed",
        f"- SiteFlow backend routers: {len(sf_routers)}",
        "",
        "---",
        "",
        "## SiteFlow Backend Routers (Existing Capability)",
        ""
    ]
    for r in sorted(sf_routers):
        lines.append(f"- `{r}`")
    
    lines += [
        "",
        "---",
        "",
        "## Top OCR Keywords (Image Screenshots)",
        "",
        "| Keyword | Count |",
        "|---|---|",
    ]
    for kw, cnt in ocr_counts.most_common(100):
        lines.append(f"| {kw} | {cnt} |")
    
    lines += [
        "",
        "---",
        "",
        "## Top PDF Keywords (Product Literature)",
        "",
        "| Keyword | Count |",
        "|---|---|",
    ]
    for kw, cnt in pdf_counts.most_common(100):
        lines.append(f"| {kw} | {cnt} |")
    
    lines += [
        "",
        "---",
        "",
        "## HAR API Endpoint Patterns",
        ""
    ]
    # Summarize HAR endpoints
    har_lines = har_text.split("\n")
    endpoint_lines = [l for l in har_lines if l.startswith("- `")]
    for el in endpoint_lines[:200]:
        lines.append(el)
    
    lines += [
        "",
        "---",
        "",
        "## Raw OCR Text Samples (First 50 hits)",
        ""
    ]
    # Sample unique OCR lines
    unique_ocr = list(dict.fromkeys(ocr_keywords))[:100]
    for line in unique_ocr:
        lines.append(f"- {line}")
    
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out.name}")

if __name__ == "__main__":
    main()
