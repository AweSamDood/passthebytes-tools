import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_mocking_text_default():
    """Test mocking text with default settings"""
    response = client.post("/api/mocking-text", json={"text": "Hello World"})
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == "HeLlO wOrLd"


def test_mocking_text_start_with_lowercase():
    """Test mocking text starting with a lowercase letter"""
    response = client.post(
        "/api/mocking-text",
        json={"text": "Hello World", "start_with_lowercase": True},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == "hElLo WoRlD"


def test_mocking_text_empty_string():
    """Test mocking text with an empty string"""
    response = client.post("/api/mocking-text", json={"text": ""})
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == ""


def test_mocking_text_with_symbols():
    """Test mocking text with numbers and symbols"""
    response = client.post(
        "/api/mocking-text", json={"text": "ab#c"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["result"] == "Ab#C"
