import os
import time
from pathlib import Path

TEMP_DIRS = ["temp_downloads", "uploads"]
MAX_DIR_SIZE_GB = 100  # Maximum directory size in GB


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

        # Second pass: check directory size and delete oldest files if needed
        try:
            dir_size_bytes = get_directory_size(path)
            dir_size_gb = dir_size_bytes / (1024**3)

            if dir_size_gb > MAX_DIR_SIZE_GB:
                print(
                    f"Directory {temp_dir} size ({dir_size_gb:.2f}GB) "
                    f"exceeds limit ({MAX_DIR_SIZE_GB}GB). Cleaning up..."
                )

                # Get all files with their modification times
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
                bytes_to_free = int((dir_size_gb - MAX_DIR_SIZE_GB) * (1024**3))
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

                final_size_gb = (dir_size_bytes - bytes_freed) / (1024**3)
                print(
                    f"Cleanup complete. Directory size reduced from "
                    f"{dir_size_gb:.2f}GB to {final_size_gb:.2f}GB"
                )
        except Exception as e:
            print(f"Error checking/cleaning directory size for {temp_dir}: {e}")
