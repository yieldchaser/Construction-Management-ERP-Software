#!/usr/bin/env python3
"""
Route reachability checker: verifies which backend routes are reachable from frontend screens.
"""

import os
import re
import sys
import glob

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ROUTERS_DIR = os.path.join(REPO_ROOT, "backend/app/routers")
FRONTEND_DIR = os.path.join(REPO_ROOT, "frontend/src")
EXEMPTIONS_FILE = os.path.join(REPO_ROOT, "scripts/verification/reachability_exemptions.txt")


def scan_backend_routes(routers_dir=ROUTERS_DIR):
    routes = []
    py_files = sorted(glob.glob(os.path.join(routers_dir, "*.py")))
    for fpath in py_files:
        if os.path.basename(fpath) == "__init__.py":
            continue
        with open(fpath, "r", encoding="utf-8") as f:
            file_content = f.read()

        router_vars = {}
        for m in re.finditer(r"([a-zA-Z0-9_]+)\s*=\s*APIRouter\s*\((.*?)\)", file_content, re.DOTALL):
            var_name = m.group(1)
            args_str = m.group(2)
            prefix_match = re.search(r"prefix\s*=\s*['\"]([^'\"]*)['\"]", args_str)
            prefix = prefix_match.group(1) if prefix_match else ""
            router_vars[var_name] = prefix

        if "router" not in router_vars:
            router_vars["router"] = ""

        extra_main_prefix = ""
        if os.path.basename(fpath) == "delete_logs.py":
            extra_main_prefix = "/delete-logs"

        pattern = r"@([a-zA-Z0-9_]+)\.(get|post|put|delete|patch|api_route)\s*\(\s*['\"]([^'\"]*)['\"]"
        for match in re.finditer(pattern, file_content, re.IGNORECASE):
            var_name = match.group(1)
            if var_name not in router_vars:
                continue
            method = match.group(2).upper()
            subpath = match.group(3)
            r_prefix = router_vars[var_name]
            combined_prefix = extra_main_prefix + r_prefix
            if not subpath.startswith("/") and subpath != "":
                subpath = "/" + subpath
            full_path = combined_prefix + subpath
            if not full_path.startswith("/"):
                full_path = "/" + full_path
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


def load_exemptions(exemptions_path=EXEMPTIONS_FILE):
    exemptions = {}
    if not os.path.exists(exemptions_path):
        return exemptions
    with open(exemptions_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(None, 2)
            if len(parts) >= 2:
                method = parts[0].upper()
                path = parts[1].rstrip("/") if parts[1] != "/" else "/"
                reason = parts[2] if len(parts) > 2 else "Exempt"
                exemptions[(method, path)] = reason
    return exemptions


FRONTEND_EXTS = (".ts", ".tsx")


def load_frontend_files(frontend_dir=FRONTEND_DIR):
    frontend_contents = []
    for root, _, files in os.walk(frontend_dir):
        for f in files:
            if f.endswith(FRONTEND_EXTS):
                full_path = os.path.join(root, f)
                with open(full_path, "r", encoding="utf-8") as fh:
                    rel = os.path.relpath(full_path, REPO_ROOT).replace("\\", "/")
                    frontend_contents.append((rel, fh.read()))
    return frontend_contents


def build_route_matcher(route_path):
    segments = [s for s in route_path.strip("/").split("/") if s]
    if not segments:
        return re.compile(r'/apis/v3/?[\'"`]')

    parts = []
    for i, s in enumerate(segments):
        if re.match(r"^\{[a-zA-Z0-9_]+\}$", s):
            # Param: matches template var or simple path token
            parts.append(r"(?:\$\{[a-zA-Z0-9_.]+\}|[a-zA-Z0-9_\-]+)")
        else:
            escaped = re.escape(s)
            if i == 0:
                parts.append(escaped)
            else:
                # Literal or interpolated variable like ${action}
                parts.append(rf"(?:{escaped}|\$\{{[a-zA-Z0-9_.]+\}})")

    pattern = r"(?:/apis/v3)?/" + r"/".join(parts) + r"(?:[/?\"'`&]|$|\s)"
    return re.compile(pattern, re.IGNORECASE)


def check_reachability(routes, frontend_contents, exemptions):
    reachable = []
    exempt = []
    unreachable = []

    # Pre-concatenate frontend files for instant lookup
    all_content = "\n".join(content for _, content in frontend_contents)

    for r in routes:
        method = r["method"]
        path = r["path"]

        norm_path = path.rstrip("/") if path != "/" else "/"
        is_exempt = False
        exempt_reason = ""
        for (ex_method, ex_path), reason in exemptions.items():
            if ex_method == method or ex_method == "API_ROUTE":
                p1 = re.sub(r'\{[a-zA-Z0-9_]+\}', r'[^/]+', norm_path)
                p2 = re.sub(r'\{[a-zA-Z0-9_]+\}', r'[^/]+', ex_path)
                if norm_path == ex_path or re.match(rf"^{p1}$", ex_path) or re.match(rf"^{p2}$", norm_path):
                    is_exempt = True
                    exempt_reason = reason
                    break

        if is_exempt:
            exempt.append({**r, "reason": exempt_reason})
            continue

        matcher = build_route_matcher(path)
        segments = [s for s in path.strip("/").split("/") if s and not re.match(r"^\{[a-zA-Z0-9_]+\}$", s)]
        first_static = segments[0] if segments else ""

        if first_static and first_static not in all_content:
            unreachable.append(r)
            continue

        matched_file = None
        for fname, content in frontend_contents:
            if first_static and first_static not in content:
                continue
            if matcher.search(content):
                matched_file = fname
                break

        if matched_file:
            reachable.append({**r, "caller": matched_file})
        else:
            unreachable.append(r)

    return reachable, exempt, unreachable


DUMMY_FILE = "test.tsx"


def self_test():
    dummy_frontend_reachable = [(DUMMY_FILE, "fetch(`/apis/v3/projects/${projectId}/dpr`)")]
    dummy_frontend_unreachable = [(DUMMY_FILE, "fetch(`/apis/v3/some/other/path`)")]
    test_route = [{"method": "GET", "path": "/projects/{project_id}/dpr", "file": "test.py", "line": 1}]

    reach_res, _, unreach_res = check_reachability(test_route, dummy_frontend_reachable, {})
    if len(reach_res) != 1 or len(unreach_res) != 0:
        print("[self-test] FAIL: Known reachable route was not detected as reachable.")
        return False

    reach_res, _, unreach_res = check_reachability(test_route, dummy_frontend_unreachable, {})
    if len(reach_res) != 0 or len(unreach_res) != 1:
        print("[self-test] FAIL: Known unreachable route was not detected as unreachable.")
        return False

    interpolated_frontend = [("hr.tsx", "fetch(`${host}/apis/v3/hr/timesheets/${tsId}/${action}`)")]
    interp_route = [{"method": "POST", "path": "/hr/timesheets/{ts_id}/approve", "file": "hr.py", "line": 1}]
    reach_res, _, unreach_res = check_reachability(interp_route, interpolated_frontend, {})
    if len(reach_res) != 1:
        print("[self-test] FAIL: Interpolated action segment was not matched.")
        return False

    print("[self-test] All self-test cases PASSED (reachable, unreachable, interpolated segment).")
    return True


from _callsite_check import check_callsites, callsite_self_test  # noqa: E402

DEPLOY_CHECK_FAIL = 1
DEPLOY_CHECK_OK = 0


def main():
    if not self_test():
        sys.exit(DEPLOY_CHECK_FAIL)
    if not callsite_self_test():
        sys.exit(DEPLOY_CHECK_FAIL)

    routes = scan_backend_routes()
    exemptions = load_exemptions()
    frontend_contents = load_frontend_files()

    reachable, exempt, unreachable = check_reachability(routes, frontend_contents, exemptions)

    print(f"\n[reachability] Scanned {len(routes)} backend routes across {ROUTERS_DIR}")
    print(f"[reachability] Exempt: {len(exempt)} routes")
    print(f"[reachability] Reachable: {len(reachable)} routes")
    print(f"[reachability] Unreachable: {len(unreachable)} routes")

    if unreachable:
        print("\n--- UNREACHABLE ROUTES ---")
        for u in unreachable:
            print(f"{u['method']:<7} {u['path']:<55} ({u['file']}:{u['line']})")

    unknown = check_callsites(routes, frontend_contents)
    print(f"[reachability] Frontend calls hitting no backend route: {len(unknown)}")
    if unknown:
        print("\n--- FRONTEND CALLS WITH NO BACKEND ROUTE ---")
        for path, fname, line in unknown:
            print(f"{path:<70} ({fname}:{line})")

    return len(unreachable) + len(unknown)


if __name__ == "__main__":
    sys.exit(DEPLOY_CHECK_OK if main() == 0 else DEPLOY_CHECK_FAIL)
