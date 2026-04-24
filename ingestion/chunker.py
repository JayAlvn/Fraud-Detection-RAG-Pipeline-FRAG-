from langchain_text_splitters import RecursiveCharacterTextSplitter

def chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size =500, #max no of chars per chunk
        chunk_overlap=50, # repeating the last 50 tokens of each chunk at the start of the next one
        separators=['\n\n', '\n', '.', '']
    )

    return splitter.split_text(text)