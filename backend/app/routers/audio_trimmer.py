# app/routers/audio_trimmer.py
"""
Audio trimmer.

The browser does the common work: it decodes the file, draws the waveform,
previews the selection and exports WAV, so nothing leaves the machine. This
router covers the two things the browser cannot do on its own -- encoding to
MP3/M4A/M4R, and producing waveform peaks for inputs the browser refuses to
decode.
"""

import array
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.background import BackgroundTask

from app.services.cleanup import check_disk_space_available
from app.utils import sanitize_filename

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

# Kept clearly under the 100 MB cap in InputValidationMiddleware so that an
# oversized upload gets this router's message instead of a bare 413.
MAX_FILE_SIZE = 90 * 1024 * 1024  # 90 MB

ALLOWED_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".flac",
    ".m4a",
    ".mp4",
    ".aac",
    ".ogg",
    ".oga",
    ".opus",
    ".webm",
}

# output format -> (codec args, container args, media type)
OUTPUT_FORMATS = {
    "mp3": (["-c:a", "libmp3lame"], ["-f", "mp3"], "audio/mpeg"),
    "m4a": (["-c:a", "aac", "-movflags", "+faststart"], ["-f", "ipod"], "audio/mp4"),
    "m4r": (["-c:a", "aac", "-movflags", "+faststart"], ["-f", "ipod"], "audio/mp4"),
    "wav": (["-c:a", "pcm_s16le"], ["-f", "wav"], "audio/wav"),
}

LOSSY_FORMATS = {"mp3", "m4a", "m4r"}

ALLOWED_BITRATES = {96, 128, 192, 256, 320}

# Peaks are only a fallback rendering path, so they are computed from a heavily
# downsampled mono copy -- enough to draw a waveform, cheap to produce.
PEAKS_SAMPLE_RATE = 4000
MAX_PEAKS = 4000
DEFAULT_PEAKS = 1200

FFMPEG_TIMEOUT = 300  # seconds
FFPROBE_TIMEOUT = 30  # seconds


def _validate_upload(file: UploadFile) -> str:
    """Check the upload is an audio file we are willing to hand to ffmpeg."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    extension = Path(file.filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format "
            f"'{extension or file.filename}'. Supported formats are: "
            f"{', '.join(sorted(e.lstrip('.') for e in ALLOWED_EXTENSIONS))}",
        )

    return extension


async def _save_upload(file: UploadFile, temp_dir: str, extension: str) -> str:
    """Stream the upload to disk under a generated name, enforcing the size cap."""
    # The name is generated rather than taken from file.filename: the path is
    # handed to ffmpeg, so it must not carry anything the user chose.
    input_path = os.path.join(temp_dir, f"input{extension}")

    bytes_written = 0
    with open(input_path, "wb") as destination:
        while chunk := await file.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File exceeds the maximum size of "
                    f"{MAX_FILE_SIZE // (1024 * 1024)} MB.",
                )
            destination.write(chunk)

    if bytes_written == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    return input_path


def _run(cmd: list, timeout: int) -> subprocess.CompletedProcess:
    """
    Run an ffmpeg/ffprobe command without a shell, raising on failure.

    stdout is captured as bytes because some callers pipe raw PCM through it.
    """
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        logger.error(f"{cmd[0]} timed out after {timeout}s")
        raise HTTPException(
            status_code=504,
            detail="Audio processing timed out. Try a shorter file.",
        )
    except FileNotFoundError:
        logger.error(f"Executable not found: {cmd[0]}")
        raise HTTPException(
            status_code=500, detail="Audio processing is unavailable on this server."
        )

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        logger.error(f"{cmd[0]} failed ({result.returncode}): {stderr[-2000:]}")
        raise HTTPException(
            status_code=400,
            detail="Could not process this audio file. It may be corrupt or "
            "use an unsupported codec.",
        )

    return result


def _probe_duration(input_path: str) -> float:
    """Return the audio duration in seconds."""
    result = _run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "format=duration:stream=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            input_path,
        ],
        FFPROBE_TIMEOUT,
    )

    # The stream and the container each report a duration and either may be
    # missing or "N/A"; take the first value that parses.
    for line in result.stdout.decode("utf-8", errors="replace").split():
        try:
            duration = float(line)
        except ValueError:
            continue
        if duration > 0:
            return duration

    raise HTTPException(
        status_code=400,
        detail="Could not determine the duration of this file. "
        "It may not contain an audio stream.",
    )


def _bucket_peaks(samples: array.array, buckets: int) -> list:
    """Reduce PCM samples to one normalised 0..1 peak per bucket."""
    if not samples:
        return [0.0] * buckets

    width = max(1, len(samples) // buckets)
    result = []
    for index in range(0, len(samples), width):
        window = samples[index : index + width]
        if not window:
            break
        # abs(-32768) overflows a signed short, hence max(highest, -lowest)
        loudest = max(max(window), -min(window))
        result.append(min(1.0, loudest / 32767.0))

    return result[:buckets]


def _build_selection_args(start: float, end: float, mode: str, duration: float) -> list:
    """
    Build the ffmpeg arguments that select which audio survives.

    'keep' emits the selection. 'remove' emits everything either side of it,
    concatenated -- degrading to a plain trim when the selection touches an
    edge, because concat needs two non-empty segments.
    """
    if mode == "keep":
        return ["-ss", f"{start:.6f}", "-to", f"{end:.6f}", "-map", "0:a:0"]

    has_head = start > 0
    has_tail = end < duration

    if not has_head and not has_tail:
        raise HTTPException(
            status_code=400,
            detail="Removing the whole selection would leave an empty file.",
        )

    if not has_head:
        return ["-ss", f"{end:.6f}", "-map", "0:a:0"]
    if not has_tail:
        return ["-to", f"{start:.6f}", "-map", "0:a:0"]

    filtergraph = (
        f"[0:a:0]atrim=end={start:.6f},asetpts=PTS-STARTPTS[head];"
        f"[0:a:0]atrim=start={end:.6f},asetpts=PTS-STARTPTS[tail];"
        f"[head][tail]concat=n=2:v=0:a=1[out]"
    )
    return ["-filter_complex", filtergraph, "-map", "[out]"]


@router.post("/probe")
@limiter.limit("20/minute")
async def probe_audio(
    request: Request,
    file: UploadFile = File(...),
    peaks: int = Form(DEFAULT_PEAKS),
):
    """
    Return duration and waveform peaks for an audio file.

    The frontend only calls this when the browser's own decoder rejects the
    file, so that the waveform still renders and the selection stays usable.
    """
    if not check_disk_space_available():
        raise HTTPException(
            status_code=507,
            detail="Service storage limit reached. Please try again later.",
        )

    if not 1 <= peaks <= MAX_PEAKS:
        raise HTTPException(
            status_code=400, detail=f"peaks must be between 1 and {MAX_PEAKS}"
        )

    extension = _validate_upload(file)
    temp_dir = tempfile.mkdtemp()

    try:
        input_path = await _save_upload(file, temp_dir, extension)
        duration = _probe_duration(input_path)

        # Decode to low-rate mono PCM; that is all a waveform needs.
        result = _run(
            [
                "ffmpeg",
                "-v",
                "error",
                "-i",
                input_path,
                "-map",
                "0:a:0",
                "-ac",
                "1",
                "-ar",
                str(PEAKS_SAMPLE_RATE),
                "-f",
                "s16le",
                "-",
            ],
            FFMPEG_TIMEOUT,
        )

        samples = array.array("h")
        raw = result.stdout
        samples.frombytes(raw[: len(raw) - (len(raw) % samples.itemsize)])

        return {
            "duration": duration,
            "sample_rate": PEAKS_SAMPLE_RATE,
            "peaks": _bucket_peaks(samples, peaks),
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Unexpected error during probe: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyse audio file")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@router.post("/export")
@limiter.limit("10/minute")
async def export_audio(
    request: Request,
    file: UploadFile = File(...),
    start: float = Form(...),
    end: float = Form(...),
    mode: str = Form("keep"),
    output_format: str = Form("mp3"),
    bitrate: int = Form(192),
):
    """Trim an audio file and encode the result to the requested format."""
    if not check_disk_space_available():
        raise HTTPException(
            status_code=507,
            detail="Service storage limit reached. Please try again later.",
        )

    mode = mode.lower()
    if mode not in ("keep", "remove"):
        raise HTTPException(status_code=400, detail="mode must be 'keep' or 'remove'")

    output_format = output_format.lower()
    if output_format not in OUTPUT_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported output format. Supported formats are: "
            f"{', '.join(OUTPUT_FORMATS)}",
        )

    if bitrate not in ALLOWED_BITRATES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported bitrate. Supported bitrates are: "
            f"{', '.join(str(b) for b in sorted(ALLOWED_BITRATES))} kbps",
        )

    if start < 0 or end < 0:
        raise HTTPException(
            status_code=400, detail="start and end must not be negative"
        )

    if end <= start:
        raise HTTPException(status_code=400, detail="end must be greater than start")

    extension = _validate_upload(file)
    temp_dir = tempfile.mkdtemp()

    try:
        input_path = await _save_upload(file, temp_dir, extension)
        duration = _probe_duration(input_path)

        if start >= duration:
            raise HTTPException(
                status_code=400,
                detail=f"start ({start:.3f}s) is beyond the end of the "
                f"file ({duration:.3f}s)",
            )

        # The browser's decoder and ffmpeg can disagree about the duration by a
        # few milliseconds, so clamp rather than reject a selection that runs
        # to the very end of the file.
        end = min(end, duration)

        codec_args, container_args, media_type = OUTPUT_FORMATS[output_format]
        output_path = os.path.join(temp_dir, f"output.{output_format}")

        cmd = ["ffmpeg", "-v", "error", "-y", "-i", input_path]
        cmd += _build_selection_args(start, end, mode, duration)
        cmd += codec_args
        if output_format in LOSSY_FORMATS:
            cmd += ["-b:a", f"{bitrate}k"]
        # Tags can carry cover art and arbitrary text from the source file;
        # neither belongs in a trimmed clip.
        cmd += ["-map_metadata", "-1"]
        cmd += container_args
        cmd += [output_path]

        _run(cmd, FFMPEG_TIMEOUT)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise HTTPException(
                status_code=500, detail="Trimming produced an empty file"
            )

        stem = Path(sanitize_filename(file.filename)).stem or "audio"
        output_filename = f"{stem}_trimmed.{output_format}"

        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type=media_type,
            background=BackgroundTask(shutil.rmtree, temp_dir, ignore_errors=True),
        )
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Unexpected error during export: {e}")
        raise HTTPException(status_code=500, detail="Failed to trim audio file")
