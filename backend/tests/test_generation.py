from generation.naive_backend import NaiveBackend

def test_naive_returns_correct_keys():

    fake_chunks = [
        "Architectural patterns describe subsystems.",
        "Components are independent units.",
        "A subsystem has no meaning beyond its context."
    ]

    result = NaiveBackend().generate("what is a component?", fake_chunks)

    assert isinstance(result, dict)
    assert "finding" in result
    assert "sources" in result
    assert "confidence" in result
    assert "mode" in result


def test_naive_mode_is_correct():
    result = NaiveBackend().generate("test", ["chunk_one"])
    assert result["mode"] == "semantic search (retrieval only)"

def test_naive_source_matches_input():
    chunks = ["first_chunk","second_chunk"]
    result = NaiveBackend().generate("test", chunks)
    assert result["sources"] == chunks

def test_naive_finding_contains_query():
    result = NaiveBackend().generate("What is a pattern", ["some text"])
    assert "What is a pattern" in result["finding"]


def test_naive_finding_contains_sources():
    result = NaiveBackend().generate("test", ["important text here"])
    assert "important text here" in result["finding"]