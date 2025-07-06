#!/bin/bash

# Start GeoGPT-RAG services
# This script starts the embedding service, reranking service, and RAG server

set -e

echo "Starting GeoGPT-RAG services..."

# Change to app directory
cd /app

# Check if models exist, if not download them
if [ ! -f "/app/models/geo-embedding/config.json" ] || [ ! -f "/app/models/geo-reranker/config.json" ]; then
    echo "Models not found, downloading..."
    /app/scripts/download_models.sh
fi

# Function to check if service is running
check_service() {
    local port=$1
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:$port/health" 2>/dev/null; then
            echo "Service on port $port is ready"
            return 0
        fi
        echo "Waiting for service on port $port... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    echo "Service on port $port failed to start"
    return 1
}

# Start embedding service
echo "Starting GeoEmbedding service on port 8810..."
cd /app/embedding
python embedding_api.py \
    --model_path /app/models/geo-embedding \
    --port 8810 \
    --fp16 > /app/logs/embedding.log 2>&1 &
EMBEDDING_PID=$!
echo "Embedding service started with PID $EMBEDDING_PID"

# Start reranking service
echo "Starting GeoReranker service on port 8811..."
cd /app/reranking
python reranker_fast_api.py \
    --model_path /app/models/geo-reranker \
    --port 8811 > /app/logs/reranking.log 2>&1 &
RERANKING_PID=$!
echo "Reranking service started with PID $RERANKING_PID"

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
if ! kill -0 $EMBEDDING_PID 2>/dev/null; then
    echo "Error: Embedding service failed to start"
    exit 1
fi

if ! kill -0 $RERANKING_PID 2>/dev/null; then
    echo "Error: Reranking service failed to start"
    exit 1
fi

echo "All services started successfully!"
echo "Embedding service: http://localhost:8810"
echo "Reranking service: http://localhost:8811"
echo "Logs available in /app/logs/"

# Keep the container running
wait 