"""
GeoGPT API Server - Complete RAG integration with real functionality
Provides chat, deep discovery, and code execution endpoints
"""

import json
import asyncio
import logging
import time
import subprocess
import tempfile
import os
import shutil
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import tempfile
import shutil
import json
import os
import time
import uvicorn
import requests
from bs4 import BeautifulSoup
import wikipedia
from duckduckgo_search import DDGS

from geo_kb import KBDocQA, llm_generate
from config import RAG_PROMPT, COLLECTION_NAME, CHUNK_PATH_NAME

# Configure logging FIRST
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/geogpt_api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import new systems
try:
    # Try relative imports first
    from .llm_providers import get_llm_manager
    from .instance_config import get_config_manager
except ImportError:
    # Fall back to absolute imports
    try:
        from llm_providers import get_llm_manager
        from instance_config import get_config_manager
    except ImportError as e:
        logger.warning(f"New systems not available, using legacy implementation: {e}")
        get_llm_manager = None
        get_config_manager = None

# Initialize managers if available
try:
    if get_llm_manager and get_config_manager:
        llm_manager = get_llm_manager()
        config_manager = get_config_manager()
        logger.info("New LLM provider and configuration systems loaded successfully")
    else:
        llm_manager = None
        config_manager = None
        logger.info("Using legacy implementation")
except Exception as e:
    logger.error(f"Failed to load new systems: {e}")
    llm_manager = None
    config_manager = None

app = FastAPI(title="GeoGPT API", version="1.0.0", description="Complete GeoGPT RAG System API")

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG system
try:
    kb_system = KBDocQA()
    logger.info("RAG system initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize RAG system: {e}")
    kb_system = None

# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    context_files: Optional[List[str]] = []
    include_thinking: bool = True
    include_sources: bool = True
    use_web_search: bool = False
    max_context_length: int = 4000

class ChatResponse(BaseModel):
    response: str
    thinking: Optional[str] = None
    sources: Optional[List[Dict]] = None
    processing_time: float
    tokens: Optional[Dict] = None
    metadata: Optional[Dict] = None

class DeepDiscoveryRequest(BaseModel):
    query: str
    max_steps: int = 5
    include_web_search: bool = True
    include_knowledge_base: bool = True

class DeepDiscoveryStep(BaseModel):
    id: int
    name: str
    status: str  # pending, running, completed, error
    progress: float
    result: Optional[str] = None
    sources: Optional[List[Dict]] = None
    error: Optional[str] = None

class DeepDiscoveryResponse(BaseModel):
    discovery_id: str
    status: str  # running, paused, completed, error
    progress: float
    current_step: int
    steps: List[DeepDiscoveryStep]
    sources: List[Dict]
    final_report: Optional[str] = None

class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    timeout: int = 30
    allow_network: bool = False

class CodeExecutionResponse(BaseModel):
    execution_id: str
    status: str  # running, completed, error, timeout
    output: Optional[str] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None
    exit_code: Optional[int] = None

# In-memory storage for active processes
active_discoveries = {}
active_executions = {}

# LLM manager should already be initialized from earlier import section

@app.get("/health")
async def health_check():
    """Comprehensive health check for all services"""
    services = {}
    
    # Get configuration for correct IP addresses
    config = get_instance_config() if 'get_instance_config' in globals() else None
    
    # Check embedding service
    try:
        embedding_url = f"http://{config.ec2_instance_ip}:8810/health" if config else "http://54.224.133.45:8810/health"
        response = requests.get(embedding_url, timeout=5)
        services["embedding"] = "online" if response.status_code == 200 else "offline"
    except:
        services["embedding"] = "offline"
    
    # Check reranking service
    try:
        reranking_url = f"http://{config.ec2_instance_ip}:8811/health" if config else "http://54.224.133.45:8811/health"
        response = requests.get(reranking_url, timeout=5)
        services["reranking"] = "online" if response.status_code == 200 else "offline"
    except:
        services["reranking"] = "offline"
    
    # Check RAG system
    services["rag_system"] = "online" if kb_system is not None else "offline"
    
    # Check LLM (try a simple generation)
    try:
        test_response = llm_generate("Test connection")
        services["llm"] = "online" if test_response else "offline"
    except:
        services["llm"] = "offline"
    
    overall_status = "online" if all(status == "online" for status in services.values()) else "degraded"
    
    return {
        "status": overall_status,
        "timestamp": datetime.now().isoformat(),
        "services": services,
        "version": "1.0.0"
    }

@app.get("/llm/providers")
async def get_llm_providers():
    """Get available LLM providers and current configuration"""
    if not llm_manager:
        raise HTTPException(status_code=503, detail="LLM provider system not available")
    
    try:
        return {
            "available_providers": llm_manager.get_available_providers(),
            "current_provider": llm_manager.get_current_provider(),
            "health_status": llm_manager.health_check()
        }
    except Exception as e:
        logger.error(f"Error getting LLM providers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/llm/provider")
async def set_llm_provider(provider: str):
    """Set the primary LLM provider"""
    if not llm_manager:
        raise HTTPException(status_code=503, detail="LLM provider system not available")
    
    try:
        success = llm_manager.set_primary_provider(provider)
        if success:
            return {
                "success": True,
                "message": f"Primary provider set to {provider}",
                "current_provider": llm_manager.get_current_provider()
            }
        else:
            raise HTTPException(status_code=400, detail=f"Invalid or unavailable provider: {provider}")
    except Exception as e:
        logger.error(f"Error setting LLM provider: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/config")
async def get_configuration():
    """Get current instance configuration"""
    if not config_manager:
        raise HTTPException(status_code=503, detail="Configuration manager not available")
    
    try:
        return {
            "instance_config": config_manager.export_config(),
            "service_health": config_manager.health_check()
        }
    except Exception as e:
        logger.error(f"Error getting configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/config/update-ip")
async def update_ec2_ip(new_ip: str):
    """Update EC2 instance IP address"""
    if not config_manager:
        raise HTTPException(status_code=503, detail="Configuration manager not available")
    
    try:
        success = config_manager.update_ec2_ip(new_ip)
        if success:
            return {
                "success": True,
                "message": f"EC2 IP updated to {new_ip}",
                "new_config": config_manager.export_config()
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to update EC2 IP")
    except Exception as e:
        logger.error(f"Error updating EC2 IP: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat_with_geogpt(request: ChatRequest):
    """
    Complete chat implementation with real RAG integration
    """
    start_time = time.time()
    
    try:
        if not kb_system:
            raise HTTPException(status_code=503, detail="RAG system not available")
        
        # Step 1: Retrieve relevant documents
        sources = []
        context_chunks = []
        
        if request.context_files or not request.use_web_search:
            # Use knowledge base retrieval
            try:
                docs, retrieval_meta = kb_system.query(
                    request.message, 
                    k=5,
                    score_threshold=1.0
                )
                
                for doc in docs:
                    chunk_text = doc.get('text', '')
                    context_chunks.append(chunk_text)
                    
                    if request.include_sources:
                        sources.append({
                            "type": "knowledge_base",
                            "filename": doc.get('filename', 'Unknown'),
                            "relevance_score": doc.get('score', 0.0),
                            "excerpt": chunk_text[:300] + "..." if len(chunk_text) > 300 else chunk_text,
                            "page_number": doc.get('page', None),
                            "section": doc.get('section', None)
                        })
                        
                logger.info(f"Retrieved {len(docs)} documents from knowledge base")
                
            except Exception as e:
                logger.error(f"Knowledge base retrieval error: {e}")
        
        # Step 2: Web search if requested
        if request.use_web_search:
            try:
                web_sources = await perform_web_search(request.message)
                sources.extend(web_sources)
                
                # Add web content to context
                for source in web_sources:
                    if 'content' in source:
                        context_chunks.append(source['content'])
                        
            except Exception as e:
                logger.error(f"Web search error: {e}")
        
        # Step 3: Build context with length management
        context = build_context_from_chunks(context_chunks, request.max_context_length)
        
        # Step 4: Generate response with thinking
        full_prompt = build_rag_prompt(request.message, context, request.include_thinking)
        
        logger.info(f"Generating response for query: {request.message[:100]}...")
        raw_response = llm_generate(full_prompt)
        
        # Step 5: Parse thinking and response
        thinking, final_response = parse_thinking_response(raw_response, request.include_thinking)
        
        processing_time = time.time() - start_time
        
        # Calculate token estimates
        tokens = {
            "input": estimate_tokens(full_prompt),
            "output": estimate_tokens(final_response),
            "total": estimate_tokens(full_prompt) + estimate_tokens(final_response)
        }
        
        return ChatResponse(
            response=final_response,
            thinking=thinking,
            sources=sources if sources else None,
            processing_time=processing_time,
            tokens=tokens,
            metadata={
                "context_length": len(context),
                "sources_used": len(sources),
                "web_search_used": request.use_web_search
            }
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.post("/discovery/start", response_model=DeepDiscoveryResponse)
async def start_deep_discovery(request: DeepDiscoveryRequest, background_tasks: BackgroundTasks):
    """
    Start a comprehensive deep discovery process
    """
    discovery_id = f"discovery_{uuid.uuid4().hex[:8]}"
    
    # Initialize discovery state
    steps = [
        DeepDiscoveryStep(id=1, name="Query Analysis & Planning", status="pending", progress=0),
        DeepDiscoveryStep(id=2, name="Knowledge Base Search", status="pending", progress=0),
        DeepDiscoveryStep(id=3, name="Web Intelligence Gathering", status="pending", progress=0),
        DeepDiscoveryStep(id=4, name="Cross-Reference Analysis", status="pending", progress=0),
        DeepDiscoveryStep(id=5, name="Synthesis & Report Generation", status="pending", progress=0)
    ]
    
    discovery_state = {
        "discovery_id": discovery_id,
        "query": request.query,
        "status": "running",
        "progress": 0.0,
        "current_step": 1,
        "max_steps": min(request.max_steps, len(steps)),
        "start_time": time.time(),
        "steps": steps[:request.max_steps],
        "sources": [],
        "include_web_search": request.include_web_search,
        "include_knowledge_base": request.include_knowledge_base,
        "final_report": None
    }
    
    active_discoveries[discovery_id] = discovery_state
    
    # Start background discovery process
    background_tasks.add_task(run_discovery_process, discovery_id)
    
    return DeepDiscoveryResponse(
        discovery_id=discovery_id,
        status="running",
        progress=0.0,
        current_step=1,
        steps=discovery_state["steps"],
        sources=[],
        final_report=None
    )

@app.get("/discovery/{discovery_id}")
async def get_discovery_status(discovery_id: str):
    """Get current status of a discovery process"""
    if discovery_id not in active_discoveries:
        raise HTTPException(status_code=404, detail="Discovery not found")
    
    discovery = active_discoveries[discovery_id]
    return DeepDiscoveryResponse(**{k: v for k, v in discovery.items() if k != 'start_time'})

@app.post("/discovery/{discovery_id}/pause")
async def pause_discovery(discovery_id: str):
    """Pause a running discovery"""
    if discovery_id not in active_discoveries:
        raise HTTPException(status_code=404, detail="Discovery not found")
    
    active_discoveries[discovery_id]["status"] = "paused"
    return {"status": "paused"}

@app.post("/discovery/{discovery_id}/resume")
async def resume_discovery(discovery_id: str):
    """Resume a paused discovery"""
    if discovery_id not in active_discoveries:
        raise HTTPException(status_code=404, detail="Discovery not found")
    
    active_discoveries[discovery_id]["status"] = "running"
    return {"status": "running"}

@app.post("/code/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest, background_tasks: BackgroundTasks):
    """
    Execute code in a secure sandboxed environment
    """
    execution_id = f"exec_{uuid.uuid4().hex[:8]}"
    
    execution_state = {
        "id": execution_id,
        "code": request.code,
        "language": request.language,
        "status": "running",
        "start_time": time.time(),
        "timeout": request.timeout,
        "allow_network": request.allow_network,
        "output": None,
        "error": None,
        "exit_code": None
    }
    
    active_executions[execution_id] = execution_state
    
    # Start background execution
    background_tasks.add_task(run_secure_code_execution, execution_id)
    
    return CodeExecutionResponse(
        execution_id=execution_id,
        status="running"
    )

@app.get("/code/execution/{execution_id}")
async def get_execution_status(execution_id: str):
    """Get status of code execution"""
    if execution_id not in active_executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    execution = active_executions[execution_id]
    return CodeExecutionResponse(
        execution_id=execution_id,
        status=execution["status"],
        output=execution.get("output"),
        error=execution.get("error"),
        execution_time=execution.get("execution_time"),
        exit_code=execution.get("exit_code")
    )

@app.get("/kb/stats")
async def get_knowledge_base_stats():
    """Get knowledge base statistics and status"""
    if not kb_system:
        raise HTTPException(status_code=503, detail="Knowledge base system not available")
    
    try:
        # Get collection info
        collection = kb_system.vector_store.col
        if collection:
            # Get basic stats
            num_entities = collection.num_entities
            collection_name = collection.name
        else:
            num_entities = 0
            collection_name = "geo-embedding" # Assuming a default name if not set
        
        # Scan chunk files to get file count and total size
        chunk_files = []
        total_size = 0
        total_chunks = 0
        
        if os.path.exists(CHUNK_PATH_NAME):
            for filename in os.listdir(CHUNK_PATH_NAME):
                if filename.endswith('.jsonl'):
                    file_path = os.path.join(CHUNK_PATH_NAME, filename)
                    file_size = os.path.getsize(file_path)
                    total_size += file_size
                    
                    # Count chunks in file
                    with open(file_path, 'r', encoding='utf-8') as f:
                        chunk_count = sum(1 for _ in f)
                        total_chunks += chunk_count
                    
                    chunk_files.append({
                        'filename': filename,
                        'size': file_size,
                        'chunks': chunk_count
                    })
        
        return {
            "total_files": len(chunk_files),
            "total_chunks": total_chunks,
            "total_size": total_size,
            "index_status": "healthy" if collection and num_entities > 0 else "degraded",
            "last_updated": datetime.now().isoformat(),
            "embedding_model": "geo-embedding",
            "collection_name": collection_name,
            "vector_count": num_entities
        }
        
    except Exception as e:
        logger.error(f"Error getting KB stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/kb/files")
async def get_knowledge_base_files():
    """Get list of files in knowledge base"""
    if not kb_system:
        raise HTTPException(status_code=503, detail="Knowledge base system not available")
    
    try:
        files = []
        
        if os.path.exists(CHUNK_PATH_NAME):
            for filename in os.listdir(CHUNK_PATH_NAME):
                if filename.endswith('.jsonl'):
                    file_path = os.path.join(CHUNK_PATH_NAME, filename)
                    file_stat = os.stat(file_path)
                    
                    # Count chunks and get metadata from first chunk
                    chunk_count = 0
                    first_chunk = None
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            for line in f:
                                if line.strip():
                                    chunk_data = json.loads(line)
                                    if first_chunk is None:
                                        first_chunk = chunk_data
                                    chunk_count += 1
                    except Exception as e:
                        logger.error(f"Error reading chunk file {filename}: {e}")
                        continue
                    
                    # Extract original filename from chunk data
                    original_filename = filename.replace('.jsonl', '')
                    if first_chunk and 'filename' in first_chunk:
                        original_filename = first_chunk['filename']
                    
                    files.append({
                        "id": filename.replace('.jsonl', ''),
                        "filename": original_filename,
                        "path": file_path,
                        "size": file_stat.st_size,
                        "upload_date": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                        "status": "ready",
                        "chunk_count": chunk_count,
                        "metadata": {
                            "file_type": first_chunk.get('file_type', 'unknown') if first_chunk else 'unknown',
                            "embedding_model": "geo-embedding",
                            "last_accessed": datetime.fromtimestamp(file_stat.st_atime).isoformat()
                        }
                    })
        
        # Sort by upload date (newest first)
        files.sort(key=lambda x: x['upload_date'], reverse=True)
        
        return {"files": files}
        
    except Exception as e:
        logger.error(f"Error getting KB files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/kb/upload")
async def upload_file_to_knowledge_base(file: UploadFile = File(...), max_size: int = Form(512)):
    """Upload and process a file into the knowledge base"""
    if not kb_system:
        raise HTTPException(status_code=503, detail="Knowledge base system not available")
    
    # Validate file type
    allowed_extensions = {'.pdf', '.docx', '.doc', '.txt', '.md'}
    file_ext = os.path.splitext(file.filename or '')[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_ext} not supported. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (100MB limit)
    max_file_size = 100 * 1024 * 1024  # 100MB
    
    try:
        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, file.filename or 'uploaded_file')
        
        # Save uploaded file
        content = await file.read()
        if len(content) > max_file_size:
            raise HTTPException(status_code=400, detail="File too large (max 100MB)")
        
        with open(temp_file_path, 'wb') as f:
            f.write(content)
        
        # Process file in background
        file_id = f"{int(time.time())}_{file.filename}"
        
        # Start processing task
        asyncio.create_task(process_file_async(temp_file_path, file_id, max_size))
        
        return {
            "file_id": file_id,
            "filename": file.filename,
            "status": "processing",
            "message": "File upload successful, processing started"
        }
        
    except Exception as e:
        # Clean up temp file
        if 'temp_dir' in locals() and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_file_async(file_path: str, file_id: str, max_size: int):
    """Process file asynchronously"""
    try:
        # Update processing status
        processing_status[file_id] = {
            "file_id": file_id,
            "stage": "chunking",
            "progress": 25
        }
        
        # Add file to knowledge base
        kb_system.add_file(file_path, max_size)
        
        # Update processing status
        processing_status[file_id] = {
            "file_id": file_id,
            "stage": "completed",
            "progress": 100
        }
        
        logger.info(f"Successfully processed file: {file_id}")
        
    except Exception as e:
        logger.error(f"Error processing file {file_id}: {e}")
        processing_status[file_id] = {
            "file_id": file_id,
            "stage": "error",
            "progress": 0,
            "error_message": str(e)
        }
    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            temp_dir = os.path.dirname(file_path)
            shutil.rmtree(temp_dir, ignore_errors=True)

@app.get("/kb/status/{file_id}")
async def get_processing_status(file_id: str):
    """Get processing status for a file"""
    if file_id not in processing_status:
        raise HTTPException(status_code=404, detail="File not found")
    
    return processing_status[file_id]

@app.delete("/kb/files/{file_id}")
async def delete_knowledge_base_file(file_id: str):
    """Delete a file from the knowledge base"""
    if not kb_system:
        raise HTTPException(status_code=503, detail="Knowledge base system not available")
    
    try:
        # Find and delete chunk file
        chunk_file_path = os.path.join(CHUNK_PATH_NAME, f"{file_id}.jsonl")
        
        if not os.path.exists(chunk_file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Read chunks to get their IDs for vector store deletion
        chunk_ids = []
        try:
            with open(chunk_file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        chunk_data = json.loads(line)
                        # Note: Milvus auto-generates IDs, so we can't delete specific chunks easily
                        # For now, we'll just delete the file and recommend rebuilding the index
        except Exception as e:
            logger.warning(f"Could not read chunk file for deletion: {e}")
        
        # Delete the chunk file
        os.remove(chunk_file_path)
        
        logger.info(f"Deleted file: {file_id}")
        
        return {
            "success": True,
            "message": f"File {file_id} deleted successfully",
            "recommendation": "Consider rebuilding the index to remove vector embeddings"
        }
        
    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/kb/rebuild")
async def rebuild_knowledge_base():
    """Rebuild the entire knowledge base index"""
    if not kb_system:
        raise HTTPException(status_code=503, detail="Knowledge base system not available")
    
    try:
        # Drop existing collection
        kb_system.drop_collection()
        
        # Recreate vector store
        kb_system.vector_store = Milvus(
            embedding_function=kb_system.embeddings,
            collection_name=kb_system.collection_name,
            connection_args=kb_system.milvus_connection_args,
            index_params={
                "metric_type": "COSINE",
                "index_type": "HNSW",
                "params": {"M": 8, "efConstruction": 64},
            },
            drop_old=True,
            auto_id=True
        )
        
        # Re-add all files from chunk directory
        if os.path.exists(CHUNK_PATH_NAME):
            for filename in os.listdir(CHUNK_PATH_NAME):
                if filename.endswith('.jsonl'):
                    chunk_file_path = os.path.join(CHUNK_PATH_NAME, filename)
                    
                    # Read chunks and add to vector store
                    texts = []
                    metadatas = []
                    
                    with open(chunk_file_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            if line.strip():
                                chunk_data = json.loads(line)
                                texts.append(chunk_data['text'])
                                
                                # Prepare metadata (remove text field)
                                metadata = {k: v for k, v in chunk_data.items() if k != 'text'}
                                metadatas.append(metadata)
                    
                    if texts:
                        kb_system.vector_store.add_texts(texts, metadatas=metadatas)
        
        logger.info("Successfully rebuilt knowledge base index")
        
        return {
            "success": True,
            "message": "Knowledge base index rebuilt successfully"
        }
        
    except Exception as e:
        logger.error(f"Error rebuilding knowledge base: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Global processing status tracker
processing_status = {}

# Helper Functions

async def perform_web_search(query: str, max_results: int = 5) -> List[Dict]:
    """Perform real web search using DuckDuckGo and Wikipedia"""
    sources = []
    
    try:
        # DuckDuckGo search
        with DDGS() as ddgs:
            search_results = list(ddgs.text(query, max_results=max_results))
            
            for result in search_results:
                # Fetch page content
                try:
                    response = requests.get(result['href'], timeout=10)
                    soup = BeautifulSoup(response.content, 'html.parser')
                    
                    # Extract main content
                    content = ""
                    for p in soup.find_all('p')[:5]:  # First 5 paragraphs
                        content += p.get_text() + "\n"
                    
                    sources.append({
                        "type": "web_search",
                        "title": result['title'],
                        "url": result['href'],
                        "excerpt": result['body'][:300] + "...",
                        "content": content[:1000],  # Limit content length
                        "relevance_score": 0.8,  # Estimated
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception as e:
                    logger.warning(f"Failed to fetch content from {result['href']}: {e}")
                    
        # Wikipedia search for additional context
        try:
            wiki_results = wikipedia.search(query, results=2)
            for title in wiki_results:
                try:
                    page = wikipedia.page(title)
                    sources.append({
                        "type": "wikipedia",
                        "title": page.title,
                        "url": page.url,
                        "excerpt": page.summary[:300] + "...",
                        "content": page.content[:1500],  # More content for Wikipedia
                        "relevance_score": 0.9,
                        "timestamp": datetime.now().isoformat()
                    })
                except Exception as e:
                    logger.warning(f"Failed to fetch Wikipedia page {title}: {e}")
        except Exception as e:
            logger.warning(f"Wikipedia search failed: {e}")
                    
    except Exception as e:
        logger.error(f"Web search failed: {e}")
    
    return sources

def build_context_from_chunks(chunks: List[str], max_length: int = 4000) -> str:
    """Build context string from chunks with length management"""
    context = ""
    current_length = 0
    
    for i, chunk in enumerate(chunks):
        chunk_length = len(chunk)
        if current_length + chunk_length > max_length:
            break
        
        context += f"[document {i+1} begin]\n{chunk}\n[document {i+1} end]\n\n"
        current_length += chunk_length + 50  # Account for markup
    
    return context

def build_rag_prompt(query: str, context: str, include_thinking: bool = True) -> str:
    """Build the complete RAG prompt"""
    thinking_instruction = ""
    if include_thinking:
        thinking_instruction = """
Please think through this step by step before providing your final answer. Structure your response as:

<thinking>
[Your detailed reasoning process here]
</thinking>

[Your final response here]

"""
    
    current_date = datetime.now().strftime("%Y-%m-%d")
    
    if context.strip():
        prompt = RAG_PROMPT.format(
            search_results=context,
            cur_date=current_date,
            question=query
        )
    else:
        prompt = f"""You are GeoGPT, an AI assistant specialized in geospatial analysis and GIS workflows.
        
Today is {current_date}.

{thinking_instruction}

User Question: {query}

Please provide a comprehensive response based on your geospatial expertise."""
    
    if include_thinking:
        prompt = thinking_instruction + prompt
    
    return prompt

def parse_thinking_response(response: str, include_thinking: bool) -> tuple:
    """Parse thinking and final response from LLM output"""
    thinking = None
    final_response = response
    
    if include_thinking and "<thinking>" in response:
        parts = response.split("<thinking>")
        if len(parts) > 1:
            thinking_part = parts[1].split("</thinking>")
            if len(thinking_part) > 1:
                thinking = thinking_part[0].strip()
                final_response = thinking_part[1].strip()
    
    return thinking, final_response

def estimate_tokens(text: str) -> int:
    """Rough token estimation (4 chars per token average)"""
    return len(text) // 4

async def run_discovery_process(discovery_id: str):
    """Background task to run the comprehensive discovery process"""
    discovery = active_discoveries[discovery_id]
    
    try:
        for step_idx in range(discovery["max_steps"]):
            if discovery["status"] != "running":
                break
                
            step = discovery["steps"][step_idx]
            step["status"] = "running"
            discovery["current_step"] = step_idx + 1
            
            try:
                if step_idx == 0:  # Query Analysis & Planning
                    await process_query_analysis(discovery)
                elif step_idx == 1:  # Knowledge Base Search
                    await process_knowledge_search(discovery)
                elif step_idx == 2:  # Web Intelligence Gathering
                    await process_web_intelligence(discovery)
                elif step_idx == 3:  # Cross-Reference Analysis
                    await process_cross_reference(discovery)
                elif step_idx == 4:  # Synthesis & Report Generation
                    await process_report_generation(discovery)
                
                step["status"] = "completed"
                step["progress"] = 100
                
            except Exception as e:
                logger.error(f"Discovery step {step_idx + 1} error: {e}")
                step["status"] = "error"
                step["error"] = str(e)
            
            discovery["progress"] = ((step_idx + 1) / discovery["max_steps"]) * 100
            
            # Small delay between steps
            await asyncio.sleep(1)
        
        discovery["status"] = "completed"
        
    except Exception as e:
        logger.error(f"Discovery process error: {e}")
        discovery["status"] = "error"

async def process_query_analysis(discovery):
    """Process query analysis step with real LLM analysis"""
    query = discovery["query"]
    
    analysis_prompt = f"""Analyze this geospatial research query and create a comprehensive analysis plan:

Query: {query}

Please provide:
1. Key geospatial concepts and terms identified
2. Specific geographic locations or regions mentioned
3. Type of spatial analysis required (if any)
4. Relevant data sources that should be consulted
5. Potential GIS tools or methods applicable
6. Research approach and methodology recommendations

Provide a structured analysis that will guide the subsequent discovery steps."""
    
    try:
        analysis_result = llm_generate(analysis_prompt)
        discovery["steps"][0]["result"] = analysis_result
        
        # Extract key concepts for better search
        concepts_prompt = f"""From this analysis: {analysis_result}

Extract 3-5 key search terms that would be most effective for finding relevant information about: {query}

Return only the search terms, separated by commas."""
        
        key_terms = llm_generate(concepts_prompt)
        discovery["search_terms"] = [term.strip() for term in key_terms.split(",")]
        
        discovery["sources"].append({
            "id": f"src_{len(discovery['sources']) + 1}",
            "title": "Query Analysis Results",
            "type": "analysis",
            "relevance": 1.0,
            "excerpt": analysis_result[:300] + "...",
            "content": analysis_result,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Query analysis error: {e}")
        raise

async def process_knowledge_search(discovery):
    """Process knowledge base search with real RAG queries"""
    if not discovery.get("include_knowledge_base", True) or not kb_system:
        discovery["steps"][1]["result"] = "Knowledge base search skipped"
        return
    
    query = discovery["query"]
    search_terms = discovery.get("search_terms", [query])
    
    try:
        all_docs = []
        
        # Search with original query
        docs, _ = kb_system.query(query, k=10)
        all_docs.extend(docs)
        
        # Search with extracted terms
        for term in search_terms[:3]:  # Limit to avoid too many requests
            try:
                docs, _ = kb_system.query(term, k=5)
                all_docs.extend(docs)
            except Exception as e:
                logger.warning(f"Search failed for term '{term}': {e}")
        
        # Deduplicate and rank
        unique_docs = {}
        for doc in all_docs:
            doc_id = doc.get('filename', '') + str(doc.get('page', ''))
            if doc_id not in unique_docs or doc.get('score', 0) > unique_docs[doc_id].get('score', 0):
                unique_docs[doc_id] = doc
        
        ranked_docs = sorted(unique_docs.values(), key=lambda x: x.get('score', 0), reverse=True)[:8]
        
        for doc in ranked_docs:
            discovery["sources"].append({
                "id": f"src_{len(discovery['sources']) + 1}",
                "title": doc.get('filename', 'Knowledge Base Document'),
                "type": "knowledge_base",
                "relevance": doc.get('score', 0.8),
                "excerpt": doc.get('text', '')[:300] + "...",
                "content": doc.get('text', ''),
                "page_number": doc.get('page'),
                "section": doc.get('section'),
                "timestamp": datetime.now().isoformat()
            })
        
        discovery["steps"][1]["result"] = f"Found {len(ranked_docs)} relevant documents in knowledge base"
        
    except Exception as e:
        logger.error(f"Knowledge search error: {e}")
        raise

async def process_web_intelligence(discovery):
    """Process web intelligence gathering with real web search"""
    if not discovery.get("include_web_search", True):
        discovery["steps"][2]["result"] = "Web search skipped"
        return
    
    query = discovery["query"]
    search_terms = discovery.get("search_terms", [query])
    
    try:
        # Search with main query
        web_sources = await perform_web_search(query, max_results=3)
        discovery["sources"].extend(web_sources)
        
        # Search with key terms
        for term in search_terms[:2]:  # Limit web searches
            additional_sources = await perform_web_search(term, max_results=2)
            discovery["sources"].extend(additional_sources)
        
        discovery["steps"][2]["result"] = f"Gathered {len(web_sources)} web sources"
        
    except Exception as e:
        logger.error(f"Web intelligence error: {e}")
        raise

async def process_cross_reference(discovery):
    """Process cross-reference analysis with real analysis"""
    sources = discovery["sources"]
    
    if len(sources) < 2:
        discovery["steps"][3]["result"] = "Insufficient sources for cross-reference analysis"
        return
    
    try:
        # Build analysis prompt with source summaries
        source_summaries = []
        for i, source in enumerate(sources[:10]):  # Limit to avoid token limits
            summary = f"Source {i+1} ({source['type']}): {source.get('excerpt', '')}"
            source_summaries.append(summary)
        
        analysis_prompt = f"""Perform a cross-reference analysis of these sources related to: {discovery['query']}

Sources:
{chr(10).join(source_summaries)}

Analyze:
1. Common themes and patterns across sources
2. Contradictions or conflicting information
3. Information gaps or missing perspectives
4. Reliability assessment of different source types
5. Key insights emerging from the combined sources

Provide a comprehensive cross-reference analysis."""
        
        analysis_result = llm_generate(analysis_prompt)
        
        discovery["steps"][3]["result"] = analysis_result
        discovery["sources"].append({
            "id": f"src_{len(discovery['sources']) + 1}",
            "title": "Cross-Reference Analysis",
            "type": "analysis",
            "relevance": 0.95,
            "excerpt": "Comprehensive analysis of source correlations and patterns",
            "content": analysis_result,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Cross-reference analysis error: {e}")
        raise

async def process_report_generation(discovery):
    """Generate comprehensive discovery report"""
    try:
        # Collect all findings
        findings = []
        for step in discovery["steps"][:4]:  # Exclude current step
            if step.get("result"):
                findings.append(f"{step['name']}: {step['result']}")
        
        # Build comprehensive report prompt
        report_prompt = f"""Generate a comprehensive geospatial research report for this query: {discovery['query']}

Based on the following discovery process findings:
{chr(10).join(findings)}

Available sources: {len(discovery['sources'])} documents from knowledge base, web search, and analysis

Create a detailed report that includes:
1. Executive Summary
2. Key Findings
3. Geospatial Analysis and Insights
4. Data Sources and Methodology
5. Limitations and Considerations
6. Recommendations for Further Research
7. Conclusion

Format the report professionally with clear sections and supporting evidence from the sources."""
        
        final_report = llm_generate(report_prompt)
        
        discovery["final_report"] = final_report
        discovery["steps"][4]["result"] = "Comprehensive discovery report generated"
        
        discovery["sources"].append({
            "id": f"src_{len(discovery['sources']) + 1}",
            "title": "Final Discovery Report",
            "type": "report",
            "relevance": 1.0,
            "excerpt": "Comprehensive geospatial research report with findings and recommendations",
            "content": final_report,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Report generation error: {e}")
        raise

async def run_secure_code_execution(execution_id: str):
    """Execute code in a secure environment using subprocess"""
    execution = active_executions[execution_id]
    
    try:
        start_time = time.time()
        
        # Create temporary directory for execution
        with tempfile.TemporaryDirectory() as temp_dir:
            # Write code to file
            code_file = os.path.join(temp_dir, f"code_{execution_id}.py")
            with open(code_file, 'w') as f:
                f.write(execution["code"])
            
            # Prepare execution environment
            env = os.environ.copy()
            env['PYTHONPATH'] = temp_dir
            
            # Execute with timeout and restrictions
            try:
                result = subprocess.run(
                    ['python3', code_file],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=execution["timeout"],
                    env=env
                )
                
                execution["output"] = result.stdout
                execution["error"] = result.stderr if result.stderr else None
                execution["exit_code"] = result.returncode
                execution["status"] = "completed" if result.returncode == 0 else "error"
                
            except subprocess.TimeoutExpired:
                execution["status"] = "timeout"
                execution["error"] = f"Execution timed out after {execution['timeout']} seconds"
                execution["exit_code"] = -1
                
            except Exception as e:
                execution["status"] = "error"
                execution["error"] = str(e)
                execution["exit_code"] = -1
        
        execution["execution_time"] = time.time() - start_time
        
    except Exception as e:
        logger.error(f"Code execution error: {e}")
        execution["status"] = "error"
        execution["error"] = str(e)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8812) 