#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
from pypdf import PdfReader

BASE = Path(r"C:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon")
REPORT = BASE / "recon-extraction-reports"
PDF_DIR = BASE / "Extra HAR + Image Recon" / "Main Site PDFs"

def analyze_pdf_fast(path):
    info = {
        "path": str(path.relative_to(BASE)),
        "size_kb": round(path.stat().st_size/1024,2),
        "pages": 0,
        "full_text": "",
        "error": None
    }
    try:
        reader = PdfReader(str(path))
        info["pages"] = len(reader.pages)
        texts = []
        for i, page in enumerate(reader.pages):
            t = page.extract_text()
            if t:
                texts.append(f"--- Page {i+1} ---\n{t}")
        info["full_text"] = "\n\n".join(texts)
    except Exception as e:
        info["error"] = str(e)
    return info

def main():
    REPORT.mkdir(exist_ok=True)
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    print(f"Total PDFs: {len(pdfs)}")
    for pdf_path in pdfs:
        print(f"Processing: {pdf_path.name}")
        data = analyze_pdf_fast(pdf_path)
        safe_name = pdf_path.stem.replace(" ", "_").replace("'", "").replace("#", "")[:60]
        out = REPORT / f"06-PDF-FULLTEXT-{safe_name}.md"
        lines = [
            f"# {data['path']}",
            f"Generated: {datetime.now().isoformat()}",
            f"- Size: {data['size_kb']} KB",
            f"- Pages: {data['pages']}",
        ]
        if data["error"]:
            lines.append(f"- **ERROR**: {data['error']}")
        else:
            lines.append("\n## FULL TEXT")
            lines.append(data["full_text"][:30000])
            if len(data["full_text"]) > 30000:
                lines.append(f"\n... [truncated, total chars: {len(data['full_text'])}]")
        out.write_text("\n".join(lines), encoding="utf-8")
        print(f"  -> {out.name} ({out.stat().st_size} bytes)")
    print("Done")

if __name__ == "__main__":
    main()
