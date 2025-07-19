# GeoGPT-RAG Production Deployment Guide

## 🎉 System Updated with Production Credentials

Your GeoGPT-RAG system has been successfully updated with your current production credentials and EC2 instance details.

---

## 📋 What Was Updated

### ✅ **Core Configuration Files**
- **`rag_server/config.py`** - Updated Zilliz Cloud credentials
- **`rag_server/instance_config.py`** - New EC2 IP (3.236.251.69) as default
- **`rag_server/llm_providers.py`** - OpenAI API key configured with fallback
- **`docker-compose.yml`** - Production environment variables with defaults
- **`frontend/next.config.js`** - Updated API host to current EC2 instance

### ✅ **New Template Files Created**
- **`env.production.template`** - Complete environment configuration
- **`frontend/env.local.production.template`** - Frontend environment template
- **`scripts/deploy_production.sh`** - Production deployment script

### ✅ **Production Credentials Configured**
- **EC2 Instance**: `3.236.251.69` (i-0cf221c2fca3cb3cf)
- **OpenAI API**: Active key configured for cost-effective model access
- **Zilliz Cloud**: Production cluster (db_088dd53cf6b3582)
- **LLM Provider**: Auto-switching between OpenAI and Sagemaker

---

## 🚀 Quick Deployment

### **Option 1: Quick Production Deploy (Recommended)**
```bash
# Make the script executable
chmod +x scripts/deploy_production.sh

# Run production deployment
./scripts/deploy_production.sh
```

### **Option 2: Manual Environment Setup**
```bash
# Copy environment templates
cp env.production.template .env
cp frontend/env.local.production.template frontend/.env.local

# Deploy with Docker Compose
docker-compose down --remove-orphans
docker-compose up --build -d
```

---

## 🔗 Access Your System

After deployment, access your services at:

- **🌐 Main API**: http://3.236.251.69:8812
- **📖 API Documentation**: http://3.236.251.69:8812/docs
- **🔗 Health Check**: http://3.236.251.69:8812/health
- **🗺️ Embedding Service**: http://3.236.251.69:8810
- **🔍 Reranking Service**: http://3.236.251.69:8811

### **Frontend Development**
```bash
cd frontend
npm install
npm run dev
# Access at: http://localhost:3000
```

---

## 🧪 Testing Your System

### **1. Health Check**
```bash
curl http://3.236.251.69:8812/health
```

### **2. Test OpenAI Integration**
```bash
curl -X POST "http://3.236.251.69:8812/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Test OpenAI connection", "use_rag": false}'
```

### **3. Test RAG Pipeline**
```bash
curl -X POST "http://3.236.251.69:8812/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is geospatial analysis?", "use_rag": true}'
```

### **4. Test Map Visualization**
```bash
curl -X POST "http://3.236.251.69:8812/map/create" \
  -H "Content-Type: application/json" \
  -d '{"center": [37.7749, -122.4194], "zoom": 10, "title": "Test Map"}'
```

---

## 🛠️ New Features Available

### **🧠 Dynamic LLM Provider**
- **Auto Mode**: Prefers OpenAI (cost-effective) with Sagemaker fallback
- **Manual Override**: Set `LLM_PROVIDER=openai` or `LLM_PROVIDER=sagemaker`
- **Cost Monitoring**: Track usage between providers

### **🗺️ Advanced Map Visualization**
- Interactive map generation with Folium
- Spatial analysis operations (buffer, intersection, area)
- Geocoding with intelligent caching
- Multi-layer support with custom styling

### **🗃️ Enhanced Memory System**
- PostgreSQL + Redis for conversation persistence
- Smart context window management (8192 tokens)
- Session-based memory across restarts
- Token counting and intelligent truncation

### **🔧 Configuration Management**
- Environment-based configuration system
- Auto-detection of EC2 instance details
- Dynamic service endpoint management
- Hot-swappable credentials

---

## ⚠️ Important Notes

### **Security**
- All production credentials are now configured
- Ensure EC2 security groups allow traffic on ports 8810-8812
- Consider enabling API authentication for production use

### **Cost Management**
- OpenAI API is now the default provider (cost-effective)
- Monitor usage in OpenAI dashboard
- Sagemaker fallback available for high-volume processing
- Set usage limits and alerts as needed

### **Monitoring**
- Check service logs: `docker-compose logs geogpt-rag`
- Monitor resource usage: `docker stats`
- Health checks available at `/health` endpoints

### **Updates**
- When EC2 instance changes, update `EC2_INSTANCE_IP` in environment
- Frontend will automatically adapt to new API endpoints
- Database migrations handled automatically

---

## 🆘 Troubleshooting

### **Services Not Starting**
```bash
# Check logs
docker-compose logs --tail=50 geogpt-rag

# Rebuild containers
docker-compose down --remove-orphans
docker system prune -f
docker-compose up --build -d
```

### **OpenAI API Issues**
- Verify API key is active in OpenAI dashboard
- Check billing and usage limits
- Switch to Sagemaker: set `LLM_PROVIDER=sagemaker`

### **Database Connection Issues**
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart database services
docker-compose restart postgres redis
```

### **Frontend Connection Issues**
- Verify `frontend/.env.local` has correct EC2 IP
- Check CORS settings if accessing from external domain
- Ensure security groups allow frontend access

---

## 📞 Support

Your GeoGPT-RAG system is now fully configured with production credentials and ready for deployment. The system includes:

✅ **Dynamic LLM Providers** (OpenAI + Sagemaker)  
✅ **Production Vector Database** (Zilliz Cloud)  
✅ **Advanced Memory System** (PostgreSQL + Redis)  
✅ **Interactive Maps** (PostGIS + Folium)  
✅ **Automated Deployment** (Docker + Scripts)  

All major infrastructure improvements are complete and production-ready! 