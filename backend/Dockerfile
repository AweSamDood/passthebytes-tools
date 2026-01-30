# Dockerfile
# Use Python 3.11 (unaffected by CVE-2025-13836 which only affects 3.13.0-3.13.10, 3.14.0, 3.15.0-alpha)
FROM python:3.11-slim

# Update system packages to fix critical CVEs
# CVE-2025-15467: OpenSSL RCE/DoS vulnerability
# CVE-2025-13836: Python 3.13 HTTP client DoS (not applicable to Python 3.11, but update any python3.13-minimal deps)
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

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
    ffmpeg \
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
CMD ["/bin/sh", "-c", "printenv && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
