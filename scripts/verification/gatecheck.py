"""Tier 1 - gate integrity for the 176 source-string regression pins.

A pin test asserts that some substring is present in a source file. That gate is only real if
the substring was ABSENT from that file before the fix landed. If it was already there, the pin
passes against the unfixed tree and gates nothing -> FAKE_GATE.

Method, per pin test:
  1. parse the test body for (relative source path, asserted substring) pairs
  2. find the fix commit for that R2 id from campaign/waves commit subjects
  3. read the file at that commit's FIRST PARENT (the unfixed tree)
  4. evaluate the same assertion against the pre-fix text

Verdicts emitted here:
  REAL_GATE      - at least one asserted substring was absent pre-fix (the pin would have failed)
  FAKE_GATE      - every asserted substring was already present pre-fix
  NO_COMMIT      - no fix commit found for the id; cannot establish a pre-fix tree
  PARSE_FAIL     - the assertion is not a simple substring/count form
Self-test with --selftest: injects a known-real and a known-fake assertion.
"""
import os
import re
import subprocess
import sys
import json

S = os.path.dirname(os.path.abspath(__file__))
REPO = r"C:/Users/Dell/Github/Construction-Management-ERP-Software/.claude/worktrees/siteflow-audit-continuation-945943"
PINS = os.path.join(S, "waves", "backend", "tests", "coverage", "test_regression_pins.py")
OUT = os.path.join(S, "gatecheck.json")

BACKEND_PREFIX = "backend/"
FRONTEND_PREFIX = "frontend/"


def git(*args):
    r = subprocess.run(["git", "-C", REPO, *args], capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return r.returncode, r.stdout, r.stderr


# ---------------------------------------------------------------- commit index
def commit_index():
    _, out, _ = git("log", "campaign/waves", "--format=%H%x09%s")
    idx = {}
    for line in out.splitlines():
        sha, _, subj = line.partition("\t")
        for m in re.finditer(r"R2[-_ ]?(\d{3})", subj, re.I):
            idx.setdefault("R2-" + m.group(1), []).append(sha)
    # newest first from git log; keep the OLDEST (the original fix) last
    return idx


FILE_CACHE = {}


def file_at(sha, rel):
    key = (sha, rel)
    if key in FILE_CACHE:
        return FILE_CACHE[key]
    code, out, _ = git("show", f"{sha}:{rel}")
    val = out if code == 0 else None
    FILE_CACHE[key] = val
    return val


# ---------------------------------------------------------------- pin parsing
VAR_READ = re.compile(r"(\w+)\s*=\s*_read(_frontend)?\(\s*([\"'])(.+?)\3\s*\)")
BARE_READ = re.compile(r"_read(_frontend)?\(\s*([\"'])(.+?)\2\s*\)")
# assert "lit" in var   /   assert "lit" not in var
ASSERT_IN = re.compile(
    r"assert\s+([\"'])(.*?)(?<!\\)\1\s+(not\s+)?in\s+(\w+)")
# assert var.count("lit") >= N
ASSERT_COUNT = re.compile(
    r"assert\s+(\w+)\.count\(\s*([\"'])(.*?)(?<!\\)\2\s*\)\s*(>=|==|>)\s*(\d+)")


FOR_ALIAS = re.compile(r"for\s+(\w+)\s+in\s*\(")


def parse_pins(src):
    """Position-aware. A variable can be rebound inside one test body (and can be a for-loop
    alias over several already-read variables); an assertion must resolve against the binding
    that is in effect AT ITS OWN OFFSET, not the last one in the file. Getting this wrong
    silently attributes an assertion to the wrong source file."""
    blocks = re.split(r"\ndef (test_[A-Za-z0-9_]+)\(", src)
    pins = []
    for name, body in zip(blocks[1::2], blocks[2::2]):
        m = re.search(r"R2[-_ ]?(\d{3})", name)
        rid = "R2-" + m.group(1) if m else None

        # every binding, with the offset at which it takes effect
        binds = []  # (offset, var, path)
        for vm in VAR_READ.finditer(body):
            path = (FRONTEND_PREFIX if vm.group(2) else BACKEND_PREFIX) + vm.group(4)
            binds.append((vm.end(), vm.group(1), path))

        # a `for src in (d, p):` alias makes `src` ambiguous from that point on - refuse it
        ambiguous = set()
        for fm in FOR_ALIAS.finditer(body):
            ambiguous.add((fm.end(), fm.group(1)))

        def resolve(pos, var):
            # last event affecting `var` before pos wins - a later explicit rebinding
            # clears an earlier for-loop alias, and vice versa
            events = [(off, path) for off, v, path in binds if v == var and off <= pos]
            events += [(off, None) for off, v in ambiguous if v == var and off <= pos]
            if not events:
                return None
            return max(events, key=lambda e: e[0])[1]

        checks = []
        ok = True
        for am in ASSERT_IN.finditer(body):
            lit, neg, var = am.group(2), bool(am.group(3)), am.group(4)
            path = resolve(am.start(), var)
            if path is None:
                ok = False
                continue
            checks.append({"kind": "in", "neg": neg, "lit": lit, "file": path})
        for cm in ASSERT_COUNT.finditer(body):
            var, lit, op, n = cm.group(1), cm.group(3), cm.group(4), int(cm.group(5))
            path = resolve(cm.start(), var)
            if path is None:
                ok = False
                continue
            checks.append({"kind": "count", "lit": lit, "op": op, "n": n, "file": path})
        pins.append({"name": name, "id": rid, "checks": checks,
                     "parsed_all": ok and bool(checks),
                     "n_asserts": len(re.findall(r"\n\s*assert ", body))})
    return pins


def eval_check(chk, text):
    """True == the assertion HOLDS against this text."""
    if chk["kind"] == "in":
        present = chk["lit"] in text
        return (not present) if chk["neg"] else present
    c = text.count(chk["lit"])
    op, n = chk["op"], chk["n"]
    return c >= n if op == ">=" else (c == n if op == "==" else c > n)


def main():
    src = open(PINS, encoding="utf-8").read()
    pins = parse_pins(src)
    idx = commit_index()

    # shas named in the register's own COMMIT / notes cells, oldest-last to match idx
    reg_shas = {}
    with open(os.path.join(S, "register.md"), encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if not line.startswith("| R2-"):
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) < 7:
                continue
            found = re.findall(r"\b([0-9a-f]{7,40})\b", " ".join(cells[6:]))
            real = []
            for sh in found:
                code, out, _ = git("rev-parse", "--verify", "--quiet", sh + "^{commit}")
                if code == 0:
                    real.append(out.strip())
            if real:
                reg_shas[cells[0]] = list(reversed(real))
    results = []
    for p in pins:
        rec = {"name": p["name"], "id": p["id"], "n_checks": len(p["checks"]),
               "n_asserts": p["n_asserts"], "complete": p["parsed_all"],
               "checks": p["checks"]}
        if not p["checks"]:
            rec["verdict"] = "PARSE_FAIL"
            rec["why"] = "no simple substring assertion recognised"
            results.append(rec)
            continue
        shas = idx.get(p["id"] or "", [])
        if not shas:
            # the commit subject does not always name the id - the register's own commit
            # column carries shas for fixes that were bundled into another wave's commit
            shas = reg_shas.get(p["id"], [])
            if shas:
                rec["sha_source"] = "register"
        if not shas:
            rec["verdict"] = "NO_COMMIT"
            rec["why"] = "no campaign/waves commit subject names this id"
            results.append(rec)
            continue
        fix = shas[-1]              # oldest commit naming the id = the original fix
        pre = fix + "^"
        rec["fix"] = fix[:7]
        held_prefix = []
        missing_file = False
        for chk in p["checks"]:
            text = file_at(pre, chk["file"])
            if text is None:
                missing_file = True
                held_prefix.append(None)
                continue
            held_prefix.append(eval_check(chk, text))
        rec["pre_results"] = held_prefix
        known = [h for h in held_prefix if h is not None]
        if not known:
            rec["verdict"] = "NO_COMMIT"
            rec["why"] = "file did not exist in the pre-fix tree"
        elif all(known):
            # only a claim about the assertions we could attribute to a file. If some
            # assertion in the body was not parseable, an unparsed one might still gate.
            rec["verdict"] = "FAKE_GATE" if p["parsed_all"] else "FAKE_GATE_PARTIAL"
            rec["why"] = "every asserted string was already present before the fix"
        else:
            rec["verdict"] = "REAL_GATE"
            rec["why"] = "at least one asserted string was absent before the fix"
        if missing_file:
            rec["why"] += " (some referenced file absent pre-fix)"
        results.append(rec)

    json.dump(results, open(OUT, "w", encoding="utf-8"), indent=1)
    from collections import Counter
    print(Counter(r["verdict"] for r in results))
    print("wrote", OUT)


def selftest():
    """Known-positive / known-negative on the parser and evaluator."""
    body_real = '''
def test_pin_R2_999_x():
    src = _read("app/routers/finance.py")
    assert "zzz_never_appears_anywhere_zzz" in src, "x"
'''
    body_fake = '''
def test_pin_R2_998_y():
    src = _read("app/routers/finance.py")
    assert "def " in src, "y"
'''
    pins = parse_pins(body_real + body_fake)
    assert len(pins) == 2, pins
    assert pins[0]["checks"][0]["file"] == "backend/app/routers/finance.py", pins[0]
    text = "def foo():\n    pass\n"
    assert eval_check(pins[0]["checks"][0], text) is False, "known-absent must evaluate False"
    assert eval_check(pins[1]["checks"][0], text) is True, "known-present must evaluate True"
    # count form
    pins2 = parse_pins('\ndef test_pin_R2_997_z():\n    src = _read("a.py")\n    assert src.count("x") >= 2, "z"\n')
    assert eval_check(pins2[0]["checks"][0], "xx") is True
    assert eval_check(pins2[0]["checks"][0], "x") is False
    # frontend prefix
    pins3 = parse_pins('\ndef test_pin_R2_996_f():\n    src = _read_frontend("src/a.tsx")\n    assert "q" in src, "f"\n')
    assert pins3[0]["checks"][0]["file"] == "frontend/src/a.tsx", pins3[0]
    # rebinding: the same name bound twice, assertions must follow position
    pins4 = parse_pins(
        '\ndef test_pin_R2_995_r():\n'
        '    src = _read_frontend("src/a.tsx")\n'
        '    assert "AAA" in src, "r"\n'
        '    src = _read("app/b.py")\n'
        '    assert "BBB" in src, "r"\n')
    files = [c["file"] for c in pins4[0]["checks"]]
    assert files == ["frontend/src/a.tsx", "backend/app/b.py"], files
    # for-loop alias: `src` ranges over two files, so no single attribution is honest
    pins5 = parse_pins(
        '\ndef test_pin_R2_994_l():\n'
        '    d = _read_frontend("src/d.tsx")\n'
        '    p = _read_frontend("src/p.tsx")\n'
        '    for src in (d, p):\n'
        '        assert "CCC" not in src, "l"\n'
        '    src = _read("app/m.py")\n'
        '    assert "DDD" in src, "l"\n')
    assert pins5[0]["parsed_all"] is False, "aliased assertion must mark the pin incomplete"
    assert [c["file"] for c in pins5[0]["checks"]] == ["backend/app/m.py"], pins5[0]["checks"]
    assert pins5[0]["n_asserts"] == 2, pins5[0]["n_asserts"]
    print("SELFTEST OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        selftest()
        main()
