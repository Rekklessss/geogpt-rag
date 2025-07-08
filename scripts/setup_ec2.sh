#!/bin/bash

# EC2 Setup Script for GeoGPT-RAG
# 
# USAGE:
#   1. Run this script on a fresh EC2 instance: ./scripts/setup_ec2.sh
#   2. Then run the cleanup script for full deployment: ./scripts/cleanup_redeploy.sh
#
# This script:
#   - Sets up Docker, NVIDIA toolkit, AWS CLI
#   - Clones the repository and builds initial images
#   - Detects and configures the public IP address
#   - Prepares the environment for the cleanup_redeploy.sh script
#
# Compatible with: g5.xlarge, g4dn.xlarge, or similar GPU instances

set -e

REPO_URL="https://github.com/Rekklessss/geogpt-rag.git"
PROJECT_DIR="$HOME/geogpt-rag"

# Get the public IP of this EC2 instance
get_public_ip() {
    # Try multiple methods to get public IP
    local ip=""
    
    # Method 1: EC2 metadata service
    ip=$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
    
    if [[ -n "$ip" && "$ip" != "curl:"* ]]; then
        echo "$ip"
        return 0
    fi
    
    # Method 2: External service fallback
    ip=$(curl -s --max-time 5 https://checkip.amazonaws.com 2>/dev/null | tr -d '\n' || echo "")
    
    if [[ -n "$ip" && "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        echo "$ip"
        return 0
    fi
    
    # Method 3: Manual input
    echo "Unable to detect public IP automatically"
    read -p "Please enter your EC2 public IP address: " ip
    echo "$ip"
}

# Detect public IP
PUBLIC_IP=$(get_public_ip)

echo "=== GeoGPT-RAG EC2 Setup & Deployment ==="
echo "Repository: $REPO_URL"
echo "Public IP: $PUBLIC_IP"
echo "Instance Type: g5.xlarge (or compatible)"
echo "Region: us-east-1"
echo "=========================================="

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
    htop \
    vim \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
echo "🐳 Installing Docker..."
sudo rm -f /usr/share/keyrings/docker-archive-keyring.gpg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
echo "👤 Adding user to docker group..."
sudo usermod -aG docker $USER

# Install NVIDIA Container Toolkit
echo "🎮 Installing NVIDIA Container Toolkit..."
sudo rm -f /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker daemon for NVIDIA
echo "🎮 Configuring Docker for NVIDIA..."
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Install AWS CLI
echo "☁️ Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/

# Set up AWS credentials using IAM role
echo "🔐 Setting up AWS credentials..."
mkdir -p ~/.aws
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

# Set up IP environment variable for future deployments
echo "🔧 Setting up IP configuration..."
export GEOGPT_PUBLIC_IP="$PUBLIC_IP"
echo "export GEOGPT_PUBLIC_IP=\"$PUBLIC_IP\"" >> ~/.bashrc

# Build Docker images (initial setup)
echo "🔨 Building Docker images..."
echo "This may take a while as it downloads models (~7GB)..."
sudo docker-compose build

# Start services for initial setup verification
echo "🚀 Starting services for initial verification..."
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

# Check GeoGPT API service
check_service 8812 "GeoGPT API Service"
GEOGPT_STATUS=$?

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
cat > ~/monitor_geogpt.sh << MONITOR_EOF
#!/bin/bash
echo "=== GeoGPT-RAG System Status ==="
echo "🌐 Public IP: $PUBLIC_IP"
echo ""
echo "🐳 Docker containers:"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "🎮 GPU status:"
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader,nounits 2>/dev/null || echo "No GPU detected"
echo ""
echo "🏥 Service health (internal):"
curl -f http://localhost:8810/health 2>/dev/null && echo "✅ Embedding service OK" || echo "❌ Embedding service DOWN"
curl -f http://localhost:8811/health 2>/dev/null && echo "✅ Reranking service OK" || echo "❌ Reranking service DOWN"
curl -f http://localhost:8812/health 2>/dev/null && echo "✅ GeoGPT API service OK" || echo "❌ GeoGPT API service DOWN"
echo ""
echo "🌐 External service URLs:"
echo "  - Embedding: http://$PUBLIC_IP:8810/health"
echo "  - Reranking: http://$PUBLIC_IP:8811/health"
echo "  - GeoGPT API: http://$PUBLIC_IP:8812/health"
echo ""
echo "💾 Disk usage:"
df -h /
echo ""
echo "🔍 Recent logs:"
echo "Full logs: sudo docker-compose logs --tail 10"
echo ""
echo "📊 System resources:"
MEMORY_INFO=\$(free -h | grep Mem | awk '{print \$3 "/" \$2}')
CPU_INFO=\$(top -bn1 | grep "Cpu(s)" | awk '{print \$2}' | cut -d'%' -f1)
echo "Memory: \$MEMORY_INFO"
echo "CPU: \${CPU_INFO}% used"
MONITOR_EOF

chmod +x ~/monitor_geogpt.sh

# Display final status
echo ""
echo "=== EC2 Initial Setup Summary ==="
echo "🏠 Project Directory: $PROJECT_DIR"
echo "🌐 Detected Public IP: $PUBLIC_IP"
echo "📊 Monitor System: ~/monitor_geogpt.sh"
echo "🔄 Full Deployment: cd $PROJECT_DIR && ./scripts/cleanup_redeploy.sh"
echo ""
echo "🌐 Service URLs:"
echo "  - Embedding Service: http://$PUBLIC_IP:8810"
echo "  - Reranking Service: http://$PUBLIC_IP:8811"
echo "  - GeoGPT API Service: http://$PUBLIC_IP:8812"
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

if [ $GEOGPT_STATUS -eq 0 ]; then
    echo "  ✅ GeoGPT API Service: Running"
else
    echo "  ❌ GeoGPT API Service: Failed"
fi

if [ $TEST_STATUS -eq 0 ]; then
    echo "  ✅ System Tests: Passed"
else
    echo "  ❌ System Tests: Failed"
fi

echo ""
if [ $EMBEDDING_STATUS -eq 0 ] && [ $RERANKING_STATUS -eq 0 ] && [ $GEOGPT_STATUS -eq 0 ] && [ $TEST_STATUS -eq 0 ]; then
    echo "🎉 Initial EC2 setup completed successfully!"
    echo "💡 Basic services are running. For full deployment, run the cleanup script next."
else
    echo "⚠️ Initial setup completed with some issues. Check logs for details:"
    echo "   docker-compose logs -f"
fi

echo ""
echo "============================================="
echo "🚀 NEXT STEPS FOR COMPLETE DEPLOYMENT:"
echo "============================================="
echo ""
echo "1. 🧹 Run the cleanup script for full deployment:"
echo "   cd $PROJECT_DIR && ./scripts/cleanup_redeploy.sh"
echo ""
echo "   The IP address ($PUBLIC_IP) is already configured!"
echo ""
echo "2. 📊 Monitor system status:"
echo "   ~/monitor_geogpt.sh"
echo ""
echo "3. 🔄 For future redeployments when IP changes:"
echo "   ./scripts/cleanup_redeploy.sh --ip NEW_IP_ADDRESS"
echo ""
echo "4. 🔍 View logs:"
echo "   sudo docker-compose logs -f"
echo ""
echo "💡 Notes:"
echo "   - IP address $PUBLIC_IP is set in environment"
echo "   - Docker group membership active (logout/login for non-sudo access)"
echo "   - All services configured for this IP automatically"
echo ""
echo "📚 For detailed usage examples, see: DEPLOYMENT_README.md and IP_MANAGEMENT_GUIDE.md" 