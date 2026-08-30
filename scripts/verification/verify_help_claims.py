#!/usr/bin/env python3
"""
Validator for frontend/src/app/c/[company_id]/d/help/helpContent.tsx

Enforces:
1. Every FAQ entry has a non-empty `sources` array.
2. Every endpoint citation/claim in `sources` and `a` matches a real backend route in backend/app/routers/*.py.
3. Every file:LINE citation in `sources` points to an existing file and line, and the file contains the referenced text/element.
4. Route scanner verifies ~473 real routes.
"""

import os
import re
import sys
import glob

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
HELP_FILE = os.path.join(REPO_ROOT, "frontend/src/app/c/[company_id]/d/help/helpContent.tsx")
ROUTERS_DIR = os.path.join(REPO_ROOT, "backend/app/routers")

def scan_real_routes(routers_dir=ROUTERS_DIR):
    """Scan all route decorators across backend routers and return list of dicts."""
    routes = []
    py_files = sorted(glob.glob(os.path.join(routers_dir, "*.py")))
    
    for fpath in py_files:
        if os.path.basename(fpath) == "__init__.py":
            continue
            
        with open(fpath, "r", encoding="utf-8") as f:
            file_content = f.read()
            
        router_vars = {}
        for m in re.finditer(r'([a-zA-Z0-9_]+)\s*=\s*APIRouter\s*\((.*?)\)', file_content, re.DOTALL):
            var_name = m.group(1)
            args_str = m.group(2)
            prefix_match = re.search(r'prefix\s*=\s*[\'"]([^\'"]*)[\'"]', args_str)
            prefix = prefix_match.group(1) if prefix_match else ""
            router_vars[var_name] = prefix
            
        if "router" not in router_vars:
            router_vars["router"] = ""
            
        extra_main_prefix = ""
        if os.path.basename(fpath) == "delete_logs.py":
            extra_main_prefix = "/delete-logs"
            
        for var_name, r_prefix in router_vars.items():
            pattern = rf'@{var_name}\.(get|post|put|delete|patch|api_route)\s*\(\s*[\'"]([^\'"]*)[\'"]'
            for match in re.finditer(pattern, file_content, re.IGNORECASE):
                method = match.group(1).upper()
                subpath = match.group(2)
                
                combined_prefix = "/apis/v3" + extra_main_prefix + r_prefix
                
                if subpath == "" or subpath == "/":
                    full_path = combined_prefix if not combined_prefix.endswith("/") else combined_prefix.rstrip("/")
                    if not full_path:
                        full_path = "/"
                else:
                    if not subpath.startswith("/"):
                        subpath = "/" + subpath
                    full_path = combined_prefix + subpath
                    
                if full_path != "/" and full_path.endswith("/"):
                    full_path = full_path.rstrip("/")
                    
                line_no = file_content[:match.start()].count("\n") + 1
                routes.append({
                    "method": method,
                    "path": full_path,
                    "file": os.path.relpath(fpath, REPO_ROOT).replace("\\", "/"),
                    "line": line_no
                })
                
    return routes

def route_matches(claim_method, claim_path, real_routes):
    """Check if claim_method and claim_path match any real route, treating {params} as wildcards."""
    claim_path_norm = claim_path.rstrip("/") if claim_path != "/" else "/"
    claim_pattern_str = "^" + re.sub(r'\{[a-zA-Z0-9_]+\}', r'[^/]+', claim_path_norm) + "$"
    claim_re = re.compile(claim_pattern_str, re.IGNORECASE)
    
    for r in real_routes:
        if claim_method.upper() != r["method"].upper() and r["method"] != "API_ROUTE":
            continue
        real_path_norm = r["path"].rstrip("/") if r["path"] != "/" else "/"
        real_pattern_str = "^" + re.sub(r'\{[a-zA-Z0-9_]+\}', r'[^/]+', real_path_norm) + "$"
        real_re = re.compile(real_pattern_str, re.IGNORECASE)
        
        if claim_re.match(real_path_norm) or real_re.match(claim_path_norm):
            return True, r
    return False, None

def parse_help_content(help_file_path):
    """Parse helpContent.tsx and extract FAQ entries."""
    if not os.path.exists(help_file_path):
        return []
        
    with open(help_file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    entries = []
    q_matches = list(re.finditer(r'\{\s*q:\s*["\']([^"\']+)["\']', content))
    
    for idx, q_match in enumerate(q_matches):
        q = q_match.group(1)
        start_pos = q_match.start()
        end_pos = q_matches[idx + 1].start() if idx + 1 < len(q_matches) else len(content)
        block = content[start_pos:end_pos]
        
        sources = []
        # Robustly extract sources array handling nested brackets in file paths like [company_id]
        src_start = block.find("sources:")
        if src_start != -1:
            open_sq = block.find("[", src_start)
            if open_sq != -1:
                depth = 0
                close_sq = -1
                for ci in range(open_sq, len(block)):
                    if block[ci] == "[":
                        depth += 1
                    elif block[ci] == "]":
                        depth -= 1
                        if depth == 0:
                            close_sq = ci
                            break
                if close_sq != -1:
                    raw_sources = block[open_sq + 1:close_sq]
                    for s in re.finditer(r'["\']([^"\']+)["\']', raw_sources):
                        sources.append(s.group(1).strip())
                
        code_endpoints = []
        for c_match in re.finditer(r'<code>\s*(GET|POST|PUT|DELETE|PATCH)\s+([^\s<]+)\s*</code>', block, re.IGNORECASE):
            code_endpoints.append((c_match.group(1).upper(), c_match.group(2).strip()))
            
        a_match = re.search(r'a:\s*\((.*?)\),\s*text:', block, re.DOTALL)
        a_body = a_match.group(1) if a_match else ""
        
        # Extract quoted UI labels from JSX text
        a_clean = re.sub(r'<code[^>]*>.*?</code>', '', a_body, flags=re.DOTALL)
        a_clean = re.sub(r'<[^>]+>', '', a_clean)
        raw_quoted = re.findall(r'"([^"\n]+)"', a_clean)
        quoted_labels = [q_str.strip() for q_str in raw_quoted if q_str.strip() and len(q_str.strip()) > 1]
            
        entries.append({
            "q": q,
            "block": block,
            "sources": sources,
            "code_endpoints": code_endpoints,
            "labels": quoted_labels
        })
        
    return entries

def validate_entries(entries, real_routes):
    violations = []
    
    for i, entry in enumerate(entries, 1):
        q = entry["q"]
        sources = entry["sources"]
        labels = entry.get("labels", [])
        
        # 1. Assert sources is non-empty
        if not sources:
            violations.append(f"Entry {i} ('{q}'): 'sources' field is missing or empty.")
            continue
            
        file_sources = []
        # 2. Validate all sources
        for s in sources:
            # Endpoint citation: "METHOD /apis/v3/..."
            ep_match = re.match(r'^(GET|POST|PUT|DELETE|PATCH)\s+(\S+)$', s, re.IGNORECASE)
            if ep_match:
                method, path = ep_match.group(1).upper(), ep_match.group(2)
                matched, r_info = route_matches(method, path, real_routes)
                if not matched:
                    violations.append(f"Entry {i} ('{q}'): cited endpoint '{s}' does not exist in backend routes.")
            else:
                # File:line citation: "path/to/file:LINE"
                file_line_match = re.match(r'^([^:]+):(\d+)$', s)
                if file_line_match:
                    fpath_rel, line_num = file_line_match.group(1), int(file_line_match.group(2))
                    fpath_abs = os.path.join(REPO_ROOT, fpath_rel)
                    if not os.path.exists(fpath_abs):
                        violations.append(f"Entry {i} ('{q}'): cited file '{fpath_rel}' does not exist.")
                    else:
                        file_sources.append(fpath_abs)
                        with open(fpath_abs, "r", encoding="utf-8") as f:
                            lines = f.readlines()
                        if line_num < 1 or line_num > len(lines):
                            violations.append(f"Entry {i} ('{q}'): line {line_num} out of range for '{fpath_rel}' (total lines: {len(lines)}).")
                else:
                    violations.append(f"Entry {i} ('{q}'): invalid source format '{s}'. Must be 'METHOD /apis/v3/...' or 'path/to/file:LINE'.")
                    
        # 3. Check all endpoints claimed inside <code> tags in body
        for method, path in entry["code_endpoints"]:
            matched, r_info = route_matches(method, path, real_routes)
            if not matched:
                violations.append(f"Entry {i} ('{q}'): mentions non-existent endpoint <code>{method} {path}</code> in answer body.")
            else:
                claim_str = f"{method} {path}"
                has_citation = any(
                    route_matches(method, path, [{"method": src.split(" ")[0].upper(), "path": src.split(" ")[1]}])[0]
                    for src in sources if re.match(r'^(GET|POST|PUT|DELETE|PATCH)\s+', src, re.IGNORECASE)
                )
                if not has_citation:
                    violations.append(f"Entry {i} ('{q}'): endpoint '{claim_str}' mentioned in answer body but missing from sources array.")
                    
        # 4. Check all quoted UI labels appear in at least one of the entry's cited files
        if labels and file_sources:
            file_contents = {}
            for fpath_abs in file_sources:
                if os.path.exists(fpath_abs):
                    with open(fpath_abs, "r", encoding="utf-8") as f:
                        file_contents[fpath_abs] = f.read()
                        
            for lbl in labels:
                found_in_any = any(txt and lbl in txt for txt in file_contents.values())
                if not found_in_any:
                    cited_rel = [os.path.relpath(p, REPO_ROOT).replace("\\", "/") for p in file_sources]
                    violations.append(f"Entry {i} ('{q}'): quoted UI label \"{lbl}\" was not found in any cited file: {cited_rel}")
                    
    return violations

def self_test():
    """Self-test the validator against known invalid inputs."""
    real_routes = scan_real_routes()
    
    # Test case 1: deliberately wrong endpoint
    bad_ep_entry = [{
        "q": "Test Bad Endpoint",
        "block": "<code>POST /apis/v3/fabricated/fake_route</code>",
        "sources": ["POST /apis/v3/fabricated/fake_route", "frontend/src/components/Sidebar.tsx:10"],
        "code_endpoints": [("POST", "/apis/v3/fabricated/fake_route")],
        "labels": []
    }]
    v_ep = validate_entries(bad_ep_entry, real_routes)
    assert any("cited endpoint 'POST /apis/v3/fabricated/fake_route' does not exist" in v for v in v_ep), f"Self-test failed to catch bad endpoint: {v_ep}"
    
    # Test case 2: deliberately wrong file/line
    bad_file_entry = [{
        "q": "Test Bad File",
        "block": "<p>Hello</p>",
        "sources": ["frontend/src/non_existent_file_12345.tsx:100"],
        "code_endpoints": [],
        "labels": []
    }]
    v_file = validate_entries(bad_file_entry, real_routes)
    assert any("cited file 'frontend/src/non_existent_file_12345.tsx' does not exist" in v for v in v_file), f"Self-test failed to catch bad file: {v_file}"

    # Test case 3: deliberately wrong line number out of range
    bad_line_entry = [{
        "q": "Test Bad Line",
        "block": "<p>Hello</p>",
        "sources": ["frontend/src/components/Sidebar.tsx:9999999"],
        "code_endpoints": [],
        "labels": []
    }]
    v_line = validate_entries(bad_line_entry, real_routes)
    assert any("line 9999999 out of range" in v for v in v_line), f"Self-test failed to catch out of range line: {v_line}"
    
    # Test case 4: deliberately wrong UI label
    bad_label_entry = [{
        "q": "Test Bad UI Label",
        "block": '<p>Click the "+ NonExistent Fake Button 12345" button</p>',
        "sources": ["frontend/src/components/Sidebar.tsx:10"],
        "code_endpoints": [],
        "labels": ["+ NonExistent Fake Button 12345"]
    }]
    v_label = validate_entries(bad_label_entry, real_routes)
    assert any('quoted UI label "+ NonExistent Fake Button 12345" was not found in any cited file' in v for v in v_label), f"Self-test failed to catch bad UI label: {v_label}"
    
    # Test case 5: valid mock entry
    valid_entry = [{
        "q": "Test Valid Entry",
        "block": '<p>Select "Projects"</p><code>POST /apis/v3/projects/</code>',
        "sources": ["POST /apis/v3/projects/", "frontend/src/components/Sidebar.tsx:10"],
        "code_endpoints": [("POST", "/apis/v3/projects/")],
        "labels": ["Projects"]
    }]
    v_valid = validate_entries(valid_entry, real_routes)
    assert len(v_valid) == 0, f"Self-test falsely failed valid entry: {v_valid}"
    
    print("[self-test] All 5 self-test cases PASSED (bad endpoint, bad file, bad line, bad UI label caught, valid entry passed).")

def verify():
    self_test()
    
    real_routes = scan_real_routes()
    print(f"[verify] Scanned {len(real_routes)} real backend routes across {ROUTERS_DIR}")
    
    if len(real_routes) < 400:
        print(f"[ERROR] Route scan found only {len(real_routes)} routes; expected ~473.", file=sys.stderr)
        return 1
        
    entries = parse_help_content(HELP_FILE)
    print(f"[verify] Parsed {len(entries)} FAQ entries from {HELP_FILE}")
    
    if not entries:
        print(f"[ERROR] No FAQ entries found in {HELP_FILE}", file=sys.stderr)
        return 1
        
    violations = validate_entries(entries, real_routes)
    
    total_ep_citations = sum(
        sum(1 for s in e["sources"] if re.match(r'^(GET|POST|PUT|DELETE|PATCH)\s+\S+$', s, re.IGNORECASE))
        for e in entries
    )
    total_file_citations = sum(
        sum(1 for s in e["sources"] if re.match(r'^[^:]+:\d+$', s))
        for e in entries
    )
    total_labels = sum(len(e.get("labels", [])) for e in entries)
    
    print(f"[coverage] Verified totals: {len(entries)} entries, {total_ep_citations} endpoint citations, {total_file_citations} file:line citations, {total_labels} UI labels")

    if violations:
        print(f"\n[FAIL] {len(violations)} verification violation(s) found:", file=sys.stderr)
        for v in violations:
            print(f"  - {v}", file=sys.stderr)
        return 1
        
    print(f"\n[PASS] All {len(entries)} entries successfully verified against {len(real_routes)} backend routes and codebase citations.")
    return 0

if __name__ == "__main__":
    sys.exit(verify())
