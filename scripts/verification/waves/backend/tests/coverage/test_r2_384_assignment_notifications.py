"""R2-384: five kinds of assignment existed and nothing could ever reach the
person assigned — the only mailer use was the marketing contact form.

Pins the shared outbound-signal capability mailer.py now provides:

  - resolve_assignment_recipients maps every assignment shape (company_team
    ids, bare user ids, ApprovalRule.approvers emails/names) to concrete
    addresses, fail-closed: no email on the member, or an entry that matches
    no member, contributes nothing;
  - notify_recipients fans out one notification best-effort — deduped,
    silent no-op when no transport is configured, and a single unreachable
    recipient never breaks the rest.
"""
import uuid

from app import mailer, models


def _seed_company(db):
    company = models.Company(id=uuid.uuid4(), name="R2-384 Co", currency_decimal_places=2)
    db.add(company)
    db.flush()

    def member(name, email):
        user = models.User(id=uuid.uuid4(), name=name, email=email)
        db.add(user)
        db.flush()
        team = models.CompanyTeam(
            id=uuid.uuid4(), company_id=company.id, user_id=user.id, priority_type="employee"
        )
        db.add(team)
        db.flush()
        return user, team

    emailed, emailed_team = member("Asha Rao", "asha@r2384.test")
    named, named_team = member("Bo", "bo@r2384.test")
    silent, silent_team = member("No Mail", None)  # member without any email
    rule = models.ApprovalRule(
        company_id=company.id,
        feature_type="Payment Request",
        min_amount=0,
        max_amount=None,
        levels=1,
        approvers="ASHA@r2384.test, Bo, stranger@nowhere.test",
    )
    db.add(rule)
    db.commit()
    return company, (emailed, emailed_team), (named, named_team), (silent, silent_team)


def test_resolve_assignment_recipients_covers_every_assignment_shape(db):
    company, (emailed, emailed_team), (named, _), (silent, silent_team) = _seed_company(db)

    recipients = mailer.resolve_assignment_recipients(
        db,
        company_id=company.id,
        team_ids=[emailed_team.id, silent_team.id],  # Task/NCR/lead/pin-style ids
        user_ids=[named.id],                         # NCR.assigned_to stores users.id
        approvers_csv=rule_approvers(db, company.id),
    )

    # Email-less member skipped, unknown approver dropped, duplicates collapsed.
    assert [r.lower() for r in recipients] == ["asha@r2384.test", "bo@r2384.test"]


def rule_approvers(db, company_id):
    return (
        db.query(models.ApprovalRule)
        .filter(models.ApprovalRule.company_id == company_id)
        .first()
        .approvers
    )


def test_notify_recipients_dedupes_and_delivers_once_per_address(db, monkeypatch):
    sent = []
    monkeypatch.setattr(mailer, "is_configured", lambda: True)
    monkeypatch.setattr(
        mailer, "send_email", lambda addr, subject, body, reply_to=None: sent.append(addr)
    )

    delivered = mailer.notify_recipients(
        [" Asha@r2384.test ", "", "asha@r2384.test", "bo@r2384.test"],
        "You have been assigned",
        "A task now has your name on it.",
    )

    assert delivered == 2
    assert sorted(a.lower() for a in sent) == ["asha@r2384.test", "bo@r2384.test"]


def test_notify_recipients_degrades_without_transport_and_swallows_failures(monkeypatch):
    called = []
    monkeypatch.setattr(mailer, "is_configured", lambda: False)
    monkeypatch.setattr(mailer, "send_email", lambda *a, **k: called.append(a))

    assert mailer.notify_recipients(["asha@r2384.test"], "s", "b") == 0
    assert called == []

    monkeypatch.setattr(mailer, "is_configured", lambda: True)

    def flaky(addr, subject, body, reply_to=None):
        if addr == "dead@r2384.test":
            raise RuntimeError("Email provider request failed")

    monkeypatch.setattr(mailer, "send_email", flaky)
    assert (
        mailer.notify_recipients(["dead@r2384.test", "alive@r2384.test"], "s", "b") == 1
    )
