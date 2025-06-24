import io
import os
import zipfile
from typing import List

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image

router = APIRouter()

SUPPORTED_INPUT_FORMATS = {
    "image/jpeg": "JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
    "image/gif": "GIF",
    "image/bmp": "BMP",
}

SUPPORTED_OUTPUT_FORMATS = {
    "png": "PNG",
    "jpeg": "JPEG",
    "webp": "WEBP",
    "ico": "ICO",
}


MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/convert-image")
async def convert_image(
    files: List[UploadFile] = File(...), output_format: str = Form(...)
):
    # Validate file size
    for file in files:
        file_size = len(await file.read())
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File {file.filename} exceeds the maximum size of "
                f"{MAX_FILE_SIZE // (1024 * 1024)} MB.",
            )
        await file.seek(0)  # Reset file pointer after reading
    output_format = output_format.lower()
    if output_format not in SUPPORTED_OUTPUT_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported output format. Supported formats are: "
            f"{list(SUPPORTED_OUTPUT_FORMATS.keys())}",
        )

    # Validate all files before processing
    for file in files:
        if file.content_type not in SUPPORTED_INPUT_FORMATS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported input file format: {file.filename}."
                f" Supported formats are: {list(SUPPORTED_INPUT_FORMATS.keys())}",
            )

    converted_files = []
    for file in files:
        try:
            image_data = await file.read()
            image = Image.open(io.BytesIO(image_data))

            if output_format == "jpeg" and image.mode in ("RGBA", "P", "LA"):
                if image.mode != "RGBA":
                    image = image.convert("RGBA")

                background = Image.new("RGB", image.size, (255, 255, 255))
                background.paste(image, (0, 0), image)
                image = background
            elif output_format == "ico" and image.mode in ("RGBA", "P"):
                image = image.convert("RGB")

            output_io = io.BytesIO()
            image.save(output_io, format=SUPPORTED_OUTPUT_FORMATS[output_format])
            output_io.seek(0)

            base_filename, _ = os.path.splitext(file.filename)
            new_filename = f"{base_filename}.{output_format}"

            converted_files.append({"filename": new_filename, "data": output_io})
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"An error occurred during conversion"
                f" of {file.filename}: {str(e)}",
            )

    # If only one file was processed, return it directly
    if len(converted_files) == 1:
        single_file = converted_files[0]
        media_type = f"image/{output_format}"
        if output_format == "ico":
            media_type = "image/x-icon"

        return StreamingResponse(
            single_file["data"],
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={single_file['filename']}"
            },
        )

    # If multiple files were processed, return a zip archive
    zip_io = io.BytesIO()
    with zipfile.ZipFile(zip_io, mode="w", compression=zipfile.ZIP_DEFLATED) as zipf:
        for f in converted_files:
            zipf.writestr(f["filename"], f["data"].getvalue())

    zip_io.seek(0)

    return StreamingResponse(
        zip_io,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=converted_images.zip"},
    )
