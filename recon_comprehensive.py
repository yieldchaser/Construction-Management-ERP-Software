#!/usr/bin/env python3
"""Comprehensive extraction: OCR images, full PDF text, HAR API parsing."""
from pathlib import Path
from datetime import datetime
import pytesseract
import hashlib
import json
from PIL import Image
import pdfplumber
import re

TESSERACT_CMD = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

BASE = Path(r"C:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon")
REPORT = BASE / "recon-extraction-reports"
IMG_DIRS = [
    BASE / "Extra HAR + Image Recon" / "All Images Documented",
    BASE / "Recon Pictures"
]
PDF_DIR = BASE / "Extra HAR + Image Recon" / "Main Site PDFs"
HAR_DIR = BASE / "Extra HAR + Image Recon" / "Har Files"

def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        h.update(f.read(65536))
    return h.hexdigest()

def ocr_image(path):
    info = {
        "file": str(path.relative_to(BASE)),
        "size_kb": round(path.stat().st_size/1024,2),
        "md5": md5(path),
        "text": "",
        "error": None
    }
    try:
        with Image.open(path) as img:
            info["width"] = img.width
            info["height"] = img.height
            info["format"] = img.format
            text = pytesseract.image_to_string(img)
            info["text"] = text.strip()
    except Exception as e:
        info["error"] = str(e)
    return info

def analyze_pdf_full(path):
    info = {
        "path": str(path.relative_to(BASE)),
        "size_kb": round(path.stat().st_size/1024,2),
        "pages": 0,
        "full_text": "",
        "error": None
    }
    try:
        with pdfplumber.open(path) as pdf:
            info["pages"] = len(pdf.pages)
            all_text = []
            for i, page in enumerate(pdf.pages):
                t = page.extract_text()
                if t:
                    all_text.append(t)
            info["full_text"] = "\n\n".join(all_text)
    except Exception as e:
        info["error"] = str(e)
    return info

def analyze_har(path):
    info = {
        "path": str(path.relative_to(BASE)),
        "size_mb": round(path.stat().st_size/1024/1024,2),
        "error": None
    }
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
        data = json.loads(text)
        entries = data.get("log", {}).get("entries", [])
        base_url = "https://web.onsiteteams.com"
        endpoints = []
        for entry in entries:
            req = entry.get("request", {})
            resp = entry.get("response", {})
            url = req.get("url", "")
            method = req.get("method", "")
            if base_url in url:
                path_part = url.split(base_url)[-1]
                endpoints.append({
                    "method": method,
                    "path": path_part,
                    "status": resp.get("status"),
                    "mime": resp.get("mimeType"),
                    "size": len(resp.get("content", {}).get("text", "")) if resp.get("content") else 0
                })
        unique = {}
        for ep in endpoints:
            key = (ep["method"], ep["path"])
            if key not in unique:
                unique[key] = ep
        info["total_entries"] = len(entries)
        info["unique_endpoints"] = len(unique)
        info["endpoints"] = sorted(unique.values(), key=lambda x: x["path"])
    except Exception as e:
        info["error"] = str(e)
    return info

def write_report(filename, title, items, kind):
    out = REPORT / filename
    lines = [f"# {title}", f"Generated: {datetime.now().isoformat()}", f"Total items: {len(items)}", "---"]
    for it in items:
        lines.append(f"## {it['file' if 'file' in it else 'path']}")
        if kind == "image":
            lines.append(f"- Size: {it['size_kb']} KB")
            lines.append(f"- Dimensions: {it.get('width')}x{it.get('height')}")
            if it.get("error"):
                lines.append(f"- **ERROR**: {it['error']}")
            elif it.get("text"):
                lines.append(f"\n### OCR Text\n```\n{it['text'][:3000]}\n```")
            else:
                lines.append("- No text detected")
        elif kind == "pdf":
            lines.append(f"- Size: {it['size_kb']} KB, Pages: {it['pages']}")
            if it.get("error"):
                lines.append(f"- **ERROR**: {it['error']}")
            else:
                lines.append(f"\n### Full Text\n```\n{it['full_text'][:4000]}\n```")
        elif kind == "har":
            lines.append(f"- Size: {it['size_mb']} MB, Entries: {it.get('total_entries',0)}, Unique endpoints: {it.get('unique_endpoints',0)}")
            if it.get("error"):
                lines.append(f"- **ERROR**: {it['error']}")
            else:
                lines.append("\n### Endpoints")
                for ep in it.get("endpoints", []):
                    lines.append(f"- `{ep['method']} {ep['path']}` status={ep['status']} mime={ep['mime']}")
        lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out.name}")

def main():
    REPORT.mkdir(exist_ok=True)
    
    # OCR Images
    img_files = []
    for d in IMG_DIRS:
        for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp", "*.gif"]:
            img_files.extend(d.glob(ext))
    img_files = sorted(set(img_files))
    print(f"Total images for OCR: {len(img_files)}")
    ocr_results = []
    for i, p in enumerate(img_files):
        print(f"OCR {i+1}/{len(img_files)}: {p.name}")
        ocr_results.append(ocr_image(p))
    write_report("05-IMAGES-OCR.md", "Image OCR Extraction", ocr_results, "image")
    
    # Full PDF text
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    print(f"Total PDFs: {len(pdfs)}")
    pdf_results = [analyze_pdf_full(p) for p in pdfs]
    write_report("06-PDF-FULLTEXT.md", "PDF Full Text Extraction", pdf_results, "pdf")
    
    # HAR APIs
    hars = sorted(HAR_DIR.glob("*.har"))
    har_results = [analyze_har(h) for h in hars]
    write_report("07-HAR-API-MAP.md", "HAR API Endpoint Map", har_results, "har")

if __name__ == "__main__":
    main()
