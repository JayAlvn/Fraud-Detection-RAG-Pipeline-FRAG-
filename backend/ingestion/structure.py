"""Structural markers in legal/regulatory documents.

Recitals, articles and chapters are addressable by number, so queries like
"clause 148" can be answered by an exact metadata filter. This module locates
those markers in extracted text; the chunker turns them into boundaries.
"""
import re

# A recital marker sits alone on its line: "(148)".
_CLAUSE = re.compile(r"^\((\d{1,3})\)[ \t]*$", re.M)
_ARTICLE = re.compile(r"^Article (\d{1,3})[ \t]*$", re.M)
_CHAPTER = re.compile(r"^CHAPTER ([IVXLC]{1,7})[ \t]*$", re.M)


def _find_recitals(text: str) -> list[tuple[int, str, int]]:
    """Locate recital markers, skipping footnote markers.

    Footnote definitions are typographically identical once the PDF is
    flattened to text -- page 37 of the EU AI Act yields (144)...(148) for
    recitals and (44), (45) for footnotes, all alone on their own line.
    Recitals are what tells them apart: they run as one unbroken sequence
    from (1), so a marker only counts if it continues that run.
    """
    marks = []
    expected = 1
    for m in _CLAUSE.finditer(text):
        if int(m.group(1)) == expected:
            marks.append((m.start(), "recital", expected))
            expected += 1
    return marks


def find_markers(text: str) -> list[tuple[int, str, int | str]]:
    """Return (offset, kind, value) for every structural marker, in order."""
    marks = _find_recitals(text)
    marks += [(m.start(), "article", int(m.group(1))) for m in _ARTICLE.finditer(text)]
    marks += [(m.start(), "chapter", m.group(1)) for m in _CHAPTER.finditer(text)]
    marks.sort(key=lambda mark: mark[0])
    return marks
