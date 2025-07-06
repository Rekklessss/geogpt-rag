#!/bin/bash

# GeoGPT-RAG EC2 Setup Script
# This script sets up the complete GeoGPT-RAG system on EC2

set -e  # Exit on any error

echo "🚀 Starting GeoGPT-RAG EC2 Setup..."
echo "==============================================="

# Configuration
PROJECT_DIR="/home/ubuntu/geogpt-rag"
REPO_URL="https://github.com/Rekklessss/geogpt-rag.git"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nvidia-utils-535 \
    python3 \
    python3-pip \
    python3-venv \
    ufw

# Install Docker
echo "🐳 Installing Docker..."
# Remove existing Docker keyring and sources to avoid conflicts
sudo rm -f /etc/apt/keyrings/docker.gpg
sudo rm -f /etc/apt/sources.list.d/docker.list

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Install Docker Compose standalone
echo "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group and ensure Docker daemon is running
sudo usermod -aG docker ubuntu
sudo systemctl enable docker
sudo systemctl start docker

# Install NVIDIA Docker runtime
echo "🎮 Installing NVIDIA Docker runtime..."
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update -y
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Test GPU access
echo "🎮 Testing GPU access..."
nvidia-smi

# Install AWS CLI
echo "☁️ Installing AWS CLI..."
cd /tmp
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
sudo ./aws/install

# Configure AWS CLI with IMDSv2
echo "☁️ Configuring AWS credentials..."
export AWS_DEFAULT_REGION=us-east-1
export AWS_REGION=us-east-1

# Create AWS config directory
mkdir -p ~/.aws

# Configure AWS credentials using IMDSv2
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
REGION=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/placement/region)

cat > ~/.aws/config << EOF
[default]
region = us-east-1
output = json
EOF

# Test AWS access
echo "✅ Testing AWS access..."
if aws sts get-caller-identity; then
    echo "✅ AWS credentials configured successfully"
else
    echo "❌ AWS credentials not working. Please check IAM role attachment."
fi

# Clone or update repository
echo "📥 Cloning/updating repository..."
if [ -d "$PROJECT_DIR" ]; then
    echo "Directory exists, updating..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    echo "Cloning repository..."
    git clone "$REPO_URL" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p models logs data split_chunks ssl

# Set up firewall rules
echo "🔥 Setting up firewall rules..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8810/tcp
sudo ufw allow 8811/tcp
sudo ufw allow 8812/tcp
sudo ufw --force enable

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh

# Set up systemd service for automatic startup
echo "🚀 Creating systemd service..."
sudo tee /etc/systemd/system/geogpt-rag.service > /dev/null <<EOF
[Unit]
Description=GeoGPT-RAG Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable geogpt-rag.service

# Build and start services
echo "🔨 Building and starting services..."
echo "This may take a while as it downloads models (~7GB)..."

# Use sudo for Docker commands since group membership needs a new shell session
# Build Docker images
sudo docker-compose build

# Start services in detached mode
sudo docker-compose up -d

echo "⏳ Waiting for services to initialize..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
check_service() {
    local port=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f "http://localhost:$port/health" 2>/dev/null; then
            echo "✅ $service_name is ready"
            return 0
        fi
        echo "⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    echo "❌ $service_name failed to start"
    return 1
}

# Check embedding service
check_service 8810 "Embedding Service"
EMBEDDING_STATUS=$?

# Check reranking service  
check_service 8811 "Reranking Service"
RERANKING_STATUS=$?

# Run system tests
echo "🧪 Running system tests..."
if sudo docker exec geogpt-rag-system python /app/scripts/test_system.py; then
    echo "✅ System tests passed!"
    TEST_STATUS=0
else
    echo "❌ System tests failed!"
    TEST_STATUS=1
fi

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > ~/monitor_geogpt.sh << 'MONITOR_EOF'
#!/bin/bash
echo "=== GeoGPT-RAG System Status ==="
echo "🐳 Docker containers:"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🎮 GPU status:"
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits
echo ""
echo "🏥 Service health:"
curl -f http://localhost:8810/health 2>/dev/null && echo "✅ Embedding service OK" || echo "❌ Embedding service DOWN"
curl -f http://localhost:8811/health 2>/dev/null && echo "✅ Reranking service OK" || echo "❌ Reranking service DOWN"
echo ""
echo "💾 Disk usage:"
df -h /
echo ""
echo "🔍 Recent logs:"
echo "Embedding: sudo docker logs --tail 5 geogpt-rag-system 2>/dev/null | grep embedding || echo No embedding logs"
echo "Reranking: sudo docker logs --tail 5 geogpt-rag-system 2>/dev/null | grep reranking || echo No reranking logs"
echo ""
echo "📊 System resources:"
MEMORY_INFO=$(free -h | grep Mem | awk '{print $3 "/" $2}')
CPU_INFO=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
echo "Memory: $MEMORY_INFO"
echo "CPU: ${CPU_INFO}% used"
MONITOR_EOF

chmod +x ~/monitor_geogpt.sh

# Display final status
echo ""
echo "=== Deployment Summary ==="
echo "🏠 Project Directory: $PROJECT_DIR"
echo "📊 Monitor System: ~/monitor_geogpt.sh"
echo "🔄 Redeploy System: cd $PROJECT_DIR && ./scripts/cleanup_redeploy.sh"
echo ""
echo "🌐 Service URLs:"
echo "  - Embedding Service: http://3.233.224.145:8810"
echo "  - Reranking Service: http://3.233.224.145:8811"
echo ""
echo "📋 Service Status:"
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

if [ $TEST_STATUS -eq 0 ]; then
    echo "  ✅ System Tests: Passed"
else
    echo "  ❌ System Tests: Failed"
fi

echo ""
if [ $EMBEDDING_STATUS -eq 0 ] && [ $RERANKING_STATUS -eq 0 ] && [ $TEST_STATUS -eq 0 ]; then
    echo "🎉 GeoGPT-RAG deployment completed successfully!"
    echo "💡 The system is ready to use. Check ~/monitor_geogpt.sh for status monitoring."
else
    echo "⚠️ Deployment completed with some issues. Check logs for details:"
    echo "   sudo docker-compose logs -f"
fi

echo ""
echo "🔄 To redeploy after code changes:"
echo "   cd $PROJECT_DIR && ./scripts/cleanup_redeploy.sh"
echo ""
echo "💡 Note: Docker group membership is active. For regular docker commands without sudo:"
echo "   - Either use: sudo docker <command>"
echo "   - Or log out and back in to refresh group membership"
echo ""
echo "📚 For detailed usage examples, see: DEPLOYMENT_README.md" 