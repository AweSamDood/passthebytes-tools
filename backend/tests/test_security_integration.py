"""
Integration tests for security fixes in routers.
"""
import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from app.main import app

client = TestClient(app)


class TestPngToPdfSecurity:
    """Test security measures in PNG to PDF converter."""

    def test_path_traversal_in_filename(self):
        """Test that path traversal attempts in filename are blocked."""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Try to use a malicious filename with path traversal
        files = [("files", ("test.png", img_bytes, "image/png"))]
        data = {
            "dpi": 300,
            "filename": "../../etc/passwd"  # Malicious filename
        }
        
        response = client.post("/api/png-to-pdf/convert", files=files, data=data)
        
        # Should succeed but with sanitized filename
        assert response.status_code == 200
        # Check that the response filename is sanitized (no path traversal)
        content_disp = response.headers.get("content-disposition", "")
        assert ".." not in content_disp
        assert "/" not in content_disp
        # Should contain sanitized version
        assert "etc_passwd" in content_disp or "unnamed_file" in content_disp

    def test_command_injection_in_filename(self):
        """Test that command injection attempts in filename are blocked."""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Try to use a malicious filename with command injection
        files = [("files", ("test.png", img_bytes, "image/png"))]
        data = {
            "dpi": 300,
            "filename": "file;rm -rf /"  # Malicious filename
        }
        
        response = client.post("/api/png-to-pdf/convert", files=files, data=data)
        
        # Should succeed but with sanitized filename
        assert response.status_code == 200
        # Check that dangerous characters are removed
        content_disp = response.headers.get("content-disposition", "")
        assert ";" not in content_disp
        assert "rm" in content_disp or "file" in content_disp  # Should have sanitized parts

    def test_normal_filename_preserved(self):
        """Test that normal filenames are preserved correctly."""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        # Use a normal filename
        files = [("files", ("test.png", img_bytes, "image/png"))]
        data = {
            "dpi": 300,
            "filename": "my_normal_document"
        }
        
        response = client.post("/api/png-to-pdf/convert", files=files, data=data)
        
        # Should succeed
        assert response.status_code == 200
        # Check that normal filename is preserved
        content_disp = response.headers.get("content-disposition", "")
        assert "my_normal_document.pdf" in content_disp
