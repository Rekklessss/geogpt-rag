# GeoGPT-RAG Simplified Deployment Summary

## Two-Script Deployment Process

### 1. Initial Setup (Run Once)
```bash
# Connect to EC2 instance
ssh -i geogpt-ec2.pem ubuntu@3.233.224.145

# Clone repository and run setup
curl -fsSL https://raw.githubusercontent.com/Rekklessss/geogpt-rag/main/scripts/setup_ec2.sh | bash

# Or manually:
git clone https://github.com/Rekklessss/geogpt-rag.git ~/geogpt-rag
cd ~/geogpt-rag
chmod +x scripts/setup_ec2.sh
./scripts/setup_ec2.sh
```

### 2. Redeploy After Changes (Run Anytime)
```bash
# Navigate to project directory
cd ~/geogpt-rag

# Complete cleanup and redeploy
./scripts/cleanup_redeploy.sh
```

### 3. Monitor System
```bash
# Check service health
curl http://localhost:8810/health  # Embedding service
curl http://localhost:8811/health  # Reranking service

# Monitor system status
~/monitor_geogpt.sh

# View logs
sudo docker-compose logs -f
```

## Configuration Summary

### Services
- **Embedding Service**: Port 8810 (GeoEmbedding - 7B params)
- **Reranking Service**: Port 8811 (GeoReranker - 568M params)
- **RAG Server**: Python library (connects to Zilliz Cloud + Sagemaker)

### External Services
- **Zilliz Cloud**: `https://in03-0beed7b5287844d.serverless.gcp-us-west1.cloud.zilliz.com`
- **AWS Sagemaker**: `GeoGPT-R1-Sagemaker-Endpoint` (us-east-1)
- **IAM Role**: `GeoGPT-Custom-Role-EC2`

### Instance Details
- **Instance ID**: i-01089964a2f322781
- **Public IP**: 3.233.224.145
- **Private IP**: 172.31.76.142
- **Instance Type**: g5.xlarge
- **Base Image**: nvidia/cuda:12.8.0-cudnn-devel-ubuntu24.04

## Usage Examples

### Test Embedding Service
```bash
curl -X POST "http://localhost:8810/query" \
  -H "Content-Type: application/json" \
  -d '{"queries": ["What causes earthquakes?"], "instruction": "Given a web search query, retrieve relevant passages"}'
```

### Test Reranking Service
```bash
curl -X POST "http://localhost:8811/query" \
  -H "Content-Type: application/json" \
  -d '{"qp_pairs": [["What causes earthquakes?", "Earthquakes are caused by tectonic plates"]]}'
```

### Test RAG System
```python
from rag_server.geo_kb import KBDocQA

# Initialize system
kb_server = KBDocQA()

# Add document
kb_server.add_file("sample_document.mmd", max_size=512)

# Query system
docs, answer = kb_server.query("What is geospatial analysis?")
print(f"Answer: {answer}")
```

## Troubleshooting

### Common Issues
1. **Models not downloading**: Run `cd ~/geogpt-rag && ./scripts/cleanup_redeploy.sh`
2. **GPU not detected**: Check with `nvidia-smi` and restart Docker
3. **Services not starting**: Check logs with `sudo docker-compose logs -f`
4. **Zilliz connection**: Verify credentials in `rag_server/config.py`
5. **Sagemaker issues**: Test with `aws sts get-caller-identity`

### Key Files
- `rag_server/config.py` - Main configuration
- `docker-compose.yml` - Service orchestration
- `scripts/start_services.sh` - Service startup
- `scripts/monitor.sh` - System monitoring
- `DEPLOYMENT_README.md` - Detailed documentation

## Support
- Project: GeoGPT-MVP
- Instance: i-01089964a2f322781
- Deployment: January 2025 