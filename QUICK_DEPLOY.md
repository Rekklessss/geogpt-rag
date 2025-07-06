# GeoGPT-RAG Quick Deploy Guide

## 🚀 Two-Command Deployment

### Initial Setup (Once)
```bash
# Connect to EC2
ssh -i geogpt-ec2.pem ubuntu@3.233.224.145

# Complete setup
curl -fsSL https://raw.githubusercontent.com/Rekklessss/geogpt-rag/main/scripts/setup_ec2.sh | bash
```

### Redeploy After Changes (Anytime)
```bash
cd ~/geogpt-rag && ./scripts/cleanup_redeploy.sh
```

## ✅ Verify Deployment
```bash
# Health checks
curl http://localhost:8810/health  # Embedding service
curl http://localhost:8811/health  # Reranking service

# System status
~/monitor_geogpt.sh
```

## 📊 Usage Example
```python
from rag_server.geo_kb import KBDocQA

# Initialize system
kb_server = KBDocQA()

# Add document
kb_server.add_file("document.mmd", max_size=512)

# Query
docs, answer = kb_server.query("What is geospatial analysis?")
print(answer)
```

## 🔧 Key Services
- **Port 8810**: GeoEmbedding Service (7B params)
- **Port 8811**: GeoReranker Service (568M params)
- **Zilliz Cloud**: Vector database
- **AWS Sagemaker**: LLM endpoint

## 📁 Project Structure
```
~/geogpt-rag/
├── scripts/
│   ├── setup_ec2.sh         # Initial setup
│   └── cleanup_redeploy.sh  # Cleanup & redeploy
├── rag_server/              # Main RAG pipeline
├── embedding/               # Embedding service
├── reranking/               # Reranking service
└── docker-compose.yml       # Container orchestration
```

---
**Repository**: https://github.com/Rekklessss/geogpt-rag  
**Instance**: 3.233.224.145 (g5.xlarge)  
**Region**: us-east-1 