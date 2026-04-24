from pypdf import PdfReader
from docx import Document


def load_pdf(path: str) -> str:
    reader = PdfReader(path)
    return ' '.join

def load_docx(path: str) -> str:
    doc = Document(path)
    return ' '.join(para.text for para in doc.paragraphs)

def load_txt(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as text:
        return text.read()
