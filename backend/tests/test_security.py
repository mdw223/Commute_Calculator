"""Tests for OAuth state and email allowlist."""

from app.config import Settings
from app.oauth_state import create_oauth_state, sign_oauth_state, verify_oauth_state


def test_oauth_state_round_trip():
    state = create_oauth_state()
    signed = sign_oauth_state(state)
    assert verify_oauth_state(signed, state) is True


def test_oauth_state_rejects_tampered_state():
    state = create_oauth_state()
    signed = sign_oauth_state(state)
    assert verify_oauth_state(signed, "wrong-state") is False


def test_allowed_emails_empty_allows_any():
    s = Settings(allowed_emails="")
    assert s.is_email_allowed("anyone@example.com") is True


def test_allowed_emails_restricts():
    s = Settings(allowed_emails="me@example.com, Other@Example.com ")
    assert s.is_email_allowed("me@example.com") is True
    assert s.is_email_allowed("other@example.com") is True
    assert s.is_email_allowed("stranger@example.com") is False
