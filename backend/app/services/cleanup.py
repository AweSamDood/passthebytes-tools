import os
import time
from pathlib import Path

TEMP_DIRS = ["temp_downloads", "uploads"]


def cleanup_temporary_files():
    for temp_dir in TEMP_DIRS:
        path = Path(temp_dir)
        if not path.is_dir():
            continue

        for filename in os.listdir(path):
            file_path = path / filename
            try:
                if (
                    file_path.is_file()
                    and (time.time() - file_path.stat().st_mtime) > 3600
                ):
                    file_path.unlink()
                    print(f"Deleted old temporary file: {file_path}")
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")
