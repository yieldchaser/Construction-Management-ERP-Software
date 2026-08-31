import uuid
from decimal import Decimal
from datetime import datetime, timezone
import pytest
from app import models


def test_part5_library_crud_endpoints(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="CRUD Library Co", user_name="Lib User")
    hdr = auth_headers(user, comp)

    # 1. Materials PUT
    mat = models.LibraryMaterial(company_id=comp.id, name="Cement 43 Grade", unit="Bag", unit_cost=350.0)
    db.add(mat)
    db.commit()

    res = client.put(f"/apis/v3/library/materials/{mat.id}", json={"name": "Cement 53 Grade", "unit_cost": 380.0}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Cement 53 Grade"
    assert float(res.json()["unit_cost"]) == 380.0

    # 2. Parties PUT
    party = models.LibraryParty(company_id=comp.id, name="Acme Builders", party_type="Vendor", phone="9876543210")
    db.add(party)
    db.commit()

    res = client.put(f"/apis/v3/library/parties/{party.id}", json={"name": "Acme Infra Ltd", "phone": "9998887776"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Acme Infra Ltd"

    # 3. Rates PUT
    rate = models.LibraryRate(company_id=comp.id, name="Plastering 1:4", unit="Sq.Ft", unit_cost=25.0)
    db.add(rate)
    db.commit()

    res = client.put(f"/apis/v3/library/rates/{rate.id}", json={"name": "Plastering 1:3 Premium", "unit_cost": 30.0}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Plastering 1:3 Premium"

    # 4. Cost Codes PUT
    cc = models.LibraryCostCode(company_id=comp.id, code="CC-CIVIL", name="Civil Works", budget_amount=100000.0)
    db.add(cc)
    db.commit()

    res = client.put(f"/apis/v3/library/cost-codes/{cc.id}", json={"name": "Civil & Structural Works", "budget_amount": 150000.0}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Civil & Structural Works"

    # 5. Asset Types PUT
    at = models.LibraryAssetType(company_id=comp.id, name="Heavy Vehicle")
    db.add(at)
    db.commit()

    res = client.put(f"/apis/v3/library/asset-types/{at.id}", json={"name": "Heavy Machinery & Fleet"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Heavy Machinery & Fleet"

    # 6. Deductions PUT
    ded = models.LibraryDeduction(company_id=comp.id, name="TDS 1%")
    db.add(ded)
    db.commit()

    res = client.put(f"/apis/v3/library/deductions/{ded.id}", json={"name": "TDS 2%"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "TDS 2%"

    # 7. Progresses PUT
    prog = models.LibraryProgress(company_id=comp.id, name="Poured")
    db.add(prog)
    db.commit()

    res = client.put(f"/apis/v3/library/progresses/{prog.id}", json={"name": "Cured & Finished"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Cured & Finished"

    # 8. Retentions PUT
    ret = models.LibraryRetention(company_id=comp.id, name="5% Security Deposit")
    db.add(ret)
    db.commit()

    res = client.put(f"/apis/v3/library/retentions/{ret.id}", json={"name": "10% Retention Guarantee"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "10% Retention Guarantee"

    # 9. Todos PUT
    td = models.LibraryTodo(company_id=comp.id, name="Site Inspection")
    db.add(td)
    db.commit()

    res = client.put(f"/apis/v3/library/todos/{td.id}", json={"name": "Safety Pre-check"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Safety Pre-check"

    # 10. Workforces PUT
    wf = models.LibraryWorkforce(company_id=comp.id, name="Mason")
    db.add(wf)
    db.commit()

    res = client.put(f"/apis/v3/library/workforces/{wf.id}", json={"name": "Master Mason"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Master Mason"

    # 11. Material Categories PUT
    mc = models.MaterialCategory(company_id=comp.id, name="Aggregates")
    db.add(mc)
    db.commit()

    res = client.put(f"/apis/v3/library/material-categories/{mc.id}", json={"name": "Fine & Coarse Aggregates"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Fine & Coarse Aggregates"


def test_part5_equipment_and_files_crud(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="CRUD Equip Co", user_name="Equip User")
    hdr = auth_headers(user, comp)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Equip Project",
        code=f"EQP-{uuid.uuid4().hex[:4]}",
        status="In Progress",
    )
    db.add(proj)
    db.commit()

    # Equipment PUT
    eq = models.Equipment(
        company_id=comp.id,
        name="Excavator CAT 320",
        code=f"EX-{uuid.uuid4().hex[:4]}",
        category="Earthmoving",
        ownership_type="Owned",
        hourly_rate=Decimal("1500.00"),
    )
    db.add(eq)
    db.commit()

    res = client.put(f"/apis/v3/equipment/{eq.id}", json={"name": "Excavator CAT 320D", "hourly_rate": 1750.0}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Excavator CAT 320D"
    assert res.json()["hourly_rate"] == 1750.0

    # Files Folder PUT (rename)
    folder = models.FileFolder(
        id=uuid.uuid4(),
        project_id=proj.id,
        name="Old Drawings",
    )
    db.add(folder)
    db.commit()

    res = client.put(f"/apis/v3/files/folders/{folder.id}", json={"name": "Archived Structural Drawings"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Archived Structural Drawings"


def test_part5_hr_designations_and_offboarding(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="CRUD HR Co", user_name="HR User")
    hdr = auth_headers(user, comp)

    # Designation PUT and DELETE
    desig = models.Designation(company_id=comp.id, name="Junior Estimator")
    db.add(desig)
    db.commit()

    res = client.put(f"/apis/v3/hr/designations/{desig.id}", json={"name": "Senior QS & Estimator"}, headers=hdr)
    assert res.status_code == 200, res.text
    assert res.json()["name"] == "Senior QS & Estimator"

    res = client.delete(f"/apis/v3/hr/designations/{desig.id}", headers=hdr)
    assert res.status_code == 200, res.text
    assert db.query(models.Designation).filter(models.Designation.id == desig.id).first() is None

    # Employee offboarding (soft delete / deactivation)
    emp = models.StaffEmployee(
        company_id=comp.id,
        name="Ramesh Sharma",
        employee_code="EMP-101",
        basic_salary=Decimal("40000.00"),
        status="active",
    )
    db.add(emp)
    db.commit()

    res = client.delete(f"/apis/v3/hr/employees/{emp.id}", headers=hdr)
    assert res.status_code == 200, res.text
    db.refresh(emp)
    assert emp.status == "inactive"  # Preserved in database for payroll history!


def test_part5_crm_quality_finance_subcon_custom_fields(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="CRUD CRM Co", user_name="CRM User")
    hdr = auth_headers(user, comp)

    # CRM Lookups
    source = models.CRMLeadSource(company_id=comp.id, name="Old Newspaper")
    db.add(source)
    db.commit()
    res = client.put(f"/apis/v3/crm/lead-sources/{source.id}", json={"name": "Digital Ad Campaign"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["name"] == "Digital Ad Campaign"
    res = client.delete(f"/apis/v3/crm/lead-sources/{source.id}", headers=hdr)
    assert res.status_code == 200

    cat = models.CRMLeadCategory(company_id=comp.id, name="Residential")
    db.add(cat)
    db.commit()
    res = client.put(f"/apis/v3/crm/lead-categories/{cat.id}", json={"name": "Commercial Towers"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["name"] == "Commercial Towers"
    res = client.delete(f"/apis/v3/crm/lead-categories/{cat.id}", headers=hdr)
    assert res.status_code == 200

    stat = models.CRMLeadStatus(company_id=comp.id, name="Initial Contact")
    db.add(stat)
    db.commit()
    res = client.put(f"/apis/v3/crm/lead-statuses/{stat.id}", json={"name": "Under Technical Review"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["name"] == "Under Technical Review"
    res = client.delete(f"/apis/v3/crm/lead-statuses/{stat.id}", headers=hdr)
    assert res.status_code == 200

    # Quality Checklists
    cl = models.QualityChecklist(company_id=comp.id, title="Pre-Pour Slab Inspection", category="Civil")
    db.add(cl)
    db.commit()
    res = client.put(f"/apis/v3/quality/checklists/{cl.id}", json={"title": "Pre-Pour RCC Slab & Beam Inspection"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["title"] == "Pre-Pour RCC Slab & Beam Inspection"
    res = client.delete(f"/apis/v3/quality/checklists/{cl.id}", headers=hdr)
    assert res.status_code == 200

    # Finance Bank & Cash Account
    bank = models.BankAccount(company_id=comp.id, bank_name="HDFC", account_holder_name="Acme", account_number="12345", ifsc_code="HDFC0001", balance=50000.0)
    db.add(bank)
    db.commit()
    res = client.put(f"/apis/v3/finance/accounts/{bank.id}", json={"bank_name": "HDFC Bank Main Branch"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["bank_name"] == "HDFC Bank Main Branch"
    res = client.delete(f"/apis/v3/finance/accounts/{bank.id}", headers=hdr)
    assert res.status_code == 200

    cash = models.CashAccount(company_id=comp.id, name="Petty Cash Site A", opening_balance=5000.0)
    db.add(cash)
    db.commit()
    res = client.put(f"/apis/v3/finance/cash-account/{cash.id}", json={"name": "Site A Petty Cash Fund", "opening_balance": 10000.0}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["name"] == "Site A Petty Cash Fund"
    res = client.delete(f"/apis/v3/finance/cash-account/{cash.id}", headers=hdr)
    assert res.status_code == 200

    # Billing Subcontractors
    subcon_party = models.LibraryParty(company_id=comp.id, name="Subcon Prime", party_type="Subcontractor")
    db.add(subcon_party)
    db.flush()
    team_sub = models.CompanyTeam(company_id=comp.id, priority_type="subcontractor", library_party_id=subcon_party.id)
    db.add(team_sub)
    db.commit()
    res = client.put(f"/apis/v3/billing/subcontractors/{team_sub.id}", json={"name": "Subcon Prime MEP Works", "phone": "9876543210"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["name"] == "Subcon Prime MEP Works"
    res = client.delete(f"/apis/v3/billing/subcontractors/{team_sub.id}", headers=hdr)
    assert res.status_code == 200

    # Custom Fields
    cf = models.CustomField(company_id=comp.id, entity_type="task", field_name="task_code_custom", field_label="Task Code", field_type="text")
    db.add(cf)
    db.commit()
    res = client.put(f"/apis/v3/custom-fields/fields/{cf.id}", json={"field_label": "Custom Task Identifier"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["field_label"] == "Custom Task Identifier"
    res = client.delete(f"/apis/v3/custom-fields/fields/{cf.id}", headers=hdr)
    assert res.status_code == 204


def test_part5_tally_planning_and_branches(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="CRUD Tally Co", user_name="Tally User")
    hdr = auth_headers(user, comp)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Tally Project",
        code=f"TLP-{uuid.uuid4().hex[:4]}",
        status="In Progress",
    )
    db.add(proj)
    db.commit()

    # Tally Connections & Agents
    now = datetime.now(timezone.utc)
    conn = models.TallyConnection(company_id=comp.id, tally_company_name="SiteFlow Tally Co", registered_mobile="9876543210", sync_window_start_date=now)
    db.add(conn)
    db.commit()
    res = client.put(f"/apis/v3/tally/connections/{conn.id}", json={"tally_company_name": "SiteFlow Enterprise Tally"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["tally_company_name"] == "SiteFlow Enterprise Tally"
    res = client.delete(f"/apis/v3/tally/connections/{conn.id}", headers=hdr)
    assert res.status_code == 200

    agent = models.TallyAgent(company_id=comp.id, machine_label="HQ-Server", auth_key="secret123")
    db.add(agent)
    db.commit()
    res = client.put(f"/apis/v3/tally/agents/{agent.id}", json={"machine_label": "HQ-Primary-Sync"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["machine_label"] == "HQ-Primary-Sync"
    res = client.delete(f"/apis/v3/tally/agents/{agent.id}", headers=hdr)
    assert res.status_code == 200

    # Tally Mappings
    map_ledger = models.TallyLedgerMapping(company_id=comp.id, onsite_transaction_type="Material Purchase", tally_voucher_type="Purchase", tally_ledger_name="Material Cost")
    db.add(map_ledger)
    db.commit()
    res = client.put(f"/apis/v3/tally/mappings/ledger/{map_ledger.id}", json={"tally_ledger_name": "Direct Material Cost"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["tally_ledger_name"] == "Direct Material Cost"
    res = client.delete(f"/apis/v3/tally/mappings/ledger/{map_ledger.id}", headers=hdr)
    assert res.status_code == 200

    party_row = models.LibraryParty(company_id=comp.id, name="ABC Suppliers")
    db.add(party_row)
    db.flush()
    map_party = models.TallyPartyMapping(company_id=comp.id, onsite_party_id=party_row.id, tally_ledger_name="ABC Sundry Creditor")
    db.add(map_party)
    db.commit()
    res = client.put(f"/apis/v3/tally/mappings/party/{map_party.id}", json={"tally_ledger_name": "ABC Trade Creditors"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["tally_ledger_name"] == "ABC Trade Creditors"
    res = client.delete(f"/apis/v3/tally/mappings/party/{map_party.id}", headers=hdr)
    assert res.status_code == 200

    map_cc = models.TallyCostCentreMapping(company_id=comp.id, project_id=proj.id, tally_cost_centre_name="Alpha Site")
    db.add(map_cc)
    db.commit()
    res = client.put(f"/apis/v3/tally/mappings/cost-centre/{map_cc.id}", json={"tally_cost_centre_name": "Alpha Tower Project"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["tally_cost_centre_name"] == "Alpha Tower Project"
    res = client.delete(f"/apis/v3/tally/mappings/cost-centre/{map_cc.id}", headers=hdr)
    assert res.status_code == 200

    map_bank = models.TallyBankMapping(company_id=comp.id, onsite_bank_account_details="HDFC-9999", tally_ledger_name="HDFC Current A/c")
    db.add(map_bank)
    db.commit()
    res = client.put(f"/apis/v3/tally/mappings/bank/{map_bank.id}", json={"tally_ledger_name": "HDFC Primary Bank A/c"}, headers=hdr)
    assert res.status_code == 200
    assert res.json()["tally_ledger_name"] == "HDFC Primary Bank A/c"
    res = client.delete(f"/apis/v3/tally/mappings/bank/{map_bank.id}", headers=hdr)
    assert res.status_code == 200

    # Planning Tasks DELETE
    task = models.Task(project_id=proj.id, name="Foundation Piling", start_date=now, end_date=now, duration_days=5, status="not_started")
    db.add(task)
    db.commit()
    res = client.delete(f"/apis/v3/planning/tasks/{task.id}", headers=hdr)
    assert res.status_code == 200
    assert db.query(models.Task).filter(models.Task.id == task.id).first() is None

    # Planning Projects DELETE
    proj_to_delete = models.Project(company_id=comp.id, name="Disposable Project", code=f"DP-{uuid.uuid4().hex[:4]}")
    db.add(proj_to_delete)
    db.commit()
    res = client.delete(f"/apis/v3/planning/projects/{proj_to_delete.id}", headers=hdr)
    assert res.status_code == 200
    assert db.query(models.Project).filter(models.Project.id == proj_to_delete.id).first() is None

    # Settings Branches DELETE
    branch = models.CompanyBranch(company_id=comp.id, branch_name="North Regional Office", gstin="29ABCDE1234F1Z5", billing_address="123 Industrial Area")
    db.add(branch)
    db.commit()
    res = client.delete(f"/apis/v3/settings/branches/{branch.id}", headers=hdr)
    assert res.status_code == 200
    assert db.query(models.CompanyBranch).filter(models.CompanyBranch.id == branch.id).first() is None
