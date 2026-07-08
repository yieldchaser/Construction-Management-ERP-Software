#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import pytesseract
import hashlib
from PIL import Image

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

def ocr_image(path):
    info = {
        "file": str(path.relative_to(BASE)),
        "size_kb": round(path.stat().st_size/1024,2),
        "md5": md5(path),
        "width": 0,
        "height": 0,
        "format": "",
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

def write_batch(batch_num, items, out_dir):
    lines = [f"# Image OCR Batch {batch_num}", f"Generated: {datetime.now().isoformat()}", f"Files: {len(items)}", "---"]
    for it in items:
        lines.append(f"## {it['file']}")
        lines.append(f"- Size: {it['size_kb']} KB | {it['width']}x{it['height']} | {it['format']}")
        lines.append(f"- MD5: {it['md5']}")
        if it.get("error"):
            lines.append(f"- **ERROR**: {it['error']}")
        elif it.get("text"):
            lines.append(f"\n### OCR Text\n```\n{it['text'][:4000]}\n```")
        else:
            lines.append("- No text detected")
        lines.append("")
    out_path = out_dir / f"05-IMAGES-OCR-BATCH-{batch_num:03d}.md"
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
    # Resume from last completed batch if any exist
    existing = list(REPORT.glob("05-IMAGES-OCR-BATCH-*.md"))
    if existing:
        last = max(int(f.stem.split("-")[-1]) for f in existing)
        start_batch = last + 1
        print(f"Resuming from batch {start_batch}")
    
    for i in range((start_batch-1)*batch_size, total, batch_size):
        batch = files[i:i+batch_size]
        items = [ocr_image(p) for p in batch]
        write_batch((i // batch_size) + 1, items, REPORT)
        print(f"Progress: {min(i+batch_size, total)}/{total}")
    print("OCR done")

if __name__ == "__main__":
    main()
