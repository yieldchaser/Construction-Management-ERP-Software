import datetime, uuid, pytest
from app import models

def _project(db, company):
    p = models.Project(id=uuid.uuid4(), company_id=company.id, name='WO_Edit_Proj', code=uuid.uuid4().hex[:6], status='Ongoing', state='Karnataka')
    db.add(p)
    db.commit()
    return p

def test_work_order_edit_recomputes_estimate(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name='WO_Comp', user_name='WO_User', mobile='+919888741111')
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)
    create_payload = {'company_id': str(comp.id), 'project_id': str(proj.id), 'subcontractor_id': str(team.id), 'wo_number': 'WO-EDIT-001', 'wo_date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'terms': 'Original Terms', 'items': [{'quantity': 10.0, 'rate': 100.0}, {'quantity': 5.0, 'rate': 200.0}]}
    r = client.post('/apis/v3/billing/work-orders', json=create_payload, headers=hdr)
    assert r.status_code == 201
    wo_id = r.json()['id']
    update_payload = {'subcontractor_id': str(team.id), 'wo_number': 'WO-EDIT-001-REV', 'wo_date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'terms': 'Updated Terms', 'items': [{'quantity': 20.0, 'rate': 150.0}, {'quantity': 10.0, 'rate': 50.0}]}
    r_put = client.put(f'/apis/v3/billing/work-orders/{wo_id}', json=update_payload, headers=hdr)
    assert r_put.status_code == 200
    updated = r_put.json()
    assert updated['wo_number'] == 'WO-EDIT-001-REV'
    assert updated['estimated_work_amount'] == 3500.0

def test_work_order_edit_billed_blocked(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name='WO_Comp2', user_name='WO_User2', mobile='+919888742222')
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)
    create_payload = {'company_id': str(comp.id), 'project_id': str(proj.id), 'subcontractor_id': str(team.id), 'wo_number': 'WO-BILLED-001', 'wo_date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'items': [{'quantity': 10.0, 'rate': 500.0}]}
    r = client.post('/apis/v3/billing/work-orders', json=create_payload, headers=hdr)
    assert r.status_code == 201
    wo_id = r.json()['id']
    bill_payload = {'company_id': str(comp.id), 'project_id': str(proj.id), 'party_company_user_id': str(team.id), 'invoice_number': 'INV-WO-1', 'invoice_date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'invoice_type': 'subcon', 'wo_id': str(wo_id), 'subtotal': 2000.0, 'gst_pct': 18.0}
    r_bill = client.post('/apis/v3/billing/bills', json=bill_payload, headers=hdr)
    assert r_bill.status_code == 201
    update_payload = {'subcontractor_id': str(team.id), 'wo_number': 'WO-BILLED-001', 'wo_date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'items': [{'quantity': 15.0, 'rate': 500.0}]}
    r_put = client.put(f'/apis/v3/billing/work-orders/{wo_id}', json=update_payload, headers=hdr)
    assert r_put.status_code == 409

def test_work_order_edit_cancelled_blocked(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name='WO_Comp3', user_name='WO_User3', mobile='+919888743333')
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)
    create_payload = {'company_id': str(comp.id), 'project_id': str(proj.id), 'subcontractor_id': str(team.id), 'wo_number': 'WO-CANCEL-001', 'wo_date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'items': [{'quantity': 10.0, 'rate': 100.0}]}
    r = client.post('/apis/v3/billing/work-orders', json=create_payload, headers=hdr)
    assert r.status_code == 201
    wo_id = r.json()['id']
    r_cancel = client.post(f'/apis/v3/billing/work-orders/{wo_id}/cancel', headers=hdr)
    assert r_cancel.status_code == 200
    update_payload = {'subcontractor_id': str(team.id), 'wo_number': 'WO-CANCEL-001', 'wo_date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'items': [{'quantity': 20.0, 'rate': 100.0}]}
    r_put = client.put(f'/apis/v3/billing/work-orders/{wo_id}', json=update_payload, headers=hdr)
    assert r_put.status_code == 409
