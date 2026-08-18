import chromadb

from .embedder import embed_batch, embed_text

client = chromadb.PersistentClient(path='./chroma_db')
collection = client.get_or_create_collection(
    'fraud_rag',
    metadata={"hnsw:space": "cosine"},
)

# Location keys a chunk may carry; absent ones are left out entirely,
# since Chroma rejects None metadata values.
_LOCATION_KEYS = ("page", "recital", "article", "chapter")


def embed_and_store_chunks(chunks: list[str] | list[dict], doc_name: str):

    texts = [c["text"] if isinstance(c, dict) else c for c in chunks]
    metadatas = [
        {"source": doc_name,
         **({k: c[k] for k in _LOCATION_KEYS if k in c} if isinstance(c, dict) else {})}
        for c in chunks
    ]

    embeddings = embed_batch(texts)
    ids = [f'{doc_name}_chunk_{i}' for i in range(len(texts))]

    collection.delete(where={"source": doc_name})

    collection.upsert(
        documents=texts,
         embeddings=embeddings,
          ids=ids,
          metadatas = metadatas
    )

def query(query_text: str, n=2, source: str | None = None) -> list[str]:
    query_vector = embed_text(query_text)
    where = {"source": source} if source else None
    results = collection.query(query_embeddings=[query_vector], n_results=n, where=where)
    return results['documents'][0], results['distances'][0]

def _where_all(conditions: dict) -> dict:
    """Chroma accepts a bare {key: value} only for a single condition."""
    clauses = [{key: {"$eq": value}} for key, value in conditions.items()]
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


def _chunk_index(chunk_id: str) -> int:
    """Sort key recovering position from the '{doc}_chunk_{i}' id."""
    tail = chunk_id.rsplit("_chunk_", 1)[-1]
    return int(tail) if tail.isdigit() else 0


def metadata_lookup(conditions: dict, limit: int = 6) -> tuple[list[str], list[dict]]:
    """Documents matching an exact filter, plus their metadata, in document order."""
    if not conditions:
        return [], []

    data = collection.get(where=_where_all(conditions),
                          include=["documents", "metadatas"])
    ordered = sorted(zip(data["ids"], data["documents"], data["metadatas"]),
                     key=lambda row: _chunk_index(row[0]))[:limit]
    return [row[1] for row in ordered], [row[2] for row in ordered]


def get_all_chunks(source: str | None = None):

    where = {"source": source} if source else None
    data = collection.get(where=where, include=['documents'])

    return data["ids"], data["documents"]


def semantic_rank(query_text: str, source: str | None = None):
    ids_all, _ = get_all_chunks(source)
    total = len(ids_all)
    if total == 0:
        return []

    query_vector = embed_text(query_text)

    where  = {"source": source} if source else None

    results = collection.query(
        query_embeddings = [query_vector],
        n_results = total,
        where=where,
        include =["documents", "distances", "metadatas"],
    )
    return list(zip(
        results["ids"][0],
        results["documents"][0],
        results["distances"][0],
        results["metadatas"][0],
    ))

def delete_document(doc_name: str):
    collection.delete(where={"source": doc_name})