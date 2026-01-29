"""
Tests for filename sanitization security measures.
"""
import pytest
from app.utils import sanitize_filename


class TestSanitizeFilename:
    """Test the sanitize_filename function for security vulnerabilities."""

    def test_path_traversal_unix(self):
        """Test that Unix path traversal attempts are blocked."""
        result = sanitize_filename("../../etc/passwd")
        assert ".." not in result
        assert "/" not in result
        # Leading/trailing underscores stripped
        assert result == "etc_passwd"

    def test_path_traversal_windows(self):
        """Test that Windows path traversal attempts are blocked."""
        result = sanitize_filename("..\\..\\windows\\system32")
        assert ".." not in result
        assert "\\" not in result
        # Leading/trailing underscores stripped
        assert result == "windows_system32"

    def test_command_injection_semicolon(self):
        """Test that command injection via semicolon is prevented."""
        result = sanitize_filename("file;rm -rf /")
        assert ";" not in result
        # Semicolons are replaced with underscores, trailing underscores stripped
        assert result == "file_rm_-rf"

    def test_command_injection_pipe(self):
        """Test that command injection via pipe is prevented."""
        result = sanitize_filename("file | cat /etc/passwd")
        assert "|" not in result
        assert result == "file_cat_etc_passwd"

    def test_command_injection_backticks(self):
        """Test that command injection via backticks is prevented."""
        result = sanitize_filename("file`whoami`.txt")
        assert "`" not in result
        # Backticks replaced with underscores
        assert result == "file_whoami_.txt"

    def test_command_injection_dollar(self):
        """Test that command injection via dollar signs is prevented."""
        result = sanitize_filename("file$(whoami).txt")
        assert "$" not in result
        assert "(" not in result
        assert ")" not in result
        # Dollar signs and parentheses replaced with underscores
        assert result == "file_whoami_.txt"

    def test_null_byte_injection(self):
        """Test that null byte injection is prevented."""
        result = sanitize_filename("file\x00.txt.pdf")
        assert "\x00" not in result
        # Null byte should be replaced with underscore
        assert result == "file_.txt.pdf"

    def test_normal_filename(self):
        """Test that normal filenames are preserved."""
        result = sanitize_filename("normal_file.pdf")
        assert result == "normal_file.pdf"

    def test_filename_with_spaces(self):
        """Test that filenames with spaces are handled correctly."""
        result = sanitize_filename("my document file.pdf")
        # Multiple spaces should be collapsed to single underscore
        assert result == "my_document_file.pdf"

    def test_filename_with_hyphens(self):
        """Test that hyphens are preserved."""
        result = sanitize_filename("my-file-name.pdf")
        assert result == "my-file-name.pdf"

    def test_empty_filename(self):
        """Test that empty filenames get a default value."""
        result = sanitize_filename("")
        assert result == "unnamed_file"

    def test_none_filename(self):
        """Test that None filenames get a default value."""
        result = sanitize_filename(None)
        assert result == "unnamed_file"

    def test_only_special_chars(self):
        """Test that filenames with only special characters get default value."""
        result = sanitize_filename("!@#$%^&*()")
        # After stripping special chars and spaces, should get default
        # (actually becomes '_' after sanitization, but that's empty after strip)
        assert result == "unnamed_file"

    def test_leading_dots_removed(self):
        """Test that leading dots are removed."""
        result = sanitize_filename("...hidden_file.txt")
        # Files starting with dot after sanitization are invalid
        assert result == "unnamed_file"

    def test_trailing_dots_removed(self):
        """Test that trailing dots are removed (Windows issue)."""
        result = sanitize_filename("file...")
        assert not result.endswith(".")
        # Trailing dots stripped, then trailing underscores stripped
        assert result == "file"

    def test_max_length_enforcement(self):
        """Test that filenames are truncated to max length."""
        long_name = "a" * 300 + ".pdf"
        result = sanitize_filename(long_name, max_length=255)
        assert len(result) <= 255
        # Should preserve extension
        assert result.endswith(".pdf")

    def test_max_length_without_extension(self):
        """Test max length enforcement without extension."""
        long_name = "a" * 300
        result = sanitize_filename(long_name, max_length=255)
        assert len(result) <= 255

    def test_unicode_characters(self):
        """Test that unicode characters are removed for safety."""
        result = sanitize_filename("файл.pdf")  # Russian "file"
        # Unicode becomes underscores, leaving just the extension
        assert result == "unnamed_file"

    def test_mixed_attack_vectors(self):
        """Test multiple attack vectors combined."""
        result = sanitize_filename("../../etc/passwd; rm -rf / && cat /etc/shadow")
        assert ".." not in result
        assert "/" not in result
        assert ";" not in result
        assert "&" not in result
        # Should be heavily sanitized, leading underscores removed
        assert result == "etc_passwd_rm_-rf_cat_etc_shadow"

    def test_preserves_multiple_dots_in_filename(self):
        """Test that dots in the middle of filename are preserved."""
        result = sanitize_filename("my.file.name.pdf")
        assert result == "my.file.name.pdf"

    def test_sql_injection_chars(self):
        """Test that SQL injection characters are removed."""
        result = sanitize_filename("file'; DROP TABLE users;--.pdf")
        assert "'" not in result
        assert ";" not in result
        # Double dash is allowed (just hyphens), but they're part of the filename
        assert result == "file_DROP_TABLE_users_--.pdf"

    def test_xss_chars(self):
        """Test that XSS attack characters are removed."""
        result = sanitize_filename("<script>alert('xss')</script>.pdf")
        assert "<" not in result
        assert ">" not in result
        # Angle brackets and quotes replaced with underscores
        # The closing tag </script> leaves an underscore before the extension
        assert result == "script_alert_xss_script_.pdf"
