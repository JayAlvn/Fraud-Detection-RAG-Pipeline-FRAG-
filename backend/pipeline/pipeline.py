import os

from ingestion import load_document, chunk_text, clean_text
from embedding.vector_store import store_chunks, query

from retrieval.hybrid import hybrid_search

from generation.naive_backend import NaiveBackend
from generation.basic_backend import BasicBackend

BACKENDS = {
    "naive": NaiveBackend(),
    "basic": BasicBackend()
}


ABSTENTION_MARKERS = (
    "does not provide", "not enough information", "cannot determine",
    "no explicit mention", "don't know", "do not know", "insufficient",
    "unable to", "no information", "not mentioned", "not specified",
    "cannot assess", "more specific information", "no clear indication",
)

def ingest(doc_path: str) -> int: 
    text = load_document(doc_path)
    text = clean_text(text)
    chunks = chunk_text(text)
    doc_name = os.path.basename(doc_path)

    store_chunks(chunks, doc_name)

    return len(chunks)


def _calculate_relevance_score(distance: float) -> float:
    return round (1 / (1 + distance), 3)


def _calculate_confidence_score(relevance_scores: list[float], finding_text: str) -> int:
    if not relevance_scores:
        return 0
    top = max(relevance_scores)
    avg = sum(relevance_scores) / len(relevance_scores)

    evidence = 0.6 * top  + 0.4 * avg
    
    if any (m in (finding_text or "").lower() for m in ABSTENTION_MARKERS):
        evidence *= 0.5
    
    return round (evidence * 100)

def _confidence_level(score: int) -> int:
    if score is None:
        return "low"
    if score >= 70:
        return "high"
    if score >= 40:
        return "probable"
    return "low"


def answer_query(user_query: str, mode: str = "basic", source: str | None = None) -> dict:
    if mode not in BACKENDS:
        raise ValueError(f"Unknown mode: {mode}")

    top_chunks, distances = hybrid_search(user_query, source=source, n=2)

    result = BACKENDS[mode].generate(user_query, top_chunks)

    relevance_score = [_calculate_relevance_score(d) for d in distances]

    result["retrieval"] = [
        {"source": f"Source {i + 1}", "score": s}
        for i, s in enumerate(relevance_score)
    ]

    confidence = _calculate_confidence_score(relevance_score, result.get("finding",""))
    result["confidence"] = confidence
    result["confidence_level"] = _confidence_level(confidence)

    return result
 

def run_pipeline(doc_path: str, user_query: str,  mode: str="basic") -> dict:
    ingest(doc_path)
    return answer_query(user_query, mode)


