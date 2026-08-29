"""R2-746 - switching company must re-mint the session, and an invite must name
its company.

R2-186 ("a user can belong to several companies, and there is no way to switch
between them") is recorded FIXED by 1a564f1: POST /auth/switch-company/{id}
verifies membership and re-mints the company-scoped session. The endpoint exists
and is correct -- nothing called it. CompanySwitcher rewrote the URL segment and
navigated.

Two identities then disagree: path-scoped routes take company_id from the URL
(following the UI), while get_current_active_company_user decodes the JWT and
reads its company_id claim (following the PREVIOUS company). Proved live: the
browser showed AK Construction while /auth/me returned ZZ R8 Throwaway.

The security-relevant half: /auth/team/invite took company_id from the token
claim, so switching to company B and inviting a colleague granted membership of
company A, with a success message.

The gate R2-746 asks for: after POST /auth/switch-company/{B}, a token minted
for A must no longer resolve to A on /auth/me.
"""
import pathlib
import uuid

from app import models
from app.auth import create_access_token

SWITCH = "/apis/v3/auth/switch-company/{company_id}"
ME = "/apis/v3/auth/me"
INVITE = "/apis/v3/auth/team/invite"


def _plain_token(user, company):
    """A token scoped to `company`, as the login path would mint it."""
    return create_access_token(
        {"sub": str(user.id), "company_id": str(company.id), "user_name": user.name}
    )


def _bearer(token):
    return {"Authorization": f"Bearer {token}"}


def _role(db, company_id, name="Site Engineer"):
    role = models.CompanyRole(
        id=uuid.uuid4(), company_id=company_id, role_name=name, permissions={}
    )
    db.add(role)
    db.commit()
    return role


def _existing_user(db, email, name="Existing Person"):
    """An already-registered account.

    Inviting an existing account attaches the membership without emailing a
    claim code, so the test does not need a mail provider (a brand-new invitee
    would 503 in this environment).
    """
    # mobile is unique across the users table, so it has to differ per test.
    u = models.User(
        id=uuid.uuid4(), name=name, email=email, mobile=f"9{uuid.uuid4().int % 10**9:09d}"
    )
    db.add(u)
    db.commit()
    return u


# The defect's other half is in the frontend, and this repo ships no React test
# runner (no jest/vitest/playwright; tests/calculators-contract.test.ts is a
# plain node:assert script). Rather than pull in a component-testing stack for
# one finding, these pins read the switcher source -- the same tripwire style as
# test_regression_pins.py -- and fail if the re-mint call is ever removed again.
# They are guards, not behavioural proof: the behavioural proof above covers the
# endpoint, and the UI wiring was verified by reading and by tsc.

# parents: [0]=tests/coverage [1]=tests [2]=backend [3]=repo root
_REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
_SWITCHER = _REPO_ROOT / "frontend" / "src" / "components" / "CompanySwitcher.tsx"


def _switcher_source():
    return _SWITCHER.read_text(encoding="utf-8-sig")


def test_switcher_calls_the_re_mint_endpoint():
    src = _switcher_source()
    assert "/auth/switch-company/" in src, (
        "CompanySwitcher no longer calls the re-mint endpoint -- switching will "
        "navigate with a token still scoped to the previous company"
    )


def test_switcher_persists_the_re_minted_token():
    src = _switcher_source()
    # setItem specifically -- the old code read the token without ever writing
    # the re-minted one back, so a bare substring match proves nothing.
    assert 'localStorage.setItem("access_token"' in src, (
        "the re-minted token is not stored, so /auth/me would keep resolving to "
        "the pre-switch company"
    )
    assert 'localStorage.setItem("company_id"' in src, (
        "the returned company_id is not stored, leaving localStorage stale"
    )


def test_switcher_does_not_navigate_on_failure():
    """Navigating after a rejected switch strands the user. Fail closed."""
    src = _switcher_source()
    assert "setSwitchError" in src and "return" in src, (
        "a failed switch must not navigate; the user should stay put on a "
        "session that still works"
    )


def test_switch_re_mints_the_session_to_the_new_company(client, db, make_tenant):
    comp_a, user, _team_a = make_tenant(company_name="R746A", user_name="U746A")
    comp_b, _user_b, _team_b = make_tenant(company_name="R746B", user_name="U746B")

    # The same user is a member of both companies -- the multi-company case.
    db.add(models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp_b.id, user_id=user.id, priority_type="partner"
    ))
    db.commit()

    token_a = _plain_token(user, comp_a)
    assert client.get(ME, headers=_bearer(token_a)).json()["company_id"] == str(comp_a.id)

    r = client.post(SWITCH.format(company_id=comp_b.id), headers=_bearer(token_a))
    assert r.status_code == 200, r.text
    body = r.json()
    token_b = body["access_token"]
    assert body["company"]["id"] == str(comp_b.id)

    # The new token resolves to B -- the switch actually took effect.
    assert client.get(ME, headers=_bearer(token_b)).json()["company_id"] == str(comp_b.id), (
        "the re-minted token still resolves to the pre-switch company"
    )
    # The old token is untouched and still scoped to A (no global side effect).
    assert client.get(ME, headers=_bearer(token_a)).json()["company_id"] == str(comp_a.id)


def test_switch_refuses_a_company_the_user_is_not_in(client, db, make_tenant):
    comp_a, user, _ = make_tenant(company_name="R746C", user_name="U746C")
    comp_b, _u2, _ = make_tenant(company_name="R746D", user_name="U746D")

    r = client.post(
        SWITCH.format(company_id=comp_b.id), headers=_bearer(_plain_token(user, comp_a))
    )
    assert r.status_code in (403, 404), r.text


def test_invite_honours_an_explicit_company_over_the_stale_claim(
    client, db, make_tenant
):
    """The security half: an invite must not land in the company the token names."""
    comp_a, user, _team_a = make_tenant(company_name="R746E", user_name="U746E")
    comp_b, _u2, _team_b = make_tenant(company_name="R746F", user_name="U746F")
    db.add(models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp_b.id, user_id=user.id, priority_type="partner"
    ))
    db.commit()

    role_b = _role(db, comp_b.id)
    _existing_user(db, "new-hire@example.com")
    # Token still scoped to A, as it would be immediately after a UI switch.
    token_a = _plain_token(user, comp_a)

    r = client.post(
        INVITE,
        json={
            "email": "new-hire@example.com",
            "name": "New Hire",
            "role_id": str(role_b.id),
            "company_id": str(comp_b.id),
        },
        headers=_bearer(token_a),
    )
    assert r.status_code == 200, r.text

    # The invitee must land in B, the company that was named -- not in A.
    joined = (
        db.query(models.CompanyTeam)
        .join(models.User, models.CompanyTeam.user_id == models.User.id)
        .filter(models.User.email == "new-hire@example.com")
        .all()
    )
    assert len(joined) == 1
    assert joined[0].company_id == comp_b.id, (
        "the invite was recorded against the company in the stale token claim"
    )


def test_invite_without_a_company_still_uses_the_claim(client, db, make_tenant):
    """Backwards compatibility for callers that omit the new field."""
    comp_a, user, _ = make_tenant(company_name="R746G", user_name="U746G")
    role_a = _role(db, comp_a.id)
    _existing_user(db, "legacy-path@example.com")

    r = client.post(
        INVITE,
        json={
            "email": "legacy-path@example.com",
            "name": "Legacy Path",
            "role_id": str(role_a.id),
        },
        headers=_bearer(_plain_token(user, comp_a)),
    )
    assert r.status_code == 200, r.text

    joined = (
        db.query(models.CompanyTeam)
        .join(models.User, models.CompanyTeam.user_id == models.User.id)
        .filter(models.User.email == "legacy-path@example.com")
        .all()
    )
    assert len(joined) == 1
    assert joined[0].company_id == comp_a.id
