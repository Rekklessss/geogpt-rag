#!/usr/bin/env python3
"""
Updated Test Script for GeoGPT-RAG System
Tests the embedding service, reranking service, and RAG pipeline
Updated for environment variable configuration and new LLM providers
"""

import requests
import json
import time
import sys
import os
from pathlib import Path

# Add the rag_server directory to the path
current_dir = Path(__file__).parent.parent
sys.path.append(str(current_dir / "rag_server"))

# Environment-based configuration
def get_service_urls():
    """Get service URLs from environment variables or defaults"""
    ec2_ip = os.getenv("EC2_INSTANCE_IP", "localhost")
    embedding_port = os.getenv("EMBEDDING_PORT", "8810")
    reranking_port = os.getenv("RERANKING_PORT", "8811")
    main_api_port = os.getenv("MAIN_API_PORT", "8812")
    
    return {
        "embedding": f"http://{ec2_ip}:{embedding_port}",
        "reranking": f"http://{ec2_ip}:{reranking_port}",
        "main_api": f"http://{ec2_ip}:{main_api_port}"
    }

def test_embedding_service():
    """Test the embedding service"""
    print("Testing Embedding Service...")
    urls = get_service_urls()
    
    try:
        # Test health endpoint
        health_response = requests.get(f"{urls['embedding']}/health", timeout=10)
        print(f"Health check: {health_response.status_code} - {health_response.json()}")
        
        # Test embedding endpoint
        test_data = {
            "queries": ["What causes earthquakes?", "How do mountains form?"],
            "instruction": "Given a web search query, retrieve relevant passages that answer the query"
        }
        
        response = requests.post(f"{urls['embedding']}/query", json=test_data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            embeddings = json.loads(result["q_embeddings"])
            print(f"✓ Embedding service OK - Got {len(embeddings)} embeddings")
            print(f"  Embedding dimensions: {len(embeddings[0])}")
            return True
        else:
            print(f"✗ Embedding service failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Embedding service error: {e}")
        return False

def test_reranking_service():
    """Test the reranking service"""
    print("\nTesting Reranking Service...")
    urls = get_service_urls()
    
    try:
        # Test health endpoint
        health_response = requests.get(f"{urls['reranking']}/health", timeout=10)
        print(f"Health check: {health_response.status_code} - {health_response.json()}")
        
        # Test reranking endpoint
        test_data = {
            "qp_pairs": [
                ["What causes earthquakes?", "Earthquakes are caused by tectonic plate movements"],
                ["What causes earthquakes?", "Mountains are formed by geological processes"]
            ]
        }
        
        response = requests.post(f"{urls['reranking']}/query", json=test_data, timeout=30)
        if response.status_code == 200:
            result = response.json()
            scores = json.loads(result["pred_scores"])
            print(f"✓ Reranking service OK - Got {len(scores)} scores")
            print(f"  Relevance scores: {scores}")
            return True
        else:
            print(f"✗ Reranking service failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Reranking service error: {e}")
        return False

def test_rag_pipeline():
    """Test the complete RAG pipeline"""
    print("\nTesting RAG Pipeline...")
    
    try:
        # Test import and initialization
        try:
            from geo_kb import KBDocQA
        except ImportError:
            print("✗ Failed to import KBDocQA - checking alternative paths")
            # Try alternative import paths
            try:
                sys.path.append('/app')
                from rag_server.geo_kb import KBDocQA
            except ImportError:
                print("✗ Could not import KBDocQA from any path")
                return False
        
        # Initialize the RAG system
        kb_server = KBDocQA()
        
        # Test vector database connection
        print("Testing vector database connection...")
        
        # Test retrieval with a simple query
        docs = kb_server.retrieval("test query about geospatial analysis", k=1)
        print(f"✓ Vector database connection OK - Retrieved {len(docs)} documents")
        
        # Test LLM generation with new provider system
        print("Testing LLM generation...")
        try:
            # Try to import new LLM system
            from llm_providers import get_llm_manager
            llm_manager = get_llm_manager()
            
            # Test with new LLM manager
            test_prompt = "What is geospatial analysis? Provide a brief explanation."
            response = llm_manager.generate(test_prompt)
            
            # Handle both string response and dict response formats
            if isinstance(response, dict):
                response_text = response.get('response', str(response))
            elif isinstance(response, str):
                response_text = response
            else:
                response_text = str(response)
            
            if response and len(response_text.strip()) > 10:
                print(f"✓ New LLM provider OK - Response length: {len(response_text)} characters")
                print(f"  Sample response: {response_text[:200]}...")
                print(f"  LLM Provider: {llm_manager.get_current_provider()}")
                return True
            else:
                print("✗ New LLM provider failed - Empty or too short response")
                print(f"  Response type: {type(response)}")
                print(f"  Response content: {str(response)[:100]}...")
                return False
                
        except ImportError:
            # Fallback to old system
            print("New LLM system not available, testing legacy system...")
            try:
                from geo_kb import llm_generate
                test_prompt = "What is geospatial analysis?"
                response = llm_generate(test_prompt)
                
                if response and len(response.strip()) > 10:
                    print(f"✓ Legacy LLM generation OK - Response length: {len(response)} characters")
                    print(f"  Sample response: {response[:200]}...")
                    return True
                else:
                    print("✗ Legacy LLM generation failed - Empty response")
                    return False
            except Exception as e:
                print(f"✗ Legacy LLM generation error: {e}")
                return False
            
    except Exception as e:
        print(f"✗ RAG pipeline error: {e}")
        return False

def test_environment_configuration():
    """Test environment variable configuration"""
    print("\nTesting Environment Configuration...")
    
    try:
        # Test instance config management
        try:
            from instance_config import get_config_manager
            config_manager = get_config_manager()
            
            print("✓ Instance configuration loaded")
            print(f"  EC2 Instance IP: {config_manager.config.ec2_instance_ip}")
            print(f"  Embedding URL: {config_manager.config.embedding_url}")
            print(f"  Reranking URL: {config_manager.config.reranking_url}")
            print(f"  Main API URL: {config_manager.config.api_base_url}")
            
            # Test service health check
            health_status = config_manager.health_check()
            print(f"  Service Health: {health_status}")
            
            return True
            
        except ImportError:
            print("⚠️  New instance config system not available")
            # Check basic environment variables
            ec2_ip = os.getenv("EC2_INSTANCE_IP", "not_set")
            openai_key = os.getenv("OPENAI_API_KEY", "not_set")
            
            print(f"  EC2_INSTANCE_IP: {'✓ Set' if ec2_ip != 'not_set' else '✗ Not set'}")
            print(f"  OPENAI_API_KEY: {'✓ Set' if openai_key != 'not_set' else '✗ Not set'}")
            
            return ec2_ip != "not_set"
            
    except Exception as e:
        print(f"✗ Environment configuration error: {e}")
        return False

def test_main_api_service():
    """Test the main API service"""
    print("\nTesting Main API Service...")
    urls = get_service_urls()
    
    try:
        # Test health endpoint
        health_response = requests.get(f"{urls['main_api']}/health", timeout=10)
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"✓ Main API service OK - Status: {health_data.get('status')}")
            print(f"  Services: {health_data.get('services', {})}")
            
            # Test chat endpoint (basic functionality)
            chat_payload = {
                "message": "What is GIS?",
                "include_thinking": False,
                "include_sources": False,
                "use_web_search": False,
                "max_context_length": 1000
            }
            
            chat_response = requests.post(f"{urls['main_api']}/chat", json=chat_payload, timeout=60)
            
            if chat_response.status_code == 200:
                chat_data = chat_response.json()
                response_text = chat_data.get('response', '')
                print(f"✓ Chat endpoint OK - Response length: {len(response_text)} characters")
                print(f"  Processing time: {chat_data.get('processing_time', 0):.2f}s")
                return True
            else:
                print(f"✗ Chat endpoint failed: {chat_response.status_code}")
                return False
                
        else:
            print(f"✗ Main API service failed: {health_response.status_code}")
            print(f"  Response: {health_response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Main API service error: {e}")
        return False

def test_document_ingestion():
    """Test document ingestion"""
    print("\nTesting Document Ingestion...")
    
    try:
        # Create a sample document
        sample_doc = """
        # Geospatial Analysis Introduction
        
        Geospatial analysis is the process of examining and interpreting geographic data to understand patterns, relationships, and trends in spatial phenomena. This field combines geographic information systems (GIS) technology with statistical analysis and visualization techniques.
        
        ## Key Components
        
        1. **Data Collection**: Gathering spatial data from various sources
        2. **Data Processing**: Cleaning and preparing data for analysis
        3. **Analysis**: Applying statistical and spatial analysis techniques
        4. **Visualization**: Creating maps and charts to present findings
        
        ## Applications
        
        Geospatial analysis is used in various fields including:
        - Urban planning
        - Environmental monitoring
        - Agriculture
        - Transportation
        - Public health
        """
        
        # Save sample document
        data_dir = Path("/app/data") if Path("/app/data").exists() else Path("./data")
        data_dir.mkdir(exist_ok=True)
        
        sample_file = data_dir / "sample_geo_doc.md"
        with open(sample_file, "w") as f:
            f.write(sample_doc)
        
        # Initialize RAG system
        from geo_kb import KBDocQA
        kb_server = KBDocQA()
        
        # Add the document
        kb_server.add_file(str(sample_file), max_size=512)
        print("✓ Document ingestion OK - Sample document added")
        
        # Test retrieval
        docs = kb_server.retrieval("What is geospatial analysis?", k=3)
        print(f"✓ Document retrieval OK - Retrieved {len(docs)} relevant chunks")
        
        # Test full RAG query
        docs, answer = kb_server.query("What are the key components of geospatial analysis?")
        print(f"✓ Full RAG query OK - Answer length: {len(answer)} characters")
        print(f"  Retrieved {len(docs)} supporting documents")
        
        return True
        
    except Exception as e:
        print(f"✗ Document ingestion error: {e}")
        return False

def main():
    """Run all tests"""
    print("=== GeoGPT-RAG System Tests (Updated for Current Workflow) ===")
    print("Testing system components...\n")
    
    # Print current configuration
    urls = get_service_urls()
    print("🔧 Current Configuration:")
    print(f"  Embedding Service: {urls['embedding']}")
    print(f"  Reranking Service: {urls['reranking']}")
    print(f"  Main API Service: {urls['main_api']}")
    print(f"  OpenAI API Key: {'✓ Set' if os.getenv('OPENAI_API_KEY') else '✗ Not set'}")
    print()
    
    # Wait for services to be ready
    print("Waiting for services to start...")
    time.sleep(10)
    
    tests = [
        ("Environment Configuration", test_environment_configuration),
        ("Embedding Service", test_embedding_service),
        ("Reranking Service", test_reranking_service),
        ("Main API Service", test_main_api_service),
        ("RAG Pipeline", test_rag_pipeline),
        ("Document Ingestion", test_document_ingestion)
    ]
    
    passed = 0
    total = len(tests)
    results = {}
    
    for test_name, test_func in tests:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
        try:
            result = test_func()
            results[test_name] = result
            if result:
                passed += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
            results[test_name] = False
    
    print(f"\n{'='*60}")
    print("📊 TEST SUMMARY")
    print('='*60)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name:<30} {status}")
    
    print(f"\n🏆 Overall Score: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! GeoGPT-RAG system is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the logs for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 