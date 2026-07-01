"""Parse Sweeps new-job notification emails."""

from __future__ import annotations

import email
import base64
import json
import re
from dataclasses import dataclass
from datetime import datetime
from email.message import Message
from urllib.parse import parse_qs, unquote, urlparse

from bs4 import BeautifulSoup


@dataclass
class ParsedSweepsJob:
    category: str | None
    details: str | None
    sweepers_requested: int | None
    start_at: datetime | None
    duration_minutes: int | None
    flexible_time: bool
    street: str | None
    city_state: str | None
    zip_code: str | None
    full_address: str | None
    job_url: str | None
    sweeps_job_id: str | None
    subject: str | None
    gmail_message_id: str | None


DATETIME_RE = re.compile(
    r"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*"
    r"(\d{2}/\d{2}/\d{2})\s+(\d{1,2}:\d{2}\s*[AP]M)",
    re.IGNORECASE,
)
DURATION_RE = re.compile(r"(\d+)\s*hr", re.IGNORECASE)
JOB_ID_RE = re.compile(r"/jobs/([a-f0-9]+)/", re.IGNORECASE)
SECTION_HEADERS = {"job poster", "what", "when", "where"}


def _decode_header(value: str | None) -> str | None:
    if not value:
        return None
    parts = email.header.decode_header(value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(part)
    return "".join(decoded)


def _get_html_part(msg: Message) -> str | None:
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        return None
    if msg.get_content_type() == "text/html":
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace")
    return None


def _is_section_header(row) -> str | None:
    cells = row.find_all("td")
    for cell in cells:
        style = str(cell.get("style", ""))
        if "#666" not in style:
            continue
        text = cell.get_text(" ", strip=True).lower()
        for header in SECTION_HEADERS:
            if header in text:
                return header
    return None


def _parse_table_fields(soup: BeautifulSoup) -> dict[str, str]:
    """Walk table rows; map bold labels to the next row's value within each section."""
    fields: dict[str, str] = {}
    current_section: str | None = None
    rows = soup.find_all("tr")

    for i, row in enumerate(rows):
        section = _is_section_header(row)
        if section:
            current_section = section
            continue

        cells = row.find_all("td")
        if not cells:
            continue

        label = cells[0].get_text(" ", strip=True)
        style = str(cells[0].get("style", ""))
        is_bold_label = "font-weight: bold" in style or "font-weight:bold" in style

        if is_bold_label and label and i + 1 < len(rows):
            value_row = rows[i + 1]
            value = value_row.get_text(" ", strip=True)
            if value and value.lower() != label.lower():
                key = f"{current_section}:{label.lower()}" if current_section else label.lower()
                fields[key] = value

    return fields


def _parse_datetime(text: str | None) -> datetime | None:
    if not text:
        return None
    match = DATETIME_RE.search(text)
    if not match:
        return None
    date_str, time_str = match.groups()
    for fmt in ("%m/%d/%y %I:%M%p", "%m/%d/%y %I:%M %p"):
        try:
            return datetime.strptime(f"{date_str} {time_str}", fmt)
        except ValueError:
            continue
    return None


def _parse_duration_minutes(text: str | None) -> int | None:
    if not text:
        return None
    match = DURATION_RE.search(text)
    if match:
        return int(match.group(1)) * 60
    return None


def _decode_mandrill_url(href: str) -> str | None:
    if "mandrillapp.com/track/click" not in href:
        return None
    payload = parse_qs(urlparse(href).query).get("p", [None])[0]
    if not payload:
        return None
    try:
        padded = payload + "=" * (-len(payload) % 4)
        outer = json.loads(base64.urlsafe_b64decode(padded))
        inner_raw = outer.get("p")
        if not isinstance(inner_raw, str):
            return None
        inner = json.loads(inner_raw)
        url = inner.get("url")
        return url if isinstance(url, str) else None
    except (json.JSONDecodeError, ValueError, TypeError):
        return None


def _resolve_href(href: str) -> str:
    href = unquote(href)
    return _decode_mandrill_url(href) or href


def _is_sweeps_job_url(url: str) -> bool:
    return "sweeps.jobs" in url and "/jobs/" in url


def _extract_job_url(soup: BeautifulSoup) -> str | None:
    view_job_url: str | None = None
    compete_url: str | None = None
    any_job_url: str | None = None

    for a in soup.find_all("a", href=True):
        text = a.get_text(" ", strip=True).lower()
        resolved = _resolve_href(a["href"])
        if not _is_sweeps_job_url(resolved):
            continue
        if text == "view job":
            view_job_url = resolved
            break
        if "/competes/" in resolved and compete_url is None:
            compete_url = resolved
        if any_job_url is None:
            any_job_url = resolved

    return view_job_url or compete_url or any_job_url


def _extract_job_id(url: str | None) -> str | None:
    if not url:
        return None
    match = JOB_ID_RE.search(url)
    return match.group(1) if match else None


def _parse_location(fields: dict[str, str], soup: BeautifulSoup) -> tuple[str | None, str | None, str | None]:
    street = fields.get("where:location")
    if street and street.lower() == "location":
        street = None

    location_values: list[str] = []
    in_where = False
    after_location = False
    for row in soup.find_all("tr"):
        section = _is_section_header(row)
        if section == "where":
            in_where = True
            continue
        if in_where and section and section != "where":
            break
        text = row.get_text(" ", strip=True)
        if in_where and text.lower() == "location":
            after_location = True
            continue
        if after_location and text and text.lower() != "location":
            if "view job" in text.lower():
                break
            location_values.append(text)

    if location_values:
        street = location_values[0] if len(location_values) > 0 else None
        city_state = location_values[1] if len(location_values) > 1 else None
        zip_code = location_values[2] if len(location_values) > 2 else None
        return street, city_state, zip_code

    return street, fields.get("where:raleigh, nc"), fields.get("where:27612")


def parse_sweeps_email(raw: bytes | str) -> ParsedSweepsJob:
    if isinstance(raw, str):
        raw = raw.encode("utf-8")
    msg = email.message_from_bytes(raw)
    subject = _decode_header(msg.get("Subject"))
    gmail_message_id = msg.get("Message-ID") or msg.get("Message-Id")

    html = _get_html_part(msg)
    if not html:
        raise ValueError("No HTML part found in email")

    soup = BeautifulSoup(html, "html.parser")
    fields = _parse_table_fields(soup)

    category = fields.get("what:category")
    details = fields.get("what:details")

    sweepers_text = fields.get("what:number of sweepers requested")
    sweepers_requested = None
    if sweepers_text and sweepers_text.isdigit():
        sweepers_requested = int(sweepers_text)

    start_text = None
    for row in soup.find_all("tr"):
        if row.get_text(strip=True) == "Start At":
            nxt = row.find_next_sibling("tr")
            if nxt:
                start_text = nxt.get_text(" ", strip=True)
                break

    start_at = _parse_datetime(start_text)
    duration_minutes = _parse_duration_minutes(start_text)

    when_details = fields.get("when:details", "")
    flexible_time = "flexible" in when_details.lower()

    street, city_state, zip_code = _parse_location(fields, soup)
    parts = [p for p in [street, city_state, zip_code] if p]
    full_address = ", ".join(parts) if parts else None

    job_url = _extract_job_url(soup)
    sweeps_job_id = _extract_job_id(job_url)

    return ParsedSweepsJob(
        category=category,
        details=details,
        sweepers_requested=sweepers_requested,
        start_at=start_at,
        duration_minutes=duration_minutes,
        flexible_time=flexible_time,
        street=street,
        city_state=city_state,
        zip_code=zip_code,
        full_address=full_address,
        job_url=job_url,
        sweeps_job_id=sweeps_job_id,
        subject=subject,
        gmail_message_id=gmail_message_id,
    )
