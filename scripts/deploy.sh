#!/bin/bash
# GeoGPT-RAG Deployment Script with Dynamic Configuration

set -e

echo "🚀 Starting GeoGPT-RAG deployment with dynamic configuration..."

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  .env file not found. Using default values."
fi

# Set defaults if not provided
export EC2_INSTANCE_IP=${EC2_INSTANCE_IP:-localhost}
export LLM_PROVIDER=${LLM_PROVIDER:-auto}
export CONTEXT_WINDOW_SIZE=${CONTEXT_WINDOW_SIZE:-8192}

echo "🔧 Configuration:"
echo "  - EC2 Instance IP: $EC2_INSTANCE_IP"
echo "  - LLM Provider: $LLM_PROVIDER"
echo "  - Context Window: $CONTEXT_WINDOW_SIZE"

# Update frontend environment
echo "📱 Updating frontend configuration..."
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_HOST=$EC2_INSTANCE_IP
NEXT_PUBLIC_API_PROTOCOL=http
NEXT_PUBLIC_RAG_EMBEDDING_API=http://$EC2_INSTANCE_IP:8810
NEXT_PUBLIC_RAG_RERANKING_API=http://$EC2_INSTANCE_IP:8811
NEXT_PUBLIC_RAG_API=http://$EC2_INSTANCE_IP:8812
EOF

# Build and start services
echo "🐳 Starting Docker services..."
cd ..
docker-compose down --remove-orphans
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Performing health checks..."
for port in 8810 8811 8812; do
    if curl -s http://$EC2_INSTANCE_IP:$port/health >/dev/null 2>&1; then
        echo "✅ Service on port $port is healthy"
    else
        echo "❌ Service on port $port is not responding"
    fi
done

echo "🎉 Deployment completed!"
echo "📊 Access your GeoGPT-RAG system at:"
echo "   - Main API: http://$EC2_INSTANCE_IP:8812"
echo "   - API Docs: http://$EC2_INSTANCE_IP:8812/docs"
echo "   - Frontend: http://localhost:3000 (if running separately)"
