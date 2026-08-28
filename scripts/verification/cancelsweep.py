import os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
pat = re.compile(r'func\.sum\(\s*(models\.)?Bill\.\w+')
hits = []
for root, _d, files in os.walk('app'):
    for fn in files:
        if not fn.endswith('.py'):
            continue
        p = os.path.join(root, fn)
        src = open(p, encoding='utf-8', errors='replace').read()
        lines = src.split('\n')
        for i, l in enumerate(lines):
            if pat.search(l):
                window = '\n'.join(lines[i:min(len(lines), i + 8)])
                has = 'ancelled' in window
                hits.append((p.replace(os.sep, '/'), i + 1, has, l.strip()[:58]))
w = sum(1 for h in hits if h[2]); wo = len(hits) - w
print(f"Bill-amount aggregations: {len(hits)} | WITH cancel-exclusion: {w} | WITHOUT: {wo}")
print()
print("--- WITHOUT a Cancelled exclusion within 8 lines ---")
for f, ln, has, txt in hits:
    if not has:
        print(f"  {f}:{ln}  {txt}")
