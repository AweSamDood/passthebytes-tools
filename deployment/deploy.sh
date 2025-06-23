#!/bin/bash

# Deployment script for PassTheBytes Tools
# Usage: ./deploy.sh [-f] [-r] [production|development]
# -f: Force overwrite of NGINX config
# -r: Re-run NGINX site deployment and certificate setup

set -e

# Default values
FORCE_FLAG=""
RECONFIGURE_NGINX=false

# Parse command line options
while getopts "fr" opt; do
  case $opt in
    f) FORCE_FLAG="-f" ;;
    r) RECONFIGURE_NGINX=true ;;
    \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
  esac
done
shift $((OPTIND-1))

# Load environment variables from .env file if it exists at the project root
if [ -f "$(dirname "$0")/../.env" ]; then
  echo "Loading environment variables from .env file..."
  set -o allexport
  source "$(dirname "$0")/../.env"
  set +o allexport
fi

ENVIRONMENT=${1:-development}
PROJECT_NAME="passthebytes-tools"

echo "Deploying PassTheBytes Tools in $ENVIRONMENT mode..."

# Check if running as root for production deployment
if [ "$ENVIRONMENT" = "production" ] && [ "$EUID" -ne 0 ]; then
  echo "Please run as root for production deployment"
  exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from template..."
  cp .env.example .env

  if [ "$ENVIRONMENT" = "production" ]; then
    echo "Please edit .env file with production values before proceeding."
    echo "Press Enter when ready..."
    read
  fi
fi

# Build and deploy based on environment
if [ "$ENVIRONMENT" = "production" ]; then
  echo "Deploying production environment..."

  # Stop existing containers
  docker-compose -f docker-compose.prod.yml -p $PROJECT_NAME down || true

  # Build and start containers
  docker-compose -f docker-compose.prod.yml -p $PROJECT_NAME up --build -d

  # Setup NGINX configuration using existing script, if requested
  if [ "$RECONFIGURE_NGINX" = true ] ; then
    if [ -n "$NGINX_DEPLOY_SCRIPT_PATH" ] && [ -f "$NGINX_DEPLOY_SCRIPT_PATH" ]; then
      echo "Setting up NGINX configuration using script from NGINX_DEPLOY_SCRIPT_PATH..."
      bash "$NGINX_DEPLOY_SCRIPT_PATH" $FORCE_FLAG tools 3031
    else
      echo "NGINX_DEPLOY_SCRIPT_PATH is not set or the script was not found."
      echo "Please set NGINX_DEPLOY_SCRIPT_PATH in your .env file."
      echo "Skipping automatic NGINX configuration."
    fi
  else
    echo "Skipping NGINX site deployment. Use the -r flag to re-run it."
  fi

else
  echo "Starting development environment..."

  # Stop existing containers
  docker-compose -p $PROJECT_NAME down || true

  # Build and start containers
  docker-compose -p $PROJECT_NAME up --build -d

  echo "Development environment started:"
  echo "Frontend: http://localhost:3030"
  echo "Backend API: http://localhost:8008"
  echo "API Documentation: http://localhost:8008/docs"
fi

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Health check
echo "Performing health check..."

if [ "$ENVIRONMENT" = "production" ]; then
  # In production, we check the services via the exposed frontend port
  # Backend check goes through the frontend's NGINX proxy to http://backend:8000/health
  if curl -fsS http://localhost:3031/api/health > /dev/null; then
    echo "✅ Backend is healthy"
  else
    echo "❌ Backend health check failed. This is likely the cause of 502 errors."
    echo "Dumping latest backend logs for inspection:"
    docker-compose -f docker-compose.prod.yml -p $PROJECT_NAME logs --tail=100 backend
  fi

  if curl -fsS http://localhost:3031 > /dev/null; then
    echo "✅ Frontend is accessible"
  else
    echo "❌ Frontend health check failed"
    echo "Dumping latest frontend logs for inspection:"
    docker-compose -f docker-compose.prod.yml -p $PROJECT_NAME logs --tail=100 frontend
  fi
else
  # In development, we check the mapped localhost ports
  if curl -fsS http://localhost:8008/health > /dev/null; then
    echo "✅ Backend is healthy"
  else
    echo "❌ Backend health check failed"
  fi

  if curl -fsS http://localhost:3030 > /dev/null; then
    echo "✅ Frontend is accessible"
  else
    echo "❌ Frontend health check failed"
  fi
fi

echo "Deployment completed!"

if [ "$ENVIRONMENT" = "production" ]; then
  echo "Tools are now available at: https://tools.passthebytes.com"
else
  echo "Development server running at: http://localhost:3030"
fi