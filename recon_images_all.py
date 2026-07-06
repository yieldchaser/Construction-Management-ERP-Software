#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
from PIL import Image
import hashlib

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

def analyze_image(path):
    info = {
        "file": str(path.relative_to(BASE)),
        "size_kb": round(path.stat().st_size/1024, 2),
        "md5": md5(path),
        "error": None
    }
    try:
        with Image.open(path) as img:
            info["format"] = img.format
            info["mode"] = img.mode
            info["width"] = img.width
            info["height"] = img.height
            info["aspect"] = round(img.width / img.height, 3) if img.height else None
            info["dpi"] = img.info.get("dpi")
            try:
                thumb = img.convert("RGB").resize((64, 64))
                pixels = list(thumb.getdata())
                r = sum(p[0] for p in pixels) // len(pixels)
                g = sum(p[1] for p in pixels) // len(pixels)
                b = sum(p[2] for p in pixels) // len(pixels)
                info["avg_rgb"] = f"#{r:02X}{g:02X}{b:02X}"
            except Exception:
                info["avg_rgb"] = None
    except Exception as e:
        info["error"] = str(e)
    return info

def write_batch(batch_num, items, out_dir):
    lines = [
        f"# Image Batch {batch_num}",
        f"Generated: {datetime.now().isoformat()}",
        f"Files in batch: {len(items)}",
        "---"
    ]
    for it in items:
        lines.append(f"## {it['file']}")
        lines.append(f"- Size: {it['size_kb']} KB")
        lines.append(f"- MD5: {it['md5']}")
        if it.get("error"):
            lines.append(f"- **ERROR**: {it['error']}")
        else:
            lines.append(f"- Format: {it.get('format')}")
            lines.append(f"- Mode: {it.get('mode')}")
            lines.append(f"- Dimensions: {it.get('width')}x{it.get('height')}")
            lines.append(f"- Aspect: {it.get('aspect')}")
            lines.append(f"- DPI: {it.get('dpi')}")
            lines.append(f"- Avg RGB: {it.get('avg_rgb')}")
        lines.append("")
    out_path = out_dir / f"04-IMAGES-BATCH-{batch_num:03d}.md"
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote batch {batch_num}: {out_path.name}")

def main():
    REPORT.mkdir(exist_ok=True)
    files = []
    for d in IMG_DIRS:
        for ext in ["*.png", "*.jpg", "*.jpeg", "*.webp", "*.gif", "*.bmp"]:
            files.extend(d.glob(ext))
    files = sorted(set(files))
    print(f"Total images: {len(files)}")
    batch_size = 5
    for i in range(0, len(files), batch_size):
        batch = files[i:i+batch_size]
        items = [analyze_image(p) for p in batch]
        write_batch((i // batch_size) + 1, items, REPORT)

if __name__ == "__main__":
    main()
