import re
from rank_bm25 import BM25Okapi
from embedding.vector_store import semantic_rank

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

def hybrid_search(query_text: str, source: str | None = None, n: int = 2):
    semantic = semantic_rank(query_text, source)

    if not semantic:
        return [], []

    ids = [s[0] for s in semantic]
    docs_by_id = {s[0]: s[1] for s in semantic}
    dist_by_id = {s[0]: s[2] for s in semantic}
    source_by_id = {s[0]: s[3] for s in semantic}

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
    
    

    return [
        {
            "id": i,
            "text": docs_by_id[i],
            "source":source_by_id[i],
            "score": round(1 / (1 + dist_by_id[i]))
        }

        for i in top_ids
    ]

