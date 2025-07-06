FROM nvidia/cuda:12.8.0-cudnn-devel-ubuntu24.04

# Set environment variables
ENV PYTHONPATH=/app
ENV DEBIAN_FRONTEND=noninteractive
ENV CUDA_VISIBLE_DEVICES=0
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies in proper order
RUN apt-get update && apt-get install -y \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python and development tools
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    python3-setuptools \
    python3-wheel \
    git \
    build-essential \
    cmake \
    pkg-config \
    libssl-dev \
    libffi-dev \
    libxml2-dev \
    libxslt1-dev \
    libblas-dev \
    liblapack-dev \
    libatlas-base-dev \
    gfortran \
    && rm -rf /var/lib/apt/lists/*

# Set up Python
RUN ln -sf /usr/bin/python3 /usr/bin/python
# Skip pip upgrade - Ubuntu 24.04 pip 24.0 is sufficient and avoids debian package conflicts

# Set working directory
WORKDIR /app

# Copy requirements files
COPY embedding/requirements.txt /app/embedding/requirements.txt
COPY reranking/requirements.txt /app/reranking/requirements.txt
COPY rag_server/requirements.txt /app/rag_server/requirements.txt

# Install core packages first
RUN python3 -m pip install --break-system-packages --no-cache-dir \
    numpy==1.24.3 \
    scipy==1.11.4 \
    setuptools-scm \
    wheel \
    cython

# Install PyTorch with CUDA support (compatible versions)
RUN python3 -m pip install --break-system-packages --no-cache-dir \
    torch==2.1.1 \
    torchvision==0.16.1 \
    torchaudio==2.1.1 \
    --index-url https://download.pytorch.org/whl/cu118

# Install grpcio with specific version that works
RUN python3 -m pip install --break-system-packages --no-cache-dir grpcio==1.60.1

# Install transformers and other ML packages
RUN python3 -m pip install --break-system-packages --no-cache-dir \
    transformers==4.37.2 \
    tokenizers==0.15.0 \
    sentence-transformers==2.2.2 \
    huggingface-hub==0.20.3

# Install FlagEmbedding with compatible version
RUN python3 -m pip install --break-system-packages --no-cache-dir FlagEmbedding==1.2.11

# Install embedding requirements (excluding conflicting packages)
RUN python3 -m pip install --break-system-packages --no-cache-dir \
    uvicorn==0.24.0 \
    fastapi==0.104.1 \
    pydantic==2.5.2

# Install reranking requirements (excluding FlagEmbedding since it's already installed)
RUN python3 -m pip install --break-system-packages --no-cache-dir \
    sentencepiece==0.1.99

# Install rag_server requirements
RUN python3 -m pip install --break-system-packages --no-cache-dir \
    langchain==0.1.0 \
    langchain-community==0.0.10 \
    requests==2.31.0 \
    pymilvus==2.3.4 \
    nltk==3.8.1 \
    boto3==1.34.34

# Copy source code
COPY . /app/

# Create directories for models and data
RUN mkdir -p /app/models/geo-embedding
RUN mkdir -p /app/models/geo-reranker
RUN mkdir -p /app/data/split_chunks
RUN mkdir -p /app/logs

# Set permissions (scripts are made executable during runtime)
RUN chmod -R 755 /app

# Download NLTK data
RUN python3 -c "import nltk; nltk.download('punkt', quiet=True)" || true

# Expose ports
EXPOSE 8810 8811 8812

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8810/health || exit 1

# Default command - models and services are started by docker-compose
CMD ["tail", "-f", "/dev/null"] 