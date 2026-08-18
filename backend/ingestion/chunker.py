from bisect import bisect_right
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ingestion.cleaner import clean_text
from ingestion.structure import find_markers

CHUNK_SIZE = 500   # max no of chars per chunk
CHUNK_OVERLAP = 50  # repeating the last 50 tokens of each chunk at the start of the next one
_MIN_MARKERS = 3

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=['\n\n', '\n', '.', ' ']
)


def chunk_text(text: str) -> list[str]:
    return _splitter.split_text(text)


def _stitch(pages: list[tuple[int, str]]) -> tuple[str, list[int], list[int]]:
    texts, starts, numbers = [], [], []
    offset = 0
    for number, raw in pages:
        cleaned = clean_text(raw)
        texts.append(cleaned)
        starts.append(offset)
        numbers.append(number)
        offset += len(cleaned) + 1  # +1 for the joining newline
    return "\n".join(texts), starts, numbers


def _emit(text: str, start: int, page_of, labels: dict) -> list[dict]:
    pieces = [text] if len(text) <= CHUNK_SIZE else _splitter.split_text(text)

    chunks, cursor = [], 0
    for piece in pieces:
        if not piece.strip():
            continue
        found = text.find(piece[:60], cursor)
        if found >= 0:
            cursor = found
        chunks.append({"text": piece, "page": page_of(start + cursor), **labels})
    return chunks


def chunk_document(pages: list[tuple[int, str]]) -> list[dict]:
    """Chunk a paginated document into dicts of text plus location metadata."""
    text, page_starts, page_numbers = _stitch(pages)
    if not text.strip():
        return []

    def page_of(offset: int) -> int:
        return page_numbers[bisect_right(page_starts, offset) - 1]

    markers = find_markers(text)
    if len(markers) < _MIN_MARKERS:
        return _emit(text, 0, page_of, {})

    chunks = []
    chapter = None
    # Text ahead of the first marker (cover, table of contents) is still content.
    if text[:markers[0][0]].strip():
        chunks += _emit(text[:markers[0][0]], 0, page_of, {})

    for i, (start, kind, value) in enumerate(markers):
        end = markers[i + 1][0] if i + 1 < len(markers) else len(text)

        if kind == "chapter":
            chapter = value
            labels = {"chapter": value}
        elif kind == "article":
            labels = {"article": value}
            if chapter:
                labels["chapter"] = chapter
        else:  # recital -- these precede the enacting part, so no chapter applies
            labels = {"recital": value}

        chunks += _emit(text[start:end], start, page_of, labels)

    return chunks
