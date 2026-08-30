import os
import sys
import subprocess

def test_help_claims_valid():
    """Verify that all FAQ entries in helpContent.tsx have valid sources, real endpoints, and valid citations."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
    validator_script = os.path.join(repo_root, "scripts/verification/verify_help_claims.py")
    
    assert os.path.exists(validator_script), f"Validator script missing at {validator_script}"
    
    result = subprocess.run(
        [sys.executable, validator_script],
        cwd=repo_root,
        capture_output=True,
        text=True
    )
    
    assert result.returncode == 0, f"verify_help_claims.py failed (exit code {result.returncode}):\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
