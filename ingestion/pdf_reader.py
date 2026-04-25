from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from docx import Document


def load_pdf(path: str) -> str:
    reader = PdfReader(path)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text 

def load_docx(path: str) -> str:
    doc = Document(path)
    text = "\n".join(para.text for para in doc.paragraphs)
    return text



def load_txt(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as text:
        return text.read()
