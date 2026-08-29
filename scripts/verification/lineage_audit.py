import re, subprocess, io, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')
REPO = r"C:/Users/Dell/Github/Construction-Management-ERP-Software/.claude/worktrees/siteflow-audit-continuation-945943"
def git(*a):
    return subprocess.run(["git","-C",REPO,*a],capture_output=True,text=True,
                          encoding="utf-8",errors="replace").stdout

waves = {l.strip() for l in git("rev-list","campaign/waves").splitlines() if l.strip()}
short = {}
for full in waves:
    short[full[:7]] = full          # prefix index for 7-char citations

rows = []
for line in io.open("register.md", encoding="utf-8"):
    if not line.startswith("| R2-"): continue
    c = [x.strip() for x in line.strip().strip("|").split("|")]
    if len(c) < 7 or c[5] not in ("FIXED", "FIX_VERIFIED"): continue
    cands = re.findall(r"\b([0-9a-f]{7,40})\b", " ".join(c[6:]))
    if not cands:
        rows.append((c[0], c[1], c[5], "no-sha")); continue
    hit = any((x in waves) or (x[:7] in short) for x in cands)
    rows.append((c[0], c[1], c[5], "waves" if hit else "NOT-ON-WAVES"))

print("closed rows:", len(rows), dict(Counter(r[3] for r in rows)))
bad = [r for r in rows if r[3] == "NOT-ON-WAVES"]
print("\nNOT-ON-WAVES by severity:", dict(Counter(r[1] for r in bad)))
print("NOT-ON-WAVES by status  :", dict(Counter(r[2] for r in bad)))
io.open("orphan_rows.txt","w",encoding="utf-8").write("\n".join(f"{r[0]} {r[1]} {r[2]}" for r in bad))
print("\nfirst 15:", ", ".join(r[0] for r in bad[:15]))
