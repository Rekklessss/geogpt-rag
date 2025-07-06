#!/usr/bin/env python3
"""
Test script for GeoGPT-RAG system
Tests the embedding service, reranking service, and RAG pipeline
"""

import requests
import json
import time
import sys
import os

# Add the rag_server directory to the path
sys.path.append('/app/rag_server')

from geo_kb import KBDocQA

def test_embedding_service():
    """Test the embedding service"""
    print("Testing Embedding Service...")
    
    try:
        # Test health endpoint
        health_response = requests.get("http://localhost:8810/health")
        print(f"Health check: {health_response.status_code} - {health_response.json()}")
        
        # Test embedding endpoint
        test_data = {
            "queries": ["What causes earthquakes?", "How do mountains form?"],
            "instruction": "Given a web search query, retrieve relevant passages that answer the query"
        }
        
        response = requests.post("http://localhost:8810/query", json=test_data)
        if response.status_code == 200:
            result = response.json()
            embeddings = json.loads(result["q_embeddings"])
            print(f"✓ Embedding service OK - Got {len(embeddings)} embeddings")
            print(f"  Embedding dimensions: {len(embeddings[0])}")
            return True
        else:
            print(f"✗ Embedding service failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Embedding service error: {e}")
        return False

def test_reranking_service():
    """Test the reranking service"""
    print("\nTesting Reranking Service...")
    
    try:
        # Test health endpoint
        health_response = requests.get("http://localhost:8811/health")
        print(f"Health check: {health_response.status_code} - {health_response.json()}")
        
        # Test reranking endpoint
        test_data = {
            "qp_pairs": [
                ["What causes earthquakes?", "Earthquakes are caused by tectonic plate movements"],
                ["What causes earthquakes?", "Mountains are formed by geological processes"]
            ]
        }
        
        response = requests.post("http://localhost:8811/query", json=test_data)
        if response.status_code == 200:
            result = response.json()
            scores = json.loads(result["pred_scores"])
            print(f"✓ Reranking service OK - Got {len(scores)} scores")
            print(f"  Relevance scores: {scores}")
            return True
        else:
            print(f"✗ Reranking service failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"✗ Reranking service error: {e}")
        return False

def test_rag_pipeline():
    """Test the complete RAG pipeline"""
    print("\nTesting RAG Pipeline...")
    
    try:
        # Initialize the RAG system
        kb_server = KBDocQA()
        
        # Test vector database connection
        print("Testing vector database connection...")
        
        # Since we don't have documents loaded, we'll test the connection
        # by attempting to perform a search (it should return empty results)
        docs = kb_server.retrieval("test query", k=1)
        print(f"✓ Vector database connection OK - Retrieved {len(docs)} documents")
        
        # Test LLM generation (this will use the Sagemaker endpoint)
        print("Testing LLM generation...")
        from geo_kb import llm_generate
        
        test_prompt = "What is geospatial analysis?"
        response = llm_generate(test_prompt)
        
        if response:
            print(f"✓ LLM generation OK - Response length: {len(response)} characters")
            print(f"  Sample response: {response[:200]}...")
            return True
        else:
            print("✗ LLM generation failed - Empty response")
            return False
            
    except Exception as e:
        print(f"✗ RAG pipeline error: {e}")
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
        os.makedirs("/app/data", exist_ok=True)
        with open("/app/data/sample_geo_doc.mmd", "w") as f:
            f.write(sample_doc)
        
        # Initialize RAG system
        kb_server = KBDocQA()
        
        # Add the document
        kb_server.add_file("/app/data/sample_geo_doc.mmd", max_size=512)
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
    print("=== GeoGPT-RAG System Tests ===")
    print("Testing system components...\n")
    
    # Wait for services to be ready
    print("Waiting for services to start...")
    time.sleep(10)
    
    tests = [
        test_embedding_service,
        test_reranking_service,
        test_rag_pipeline,
        test_document_ingestion
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n=== Test Results ===")
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("✓ All tests passed! GeoGPT-RAG system is working correctly.")
        return 0
    else:
        print("✗ Some tests failed. Please check the logs for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 