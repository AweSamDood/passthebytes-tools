import os
import tempfile
import time
from pathlib import Path

import pytest

from app.services.cleanup import (
    cleanup_temporary_files,
    get_directory_size,
    MAX_DIR_SIZE_GB,
)


class TestCleanupService:
    """Test the cleanup service functions"""

    def test_get_directory_size_empty(self):
        """Test getting size of empty directory"""
        with tempfile.TemporaryDirectory() as temp_dir:
            size = get_directory_size(Path(temp_dir))
            assert size == 0

    def test_get_directory_size_with_files(self):
        """Test getting size of directory with files"""
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            # Create a 1KB file
            file1 = temp_path / "test1.txt"
            file1.write_text("x" * 1024)
            # Create a 2KB file
            file2 = temp_path / "test2.txt"
            file2.write_text("x" * 2048)

            size = get_directory_size(temp_path)
            assert size == 1024 + 2048

    def test_cleanup_deletes_old_files(self):
        """Test that cleanup deletes files older than 2 hours"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Temporarily replace TEMP_DIRS for testing
            import app.services.cleanup as cleanup_module

            original_temp_dirs = cleanup_module.TEMP_DIRS
            cleanup_module.TEMP_DIRS = [temp_dir]

            try:
                temp_path = Path(temp_dir)
                old_file = temp_path / "old_file.txt"
                old_file.write_text("old content")

                # Modify the file's modification time to be older than 2 hours
                two_hours_ago = time.time() - 7201  # 2 hours + 1 second
                os.utime(old_file, (two_hours_ago, two_hours_ago))

                # Create a recent file
                new_file = temp_path / "new_file.txt"
                new_file.write_text("new content")

                # Run cleanup
                cleanup_temporary_files()

                # Old file should be deleted
                assert not old_file.exists()
                # New file should still exist
                assert new_file.exists()

            finally:
                # Restore original TEMP_DIRS
                cleanup_module.TEMP_DIRS = original_temp_dirs

    def test_cleanup_preserves_recent_files(self):
        """Test that cleanup preserves files newer than 2 hours"""
        with tempfile.TemporaryDirectory() as temp_dir:
            import app.services.cleanup as cleanup_module

            original_temp_dirs = cleanup_module.TEMP_DIRS
            cleanup_module.TEMP_DIRS = [temp_dir]

            try:
                temp_path = Path(temp_dir)
                recent_file = temp_path / "recent_file.txt"
                recent_file.write_text("recent content")

                # Run cleanup
                cleanup_temporary_files()

                # Recent file should still exist
                assert recent_file.exists()

            finally:
                cleanup_module.TEMP_DIRS = original_temp_dirs

    def test_cleanup_handles_nonexistent_directory(self):
        """Test that cleanup handles non-existent directories gracefully"""
        import app.services.cleanup as cleanup_module

        original_temp_dirs = cleanup_module.TEMP_DIRS
        # Use a path in /tmp which should be writable
        test_dir = f"/tmp/test_cleanup_{int(time.time())}"
        cleanup_module.TEMP_DIRS = [test_dir]

        try:
            # Should not raise an exception and should create the directory
            cleanup_temporary_files()
            # Directory should be created
            assert Path(test_dir).exists()
            # Clean up
            if Path(test_dir).exists():
                import shutil

                shutil.rmtree(test_dir)
        finally:
            cleanup_module.TEMP_DIRS = original_temp_dirs
