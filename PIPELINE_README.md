# GeoGPT Pipeline and API Documentation

## System Overview

GeoGPT-RAG is a complete Retrieval-Augmented Generation system designed for geospatial analysis and GIS workflows. The system combines specialized geospatial knowledge bases with real-time web search and secure code execution capabilities.

## Architecture

The system consists of three main services running in Docker containers:

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
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Zilliz Cloud   │  │  AWS Sagemaker  │  │  Web APIs       │ │
│  │  Vector DB      │  │  GeoGPT LLM     │  │  DuckDuckGo     │ │
│  │  HNSW Index     │  │  Endpoint       │  │  Wikipedia      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Embedding Service (Port 8810)
- **Model**: GeoEmbedding (7B parameters)
- **Base**: Mistral-7B-Instruct-v0.1
- **Purpose**: Converts text to high-dimensional vectors for similarity search
- **Specialization**: Fine-tuned on geospatial and GIS content

**API Endpoint**: `POST /query`
```json
{
  "queries": ["What causes earthquakes?"],
  "instruction": "Given a web search query, retrieve relevant passages"
}
```

### 2. Reranking Service (Port 8811)  
- **Model**: GeoReranker (568M parameters)
- **Base**: BGE-M3
- **Purpose**: Re-ranks retrieved documents by relevance
- **Output**: Normalized relevance scores (0-1 range)

**API Endpoint**: `POST /query`
```json
{
  "qp_pairs": [
    ["What causes earthquakes?", "Earthquakes are caused by tectonic plates"],
    ["What causes earthquakes?", "Mountains are formed by geological processes"]
  ]
}
```

### 3. GeoGPT API Service (Port 8812)
- **Framework**: FastAPI
- **Purpose**: Main orchestration service
- **Features**: RAG, chat, discovery, code execution
- **Integration**: Connects all components together

## Pipeline Workflows

### RAG (Retrieval-Augmented Generation) Flow

```
1. User Query
   ↓
2. Query Processing
   ├─ Text preprocessing
   ├─ Query expansion (optional)
   └─ Context analysis
   ↓
3. Embedding Generation
   ├─ Send to Embedding Service (8810)
   └─ Receive query vector
   ↓
4. Vector Search
   ├─ Query Zilliz vector database
   ├─ HNSW similarity search
   └─ Retrieve top-k candidates (128)
   ↓
5. Reranking
   ├─ Send query-passage pairs to Reranking Service (8811)
   ├─ Calculate relevance scores
   └─ Select top-n passages (3-5)
   ↓
6. Context Assembly
   ├─ Combine retrieved passages
   ├─ Add metadata and sources
   └─ Manage context length
   ↓
7. LLM Generation
   ├─ Send to AWS Sagemaker GeoGPT endpoint
   ├─ Generate response with sources
   └─ Return final answer
```

### Deep Discovery Research Flow

```
1. Discovery Request
   ↓
2. Query Analysis & Planning
   ├─ Extract key concepts
   ├─ Identify research areas
   └─ Plan investigation steps
   ↓
3. Knowledge Base Search
   ├─ Run RAG queries for each concept
   ├─ Collect relevant documents
   └─ Score and filter results
   ↓
4. Web Intelligence Gathering
   ├─ DuckDuckGo search
   ├─ Wikipedia lookup
   ├─ Content extraction
   └─ Relevance assessment
   ↓
5. Cross-Reference Analysis
   ├─ Compare sources
   ├─ Identify patterns
   └─ Validate information
   ↓
6. Synthesis & Report Generation
   ├─ Combine all findings
   ├─ Generate comprehensive report
   └─ Cite all sources
```

## API Endpoints

### Health Check
**GET** `/health`

Returns system status and service availability.

```json
{
  "status": "online",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "embedding": "online",
    "reranking": "online",
    "rag_system": "online",
    "llm": "online"
  },
  "version": "1.0.0"
}
```

### Chat Interface
**POST** `/chat`

Advanced chat with full RAG integration.

**Request Parameters:**
- `message` (string): User query
- `include_thinking` (bool): Include reasoning process
- `include_sources` (bool): Include source citations
- `use_web_search` (bool): Enable web search enhancement
- `max_context_length` (int): Maximum context tokens
- `context_files` (array): Additional context files

**Response:**
```json
{
  "response": "Generated response text",
  "thinking": "Step-by-step reasoning process",
  "sources": [
    {
      "type": "knowledge_base",
      "filename": "document.pdf",
      "relevance_score": 0.92,
      "excerpt": "Relevant text snippet",
      "page_number": 15,
      "section": "Section name"
    }
  ],
  "processing_time": 2.34,
  "tokens": {
    "input": 1250,
    "output": 850,
    "total": 2100
  }
}
```

### Deep Discovery
**POST** `/discovery/start`

Start comprehensive research process.

**Request:**
```json
{
  "query": "Research topic",
  "max_steps": 5,
  "include_web_search": true,
  "include_knowledge_base": true
}
```

**GET** `/discovery/{discovery_id}`

Monitor discovery progress.

**Discovery Steps:**
1. **Query Analysis & Planning**: Extract concepts and plan research
2. **Knowledge Base Search**: Search internal documents
3. **Web Intelligence Gathering**: Real-time web search
4. **Cross-Reference Analysis**: Compare and validate sources
5. **Synthesis & Report Generation**: Create final report

### Code Execution
**POST** `/code/execute`

Secure sandboxed code execution.

**Request:**
```json
{
  "code": "print('Hello, GeoGPT!')",
  "language": "python",
  "timeout": 30,
  "allow_network": false
}
```

**GET** `/code/execution/{execution_id}`

Monitor execution status and results.

## Vector Database Integration

### Zilliz Cloud Configuration
- **URI**: `https://in03-0beed7b5287844d.serverless.gcp-us-west1.cloud.zilliz.com`
- **Collection**: `GeoGPT_Knowledge_Base`
- **Index Type**: HNSW (Hierarchical Navigable Small World)
- **Similarity Metric**: COSINE
- **Vector Dimension**: 4096 (from GeoEmbedding model)

### Document Processing
1. **Text Segmentation**: Split documents into 512-token chunks
2. **Embedding Generation**: Convert chunks to vectors using GeoEmbedding
3. **Metadata Storage**: Store filename, page numbers, sections
4. **Vector Indexing**: HNSW index for fast similarity search

## LLM Integration

### AWS Sagemaker Configuration
- **Endpoint**: `GeoGPT-R1-Sagemaker-Endpoint`
- **Region**: `us-east-1`
- **Authentication**: IAM Role (GeoGPT-Custom-Role-EC2)
- **Model**: GeoGPT (specialized for geospatial content)

### Generation Parameters
```python
{
  "temperature": 0.7,
  "top_p": 0.95,
  "max_tokens": 2048,
  "stop_sequences": ["Human:", "Assistant:"]
}
```

## Web Search Integration

### DuckDuckGo Search
- **Library**: `duckduckgo-search`
- **Features**: Real-time web search with content extraction
- **Rate Limiting**: Prevents API abuse
- **Content Processing**: HTML parsing with BeautifulSoup

### Wikipedia Integration
- **Library**: `wikipedia`
- **Features**: Authoritative encyclopedia content
- **Search Types**: Page content, summaries, related topics
- **Disambiguation**: Automatic handling of ambiguous terms

## Security Features

### Code Execution Sandbox
- **Isolation**: Temporary directory sandboxing
- **Process Control**: `subprocess.run()` with timeout
- **Resource Limits**: Memory and execution time constraints
- **Network Restriction**: No network access in sandbox
- **File System**: Isolated working directory

### API Security
- **Input Validation**: Pydantic models for request validation
- **Rate Limiting**: Prevents abuse and overload
- **Error Handling**: Secure error messages
- **CORS Configuration**: Configurable cross-origin policies

## Configuration

### Key Settings (`config.py`)
```python
# Service URLs
EMBEDDING_SERVER = "http://localhost:8810"
RERANKING_SERVER = "http://localhost:8811"

# Vector Database
CONNECTION_ARGS = {
    'uri': 'https://in03-0beed7b5287844d.serverless.gcp-us-west1.cloud.zilliz.com',
    'token': 'your-token-here'
}

# RAG Parameters
VEC_RECALL_NUM = 128  # Initial retrieval count
TOP_K = 3             # Final selection count
SCORE_THRESHOLD = 1.5 # Minimum relevance score
EXPAND_LEN = 1000     # Context expansion length

# LLM Configuration
LLM_URL = "https://runtime.sagemaker.us-east-1.amazonaws.com/endpoints/GeoGPT-R1-Sagemaker-Endpoint/invocations"
AWS_REGION = "us-east-1"
```

## Performance Optimizations

### Async Processing
- **FastAPI**: Async endpoints for concurrent requests
- **Background Tasks**: Long-running operations in background
- **Resource Management**: Efficient memory and GPU usage

### Caching Strategies
- **Vector Cache**: Cache frequent embeddings
- **Result Cache**: Cache recent query results
- **Model Cache**: Keep models loaded in memory

### Batch Processing
- **Embedding Batching**: Process multiple queries together
- **Reranking Batching**: Batch relevance scoring
- **Token Management**: Efficient context handling

## Monitoring and Logging

### Health Monitoring
- **Service Health**: Monitor all three services
- **Database Health**: Check vector database connectivity
- **LLM Health**: Monitor Sagemaker endpoint status

### Logging System
- **Location**: `/app/logs/geogpt_api.log`
- **Format**: Structured JSON with timestamps
- **Levels**: INFO, WARNING, ERROR
- **Content**: Request tracking, performance metrics, errors

### Performance Metrics
- **Response Times**: Track endpoint performance
- **Token Usage**: Monitor LLM consumption
- **Error Rates**: Track failure patterns
- **Resource Usage**: Memory and GPU utilization

## Testing and Validation

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: Full workflow validation
- **Performance Tests**: Load and stress testing
- **Security Tests**: Sandbox and input validation

### Test Commands
```bash
# Run comprehensive test suite
python scripts/test_geogpt_api.py

# Test individual services
curl http://localhost:8810/health  # Embedding
curl http://localhost:8811/health  # Reranking
curl http://localhost:8812/health  # Main API
```

## Dependencies

### Core Libraries
```txt
fastapi==0.104.1           # API framework
uvicorn==0.24.0           # ASGI server
pydantic==2.5.2           # Data validation
requests==2.31.0          # HTTP client
```

### ML/AI Libraries
```txt
sentence-transformers     # Embedding models
torch                     # PyTorch backend
transformers             # Hugging Face transformers
FlagEmbedding           # Reranking models
```

### Vector Database
```txt
pymilvus                # Milvus/Zilliz client
```

### Web Search
```txt
duckduckgo-search==6.1.12  # Web search
beautifulsoup4==4.12.3     # HTML parsing
wikipedia==1.4.0           # Wikipedia API
```

### Utilities
```txt
docker==7.0.0             # Container management
tiktoken==0.5.0           # Token counting
boto3                     # AWS SDK
```

## Scaling Considerations

### Horizontal Scaling
- **Load Balancing**: Multiple API instances
- **Service Discovery**: Container orchestration
- **Database Clustering**: Distributed vector storage

### Vertical Scaling
- **GPU Scaling**: Larger GPU instances
- **Memory Optimization**: Efficient model loading
- **CPU Optimization**: Multi-threaded processing

### Cost Optimization
- **Model Efficiency**: Optimized inference
- **Token Management**: Efficient context usage
- **Resource Scheduling**: Dynamic scaling

## Troubleshooting

### Common Issues
1. **Service Unavailable**: Check Docker containers and health endpoints
2. **Slow Responses**: Monitor GPU memory and model loading
3. **Connection Errors**: Verify network connectivity and credentials
4. **Memory Issues**: Check available GPU/CPU memory

### Debug Commands
```bash
# Check service logs
docker-compose logs -f geogpt-rag

# Monitor system resources
nvidia-smi              # GPU usage
docker stats           # Container resources

# Test individual components
python -c "from rag_server.geo_kb import KBDocQA; kb = KBDocQA()"
```

## API Usage Examples

### Python Client
```python
import requests

# Chat example
response = requests.post("http://localhost:8812/chat", json={
    "message": "What is remote sensing?",
    "include_thinking": True,
    "include_sources": True
})

result = response.json()
print(result["response"])
```

### Curl Examples
```bash
# Health check
curl http://localhost:8812/health

# Chat request
curl -X POST "http://localhost:8812/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Explain GIS coordinate systems"}'

# Start discovery
curl -X POST "http://localhost:8812/discovery/start" \
  -H "Content-Type: application/json" \
  -d '{"query": "Climate change impacts", "max_steps": 5}'
```

This pipeline provides a complete RAG system specifically designed for geospatial and GIS applications, with real-time capabilities and production-ready features. 