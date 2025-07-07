# GeoGPT-RAG: Geospatial Retrieval-Augmented Generation System

## Overview

GeoGPT-RAG is a complete Retrieval-Augmented Generation system designed for geospatial analysis and GIS workflows. It combines specialized geospatial knowledge bases with real-time web search and secure code execution, all powered by custom-trained models specifically for geoscience applications.

## Key Features

🌍 **Geospatial Specialization**: Custom models trained on geoscience and GIS content
🔍 **Advanced RAG**: Semantic search with vector embeddings and intelligent reranking  
🌐 **Real-time Web Search**: Live DuckDuckGo and Wikipedia integration
🔒 **Secure Code Execution**: Sandboxed Python code execution environment
🧠 **Deep Discovery**: Multi-step research processes with source synthesis
💬 **Intelligent Chat**: Context-aware conversations with source citations
🐳 **Production Ready**: Complete Docker deployment with health monitoring

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GeoGPT-RAG System                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Embedding      │  │  Reranking      │  │  GeoGPT API     │ │
│  │  Service        │  │  Service        │  │  Service        │ │
│  │  Port 8810      │  │  Port 8811      │  │  Port 8812      │ │
│  │  GeoEmbedding   │  │  GeoReranker    │  │  RAG + Chat     │ │
│  │  (7B params)    │  │  (568M params)  │  │  + Web Search   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                       External Services                        │
├─────────────────────────────────────────────────────────────────┤
│  │  Zilliz Cloud   │  │  AWS Sagemaker  │  │  Web APIs       │ │
│  │  Vector DB      │  │  GeoGPT LLM     │  │  DuckDuckGo     │ │
│  │  HNSW Index     │  │  Endpoint       │  │  Wikipedia      │ │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 🚀 Deploy the Complete System
```bash
# Connect to EC2 instance
ssh -i geogpt-ec2.pem ubuntu@3.234.222.18

# Navigate to project and deploy
cd ~/geogpt-rag
./scripts/cleanup_redeploy.sh
```

### 🔍 Test the API
```bash
# Health check
curl http://localhost:8812/health

# Chat request
curl -X POST "http://localhost:8812/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is remote sensing?"}'
```

### 🌐 Frontend Integration
```javascript
// Basic chat integration
const response = await fetch('http://3.234.222.18:8812/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explain GIS coordinate systems",
    include_thinking: true,
    include_sources: true
  })
});

const result = await response.json();
console.log(result.response);
```

## Core Models

### 🔗 Model Downloads

| **Model** | **Params** | **Purpose** | **Hugging Face** | **ModelScope** |
|-----------|------------|-------------|------------------|----------------|
| GeoEmbedding | 7B | Text-to-vector conversion | [🤗 HF](https://huggingface.co/GeoGPT-Research-Project/GeoEmbedding) | [🤖 MS](https://modelscope.cn/models/GeoGPT/GeoEmbedding) |
| GeoReranker | 568M | Relevance scoring | [🤗 HF](https://huggingface.co/GeoGPT-Research-Project/GeoReranker) | [🤖 MS](https://modelscope.cn/models/GeoGPT/GeoReranker) |

### 🧠 Model Specializations
- **GeoEmbedding**: Fine-tuned Mistral-7B for geospatial content vectorization
- **GeoReranker**: Enhanced BGE-M3 for geoscience relevance scoring
- **Base Models**: Built on proven architectures with domain-specific training

## API Capabilities

### 💬 Advanced Chat
- **RAG Integration**: Knowledge base search with source citations
- **Web Enhancement**: Real-time search integration  
- **Thinking Process**: Transparent reasoning chains
- **Context Management**: Intelligent token usage optimization

### 🔍 Deep Discovery Research
- **Multi-step Analysis**: Comprehensive research workflows
- **Source Integration**: KB + Web + Wikipedia synthesis
- **Progress Tracking**: Real-time status monitoring
- **Report Generation**: Structured findings with citations

### ⚡ Code Execution
- **Sandboxed Environment**: Secure Python execution
- **Resource Control**: Timeout and memory limits
- **Output Capture**: Full stdout/stderr handling
- **Error Management**: Comprehensive error reporting

### 📊 System Monitoring
- **Health Checks**: All service status monitoring
- **Performance Metrics**: Response time and token tracking
- **Comprehensive Logging**: Structured JSON logs
- **Test Coverage**: 13 automated test cases

## Documentation

### 📖 Detailed Guides

1. **[DEPLOYMENT_README.md](DEPLOYMENT_README.md)** - Complete deployment guide
   - Single-script deployment process
   - Health monitoring and troubleshooting
   - Production configuration and scaling

2. **[PIPELINE_README.md](PIPELINE_README.md)** - API and pipeline documentation
   - System architecture and workflows
   - Endpoint specifications and examples
   - Configuration and performance optimization

3. **[FRONTEND_README.md](FRONTEND_README.md)** - Frontend integration guide
   - JavaScript/React/Vue.js examples
   - Error handling and performance optimization
   - Real-time monitoring and caching strategies

## Technology Stack

### 🏗️ Core Framework
- **FastAPI**: High-performance async API framework
- **Docker**: Containerized deployment with health checks
- **CUDA**: GPU acceleration for model inference

### 🤖 AI/ML Stack
- **PyTorch**: Deep learning framework
- **Sentence Transformers**: Embedding model serving
- **Transformers**: Hugging Face model integration
- **FlagEmbedding**: Reranking model implementation

### 🗄️ Data Infrastructure
- **Zilliz Cloud**: Managed vector database (Milvus)
- **HNSW Indexing**: Efficient similarity search
- **AWS Sagemaker**: LLM model serving

### 🌐 Web Integration
- **DuckDuckGo Search**: Real-time web search
- **Wikipedia API**: Authoritative content access
- **BeautifulSoup**: HTML content extraction

## Production Deployment

### 🏭 Current Production Setup
- **Instance**: AWS EC2 g5.xlarge (i-01089964a2f322781)
- **IP Address**: 3.234.222.18
- **Services**: 
  - Embedding Service: Port 8810
  - Reranking Service: Port 8811  
  - GeoGPT API: Port 8812
- **External**: Zilliz Cloud + AWS Sagemaker integration

### 🔧 Deployment Process
```bash
# Single command deployment
./scripts/cleanup_redeploy.sh
```
This script handles:
- ✅ Complete system cleanup and rebuild
- ✅ Health verification across all services
- ✅ Comprehensive testing (13 test cases)
- ✅ Status reporting and monitoring setup

### 🛡️ Security Features
- **Input Validation**: Pydantic request validation
- **Sandboxed Execution**: Isolated code execution environment
- **Rate Limiting**: API abuse prevention
- **Error Handling**: Secure error message handling

## Performance

### ⚡ Response Times
- **Simple Chat**: 2-5 seconds
- **Complex RAG**: 5-15 seconds
- **Discovery Process**: 60-180 seconds
- **Code Execution**: 1-30 seconds

### 🎯 Optimization Features
- **Async Processing**: Concurrent request handling
- **Vector Caching**: Frequent embedding reuse
- **Batch Operations**: Efficient model utilization
- **Context Management**: Smart token optimization

## Testing and Validation

### 🧪 Comprehensive Test Suite
**13 Total Tests** covering:
- ✅ **Functional**: Health, chat, discovery, code execution
- ✅ **Integration**: Full workflow validation
- ✅ **Security**: Sandbox validation and input testing
- ✅ **Implementation**: Mock data detection and best practices

### 🔍 Test Execution
```bash
# Run all tests
python scripts/test_geogpt_api.py

# Individual service tests
curl http://localhost:8810/health  # Embedding
curl http://localhost:8811/health  # Reranking
curl http://localhost:8812/health  # Main API
```

## Contributing and Support

### 🚀 Getting Started
1. **Deploy**: Follow [DEPLOYMENT_README.md](DEPLOYMENT_README.md)
2. **Develop**: Use [PIPELINE_README.md](PIPELINE_README.md) for API details
3. **Integrate**: Reference [FRONTEND_README.md](FRONTEND_README.md) for frontend work

### 🐛 Troubleshooting
1. Check service health endpoints
2. Review Docker container logs
3. Run comprehensive test suite
4. Verify external service connectivity

### 📧 Support
- **Health Issues**: Check deployment logs and service status
- **API Questions**: Reference pipeline documentation
- **Frontend Integration**: Follow frontend integration guide

## License and Attribution

This project builds upon and enhances the original GeoGPT research with specialized RAG capabilities for geospatial applications. 

**Original GeoGPT Project**: [GitHub Repository](https://github.com/GeoGPT-Research-Project/GeoGPT)

---

**🎯 Ready to Deploy?** Start with [DEPLOYMENT_README.md](DEPLOYMENT_README.md) for complete setup instructions.

**🔧 Need API Details?** Check [PIPELINE_README.md](PIPELINE_README.md) for comprehensive technical documentation.

**🌐 Building a Frontend?** Follow [FRONTEND_README.md](FRONTEND_README.md) for integration examples and best practices.
