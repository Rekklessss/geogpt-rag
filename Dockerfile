FROM nvidia/cuda:12.8.0-cudnn-devel-ubuntu24.04

# Set environment variables
ENV PYTHONPATH=/app
ENV DEBIAN_FRONTEND=noninteractive
ENV CUDA_VISIBLE_DEVICES=0
# Force pip to use binary wheels and not compile from source
ENV PIP_ONLY_BINARY=:all:
ENV PIP_PREFER_BINARY=1
ENV GRPC_PYTHON_BUILD_SYSTEM_OPENSSL=1
ENV GRPC_PYTHON_BUILD_SYSTEM_ZLIB=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    git \
    wget \
    curl \
    build-essential \
    cmake \
    pkg-config \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Set up Python
RUN ln -s /usr/bin/python3 /usr/bin/python
# Skip pip upgrade - Ubuntu 24.04 pip 24.0 is sufficient

# Set working directory
WORKDIR /app

# Copy requirements files
COPY embedding/requirements.txt /app/embedding/requirements.txt
COPY reranking/requirements.txt /app/reranking/requirements.txt
COPY rag_server/requirements.txt /app/rag_server/requirements.txt

# Install grpcio first with multiple fallback strategies
RUN echo "Installing grpcio with aggressive binary-only approach..." && \
    (pip install --break-system-packages --only-binary=:all: --no-cache-dir grpcio==1.60.1 || \
     pip install --break-system-packages --only-binary=grpcio --no-cache-dir grpcio==1.60.1 || \
     pip install --break-system-packages --prefer-binary --no-cache-dir grpcio==1.60.1 || \
     pip install --break-system-packages --no-cache-dir --force-reinstall --no-deps grpcio==1.60.1) && \
    echo "grpcio installation completed"

# Install PyTorch with CUDA support
RUN echo "Installing PyTorch..." && \
    pip install --break-system-packages --only-binary=:all: --no-cache-dir \
    torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Install other common problematic packages with binary-only approach
RUN echo "Installing other binary packages..." && \
    pip install --break-system-packages --only-binary=:all: --no-cache-dir \
    numpy scipy pandas scikit-learn

# Install remaining dependencies with binary preference
RUN echo "Installing embedding requirements..." && \
    pip install -r embedding/requirements.txt --break-system-packages --prefer-binary --no-cache-dir

RUN echo "Installing reranking requirements..." && \
    pip install -r reranking/requirements.txt --break-system-packages --prefer-binary --no-cache-dir

RUN echo "Installing rag_server requirements..." && \
    pip install -r rag_server/requirements.txt --break-system-packages --prefer-binary --no-cache-dir

# Copy source code
COPY . /app/

# Create directories for models and data
RUN mkdir -p /app/models/geo-embedding
RUN mkdir -p /app/models/geo-reranker
RUN mkdir -p /app/data/split_chunks
RUN mkdir -p /app/logs

# Set permissions (scripts are made executable during runtime)

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt')" || true

# Expose ports
EXPOSE 8810 8811 8812

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8810/health || exit 1

# Default command - models and services are started by docker-compose
CMD ["tail", "-f", "/dev/null"] 