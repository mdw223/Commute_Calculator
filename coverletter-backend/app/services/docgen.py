"""Render generated cover-letter content into a .docx via docxtpl.

The LLM never produces a document directly — it produces structured text
fields (see app/services/gemini.py's function-calling tool), which are
rendered into `templates/cover_letter_default.docx`. This keeps formatting
consistent and under our control regardless of what the model outputs.
"""

import io
import pathlib
import re
from datetime import date
from typing import TypedDict

from docxtpl import DocxTemplate

TEMPLATES_DIR = pathlib.Path(__file__).resolve().parent.parent / "templates"

DEFAULT_TEMPLATE_KEY = "default"
TEMPLATE_FILES = {
    DEFAULT_TEMPLATE_KEY: TEMPLATES_DIR / "cover_letter_default.docx",
}


class CoverLetterContent(TypedDict):
    company_name: str
    job_title: str
    hiring_manager: str
    opening_paragraph: str
    body_paragraphs: list[str]
    closing_paragraph: str
    sign_off: str


def render_cover_letter_docx(
    *,
    content: CoverLetterContent,
    full_name: str,
    email: str,
    phone: str | None,
    location: str | None,
    template_key: str = DEFAULT_TEMPLATE_KEY,
) -> bytes:
    template_path = TEMPLATE_FILES.get(template_key, TEMPLATE_FILES[DEFAULT_TEMPLATE_KEY])
    tpl = DocxTemplate(str(template_path))
    context = {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "location": location,
        "date": date.today().strftime("%B %d, %Y").replace(" 0", " "),
        "hiring_manager": content.get("hiring_manager") or "Hiring Manager",
        "company_name": content.get("company_name") or "",
        "opening_paragraph": content.get("opening_paragraph", ""),
        "body_paragraphs": content.get("body_paragraphs") or [],
        "closing_paragraph": content.get("closing_paragraph", ""),
        "sign_off": content.get("sign_off") or "Sincerely",
    }
    tpl.render(context)
    buffer = io.BytesIO()
    tpl.save(buffer)
    return buffer.getvalue()


def build_filename(company_name: str | None, job_title: str | None) -> str:
    parts = [p for p in [job_title, company_name] if p]
    base = " - ".join(parts) if parts else "Cover Letter"
    safe = re.sub(r"[^A-Za-z0-9 _.-]", "", base).strip() or "Cover Letter"
    return f"Cover Letter - {safe}.docx"
