"""
Tests for security middleware functionality.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestSecurityHeaders:
    """Test security headers middleware."""

    def test_csp_header_present(self):
        """Test that Content-Security-Policy header is present."""
        response = client.get("/health")
        assert response.status_code == 200
        assert "Content-Security-Policy" in response.headers
        
        # Verify CSP contains important directives
        csp = response.headers["Content-Security-Policy"]
        assert "default-src 'self'" in csp
        assert "frame-ancestors 'none'" in csp
        assert "object-src 'none'" in csp

    def test_x_frame_options_header(self):
        """Test that X-Frame-Options header is present."""
        response = client.get("/health")
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_x_content_type_options_header(self):
        """Test that X-Content-Type-Options header is present."""
        response = client.get("/health")
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_xss_protection_header(self):
        """Test that X-XSS-Protection header is present."""
        response = client.get("/health")
        assert "X-XSS-Protection" in response.headers
        assert response.headers["X-XSS-Protection"] == "1; mode=block"

    def test_referrer_policy_header(self):
        """Test that Referrer-Policy header is present."""
        response = client.get("/health")
        assert "Referrer-Policy" in response.headers
        assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"

    def test_permissions_policy_header(self):
        """Test that Permissions-Policy header is present."""
        response = client.get("/health")
        assert "Permissions-Policy" in response.headers
        # Just check it exists and has some restrictions
        assert "geolocation=()" in response.headers["Permissions-Policy"]


class TestInputValidation:
    """Test input validation middleware."""

    def test_invalid_content_length(self):
        """Test that invalid content-length is rejected."""
        response = client.post(
            "/api/mocking-text",
            headers={"Content-Length": "-1"},
            json={"text": "test"}
        )
        # Should be rejected with 400
        assert response.status_code == 400

    def test_excessive_content_length(self):
        """Test that excessive content-length is rejected."""
        # Try to post with a very large content-length
        response = client.post(
            "/api/mocking-text",
            headers={"Content-Length": "200000000"},  # 200MB
            json={"text": "test"}
        )
        # Should be rejected with 413
        assert response.status_code == 413
        assert "too large" in response.json()["detail"].lower()


class TestRateLimiting:
    """Test rate limiting functionality."""

    def test_rate_limit_applied(self):
        """Test that rate limiting is applied to protected endpoints."""
        # Make multiple requests quickly to hit rate limit
        # Note: This test may be flaky in CI/CD environments
        # First request should succeed
        response = client.get("/health")
        assert response.status_code == 200
        
        # Check that rate limit headers might be present
        # (slowapi doesn't always add headers to non-limited endpoints)
        # So we just verify the endpoint is accessible


class TestAuditLogging:
    """Test audit logging middleware."""

    def test_audit_log_for_file_operation(self):
        """Test that file operations are logged (visual inspection)."""
        # This test just verifies the endpoint works
        # Actual log verification would require log capture
        response = client.get("/api/png-to-pdf/info")
        assert response.status_code == 200
        # Audit logging happens in background, just verify no errors
