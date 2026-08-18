import re
from rank_bm25 import BM25Okapi
from embedding.vector_store import semantic_rank, metadata_lookup

def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())

#Reciprocal Rank Fusion (rrf)
#k - a constant smoothing parameter or penalty factor
def _rrf(rank_list: list[list[str]], k: int = 60) -> dict:
    scores: dict[str, float] = {}
    for ranking in rank_list:
        for rank, _id in enumerate(ranking):
            scores[_id] = scores.get(_id, 0.0) + 1.0 / (k + rank)
    return scores

def hybrid_search(query_text: str, source: str | None = None, n: int = 6):
    semantic = semantic_rank(query_text, source)
    if not semantic:
        return [], [], []
    ids = [s[0] for s in semantic]
    docs_by_id = {s[0]: s[1] for s in semantic}
    dist_by_id = {s[0]: s[2] for s in semantic}
    meta_by_id = {s[0]: s[3] for s in semantic}

    semantic_order = ids
    corpus_tokens = [_tokenize(docs_by_id[i]) for i in ids]
    bm25 = BM25Okapi(corpus_tokens)
    bm25_scores = bm25.get_scores(_tokenize(query_text))
    bm25_order = [
        i for i, _ in sorted(zip(ids, bm25_scores),
                              key=lambda p: p[1], reverse=True)
    ]

    fused = _rrf([semantic_order, bm25_order])
    top_ids = sorted(fused, key=lambda i: fused[i], reverse=True)[:n]

    chunks = [docs_by_id[i] for i in top_ids]
    distances = [dist_by_id[i] for i in top_ids]
    metas = [meta_by_id[i] for i in top_ids]

    return chunks, distances, metas


# Words users reach for when naming a numbered part of a document, mapped to the
# metadata the chunker records. Ordered by how specific the answer is, 
_IDENTIFIER_FIELDS = (
    ("recital", ("clause", "recital")),
    ("article", ("article", "section")),
    ("page", ("page",)),
)

_IDENTIFIER = re.compile(
    r"\b(clause|recital|article|section|page)s?\.?\s*(?:no\.?\s*|number\s*)?(\d{1,4})\b",
    re.I,
)


def parse_identifier(query_text: str) -> list[tuple[str, int]]:
    """Extract (metadata field, number) pairs naming a part of the document.
    """
    found = {}
    for word, number in _IDENTIFIER.findall(query_text):
        word = word.lower()
        for field, aliases in _IDENTIFIER_FIELDS:
            if word in aliases:
                found.setdefault(field, int(number))

    return [(field, found[field]) for field, _ in _IDENTIFIER_FIELDS if field in found]


def route_search(query_text: str, source: str | None = None, n: int = 6):
    """Retrieve for a query, picking exact lookup over similarity when possible.
    """
    for field, number in parse_identifier(query_text):
        conditions = {field: number}
        if source:
            conditions["source"] = source

        chunks, metas = metadata_lookup(conditions, limit=n)
        if chunks:
            # Exact match on the requested identifier -- no similarity involved.
            return chunks, [0.0] * len(chunks), metas

    return hybrid_search(query_text, source=source, n=n)
