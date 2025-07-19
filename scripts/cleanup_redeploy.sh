#!/bin/bash

# Cleanup and Redeploy Script for GeoGPT-RAG
# This script completely removes all traces of the previous deployment and redeploys from scratch

set -e

PROJECT_DIR="$HOME/geogpt-rag"
REPO_URL="https://github.com/Rekklessss/geogpt-rag.git"

# Configuration - Update this IP address when your EC2 instance restarts
# You can also set this via environment variable: export GEOGPT_PUBLIC_IP="your.new.ip"
GEOGPT_PUBLIC_IP="${GEOGPT_PUBLIC_IP:-3.236.251.69}"

# Production configuration
PRODUCTION_EC2_IP="3.236.251.69"
PRODUCTION_EC2_ID="i-0cf221c2fca3cb3cf"
OPENAI_API_KEY="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"
ZILLIZ_CLOUD_URI="https://in03-088dd53cf6b3582.serverless.gcp-us-west1.cloud.zilliz.com"
ZILLIZ_CLOUD_TOKEN="affa13223a768e6e16b4e2bebf1e3f95b7b9085814d1407470c10922c7469d459cf523c189e99e24a20a1146976edd1a808d34fc"

# API service ports (usually don't change)
EMBEDDING_PORT="8810"
RERANKING_PORT="8811" 
GEOGPT_PORT="8812"

# Function to get and validate IP address
get_ip_address() {
    if [[ "$1" == "--ip" ]] && [[ -n "$2" ]]; then
        # IP provided via command line argument
        GEOGPT_PUBLIC_IP="$2"
        echo "Using provided IP address: $GEOGPT_PUBLIC_IP"
    elif [[ -z "$GEOGPT_PUBLIC_IP" ]] || [[ "$GEOGPT_PUBLIC_IP" == "3.81.101.190" ]]; then
        # Use production IP as default
        GEOGPT_PUBLIC_IP="$PRODUCTION_EC2_IP"
        echo "🔧 Using production EC2 IP: $GEOGPT_PUBLIC_IP"
        echo "💡 If your EC2 instance has a different IP, you can:"
        echo "   1. Set environment variable: export GEOGPT_PUBLIC_IP='your.new.ip'"
        echo "   2. Pass as argument: ./cleanup_redeploy.sh --ip your.new.ip"
        echo ""
        read -p "Press Enter to continue with $GEOGPT_PUBLIC_IP, or type new IP: " NEW_IP
        if [[ -n "$NEW_IP" ]]; then
            GEOGPT_PUBLIC_IP="$NEW_IP"
            echo "Updated IP address to: $GEOGPT_PUBLIC_IP"
        fi
    fi
}

# Check for IP argument
if [[ "$1" == "--ip" ]]; then
    get_ip_address "$1" "$2"
else
    get_ip_address
fi

echo "🧹 GeoGPT-RAG Complete Cleanup & Redeploy"
echo "========================================"
echo "⚠️  This will completely remove:"
echo "   - All Docker containers and images"
echo "   - All downloaded models (~7GB)"
echo "   - All logs and data files"
echo "   - All Docker volumes and networks"
echo ""
echo "🔄 Then it will:"
echo "   - Pull latest code from GitHub"
echo "   - Rebuild everything from scratch"
echo "   - Redeploy all services"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 1
fi

echo ""
echo "🚀 Starting cleanup and redeploy process..."

# Change to project directory
cd "$PROJECT_DIR" || {
    echo "❌ Project directory not found: $PROJECT_DIR"
    echo "💡 Run setup_ec2.sh first to initialize the project"
    exit 1
}

# Set up environment variables
echo "🔧 Setting up production environment variables..."
export EC2_INSTANCE_IP="$GEOGPT_PUBLIC_IP"
export EC2_INSTANCE_ID="$PRODUCTION_EC2_ID"
export LLM_PROVIDER="auto"
export OPENAI_API_KEY="$OPENAI_API_KEY"
export ZILLIZ_CLOUD_URI="$ZILLIZ_CLOUD_URI"
export ZILLIZ_CLOUD_TOKEN="$ZILLIZ_CLOUD_TOKEN"

# Create/update environment file with cost optimization
echo "📋 Creating/updating environment file (cost-optimized)..."
cat > .env << EOF
# GeoGPT-RAG Production Environment Configuration (COST OPTIMIZED) - Updated $(date)
EC2_INSTANCE_IP=$GEOGPT_PUBLIC_IP
EC2_INSTANCE_ID=$PRODUCTION_EC2_ID
EC2_REGION=us-east-1
LLM_PROVIDER=auto
LLM_MODEL=gpt-4.1-nano
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MAX_TOKENS=2048
ZILLIZ_CLOUD_URI=$ZILLIZ_CLOUD_URI
ZILLIZ_CLOUD_TOKEN=$ZILLIZ_CLOUD_TOKEN
CONTEXT_WINDOW_SIZE=8192
MAX_CONVERSATION_HISTORY=50
DATABASE_URL=postgresql://geogpt:geogpt_password@postgres:5432/geogpt_spatial
REDIS_URL=redis://redis:6379
EOF

# Stop all services
echo "⏹️  Stopping all services..."
sudo docker-compose down --remove-orphans 2>/dev/null || echo "No services to stop"

# Stop systemd service
echo "⏹️  Stopping systemd service..."
sudo systemctl stop geogpt-rag.service 2>/dev/null || echo "Systemd service not running"

# Remove all Docker containers (including stopped ones)
echo "🗑️  Removing all Docker containers..."
sudo docker ps -aq | xargs -r sudo docker rm -f 2>/dev/null || echo "No containers to remove"

# Remove all Docker images related to the project
echo "🗑️  Removing Docker images..."
sudo docker images | grep -E "(geogpt|rag|postgres|redis)" | awk '{print $3}' | xargs -r sudo docker rmi -f 2>/dev/null || echo "No project images to remove"

# Remove all unused Docker images, containers, networks, and volumes
echo "🗑️  Cleaning up Docker system..."
sudo docker system prune -af --volumes 2>/dev/null || echo "Docker system cleanup completed"

# Remove downloaded models
echo "🗑️  Removing downloaded models..."
sudo rm -rf models/
sudo rm -rf /app/models/ 2>/dev/null || echo "No app models to remove"

# Remove logs
echo "🗑️  Removing logs..."
sudo rm -rf logs/
sudo rm -rf /app/logs/ 2>/dev/null || echo "No app logs to remove"

# Remove data files
echo "🗑️  Removing data files..."
sudo rm -rf data/
sudo rm -rf split_chunks/
sudo rm -rf /app/data/ 2>/dev/null || echo "No app data to remove"
sudo rm -rf /app/split_chunks/ 2>/dev/null || echo "No app split_chunks to remove"

# Remove any leftover Docker volumes
echo "🗑️  Removing Docker volumes..."
sudo docker volume ls -q | xargs -r sudo docker volume rm 2>/dev/null || echo "No volumes to remove"

# Clean up any leftover files
echo "🗑️  Cleaning up temporary files..."
sudo rm -rf ssl/
sudo rm -rf __pycache__/ 2>/dev/null || echo "No pycache to remove"
sudo rm -rf *.pyc 2>/dev/null || echo "No pyc files to remove"
sudo rm -rf .pytest_cache/ 2>/dev/null || echo "No pytest cache to remove"

# Pull latest code from GitHub
echo "📥 Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main
git clean -fd

# Verify we have the latest code
echo "✅ Current commit:"
git log --oneline -1

# Recreate necessary directories
echo "📁 Recreating necessary directories..."
mkdir -p models logs data split_chunks ssl

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh

# Rebuild Docker images (no cache)
echo "🔨 Rebuilding Docker images from scratch..."
sudo docker-compose build --no-cache --pull

# Start services
echo "🚀 Starting services..."
sudo docker-compose up -d

# Wait for services to initialize (services need time to download models and start)
echo "⏳ Waiting for container to start and models to download..."
echo "   This may take 5-10 minutes for first-time model downloads (~6GB total)"
sleep 30

# Check if models are being downloaded
echo "📥 Checking model download progress..."
for i in {1..20}; do
    if sudo docker exec geogpt-rag-system ls /app/models/geo-embedding/config.json >/dev/null 2>&1 && \
       sudo docker exec geogpt-rag-system ls /app/models/geo-reranker/config.json >/dev/null 2>&1; then
        echo "✅ Models downloaded successfully"
        break
    fi
    echo "⏳ Models still downloading... (check $i/20)"
    sleep 30
done

# Additional wait for services to start after models are downloaded
echo "⏳ Waiting for services to initialize with downloaded models..."
sleep 60

# Check service health
echo "🏥 Checking service health..."
check_service() {
    local port=$1
    local service_name=$2
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port/health" >/dev/null 2>&1; then
            echo "✅ $service_name is ready"
            return 0
        fi
        echo "⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 15
        ((attempt++))
    done
    
    echo "❌ $service_name failed to start after $((max_attempts * 15)) seconds"
    echo "🔍 Checking $service_name logs:"
    case $port in
        8810) sudo docker exec geogpt-rag-system tail -n 5 /app/logs/embedding.log 2>/dev/null || echo "No embedding logs found" ;;
        8811) sudo docker exec geogpt-rag-system tail -n 5 /app/logs/reranking.log 2>/dev/null || echo "No reranking logs found" ;;
        8812) sudo docker exec geogpt-rag-system tail -n 5 /app/logs/geogpt_api.log 2>/dev/null || echo "No API logs found" ;;
    esac
    return 1
}

# Check database services first
echo "🗃️ Checking database services..."
if sudo docker exec geogpt-postgres pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    POSTGRES_STATUS=0
else
    echo "❌ PostgreSQL is not ready"
    POSTGRES_STATUS=1
fi

if sudo docker exec geogpt-redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is ready"
    REDIS_STATUS=0
else
    echo "❌ Redis is not ready"
    REDIS_STATUS=1
fi

# Check embedding service
check_service 8810 "Embedding Service"
EMBEDDING_STATUS=$?

# Check reranking service
check_service 8811 "Reranking Service"
RERANKING_STATUS=$?

# Check GeoGPT API service
check_service 8812 "GeoGPT API Service"
GEOGPT_STATUS=$?

# Test LLM provider functionality
echo "🧠 Testing LLM provider functionality..."
if curl -s -X POST \
   -H "Content-Type: application/json" \
   -d '{"message":"Test connection","use_rag":false}' \
   http://localhost:8812/chat >/dev/null 2>&1; then
    echo "✅ LLM provider is working"
    LLM_STATUS=0
else
    echo "⚠️ LLM provider test failed - check logs"
    LLM_STATUS=1
fi

# Run system tests
echo "🧪 Running system tests..."
if sudo docker exec geogpt-rag-system python /app/scripts/test_system.py; then
    echo "✅ System tests passed!"
    TEST_STATUS=0
else
    echo "❌ System tests failed!"
    TEST_STATUS=1
fi

# Run comprehensive GeoGPT API tests (includes implementation verification)
echo "🚀 Running comprehensive GeoGPT API tests..."
if sudo docker exec geogpt-rag-system python /app/scripts/test_geogpt_api.py; then
    echo "✅ GeoGPT API tests passed!"
    GEOGPT_TEST_STATUS=0
else
    echo "❌ GeoGPT API tests failed!"
    GEOGPT_TEST_STATUS=1
fi

# Restart systemd service
echo "🚀 Restarting systemd service..."
sudo systemctl restart geogpt-rag.service

# Display final status
echo ""
echo "=== Redeploy Summary ==="
echo "🏠 Project Directory: $PROJECT_DIR"
echo "🔄 Redeploy Again: cd $PROJECT_DIR && ./scripts/cleanup_redeploy.sh"
echo ""
echo "🌐 Service URLs:"
echo "  - Embedding Service: http://${GEOGPT_PUBLIC_IP}:${EMBEDDING_PORT}"
echo "  - Reranking Service: http://${GEOGPT_PUBLIC_IP}:${RERANKING_PORT}"
echo "  - GeoGPT API Service: http://${GEOGPT_PUBLIC_IP}:${GEOGPT_PORT}"
echo ""
echo "📋 Service Status:"
if [ $POSTGRES_STATUS -eq 0 ]; then
    echo "  ✅ PostgreSQL Database: Running"
else
    echo "  ❌ PostgreSQL Database: Failed"
fi

if [ $REDIS_STATUS -eq 0 ]; then
    echo "  ✅ Redis Cache: Running"
else
    echo "  ❌ Redis Cache: Failed"
fi

if [ $EMBEDDING_STATUS -eq 0 ]; then
    echo "  ✅ Embedding Service: Running"
else
    echo "  ❌ Embedding Service: Failed"
fi

if [ $RERANKING_STATUS -eq 0 ]; then
    echo "  ✅ Reranking Service: Running"
else
    echo "  ❌ Reranking Service: Failed"
fi

if [ $GEOGPT_STATUS -eq 0 ]; then
    echo "  ✅ GeoGPT API Service: Running"
else
    echo "  ❌ GeoGPT API Service: Failed"
fi

if [ $LLM_STATUS -eq 0 ]; then
    echo "  ✅ LLM Provider (OpenAI/Sagemaker): Working"
else
    echo "  ❌ LLM Provider: Failed"
fi

if [ $TEST_STATUS -eq 0 ]; then
    echo "  ✅ System Tests: Passed"
else
    echo "  ❌ System Tests: Failed"
fi

if [ $GEOGPT_TEST_STATUS -eq 0 ]; then
    echo "  ✅ GeoGPT API Tests (with verification): Passed"
else
    echo "  ❌ GeoGPT API Tests (with verification): Failed"
fi

echo ""
if [ $POSTGRES_STATUS -eq 0 ] && [ $REDIS_STATUS -eq 0 ] && [ $EMBEDDING_STATUS -eq 0 ] && [ $RERANKING_STATUS -eq 0 ] && [ $GEOGPT_STATUS -eq 0 ] && [ $LLM_STATUS -eq 0 ] && [ $TEST_STATUS -eq 0 ] && [ $GEOGPT_TEST_STATUS -eq 0 ]; then
    echo "🎉 GeoGPT-RAG redeploy completed successfully!"
    echo "💡 The system is ready to use with the latest code changes."
    echo "🔗 All services are online and integrated - NO MOCK DATA!"
    echo "🚀 Production features active:"
    echo "   - OpenAI + Sagemaker LLM providers (auto-switching)"
    echo "   - PostgreSQL + Redis database services"
    echo "   - Advanced memory and conversation persistence"
    echo "   - Interactive map visualization and GIS operations"
    echo "   - Real-time vector database (Zilliz Cloud)"
else
    echo "⚠️ Redeploy completed with some issues. Check logs for details:"
    echo "   docker-compose logs -f"
fi

echo ""
echo "🔍 To view real-time logs:"
echo "   sudo docker-compose logs -f"
echo ""
echo "📊 To monitor system status:"
echo "   sudo docker ps && curl -s http://localhost:8812/health"
echo ""
echo "🔄 To redeploy with a different IP address:"
echo "   ./scripts/cleanup_redeploy.sh --ip YOUR_NEW_IP"
echo "   OR: export GEOGPT_PUBLIC_IP='YOUR_NEW_IP' && ./scripts/cleanup_redeploy.sh"
echo ""
echo "🐳 Docker containers:"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 