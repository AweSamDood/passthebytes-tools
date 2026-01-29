# dev.ps1 - Docker Development Helper Script
param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

$ComposeFile = ".\docker-compose-devcopy.yml"

switch ($Command) {
    "start" {
        Write-Host "Starting all services..." -ForegroundColor Green
        docker compose -f $ComposeFile up -d
    }
    "stop" {
        Write-Host "Stopping all services..." -ForegroundColor Yellow
        docker compose -f $ComposeFile stop
    }
    "down" {
        Write-Host "Stopping and removing containers..." -ForegroundColor Yellow
        docker compose -f $ComposeFile down
    }
    "rebuild-backend" {
        Write-Host "Rebuilding backend..." -ForegroundColor Cyan
        docker compose -f $ComposeFile up -d --build backend
    }
    "rebuild-frontend" {
        Write-Host "Rebuilding frontend..." -ForegroundColor Cyan
        docker compose -f $ComposeFile up -d --build frontend
    }
    "rebuild-all" {
        Write-Host "Rebuilding everything..." -ForegroundColor Cyan
        docker compose -f $ComposeFile up -d --build
    }
    "logs" {
        Write-Host "Showing all logs (Ctrl+C to exit)..." -ForegroundColor Blue
        docker compose -f $ComposeFile logs -f
    }
    "logs-backend" {
        Write-Host "Showing backend logs (Ctrl+C to exit)..." -ForegroundColor Blue
        docker compose -f $ComposeFile logs -f backend
    }
    "logs-frontend" {
        Write-Host "Showing frontend logs (Ctrl+C to exit)..." -ForegroundColor Blue
        docker compose -f $ComposeFile logs -f frontend
    }
    "restart-backend" {
        Write-Host "Restarting backend..." -ForegroundColor Magenta
        docker compose -f $ComposeFile restart backend
    }
    "restart-frontend" {
        Write-Host "Restarting frontend..." -ForegroundColor Magenta
        docker compose -f $ComposeFile restart frontend
    }
    "status" {
        Write-Host "Container status:" -ForegroundColor Green
        docker compose -f $ComposeFile ps
    }
    "fresh" {
        Write-Host "Fresh start: removing everything and rebuilding..." -ForegroundColor Red
        docker compose -f $ComposeFile down
        docker compose -f $ComposeFile up -d --build
    }
    default {
        Write-Host "Docker Development Helper" -ForegroundColor Cyan
        Write-Host "=========================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage: .\dev.ps1 [command]" -ForegroundColor White
        Write-Host ""
        Write-Host "Available Commands:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  start             " -NoNewline -ForegroundColor Green
        Write-Host "- Start all services in background"
        Write-Host "  stop              " -NoNewline -ForegroundColor Yellow
        Write-Host "- Stop all services"
        Write-Host "  down              " -NoNewline -ForegroundColor Yellow
        Write-Host "- Stop and remove containers"
        Write-Host "  fresh             " -NoNewline -ForegroundColor Red
        Write-Host "- Clean slate: down + rebuild all"
        Write-Host ""
        Write-Host "  rebuild-backend   " -NoNewline -ForegroundColor Cyan
        Write-Host "- Rebuild backend service"
        Write-Host "  rebuild-frontend  " -NoNewline -ForegroundColor Cyan
        Write-Host "- Rebuild frontend service"
        Write-Host "  rebuild-all       " -NoNewline -ForegroundColor Cyan
        Write-Host "- Rebuild all services"
        Write-Host ""
        Write-Host "  restart-backend   " -NoNewline -ForegroundColor Magenta
        Write-Host "- Restart backend service"
        Write-Host "  restart-frontend  " -NoNewline -ForegroundColor Magenta
        Write-Host "- Restart frontend service"
        Write-Host ""
        Write-Host "  logs              " -NoNewline -ForegroundColor Blue
        Write-Host "- View all logs (live)"
        Write-Host "  logs-backend      " -NoNewline -ForegroundColor Blue
        Write-Host "- View backend logs (live)"
        Write-Host "  logs-frontend     " -NoNewline -ForegroundColor Blue
        Write-Host "- View frontend logs (live)"
        Write-Host ""
        Write-Host "  status            " -NoNewline -ForegroundColor Green
        Write-Host "- Show container status"
        Write-Host ""
        Write-Host "Examples:" -ForegroundColor Yellow
        Write-Host "  .\dev.ps1 start"
        Write-Host "  .\dev.ps1 rebuild-backend"
        Write-Host "  .\dev.ps1 logs-backend"
    }
}
