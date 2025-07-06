# GeoGPT-RAG Deployment Summary

## Quick Deployment Commands

### 1. Connect to EC2 Instance
```bash
ssh -i your-key.pem ubuntu@3.233.224.145
```

### 2. Setup Environment
```bash
# Run the deployment script
chmod +x scripts/deploy_ec2.sh
./scripts/deploy_ec2.sh
```

### 3. Deploy System
```bash
# Navigate to project directory
cd ~/geogpt-rag/GeoGPT-RAG-master

# Start all services
docker-compose up -d

# Monitor startup
docker-compose logs -f
```

### 4. Verify Deployment
```bash
# Check service health
curl http://localhost:8810/health  # Embedding service
curl http://localhost:8811/health  # Reranking service

# Run system tests
docker exec -it geogpt-rag-system python /app/scripts/test_system.py

# Monitor system status
~/geogpt-rag/monitor.sh
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
1. **Models not downloading**: Run `docker exec -it geogpt-rag-system /app/scripts/download_models.sh`
2. **GPU not detected**: Check with `nvidia-smi` and restart Docker
3. **Services not starting**: Check logs with `docker-compose logs -f`
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