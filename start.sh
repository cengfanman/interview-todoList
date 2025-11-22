#!/bin/bash

echo "================================================"
echo "  TodoList Application - Quick Start Script    "
echo "================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker and Docker Compose are installed"
echo ""

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Build and start containers
echo ""
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for services to be ready
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
echo ""
echo "Checking service status..."
docker-compose ps

echo ""
echo "================================================"
echo "  TodoList Application Started Successfully!   "
echo "================================================"
echo ""
echo "Services:"
echo "  - Frontend:  http://localhost"
echo "  - Backend:   http://localhost:3000"
echo "  - API Docs:  http://localhost:3000/api/docs"
echo ""
echo "Database:"
echo "  - Host:      localhost"
echo "  - Port:      3306"
echo "  - Database:  todolist_db"
echo "  - Username:  todolist_user"
echo "  - Password:  todolist_password"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo "================================================"
