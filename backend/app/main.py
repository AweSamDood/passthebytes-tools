# app/main.py
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routers import image_converter, png_to_pdf

# Create FastAPI instance
app = FastAPI(
    title="PassTheBytes Tools API",
    description="A collection of useful tools for file conversion and processing",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

# Include routers
app.include_router(png_to_pdf.router, prefix="/api/png-to-pdf", tags=["PNG to PDF"])
app.include_router(
    image_converter.router, prefix="/api/image-converter", tags=["Image Converter"]
)


@app.get("/")
async def root():
    return {"message": "PassTheBytes Tools API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
