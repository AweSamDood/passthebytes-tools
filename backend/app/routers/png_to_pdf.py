# app/routers/png_to_pdf.py
import logging
import os
import shutil
import subprocess
import tempfile
import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from PIL import Image
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.background import BackgroundTask

from app.services.cleanup import check_disk_space_available
from app.utils import sanitize_filename

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize rate limiter for this router
limiter = Limiter(key_func=get_remote_address)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def validate_image_file(file: UploadFile) -> bool:
    """Validate uploaded file is a valid image"""
    if not file.filename:
        return False

    file_ext = Path(file.filename).suffix.lower()
    return file_ext in ALLOWED_EXTENSIONS


def save_uploaded_file(file: UploadFile, temp_dir: str) -> str:
    """Save uploaded file to temporary directory"""
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400, detail=f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}"
        )

    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(temp_dir, unique_filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Validate it's actually an image
    try:
        with Image.open(file_path) as img:
            img.verify()
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(
            status_code=400, detail=f"Invalid image file; verification error: {e}"
        )

    return file_path


def convert_images_to_pdf(
    image_paths: List[str], output_path: str, dpi: int = 300
) -> str:
    """Convert list of images to PDF using ocrmypdf"""
    try:
        # Create a temporary directory for intermediate files
        with tempfile.TemporaryDirectory() as temp_conversion_dir:
            # Convert each image to PDF first (ocrmypdf requirement)
            pdf_files = []

            for i, image_path in enumerate(image_paths):
                temp_pdf = os.path.join(temp_conversion_dir, f"page_{i:03d}.pdf")

                # Use ocrmypdf to convert image to PDF with specified DPI
                cmd = [
                    "ocrmypdf",
                    "--image-dpi",
                    str(dpi),
                    "--output-type",
                    "pdf",
                    "--skip-text",  # Don't perform OCR, just convert
                    "--optimize",
                    "0",  # Disable optimization to avoid Ghostscript issues
                    image_path,
                    temp_pdf,
                ]

                result = subprocess.run(cmd, capture_output=True, text=True)

                if result.returncode != 0:
                    logger.error(f"ocrmypdf failed for {image_path}: {result.stderr}")
                    raise HTTPException(
                        status_code=500, detail=f"Conversion failed: {result.stderr}"
                    )

                pdf_files.append(temp_pdf)

            # Merge all PDFs into one
            if len(pdf_files) == 1:
                shutil.copy(pdf_files[0], output_path)
            else:
                # Use pypdf to merge PDFs
                merge_pdfs(pdf_files, output_path)

            return output_path

    except subprocess.CalledProcessError as e:
        logger.error(f"Subprocess error: {e}")
        raise HTTPException(status_code=500, detail="PDF conversion failed")
    except Exception as e:
        logger.error(f"Conversion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def merge_pdfs(pdf_files: List[str], output_path: str):
    """Merge multiple PDF files into one using pypdf"""
    try:
        from pypdf import PdfWriter

        writer = PdfWriter()

        for pdf_file in pdf_files:
            writer.append(pdf_file)

        with open(output_path, "wb") as output_file:
            writer.write(output_file)

    except ImportError:
        # Fallback to using pdftk or similar command-line tool
        cmd = ["pdftk"] + pdf_files + ["cat", "output", output_path]
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="PDF merging failed")


@router.post("/convert")
@limiter.limit("10/minute")
async def convert_png_to_pdf(
    request: Request,
    files: List[UploadFile] = File(...),
    dpi: int = Form(300),
    filename: str = Form("converted_document"),
):
    """Convert multiple PNG/JPG files to a single PDF"""

    # Check disk space before accepting new conversion
    if not check_disk_space_available():
        raise HTTPException(
            status_code=507,
            detail="Service storage limit reached. Please try again later."
        )

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    if len(files) > 50:  # Reasonable limit
        raise HTTPException(status_code=400, detail="Too many files (max 50)")

    # Validate DPI
    if not 72 <= dpi <= 600:
        raise HTTPException(status_code=400, detail="DPI must be between 72 and 600")

    # Create temporary directory for this conversion,
    # which will be cleaned up by a background task
    temp_dir = tempfile.mkdtemp()

    try:
        # Save all uploaded files
        image_paths = []
        for file in files:
            if file.size and file.size > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400, detail=f"File {file.filename} is too large"
                )

            file_path = save_uploaded_file(file, temp_dir)
            image_paths.append(file_path)

        # Generate output filename with sanitization to prevent path traversal
        sanitized_filename = sanitize_filename(filename)
        output_filename = (
            f"{sanitized_filename}.pdf" if not sanitized_filename.endswith(".pdf") else sanitized_filename
        )
        output_path = os.path.join(temp_dir, output_filename)

        # Convert to PDF
        convert_images_to_pdf(image_paths, output_path, dpi)

        # Return the PDF file with a background task to clean up the temp directory
        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/pdf",
            background=BackgroundTask(shutil.rmtree, temp_dir, ignore_errors=True),
        )

    except Exception as e:
        # If any exception occurs,
        # ensure the temp directory is cleaned up before raising
        shutil.rmtree(temp_dir, ignore_errors=True)
        if isinstance(e, HTTPException):
            raise
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/info")
async def get_conversion_info():
    """Get information about the PNG to PDF conversion service"""
    return {
        "service": "PNG to PDF Converter",
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size_mb": MAX_FILE_SIZE // (1024 * 1024),
        "max_files": 50,
        "dpi_range": {"min": 72, "max": 600, "default": 300},
    }
