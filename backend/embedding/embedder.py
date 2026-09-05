from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')

def embed_text(text: str) -> list[float]:
    return model.encode(text).tolist()

def embed_batch(batch_of_sentences: list[str]) -> list[list[float]]:
    return model.encode(batch_of_sentences).tolist()

