filepath = r"c:\Users\Dell\Github\Construction-Management-ERP-Software\frontend\src\app\c\[company_id]\dashboard\page.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    code = f.read()

# Replace childish font-mono on numbers in dashboard with clean sans-serif/bold layout
code = code.replace('className="font-bold text-white font-mono text-sm"', 'className="font-bold text-white font-sans text-sm"')
code = code.replace('className="font-bold font-mono" style={{color:s.color}}', 'className="font-bold font-sans" style={{color:s.color}}')
code = code.replace('className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold font-mono"',
                    'className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold font-sans"')
code = code.replace('className="font-mono text-[10px] text-muted"', 'className="font-sans text-[10px] text-muted"')
code = code.replace('className="font-bold text-white font-mono ml-4"', 'className="font-bold text-white font-sans ml-4"')

# Table cell number replacements
code = code.replace('className="px-5 py-3.5 text-right font-mono text-zinc-300"', 'className="px-5 py-3.5 text-right font-semibold text-zinc-300"')
code = code.replace('className="px-5 py-3.5 text-right font-mono text-red-400"', 'className="px-5 py-3.5 text-right font-semibold text-red-400"')
code = code.replace('className="px-5 py-3.5 text-right font-mono text-emerald-400 font-bold"', 'className="px-5 py-3.5 text-right font-bold text-emerald-400"')
code = code.replace('className="px-5 py-3.5 text-right font-mono text-white font-extrabold"', 'className="px-5 py-3.5 text-right font-extrabold text-white"')

with open(filepath, "w", encoding="utf-8") as f:
    f.write(code)

print("Childish font-mono on dashboard numbers successfully cleaned!")
