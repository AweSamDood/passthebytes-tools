import os
import tempfile
import time
from pathlib import Path

import pytest

from app.services.cleanup import (
    check_disk_space_available,
    cleanup_temporary_files,
    get_directory_size,
    get_total_disk_usage,
    MAX_DIR_SIZE_GB,
    DISK_USAGE_THRESHOLD,
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

    def test_get_total_disk_usage(self):
        """Test getting total disk usage across all temp directories"""
        with tempfile.TemporaryDirectory() as temp_dir1, \
             tempfile.TemporaryDirectory() as temp_dir2:
            import app.services.cleanup as cleanup_module

            original_temp_dirs = cleanup_module.TEMP_DIRS
            cleanup_module.TEMP_DIRS = [temp_dir1, temp_dir2]

            try:
                # Create files in both directories
                temp_path1 = Path(temp_dir1)
                file1 = temp_path1 / "test1.txt"
                file1.write_text("x" * 1024)  # 1KB

                temp_path2 = Path(temp_dir2)
                file2 = temp_path2 / "test2.txt"
                file2.write_text("x" * 2048)  # 2KB

                total_bytes, max_bytes = get_total_disk_usage()

                # Should be sum of both files
                assert total_bytes == 1024 + 2048
                # Max should be 25GB in bytes
                assert max_bytes == int(MAX_DIR_SIZE_GB * (1024**3))

            finally:
                cleanup_module.TEMP_DIRS = original_temp_dirs

    def test_check_disk_space_available_under_threshold(self):
        """Test that check_disk_space_available returns True when under threshold"""
        with tempfile.TemporaryDirectory() as temp_dir:
            import app.services.cleanup as cleanup_module

            original_temp_dirs = cleanup_module.TEMP_DIRS
            cleanup_module.TEMP_DIRS = [temp_dir]

            try:
                # Create a small file (well under threshold)
                temp_path = Path(temp_dir)
                small_file = temp_path / "small.txt"
                small_file.write_text("x" * 1024)  # 1KB

                # Should have plenty of space
                assert check_disk_space_available() is True

            finally:
                cleanup_module.TEMP_DIRS = original_temp_dirs

    def test_check_disk_space_available_over_threshold(self):
        """Test that check_disk_space_available returns False when over threshold"""
        with tempfile.TemporaryDirectory() as temp_dir:
            import app.services.cleanup as cleanup_module

            original_temp_dirs = cleanup_module.TEMP_DIRS
            original_max_dir_size = cleanup_module.MAX_DIR_SIZE_GB
            
            # Temporarily set a very small max size for testing
            cleanup_module.TEMP_DIRS = [temp_dir]
            cleanup_module.MAX_DIR_SIZE_GB = 0.000001  # ~1KB

            try:
                # Create a file larger than threshold
                temp_path = Path(temp_dir)
                large_file = temp_path / "large.txt"
                # Create file larger than 90% of 1KB
                large_file.write_text("x" * 2048)  # 2KB

                # Should be over threshold
                assert check_disk_space_available() is False

            finally:
                cleanup_module.TEMP_DIRS = original_temp_dirs
                cleanup_module.MAX_DIR_SIZE_GB = original_max_dir_size

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
