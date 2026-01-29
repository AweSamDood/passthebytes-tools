# import asyncio
import json
import logging
import os
import re
import uuid
import zipfile
from shutil import rmtree

import yt_dlp
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from werkzeug.utils import secure_filename

from app.utils import sanitize_filename

# from urllib.parse import parse_qs, urlparse


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

router = APIRouter()


class URLModel(BaseModel):
    url: str


class PlaylistDownloadModel(BaseModel):
    url: str
    video_ids: list[str]


# def remove_file(path: str):
#     if os.path.exists(path):
#         os.unlink(path)


def remove_dir(path: str):
    if os.path.exists(path):
        rmtree(path)


@router.post("/info")
async def get_info(url_model: URLModel):
    ydl_opts = {"noplaylist": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url_model.url, download=False)
            return {"title": info.get("title"), "thumbnail": info.get("thumbnail")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error fetching video info: {e}")


@router.post("/download/{file_format}")
async def download_file(
    file_format: str, url_model: URLModel, background_tasks: BackgroundTasks
):
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

    # background_tasks.add_task(remove_file, downloaded_file_path)

    return FileResponse(
        path=downloaded_file_path, media_type=media_type, filename=file_name_for_client
    )


@router.post("/playlist-info")
async def get_playlist_info(url_model: URLModel):
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
    logging.info(f"Total videos to download: {total_videos} for job_id: {job_id}")

    try:
        playlist_info_opts = {"extract_flat": True, "noplaylist": False}
        with yt_dlp.YoutubeDL(playlist_info_opts) as ydl:
            playlist_info = ydl.extract_info(url, download=False)
        playlist_title = playlist_info.get("title", "playlist")
        # Use both werkzeug secure_filename and our sanitize_filename for defense in depth
        sanitized_playlist_title = sanitize_filename(playlist_title)
        sanitized_playlist_title = secure_filename(sanitized_playlist_title)
        logging.info(
            f"Playlist title: '{sanitized_playlist_title}' for job_id: {job_id}"
        )

        for i, video_id in enumerate(video_ids):
            logging.info(
                f"Downloading video {i+1}/{total_videos} "
                f"(ID: {video_id}) for job_id: {job_id}"
            )
            with open(progress_file, "w") as f:
                json.dump(
                    {"status": "processing", "current": i + 1, "total": total_videos}, f
                )

            video_url = f"https://www.youtube.com/watch?v={video_id}"
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
            logging.info(
                f"Finished downloading video "
                f"{i+1}/{total_videos} (ID: {video_id}) for job_id: {job_id}"
            )

        logging.info(f"Zipping files for job_id: {job_id}")
        with open(progress_file, "w") as f:
            json.dump(
                {"status": "zipping", "current": total_videos, "total": total_videos}, f
            )

        zip_filename = f"{sanitized_playlist_title}_{job_id}.zip"
        zip_path = os.path.join("temp_downloads", zip_filename)
        with zipfile.ZipFile(zip_path, "w") as zipf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    zipf.write(os.path.join(root, file), arcname=file)

        logging.info(f"Zipping complete for job_id: {job_id}. Zip path: {zip_path}")
        with open(progress_file, "w") as f:
            json.dump({"status": "complete", "zip_name": zip_filename}, f)

        rmtree(temp_dir)
        logging.info(f"Cleaned up temp directory: {temp_dir}")

    except Exception as e:
        logging.error(
            f"Error in do_playlist_download for job_id: {job_id}: {e}", exc_info=True
        )
        with open(progress_file, "w") as f:
            json.dump({"status": "error", "message": str(e)}, f)


@router.post("/download-playlist")
async def download_playlist(
    request: PlaylistDownloadModel, background_tasks: BackgroundTasks
):
    job_id = str(uuid.uuid4())
    logging.info(f"Creating download job with job_id: {job_id}")

    os.makedirs("temp_downloads", exist_ok=True)

    progress_file = os.path.join("temp_downloads", f"{job_id}_progress.json")

    # Create the progress file immediately with an initializing state
    with open(progress_file, "w") as f:
        json.dump(
            {"status": "initializing", "current": 0, "total": len(request.video_ids)}, f
        )

    background_tasks.add_task(
        do_playlist_download, request.url, request.video_ids, job_id
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
async def download_zip(
    zip_name: str = Query(..., alias="filename"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    logging.info(f"Download request received for zip: {zip_name}")
    base_path = "temp_downloads"
    # Sanitize filename to prevent path traversal
    sanitized_zip_name = sanitize_filename(zip_name)
    # Also use werkzeug's secure_filename for additional safety
    sanitized_zip_name = secure_filename(sanitized_zip_name)
    zip_path = os.path.normpath(os.path.join(base_path, sanitized_zip_name))
    if not zip_path.startswith(os.path.abspath(base_path)):
        logging.error(f"Access to the specified file is forbidden: {zip_path}")
        raise HTTPException(
            status_code=403, detail="Access to the specified file is forbidden."
        )
    if not os.path.exists(zip_path):
        logging.error(f"Zip file not found at path: {zip_path}")
        raise HTTPException(status_code=404, detail="Zip file not found.")

    # progress_file_name = zip_name.replace(".zip", "_progress.json")
    # progress_file_path = os.path.join("temp_downloads", progress_file_name)

    # background_tasks.add_task(remove_file, zip_path)
    # background_tasks.add_task(remove_file, progress_file_path)
    # Use sanitized filename in the response header
    return FileResponse(path=zip_path, media_type="application/zip", filename=sanitized_zip_name)
