from app.services.calendar import _dedupe_events


def test_dedupe_events_by_ical_uid():
    events = [
        {"id": "a", "iCalUID": "shared-meeting", "summary": "Standup"},
        {"id": "b", "iCalUID": "shared-meeting", "summary": "Standup"},
        {"id": "c", "iCalUID": "other-meeting", "summary": "Lunch"},
    ]
    assert len(_dedupe_events(events)) == 2


def test_dedupe_events_without_ical_uid_uses_id():
    events = [
        {"id": "only-id-1", "summary": "A"},
        {"id": "only-id-1", "summary": "A duplicate"},
        {"id": "only-id-2", "summary": "B"},
    ]
    assert len(_dedupe_events(events)) == 2
