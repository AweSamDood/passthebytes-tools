import pytest
from app.routers.youtube_downloader import calculate_thread_count


class TestThreadCalculation:
    """Test the thread count calculation function"""

    def test_zero_videos(self):
        """Test with 0 videos returns 1 thread"""
        assert calculate_thread_count(0) == 1

    def test_one_video(self):
        """Test with 1 video returns 1 thread"""
        assert calculate_thread_count(1) == 1

    def test_two_videos(self):
        """Test with 2 videos returns 2 threads"""
        assert calculate_thread_count(2) == 2

    def test_three_videos(self):
        """Test with 3 videos returns 2 threads"""
        assert calculate_thread_count(3) == 2

    def test_four_videos(self):
        """Test with 4 videos returns 3 threads"""
        assert calculate_thread_count(4) == 3

    def test_eight_videos(self):
        """Test with 8 videos returns 4 threads"""
        assert calculate_thread_count(8) == 4

    def test_sixteen_videos(self):
        """Test with 16 videos returns 5 threads"""
        assert calculate_thread_count(16) == 5

    def test_thirty_two_videos(self):
        """Test with 32 videos returns 6 threads"""
        assert calculate_thread_count(32) == 6

    def test_max_threads_limit(self):
        """Test that thread count never exceeds 10"""
        # 1024 videos would be floor(log2(1024)) + 1 = 10 + 1 = 11, but capped at 10
        assert calculate_thread_count(1024) == 10
        assert calculate_thread_count(2048) == 10
        assert calculate_thread_count(10000) == 10

    def test_negative_videos(self):
        """Test with negative videos returns 1 thread"""
        assert calculate_thread_count(-1) == 1


class TestYoutubeDownloaderEndpoints:
    """Test YouTube downloader API endpoints"""

    def test_info_endpoint_requires_url(self):
        """Test that info endpoint requires a URL"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post("/api/youtube/info")
        assert response.status_code == 422  # Validation error for missing body

    def test_download_invalid_format(self):
        """Test download with invalid format"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post(
            "/api/youtube/download/invalid", json={"url": "https://youtube.com/watch"}
        )
        assert response.status_code == 400
        assert "Invalid format" in response.json()["detail"]

    def test_playlist_download_requires_video_ids(self):
        """Test that playlist download requires video IDs"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.post("/api/youtube/download-playlist")
        assert response.status_code == 422  # Validation error

    def test_playlist_progress_invalid_job_id(self):
        """Test playlist progress with invalid job ID"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get("/api/youtube/playlist-download-progress/invalid-id")
        assert response.status_code == 400
        assert "Invalid job ID" in response.json()["detail"]

    def test_playlist_progress_nonexistent_job(self):
        """Test playlist progress with non-existent job"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        # Use a valid UUID that doesn't exist
        response = client.get(
            "/api/youtube/playlist-download-progress/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404
        assert "Job not found" in response.json()["detail"]

    def test_download_zip_nonexistent_file(self):
        """Test download zip with non-existent file"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        response = client.get(
            "/api/youtube/download-zip/?filename=nonexistent_file.zip"
        )
        assert response.status_code == 404
        assert "Zip file not found" in response.json()["detail"]

    def test_download_zip_path_traversal_protection(self):
        """Test that download zip endpoint sanitizes path traversal attempts"""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        # Attempt path traversal - the sanitization functions strip path separators,
        # converting "../../../etc/passwd" to a safe filename like "etc_passwd"
        response = client.get(
            "/api/youtube/download-zip/?filename=../../../etc/passwd"
        )
        # After sanitization, the malicious path becomes a safe filename within temp_downloads
        # Since that file doesn't exist, we get 404
        assert response.status_code == 404
        assert "Zip file not found" in response.json()["detail"]
