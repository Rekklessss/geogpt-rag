#!/usr/bin/env python3
"""
Comprehensive test script for GeoGPT API functionality
Tests all endpoints and integrations with embedding and reranking services
Ensures NO MOCK DATA is used - all functionality is real
Includes implementation verification to ensure best practices
"""

import requests
import json
import time
import logging
import re
import os
from pathlib import Path
from typing import Dict, Any, List, Tuple
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Configuration
BASE_URL = "http://localhost:8812"
EMBEDDING_URL = "http://localhost:8810"
RERANKING_URL = "http://localhost:8811"

# Project paths for verification
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
API_FILE = PROJECT_ROOT / "rag_server" / "geogpt_api.py"
REQUIREMENTS_FILE = PROJECT_ROOT / "rag_server" / "requirements.txt"
DOCKER_COMPOSE_FILE = PROJECT_ROOT / "docker-compose.yml"

def test_service_health():
    """Test health endpoints for all services"""
    print("🔍 Testing service health...")
    
    services = {
        "GeoGPT API": f"{BASE_URL}/health",
        "Embedding Service": f"{EMBEDDING_URL}/health", 
        "Reranking Service": f"{RERANKING_URL}/health"
    }
    
    all_healthy = True
    for service_name, url in services.items():
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"✅ {service_name}: Healthy")
                if service_name == "GeoGPT API":
                    health_data = response.json()
                    print(f"   Services: {health_data.get('services', {})}")
            else:
                print(f"❌ {service_name}: Unhealthy (status: {response.status_code})")
                all_healthy = False
        except Exception as e:
            print(f"❌ {service_name}: Connection failed - {e}")
            all_healthy = False
    
    return all_healthy

def test_chat_basic():
    """Test basic chat functionality"""
    print("\n💬 Testing basic chat...")
    
    test_message = "What is GIS and how is it used in urban planning?"
    
    payload = {
        "message": test_message,
        "include_thinking": True,
        "include_sources": True,
        "use_web_search": False,
        "max_context_length": 2000
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat", json=payload, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Chat endpoint working")
            print(f"   Response length: {len(data.get('response', ''))}")
            print(f"   Processing time: {data.get('processing_time', 0):.2f}s")
            print(f"   Sources found: {len(data.get('sources', []))}")
            print(f"   Tokens used: {data.get('tokens', {})}")
            
            # Verify it's not mock data
            response_text = data.get('response', '')
            if "mock" in response_text.lower() or "placeholder" in response_text.lower():
                print("❌ WARNING: Response appears to contain mock data!")
                return False
            
            if data.get('thinking'):
                print(f"   Thinking provided: {len(data['thinking'])} chars")
            
            return True
        else:
            print(f"❌ Chat failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Chat test failed: {e}")
        return False

def test_chat_with_web_search():
    """Test chat with real web search"""
    print("\n🌐 Testing chat with web search...")
    
    test_message = "What are the latest developments in satellite imagery analysis for climate change?"
    
    payload = {
        "message": test_message,
        "include_thinking": True,
        "include_sources": True,
        "use_web_search": True,
        "max_context_length": 3000
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat", json=payload, timeout=120)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Web search chat working")
            print(f"   Response length: {len(data.get('response', ''))}")
            print(f"   Processing time: {data.get('processing_time', 0):.2f}s")
            
            sources = data.get('sources', [])
            print(f"   Total sources: {len(sources)}")
            
            web_sources = [s for s in sources if s.get('type') == 'web_search']
            wiki_sources = [s for s in sources if s.get('type') == 'wikipedia']
            kb_sources = [s for s in sources if s.get('type') == 'knowledge_base']
            
            print(f"   Web sources: {len(web_sources)}")
            print(f"   Wikipedia sources: {len(wiki_sources)}")
            print(f"   Knowledge base sources: {len(kb_sources)}")
            
            # Verify real web sources
            if web_sources:
                first_web = web_sources[0]
                print(f"   Sample web source: {first_web.get('title', 'No title')}")
                print(f"   Sample web URL: {first_web.get('url', 'No URL')}")
                
                # Check if it's real data
                if first_web.get('url', '').startswith('http'):
                    print("✅ Real web URLs found")
                else:
                    print("❌ Web sources appear to be mock data")
                    return False
            
            return True
        else:
            print(f"❌ Web search chat failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Web search chat test failed: {e}")
        return False

def test_deep_discovery():
    """Test deep discovery process"""
    print("\n🔍 Testing deep discovery...")
    
    payload = {
        "query": "Impact of urban heat islands on public health in major cities",
        "max_steps": 3,
        "include_web_search": True,
        "include_knowledge_base": True
    }
    
    try:
        # Start discovery
        response = requests.post(f"{BASE_URL}/discovery/start", json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            discovery_id = data.get('discovery_id')
            print(f"✅ Discovery started: {discovery_id}")
            print(f"   Status: {data.get('status')}")
            print(f"   Steps: {len(data.get('steps', []))}")
            
            # Monitor progress
            max_attempts = 30
            for attempt in range(max_attempts):
                time.sleep(5)
                
                status_response = requests.get(f"{BASE_URL}/discovery/{discovery_id}", timeout=30)
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    progress = status_data.get('progress', 0)
                    status = status_data.get('status')
                    current_step = status_data.get('current_step', 0)
                    
                    print(f"   Progress: {progress:.1f}% - Step {current_step} - Status: {status}")
                    
                    if status == "completed":
                        print("✅ Discovery completed successfully")
                        
                        sources = status_data.get('sources', [])
                        print(f"   Total sources gathered: {len(sources)}")
                        
                        final_report = status_data.get('final_report')
                        if final_report:
                            print(f"   Final report length: {len(final_report)} chars")
                            
                            # Check for mock content
                            if "mock" in final_report.lower() or "placeholder" in final_report.lower():
                                print("❌ WARNING: Final report appears to contain mock data!")
                                return False
                        
                        return True
                    elif status == "error":
                        print(f"❌ Discovery failed with error")
                        return False
                else:
                    print(f"❌ Status check failed: {status_response.status_code}")
                    return False
            
            print("❌ Discovery timed out")
            return False
            
        else:
            print(f"❌ Discovery start failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Deep discovery test failed: {e}")
        return False

def test_code_execution():
    """Test secure code execution"""
    print("\n💻 Testing code execution...")
    
    # Test safe code
    safe_code = """
import math
import json

# Calculate area of circle
radius = 5
area = math.pi * radius ** 2

result = {
    "radius": radius,
    "area": round(area, 2),
    "circumference": round(2 * math.pi * radius, 2)
}

print(json.dumps(result, indent=2))
"""
    
    payload = {
        "code": safe_code,
        "language": "python",
        "timeout": 30,
        "allow_network": False
    }
    
    try:
        response = requests.post(f"{BASE_URL}/code/execute", json=payload, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            execution_id = data.get('execution_id')
            print(f"✅ Code execution started: {execution_id}")
            
            # Monitor execution
            max_attempts = 10
            for attempt in range(max_attempts):
                time.sleep(2)
                
                status_response = requests.get(f"{BASE_URL}/code/execution/{execution_id}", timeout=30)
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    status = status_data.get('status')
                    
                    if status == "completed":
                        output = status_data.get('output', '')
                        error = status_data.get('error')
                        exit_code = status_data.get('exit_code', -1)
                        execution_time = status_data.get('execution_time', 0)
                        
                        print("✅ Code executed successfully")
                        print(f"   Exit code: {exit_code}")
                        print(f"   Execution time: {execution_time:.3f}s")
                        print(f"   Output length: {len(output)} chars")
                        
                        if output:
                            print("   Output preview:")
                            print("   " + output[:200] + ("..." if len(output) > 200 else ""))
                        
                        if error:
                            print(f"   Stderr: {error}")
                        
                        # Verify it produced real output
                        try:
                            result = json.loads(output)
                            if isinstance(result, dict) and 'area' in result:
                                print("✅ Code produced valid mathematical results")
                                return True
                            else:
                                print("❌ Code output doesn't match expected format")
                                return False
                        except:
                            print("❌ Code output is not valid JSON")
                            return False
                        
                    elif status == "error" or status == "timeout":
                        print(f"❌ Code execution failed: {status}")
                        error = status_data.get('error', 'Unknown error')
                        print(f"   Error: {error}")
                        return False
                else:
                    print(f"❌ Status check failed: {status_response.status_code}")
                    return False
            
            print("❌ Code execution timed out")
            return False
            
        else:
            print(f"❌ Code execution start failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Code execution test failed: {e}")
        return False

def test_malicious_code_prevention():
    """Test that malicious code is properly sandboxed"""
    print("\n🛡️ Testing malicious code prevention...")
    
    # Test code that tries to access filesystem
    malicious_code = """
import os
import sys

# Try to access sensitive files
try:
    with open('/etc/passwd', 'r') as f:
        print("SECURITY BREACH: Accessed /etc/passwd")
        print(f.read()[:100])
except Exception as e:
    print(f"Filesystem access blocked: {e}")

# Try to execute system commands
try:
    os.system('ls -la /')
    print("SECURITY BREACH: System command executed")
except Exception as e:
    print(f"System command blocked: {e}")

# Try to access parent directories
try:
    files = os.listdir('../')
    print(f"SECURITY BREACH: Accessed parent directory: {files[:5]}")
except Exception as e:
    print(f"Parent directory access blocked: {e}")

print("Sandbox test completed")
"""
    
    payload = {
        "code": malicious_code,
        "language": "python",
        "timeout": 30,
        "allow_network": False
    }
    
    try:
        response = requests.post(f"{BASE_URL}/code/execute", json=payload, timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            execution_id = data.get('execution_id')
            
            # Monitor execution
            max_attempts = 10
            for attempt in range(max_attempts):
                time.sleep(2)
                
                status_response = requests.get(f"{BASE_URL}/code/execution/{execution_id}", timeout=30)
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    status = status_data.get('status')
                    
                    if status in ["completed", "error"]:
                        output = status_data.get('output', '')
                        
                        # Check if any security breaches occurred
                        if "SECURITY BREACH" in output:
                            print("❌ CRITICAL: Security sandbox failed!")
                            print(f"   Output: {output}")
                            return False
                        else:
                            print("✅ Security sandbox working correctly")
                            print("   Malicious code was properly contained")
                            return True
            
            print("❌ Security test timed out")
            return False
            
        else:
            print(f"❌ Security test start failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Security test failed: {e}")
        return False

def verify_dependencies() -> Tuple[bool, List[str]]:
    """Verify that all required dependencies are properly specified"""
    print("\n🔍 Verifying dependencies...")
    issues = []
    
    required_packages = {
        'duckduckgo-search': 'Web search functionality',
        'beautifulsoup4': 'HTML parsing for web scraping',
        'wikipedia': 'Wikipedia API integration',
        'fastapi': 'API framework',
        'uvicorn': 'ASGI server',
        'requests': 'HTTP client library',
        'pydantic': 'Data validation'
    }
    
    if not REQUIREMENTS_FILE.exists():
        issues.append("requirements.txt file not found")
        return False, issues
        
    with open(REQUIREMENTS_FILE, 'r') as f:
        requirements_content = f.read()
        
    for package, description in required_packages.items():
        if package not in requirements_content:
            issues.append(f"Missing required package: {package} ({description})")
            
    # Check for version specifications
    lines = requirements_content.strip().split('\n')
    for line in lines:
        if line and not line.startswith('#'):
            if '==' not in line and '>=' not in line:
                issues.append(f"Package '{line}' should have version specification")
                
    success = len(issues) == 0
    if success:
        print("✅ All required dependencies are properly specified")
    else:
        print(f"❌ Dependency issues found: {len(issues)}")
        
    return success, issues

def verify_no_mock_data() -> Tuple[bool, List[str]]:
    """Verify that no mock data or placeholder content exists"""
    print("\n🔍 Verifying no mock data exists...")
    issues = []
    
    # Patterns that indicate mock data
    mock_patterns = [
        r'mock[_\s]*(data|response|result)',
        r'placeholder[_\s]*(data|content|text)',
        r'dummy[_\s]*(data|content|response)',
        r'fake[_\s]*(data|response|result)',
        r'return\s*\[\s*\]',  # Empty returns
        r'return\s*\{\s*\}',  # Empty dict returns
        r'NotImplemented',
        r'TODO.*implement',
        r'FIXME.*mock'
    ]
    
    if not API_FILE.exists():
        issues.append("geogpt_api.py file not found")
        return False, issues
        
    with open(API_FILE, 'r') as f:
        content = f.read()
        
    for i, line in enumerate(content.split('\n'), 1):
        line_lower = line.lower()
        for pattern in mock_patterns:
            if re.search(pattern, line_lower, re.IGNORECASE):
                # Skip comments and docstrings
                if not line.strip().startswith('#') and '"""' not in line and "'''" not in line:
                    issues.append(f"Line {i}: Potential mock data - {line.strip()}")
                    
    success = len(issues) == 0
    if success:
        print("✅ No mock data patterns found")
    else:
        print(f"❌ Potential mock data found: {len(issues)} instances")
        
    return success, issues

def verify_security_implementation() -> Tuple[bool, List[str]]:
    """Verify that security best practices are implemented"""
    print("\n🔍 Verifying security implementation...")
    issues = []
    
    if not API_FILE.exists():
        issues.append("geogpt_api.py file not found")
        return False, issues
        
    with open(API_FILE, 'r') as f:
        content = f.read()
        
    # Check for secure code execution patterns
    security_checks = {
        'tempfile.TemporaryDirectory': 'Temporary directory for isolation',
        'subprocess.run': 'Subprocess for code execution',
        'timeout=': 'Timeout parameter for subprocess',
        'capture_output=True': 'Output capture for subprocess',
        'cwd=temp_dir': 'Working directory restriction'
    }
    
    for pattern, description in security_checks.items():
        if pattern not in content:
            issues.append(f"Missing security pattern: {pattern} ({description})")
            
    # Check for dangerous patterns
    dangerous_patterns = [
        ('exec(', 'Direct exec() usage is dangerous'),
        ('eval(', 'Direct eval() usage can be dangerous'),
        ('os.system(', 'Direct os.system() usage in main code'),
        ('shell=True', 'Shell=True in subprocess can be dangerous')
    ]
    
    for pattern, warning in dangerous_patterns:
        if pattern in content:
            # Check if it's in a safe context (like our sandboxed execution)
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if pattern in line and 'run_secure_code_execution' not in lines[max(0, i-5):i+5]:
                    issues.append(f"Dangerous pattern found: {pattern} - {warning}")
                    
    success = len(issues) == 0
    if success:
        print("✅ Security implementation looks good")
    else:
        print(f"❌ Security issues found: {len(issues)}")
        
    return success, issues

def verify_web_search_implementation() -> Tuple[bool, List[str]]:
    """Verify that web search is properly implemented"""
    print("\n🔍 Verifying web search implementation...")
    issues = []
    
    if not API_FILE.exists():
        issues.append("geogpt_api.py file not found")
        return False, issues
        
    with open(API_FILE, 'r') as f:
        content = f.read()
        
    # Check for proper DuckDuckGo implementation
    ddg_checks = [
        'from duckduckgo_search import DDGS',
        'with DDGS() as ddgs:',
        'ddgs.text(',
        'wikipedia.search(',
        'wikipedia.page('
    ]
    
    for check in ddg_checks:
        if check not in content:
            issues.append(f"Missing DuckDuckGo implementation: {check}")
            
    # Check for proper error handling
    error_handling_checks = [
        'try:',
        'except Exception as e:',
        'logger.warning(',
        'logger.error('
    ]
    
    for check in error_handling_checks:
        if check not in content:
            issues.append(f"Missing error handling pattern: {check}")
            
    # Check for real data extraction
    real_data_patterns = [
        'requests.get(',
        'BeautifulSoup(',
        'get_text()',
        'result[\'href\']',
        'result[\'title\']'
    ]
    
    for pattern in real_data_patterns:
        if pattern not in content:
            issues.append(f"Missing real data extraction: {pattern}")
            
    success = len(issues) == 0
    if success:
        print("✅ Web search implementation is correct")
    else:
        print(f"❌ Web search issues found: {len(issues)}")
        
    return success, issues

def verify_api_endpoints() -> Tuple[bool, List[str]]:
    """Verify that all required API endpoints are implemented"""
    print("\n🔍 Verifying API endpoints...")
    issues = []
    
    if not API_FILE.exists():
        issues.append("geogpt_api.py file not found")
        return False, issues
        
    with open(API_FILE, 'r') as f:
        content = f.read()
        
    required_endpoints = [
        ('@app.get("/health")', 'Health check endpoint'),
        ('@app.post("/chat")', 'Chat endpoint'),
        ('@app.post("/discovery/start")', 'Discovery start endpoint'),
        ('@app.get("/discovery/{discovery_id}")', 'Discovery status endpoint'),
        ('@app.post("/code/execute")', 'Code execution endpoint'),
        ('@app.get("/code/execution/{execution_id}")', 'Code execution status endpoint')
    ]
    
    for endpoint, description in required_endpoints:
        if endpoint not in content:
            issues.append(f"Missing endpoint: {endpoint} ({description})")
            
    # Check for proper response models
    response_models = [
        'ChatResponse',
        'DeepDiscoveryResponse',
        'CodeExecutionResponse'
    ]
    
    for model in response_models:
        if f'response_model={model}' not in content:
            issues.append(f"Missing response model usage: {model}")
            
    success = len(issues) == 0
    if success:
        print("✅ All required API endpoints are implemented")
    else:
        print(f"❌ API endpoint issues found: {len(issues)}")
        
    return success, issues

def verify_docker_configuration() -> Tuple[bool, List[str]]:
    """Verify that Docker configuration includes the new service"""
    print("\n🔍 Verifying Docker configuration...")
    issues = []
    
    if not DOCKER_COMPOSE_FILE.exists():
        issues.append("docker-compose.yml file not found")
        return False, issues
        
    with open(DOCKER_COMPOSE_FILE, 'r') as f:
        content = f.read()
        
    # Check for GeoGPT API service startup
    required_patterns = [
        'python geogpt_api.py',
        'port 8812',
        '/app/logs/geogpt_api.log'
    ]
    
    for pattern in required_patterns:
        if pattern not in content:
            issues.append(f"Missing Docker configuration: {pattern}")
            
    success = len(issues) == 0
    if success:
        print("✅ Docker configuration includes GeoGPT API service")
    else:
        print(f"❌ Docker configuration issues found: {len(issues)}")
        
    return success, issues

def verify_real_integrations() -> Tuple[bool, List[str]]:
    """Verify that integrations are real and not mocked"""
    print("\n🔍 Verifying real integrations...")
    issues = []
    
    if not API_FILE.exists():
        issues.append("geogpt_api.py file not found")
        return False, issues
        
    with open(API_FILE, 'r') as f:
        content = f.read()
        
    # Check for real RAG integration
    rag_patterns = [
        'from geo_kb import KBDocQA',
        'kb_system = KBDocQA()',
        'kb_system.query(',
        'llm_generate('
    ]
    
    for pattern in rag_patterns:
        if pattern not in content:
            issues.append(f"Missing real RAG integration: {pattern}")
            
    # Check for real service health checks
    health_patterns = [
        'requests.get("http://localhost:8810/health"',
        'requests.get("http://localhost:8811/health"',
        'response.status_code == 200'
    ]
    
    for pattern in health_patterns:
        if pattern not in content:
            issues.append(f"Missing real health check: {pattern}")
            
    success = len(issues) == 0
    if success:
        print("✅ Real integrations are properly implemented")
    else:
        print(f"❌ Integration issues found: {len(issues)}")
        
    return success, issues

def run_comprehensive_test():
    """Run all tests and generate report"""
    print("🚀 Starting comprehensive GeoGPT API test suite")
    print("=" * 60)
    
    test_results = {}
    
    # Run functional tests
    functional_tests = [
        ("Service Health", test_service_health),
        ("Basic Chat", test_chat_basic),
        ("Chat with Web Search", test_chat_with_web_search),
        ("Deep Discovery", test_deep_discovery),
        ("Code Execution", test_code_execution),
        ("Security Sandbox", test_malicious_code_prevention)
    ]
    
    # Run implementation verification tests
    verification_tests = [
        ("Dependencies Verification", lambda: verify_dependencies()[0]),
        ("No Mock Data Verification", lambda: verify_no_mock_data()[0]),
        ("Security Implementation", lambda: verify_security_implementation()[0]),
        ("Web Search Implementation", lambda: verify_web_search_implementation()[0]),
        ("API Endpoints Verification", lambda: verify_api_endpoints()[0]),
        ("Docker Configuration", lambda: verify_docker_configuration()[0]),
        ("Real Integrations", lambda: verify_real_integrations()[0])
    ]
    
    all_tests = functional_tests + verification_tests
    
    for test_name, test_func in all_tests:
        print(f"\n{'=' * 60}")
        try:
            result = test_func()
            test_results[test_name] = result
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            test_results[test_name] = False
    
    # Generate final report
    print(f"\n{'=' * 60}")
    print("📊 COMPREHENSIVE TEST REPORT")
    print("=" * 60)
    
    functional_passed = 0
    verification_passed = 0
    total_functional = len(functional_tests)
    total_verification = len(verification_tests)
    
    print("\n🧪 FUNCTIONAL TESTS:")
    for test_name, _ in functional_tests:
        result = test_results[test_name]
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name:.<45} {status}")
        if result:
            functional_passed += 1
    
    print("\n🔍 IMPLEMENTATION VERIFICATION:")
    for test_name, _ in verification_tests:
        result = test_results[test_name]
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name:.<45} {status}")
        if result:
            verification_passed += 1
    
    total_passed = functional_passed + verification_passed
    total_tests = total_functional + total_verification
    
    print("=" * 60)
    print(f"Functional Tests: {functional_passed}/{total_functional} passed ({functional_passed/total_functional*100:.1f}%)")
    print(f"Verification Tests: {verification_passed}/{total_verification} passed ({verification_passed/total_verification*100:.1f}%)")
    print(f"Overall Score: {total_passed}/{total_tests} tests passed ({total_passed/total_tests*100:.1f}%)")
    
    if total_passed == total_tests:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ GeoGPT API is fully functional with NO MOCK DATA")
        print("✅ Implementation follows best practices")
        print("✅ Security measures are in place")
        print("✅ All integrations are real and verified")
        return True
    else:
        print(f"\n⚠️  {total_tests - total_passed} tests failed. Please review the output above.")
        return False

if __name__ == "__main__":
    import sys
    
    success = run_comprehensive_test()
    sys.exit(0 if success else 1) 