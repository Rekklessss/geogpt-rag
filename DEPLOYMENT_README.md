# GeoGPT-RAG EC2 Deployment Guide

This guide provides step-by-step instructions for deploying the GeoGPT-RAG system on an AWS EC2 g5.xlarge instance.

## System Overview

The GeoGPT-RAG system consists of three main components:
1. **Embedding Service** - GeoEmbedding model (7B parameters) on port 8810
2. **Reranking Service** - GeoReranker model (568M parameters) on port 8811  
3. **RAG Server** - Main orchestration service connecting to Zilliz Cloud and AWS Sagemaker

## Prerequisites

- AWS EC2 g5.xlarge instance (already configured)
- Instance details:
  - **Instance ID**: i-01089964a2f322781
  - **Public IP**: 3.233.224.145
  - **Private IP**: 172.31.76.142
  - **IAM Role**: GeoGPT-Custom-Role-EC2
- AWS Sagemaker endpoint configured
- Zilliz Cloud database configured

## Quick Start - Simplified Two-Script Deployment

> **Note**: This deployment uses `sudo` for Docker commands during initial setup. After setup completes, you can either continue using `sudo docker` or log out and back in to use Docker without sudo.

### 1. Initial Setup (Run Once)

```bash
# Connect to EC2 instance
ssh -i geogpt-ec2.pem ubuntu@3.233.224.145

# Clone repository and run complete setup
curl -fsSL https://raw.githubusercontent.com/Rekklessss/geogpt-rag/main/scripts/setup_ec2.sh | bash

# Or manually:
git clone https://github.com/Rekklessss/geogpt-rag.git ~/geogpt-rag
cd ~/geogpt-rag
chmod +x scripts/setup_ec2.sh
./scripts/setup_ec2.sh
```

### 2. Redeploy After Changes

```bash
# Navigate to project directory
cd ~/geogpt-rag

# Complete cleanup and redeploy from scratch
./scripts/cleanup_redeploy.sh
```

### 3. Monitor and Verify

```bash
# Check service health
curl http://localhost:8810/health  # Embedding service
curl http://localhost:8811/health  # Reranking service

# Monitor system status
~/monitor_geogpt.sh

# View logs
sudo docker-compose logs -f
```

## Simplified Two-Script Approach

This deployment uses only two scripts:

1. **`scripts/setup_ec2.sh`** - Complete EC2 environment setup and initial deployment
   - Installs all dependencies (Docker, NVIDIA toolkit, AWS CLI, etc.)
   - Clones repository from GitHub
   - Downloads models and builds containers
   - Starts all services
   - Runs system tests
   - Sets up monitoring

2. **`scripts/cleanup_redeploy.sh`** - Complete cleanup and redeploy
   - Stops all services
   - Removes all containers, images, and volumes
   - Deletes downloaded models and logs
   - Pulls latest code from GitHub
   - Rebuilds everything from scratch
   - Redeploys all services

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS EC2 g5.xlarge                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Embedding      │  │  Reranking      │  │  RAG Server     │ │
│  │  Service        │  │  Service        │  │                 │ │
│  │  :8810          │  │  :8811          │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                       External Services                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Zilliz Cloud   │  │  AWS Sagemaker  │  │  Load Balancer  │ │
│  │  Vector DB      │  │  LLM Endpoint   │  │  (Optional)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration Details

### Zilliz Cloud Configuration
- **URI**: `https://in03-0beed7b5287844d.serverless.gcp-us-west1.cloud.zilliz.com`
- **Collection**: `GeoGPT_Knowledge_Base`
- **Vector Index**: HNSW with COSINE similarity

### AWS Sagemaker Configuration  
- **Endpoint**: `GeoGPT-R1-Sagemaker-Endpoint`
- **Region**: `us-east-1`
- **Authentication**: IAM Role (GeoGPT-Custom-Role-EC2)

### Service Ports
- **8810**: Embedding Service
- **8811**: Reranking Service
- **8812**: RAG Server (if needed)
- **80/443**: Load Balancer (optional)

## Usage Examples

### 1. Using the RAG System Programmatically

```python
from rag_server.geo_kb import KBDocQA

# Initialize the RAG system
kb_server = KBDocQA()

# Add documents to the knowledge base
kb_server.add_file("your_document.mmd", max_size=512)

# Query the system
docs, answer = kb_server.query("What is geospatial analysis?")
print(f"Answer: {answer}")
print(f"Supporting documents: {len(docs)}")
```

### 2. Using the Embedding Service API

```python
import requests
import json

# Test embedding
response = requests.post("http://localhost:8810/query", json={
    "queries": ["What causes earthquakes?"],
    "instruction": "Given a web search query, retrieve relevant passages"
})

embeddings = json.loads(response.json()["q_embeddings"])
print(f"Embedding dimensions: {len(embeddings[0])}")
```

### 3. Using the Reranking Service API

```python
import requests
import json

# Test reranking
response = requests.post("http://localhost:8811/query", json={
    "qp_pairs": [
        ["What causes earthquakes?", "Earthquakes are caused by tectonic plates"],
        ["What causes earthquakes?", "Mountains are formed by geological processes"]
    ]
})

scores = json.loads(response.json()["pred_scores"])
print(f"Relevance scores: {scores}")
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check service health
curl http://localhost:8810/health  # Embedding service
curl http://localhost:8811/health  # Reranking service

# Check system status
~/monitor_geogpt.sh
```

### Log Monitoring
```bash
# View service logs
sudo docker-compose logs geogpt-rag

# View system logs
tail -f ~/geogpt-rag/logs/embedding.log
tail -f ~/geogpt-rag/logs/reranking.log
```

### Performance Monitoring
```bash
# GPU utilization
nvidia-smi

# Container resources
sudo docker stats

# System resources
htop
```

## Troubleshooting

### Common Issues

1. **Models not downloading**
   ```bash
   # Check if models exist
   ls -la ~/geogpt-rag/models/
   
   # Force model download by removing and redeploying
   cd ~/geogpt-rag && ./scripts/cleanup_redeploy.sh
   ```

2. **GPU not detected**
   ```bash
   # Check NVIDIA driver
   nvidia-smi
   
   # Restart Docker with GPU support
   sudo systemctl restart docker
   ```

3. **Services not starting**
   ```bash
   # Check container logs
   sudo docker-compose logs -f
   
   # Restart services
   sudo docker-compose restart
   ```

4. **Zilliz connection issues**
   ```bash
   # Test connection
   python -c "from rag_server.geo_kb import KBDocQA; kb = KBDocQA(); print('Connected successfully')"
   ```

5. **Sagemaker endpoint issues**
   ```bash
   # Test AWS credentials
   aws sts get-caller-identity
   
   # Test Sagemaker endpoint
   aws sagemaker describe-endpoint --endpoint-name GeoGPT-R1-Sagemaker-Endpoint
   ```

### Performance Optimization

1. **GPU Memory Optimization**
   - Use FP16 for embedding service: `--fp16` flag
   - Adjust batch sizes in config.py
   - Monitor GPU memory usage

2. **Model Loading Optimization**
   - Pre-download models to reduce startup time
   - Use model caching
   - Consider using smaller models for development

3. **Vector Database Optimization**
   - Adjust HNSW parameters for better performance
   - Use appropriate chunk sizes (512 tokens recommended)
   - Monitor query performance

## Security Considerations

1. **Network Security**
   - Use VPC security groups
   - Limit port access to necessary IPs
   - Enable SSH key-based authentication

2. **Data Security**
   - Use HTTPS for external APIs
   - Encrypt sensitive data in transit
   - Secure model storage

3. **Access Control**
   - Use IAM roles for AWS services
   - Implement API authentication
   - Monitor access logs

## Scaling Considerations

1. **Horizontal Scaling**
   - Use load balancers for multiple instances
   - Implement service discovery
   - Use container orchestration (Kubernetes)

2. **Vertical Scaling**
   - Upgrade to larger EC2 instances
   - Increase GPU memory
   - Optimize model serving

3. **Database Scaling**
   - Use Zilliz Cloud clustering
   - Implement data partitioning
   - Monitor database performance

## Support and Maintenance

### Regular Maintenance Tasks
- Monitor disk space usage
- Update system packages
- Backup model weights
- Update Docker images
- Review logs for errors

### Backup Strategy
- Backup model weights to S3
- Export vector database collections
- Backup configuration files
- Document deployment procedures

### Monitoring Alerts
- Set up CloudWatch alarms
- Monitor service availability
- Track resource utilization
- Alert on error rates

## Contact Information

For support with this deployment:
- Project: GeoGPT-MVP
- Instance: i-01089964a2f322781
- Deployment Date: January 2025
- Configuration: g5.xlarge with CUDA 12.8

---

**Note**: This deployment guide assumes you have the necessary AWS permissions and have configured the required services (Sagemaker, Zilliz Cloud, EC2 IAM roles). 