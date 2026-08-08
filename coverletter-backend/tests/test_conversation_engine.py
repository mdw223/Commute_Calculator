from types import SimpleNamespace

from app.models import MessageRole
from app.services.conversation_engine import _compose_letter_text, _history_for_gemini


def _msg(role: MessageRole, content: str):
    return SimpleNamespace(role=role, content=content)


def test_history_for_gemini_maps_roles():
    messages = [
        _msg(MessageRole.USER, "Here is the job description"),
        _msg(MessageRole.ASSISTANT, "Here is your letter"),
    ]
    history = _history_for_gemini(messages)
    assert history == [
        {"role": "user", "text": "Here is the job description"},
        {"role": "model", "text": "Here is your letter"},
    ]


def test_history_for_gemini_skips_system_messages():
    messages = [
        _msg(MessageRole.SYSTEM, "internal note"),
        _msg(MessageRole.USER, "hello"),
    ]
    history = _history_for_gemini(messages)
    assert history == [{"role": "user", "text": "hello"}]


def test_history_for_gemini_caps_length():
    messages = [_msg(MessageRole.USER, str(i)) for i in range(100)]
    history = _history_for_gemini(messages)
    assert len(history) == 40
    assert history[-1]["text"] == "99"


def test_compose_letter_text_joins_paragraphs():
    content = {
        "opening_paragraph": "Opening.",
        "body_paragraphs": ["Body one.", "Body two."],
        "closing_paragraph": "Closing.",
    }
    text = _compose_letter_text(content)
    assert text == "Opening.\n\nBody one.\n\nBody two.\n\nClosing."


def test_compose_letter_text_handles_missing_fields():
    assert _compose_letter_text({}) == ""
