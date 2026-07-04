import sys
import os
import uuid
from fastapi.testclient import TestClient

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

from app.main import app
from app.database import Base, engine, SessionLocal
from app import models

client = TestClient(app)

def setup_db():
    # Force recreate database tables for the test run
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_onboarding_and_libraries():
    print("Starting integration test suite for Onboarding & Libraries...")
    setup_db()
    
    db = SessionLocal()
    
    # 1. Seed a company
    company_id = uuid.uuid4()
    company = models.Company(
        id=company_id,
        name="Test Builder Corp",
        legal_business_name="Test Builder Corp Ltd",
        gstin="27AADCD2424B1ZP",
        billing_address="A-10, Indiranagar, Bangalore",
    )
    db.add(company)
    db.commit()
    print(f"Company seeded successfully. ID: {company_id}")
    
    # 2. Trigger Onboarding API
    print("\n--- Testing Onboarding API ---")
    onboard_payload = {
        "company_id": str(company_id),
        "company_name": "Updated Builder Corp",
        "city": "Chennai",
        "segment": "Developer, Building Construction",
        "categories": "Residential Real Estate, Mixed-Use Development"
    }
    
    response = client.post("/apis/v3/profile/onboarding", json=onboard_payload)
    assert response.status_code == 200, f"Onboarding failed: {response.text}"
    onboard_data = response.json()
    print("Onboarding Response:", onboard_data)
    assert onboard_data["success"] is True
    assert onboard_data["company"]["name"] == "Updated Builder Corp"
    assert onboard_data["company"]["city"] == "Chennai"
    
    # Verify settings endpoint returns onboarding data
    get_res = client.get(f"/apis/v3/settings/company/{company_id}")
    assert get_res.status_code == 200
    settings_data = get_res.json()
    print("Settings Company Response:", settings_data)
    assert settings_data["onboarding_completed"] is True
    assert settings_data["onboarding_city"] == "Chennai"
    
    # 3. Test Library Party CRUD
    print("\n--- Testing Library Party CRUD ---")
    party_payload = {
        "company_id": str(company_id),
        "name": "Sai Steel Supplier",
        "phone": "9876543210",
        "email": "sai@steel.com",
        "party_type": "Supplier",
        "address": "Bangalore Steel Yard"
    }
    res_party_post = client.post("/apis/v3/library/parties", json=party_payload)
    assert res_party_post.status_code == 200, res_party_post.text
    party = res_party_post.json()
    print("Created Party:", party)
    assert party["name"] == "Sai Steel Supplier"
    assert party["party_id_custom"] == "PID-1"
    
    res_party_get = client.get(f"/apis/v3/library/parties/{company_id}")
    assert res_party_get.status_code == 200
    parties = res_party_get.json()
    assert len(parties) == 1
    print("Fetched Parties:", parties)
    
    # 4. Test Library Material CRUD
    print("\n--- Testing Library Material CRUD ---")
    mat_payload = {
        "company_id": str(company_id),
        "name": "OPC Cement 53 Grade",
        "unit": "bag",
        "gst_rate": 28.0,
        "category": "Cement",
        "unit_cost": 410.0,
        "lead_time_days": 3,
        "item_code": "MAT-CEM-OPC"
    }
    res_mat_post = client.post("/apis/v3/library/materials", json=mat_payload)
    assert res_mat_post.status_code == 200, res_mat_post.text
    material = res_mat_post.json()
    print("Created Material:", material)
    assert material["name"] == "OPC Cement 53 Grade"
    
    res_mat_get = client.get(f"/apis/v3/library/materials/{company_id}")
    assert res_mat_get.status_code == 200
    materials = res_mat_get.json()
    assert len(materials) == 1
    print("Fetched Materials:", materials)
    
    # 5. Test Library Rate CRUD
    print("\n--- Testing Library Rate CRUD ---")
    rate_payload = {
        "company_id": str(company_id),
        "name": "Plastering Works Rate",
        "unit": "sqft",
        "gst_rate": 18.0,
        "category": "Masonry",
        "unit_cost": 45.0,
        "markup_value": 15.0,
        "markup_type": "percent",
        "unit_sale_price": 51.75
    }
    res_rate_post = client.post("/apis/v3/library/rates", json=rate_payload)
    assert res_rate_post.status_code == 200, res_rate_post.text
    rate = res_rate_post.json()
    print("Created Rate Card:", rate)
    assert rate["name"] == "Plastering Works Rate"
    
    res_rate_get = client.get(f"/apis/v3/library/rates/{company_id}")
    assert res_rate_get.status_code == 200
    rates = res_rate_get.json()
    assert len(rates) == 1
    print("Fetched Rates:", rates)
    
    # 6. Test Simple Library item CRUD (Cost Code)
    print("\n--- Testing Library Cost Code CRUD ---")
    cc_payload = {
        "company_id": str(company_id),
        "code": "CC-MAS-01",
        "name": "Masonry Brick Work"
    }
    res_cc_post = client.post("/apis/v3/library/cost-codes", json=cc_payload)
    assert res_cc_post.status_code == 200, res_cc_post.text
    cc = res_cc_post.json()
    print("Created Cost Code:", cc)
    
    res_cc_get = client.get(f"/apis/v3/library/cost-codes/{company_id}")
    assert res_cc_get.status_code == 200
    codes = res_cc_get.json()
    assert len(codes) == 1
    print("Fetched Cost Codes:", codes)
    
    # Delete test
    del_res = client.delete(f"/apis/v3/library/cost-codes/{cc['id']}")
    assert del_res.status_code == 200
    print("Successfully deleted Cost Code.")
    
    db.close()
    print("\nAll integration checks passed successfully!")

if __name__ == "__main__":
    test_onboarding_and_libraries()
