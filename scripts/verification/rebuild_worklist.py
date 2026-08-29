import json, re, subprocess, io, sys
sys.stdout.reconfigure(encoding='utf-8')
REPO = r"C:/Users/Dell/Github/Construction-Management-ERP-Software/.claude/worktrees/siteflow-audit-continuation-945943"

def git(*a):
    r = subprocess.run(["git", "-C", REPO, *a], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return r.returncode, r.stdout

# commit-subject index
idx = {}
for l in git("log", "campaign/waves", "--format=%H%x09%s")[1].splitlines():
    sha, _, subj = l.partition("\t")
    for m in re.finditer(r"R2-(\d{3})", subj):
        idx.setdefault("R2-" + m.group(1), []).append(sha)

TOUCH = {}
def src_files(sha):
    if sha in TOUCH: return TOUCH[sha]
    out = git("show", "--name-only", "--format=", sha)[1]
    fs = [f for f in out.splitlines() if f.strip()
          and not f.startswith("audit/") and not f.startswith("docs/")]
    TOUCH[sha] = fs
    return fs

rows = []
for line in io.open("register.md", encoding="utf-8"):
    if not line.startswith("| R2-"): continue
    c = [x.strip() for x in line.strip().strip("|").split("|")]
    if len(c) < 7 or c[5] not in ("FIXED", "FIX_VERIFIED"): continue
    rid = c[0]
    shas = [s for s in idx.get(rid, []) if src_files(s)]
    if not shas:                       # fall back to shas named in the register's own cells
        for cand in re.findall(r"\b([0-9a-f]{7,40})\b", " ".join(c[6:])):
            code, out = git("rev-parse", "--verify", "--quiet", cand + "^{commit}")
            if code == 0 and src_files(out.strip()):
                shas = [out.strip()]
                break
    sha = shas[-1] if shas else None
    rows.append({"id": rid, "sev": c[1], "file": c[3], "sha": sha[:7] if sha else None,
                 "files": len(src_files(sha)) if sha else None})

json.dump(rows, io.open("worklist.json", "w", encoding="utf-8"), indent=1)
have = [r for r in rows if r["sha"]]
print(f"closed rows: {len(rows)} | with a source commit: {len(have)} | without: {len(rows)-len(have)}")
