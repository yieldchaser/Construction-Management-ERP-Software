# -*- coding: utf-8 -*-
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Remove old test.db if it exists to ensure a clean schema rebuild
db_file = "test.db"
if os.path.exists(db_file):
    try:
        os.remove(db_file)
        print("Removed existing test.db for clean seed.")
    except Exception as e:
        print(f"Could not remove test.db: {e}")

from app.database import SessionLocal, engine, Base
from app import models

# Ensure tables are created
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Fixed IDs using letters to avoid SQLite Numeric Affinity conversion to integer
COMPANY_ID = uuid.UUID("e0000000-0000-0000-0000-000000000000")
USER_ID = uuid.UUID("e0000000-0000-0000-0000-000000000100")
TEAM_ID = uuid.UUID("e0000000-0000-0000-0000-000000000200")

PROJ_1 = uuid.UUID("d0000000-0000-0000-0000-000000000001")
PROJ_2 = uuid.UUID("d0000000-0000-0000-0000-000000000002")
PROJ_3 = uuid.UUID("d0000000-0000-0000-0000-000000000003")

# Seed Company if not exists
company = db.query(models.Company).filter(models.Company.id == COMPANY_ID).first()
if not company:
    company = models.Company(
        id=COMPANY_ID,
        name="Demo Construction Ltd",
        legal_business_name="Demo Construction India Private Limited",
        gstin="27AADCD2424B1ZP",
        billing_address="101, Skyline Tower, Andheri East, Mumbai, MH - 400069",
        currency_decimal_places=2,
        quantity_decimal_places=3,
        back_dated_limit_days=7
    )
    db.add(company)
    db.commit()
    print("Seeded Company.")
else:
    print("Company already exists.")

# Seed User if not exists
user = db.query(models.User).filter(models.User.id == USER_ID).first()
if not user:
    user = models.User(
        id=USER_ID,
        name="Demo Engineer",
        mobile="+919999912345",
        email="demo@siteflow.co"
    )
    db.add(user)
    db.commit()
    print("Seeded User.")

# Seed CompanyTeam if not exists
team = db.query(models.CompanyTeam).filter(models.CompanyTeam.id == TEAM_ID).first()
if not team:
    team = models.CompanyTeam(
        id=TEAM_ID,
        company_id=COMPANY_ID,
        user_id=USER_ID,
        priority_type="partner"
    )
    db.add(team)
    db.commit()
    print("Seeded CompanyTeam.")

# Seed Projects
project_data = [
    (PROJ_1, "Metro Terminal (Phase 2)", "MET-02", "Mumbai", "Maharashtra"),
    (PROJ_2, "Bypass Highway Flyover", "HWY-FLY", "Pune", "Maharashtra"),
    (PROJ_3, "Alpha Premium Residences", "ALF-RES", "Delhi", "Delhi"),
]

for pid, name, code, city, state in project_data:
    proj = db.query(models.Project).filter(models.Project.id == pid).first()
    if not proj:
        proj = models.Project(
            id=pid,
            company_id=COMPANY_ID,
            name=name,
            code=code,
            city=city,
            state=state,
            status="Ongoing"
        )
        db.add(proj)
        db.commit()
        print(f"Seeded Project {name}.")

# Seed Budgets for Projects
for pid in [PROJ_1, PROJ_2, PROJ_3]:
    budget = db.query(models.ProjectBudget).filter(models.ProjectBudget.project_id == pid).first()
    if not budget:
        budget = models.ProjectBudget(
            id=uuid.uuid4(),
            project_id=pid,
            material_budget=5000000.0,
            labour_budget=2000000.0,
            subcon_budget=3000000.0,
            equipment_budget=1500000.0
        )
        db.add(budget)
        db.commit()
        print(f"Seeded Budget for Project {pid}.")

# Seed Employees
employees_data = [
    (uuid.UUID("e0000000-0000-0000-0000-000000000100"), "Ramesh Kumar", "EMP-001", "Site Engineer", "Civil", "+919876543210"),
    (uuid.UUID("e0000000-0000-0000-0000-000000000101"), "Suresh Patel", "EMP-002", "Carpenter", "Civil", "+919876543211"),
    (uuid.UUID("e0000000-0000-0000-0000-000000000102"), "Mohan Verma", "EMP-003", "Helper", "Civil", "+919876543212"),
    (uuid.UUID("e0000000-0000-0000-0000-000000000103"), "Dinesh Yadav", "EMP-004", "Electrician", "Electrical", "+919876543213"),
    (uuid.UUID("e0000000-0000-0000-0000-000000000104"), "Arjun Singh", "EMP-005", "Plumber", "Plumbing", "+919876543214"),
    (uuid.UUID("e0000000-0000-0000-0000-000000000105"), "Ravi Tiwari", "EMP-006", "Mason", "Civil", "+919876543215"),
    (uuid.UUID("e0000000-0000-0000-0000-000000000106"), "Santosh Rawat", "EMP-007", "Helper", "Civil", "+919876543216"),
    (uuid.UUID("e0000000-0000-0000-0000-000000000107"), "Vikram Joshi", "EMP-008", "Site Engineer", "Civil", "+919876543217"),
]

for eid, emp_name, code, desig, dept, phone in employees_data:
    emp = db.query(models.StaffEmployee).filter(models.StaffEmployee.id == eid).first()
    if not emp:
        emp = models.StaffEmployee(
            id=eid,
            company_id=COMPANY_ID,
            project_id=PROJ_1,
            name=emp_name,
            employee_code=code,
            designation=desig,
            department=dept,
            mobile=phone,
            status="active"
        )
        db.add(emp)
        db.commit()
        print(f"Seeded StaffEmployee {emp_name}.")

# Seed Inventory for Project 1 & 2
for pid in [PROJ_1, PROJ_2]:
    materials = [
        ("Cement", 1000.0, "bags"),
        ("Steel Rebar", 25.5, "MT"),
        ("Coarse Aggregate", 120.0, "m3"),
        ("River Sand", 85.0, "m3"),
        ("Bricks", 15000.0, "pcs"),
    ]
    for mat_name, qty, unit in materials:
        inv = db.query(models.WarehouseInventory).filter(
            models.WarehouseInventory.project_id == pid,
            models.WarehouseInventory.material_name == mat_name
        ).first()
        if not inv:
            inv = models.WarehouseInventory(
                id=uuid.uuid4(),
                project_id=pid,
                material_name=mat_name,
                on_hand_qty=qty,
                reserved_qty=0.0,
                unit=unit
            )
            db.add(inv)
            db.commit()
            print(f"Seeded Inventory {mat_name} for Project {pid}.")

# Seed BOQ and Tasks for Project 1 (Metro Terminal)
boq_rcc = db.query(models.BOQItem).filter(models.BOQItem.project_id == PROJ_1, models.BOQItem.section_name == "RCC").first()
if not boq_rcc:
    boq_rcc = models.BOQItem(
        id=uuid.uuid4(),
        project_id=PROJ_1,
        section_name="RCC",
        item_name="Reinforced Concrete Structure M25",
        unit="m3",
        quantity=1500.0,
        rate=5500.0
    )
    db.add(boq_rcc)
    db.commit()

# Seed Tasks for Project 1
tasks_data = [
    ("Site Mobilization", 10, "completed"),
    ("Piling Foundation", 30, "in_progress"),
    ("Slab Concrete Work", 20, "not_started"),
    ("Column Columns casting", 15, "not_started"),
]

for idx, (name, dur, status) in enumerate(tasks_data):
    task = db.query(models.Task).filter(models.Task.project_id == PROJ_1, models.Task.name == name).first()
    if not task:
        task = models.Task(
            id=uuid.UUID(f"d0000000-0000-0000-0000-00000000001{idx}"),
            project_id=PROJ_1,
            name=name,
            duration_days=dur,
            start_date=datetime.now() - timedelta(days=10),
            end_date=datetime.now() + timedelta(days=dur - 10),
            status=status,
            priority="high" if idx % 2 == 0 else "medium",
            boq_item_id=boq_rcc.id if name == "Slab Concrete Work" else None
        )
        db.add(task)
        db.commit()
        print(f"Seeded Task {name} for Project 1.")

# Seed CRM Leads
leads_data = [
    ("Vijay Malhotra", "+919810023456", "vijay@malhotraventures.com", "Malhotra Ventures", "Commercial complex estimation", 12000000.0, "Google"),
    ("Amit Skyline", "+919820034567", "amit@Skylinehomes.in", "Skyline Devs", "Luxury Villa construction", 8000000.0, "Reference"),
]

for contact, phone, email, client_company, desc, budget, source in leads_data:
    lead = db.query(models.CRMLead).filter(models.CRMLead.company_id == COMPANY_ID, models.CRMLead.contact_name == contact).first()
    if not lead:
        lead = models.CRMLead(
            id=uuid.uuid4(),
            company_id=COMPANY_ID,
            assignee_id=TEAM_ID,
            lead_type="Commercial" if budget > 10000000 else "Residential",
            contact_name=contact,
            phone_no=phone,
            email=email,
            client_company_name=client_company,
            address="Mumbai Outer, Maharashtra",
            source=source,
            category="Civil Work",
            budget=budget,
            description=desc,
            status="active"
        )
        db.add(lead)
        db.commit()
        print(f"Seeded CRM Lead {contact}.")

db.close()
print("Done seeding demo data!")
