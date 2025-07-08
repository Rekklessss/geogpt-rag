# GeoGPT-RAG Deployment Guide

## Quick Start - One Script Deployment

This guide provides streamlined deployment of the GeoGPT-RAG system on AWS EC2 g5.xlarge using a single comprehensive script.

### Prerequisites

- **AWS EC2 g5.xlarge instance** (already configured)
- **Instance Details**:
  - Instance ID: `i-01089964a2f322781`
  - Public IP: `3.81.101.190`
  - Private IP: `172.31.76.142`
  - IAM Role: `GeoGPT-Custom-Role-EC2`
- **External Services**: AWS Sagemaker and Zilliz Cloud configured

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│              AWS EC2 g5.xlarge Instance             │
├─────────────────────────────────────────────────────┤
│  Port 8810: Embedding Service (GeoEmbedding 7B)    │
│  Port 8811: Reranking Service (GeoReranker 568M)   │
│  Port 8812: GeoGPT API Service (RAG + Chat)        │
├─────────────────────────────────────────────────────┤
│  External: Zilliz Cloud + AWS Sagemaker + Web APIs │
└─────────────────────────────────────────────────────┘
```

## Deployment Scripts

### Single Script Deployment

The system uses **one primary script** for all deployment operations:

#### `scripts/cleanup_redeploy.sh` - Complete Pipeline Management

This script handles:
- ✅ **Complete system cleanup** (containers, images, volumes)
- ✅ **Fresh code deployment** from GitHub
- ✅ **Docker rebuild** and service startup
- ✅ **Health monitoring** across all three services
- ✅ **Comprehensive testing** (13 total tests)
- ✅ **Status reporting** with detailed logs

## Deployment Commands

### 1. SSH Access
```bash
ssh -i geogpt-ec2.pem ubuntu@3.81.101.190
```

### 2. Initial Setup (Run Once)
```bash
# Navigate to project directory
cd ~/geogpt-rag

# Make script executable (if needed)
chmod +x scripts/cleanup_redeploy.sh

# Run complete deployment
./scripts/cleanup_redeploy.sh
```

### 3. Redeploy After Changes (Primary Command)
```bash
# Navigate to project directory
cd ~/geogpt-rag

# Complete cleanup and redeploy from scratch
./scripts/cleanup_redeploy.sh
```

### 4. Monitor System Status
```bash
# Quick health check
curl http://localhost:8810/health  # Embedding service
curl http://localhost:8811/health  # Reranking service
curl http://localhost:8812/health  # GeoGPT API

# View service logs
sudo docker-compose logs -f

# Check container status
sudo docker ps
```

## Script Details

### cleanup_redeploy.sh Workflow

```bash
1. Pull Latest Code
   ├─ Git pull from main branch
   └─ Update all components

2. Complete Cleanup
   ├─ Stop all Docker containers
   ├─ Remove containers, images, volumes
   ├─ Clear model cache
   └─ Clean log files

3. System Rebuild
   ├─ Docker Compose build
   ├─ Download required models
   ├─ Start all services (8810, 8811, 8812)
   └─ Wait for service initialization

4. Health Verification
   ├─ Check all three service health endpoints
   ├─ Verify external service connectivity
   └─ Monitor startup logs

5. Comprehensive Testing
   ├─ Run all 13 test cases
   ├─ Validate API functionality
   ├─ Verify integration workflows
   └─ Security and implementation checks

6. Status Reporting
   ├─ Display service status
   ├─ Show test results
   ├─ Report any issues
   └─ Provide next steps
```

### Test Coverage (13 Tests)

**Functional Tests (6)**:
1. ✅ Health check endpoints
2. ✅ Chat functionality with RAG
3. ✅ Deep discovery process
4. ✅ Code execution sandbox
5. ✅ Web search integration
6. ✅ Complete workflow validation

**Verification Tests (7)**:
1. ✅ Mock data detection
2. ✅ Security pattern validation
3. ✅ Dependency verification
4. ✅ Real implementation checks
5. ✅ Best practices audit
6. ✅ Documentation compliance
7. ✅ Production readiness

## Service Configuration

### Port Mapping
- **8810**: Embedding Service (GeoEmbedding model)
- **8811**: Reranking Service (GeoReranker model)  
- **8812**: GeoGPT API Service (Main orchestration)

### External Service Integration
- **Zilliz Cloud**: Vector database for document storage
- **AWS Sagemaker**: GeoGPT LLM endpoint
- **Web APIs**: DuckDuckGo search and Wikipedia

### Docker Configuration
```yaml
# Key docker-compose.yml settings
services:
  geogpt-rag:
    ports:
      - "8810:8810"  # Embedding
      - "8811:8811"  # Reranking
      - "8812:8812"  # Main API
    volumes:
      - ./models:/app/models
      - ./logs:/app/logs
    environment:
      - CUDA_VISIBLE_DEVICES=0
```

## Monitoring and Maintenance

### Health Monitoring
```bash
# Check all services at once
for port in 8810 8811 8812; do
  echo "Checking port $port:"
  curl -s http://localhost:$port/health | jq .status || echo "Service unavailable"
done
```

### Log Management
```bash
# View real-time logs
sudo docker-compose logs -f

# Check specific service logs
sudo docker-compose logs geogpt-rag

# Monitor system resources
nvidia-smi                    # GPU usage
sudo docker stats            # Container resources
```

### Performance Monitoring
```bash
# GPU utilization
watch -n 1 nvidia-smi

# Container resource usage
sudo docker stats --no-stream

# Disk space
df -h
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Services Not Starting
```bash
# Check Docker status
sudo systemctl status docker

# Restart Docker if needed
sudo systemctl restart docker

# Re-run deployment
./scripts/cleanup_redeploy.sh
```

#### 2. GPU Not Detected
```bash
# Check NVIDIA driver
nvidia-smi

# Verify Docker GPU support
sudo docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi

# Restart Docker daemon
sudo systemctl restart docker
```

#### 3. Model Download Issues
```bash
# Check available disk space
df -h

# Manual model verification
ls -la ~/geogpt-rag/models/

# Force complete rebuild
./scripts/cleanup_redeploy.sh
```

#### 4. External Service Connectivity
```bash
# Test Zilliz connection
python -c "from rag_server.geo_kb import KBDocQA; kb = KBDocQA(); print('Zilliz OK')"

# Test AWS credentials
aws sts get-caller-identity

# Test Sagemaker endpoint
aws sagemaker describe-endpoint --endpoint-name GeoGPT-R1-Sagemaker-Endpoint
```

#### 5. Port Conflicts
```bash
# Check port usage
sudo netstat -tulpn | grep -E ':(8810|8811|8812)'

# Kill conflicting processes if needed
sudo lsof -t -i:8810 | xargs sudo kill -9
sudo lsof -t -i:8811 | xargs sudo kill -9
sudo lsof -t -i:8812 | xargs sudo kill -9
```

### Debug Commands
```bash
# Full system status
./scripts/cleanup_redeploy.sh 2>&1 | tee deployment.log

# Check individual components
docker-compose ps
docker-compose logs --tail=50 geogpt-rag

# Test API endpoints
python scripts/test_geogpt_api.py
```

## Production Deployment

### Production URLs
- **Embedding Service**: `http://3.234.222.18:8810`
- **Reranking Service**: `http://3.234.222.18:8811`
- **GeoGPT API**: `http://3.234.222.18:8812`

### Security Considerations
1. **Network Security**: Configure security groups for specific IP access
2. **SSL/TLS**: Add HTTPS for production frontend deployment
3. **Authentication**: Implement API key authentication for production
4. **Rate Limiting**: Monitor and adjust rate limits based on usage
5. **Monitoring**: Set up CloudWatch alarms for service health

### Scaling
- **Horizontal**: Load balance multiple instances
- **Vertical**: Upgrade to larger GPU instances
- **Database**: Use Zilliz clustering for high availability

## Backup and Recovery

### Critical Files to Backup
```bash
# Configuration files
rag_server/config.py
docker-compose.yml

# Model weights (if customized)
models/

# Logs for troubleshooting
logs/
```

### Recovery Process
```bash
# Restore from backup
scp backup-files ubuntu@3.234.222.18:~/geogpt-rag/

# Run deployment script
./scripts/cleanup_redeploy.sh
```

## Support and Maintenance

### Regular Maintenance Tasks
- **Weekly**: Monitor disk space and clean old logs
- **Monthly**: Update system packages and Docker images
- **Quarterly**: Review and update model versions

### Maintenance Commands
```bash
# Clean up old Docker images
sudo docker system prune -a

# Update system packages
sudo apt update && sudo apt upgrade

# Restart services
./scripts/cleanup_redeploy.sh
```

### Support Checklist
1. ✅ Check service health endpoints
2. ✅ Review Docker container status
3. ✅ Monitor GPU utilization
4. ✅ Verify external service connectivity
5. ✅ Run comprehensive test suite
6. ✅ Check log files for errors

---

## Summary

**Single Script Deployment**: Use `./scripts/cleanup_redeploy.sh` for all deployment needs - it handles everything from cleanup to testing automatically.

**Key Monitoring**: Check ports 8810, 8811, and 8812 for service health.

**Troubleshooting**: Start with the deployment script, then check Docker logs and service health endpoints.

This streamlined approach ensures consistent, reliable deployments with comprehensive testing and monitoring. 