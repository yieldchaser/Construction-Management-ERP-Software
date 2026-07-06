#!/usr/bin/env python3
"""Full-text extraction from all 44 PDFs for business-logic recon."""
from pathlib import Path
from datetime import datetime
import pdfplumber

BASE = Path(r"C:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon")
REPORT = BASE / "recon-extraction-reports"
PDF_DIR = BASE / "Extra HAR + Image Recon" / "Main Site PDFs"

def analyze_pdf_full(path):
    info = {
        "path": str(path.relative_to(BASE)),
        "size_kb": round(path.stat().st_size/1024,2),
        "type": "pdf",
        "pages": 0,
        "full_text": "",
        "text_preview_pages": [],
        "tables_all": [],
        "error": None
    }
    try:
        with pdfplumber.open(path) as pdf:
            info["pages"] = len(pdf.pages)
            all_text = []
            for i, page in enumerate(pdf.pages):
                t = page.extract_text()
                if t:
                    all_text.append(f"--- Page {i+1} ---\n{t}")
                tbl = page.extract_tables()
                if tbl:
                    for ti, table in enumerate(tbl):
                        info["tables_all"].append({
                            "page": i+1,
                            "table_index": ti+1,
                            "rows": len(table),
                            "cols": len(table[0]) if table else 0,
                            "sample": table[:6]
                        })
            info["full_text"] = "\n\n".join(all_text)
            info["text_preview_pages"] = [f"Page {i+1}: {all_text[i][:1500]}" for i in range(min(6, len(all_text)))]
    except Exception as e:
        info["error"] = str(e)
    return info

def main():
    REPORT.mkdir(exist_ok=True)
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    print(f"Total PDFs: {len(pdfs)}")
    for pdf_path in pdfs:
        print(f"Processing: {pdf_path.name}")
        data = analyze_pdf_full(pdf_path)
        safe_name = pdf_path.stem.replace(" ", "_").replace("'", "").replace("#", "")[:60]
        out = REPORT / f"03b-PDF-FULL-{safe_name}.md"
        lines = [
            f"# {data['path']}",
            f"Generated: {datetime.now().isoformat()}",
            f"- Size: {data['size_kb']} KB",
            f"- Pages: {data['pages']}",
        ]
        if data["error"]:
            lines.append(f"- **ERROR**: {data['error']}")
        else:
            lines.append("\n## Text Previews (first 6 pages)")
            for s in data["text_preview_pages"]:
                lines.append(f"\n{s[:2000]}")
            lines.append("\n## Tables Extracted")
            for t in data["tables_all"]:
                lines.append(f"\nTable on page {t['page']} ({t['rows']}x{t['cols']}):")
                for row in t.get("sample", [])[:6]:
                    lines.append(f"  {row}")
            lines.append("\n## FULL TEXT")
            lines.append(data["full_text"][:20000])
            if len(data["full_text"]) > 20000:
                lines.append(f"\n... [truncated, total chars: {len(data['full_text'])}]")
        out.write_text("\n".join(lines), encoding="utf-8")
        print(f"  -> {out.name}")
    print("Done")

if __name__ == "__main__":
    main()
