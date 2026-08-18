import pytest
from pathlib import Path
from pipeline.pipeline import run_pipeline

FIXTURE = Path(__file__).parent / "fixtures" / "Architecture.pdf"


@pytest.mark.skipif(not FIXTURE.exists(), reason="fixture not present")
def test_pipeline_naive_returns_dict():
    result = run_pipeline(str(FIXTURE), "What is an architectural pattern?", mode="naive")
    
    assert isinstance(result, dict)
    assert result["mode"] == "semantic search (retrieval only)"
    assert len(result["sources"]) > 0

    

@pytest.mark.skipif(not FIXTURE.exists(), reason="fixture not present")
def test_pipeline_naive_sources_are_strings():
    result = run_pipeline(str(FIXTURE), "what is a component?", mode="naive")
    assert all(isinstance(s, str) for s in result["sources"])





