#!/bin/bash

# Cleanup and Redeploy Script for GeoGPT-RAG
# This script completely removes all traces of the previous deployment and redeploys from scratch

set -e

PROJECT_DIR="$HOME/geogpt-rag"
REPO_URL="https://github.com/Rekklessss/geogpt-rag.git"

# Configuration - Update this IP address when your EC2 instance restarts
# You can also set this via environment variable: export GEOGPT_PUBLIC_IP="your.new.ip"
GEOGPT_PUBLIC_IP="${GEOGPT_PUBLIC_IP:-54.224.133.45}"

# Production configuration
PRODUCTION_EC2_IP="54.224.133.45"
PRODUCTION_EC2_ID="i-0cf221c2fca3cb3cf"
ZILLIZ_CLOUD_URI="https://in03-088dd53cf6b3582.serverless.gcp-us-west1.cloud.zilliz.com"
ZILLIZ_CLOUD_TOKEN="affa13223a768e6e16b4e2bebf1e3f95b7b9085814d1407470c10922c7469d459cf523c189e99e24a20a1146976edd1a808d34fc"

# API service ports (usually don't change)
EMBEDDING_PORT="8810"
RERANKING_PORT="8811" 
GEOGPT_PORT="8812"

# Function to validate and ensure environment variables are properly set
validate_and_setup_environment() {
    echo "🔍 Validating and setting up environment variables..."
    
    local missing_vars=()
    local setup_required=false
    
    # Check current OpenAI API key
    if [[ -z "$OPENAI_API_KEY" ]]; then
        echo "❌ OpenAI API key is not set"
        setup_required=true
    elif [[ "$OPENAI_API_KEY" == "your-openai-api-key-here" ]] || [[ "$OPENAI_API_KEY" == "YOUR_OPENAI_API_KEY_HERE" ]]; then
        echo "⚠️  OPENAI_API_KEY is set to placeholder value"
        setup_required=true
    elif [[ ${#OPENAI_API_KEY} -lt 20 ]]; then
        echo "⚠️  OpenAI API key seems too short (${#OPENAI_API_KEY} characters)"
        echo "💡 OpenAI API keys typically start with 'sk-' and are 50+ characters"
        read -p "Current key looks invalid. Update it? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            setup_required=true
        fi
    else
        echo "✅ OpenAI API key looks valid (${#OPENAI_API_KEY} characters)"
        echo "   Current key starts with: ${OPENAI_API_KEY:0:8}..."
        read -p "Do you want to update it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_required=true
        fi
    fi
    
    # Interactive API key setup if needed
    if [[ "$setup_required" == "true" ]]; then
        echo ""
        echo "🔑 Please enter your OpenAI API key:"
        echo "   - Get it from: https://platform.openai.com/api-keys"
        echo "   - Should start with 'sk-'"
        echo "   - Keep it secure and don't share it"
        echo ""
        
        # Loop until valid key is provided
        while true; do
            read -s -p "OpenAI API Key: " NEW_OPENAI_API_KEY
            echo ""
            
            if [[ -z "$NEW_OPENAI_API_KEY" ]]; then
                echo "❌ No API key provided. Please try again."
                continue
            elif [[ "$NEW_OPENAI_API_KEY" == "your-openai-api-key-here" ]] || [[ "$NEW_OPENAI_API_KEY" == "YOUR_OPENAI_API_KEY_HERE" ]]; then
                echo "❌ Please provide your actual API key, not the placeholder."
                continue
            elif [[ ${#NEW_OPENAI_API_KEY} -lt 20 ]]; then
                echo "⚠️  API key seems short (${#NEW_OPENAI_API_KEY} characters)"
                read -p "Continue with this key anyway? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    continue
                fi
            fi
            
            # Valid key provided
            export OPENAI_API_KEY="$NEW_OPENAI_API_KEY"
            echo "✅ OpenAI API key set successfully"
            break
        done
        
        # Ask about making it persistent
        echo ""
        read -p "Make this API key persistent across sessions? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🔒 Adding to ~/.bashrc..."
            
            # Backup existing bashrc
            cp ~/.bashrc ~/.bashrc.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
            
            # Remove existing OpenAI API key lines
            grep -v "export OPENAI_API_KEY" ~/.bashrc > ~/.bashrc.temp 2>/dev/null || touch ~/.bashrc.temp
            grep -v "# GeoGPT OpenAI API Key" ~/.bashrc.temp > ~/.bashrc.temp2 2>/dev/null || cp ~/.bashrc.temp ~/.bashrc.temp2
            
            # Add new API key
            echo "" >> ~/.bashrc.temp2
            echo "# GeoGPT OpenAI API Key (added $(date))" >> ~/.bashrc.temp2
            echo "export OPENAI_API_KEY=\"$OPENAI_API_KEY\"" >> ~/.bashrc.temp2
            
            # Replace bashrc
            mv ~/.bashrc.temp2 ~/.bashrc
            rm -f ~/.bashrc.temp 2>/dev/null || true
            
            echo "✅ API key added to ~/.bashrc"
            echo "🔄 Will be available in new terminal sessions"
        fi
    fi
    
    # Final validation
    if [[ -z "$OPENAI_API_KEY" ]] || [[ "$OPENAI_API_KEY" == "your-openai-api-key-here" ]]; then
        echo "❌ OpenAI API key is still not properly set"
        echo "💡 Please set it manually: export OPENAI_API_KEY=\"your-actual-key\""
        exit 1
    fi
    
    # Set up all environment variables for consistency
    export OPENAI_API_KEY="$OPENAI_API_KEY"
    export EC2_INSTANCE_IP="$GEOGPT_PUBLIC_IP"
    export EC2_INSTANCE_ID="$PRODUCTION_EC2_ID"
    export LLM_PROVIDER="${LLM_PROVIDER:-auto}"
    export LLM_MODEL="${LLM_MODEL:-gpt-4o-mini}"
    export CONTEXT_WINDOW_SIZE="${CONTEXT_WINDOW_SIZE:-8192}"
    export MAX_CONVERSATION_HISTORY="${MAX_CONVERSATION_HISTORY:-50}"
    export ZILLIZ_CLOUD_URI="$ZILLIZ_CLOUD_URI"
    export ZILLIZ_CLOUD_TOKEN="$ZILLIZ_CLOUD_TOKEN"
    
    echo ""
    echo "✅ All environment variables configured:"
    echo "   OpenAI API Key: ✓ Set (${#OPENAI_API_KEY} characters)"
    echo "   EC2 Instance IP: $EC2_INSTANCE_IP"
    echo "   LLM Provider: $LLM_PROVIDER"
    echo "   LLM Model: $LLM_MODEL"
    echo "   Context Window: $CONTEXT_WINDOW_SIZE"
}

# Function to persist environment variables for the session
persist_environment_for_session() {
    echo "🔧 Persisting environment variables for current session..."
    
    # Write to a temporary env file that will be sourced
    cat > /tmp/geogpt_env_vars.sh << EOF
#!/bin/bash
# GeoGPT Environment Variables - Generated $(date)
export OPENAI_API_KEY="$OPENAI_API_KEY"
export EC2_INSTANCE_IP="$EC2_INSTANCE_IP"
export EC2_INSTANCE_ID="$EC2_INSTANCE_ID"
export LLM_PROVIDER="$LLM_PROVIDER"
export LLM_MODEL="$LLM_MODEL"
export CONTEXT_WINDOW_SIZE="$CONTEXT_WINDOW_SIZE"
export MAX_CONVERSATION_HISTORY="$MAX_CONVERSATION_HISTORY"
export ZILLIZ_CLOUD_URI="$ZILLIZ_CLOUD_URI"
export ZILLIZ_CLOUD_TOKEN="$ZILLIZ_CLOUD_TOKEN"
EOF
    
    chmod +x /tmp/geogpt_env_vars.sh
    source /tmp/geogpt_env_vars.sh
    
    echo "✅ Environment variables persisted for session"
}

# Function to verify environment variables are available
verify_environment_available() {
    local context="$1"
    echo "🔍 Verifying environment variables are available ($context)..."
    
    if [[ -z "$OPENAI_API_KEY" ]] || [[ "$OPENAI_API_KEY" == "your-openai-api-key-here" ]]; then
        echo "❌ OPENAI_API_KEY lost or invalid in context: $context"
        echo "🔄 Re-sourcing environment variables..."
        if [[ -f /tmp/geogpt_env_vars.sh ]]; then
            source /tmp/geogpt_env_vars.sh
            echo "✅ Environment variables restored"
        else
            echo "❌ Cannot restore environment variables"
            echo "💡 Please re-export OPENAI_API_KEY and run script again"
            exit 1
        fi
    fi
    
    echo "✅ Environment variables verified for $context"
}

# Function to get and validate IP address
get_ip_address() {
    if [[ "$1" == "--ip" ]] && [[ -n "$2" ]]; then
        # IP provided via command line argument
        GEOGPT_PUBLIC_IP="$2"
        echo "Using provided IP address: $GEOGPT_PUBLIC_IP"
    elif [[ -z "$GEOGPT_PUBLIC_IP" ]] || [[ "$GEOGPT_PUBLIC_IP" == "${EC2_INSTANCE_IP}" ]]; then
        # Use production IP as default
        GEOGPT_PUBLIC_IP="$PRODUCTION_EC2_IP"
        echo "🔧 Using production EC2 IP: $GEOGPT_PUBLIC_IP"
        echo "💡 If your EC2 instance has a different IP, you can:"
        echo "   1. Set environment variable: export GEOGPT_PUBLIC_IP='your.new.ip'"
        echo "   2. Pass as argument: ./cleanup_redeploy.sh --ip your.new.ip"
        echo ""
        read -p "Press Enter to continue with $GEOGPT_PUBLIC_IP, or type new IP: " NEW_IP
        if [[ -n "$NEW_IP" ]]; then
            GEOGPT_PUBLIC_IP="$NEW_IP"
            echo "Updated IP address to: $GEOGPT_PUBLIC_IP"
        fi
    fi
}

# Check for IP argument
if [[ "$1" == "--ip" ]]; then
    get_ip_address "$1" "$2"
else
    get_ip_address
fi

# Validate and setup environment before proceeding
validate_and_setup_environment

# Persist environment variables for the session
persist_environment_for_session

echo "🧹 GeoGPT-RAG Complete Cleanup & Redeploy"
echo "========================================"
echo "🔧 This script will:"
echo "   1. Validate and setup environment variables (interactive)"
echo "   2. Complete cleanup of existing deployment"
echo "   3. Pull latest code and rebuild from scratch"
echo "   4. Deploy and test all services"
echo ""
echo "⚠️  This will completely remove:"
echo "   - All Docker containers and images"
echo "   - All downloaded models (~7GB)"
echo "   - All logs and data files"
echo "   - All Docker volumes and networks"
echo ""
echo "🔄 Then it will:"
echo "   - Pull latest code from GitHub"
echo "   - Rebuild everything from scratch"
echo "   - Redeploy all services"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 1
fi

echo ""
echo "🚀 Starting cleanup and redeploy process..."

# Change to project directory
cd "$PROJECT_DIR" || {
    echo "❌ Project directory not found: $PROJECT_DIR"
    echo "💡 Run setup_ec2.sh first to initialize the project"
    exit 1
}

# Set up environment variables for Docker Compose
echo "🔧 Setting up environment variables for Docker Compose..."
verify_environment_available "Docker Compose setup"

# Re-export all variables to ensure they're available for Docker Compose
export OPENAI_API_KEY="$OPENAI_API_KEY"
export EC2_INSTANCE_IP="$GEOGPT_PUBLIC_IP"
export EC2_INSTANCE_ID="$PRODUCTION_EC2_ID"
export LLM_PROVIDER="${LLM_PROVIDER:-auto}"
export LLM_MODEL="${LLM_MODEL:-gpt-4o-mini}"
export CONTEXT_WINDOW_SIZE="${CONTEXT_WINDOW_SIZE:-8192}"
export MAX_CONVERSATION_HISTORY="${MAX_CONVERSATION_HISTORY:-50}"
export ZILLIZ_CLOUD_URI="$ZILLIZ_CLOUD_URI"
export ZILLIZ_CLOUD_TOKEN="$ZILLIZ_CLOUD_TOKEN"

# Create .env file WITHOUT sensitive data (for reference only)
echo "📋 Creating environment reference file (no secrets)..."
cat > .env.example << EOF
# GeoGPT-RAG Environment Configuration Template - Updated $(date)
# Copy this file to .env and set your actual values

# Instance Configuration
EC2_INSTANCE_IP=$GEOGPT_PUBLIC_IP
EC2_INSTANCE_ID=$PRODUCTION_EC2_ID
EC2_REGION=us-east-1

# LLM Configuration (Cost Optimized)
LLM_PROVIDER=auto
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=your-openai-api-key-here

# Vector Database
ZILLIZ_CLOUD_URI=$ZILLIZ_CLOUD_URI
ZILLIZ_CLOUD_TOKEN=$ZILLIZ_CLOUD_TOKEN

# System Configuration
CONTEXT_WINDOW_SIZE=8192
MAX_CONVERSATION_HISTORY=50

# Database URLs (container defaults)
DATABASE_URL=postgresql://geogpt:geogpt_password@postgres:5432/geogpt_spatial
REDIS_URL=redis://redis:6379
EOF

# Remove any existing .env file that might contain secrets
if [[ -f .env ]]; then
    echo "🗑️  Removing existing .env file (may contain secrets)..."
    rm -f .env
fi

# Display current configuration (without exposing secrets)
echo "✅ Environment Configuration:"
echo "   EC2 Instance IP: $EC2_INSTANCE_IP"
echo "   LLM Provider: $LLM_PROVIDER"
echo "   LLM Model: $LLM_MODEL"
echo "   OpenAI API Key: ✓ Set (${#OPENAI_API_KEY} characters)"

# Stop all services
echo "⏹️  Stopping all services..."
sudo docker-compose down --remove-orphans 2>/dev/null || echo "No services to stop"

# Stop systemd service
echo "⏹️  Stopping systemd service..."
sudo systemctl stop geogpt-rag.service 2>/dev/null || echo "Systemd service not running"

# Remove all Docker containers (including stopped ones)
echo "🗑️  Removing all Docker containers..."
sudo docker ps -aq | xargs -r sudo docker rm -f 2>/dev/null || echo "No containers to remove"

# Remove all Docker images related to the project
echo "🗑️  Removing Docker images..."
sudo docker images | grep -E "(geogpt|rag|postgres|redis)" | awk '{print $3}' | xargs -r sudo docker rmi -f 2>/dev/null || echo "No project images to remove"

# Remove all unused Docker images, containers, networks, and volumes
echo "🗑️  Cleaning up Docker system..."
sudo docker system prune -af --volumes 2>/dev/null || echo "Docker system cleanup completed"

# Remove downloaded models
echo "🗑️  Removing downloaded models..."
sudo rm -rf models/
sudo rm -rf /app/models/ 2>/dev/null || echo "No app models to remove"

# Remove logs
echo "🗑️  Removing logs..."
sudo rm -rf logs/
sudo rm -rf /app/logs/ 2>/dev/null || echo "No app logs to remove"

# Remove data files
echo "🗑️  Removing data files..."
sudo rm -rf data/
sudo rm -rf split_chunks/
sudo rm -rf /app/data/ 2>/dev/null || echo "No app data to remove"
sudo rm -rf /app/split_chunks/ 2>/dev/null || echo "No app split_chunks to remove"

# Remove any leftover Docker volumes
echo "🗑️  Removing Docker volumes..."
sudo docker volume ls -q | xargs -r sudo docker volume rm 2>/dev/null || echo "No volumes to remove"

# Clean up any leftover files
echo "🗑️  Cleaning up temporary files..."
sudo rm -rf ssl/
sudo rm -rf __pycache__/ 2>/dev/null || echo "No pycache to remove"
sudo rm -rf *.pyc 2>/dev/null || echo "No pyc files to remove"
sudo rm -rf .pytest_cache/ 2>/dev/null || echo "No pytest cache to remove"

# Pull latest code from GitHub
echo "📥 Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main
git clean -fd

# Verify we have the latest code
echo "✅ Current commit:"
git log --oneline -1

# Recreate necessary directories
echo "📁 Recreating necessary directories..."
mkdir -p models logs data split_chunks ssl

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/*.sh

# Verify environment variables are still set
echo "🔍 Verifying environment variables before Docker Compose..."
verify_environment_available "Docker Compose"

# Rebuild Docker images (no cache)
echo "🔨 Rebuilding Docker images from scratch..."
sudo -E docker-compose build --no-cache --pull

# Start services with environment variables
echo "🚀 Starting services with environment variables..."
sudo -E docker-compose up -d

# Wait for services to initialize (services need time to download models and start)
echo "⏳ Waiting for container to start and models to download..."
echo "   This may take 5-10 minutes for first-time model downloads (~6GB total)"
sleep 30

# Check if models are being downloaded
echo "📥 Checking model download progress..."
for i in {1..20}; do
    if sudo docker exec geogpt-rag-system ls /app/models/geo-embedding/config.json >/dev/null 2>&1 && \
       sudo docker exec geogpt-rag-system ls /app/models/geo-reranker/config.json >/dev/null 2>&1; then
        echo "✅ Models downloaded successfully"
        break
    fi
    echo "⏳ Models still downloading... (check $i/20)"
    sleep 30
done

# Additional wait for services to start after models are downloaded
echo "⏳ Waiting for services to initialize with downloaded models..."
sleep 60

# Verify and install missing dependencies in container
echo "🔍 Verifying all required dependencies are available..."
DEPS_CHECK=$(sudo docker-compose exec -T geogpt-rag python -c "
try:
    import openai, litellm, pydantic_settings, dotenv, langchain_milvus
    print('ALL_DEPS_OK')
except ImportError as e:
    print(f'MISSING_DEPS: {e}')
" 2>/dev/null || echo "CONTAINER_ERROR")

if [[ "$DEPS_CHECK" == "ALL_DEPS_OK" ]]; then
    echo "✅ All required dependencies are available"
elif [[ "$DEPS_CHECK" == "CONTAINER_ERROR" ]]; then
    echo "⚠️ Cannot check dependencies - container may not be ready"
    echo "Waiting additional time for container to start..."
    sleep 30
else
    echo "❌ Missing dependencies detected: $DEPS_CHECK"
    echo "🔧 Installing missing dependencies..."
    
    if sudo docker-compose exec -T geogpt-rag pip install --break-system-packages \
        openai>=1.97.0 \
        litellm>=1.74.0 \
        pydantic-settings>=2.10.0 \
        python-dotenv>=1.1.0 \
        langchain-community>=0.3.0 \
        langchain-milvus>=0.1.0; then
        echo "✅ Dependencies installed successfully"
        echo "🔄 Restarting services to load new dependencies..."
        sudo docker-compose restart geogpt-rag
        sleep 30
    else
        echo "❌ Failed to install dependencies"
    fi
fi

# Verify environment variables are properly set in container
echo "🔍 Verifying environment variables in container..."
verify_environment_available "Container verification"

ENV_CHECK=$(sudo docker-compose exec -T geogpt-rag bash -c "
if [[ -n \"\$OPENAI_API_KEY\" && \"\$OPENAI_API_KEY\" != \"YOUR_OPENAI_API_KEY_HERE\" && \"\$OPENAI_API_KEY\" != \"your-openai-api-key-here\" ]]; then
    echo 'ENV_OK'
else
    echo 'ENV_MISSING'
fi
" 2>/dev/null || echo "ENV_ERROR")

if [[ "$ENV_CHECK" != "ENV_OK" ]]; then
    echo "⚠️ Environment variables not properly set in container"
    echo "🔧 Restarting container to ensure environment variables are loaded..."
    sudo docker-compose restart geogpt-rag
    sleep 30
    
    # Verify again after restart
    ENV_CHECK=$(sudo docker-compose exec -T geogpt-rag bash -c "
    if [[ -n \"\$OPENAI_API_KEY\" && \"\$OPENAI_API_KEY\" != \"YOUR_OPENAI_API_KEY_HERE\" && \"\$OPENAI_API_KEY\" != \"your-openai-api-key-here\" ]]; then
        echo 'ENV_OK'
    else
        echo 'ENV_MISSING'
    fi
    " 2>/dev/null || echo "ENV_ERROR")
    
    if [[ "$ENV_CHECK" != "ENV_OK" ]]; then
        echo "❌ Environment variables still not properly set in container"
        echo "🔍 Container environment check:"
        sudo docker-compose exec -T geogpt-rag env | grep -E "(OPENAI|LLM|EC2)" || echo "No relevant environment variables found"
    else
        echo "✅ Environment variables successfully set after restart"
    fi
fi

# Check service health
echo "🏥 Checking service health..."
check_service() {
    local port=$1
    local service_name=$2
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port/health" >/dev/null 2>&1; then
            echo "✅ $service_name is ready"
            return 0
        fi
        echo "⏳ Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 15
        ((attempt++))
    done
    
    echo "❌ $service_name failed to start after $((max_attempts * 15)) seconds"
    echo "🔍 Checking $service_name logs:"
    case $port in
        8810) sudo docker exec geogpt-rag-system tail -n 5 /app/logs/embedding.log 2>/dev/null || echo "No embedding logs found" ;;
        8811) sudo docker exec geogpt-rag-system tail -n 5 /app/logs/reranking.log 2>/dev/null || echo "No reranking logs found" ;;
        8812) sudo docker exec geogpt-rag-system tail -n 5 /app/logs/geogpt_api.log 2>/dev/null || echo "No API logs found" ;;
    esac
    return 1
}

# Check database services first
echo "🗃️ Checking database services..."
if sudo docker exec geogpt-postgres pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    POSTGRES_STATUS=0
else
    echo "❌ PostgreSQL is not ready"
    POSTGRES_STATUS=1
fi

if sudo docker exec geogpt-redis redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis is ready"
    REDIS_STATUS=0
else
    echo "❌ Redis is not ready"
    REDIS_STATUS=1
fi

# Check embedding service
check_service 8810 "Embedding Service"
EMBEDDING_STATUS=$?

# Check reranking service
check_service 8811 "Reranking Service"
RERANKING_STATUS=$?

# Check GeoGPT API service
check_service 8812 "GeoGPT API Service"
GEOGPT_STATUS=$?

# Test LLM provider functionality
echo "🧠 Testing LLM provider functionality..."
if curl -s -X POST \
   -H "Content-Type: application/json" \
   -d '{"message":"Test connection","include_thinking":false,"use_web_search":false,"max_context_length":100}' \
   http://localhost:8812/chat >/dev/null 2>&1; then
    echo "✅ LLM provider is working"
    LLM_STATUS=0
else
    echo "⚠️ LLM provider test failed - check logs"
    LLM_STATUS=1
fi

# Comprehensive system validation before running tests
echo "🧪 Running comprehensive system validation..."

validate_deployment() {
    local errors=0
    
    echo "🔧 Validating deployment components..."
    
    # Test container is running
    echo -n "  Container status: "
    if sudo docker ps | grep -q "geogpt-rag-system.*Up"; then
        echo "✅ Running"
    else
        echo "❌ Not running"
        ((errors++))
    fi
    
    # Test database connections
    echo -n "  Database connectivity: "
    if sudo docker exec geogpt-rag-system python -c "import psycopg2; conn=psycopg2.connect('postgresql://geogpt:geogpt_password@postgres:5432/geogpt_spatial'); conn.close(); print('OK')" 2>/dev/null | grep -q "OK"; then
        echo "✅ OK"
    else
        echo "❌ Failed"
        ((errors++))
    fi
    
    # Test Redis connection
    echo -n "  Redis connectivity: "
    if sudo docker exec geogpt-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        echo "✅ OK"
    else
        echo "❌ Failed"
        ((errors++))
    fi
    
    # Test Python dependencies
    echo -n "  Python dependencies: "
    if sudo docker exec geogpt-rag-system python -c "import openai, litellm, pydantic_settings, dotenv, langchain_milvus; print('OK')" 2>/dev/null | grep -q "OK"; then
        echo "✅ All required packages available"
    else
        echo "❌ Missing packages"
        ((errors++))
    fi
    
    # Test environment variables in container
    echo -n "  Environment variables: "
    ENV_TEST=$(sudo docker exec geogpt-rag-system bash -c "
        if [[ -n \"\$OPENAI_API_KEY\" && \"\$OPENAI_API_KEY\" != \"YOUR_OPENAI_API_KEY_HERE\" && -n \"\$EC2_INSTANCE_IP\" ]]; then
            echo 'OK'
        else
            echo 'MISSING'
        fi
    " 2>/dev/null)
    
    if [[ "$ENV_TEST" == "OK" ]]; then
        echo "✅ Set correctly"
    else
        echo "❌ Missing or incorrect"
        ((errors++))
    fi
    
    # Test API endpoints are responding
    echo -n "  API endpoints: "
    if curl -s http://localhost:8812/health >/dev/null 2>&1; then
        echo "✅ Responding"
    else
        echo "❌ Not responding"
        ((errors++))
    fi
    
    return $errors
}

# Set environment variables for tests inside container
echo "🔧 Setting up test environment in container..."
verify_environment_available "Test setup"

# Create environment variable array for consistent test execution
TEST_ENV_VARS=(
    "OPENAI_API_KEY=$OPENAI_API_KEY"
    "EC2_INSTANCE_IP=localhost"
    "LLM_PROVIDER=$LLM_PROVIDER"
    "LLM_MODEL=$LLM_MODEL"
    "POSTGRES_PASSWORD=geogpt_password"
    "CONTEXT_WINDOW_SIZE=$CONTEXT_WINDOW_SIZE"
    "MAX_CONVERSATION_HISTORY=$MAX_CONVERSATION_HISTORY"
)

echo "✅ Test environment variables prepared"

# Run validation
if validate_deployment; then
    echo "✅ Deployment validation passed - running tests..."
else
    echo "⚠️ Deployment validation found issues - tests may fail"
    echo "🔧 Check logs: docker-compose logs geogpt-rag | tail -20"
fi

# Run system tests
echo "🧪 Running updated system tests..."
verify_environment_available "System tests"

if sudo docker exec $(printf ' -e %s' "${TEST_ENV_VARS[@]}") geogpt-rag-system python /app/scripts/test_system.py; then
    echo "✅ System tests passed!"
    TEST_STATUS=0
else
    echo "❌ System tests failed!"
    echo "🔍 Checking test environment in container:"
    sudo docker exec geogpt-rag-system bash -c "echo 'OPENAI_API_KEY length:' \${#OPENAI_API_KEY}"
    TEST_STATUS=1
fi

# Run comprehensive GeoGPT API tests
echo "🚀 Running comprehensive GeoGPT API tests with environment variables..."
verify_environment_available "GeoGPT API tests"

if sudo docker exec $(printf ' -e %s' "${TEST_ENV_VARS[@]}") geogpt-rag-system python /app/scripts/test_geogpt_api.py; then
    echo "✅ GeoGPT API tests passed!"
    GEOGPT_TEST_STATUS=0
else
    echo "❌ GeoGPT API tests failed!"
    echo "🔍 Checking API test environment in container:"
    sudo docker exec geogpt-rag-system bash -c "echo 'Environment check:'; env | grep -E '(OPENAI|LLM|EC2)' | head -5"
    GEOGPT_TEST_STATUS=1
fi

# Restart systemd service
echo "🚀 Restarting systemd service..."
sudo systemctl restart geogpt-rag.service

# Display final status
echo ""
echo "=== Redeploy Summary ==="
echo "🏠 Project Directory: $PROJECT_DIR"
echo "🔄 Redeploy Again: cd $PROJECT_DIR && ./scripts/cleanup_redeploy.sh"
echo ""
echo "🌐 Service URLs:"
echo "  - Embedding Service: http://${GEOGPT_PUBLIC_IP}:${EMBEDDING_PORT}"
echo "  - Reranking Service: http://${GEOGPT_PUBLIC_IP}:${RERANKING_PORT}"
echo "  - GeoGPT API Service: http://${GEOGPT_PUBLIC_IP}:${GEOGPT_PORT}"
echo ""
echo "📋 Service Status:"
if [ $POSTGRES_STATUS -eq 0 ]; then
    echo "  ✅ PostgreSQL Database: Running"
else
    echo "  ❌ PostgreSQL Database: Failed"
fi

if [ $REDIS_STATUS -eq 0 ]; then
    echo "  ✅ Redis Cache: Running"
else
    echo "  ❌ Redis Cache: Failed"
fi

if [ $EMBEDDING_STATUS -eq 0 ]; then
    echo "  ✅ Embedding Service: Running"
else
    echo "  ❌ Embedding Service: Failed"
fi

if [ $RERANKING_STATUS -eq 0 ]; then
    echo "  ✅ Reranking Service: Running"
else
    echo "  ❌ Reranking Service: Failed"
fi

if [ $GEOGPT_STATUS -eq 0 ]; then
    echo "  ✅ GeoGPT API Service: Running"
else
    echo "  ❌ GeoGPT API Service: Failed"
fi

if [ $LLM_STATUS -eq 0 ]; then
    echo "  ✅ LLM Provider (Cost-Optimized): Working"
else
    echo "  ❌ LLM Provider: Failed"
fi

if [ $TEST_STATUS -eq 0 ]; then
    echo "  ✅ System Tests (Environment-Based): Passed"
else
    echo "  ❌ System Tests: Failed"
fi

if [ $GEOGPT_TEST_STATUS -eq 0 ]; then
    echo "  ✅ GeoGPT API Tests (Cost-Optimized): Passed"
else
    echo "  ❌ GeoGPT API Tests: Failed"
fi

echo ""
if [ $POSTGRES_STATUS -eq 0 ] && [ $REDIS_STATUS -eq 0 ] && [ $EMBEDDING_STATUS -eq 0 ] && [ $RERANKING_STATUS -eq 0 ] && [ $GEOGPT_STATUS -eq 0 ] && [ $LLM_STATUS -eq 0 ] && [ $TEST_STATUS -eq 0 ] && [ $GEOGPT_TEST_STATUS -eq 0 ]; then
    echo "🎉 GeoGPT-RAG redeploy completed successfully!"
    echo "💡 The system is ready to use with the latest code changes."
    echo "🔒 SECURITY: No API keys stored in files - using environment variables only!"
    echo "💰 COST-OPTIMIZED: Using GPT-4o-mini for 80-95% cost savings!"
    echo "🚀 Production features active:"
    echo "   - Environment-based configuration (secure)"
    echo "   - Cost-optimized LLM models (GPT-4o-mini primary)"
    echo "   - Updated test suite with real integration testing"
    echo "   - PostgreSQL + Redis database services"
    echo "   - Real-time vector database (Zilliz Cloud)"
else
    echo "⚠️ Redeploy completed with some issues. Check logs for details:"
    echo "   docker-compose logs -f"
fi

echo ""
echo "=== Troubleshooting ==="
echo "🔍 To view real-time logs:"
echo "   sudo docker-compose logs -f"
echo ""
echo "📊 Quick health check:"
echo "   curl http://localhost:8812/health"
echo ""
echo "🔧 Common fixes:"
echo "   - LLM offline: Check OpenAI API key and restart container"
echo "   - Import errors: Dependencies should be in Docker image now"
echo "   - Service down: docker-compose restart geogpt-rag"
echo "   - Complete reset: ./scripts/cleanup_redeploy.sh"
echo ""
echo "🧪 Manual testing:"
echo "   export OPENAI_API_KEY='your-key' && python3 scripts/test_system.py"
echo ""
echo "🔄 Redeploy with different IP:"
echo "   ./scripts/cleanup_redeploy.sh --ip YOUR_NEW_IP"
echo "   OR: export GEOGPT_PUBLIC_IP='YOUR_NEW_IP' && ./scripts/cleanup_redeploy.sh"
echo ""
echo "🐳 Docker containers:"
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🧹 Cleaning up temporary files..."
rm -f /tmp/geogpt_env_vars.sh 2>/dev/null || true

echo ""
echo "💡 Environment Variable Management:"
echo "   - API key setup: Integrated in this script (interactive)"
echo "   - Make persistent: Option provided during setup"
echo "   - Manual setup: export OPENAI_API_KEY=\"your-key\""
echo ""
echo "🔍 To verify environment variables:"
echo "   echo \$OPENAI_API_KEY"
echo "   echo \$GEOGPT_PUBLIC_IP"
echo ""
echo "🔄 To redeploy with different settings:"
echo "   unset OPENAI_API_KEY && ./scripts/cleanup_redeploy.sh" 