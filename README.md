# PassTheBytes Tools

A collection of useful web-based tools for file conversion and processing, containerized with Docker for easy deployment.

## Features

### PNG to PDF Converter
- **Multiple File Upload**: Drag and drop or select multiple PNG/JPG files.
- **Visual Preview**: See thumbnails of all uploaded images.
- **Custom Ordering**: Drag and drop to reorder pages in the final PDF.
- **Quality Control**: Adjustable DPI settings (72-600 DPI).
- **Batch Processing**: Convert up to 50 images at once.
- **High-Quality Output**: Uses `ocrmypdf` for professional results without performing OCR.

### Coming Soon
- Image Optimizer
- Format Converter

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

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Production Deployment

The `deployment/deploy.sh` script is designed to automate production deployment on a Linux server.

1.  **Ensure your server meets the prerequisites**:
    - Docker and Docker Compose are installed.
    - You have a deployment script for NGINX (a sample is provided in the `deployment` directory).

2.  **Configure your environment**:
    - Place the project files on your server.
    - Create a `.env` file and set `NGINX_DEPLOY_SCRIPT_PATH` to the absolute path of your NGINX deployment script.

3.  **Run the deployment script**:
    ```bash
    sudo ./deployment/deploy.sh production
    ```

This script will:
- Build and deploy the production Docker containers.
- Execute your NGINX script to configure the site and obtain SSL certificates.
- Make the tools available at your configured domain.

## API Documentation

Interactive API documentation is available via Swagger UI. Once the backend is running, navigate to [/docs](http://localhost:8000/docs) on the backend's URL.

## Contributing

Contributions are welcome! Please feel free to fork the repository, make changes, and submit a pull request.

1.  Fork the repository
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` file for more information.
