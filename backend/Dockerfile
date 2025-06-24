# Dockerfile
FROM python:3.11-slim

# Install system dependencies for ocrmypdf
RUN apt-get update && apt-get install -y \
    curl \
    tesseract-ocr \
    tesseract-ocr-eng \
    img2pdf \
    libqpdf-dev \
    qpdf \
    pdftk \
    wget \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install newer Ghostscript version to avoid 10.0.0 regressions
RUN wget https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10030/ghostscript-10.03.0.tar.gz \
    && tar -xzf ghostscript-10.03.0.tar.gz \
    && cd ghostscript-10.03.0 \
    && ./configure \
    && make \
    && make install \
    && cd .. \
    && rm -rf ghostscript-10.03.0* \
    && apt-get purge -y build-essential wget \
    && apt-get autoremove -y

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]