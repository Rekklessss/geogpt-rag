# 🧪 GeoGPT-RAG Testing Guide

This guide explains how to use the updated test scripts to verify your GeoGPT-RAG system is working correctly with the current environment-based configuration.

## 📋 Overview

The testing suite has been **completely updated** to work with:
- ✅ **Environment variable configuration** (no hardcoded IPs)
- ✅ **New OpenAI API key and cost-optimized models**
- ✅ **Updated LLM provider system**
- ✅ **Current service architecture** (single container, multiple ports)

## 🔧 Prerequisites

### 1. Environment Setup
Before running tests, ensure your environment variables are properly set:

```bash
# Required environment variables
export EC2_INSTANCE_IP="your.ec2.ip.address"
export OPENAI_API_KEY="your-openai-api-key-here"

# Optional (will use defaults if not set)
export LLM_PROVIDER="auto"
export LLM_MODEL="gpt-4o-mini"
export EMBEDDING_PORT="8810"
export RERANKING_PORT="8811"
export MAIN_API_PORT="8812"
```

### 2. System Running
Ensure your GeoGPT-RAG system is running:

```bash
# If running on EC2
cd ~/geogpt-rag
docker-compose up -d

# Check services are healthy
docker-compose logs -f
```

## 🧪 Test Scripts

### 1. Basic System Test (`test_system.py`)

**Purpose**: Tests core functionality of all services
**Runtime**: ~2-3 minutes

```bash
# Run basic system tests
cd ~/geogpt-rag
python3 scripts/test_system.py
```

**What it tests**:
- ✅ Environment configuration
- ✅ Embedding service (Port 8810)
- ✅ Reranking service (Port 8811) 
- ✅ Main API service (Port 8812)
- ✅ RAG pipeline with new LLM providers
- ✅ Document ingestion and retrieval

**Expected Output**:
```
=== GeoGPT-RAG System Tests (Updated for Current Workflow) ===
🔧 Current Configuration:
  Embedding Service: http://your-ip:8810
  Reranking Service: http://your-ip:8811
  Main API Service: http://your-ip:8812
  OpenAI API Key: ✓ Set

============================================================
Running: Environment Configuration
============================================================
✅ Instance configuration loaded
  EC2 Instance IP: your-ip
  ...

🏆 Overall Score: 6/6 tests passed (100.0%)
🎉 All tests passed! GeoGPT-RAG system is working correctly.
```

### 2. Comprehensive API Test (`test_geogpt_api.py`)

**Purpose**: Comprehensive testing of all API endpoints and integrations
**Runtime**: ~8-10 minutes

```bash
# Run comprehensive API tests
cd ~/geogpt-rag
python3 scripts/test_geogpt_api.py
```

**What it tests**:
- ✅ Environment configuration validation
- ✅ Service health checks
- ✅ Basic chat functionality
- ✅ **Cost optimization** (ensures cheap models used)
- ✅ Chat with web search
- ✅ Deep discovery workflows
- ✅ Secure code execution
- ✅ LLM provider system
- ✅ Dependencies verification

**Expected Output**:
```
🚀 Starting comprehensive GeoGPT API test suite
Updated for environment-based configuration and cost optimization

🔧 Current Configuration:
   EC2 Instance IP: your-ip
   LLM Provider: auto
   LLM Model: gpt-4o-mini
   OpenAI Key Set: True

======================================================================
🧪 Environment Configuration
======================================================================
✅ Configuration loaded:
   EC2 Instance IP: your-ip
   LLM Provider: auto
   LLM Model: gpt-4o-mini
✅ Environment Configuration: PASSED

💰 Testing cost optimization...
✅ Cost optimization test completed
   LLM Provider: openai
   LLM Model: gpt-4o-mini
   Total tokens: 150
✅ Using cost-optimized model

Overall Score: 10/10 tests passed (100.0%)
🎉 ALL TESTS PASSED!
✅ Environment-based configuration working
✅ Cost optimization implemented
✅ All integrations are real and verified
```

## 🔍 Test Results Interpretation

### ✅ All Tests Passing
If all tests pass, your system is fully functional:
- Services are healthy and responding
- Environment configuration is correct
- Cost optimization is working
- No mock data is being used
- All integrations are real

### ⚠️ Some Tests Failing

#### Common Issues and Solutions:

**1. Environment Configuration Failed**
```
❌ Environment Configuration: FAILED
✗ Missing required environment variable: OPENAI_API_KEY
```
**Solution**: Set your OpenAI API key
```bash
export OPENAI_API_KEY="your-key-here"
echo 'export OPENAI_API_KEY="your-key-here"' >> ~/.bashrc
```

**2. Service Health Failed**
```
❌ Service Health: FAILED
❌ Embedding Service: Connection failed
```
**Solution**: Check if services are running
```bash
docker-compose ps
docker-compose logs embedding-service
```

**3. Cost Optimization Warning**
```
⚠️ Model 'gpt-4' may not be cost-optimized
```
**Solution**: Update your LLM model configuration
```bash
export LLM_MODEL="gpt-4o-mini"
```

**4. Web Search Failed**
```
❌ Chat with Web Search: FAILED
```
**Solution**: Check internet connectivity and API limits

## 📊 Performance Benchmarks

### Expected Performance (Single Container):
- **Embedding Service**: ~124ms per query
- **Reranking Service**: ~89ms per batch
- **Chat Response**: 2-5 seconds
- **Web Search Chat**: 5-15 seconds
- **Deep Discovery**: 1-3 minutes per step

### Cost Optimization Targets:
- **GPT-4o-mini**: $0.15/$0.60 per 1M tokens
- **GPT-4.1-nano**: $0.10/$0.40 per 1M tokens (if available)
- **Target Savings**: 80-95% vs premium models

## 🚨 Troubleshooting

### Quick Health Check
```bash
# Check all services quickly
curl http://your-ip:8810/health  # Embedding
curl http://your-ip:8811/health  # Reranking
curl http://your-ip:8812/health  # Main API
```

### Debug Mode
```bash
# Run tests with verbose output
python3 scripts/test_system.py 2>&1 | tee test_results.log

# Check specific service logs
docker-compose logs embedding-service
docker-compose logs reranking-service
docker-compose logs geogpt-rag-system
```

### Service Restart
```bash
# If services are unhealthy
cd ~/geogpt-rag
docker-compose down
docker-compose up -d

# Wait for services to start
sleep 60

# Run tests again
python3 scripts/test_system.py
```

## 🔄 Running Tests in CI/CD

### Automated Testing Script
```bash
#!/bin/bash
# automated_test.sh

set -e

echo "🚀 Starting automated GeoGPT-RAG testing..."

# Set environment
export EC2_INSTANCE_IP=$(curl -s ifconfig.me)
export OPENAI_API_KEY="$OPENAI_API_KEY"

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 60

# Run basic tests
echo "🧪 Running basic system tests..."
python3 scripts/test_system.py

# Run comprehensive tests
echo "🔍 Running comprehensive API tests..."
python3 scripts/test_geogpt_api.py

echo "✅ All tests completed successfully!"
```

## 📈 Test Coverage

### What IS Tested:
- ✅ All service endpoints and health
- ✅ Environment variable configuration
- ✅ RAG pipeline end-to-end
- ✅ Web search integration
- ✅ Code execution sandbox
- ✅ Cost optimization
- ✅ Real data (no mocks)
- ✅ LLM provider switching
- ✅ Deep discovery workflows

### What is NOT Tested:
- 🔄 Load testing / stress testing
- 🔄 Security penetration testing
- 🔄 Frontend UI testing
- 🔄 Long-running stability
- 🔄 GPU memory optimization

## 📝 Adding New Tests

### Example: Adding a Custom Test
```python
def test_custom_functionality():
    """Test your custom functionality"""
    print("\n🔧 Testing custom functionality...")
    
    try:
        # Your test logic here
        urls = get_service_urls()
        response = requests.get(f"{urls['main_api']}/your-endpoint")
        
        if response.status_code == 200:
            print("✅ Custom test passed")
            return True
        else:
            print(f"❌ Custom test failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Custom test error: {e}")
        return False

# Add to test list in main()
tests = [
    ("Environment Configuration", test_environment_configuration),
    ("Custom Functionality", test_custom_functionality),  # Add here
    # ... other tests
]
```

## 🎯 Best Practices

1. **Always test environment variables first** before running other tests
2. **Run basic tests before comprehensive tests** to catch issues early  
3. **Check logs** if any test fails to understand the root cause
4. **Test after every deployment** to ensure nothing broke
5. **Monitor cost optimization** to ensure you're using cheap models
6. **Set timeouts appropriately** for your network conditions

## 🔗 Related Documentation

- [DEPLOYMENT_INSTRUCTIONS.md](../DEPLOYMENT_INSTRUCTIONS.md) - How to deploy the system
- [TECHNICAL_README.md](../TECHNICAL_README.md) - Technical architecture details
- [USER_GUIDE.md](../USER_GUIDE.md) - User-facing functionality guide

---

## 📞 Support

If tests consistently fail:

1. **Check the logs**: `docker-compose logs -f`
2. **Verify environment**: Ensure all required variables are set
3. **Check connectivity**: Ensure services can reach each other
4. **Review configuration**: Compare with working deployment
5. **Restart services**: Sometimes a fresh start helps

**Remember**: These tests verify your system is working correctly with NO MOCK DATA and real integrations! 🎉 