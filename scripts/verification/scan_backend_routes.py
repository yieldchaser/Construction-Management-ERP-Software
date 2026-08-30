import os
import re
import glob

def scan_all_routes(routers_dir="backend/app/routers"):
    routes = []
    py_files = sorted(glob.glob(os.path.join(routers_dir, "*.py")))
    
    for fpath in py_files:
        if os.path.basename(fpath) == "__init__.py":
            continue
            
        with open(fpath, "r", encoding="utf-8") as f:
            file_content = f.read()
            
        # Find all APIRouter definitions with their variable names and prefixes
        router_vars = {}
        for m in re.finditer(r'([a-zA-Z0-9_]+)\s*=\s*APIRouter\s*\((.*?)\)', file_content, re.DOTALL):
            var_name = m.group(1)
            args_str = m.group(2)
            prefix_match = re.search(r'prefix\s*=\s*[\'"]([^\'"]*)[\'"]', args_str)
            prefix = prefix_match.group(1) if prefix_match else ""
            router_vars[var_name] = prefix
            
        if "router" not in router_vars:
            router_vars["router"] = ""
            
        # Special case for delete_logs which is included with prefix="/apis/v3/delete-logs" in main.py
        extra_main_prefix = ""
        if os.path.basename(fpath) == "delete_logs.py":
            extra_main_prefix = "/delete-logs"
            
        # Find all route decorators
        for var_name, r_prefix in router_vars.items():
            pattern = rf'@{var_name}\.(get|post|put|delete|patch|api_route)\s*\(\s*[\'"]([^\'"]*)[\'"]'
            for match in re.finditer(pattern, file_content, re.IGNORECASE):
                method = match.group(1).upper()
                subpath = match.group(2)
                
                # Compose full path
                combined_prefix = "/apis/v3" + extra_main_prefix + r_prefix
                
                if subpath == "" or subpath == "/":
                    if combined_prefix.endswith("/"):
                        full_path = combined_prefix
                    else:
                        full_path = combined_prefix if subpath == "" else combined_prefix + "/"
                else:
                    if not subpath.startswith("/"):
                        subpath = "/" + subpath
                    full_path = combined_prefix + subpath
                    
                line_no = file_content[:match.start()].count("\n") + 1
                routes.append({
                    "method": method,
                    "path": full_path,
                    "file": os.path.relpath(fpath).replace("\\", "/"),
                    "line": line_no,
                    "decorator": match.group(0)
                })
                
    return routes

if __name__ == "__main__":
    all_routes = scan_all_routes()
    print(f"Total route decorators found: {len(all_routes)}")
    for r in all_routes[:10]:
        print(f"  {r['method']:<6} {r['path']} ({r['file']}:{r['line']})")
