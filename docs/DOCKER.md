# Docker Guide

## Overview

This document describes how to run the KYC Service using Docker and Docker Compose for both local development and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Configuration](#configuration)
- [Available Commands](#available-commands)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher

### Verify Installation

```bash
docker --version
# Docker version 20.10.0 or higher

docker-compose --version
# Docker Compose version 2.0.0 or higher
```

### Install Docker

- **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

---

## Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd kyc-service
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file (optional - works without Sumsub keys)
nano .env
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### 4. Verify Running

```bash
# Check health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-10-19T...","service":"kyc-service"}
```

### 5. Stop Services

```bash
docker-compose down
```

---

## Development Setup

### Option 1: Run Only MongoDB in Docker

**Best for active development** - Run MongoDB in Docker, run app locally.

#### Step 1: Start MongoDB Only

```bash
docker-compose -f docker-compose.dev.yml up -d
```

This starts:
- MongoDB on `localhost:27017`
- Mongo Express UI on `localhost:8081`

#### Step 2: Configure Local App

```bash
# .env file
MONGODB_URI=mongodb://localhost:27017/kyc_db
```

#### Step 3: Run App Locally

```bash
npm install
npm run start:dev
```

**Benefits:**
- ✅ Fast hot-reload
- ✅ Easy debugging
- ✅ Direct access to code
- ✅ MongoDB managed by Docker

#### Step 4: Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| KYC Service | http://localhost:3000 | - |
| Health Check | http://localhost:3000/health | - |
| Mongo Express | http://localhost:8081 | admin / admin123 |

#### Step 5: Stop MongoDB

```bash
docker-compose -f docker-compose.dev.yml down
```

---

### Option 2: Full Docker Development

**Best for environment consistency** - Everything runs in Docker.

#### Step 1: Start All Services with Dev Profile

```bash
docker-compose --profile dev up -d
```

This starts:
- KYC Service on `localhost:3000`
- MongoDB on `localhost:27017`
- Mongo Express on `localhost:8081`

#### Step 2: View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f kyc-service
```

#### Step 3: Rebuild After Code Changes

```bash
# Rebuild and restart
docker-compose up -d --build kyc-service
```

---

## Production Setup

### Build Production Image

```bash
# Build image
docker build -t kyc-service:latest .

# Verify image
docker images | grep kyc-service
```

### Run Production Stack

```bash
# Start production services
docker-compose up -d

# Verify health
docker-compose ps
curl http://localhost:3000/health
```

### Production Environment Variables

Create `.env` file:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/kyc_db
LOG_LEVEL=info

# Sumsub Production Credentials
SUMSUB_APP_TOKEN=your_production_token
SUMSUB_SECRET_KEY=your_production_secret
SUMSUB_BASE_URL=https://api.sumsub.com
SUMSUB_WEBHOOK_SECRET=your_webhook_secret
```

### Production Best Practices

1. **Use Secrets Management**
   ```bash
   # Use Docker secrets instead of .env
   docker secret create sumsub_token /path/to/token.txt
   ```

2. **Resource Limits**
   ```yaml
   # In docker-compose.yml
   services:
     kyc-service:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 1G
           reservations:
             cpus: '0.5'
             memory: 512M
   ```

3. **Logging**
   ```yaml
   services:
     kyc-service:
       logging:
         driver: "json-file"
         options:
           max-size: "10m"
           max-file: "3"
   ```

---

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Application port | `3000` | No |
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongodb:27017/kyc_db` | Yes |
| `LOG_LEVEL` | Logging level | `debug` | No |
| `SUMSUB_APP_TOKEN` | Sumsub API token | - | Yes* |
| `SUMSUB_SECRET_KEY` | Sumsub secret key | - | Yes* |
| `SUMSUB_BASE_URL` | Sumsub API URL | `https://api.sumsub.com` | No |
| `SUMSUB_WEBHOOK_SECRET` | Webhook signature secret | - | Yes* |

\* Required for production, optional for development (can use mocks)

### Docker Compose Files

| File | Purpose | Usage |
|------|---------|-------|
| `docker-compose.yml` | Production setup | `docker-compose up` |
| `docker-compose.dev.yml` | Development (DB only) | `docker-compose -f docker-compose.dev.yml up` |

### Volumes

| Volume | Purpose | Persistence |
|--------|---------|-------------|
| `mongodb_data` | MongoDB data storage | Persisted |
| `mongodb_config` | MongoDB configuration | Persisted |

---

## Available Commands

### Docker Compose Commands

```bash
# Start services (detached)
docker-compose up -d

# Start services (foreground with logs)
docker-compose up

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f kyc-service

# Restart service
docker-compose restart kyc-service

# Rebuild service
docker-compose up -d --build kyc-service

# Check service status
docker-compose ps

# Execute command in container
docker-compose exec kyc-service sh

# View resource usage
docker-compose stats
```

### Docker Commands

```bash
# Build image
docker build -t kyc-service:latest .

# Build with custom tag
docker build -t kyc-service:v1.0.0 .

# Run container manually
docker run -d \
  --name kyc-service \
  -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/kyc_db \
  kyc-service:latest

# Stop container
docker stop kyc-service

# Remove container
docker rm kyc-service

# View logs
docker logs -f kyc-service

# Execute command in container
docker exec -it kyc-service sh

# Inspect container
docker inspect kyc-service
```

### Database Commands

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh kyc_db

# Backup database
docker-compose exec mongodb mongodump --db kyc_db --out /backup

# Restore database
docker-compose exec mongodb mongorestore --db kyc_db /backup/kyc_db

# Export data to JSON
docker-compose exec mongodb mongoexport \
  --db kyc_db \
  --collection verifications \
  --out /data/verifications.json

# Import data from JSON
docker-compose exec mongodb mongoimport \
  --db kyc_db \
  --collection verifications \
  --file /data/verifications.json
```

---

## Monitoring

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Expected output:
# NAME           STATUS                    PORTS
# kyc-service    Up (healthy)              0.0.0.0:3000->3000/tcp
# kyc-mongodb    Up (healthy)              0.0.0.0:27017->27017/tcp
```

### Application Health Endpoint

```bash
curl http://localhost:3000/health

# Response:
{
  "status": "ok",
  "timestamp": "2025-10-19T12:00:00.000Z",
  "service": "kyc-service"
}
```

### View Logs

```bash
# Real-time logs (all services)
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Logs since 10 minutes ago
docker-compose logs --since 10m

# Service-specific logs
docker-compose logs -f kyc-service
docker-compose logs -f mongodb
```

### Resource Monitoring

```bash
# View resource usage
docker stats

# View specific container
docker stats kyc-service
```

### Mongo Express Dashboard

Access MongoDB admin UI at: **http://localhost:8081**

**Credentials:**
- Username: `admin`
- Password: `admin123`

**Features:**
- View collections
- Run queries
- Inspect documents
- Database statistics

---

## Troubleshooting

### Service Won't Start

**Problem:** `docker-compose up` fails

**Solutions:**

```bash
# Check logs
docker-compose logs

# Verify port availability
lsof -i :3000  # KYC Service
lsof -i :27017 # MongoDB

# Remove existing containers
docker-compose down
docker-compose up -d

# Force rebuild
docker-compose up -d --build --force-recreate
```

### MongoDB Connection Issues

**Problem:** Service can't connect to MongoDB

**Solutions:**

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Verify MongoDB health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check network
docker network ls
docker network inspect kyc-service_kyc-network

# Restart MongoDB
docker-compose restart mongodb
```

### Application Crashes

**Problem:** KYC service container exits

**Solutions:**

```bash
# View container logs
docker-compose logs kyc-service

# Check for missing environment variables
docker-compose config

# Verify .env file
cat .env

# Run in foreground to see errors
docker-compose up kyc-service
```

### Permission Issues

**Problem:** Permission denied errors

**Solutions:**

```bash
# Fix file permissions
chmod -R 755 .

# Rebuild image
docker-compose build --no-cache kyc-service
```

### Out of Disk Space

**Problem:** No space left on device

**Solutions:**

```bash
# Remove unused containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Clean everything
docker system prune -a --volumes -f
```

### Health Check Failing

**Problem:** Container shows as "unhealthy"

**Solutions:**

```bash
# Check health check logs
docker inspect kyc-service --format='{{json .State.Health}}' | jq

# Manually test health endpoint
docker-compose exec kyc-service wget -q -O- http://localhost:3000/health

# Increase health check timeout in docker-compose.yml
```

### Slow Build Times

**Problem:** Docker build takes too long

**Solutions:**

```bash
# Use BuildKit
DOCKER_BUILDKIT=1 docker build -t kyc-service:latest .

# Use cache from previous build
docker build --cache-from kyc-service:latest -t kyc-service:latest .

# Multi-stage builds are already optimized in Dockerfile
```

---

## Advanced Usage

### Custom Network

```bash
# Create custom network
docker network create kyc-custom-network

# Update docker-compose.yml to use it
networks:
  kyc-network:
    external: true
    name: kyc-custom-network
```

### Volume Backup

```bash
# Backup MongoDB volume
docker run --rm \
  -v kyc-service_mongodb_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mongodb-backup.tar.gz /data

# Restore MongoDB volume
docker run --rm \
  -v kyc-service_mongodb_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/mongodb-backup.tar.gz -C /
```

### Multi-Container Scaling

```bash
# Scale KYC service (requires load balancer)
docker-compose up -d --scale kyc-service=3
```

### Development with Hot Reload

```yaml
# docker-compose.override.yml
services:
  kyc-service:
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
    command: npm run start:dev
```

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Docker Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t kyc-service:${{ github.sha }} .
      - name: Run tests in Docker
        run: |
          docker-compose up -d mongodb
          docker run --network kyc-service_kyc-network \
            -e MONGODB_URI=mongodb://mongodb:27017/kyc_test \
            kyc-service:${{ github.sha }} npm test
```

### GitLab CI

```yaml
build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t kyc-service:$CI_COMMIT_SHA .
    - docker-compose up -d
    - docker-compose exec -T kyc-service npm test
```

---

## Production Deployment

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml kyc-stack

# Check services
docker service ls

# Scale service
docker service scale kyc-stack_kyc-service=3

# Update service
docker service update --image kyc-service:v2 kyc-stack_kyc-service
```

### Kubernetes

Generate Kubernetes manifests:

```bash
# Install kompose
curl -L https://github.com/kubernetes/kompose/releases/download/v1.28.0/kompose-linux-amd64 -o kompose

# Convert docker-compose to k8s
kompose convert -f docker-compose.yml
```

---

## Summary

### Quick Reference

| Task | Command |
|------|---------|
| Start all services | `docker-compose up -d` |
| Start DB only | `docker-compose -f docker-compose.dev.yml up -d` |
| Stop all services | `docker-compose down` |
| View logs | `docker-compose logs -f` |
| Rebuild service | `docker-compose up -d --build` |
| Check health | `curl http://localhost:3000/health` |
| Access MongoDB UI | http://localhost:8081 |
| Backup database | `docker-compose exec mongodb mongodump` |

### Recommended Workflow

**For Local Development:**
1. Start MongoDB: `docker-compose -f docker-compose.dev.yml up -d`
2. Run app locally: `npm run start:dev`
3. Access Mongo Express: http://localhost:8081

**For Testing:**
1. Start all services: `docker-compose up -d`
2. Run tests: `npm run test:e2e`
3. View logs: `docker-compose logs -f`

**For Production:**
1. Build image: `docker build -t kyc-service:latest .`
2. Configure `.env` with production credentials
3. Deploy: `docker-compose up -d`
4. Monitor: `docker-compose ps` and `docker-compose logs -f`

---

The Docker setup is production-ready and optimized for both development and deployment! 🐳
