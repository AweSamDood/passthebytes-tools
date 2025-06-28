import os
from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import (
    image_converter,
    password_generator,
    png_to_pdf,
    qr_code_generator,
    youtube_downloader,
)
from .services.cleanup import cleanup_temporary_files

# Scheduler for cleanup tasks
scheduler = BackgroundScheduler()
scheduler.add_job(cleanup_temporary_files, "interval", hours=1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="PassTheBytes Tools API",
    description="A collection of useful tools for file conversion and processing",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS based on environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    allowed_origins = ["https://tools.passthebytes.com"]
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "content-disposition"],
)

# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

# Include routers
app.include_router(png_to_pdf.router, prefix="/api/png-to-pdf", tags=["PNG to PDF"])
app.include_router(
    image_converter.router, prefix="/api/image-converter", tags=["Image Converter"]
)
app.include_router(
    password_generator.router,
    prefix="/api/password-generator",
    tags=["Password Generator"],
)
app.include_router(
    qr_code_generator.router,
    prefix="/api/qr-code-generator",
    tags=["QR Code Generator"],
)
app.include_router(
    youtube_downloader.router,
    prefix="/api/youtube",
    tags=["YouTube Downloader"],
)


@app.get("/")
async def root():
    return {"message": "PassTheBytes Tools API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
