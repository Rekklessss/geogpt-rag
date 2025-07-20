# GeoGPT-RAG Scripts

This directory contains deployment and management scripts for the GeoGPT-RAG system.

## 🚀 Quick Start

### Deploy the System (Interactive Setup Included)

```bash
# Complete cleanup and redeploy with interactive environment setup
./scripts/cleanup_redeploy.sh

# Deploy with specific IP
./scripts/cleanup_redeploy.sh --ip YOUR_EC2_IP

# Or manually export variables first
export OPENAI_API_KEY="your-actual-openai-api-key"
export GEOGPT_PUBLIC_IP="54.224.133.45"
./scripts/cleanup_redeploy.sh
```

## 📁 Scripts Overview

### `cleanup_redeploy.sh` 🔧 **ENHANCED**
Complete system cleanup and redeploy with integrated environment setup:
- **Interactive environment setup** with validation
- **Enhanced validation** of OpenAI API key format and length
- **Persistent environment** variables throughout deployment
- **Optional ~/.bashrc integration** for persistence across sessions
- **Improved error handling** and debugging
- **Better test execution** with proper environment passing

**Usage:**
```bash
# With current environment variables
./scripts/cleanup_redeploy.sh

# With specific IP address
./scripts/cleanup_redeploy.sh --ip 54.224.133.45
```

### `test_system.py`
System health and functionality tests.

### `test_geogpt_api.py`
Comprehensive API testing suite.

## 🔧 Environment Variables

### Required Variables
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `GEOGPT_PUBLIC_IP` - EC2 instance public IP (default: 54.224.133.45)

### Optional Variables
- `LLM_PROVIDER` - LLM provider to use (default: auto)
- `LLM_MODEL` - LLM model name (default: gpt-4o-mini)
- `CONTEXT_WINDOW_SIZE` - Context window size (default: 8192)
- `MAX_CONVERSATION_HISTORY` - Max conversation history (default: 50)

## 🛠️ Troubleshooting

### Environment Variable Issues

**Problem:** Environment variables not persistent
```bash
# Solution 1: Use integrated setup (recommended)
./scripts/cleanup_redeploy.sh
# Choose "y" when asked about making variables persistent

# Solution 2: Manual setup
echo 'export OPENAI_API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc
```

**Problem:** OpenAI API key validation fails
```bash
# Check current key
echo $OPENAI_API_KEY

# Verify key format (should start with 'sk-' and be long)
echo ${#OPENAI_API_KEY}  # Should be 50+ characters
```

**Problem:** Docker containers can't access environment variables
```bash
# Restart with environment variables
sudo -E docker-compose restart geogpt-rag

# Check container environment
sudo docker exec geogpt-rag-system env | grep OPENAI
```

### Deployment Issues

**Problem:** Tests fail with environment errors
```bash
# Re-run deployment with verbose output
./scripts/cleanup_redeploy.sh

# Check logs
sudo docker-compose logs geogpt-rag | tail -50
```

**Problem:** Services unreachable
```bash
# Check health endpoints
curl http://54.224.133.45:8812/health
curl http://54.224.133.45:8810/health
curl http://54.224.133.45:8811/health
```

## 🔐 Security Notes

- **Never commit** API keys to version control
- Use `setup_env.sh` to securely set up environment variables
- Environment variables are **not stored in Docker images**
- Temporary files are cleaned up automatically

## 📊 System Status

After deployment, verify system status:

```bash
# Health check
curl http://54.224.133.45:8812/health

# Configuration
curl http://54.224.133.45:8812/config

# Test chat
curl -X POST http://54.224.133.45:8812/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello GeoGPT","include_thinking":false}'
```

## 🔄 Updates

The deployment script automatically:
- ✅ Pulls latest code from GitHub
- ✅ Validates environment variables
- ✅ Rebuilds Docker images
- ✅ Runs comprehensive tests
- ✅ Provides detailed status reports

---

**💡 Tip:** Just run `./scripts/cleanup_redeploy.sh` - it includes interactive environment setup for the smoothest deployment experience. 