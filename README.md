# PassTheBytes Tools

Hello! This is a solo developer project that I self-host. It's live and available for you to use at **[https://tools.passthebytes.com](https://tools.passthebytes.com)**.

This project is part of a larger stack of self-hosted services, which you can see on my dashboard at **[https://dash.passthebytes.com](https://dash.passthebytes.com)**.

It features a complete CI/CD pipeline using GitHub Actions for automated testing, security scanning, and deployment.

A collection of useful web-based tools for file conversion and processing, containerized with Docker for easy deployment.

## Your Privacy is Our Priority

I am deeply committed to protecting your privacy. This service is designed with a "privacy-first" approach, meaning:

-   **I collect absolutely no data.** No logs, no analytics, no tracking. Your activity is your own.
-   **All uploaded files are temporary and instantly deleted.** Files are held in memory only for the duration of the processing task. The moment the task is complete (or fails), the file is permanently erased from the server.
-   **No user accounts are required.** You can use all tools anonymously without signing up.
-   **The code is fully open-source.** You can inspect the code to verify my privacy claims for yourself.

I believe that you have the right to use online tools without compromising your privacy.

## Features

### PNG to PDF Converter
- **Multiple File Upload**: Drag and drop or select multiple PNG/JPG files.
- **Visual Preview**: See thumbnails of all uploaded images.
- **Custom Ordering**: Drag and drop to reorder pages in the final PDF.
- **Quality Control**: Adjustable DPI settings (72-600 DPI).
- **Batch Processing**: Convert up to 50 images at once.
- **High-Quality Output**: Uses `ocrmypdf` for professional results without performing OCR.

### Image Format Converter
- **Multiple File Upload**: Convert multiple images at once.
- **Multiple Formats**: Supports conversion between PNG, JPEG, WEBP, and ICO.
- **Batch Processing**: Handles multiple files and provides a ZIP archive for download.
- **Transparency Handling**: Correctly handles transparent backgrounds when converting to formats like JPEG.

### Coming Soon
- Image Optimizer
- Password Generator
- Text from Image Extractor (OCR)
- YouTube to MP3/MP4 Downloader

## Technology Stack

- **Frontend**: React 18, Material-UI
- **Backend**: FastAPI, `ocrmypdf`, Pillow, PyPDF2
- **Infrastructure**: Docker, NGINX, Let's Encrypt

## Getting Started

### Configuration

Before running the application, you need to set up your environment variables.

1.  **Copy the example file**:
    ```bash
    cp .env.example .env
    ```
2.  **Edit the `.env` file** with your specific settings. See the comments in the file for guidance.

    - `NGINX_DEPLOY_SCRIPT_PATH`: (Production only) The absolute path to your `nginx-site-deploy.sh` script on the server.

### Development

To run the application in a local development environment:

```bash
# 1. Clone the repository
git clone <repository-url>
cd passthebytes-tools

# 2. Create and configure your .env file (see Configuration section)
cp .env.example .env
# ... edit .env for your local setup ...

# 3. Build and start the services
docker-compose up --build -d
```

- **Frontend**: [http://localhost:3030](http://localhost:3030)
- **Backend API**: [http://localhost:8008](http://localhost:8008)
- **API Docs**: [http://localhost:8008/docs](http://localhost:8008/docs)

### Production Deployment

The `deployment/deploy.sh` script is designed to automate production deployment on a Linux server.

1.  **Ensure your server meets the prerequisites**:
    - Docker and Docker Compose are installed.
    - You have a deployment script for NGINX (a sample is provided in the `deployment` directory).

2.  **Configure your environment**:
    - Place the project files on your server.
    - Create a `.env` file and set `NGINX_DEPLOY_SCRIPT_PATH` to the absolute path of your NGINX deployment script.

3.  **Run the deployment script**:

    - **For regular code updates (most common case):**
      ```bash
      sudo ./deployment/deploy.sh production
      ```
      This will rebuild and restart the Docker containers without touching the NGINX configuration.

    - **To run the NGINX and SSL setup for the first time or to reconfigure it:**
      ```bash
      sudo ./deployment/deploy.sh -r production
      ```

    - **To force an overwrite of an existing NGINX configuration:**
      ```bash
      sudo ./deployment/deploy.sh -f -r production
      ```

## API Documentation

Interactive API documentation is available via Swagger UI. Once the backend is running, navigate to `/docs` on the backend's URL. For development, this is [http://localhost:8008/docs](http://localhost:8008/docs).

## Contributing

Contributions are welcome! Please feel free to fork the repository, make changes, and submit a pull request.

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` file for more information.
