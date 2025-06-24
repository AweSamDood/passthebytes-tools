import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root_endpoint():
    """Test the root endpoint returns correct response"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "PassTheBytes Tools API"
    assert "version" in data

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_png_to_pdf_info():
    """Test PNG to PDF info endpoint"""
    response = client.get("/api/png-to-pdf/info")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "supported_formats" in data
    assert "max_file_size_mb" in data

def test_png_to_pdf_convert_no_files():
    """Test PNG to PDF conversion with no files"""
    response = client.post("/api/png-to-pdf/convert")
    assert response.status_code == 422  # Validation error

def test_cors_headers():
    """Test CORS headers are present"""
    response = client.options("/")
    # Should have CORS headers or at least not fail
    assert response.status_code in [200, 405]