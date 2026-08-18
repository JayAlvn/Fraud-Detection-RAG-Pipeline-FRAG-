from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from embedding.vector_store import delete_document
from pipeline.pipeline import ingest, answer_query
from telemetry import snapshot
import os, shutil

app = FastAPI(title='IPS-RAG API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return{
        "status": "ok"
    }

@app.get("/stats")
def stats():
    return snapshot()

class QueryRequest(BaseModel):
    query: str
    mode: str = "basic"
    source: str | None = None
    n: int = 6

@app.post("/upload")
def upload(file: UploadFile = File(...)):

    os.makedirs("uploads", exist_ok=True)
    path = os.path.join("uploads", file.filename)

    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    count = ingest(path)

    return{
        "filename":file.filename,
        "chunks_indexed":count,
    }

@app.post("/query")
def query_endpoint(request: QueryRequest):
    return answer_query(request.query, request.mode, request.source, request.n)


@app.delete("/document/{doc_name}")
def delete_endpoint(doc_name: str):
    delete_document(doc_name)
    return {"deleted": doc_name}