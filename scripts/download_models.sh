#!/bin/bash

# Download GeoGPT-RAG models from HuggingFace
# This script downloads the GeoEmbedding and GeoReranker models

set -e

echo "Starting model download process..."

# Create model directories
mkdir -p /app/models/geo-embedding
mkdir -p /app/models/geo-reranker

# Check if models already exist
if [ -f "/app/models/geo-embedding/config.json" ] && [ -f "/app/models/geo-reranker/config.json" ]; then
    echo "Models already exist, skipping download..."
    exit 0
fi

# Install git-lfs if not already installed
if ! command -v git-lfs &> /dev/null; then
    echo "Installing git-lfs..."
    curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | bash
    apt-get update && apt-get install -y git-lfs
fi

# Initialize git-lfs
git lfs install

echo "Downloading GeoEmbedding model (7B parameters)..."
cd /app/models/geo-embedding
git clone https://huggingface.co/GeoGPT-Research-Project/GeoEmbedding .
echo "GeoEmbedding model downloaded successfully"

echo "Downloading GeoReranker model (568M parameters)..."
cd /app/models/geo-reranker
git clone https://huggingface.co/GeoGPT-Research-Project/GeoReranker .
echo "GeoReranker model downloaded successfully"

# Alternative: Use huggingface-hub if git-lfs fails
# echo "Downloading models using huggingface-hub..."
# pip install huggingface-hub
# python -c "
# from huggingface_hub import snapshot_download
# snapshot_download('GeoGPT-Research-Project/GeoEmbedding', local_dir='/app/models/geo-embedding')
# snapshot_download('GeoGPT-Research-Project/GeoReranker', local_dir='/app/models/geo-reranker')
# "

echo "All models downloaded successfully!"
echo "GeoEmbedding location: /app/models/geo-embedding"
echo "GeoReranker location: /app/models/geo-reranker" 