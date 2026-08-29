"""Finding R2-752: All write controls surface errors on non-2xx responses (0 silent write controls).

Clauses:
1. scripts/verification/okelse.py scans all frontend write controls (POST/PUT/PATCH/DELETE fetches).
2. The number of silent write controls is 0 (100% of write controls with ok-checks surface errors).
"""
import os
import sys
import subprocess


def test_r2_752_zero_silent_write_controls():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    script_path = os.path.join(repo_root, "scripts", "verification", "okelse.py")
    assert os.path.exists(script_path), f"Script not found at {script_path}"

    res = subprocess.run(
        [sys.executable, script_path],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=True,
    )
    output = res.stdout
    assert "silent          0" in output, f"Expected 0 silent write controls, output was:\n{output}"
