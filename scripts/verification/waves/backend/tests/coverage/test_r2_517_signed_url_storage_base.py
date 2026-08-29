"""R2-517: create_signed_url must join Supabase's relative signedURL to the
storage API root (_base() = SUPABASE_URL + /storage/v1), not the project root.

Supabase returns a RELATIVE "/object/sign/<bucket>/<path>?token=..." signedURL.
Joining it to SUPABASE_URL drops /storage/v1, so every download 307s into a
Supabase 404 ("requested path is invalid"). The sign REQUEST was always correct
(_base()); only the response join was wrong.
"""

import app.supabase_storage as storage


class _FakeResp:
    status_code = 200

    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


def test_relative_signed_url_joins_storage_v1_base(monkeypatch):
    captured = {}

    def fake_post(url, **kw):
        captured["url"] = url
        return _FakeResp({"signedURL": "/object/sign/project-files/a1b2/f3c4?token=xyz"})

    monkeypatch.setattr(storage.requests, "post", fake_post)
    monkeypatch.setattr(storage, "SUPABASE_URL", "https://ujdx.supabase.co")

    url = storage.create_signed_url("project-files", "a1b2/f3c4")

    # The sign request itself targets the storage API root.
    assert captured["url"] == (
        "https://ujdx.supabase.co/storage/v1/object/sign/project-files/a1b2/f3c4"
    )
    # The returned URL must keep /storage/v1 (was SUPABASE_URL + relative => 404).
    assert url == (
        "https://ujdx.supabase.co/storage/v1/object/sign/project-files/a1b2/f3c4?token=xyz"
    )


def test_absolute_signed_url_passthrough_unchanged(monkeypatch):
    monkeypatch.setattr(
        storage.requests,
        "post",
        lambda url, **kw: _FakeResp({"signedURL": "https://other.example.com/object/sign/b/p?token=t"}),
    )
    monkeypatch.setattr(storage, "SUPABASE_URL", "https://ujdx.supabase.co")

    assert storage.create_signed_url("b", "p") == (
        "https://other.example.com/object/sign/b/p?token=t"
    )
