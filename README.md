# PassTheBytes Tools

Hello and Welcome to PassTheBytes Tools! 
This is a special project for me, as it's the first one where I've built a complete, end-to-end CI/CD pipeline from scratch.
The entire application is fully containerized with Docker and automatically deployed using GitHub Actions on a self-hosted runner.

This collection of tools is born from my passion for self-hosting and creating useful, privacy-respecting applications.

**Live instance:** [https://tools.passthebytes.com](https://tools.passthebytes.com)  
**Dashboard:** [https://dash.passthebytes.com](https://dash.passthebytes.com)

## Future Plans

I'm planning to introduce a database to gather anonymous usage statistics. This will help identify the most popular tools and collect user feedback for future improvements, all while respecting user privacy. Adding a database will also introduce the final missing piece to the technology stack.

## Tech Stack

- **Frontend**: React 18, Material-UI
- **Backend**: FastAPI (Python 3.11)
- **Infrastructure**: Docker, NGINX, Let's Encrypt
- **CI/CD**: GitHub Actions

## Core Principles

- **Privacy-First:** The service is stateless. No logs, no analytics, and no user accounts. Uploaded files are processed in memory and immediately discarded.
- **Open Source:** The code is fully available for review and contribution.

## CI/CD Pipeline

This project uses GitHub Actions for a full CI/CD workflow on pushes to `main`:

- **CI:** Lints and tests the code using `pytest`, `black`, `isort`, `flake8`, `safety`, and `bandit`.
- **CD:** Deploys to a self-hosted runner, syncs the code, runs the deployment script (`deployment/deploy.sh`), and performs health checks.

## Available Tools

- **Converters:** PNG/JPG to PDF, Image Format Converter (PNG, JPEG, WEBP, ICO)
- **Downloaders:** YouTube Video/Playlist Downloader (MP4, MP3)
- **Generators:** Password Generator, QR Code Generator, Meme Generator (coming soon)
- **Text Tools:** Mocking Text Generator

## Local Development

### Prerequisites

- Docker & Docker Compose

### Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd passthebytes-tools
    ```

2.  **Configure environment:**

    ```bash
    cp .env.example .env
    # Edit .env for your local setup
    ```

3.  **Run services:**

    ```bash
    docker-compose up --build -d
    ```

    - **Frontend:** `http://localhost:3030`
    - **Backend API:** `http://localhost:8008`
    - **API Docs:** `http://localhost:8008/docs`

### Code Formatting (Optional)

This project includes automated code formatting tools. Run before committing:

**Windows:**
```bash
.\format-code.bat
# or
.\format-code.ps1
```

**Note:** All formatting checks are **non-blocking** and informational only. You can commit and push regardless of warnings. See [FORMATTING.md](FORMATTING.md) for details.

## Production Deployment

The `deployment/deploy.sh` script is designed for automated production deployment on a Linux server. For details, review the script and the GitHub Actions `deploy.yml` workflow.

## Contributing

Contributions are welcome. Please fork the repository and submit a pull request.

## License

MIT
