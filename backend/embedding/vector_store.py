import chromadb

from .embedder import embed_batch, embed_text

client = chromadb.PersistentClient(path='./chroma_db')
collection = client.get_or_create_collection('fraud_rag')


def store_chunks(chunks: list[str], doc_name: str):
    
    embeddings = embed_batch(chunks)
    ids = [f'{doc_name}_chunk_{i}' for i in range(len(chunks))]
    metadatas = [{"source": doc_name} for _ in chunks]

    collection.upsert(
        documents=chunks,
         embeddings=embeddings,
          ids=ids,
          metadatas = metadatas
    )

def query(query_text: str, n=1, source: str | None = None) -> list[str]:
    query_vector = embed_text(query_text)
    where = {"source": source} if source else None
    results = collection.query(query_embeddings=[query_vector], n_results=n, where=where)
    return results['documents'][0], results['distances'][0]

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
        include =["documents, distances, metadatas"],
    )
    return list(zip(
        results["ids"][0],
        results["documents"][0],
        results["distances"][0],
        results["metadata"][0],
    ))

def delete_document(doc_name: str):
    collection.delete(where={"source": doc_name})