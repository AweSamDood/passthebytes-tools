"""
Tests for input validation on various endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestYouTubeDownloaderValidation:
    """Test input validation for YouTube downloader endpoints."""

    def test_invalid_url_format(self):
        """Test that non-YouTube URLs are rejected."""
        response = client.post(
            "/api/youtube/info",
            json={"url": "https://example.com/video"}
        )
        assert response.status_code == 422
        assert "YouTube" in str(response.json()["detail"])

    def test_url_too_long(self):
        """Test that excessively long URLs are rejected."""
        long_url = "https://youtube.com/" + "a" * 3000
        response = client.post(
            "/api/youtube/info",
            json={"url": long_url}
        )
        assert response.status_code == 422

    def test_valid_youtube_url(self):
        """Test that valid YouTube URLs are accepted (may fail if yt-dlp not configured)."""
        # This test may fail without internet or proper yt-dlp setup
        # Just verifies the validation passes
        response = client.post(
            "/api/youtube/info",
            json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
        )
        # Either succeeds or fails with a different error (not validation)
        assert response.status_code in [200, 400, 500]

    def test_playlist_too_many_videos(self):
        """Test that playlist downloads with too many videos are rejected."""
        video_ids = [f"video{i:05d}abc" for i in range(51)]  # 51 videos
        response = client.post(
            "/api/youtube/download-playlist",
            json={
                "url": "https://youtube.com/playlist?list=test",
                "video_ids": video_ids
            }
        )
        assert response.status_code == 422
        assert "50" in str(response.json()["detail"])

    def test_invalid_video_id_format(self):
        """Test that invalid video ID formats are rejected."""
        response = client.post(
            "/api/youtube/download-playlist",
            json={
                "url": "https://youtube.com/playlist?list=test",
                "video_ids": ["invalid-id"]  # Too short
            }
        )
        assert response.status_code == 422


class TestQRCodeValidation:
    """Test input validation for QR code generator."""

    def test_invalid_url_qr(self):
        """Test that invalid URL format is rejected in QR code."""
        response = client.post(
            "/api/qr-code-generator/generate",
            data={
                "request_data": '{"qr_type": "url", "content": {"url": "not-a-valid-url"}, "customization": {}}',
                "file_format": "png"
            }
        )
        assert response.status_code in [400, 422]

    def test_url_too_long_qr(self):
        """Test that excessively long URLs are rejected in QR code."""
        long_url = "https://example.com/" + "a" * 3000
        response = client.post(
            "/api/qr-code-generator/generate",
            data={
                "request_data": f'{{"qr_type": "url", "content": {{"url": "{long_url}"}}, "customization": {{}}}}',
                "file_format": "png"
            }
        )
        assert response.status_code in [400, 422]

    def test_invalid_email_qr(self):
        """Test that invalid email format is rejected in QR code."""
        response = client.post(
            "/api/qr-code-generator/generate",
            data={
                "request_data": '{"qr_type": "email", "content": {"email": "not-an-email"}, "customization": {}}',
                "file_format": "png"
            }
        )
        assert response.status_code in [400, 422]

    def test_invalid_color_format(self):
        """Test that invalid color format is rejected."""
        response = client.post(
            "/api/qr-code-generator/generate",
            data={
                "request_data": '{"qr_type": "text", "content": {"text": "test"}, "customization": {"foreground_color": "red"}}',
                "file_format": "png"
            }
        )
        assert response.status_code in [400, 422]

    def test_invalid_error_correction(self):
        """Test that invalid error correction level is rejected."""
        response = client.post(
            "/api/qr-code-generator/generate",
            data={
                "request_data": '{"qr_type": "text", "content": {"text": "test"}, "customization": {"error_correction": "X"}}',
                "file_format": "png"
            }
        )
        assert response.status_code in [400, 422]


class TestImageConverterValidation:
    """Test input validation for image converter."""

    def test_invalid_output_format(self):
        """Test that invalid output format is rejected."""
        # Create a minimal valid image file
        import io
        from PIL import Image
        
        img = Image.new('RGB', (10, 10), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = [("files", ("test.png", img_bytes, "image/png"))]
        data = {"output_format": "invalid_format"}
        
        response = client.post(
            "/api/image-converter/convert-image",
            files=files,
            data=data
        )
        assert response.status_code == 400
        assert "Unsupported output format" in response.json()["detail"]


class TestPngToPdfValidation:
    """Test input validation for PNG to PDF converter."""

    def test_invalid_dpi_too_low(self):
        """Test that DPI below minimum is rejected."""
        import io
        from PIL import Image
        
        img = Image.new('RGB', (10, 10), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = [("files", ("test.png", img_bytes, "image/png"))]
        data = {"dpi": 50, "filename": "test"}
        
        response = client.post(
            "/api/png-to-pdf/convert",
            files=files,
            data=data
        )
        assert response.status_code == 400
        assert "DPI must be between" in response.json()["detail"]

    def test_invalid_dpi_too_high(self):
        """Test that DPI above maximum is rejected."""
        import io
        from PIL import Image
        
        img = Image.new('RGB', (10, 10), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = [("files", ("test.png", img_bytes, "image/png"))]
        data = {"dpi": 1000, "filename": "test"}
        
        response = client.post(
            "/api/png-to-pdf/convert",
            files=files,
            data=data
        )
        assert response.status_code == 400
        assert "DPI must be between" in response.json()["detail"]

    def test_too_many_files(self):
        """Test that uploading too many files is rejected."""
        import io
        from PIL import Image
        
        # Create 51 files (more than the 50 limit)
        files = []
        for i in range(51):
            img = Image.new('RGB', (10, 10), color='red')
            img_bytes = io.BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            files.append(("files", (f"test{i}.png", img_bytes, "image/png")))
        
        data = {"dpi": 300, "filename": "test"}
        
        response = client.post(
            "/api/png-to-pdf/convert",
            files=files,
            data=data
        )
        assert response.status_code == 400
        assert "Too many files" in response.json()["detail"]
