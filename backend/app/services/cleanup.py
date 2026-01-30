import os
import time
from pathlib import Path

TEMP_DIRS = ["temp_downloads", "uploads"]
MAX_DIR_SIZE_GB = 25  # Maximum directory size in GB (allocated to service)
DISK_USAGE_THRESHOLD = 0.90  # Reject new requests at 90% of MAX_DIR_SIZE_GB


def get_directory_size(path: Path) -> int:
    """Calculate total size of directory in bytes."""
    total_size = 0
    try:
        for dirpath, dirnames, filenames in os.walk(path):
            for filename in filenames:
                filepath = Path(dirpath) / filename
                try:
                    total_size += filepath.stat().st_size
                except Exception as e:
                    print(f"Error getting size of {filepath}: {e}")
    except Exception as e:
        print(f"Error walking directory {path}: {e}")
    return total_size


def get_total_disk_usage() -> tuple[int, int]:
    """
    Get total disk usage across all temp directories.
    
    Returns:
        tuple: (total_bytes_used, max_bytes_allowed)
    """
    total_bytes = 0
    for temp_dir in TEMP_DIRS:
        path = Path(temp_dir)
        if path.is_dir():
            total_bytes += get_directory_size(path)
    
    max_bytes = int(MAX_DIR_SIZE_GB * (1024**3))
    return total_bytes, max_bytes


def check_disk_space_available() -> bool:
    """
    Check if there's enough disk space to accept new requests.
    
    Returns:
        bool: True if disk usage is below threshold, False otherwise
    """
    total_bytes, max_bytes = get_total_disk_usage()
    threshold_bytes = int(max_bytes * DISK_USAGE_THRESHOLD)
    
    if total_bytes >= threshold_bytes:
        usage_gb = total_bytes / (1024**3)
        max_gb = max_bytes / (1024**3)
        threshold_gb = threshold_bytes / (1024**3)
        print(
            f"Disk space threshold exceeded: {usage_gb:.2f}GB / {max_gb:.2f}GB "
            f"(threshold: {threshold_gb:.2f}GB at {DISK_USAGE_THRESHOLD*100:.0f}%)"
        )
        return False
    
    return True


def cleanup_temporary_files():
    """
    Clean up temporary files based on age and directory size.
    - Delete files older than 2 hours (7200 seconds)
    - If directory exceeds 100GB, delete oldest files first
    """
    for temp_dir in TEMP_DIRS:
        Path(temp_dir).mkdir(parents=True, exist_ok=True)

    for temp_dir in TEMP_DIRS:
        path = Path(temp_dir)
        if not path.is_dir():
            continue

        # First pass: delete files older than 2 hours
        two_hours = 7200  # 2 hours in seconds
        for filename in os.listdir(path):
            file_path = path / filename
            try:
                if (
                    file_path.is_file()
                    and (time.time() - file_path.stat().st_mtime) > two_hours
                ):
                    file_path.unlink()
                    print(f"Deleted old temporary file (>2h): {file_path}")
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")

        # Second pass: recalculate directory size after old file deletion
        # and delete oldest files if size exceeds limit
        try:
            dir_size_bytes = get_directory_size(path)
            dir_size_gb = dir_size_bytes / (1024**3)

            # Check against total disk usage across all directories
            total_bytes, max_bytes = get_total_disk_usage()
            total_gb = total_bytes / (1024**3)

            if total_gb > MAX_DIR_SIZE_GB:
                print(
                    f"Total disk usage ({total_gb:.2f}GB) "
                    f"exceeds limit ({MAX_DIR_SIZE_GB}GB). Cleaning up..."
                )

                # Get all files with their modification times from this directory
                files_with_time = []
                for filename in os.listdir(path):
                    file_path = path / filename
                    if file_path.is_file():
                        try:
                            mtime = file_path.stat().st_mtime
                            size = file_path.stat().st_size
                            files_with_time.append((file_path, mtime, size))
                        except Exception as e:
                            print(f"Error getting file info for {file_path}: {e}")

                # Sort by modification time (oldest first)
                files_with_time.sort(key=lambda x: x[1])

                # Delete oldest files until we're under the limit
                bytes_to_free = int((total_gb - MAX_DIR_SIZE_GB) * (1024**3))
                bytes_freed = 0

                for file_path, mtime, size in files_with_time:
                    if bytes_freed >= bytes_to_free:
                        break
                    try:
                        file_path.unlink()
                        bytes_freed += size
                        print(
                            f"Deleted file to reduce directory size: {file_path} "
                            f"({size / (1024**2):.2f}MB)"
                        )
                    except Exception as e:
                        print(f"Error deleting file {file_path}: {e}")

                final_size_gb = (total_bytes - bytes_freed) / (1024**3)
                print(
                    f"Cleanup complete. Total disk usage reduced from "
                    f"{total_gb:.2f}GB to {final_size_gb:.2f}GB"
                )
        except Exception as e:
            print(f"Error checking/cleaning directory size for {temp_dir}: {e}")
