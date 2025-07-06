#!/bin/bash

# EC2 Deployment Script for GeoGPT-RAG
# This script sets up the complete environment on EC2 g5.xlarge instance

set -e

echo "=== GeoGPT-RAG EC2 Deployment Script ==="
echo "Instance: g5.xlarge"
echo "Region: us-east-1"
echo "AMI: ubuntu-noble-24.04-amd64-server-20250610"
echo "=========================================="

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install essential packages
echo "Installing essential packages..."
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
echo "Installing Docker..."
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
echo "Adding user to docker group..."
sudo usermod -aG docker $USER

# Install NVIDIA Container Toolkit
echo "Installing NVIDIA Container Toolkit..."
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker daemon for NVIDIA
echo "Configuring Docker for NVIDIA..."
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Install AWS CLI
echo "Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/

# Set up AWS credentials using IAM role
echo "Setting up AWS credentials..."
mkdir -p ~/.aws
cat > ~/.aws/config << EOF
[default]
region = us-east-1
output = json
EOF

# Test AWS access
echo "Testing AWS access..."
aws sts get-caller-identity

# Create project directory
echo "Setting up project directory..."
mkdir -p ~/geogpt-rag
cd ~/geogpt-rag

# Clone the project (if not already present)
if [ ! -d "GeoGPT-RAG-master" ]; then
    echo "Please upload your GeoGPT-RAG codebase to ~/geogpt-rag/"
    echo "After uploading, run: cd ~/geogpt-rag/GeoGPT-RAG-master && docker-compose up -d"
fi

# Create necessary directories
mkdir -p models logs data split_chunks ssl

# Set up firewall rules
echo "Setting up firewall rules..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8810/tcp
sudo ufw allow 8811/tcp
sudo ufw allow 8812/tcp
sudo ufw --force enable

# Set up systemd service for automatic startup
echo "Creating systemd service..."
sudo tee /etc/systemd/system/geogpt-rag.service > /dev/null <<EOF
[Unit]
Description=GeoGPT-RAG Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/geogpt-rag/GeoGPT-RAG-master
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=ubuntu
Group=ubuntu

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable geogpt-rag.service

# Create monitoring script
echo "Creating monitoring script..."
cat > ~/geogpt-rag/monitor.sh << 'EOF'
#!/bin/bash
echo "=== GeoGPT-RAG System Status ==="
echo "Docker containers:"
docker ps
echo ""
echo "GPU status:"
nvidia-smi
echo ""
echo "Service health:"
curl -f http://localhost:8810/health && echo "✓ Embedding service OK" || echo "✗ Embedding service DOWN"
curl -f http://localhost:8811/health && echo "✓ Reranking service OK" || echo "✗ Reranking service DOWN"
echo ""
echo "Logs:"
echo "Embedding: tail -f ~/geogpt-rag/logs/embedding.log"
echo "Reranking: tail -f ~/geogpt-rag/logs/reranking.log"
EOF

chmod +x ~/geogpt-rag/monitor.sh

echo "=== Deployment Complete ==="
echo "Next steps:"
echo "1. Upload your GeoGPT-RAG codebase to ~/geogpt-rag/"
echo "2. cd ~/geogpt-rag/GeoGPT-RAG-master"
echo "3. docker-compose up -d"
echo "4. Use ~/geogpt-rag/monitor.sh to check status"
echo ""
echo "Services will be available at:"
echo "- Embedding service: http://3.233.224.145:8810"
echo "- Reranking service: http://3.233.224.145:8811"
echo ""
echo "Note: You may need to log out and back in for docker group changes to take effect" 