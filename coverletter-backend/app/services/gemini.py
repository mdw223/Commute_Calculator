"""Cover-letter chat orchestration on top of the Gemini API (google-genai SDK).

The backend is stateless between requests, so each call rebuilds the full
message history from Postgres rather than relying on the SDK's in-memory
`client.chats` session object. Function calling is handled manually (not
"automatic function calling") because finalizing a cover letter requires
async I/O (rendering a .docx and uploading it to R2) that has to happen
between the model's function call and the response we send back.
"""

from google import genai
from google.genai import types

from app.config import settings

GENERATE_COVER_LETTER_TOOL = types.FunctionDeclaration(
    name="generate_cover_letter",
    description=(
        "Finalize and generate the cover letter document. Call this only once you "
        "have enough information: the target company name, the job title, and a "
        "complete, tailored cover letter body. Do not call this while you still "
        "need to ask the user a clarifying question."
    ),
    parameters={
        "type": "object",
        "properties": {
            "company_name": {
                "type": "string",
                "description": "The company the user is applying to.",
            },
            "job_title": {
                "type": "string",
                "description": "The job title/role being applied for.",
            },
            "hiring_manager": {
                "type": "string",
                "description": (
                    "Hiring manager's name if known from the job description, "
                    "otherwise 'Hiring Manager'."
                ),
            },
            "opening_paragraph": {
                "type": "string",
                "description": "The opening paragraph of the cover letter.",
            },
            "body_paragraphs": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "1-3 body paragraphs connecting the candidate's real background "
                    "(from the provided resume/profile) to the job requirements. "
                    "Never invent experience, employers, or skills not present in "
                    "the candidate background provided."
                ),
            },
            "closing_paragraph": {
                "type": "string",
                "description": "The closing paragraph (call to action, thanks).",
            },
            "sign_off": {
                "type": "string",
                "description": "Sign-off phrase, e.g. 'Sincerely'. No trailing comma.",
            },
        },
        "required": [
            "company_name",
            "job_title",
            "opening_paragraph",
            "body_paragraphs",
            "closing_paragraph",
        ],
    },
)

SYSTEM_INSTRUCTION_TEMPLATE = """You are Cover Letter Studio's writing assistant. You write \
honest, specific, and natural-sounding cover letters — never generic or robotic. You write \
only for this one candidate, described below.

CANDIDATE BACKGROUND (from their uploaded resume(s) and profile notes — this is the ONLY \
source of truth about their experience; never invent employers, titles, dates, or skills \
that are not present here):
---
{profile_context}
---

How to work:
1. Read the job description the user pastes in.
2. If you have enough information to write a strong, specific, tailored letter (you almost \
always do once you have the job description and the candidate background above), write it \
directly — do not ask unnecessary clarifying questions. Only ask a clarifying question in \
chat if something essential is truly missing or ambiguous (e.g. no job description was \
given at all, or the company name can't be determined).
3. When ready, call the `generate_cover_letter` function with the final content. Keep the \
tone confident and specific to this company/role — avoid generic filler like "I am a hard \
worker" without evidence. 3-4 short paragraphs total (opening + 1-3 body + closing) reads \
best.
4. If the user asks for edits after a letter was generated, incorporate the feedback and \
call `generate_cover_letter` again with the revised content.

Never fabricate facts about the candidate. If the resume/profile doesn't cover something the \
job description asks for, either omit it or speak to transferable experience that IS present \
in the background above — do not make things up.
"""


def _build_system_instruction(profile_context: str) -> str:
    return SYSTEM_INSTRUCTION_TEMPLATE.format(profile_context=profile_context or "(no profile provided yet)")


def _get_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


class GeminiTurnResult:
    def __init__(self, text: str | None, function_call: dict | None):
        self.text = text
        self.function_call = function_call


def run_chat_turn(
    *,
    profile_context: str,
    history: list[dict],
) -> GeminiTurnResult:
    """Send the full conversation to Gemini and return either a text reply or
    a `generate_cover_letter` function call.

    `history` is a list of {"role": "user"|"model", "text": str} dicts already
    converted from our stored Message rows (assistant -> "model").
    """
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = _get_client()
    contents = [
        types.Content(role=turn["role"], parts=[types.Part.from_text(text=turn["text"])])
        for turn in history
    ]

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=_build_system_instruction(profile_context),
            tools=[types.Tool(function_declarations=[GENERATE_COVER_LETTER_TOOL])],
            temperature=0.6,
        ),
    )

    candidate = response.candidates[0] if response.candidates else None
    if not candidate or not candidate.content or not candidate.content.parts:
        return GeminiTurnResult(text="Sorry, I couldn't generate a response. Please try again.", function_call=None)

    for part in candidate.content.parts:
        if part.function_call and part.function_call.name == "generate_cover_letter":
            return GeminiTurnResult(text=None, function_call=dict(part.function_call.args))

    return GeminiTurnResult(text=response.text, function_call=None)
