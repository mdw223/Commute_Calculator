from datetime import datetime
from pathlib import Path

import pytest

from app.parsers.sweeps import parse_sweeps_email

FIXTURE = Path(__file__).parent / "fixtures" / "sample_sweeps_email.eml"


def test_parse_sweeps_email_fixture():
    raw = FIXTURE.read_bytes()
    job = parse_sweeps_email(raw)

    assert job.category == "Yard Work"
    assert "dig a hole" in (job.details or "")
    assert job.sweepers_requested == 1
    assert job.start_at == datetime(2026, 7, 1, 11, 0)
    assert job.duration_minutes == 180
    assert job.flexible_time is True
    assert job.street == "Lead Mine Road"
    assert job.city_state == "Raleigh, NC"
    assert job.zip_code == "27612"
    assert job.full_address == "Lead Mine Road, Raleigh, NC, 27612"
    assert job.sweeps_job_id == "7c8197ab"
    assert job.gmail_message_id == "<test-message-id@sweeps.jobs>"
    assert "Sweeps" in (job.subject or "")


def test_parse_requires_html():
    with pytest.raises(ValueError, match="No HTML"):
        parse_sweeps_email(b"Subject: test\n\nplain only")
