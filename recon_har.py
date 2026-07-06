#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import json

BASE = Path(r"C:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon")
REPORT = BASE / "recon-extraction-reports"
HAR_DIR = BASE / "Extra HAR + Image Recon" / "Har Files"

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
        endpoints = {}
        for entry in entries:
            req = entry.get("request", {})
            resp = entry.get("response", {})
            url = req.get("url", "")
            method = req.get("method", "")
            if base_url in url:
                path_part = url.split(base_url)[-1]
                key = f"{method} {path_part}"
                if key not in endpoints:
                    endpoints[key] = {
                        "method": method,
                        "path": path_part,
                        "statuses": [],
                        "mimes": [],
                        "count": 0,
                        "sample_resp_size": 0
                    }
                ep = endpoints[key]
                ep["count"] += 1
                status = resp.get("status")
                if status:
                    ep["statuses"].append(status)
                mime = resp.get("mimeType")
                if mime:
                    ep["mimes"].append(mime)
                content = resp.get("content", {})
                if content.get("text"):
                    ep["sample_resp_size"] = max(ep["sample_resp_size"], len(content["text"]))
        
        info["total_entries"] = len(entries)
        info["unique_endpoints"] = len(endpoints)
        info["endpoints"] = sorted(endpoints.values(), key=lambda x: x["path"])
    except Exception as e:
        info["error"] = str(e)
    return info

def main():
    REPORT.mkdir(exist_ok=True)
    hars = sorted(HAR_DIR.glob("*.har"))
    results = [analyze_har(h) for h in hars]
    out = REPORT / "07-HAR-API-MAP.md"
    lines = ["# HAR API Endpoint Map", f"Generated: {datetime.now().isoformat()}", f"Files: {len(results)}", "---"]
    for it in results:
        lines.append(f"## {it['path']}")
        lines.append(f"- Size: {it['size_mb']} MB")
        lines.append(f"- Total entries: {it.get('total_entries',0)}")
        lines.append(f"- Unique endpoints: {it.get('unique_endpoints',0)}")
        if it.get("error"):
            lines.append(f"- **ERROR**: {it['error']}")
        else:
            lines.append("\n### Endpoints")
            for ep in it.get("endpoints", []):
                statuses = sorted(set(ep["statuses"]))
                mimes = sorted(set(ep["mimes"]))
                lines.append(f"- `{ep['method']} {ep['path']}` count={ep['count']} statuses={statuses} mimes={mimes} max_resp={ep['sample_resp_size']}b")
        lines.append("")
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out.name}")

if __name__ == "__main__":
    main()
