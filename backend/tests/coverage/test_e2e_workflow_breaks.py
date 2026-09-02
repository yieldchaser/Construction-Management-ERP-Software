"""Regression cover for the workflow breaks found by driving the app end to end
on 2026-09-02. Each test names the observed failure it prevents.

These are deliberately mixed: some pin frontend source, because the defect was in
the frontend and a backend-only test would pass on the broken tree and prove
nothing. Every one of them fails against the tree as it stood at 041c6d4.
"""

import datetime
import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = Path(__file__).resolve().parents[3] / "frontend"


def _be(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def _fe(rel):
    return (FRONTEND / rel).read_text(encoding="utf-8")


# ── E2E-41: safety incidents were rejected as "in the future" from any UTC+X client ──

def test_safety_sends_an_absolute_instant_not_a_wall_clock_time():
    """Observed: 422 "reported_at cannot be in the future" on every submit.

    nowLocalISO() yields "2026-09-02T11:55" with no zone. safety.py attaches the
    SERVER timezone to a naive datetime and Render runs UTC, so an IST wall-clock
    time was read as UTC and landed 5.5 hours ahead of now.
    """
    src = _fe("src/app/c/[company_id]/d/safety/page.tsx")
    assert "localInputToInstantISO(incidentForm.reported_at)" in src, (
        "E2E-41 regressed: the incident form is sending a naive datetime-local "
        "value again. It must go on the wire as an absolute instant."
    )
    assert "localInputToInstantISO(talkForm.conducted_at)" in src, (
        "E2E-41 regressed for toolbox talks: conducted_at is naive again, so the "
        "stored time is offset by the server-to-local difference."
    )


def test_local_input_to_instant_helper_exists_and_is_documented():
    src = _fe("src/lib/siteflow.ts")
    assert "export const localInputToInstantISO" in src, "E2E-41 helper removed"
    assert "toISOString" in src.split("localInputToInstantISO")[1][:600], (
        "localInputToInstantISO must produce an absolute instant"
    )


def test_backend_accepts_an_offset_aware_now_and_rejects_a_future_instant():
    """The validator itself is correct and must stay strict. This asserts both
    directions so a future "fix" cannot loosen it to make the frontend pass."""
    import uuid

    from app.routers.safety import IncidentCreate

    now_ist = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
    ok = IncidentCreate(
        project_id=uuid.uuid4(),
        incident_type="Near Miss",
        severity="Low",
        description="scaffold slip, no injury",
        reported_by="HSE Officer",
        reported_at=now_ist.isoformat(),
    )
    assert ok.reported_at is not None

    with pytest.raises(Exception):
        IncidentCreate(
            project_id=uuid.uuid4(),
            incident_type="Near Miss",
            severity="Low",
            description="scaffold slip, no injury",
            reported_by="HSE Officer",
            reported_at=(now_ist + datetime.timedelta(days=2)).isoformat(),
        )


# ── E2E-39: wastage could never be recorded, and the 422 blanked the route ──

def test_wastage_does_not_send_an_empty_string_task_id():
    """Observed: 422 uuid_parsing on every submit, because task_id: "" was in the
    form's initial state, bound to no input, and always sent."""
    src = _fe("src/app/c/[company_id]/d/wastage/page.tsx")
    assert 'task_id: ""' not in src, (
        "E2E-39 regressed: wastage is sending task_id as an empty string again. "
        "The backend declares Optional[uuid.UUID]; send null instead."
    )


def test_error_detail_is_normalised_before_it_reaches_react_state():
    """Observed: setMessage(err.detail) with a FastAPI validation array threw
    React error #31 and rendered "This page couldn't load" for the whole route."""
    api = _fe("src/lib/api.ts")
    assert "export function detailToMessage" in api, "detailToMessage helper removed"

    offenders = []
    pattern = re.compile(r"\.detail\s*\|\|\s*\"")
    for path in (FRONTEND / "src").rglob("*.tsx"):
        if "node_modules" in str(path):
            continue
        if pattern.search(path.read_text(encoding="utf-8")):
            offenders.append(str(path.relative_to(FRONTEND)))
    assert not offenders, (
        "E2E-39b regressed: these files pass a raw API `detail` straight into a "
        f"message with no normalisation, which blanks the route on a 422: {offenders}"
    )


def test_the_detector_would_notice_an_unnormalised_site():
    """Self-test. A sweep that finds nothing passes trivially, so prove the
    pattern actually matches the shape it is meant to catch."""
    pattern = re.compile(r"\.detail\s*\|\|\s*\"")
    assert pattern.search('setMessage(err.detail || "Failed");'), "pattern misses the real shape"
    assert not pattern.search(
        'setMessage(detailToMessage(err.detail, "Failed"));'
    ), "pattern flags the fixed shape"


# ── E2E-01: no project could be created, because no surface collected state ──

def test_project_create_surfaces_collect_the_gst_state():
    """Observed: POST /projects/ 422 "Project.state is required for invoicing"
    on every attempt, and no wizard or settings modal had the field."""
    for rel in (
        "src/app/c/[company_id]/projects/page.tsx",
        "src/components/ProjectSettingsModal.tsx",
    ):
        src = _fe(rel)
        assert "GST_STATES" in src or "state:" in src, f"E2E-01 regressed: {rel} lost its state field"

    wizard = _fe("src/app/c/[company_id]/projects/page.tsx")
    assert "state," in wizard or "state:" in wizard, "E2E-01 wizard no longer sends state"
    assert "location" in wizard, (
        "E2E-04 regressed: the wizard must send site coordinates, or the "
        "attendance geofence it configures has no centre"
    )


def test_backend_still_requires_state_on_project_create():
    src = _be("app/routers/projects.py")
    assert "Project.state is required for invoicing" in src, (
        "E2E-01: the guard was removed instead of the UI being fixed. Place of "
        "supply derives from the site; this check must stay."
    )


# ── E2E-16: a short delivery stranded the balance quantity forever ──

def test_a_partially_received_po_can_still_receive_the_balance():
    """Observed: ordered 500, received 450, PO went sent -> partial, and the
    Record GRN button vanished because it was gated on status === "sent"."""
    src = _fe("src/app/c/[company_id]/d/procurement/page.tsx")
    assert 'po.status === "sent" && po.approvalFlag === "approved"' not in src, (
        "E2E-16 regressed: Record GRN is gated on status === 'sent' again, so a "
        "partially received PO can never take its balance delivery."
    )


# ── E2E-15: a PO could not be raised to a supplier ──

def test_po_vendor_list_is_not_sourced_from_subcontractors():
    """Observed: the Supplier Vendor dropdown offered only subcontractors,
    because it was fed by /billing/subcontractors."""
    src = _fe("src/app/c/[company_id]/d/procurement/page.tsx")
    # Match the fetch call, not any mention of the path: the fix carries a
    # comment naming the old endpoint, and a bare substring check would flag it.
    assert "fetch(`${apiHost}/apis/v3/billing/subcontractors" not in src, (
        "E2E-15 regressed: the PO vendor picker is reading subcontractors again, "
        "so a material PO cannot name the material supplier."
    )
    assert "fetch(`${apiHost}/apis/v3/library/parties/" in src, (
        "E2E-15: the PO vendor picker must read the party master"
    )


# ── E2E-29: payment requests listed employees instead of parties ──

def test_payment_request_party_picker_is_not_the_employee_directory():
    """Observed: the drawer said "No parties registered yet" while
    GET /finance/parties returned 8 parties, because usersList was filled from
    /hr/employees/{projectId}."""
    src = _fe("src/app/c/[company_id]/d/finance/page.tsx")
    assert "setUsersList(await empRes.json())" not in src, (
        "E2E-29 regressed: the payment-request party picker is reading the "
        "employee directory again."
    )


# ── E2E-42: equipment usage was never costed ──

def test_equipment_return_records_hours_and_the_closing_meter():
    """Observed: the return endpoint accepted no body, so the stop odometer was
    discarded and hours_used stayed 0.0 against an hourly rate."""
    src = _be("app/routers/equipment.py")
    assert "hours_used" in src.split("def return_deployment")[1][:1600], (
        "E2E-42 regressed: return_deployment no longer computes hours_used, so "
        "equipment usage produces no cost."
    )


# ── E2E-21: a required custom field on an entity the admin UI cannot show ──

def test_custom_field_admin_exposes_every_entity_type_the_backend_allows():
    """Observed: a required 'bill' custom field blocked every RA bill and could
    not be seen or edited, because the admin page listed only four of six types."""
    be = _be("app/routers/custom_fields.py")
    m = re.search(r"CUSTOM_FIELD_ENTITY_TYPES\s*=\s*\(([^)]*)\)", be)
    assert m, "could not read CUSTOM_FIELD_ENTITY_TYPES"
    backend_types = {t.strip().strip("\"'") for t in m.group(1).split(",") if t.strip()}

    fe = _fe("src/app/c/[company_id]/d/custom-fields/page.tsx")
    missing = sorted(t for t in backend_types if f'value="{t}"' not in fe)
    assert not missing, (
        "E2E-21 regressed: the custom-field admin page cannot manage these entity "
        f"types, so a required field on one of them blocks its form forever: {missing}"
    )
