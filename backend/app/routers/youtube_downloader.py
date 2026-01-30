import json
import logging
import math
import os
import re
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from shutil import rmtree
from threading import Lock

import yt_dlp
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from werkzeug.utils import secure_filename

from app.services.cleanup import check_disk_space_available
from app.utils import sanitize_filename

# from urllib.parse import parse_qs, urlparse


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

router = APIRouter()

# Initialize rate limiter for this router
limiter = Limiter(key_func=get_remote_address)


class URLModel(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate YouTube URL."""
        if not v or not isinstance(v, str):
            raise ValueError("URL is required")
        if len(v) > 2048:
            raise ValueError("URL too long (max 2048 characters)")
        # Check for YouTube domain
        if not any(domain in v.lower() for domain in ["youtube.com", "youtu.be"]):
            raise ValueError("URL must be a YouTube link")
        return v


class PlaylistDownloadModel(BaseModel):
    url: str
    video_ids: list[str]

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate YouTube URL."""
        if not v or not isinstance(v, str):
            raise ValueError("URL is required")
        if len(v) > 2048:
            raise ValueError("URL too long (max 2048 characters)")
        return v

    @field_validator("video_ids")
    @classmethod
    def validate_video_ids(cls, v: list[str]) -> list[str]:
        """Validate video IDs list."""
        if not v:
            raise ValueError("At least one video ID is required")
        if len(v) > 50:
            raise ValueError("Cannot download more than 50 videos at a time")
        # Validate each video ID format (YouTube video IDs are 11 characters)
        for video_id in v:
            if not re.match(r'^[a-zA-Z0-9_-]{11}$', video_id):
                raise ValueError(f"Invalid video ID format: {video_id}")
        return v


# def remove_file(path: str):
#     if os.path.exists(path):
#         os.unlink(path)


def remove_file(path: str):
    """Remove a file if it exists."""
    if os.path.exists(path):
        try:
            os.unlink(path)
            logging.info(f"Deleted file: {path}")
        except Exception as e:
            logging.error(f"Error deleting file {path}: {e}")


def remove_dir(path: str):
    if os.path.exists(path):
        rmtree(path)


def calculate_thread_count(video_count: int) -> int:
    """
    Calculate the number of threads to use based on video count.
    Uses logarithmic scaling with a maximum of 10 threads.

    Examples:
    - 1 video: 1 thread
    - 2-3 videos: 2 threads
    - 4-7 videos: 3 threads
    - 8-15 videos: 4 threads
    - Maximum: 10 threads
    """
    if video_count <= 0:
        return 1
    # floor(log2(video_count)) + 1, capped at 10
    threads = min(10, math.floor(math.log2(video_count)) + 1)
    return threads


def download_single_video(
    video_id: str, temp_dir: str, max_duration: int = 7200
) -> dict:
    """
    Download a single video with error handling and duration check.

    Args:
        video_id: The YouTube video ID
        temp_dir: Directory to save the downloaded file
        max_duration: Maximum video duration in seconds (default: 7200 = 2 hours)

    Returns:
        dict with keys: success (bool), video_id (str), error (str, optional)
    """
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        # First, check video duration
        info_opts = {"noplaylist": True}
        with yt_dlp.YoutubeDL(info_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            duration = info.get("duration", 0)
            title = info.get("title", "Unknown")

            if duration > max_duration:
                max_hours = max_duration / 3600
                actual_hours = duration / 3600
                logging.warning(
                    f"Skipping video {video_id} ('{title}'): "
                    f"duration {actual_hours:.2f}h exceeds limit of {max_hours:.2f}h"
                )
                return {
                    "success": False,
                    "video_id": video_id,
                    "title": title,
                    "error": f"Video duration ({actual_hours:.2f}h) exceeds {max_hours}h limit",
                }

        # Download the video
        ydl_opts = {
            "format": "bestaudio/best",
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ],
            "outtmpl": os.path.join(temp_dir, "%(title)s.%(ext)s"),
            "noplaylist": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_url])

        logging.info(f"Successfully downloaded video {video_id} ('{title}')")
        return {"success": True, "video_id": video_id, "title": title}

    except Exception as e:
        logging.error(f"Error downloading video {video_id}: {e}")
        return {
            "success": False,
            "video_id": video_id,
            "error": str(e),
        }


@router.post("/info")
@limiter.limit("30/minute")
async def get_info(request: Request, url_model: URLModel):
    ydl_opts = {"noplaylist": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url_model.url, download=False)
            return {"title": info.get("title"), "thumbnail": info.get("thumbnail")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching video info: {e}")


@router.post("/download/{file_format}")
@limiter.limit("5/minute")
async def download_file(
    request: Request,
    file_format: str, url_model: URLModel, background_tasks: BackgroundTasks
):
    # Check disk space before accepting new download
    if not check_disk_space_available():
        raise HTTPException(
            status_code=507,
            detail="Service storage limit reached. Please try again later."
        )
    
    if file_format not in ["mp3", "mp4"]:
        raise HTTPException(status_code=400, detail="Invalid format specified.")

    temp_dir = "temp_downloads"
    os.makedirs(temp_dir, exist_ok=True)

    unique_id = uuid.uuid4()

    ydl_opts = {
        "noplaylist": True,
        "outtmpl": os.path.join(temp_dir, f"{unique_id}.%(ext)s"),
    }

    if file_format == "mp3":
        ydl_opts.update(
            {
                "format": "bestaudio/best",
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }
                ],
            }
        )
    elif file_format == "mp4":
        ydl_opts.update(
            {
                "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            }
        )

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url_model.url, download=True)
            title = info_dict.get("title", "video")

            original_ext = info_dict.get("ext")
            if file_format == "mp3":
                downloaded_file_path = os.path.join(temp_dir, f"{unique_id}.mp3")
            else:
                downloaded_file_path = os.path.join(
                    temp_dir, f"{unique_id}.{original_ext}"
                )

            if not os.path.exists(downloaded_file_path):
                found = False
                for f in os.listdir(temp_dir):
                    if f.startswith(str(unique_id)):
                        downloaded_file_path = os.path.join(temp_dir, f)
                        found = True
                        break
                if not found:
                    raise HTTPException(
                        status_code=500, detail="Downloaded file not found."
                    )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to download: {e}")

    # Sanitize the title to remove characters that are illegal in filenames
    sanitized_title = sanitize_filename(title)
    file_name_for_client = f"{sanitized_title}.{file_format}"
    media_type = "audio/mpeg" if file_format == "mp3" else "video/mp4"

    # Schedule file deletion after serving to user
    background_tasks.add_task(remove_file, downloaded_file_path)

    return FileResponse(
        path=downloaded_file_path, media_type=media_type, filename=file_name_for_client
    )


@router.post("/playlist-info")
@limiter.limit("20/minute")
async def get_playlist_info(request: Request, url_model: URLModel):
    logging.info(f"Fetching playlist info for URL: {url_model.url}")

    ydl_opts = {
        "extract_flat": True,
        "playlistend": 500,
    }

    try:
        # First attempt: Treat as a playlist
        logging.info(f"Attempting to extract playlist info with options: {ydl_opts}")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url_model.url, download=False)

        # If the extractor is a 'youtube:tab', it means it's a playlist page
        # that might need a second pass to get the actual video entries.
        if info.get("extractor_key") == "YoutubeTab" and "url" in info:
            logging.info(
                f"youtube:tab detected. Re-extracting with playlist URL: {info['url']}"
            )
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(info["url"], download=False)

        if "entries" in info and info["entries"]:
            logging.info("Successfully extracted playlist with entries.")
            videos = [
                {"id": entry["id"], "title": entry["title"]}
                for entry in info.get("entries", [])
                if entry
            ]
            response_data = {"title": info.get("title"), "videos": videos}
            logging.info(f"Responding with playlist data: {json.dumps(response_data)}")
            return response_data

        # Fallback: Treat as a single video
        logging.warning("No entries found, falling back to single video extraction.")
        ydl_opts_single = {"noplaylist": True}
        with yt_dlp.YoutubeDL(ydl_opts_single) as ydl_single:
            single_video_info = ydl_single.extract_info(url_model.url, download=False)
            response_data = {
                "title": single_video_info.get("title"),
                "videos": [
                    {"id": single_video_info["id"], "title": single_video_info["title"]}
                ],
            }
            logging.info(
                f"Responding with single video data: {json.dumps(response_data)}"
            )
            return response_data

    except Exception as e:
        logging.error(f"Exception occurred while fetching info: {e}", exc_info=True)
        # Final fallback for any exception: try to extract as a single video
        try:
            logging.warning(
                "Exception occurred, attempting final fallback"
                " to single video extraction."
            )
            ydl_opts_single = {"noplaylist": True}
            with yt_dlp.YoutubeDL(ydl_opts_single) as ydl_single:
                single_video_info = ydl_single.extract_info(
                    url_model.url, download=False
                )
                response_data = {
                    "title": single_video_info.get("title"),
                    "videos": [
                        {
                            "id": single_video_info["id"],
                            "title": single_video_info["title"],
                        }
                    ],
                }
                logging.info(
                    f"Responding with single video data after exception:"
                    f" {json.dumps(response_data)}"
                )
                return response_data
        except Exception as final_e:
            logging.error(
                f"Final fallback to single video extraction failed: {final_e}",
                exc_info=True,
            )
            raise HTTPException(
                status_code=400, detail=f"Error fetching info: {final_e}"
            )


def do_playlist_download(url: str, video_ids: list[str], job_id: str):
    logging.info(f"Starting playlist download for job_id: {job_id}")
    progress_file = os.path.join("temp_downloads", f"{job_id}_progress.json")
    progress_lock = Lock()  # Lock for thread-safe progress file writes

    if len(video_ids) > 50:
        logging.error(
            f"Job {job_id}: Attempted to download "
            f"{len(video_ids)} videos, but the limit is 50."
        )
        with open(progress_file, "w") as f:
            json.dump(
                {
                    "status": "error",
                    "message": "Cannot download more than 50 videos at a time.",
                },
                f,
            )
        return

    temp_dir = f"temp_downloads/{job_id}"
    os.makedirs(temp_dir, exist_ok=True)

    total_videos = len(video_ids)
    thread_count = calculate_thread_count(total_videos)
    logging.info(
        f"Total videos to download: {total_videos} using {thread_count} threads for job_id: {job_id}"
    )

    try:
        playlist_info_opts = {"extract_flat": True, "noplaylist": False}
        with yt_dlp.YoutubeDL(playlist_info_opts) as ydl:
            playlist_info = ydl.extract_info(url, download=False)
        playlist_title = playlist_info.get("title", "playlist")
        # Defense in depth: Use both sanitization functions for maximum safety
        # sanitize_filename() handles command injection and path traversal
        # secure_filename() provides additional werkzeug-specific protections
        sanitized_playlist_title = sanitize_filename(playlist_title)
        sanitized_playlist_title = secure_filename(sanitized_playlist_title)
        logging.info(
            f"Playlist title: '{sanitized_playlist_title}' for job_id: {job_id}"
        )

        # Track download results
        completed = 0
        failed_videos = []
        successful_videos = []

        # Use ThreadPoolExecutor for concurrent downloads
        with ThreadPoolExecutor(max_workers=thread_count) as executor:
            # Submit all download tasks
            future_to_video = {
                executor.submit(download_single_video, video_id, temp_dir): video_id
                for video_id in video_ids
            }

            # Process completed downloads
            for future in as_completed(future_to_video):
                result = future.result()
                completed += 1

                if result["success"]:
                    successful_videos.append(result)
                    logging.info(
                        f"Progress: {completed}/{total_videos} - "
                        f"Successfully downloaded '{result.get('title', result['video_id'])}'"
                    )
                else:
                    failed_videos.append(result)
                    logging.warning(
                        f"Progress: {completed}/{total_videos} - "
                        f"Failed to download {result['video_id']}: {result.get('error', 'Unknown error')}"
                    )

                # Update progress file with thread-safe lock
                with progress_lock:
                    with open(progress_file, "w") as f:
                        json.dump(
                            {
                                "status": "processing",
                                "current": completed,
                                "total": total_videos,
                                "successful": len(successful_videos),
                                "failed": len(failed_videos),
                            },
                            f,
                        )

        # Log summary
        logging.info(
            f"Download complete for job_id: {job_id}. "
            f"Successful: {len(successful_videos)}, Failed: {len(failed_videos)}"
        )

        # Check if we have any successful downloads
        if len(successful_videos) == 0:
            error_msg = (
                "All videos failed to download. "
                f"Total attempted: {total_videos}, Failed: {len(failed_videos)}"
            )
            logging.error(f"Job {job_id}: {error_msg}")

            final_status = {
                "status": "error",
                "message": error_msg,
                "total": total_videos,
                "successful": 0,
                "failed": len(failed_videos),
                "failed_videos": [
                    {
                        "video_id": v["video_id"],
                        "title": v.get("title", "Unknown"),
                        "error": v.get("error", "Unknown error"),
                    }
                    for v in failed_videos
                ],
            }

            with open(progress_file, "w") as f:
                json.dump(final_status, f)

            # Clean up temp directory
            rmtree(temp_dir)
            return

        # Zip the successfully downloaded files
        logging.info(f"Zipping files for job_id: {job_id}")
        with open(progress_file, "w") as f:
            json.dump(
                {
                    "status": "zipping",
                    "current": total_videos,
                    "total": total_videos,
                    "successful": len(successful_videos),
                    "failed": len(failed_videos),
                },
                f,
            )

        zip_filename = f"{sanitized_playlist_title}_{job_id}.zip"
        zip_path = os.path.join("temp_downloads", zip_filename)
        with zipfile.ZipFile(zip_path, "w") as zipf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    zipf.write(os.path.join(root, file), arcname=file)

        logging.info(f"Zipping complete for job_id: {job_id}. Zip path: {zip_path}")

        # Prepare final status with failed video info
        final_status = {
            "status": "complete",
            "zip_name": zip_filename,
            "total": total_videos,
            "successful": len(successful_videos),
            "failed": len(failed_videos),
        }

        # Add failed video details if any
        if failed_videos:
            final_status["failed_videos"] = [
                {
                    "video_id": v["video_id"],
                    "title": v.get("title", "Unknown"),
                    "error": v.get("error", "Unknown error"),
                }
                for v in failed_videos
            ]

        with open(progress_file, "w") as f:
            json.dump(final_status, f)

        rmtree(temp_dir)
        logging.info(f"Cleaned up temp directory: {temp_dir}")

    except Exception as e:
        logging.error(
            f"Error in do_playlist_download for job_id: {job_id}: {e}", exc_info=True
        )
        with open(progress_file, "w") as f:
            json.dump({"status": "error", "message": str(e)}, f)


@router.post("/download-playlist")
@limiter.limit("3/hour")
async def download_playlist(
    request: Request,
    request_body: PlaylistDownloadModel, background_tasks: BackgroundTasks
):
    # Check disk space before accepting new download
    if not check_disk_space_available():
        raise HTTPException(
            status_code=507,
            detail="Service storage limit reached. Please try again later."
        )
    
    job_id = str(uuid.uuid4())
    logging.info(f"Creating download job with job_id: {job_id}")

    os.makedirs("temp_downloads", exist_ok=True)

    progress_file = os.path.join("temp_downloads", f"{job_id}_progress.json")

    # Create the progress file immediately with an initializing state
    with open(progress_file, "w") as f:
        json.dump(
            {"status": "initializing", "current": 0, "total": len(request_body.video_ids)}, f
        )

    background_tasks.add_task(
        do_playlist_download, request_body.url, request_body.video_ids, job_id
    )
    return JSONResponse({"job_id": job_id})


@router.get("/playlist-download-progress/{job_id}")
async def get_playlist_download_progress(job_id: str):
    try:
        # Validate job_id as a UUID
        uuid.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job ID format.")

    base_path = "temp_downloads"
    progress_file = os.path.normpath(os.path.join(base_path, f"{job_id}_progress.json"))

    # Ensure the normalized path is within the base directory
    if not progress_file.startswith(base_path):
        raise HTTPException(
            status_code=403, detail="Access to the specified file is forbidden."
        )

    if not os.path.exists(progress_file):
        raise HTTPException(status_code=404, detail="Job not found.")
    with open(progress_file, "r") as f:
        progress = json.load(f)
    return JSONResponse(progress)


@router.get("/download-zip/")
@limiter.limit("10/minute")
async def download_zip(
    request: Request,
    zip_name: str = Query(..., alias="filename"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    logging.info(f"Download request received for zip: {zip_name}")
    base_path = "temp_downloads"
    # Defense in depth: Use both sanitization functions for maximum safety
    # sanitize_filename() handles command injection and path traversal
    # secure_filename() provides additional werkzeug-specific protections
    sanitized_zip_name = sanitize_filename(zip_name)
    sanitized_zip_name = secure_filename(sanitized_zip_name)
    zip_path = os.path.abspath(os.path.normpath(os.path.join(base_path, sanitized_zip_name)))
    if not zip_path.startswith(os.path.abspath(base_path)):
        logging.error(f"Access to the specified file is forbidden: {zip_path}")
        raise HTTPException(
            status_code=403, detail="Access to the specified file is forbidden."
        )
    if not os.path.exists(zip_path):
        logging.error(f"Zip file not found at path: {zip_path}")
        raise HTTPException(status_code=404, detail="Zip file not found.")

    # Extract job_id from zip filename to locate progress file
    # Filename format: {sanitized_playlist_title}_{job_id}.zip
    # SECURITY: Use sanitized_zip_name instead of original zip_name to prevent path traversal
    try:
        job_id = sanitized_zip_name.rsplit("_", 1)[1].replace(".zip", "")

        # Validate that job_id is a proper UUID (consistent with other endpoints)
        uuid.UUID(job_id)

        base_path_abs = os.path.abspath(base_path)
        progress_file_path = os.path.abspath(
            os.path.normpath(os.path.join(base_path_abs, f"{job_id}_progress.json"))
        )

        # Validate the progress file path is within the allowed directory
        # Use os.sep for more robust path validation across platforms
        if not progress_file_path.startswith(base_path_abs + os.sep):
            logging.warning(f"Progress file path traversal attempt blocked: {progress_file_path}")
            progress_file_path = None
    except (IndexError, ValueError):
        # If we can't extract or validate job_id, just delete the zip file
        progress_file_path = None
        logging.warning(f"Could not extract valid job_id from zip filename: {sanitized_zip_name}")

    # Schedule file deletions after serving to user
    background_tasks.add_task(remove_file, zip_path)
    if progress_file_path and os.path.exists(progress_file_path):
        background_tasks.add_task(remove_file, progress_file_path)

    # Use sanitized filename in the response header
    return FileResponse(path=zip_path, media_type="application/zip", filename=sanitized_zip_name)
