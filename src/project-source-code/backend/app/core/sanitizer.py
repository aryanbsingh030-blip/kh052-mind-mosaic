"""
AI Skill Exchange — Input Sanitization and XSS / Prompt Injection Protection
Provides text sanitization against Cross-Site Scripting (XSS) and AI prompt injection.
"""

import re
import html
from typing import Optional

# Regex patterns for dangerous HTML/JavaScript tags and attributes
_HTML_TAG_PATTERN = re.compile(r"<\s*(script|iframe|object|embed|style|meta|link|svg|applet)[^>]*>.*?(</\s*\1\s*>)?", re.IGNORECASE | re.DOTALL)
_STRIP_TAGS_PATTERN = re.compile(r"<[^>]+>")
_DANGEROUS_ATTRIBUTES = re.compile(r"""(on\w+|javascript:|data:|vbscript:)\s*=\s*['"][^'"]*['"]""", re.IGNORECASE)
_DANGEROUS_PROTOCOLS = re.compile(r"(javascript|vbscript|data):", re.IGNORECASE)

# Common prompt injection patterns attempting instruction hijack
_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior)\s+(instructions|prompts)", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in\s+)?(developer|god|sudo|jailbreak|admin)\s+mode", re.IGNORECASE),
    re.compile(r"system\s*:\s*(you\s+must|override|execute)", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?guidelines", re.IGNORECASE),
    re.compile(r"(transfer|award|give)\s+(me\s+)?\d+\s+credits", re.IGNORECASE),
    re.compile(r"execute\s+(code|command|shell|script)", re.IGNORECASE),
]


def sanitize_text(text: Optional[str]) -> str:
    """
    Sanitize text against stored and reflected XSS attacks.
    Escapes HTML special characters and strips dangerous script tags and event handlers.
    """
    if not text:
        return ""

    # 1. Remove dangerous script/iframe tags
    cleaned = _HTML_TAG_PATTERN.sub("", text)

    # 2. Remove dangerous inline attributes (onclick, onload, javascript:)
    cleaned = _DANGEROUS_ATTRIBUTES.sub("", cleaned)
    cleaned = _DANGEROUS_PROTOCOLS.sub("", cleaned)

    # 3. Strip any remaining raw HTML tags
    cleaned = _STRIP_TAGS_PATTERN.sub("", cleaned)

    # 4. Escape special HTML characters to ensure safe rendering
    return html.escape(cleaned.strip())


def sanitize_prompt_input(text: Optional[str], max_length: int = 4000) -> str:
    """
    Neutralize prompt injection attempts in free-form user text prior to passing to AI models.
    Truncates excessive payloads and defuses instruction hijack signatures.
    """
    if not text:
        return ""

    # Truncate to maximum acceptable prompt length
    cleaned = text.strip()[:max_length]

    # Neutralize instruction hijack markers
    for pattern in _INJECTION_PATTERNS:
        cleaned = pattern.sub("[defused-instruction]", cleaned)

    # Strip dangerous control characters
    cleaned = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", cleaned)

    return cleaned
