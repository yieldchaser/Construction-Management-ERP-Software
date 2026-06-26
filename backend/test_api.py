import subprocess
import time
import requests
import sys

def test_backend():
    print("Starting FastAPI backend server...")
    import os
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test.db")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.dirname(os.path.abspath(__file__))
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    proc = subprocess.Popen(
        ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    # Wait for the server to spin up
    time.sleep(5)
    
    try:
        base_url = "http://127.0.0.1:8000"
        
        # 1. Health Check
        print("Testing health check endpoint...")
        res = requests.get(f"{base_url}/")
        assert res.status_code == 200
        print("[x] Health check passed:", res.json())
        
        # 2. Send OTP
        print("\nTesting OTP Send...")
        res = requests.post(
            f"{base_url}/apis/v3/auth/otp/send",
            json={"mobile": "+919876543210"}
        )
        assert res.status_code == 200
        assert res.json()["success"] is True
        print("[x] OTP Send passed:", res.json())
        
        # 3. Verify OTP (Auto-onboards demo company and user)
        print("\nTesting OTP Verify...")
        res = requests.post(
            f"{base_url}/apis/v3/auth/otp/verify",
            json={"mobile": "+919876543210", "code": "123456"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["mobile"] == "+919876543210"
        assert data["company"]["name"] == "Demo Construction Ltd"
        print("[x] OTP Verify passed: User and Demo Company auto-onboarded successfully!")
        
        # 4. Steel Calculator
        print("\nTesting Steel Calculator API...")
        res = requests.post(
            f"{base_url}/apis/v3/calculators/steel",
            json={
                "diameter": 12.0,
                "count": 10,
                "length_or_height": 3.0,
                "is_column": True,
                "slab_thickness": 0.15
            }
        )
        assert res.status_code == 200
        print("[x] Steel Calculator API passed:", res.json())
        
        # 5. Concrete Calculator
        print("\nTesting Concrete Calculator API...")
        res = requests.post(
            f"{base_url}/apis/v3/calculators/concrete",
            json={
                "wet_volume": 2.0,
                "grade": "M20"
            }
        )
        assert res.status_code == 200
        print("[x] Concrete Calculator API passed:", res.json())
        
        print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        # Print subprocess logs
        out, err = proc.communicate(timeout=2)
        print("stdout:", out)
        print("stderr:", err)
        sys.exit(1)
        
    finally:
        print("Stopping backend server...")
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    test_backend()
