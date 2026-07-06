#!/usr/bin/env python3
"""Improved OCR with preprocessing for better text extraction from screenshots."""
from pathlib import Path
from datetime import datetime
import pytesseract
import hashlib
from PIL import Image, ImageEnhance, ImageFilter
import re

TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

BASE = Path(r"C:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon")
REPORT = BASE / "recon-extraction-reports"
IMG_DIRS = [
    BASE / "Extra HAR + Image Recon" / "All Images Documented",
    BASE / "Recon Pictures"
]

def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        h.update(f.read(65536))
    return h.hexdigest()

def preprocess(img):
    """Improve OCR accuracy: grayscale, contrast, slight sharpen."""
    img = img.convert("L")
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.5)
    return img

def ocr_image(path):
    info = {
        "file": str(path.relative_to(BASE)),
        "size_kb": round(path.stat().st_size/1024,2),
        "md5": md5(path),
        "width": 0,
        "height": 0,
        "text": "",
        "tables": [],
        "error": None
    }
    try:
        with Image.open(path) as img:
            info["width"] = img.width
            info["height"] = img.height
            processed = preprocess(img)
            # Use PSM 6 for table-like layouts (treat image as uniform block of text)
            config = "--psm 6"
            text = pytesseract.image_to_string(processed, config=config)
            info["text"] = text.strip()
            # Also try PSM 11/12 for sparse text if PSM 6 gives little
            if len(text.strip()) < 50:
                for psm in [11, 12]:
                    t2 = pytesseract.image_to_string(processed, config=f"--psm {psm}")
                    if len(t2.strip()) > len(info["text"]):
                        info["text"] = t2.strip()
            # Try to extract table data with OSD
            try:
                osd = pytesseract.image_to_osd(processed, output_type=pytesseract.Output.DICT)
                info["osd"] = {"rotate": osd.get("rotate"), "orientation": osd.get("orientation")}
            except Exception:
                pass
    except Exception as e:
        info["error"] = str(e)
    return info

def extract_structured(text):
    """Extract structured UI elements from OCR text."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    tables = []
    forms = []
    nav = []
    buttons = []
    headers = []
    data_rows = []
    
    for i, line in enumerate(lines):
        # Detect table-like structures (rows with multiple | or tabs)
        if "|" in line or "\t" in line:
            tables.append(line)
        # Detect headers (short, all caps or title case, often standalone)
        elif re.match(r'^[A-Z][A-Za-z\s/]{3,50}$', line) and len(line) < 60:
            if any(w in line for w in ["Dashboard", "Report", "Attendance", "Payroll", "Project", "Task", "Billing", "Finance", "Procurement", "Equipment", "Safety", "Quality", "Planning", "Gantt", "Library", "Settings", "HR", "CRM", "Chat", "MOM", "Leave", "Employee", "Subcontractor", "Vendor", "Material", "Inventory", "PO", "GRN", "Work Order", "DPR", "Drawing", "RFI", "Budget", "Asset", "Wastage", "Production", "Statutory", "Tally", "Zoho", "Analytics", "Team", "Schedule", "Timesheet", "Invoice", "Payment", "Ledger", "P&L", "Bank", "Cash", "Cheque", "Unit", "Qty", "Rate", "Amount", "Total", "GST", "TDS", "Tax", "Deduction", "Advance", "Retention", "Party", "Client", "Lead", "Quotation", "Site", "Worker", "Mason", "Helper", "Supervisor", "Engineer", "Manager", "Admin", "User", "Role", "Permission", "Approval", "Reject", "Pending", "Approved", "Download", "Upload", "Export", "Import", "Filter", "Search", "Add", "Edit", "Delete", "Save", "Cancel", "Submit", "Close", "Open", "New", "View", "Print", "PDF", "Excel", "CSV", "Date", "Time", "Status", "Type", "Category", "Name", "Code", "ID", "No", "Number", "Remarks", "Notes", "Description", "Address", "Contact", "Phone", "Email", "Mobile", "Location", "GPS", "Photo", "Image", "File", "Document", "Attachment"]):
                headers.append(line)
        # Detect form fields (lines with : often indicate labels)
        elif ":" in line and len(line) < 100:
            forms.append(line)
        # Detect buttons/actions
        elif any(w in line for w in ["Save", "Cancel", "Submit", "Approve", "Reject", "Download", "Upload", "Export", "Import", "Add New", "Delete", "Edit", "Close", "Open", "Filter", "Search", "Apply", "Reset", "Print", "Send", "Generate", "Create", "Update", "Confirm", "Yes", "No", "Back", "Next", "Previous", "OK"]):
            buttons.append(line)
    
    return {
        "raw_lines": lines,
        "headers": headers,
        "forms": forms,
        "buttons": buttons,
        "tables": tables
    }

def write_batch(batch_num, items, out_dir):
    lines = [f"# Improved OCR Batch {batch_num}", f"Generated: {datetime.now().isoformat()}", f"Files: {len(items)}", "---"]
    for it in items:
        lines.append(f"## {it['file']}")
        lines.append(f"- Size: {it['size_kb']} KB | {it['width']}x{it['height']}")
        lines.append(f"- MD5: {it['md5']}")
        if it.get("error"):
            lines.append(f"- **ERROR**: {it['error']}")
        else:
            structured = extract_structured(it["text"])
            lines.append("\n### Raw OCR Text")
            lines.append(f"```\n{it['text'][:5000]}\n```")
            lines.append("\n### Structured Extraction")
            if structured["headers"]:
                lines.append(f"\n**Headers/Nav ({len(structured['headers'])}):**")
                for h in structured["headers"][:30]:
                    lines.append(f"- {h}")
            if structured["forms"]:
                lines.append(f"\n**Form Fields ({len(structured['forms'])}):**")
                for f in structured["forms"][:30]:
                    lines.append(f"- {f}")
            if structured["buttons"]:
                lines.append(f"\n**Buttons/Actions ({len(structured['buttons'])}):**")
                for b in structured["buttons"][:30]:
                    lines.append(f"- {b}")
            if structured["tables"]:
                lines.append(f"\n**Table Rows ({len(structured['tables'])}):**")
                for t in structured["tables"][:20]:
                    lines.append(f"- {t}")
        lines.append("")
    out_path = out_dir / f"09-IMAGES-IMPROVED-OCR-BATCH-{batch_num:03d}.md"
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote batch {batch_num}: {out_path.name}")

def main():
    REPORT.mkdir(exist_ok=True)
    files = []
    for d in IMG_DIRS:
        for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp", "*.gif"]:
            files.extend(d.glob(ext))
    files = sorted(set(files))
    total = len(files)
    print(f"Total images: {total}")
    
    batch_size = 5
    start_batch = 1
    existing = list(REPORT.glob("09-IMAGES-IMPROVED-OCR-BATCH-*.md"))
    if existing:
        last = max(int(f.stem.split("-")[-1]) for f in existing)
        start_batch = last + 1
        print(f"Resuming from batch {start_batch}")
    
    for i in range((start_batch-1)*batch_size, total, batch_size):
        batch = files[i:i+batch_size]
        items = [ocr_image(p) for p in batch]
        write_batch((i // batch_size) + 1, items, REPORT)
        print(f"Progress: {min(i+batch_size, total)}/{total}")
    print("Improved OCR done")

if __name__ == "__main__":
    main()
