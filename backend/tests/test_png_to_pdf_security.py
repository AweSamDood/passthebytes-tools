"""
Tests for PNG to PDF security measures, specifically filename handling and sanitization.
"""
import io
import os
import tempfile
import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def create_test_png_bytes():
    """Create a simple test PNG image in memory"""
    img = Image.new("RGB", (100, 100), color="red")
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes.seek(0)
    return img_bytes.getvalue()


class TestPngToPdfSecurity:
    """Test security measures in PNG to PDF conversion."""

    @patch("app.routers.png_to_pdf.convert_images_to_pdf")
    def test_filename_sanitization_immediate(self, mock_convert):
        """Test that filename is sanitized immediately upon receiving input."""
        # Mock the conversion function to create the file
        def mock_convert_func(image_paths, output_path, dpi):
            with open(output_path, "wb") as f:
                f.write(b"PDF content")
        
        mock_convert.side_effect = mock_convert_func
        
        # Create a malicious filename with path traversal
        malicious_filename = "../../etc/passwd"
        
        # Create test image
        png_bytes = create_test_png_bytes()
        
        # Make request with malicious filename
        response = client.post(
            "/api/png-to-pdf/convert",
            files={"files": ("test.png", png_bytes, "image/png")},
            data={"filename": malicious_filename, "dpi": 300},
        )
        
        # The response should succeed
        assert response.status_code == 200
        
        # Check response headers for filename
        content_disposition = response.headers.get("content-disposition", "")
        assert ".." not in content_disposition
        assert "/" not in content_disposition
        # Should have sanitized to "etc_passwd.pdf"
        assert "etc_passwd" in content_disposition

    @patch("app.routers.png_to_pdf.convert_images_to_pdf")
    @patch("app.routers.png_to_pdf.uuid.uuid4")
    def test_uuid_appended_to_backend_filename(self, mock_uuid, mock_convert):
        """Test that UUID is appended to the backend filename for storage."""
        # Mock UUID to have predictable value
        test_uuid = uuid.UUID("12345678-1234-5678-1234-567812345678")
        mock_uuid.return_value = test_uuid
        
        # Mock the conversion function
        def mock_convert_func(image_paths, output_path, dpi):
            # Verify the output_path contains UUID
            assert str(test_uuid) in output_path
            # Create a dummy file at output_path
            with open(output_path, "wb") as f:
                f.write(b"PDF content")
        
        mock_convert.side_effect = mock_convert_func
        
        # Create test image
        png_bytes = create_test_png_bytes()
        
        # Make request
        response = client.post(
            "/api/png-to-pdf/convert",
            files={"files": ("test.png", png_bytes, "image/png")},
            data={"filename": "test_document", "dpi": 300},
        )
        
        # Verify the conversion was called with UUID in path
        assert mock_convert.called
        call_args = mock_convert.call_args
        output_path = call_args[0][1]  # Second argument is output_path
        
        # Backend filename should contain UUID
        assert str(test_uuid) in output_path
        assert "test_document" in output_path

    @patch("app.routers.png_to_pdf.convert_images_to_pdf")
    def test_user_output_without_uuid(self, mock_convert):
        """Test that the filename returned to user does not include UUID."""
        # Mock the conversion function
        def mock_convert_func(image_paths, output_path, dpi):
            # Create a dummy file at output_path
            with open(output_path, "wb") as f:
                f.write(b"PDF content")
        
        mock_convert.side_effect = mock_convert_func
        
        # Create test image
        png_bytes = create_test_png_bytes()
        
        # Make request
        response = client.post(
            "/api/png-to-pdf/convert",
            files={"files": ("test.png", png_bytes, "image/png")},
            data={"filename": "my_document", "dpi": 300},
        )
        
        # The user-facing filename should not contain UUID pattern
        # Check content-disposition header
        content_disposition = response.headers.get("content-disposition", "")
        
        # Should contain the sanitized filename
        assert "my_document.pdf" in content_disposition
        
        # Should NOT contain UUID pattern (8-4-4-4-12 hex digits)
        import re
        uuid_pattern = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
        assert not re.search(uuid_pattern, content_disposition)

    @patch("app.routers.png_to_pdf.convert_images_to_pdf")
    def test_command_injection_prevention(self, mock_convert):
        """Test that command injection attempts in filename are blocked."""
        # Mock the conversion function to create the file
        def mock_convert_func(image_paths, output_path, dpi):
            with open(output_path, "wb") as f:
                f.write(b"PDF content")
        
        mock_convert.side_effect = mock_convert_func
        
        # Create filename with command injection attempt
        malicious_filename = "file; rm -rf /"
        
        # Create test image
        png_bytes = create_test_png_bytes()
        
        # Make request
        response = client.post(
            "/api/png-to-pdf/convert",
            files={"files": ("test.png", png_bytes, "image/png")},
            data={"filename": malicious_filename, "dpi": 300},
        )
        
        # Verify dangerous characters are removed
        assert response.status_code == 200
        content_disposition = response.headers.get("content-disposition", "")
        
        # Extract just the filename part from header (after filename=")
        import re
        filename_match = re.search(r'filename="([^"]+)"', content_disposition)
        assert filename_match, "filename not found in content-disposition header"
        filename = filename_match.group(1)
        
        # Verify the filename itself doesn't contain dangerous characters
        assert ";" not in filename
        # Sanitized version should be present
        assert "file_rm_-rf" in filename

    @patch("app.routers.png_to_pdf.convert_images_to_pdf")
    @patch("app.routers.png_to_pdf.uuid.uuid4")
    def test_collision_prevention_different_uuids(self, mock_uuid, mock_convert):
        """Test that different requests get different UUIDs to prevent collisions."""
        # Mock UUIDs to return different values for each call
        # We need more UUIDs because save_uploaded_file also calls uuid.uuid4()
        uuid_values = [
            uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),  # For backend filename (1st request)
            uuid.UUID("11111111-1111-1111-1111-111111111111"),  # For save_uploaded_file (1st request)
            uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),  # For backend filename (2nd request)
            uuid.UUID("22222222-2222-2222-2222-222222222222"),  # For save_uploaded_file (2nd request)
        ]
        uuid_iter = iter(uuid_values)
        mock_uuid.side_effect = lambda: next(uuid_iter)
        
        # Track the output paths
        output_paths = []
        
        def mock_convert_func(image_paths, output_path, dpi):
            output_paths.append(output_path)
            with open(output_path, "wb") as f:
                f.write(b"PDF content")
        
        mock_convert.side_effect = mock_convert_func
        
        # Create test image
        png_bytes = create_test_png_bytes()
        
        # Make two requests with same filename
        for _ in range(2):
            response = client.post(
                "/api/png-to-pdf/convert",
                files={"files": ("test.png", png_bytes, "image/png")},
                data={"filename": "same_name", "dpi": 300},
            )
            assert response.status_code == 200
        
        # Verify both conversions were called
        assert len(output_paths) == 2
        
        # Verify the paths are different (due to different UUIDs)
        assert output_paths[0] != output_paths[1]
        
        # Both should contain the base filename
        assert all("same_name" in path for path in output_paths)
        
        # Each should contain its respective UUID for backend filename (1st and 3rd UUIDs)
        assert str(uuid_values[0]) in output_paths[0]  # 1st request uses 1st UUID
        assert str(uuid_values[2]) in output_paths[1]  # 2nd request uses 3rd UUID

    @patch("app.routers.png_to_pdf.convert_images_to_pdf")
    def test_sanitization_before_uuid_append(self, mock_convert):
        """Test that sanitization happens before UUID is appended."""
        # Track the filename used
        captured_path = None
        
        def mock_convert_func(image_paths, output_path, dpi):
            nonlocal captured_path
            captured_path = output_path
            with open(output_path, "wb") as f:
                f.write(b"PDF content")
        
        mock_convert.side_effect = mock_convert_func
        
        # Create test image
        png_bytes = create_test_png_bytes()
        
        # Use a filename that needs sanitization
        response = client.post(
            "/api/png-to-pdf/convert",
            files={"files": ("test.png", png_bytes, "image/png")},
            data={"filename": "test<script>alert()</script>", "dpi": 300},
        )
        
        # Verify the path was captured
        assert captured_path is not None
        
        # The backend filename should have:
        # 1. Sanitized base name (no <script> tags)
        # 2. UUID appended
        # 3. .pdf extension
        
        filename = os.path.basename(captured_path)
        
        # Should not contain dangerous characters
        assert "<" not in filename
        assert ">" not in filename
        assert "script" in filename  # The word itself is ok, just not the tags
        
        # Should contain UUID pattern
        import re
        uuid_pattern = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
        assert re.search(uuid_pattern, filename)
        
        # Should end with .pdf
        assert filename.endswith(".pdf")

    @patch("app.routers.png_to_pdf.convert_images_to_pdf")
    def test_pdf_extension_handling(self, mock_convert):
        """Test that .pdf extension is handled correctly with UUID."""
        def mock_convert_func(image_paths, output_path, dpi):
            with open(output_path, "wb") as f:
                f.write(b"PDF content")
        
        mock_convert.side_effect = mock_convert_func
        
        # Create test image
        png_bytes = create_test_png_bytes()
        
        # Test with .pdf extension in input
        response = client.post(
            "/api/png-to-pdf/convert",
            files={"files": ("test.png", png_bytes, "image/png")},
            data={"filename": "document.pdf", "dpi": 300},
        )
        
        # User-facing filename should be "document.pdf" (not "document.pdf.pdf")
        content_disposition = response.headers.get("content-disposition", "")
        assert "document.pdf" in content_disposition
        # Should not have double extension
        assert "document.pdf.pdf" not in content_disposition
