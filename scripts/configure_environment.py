#!/usr/bin/env python3
"""
Environment Configuration Script for GeoGPT-RAG
Replaces hardcoded IP addresses with dynamic environment variables
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple

# Configuration mappings
IP_REPLACEMENTS = {
    '3.81.101.190': '${EC2_INSTANCE_IP}',
    'localhost': '${EC2_INSTANCE_IP:-localhost}',
}

# Files to update with their specific patterns
FILE_UPDATES = {
    'README.md': [
        (r'http://3\.81\.101\.190:8812', 'http://${EC2_INSTANCE_IP}:8812'),
        (r'3\.81\.101\.190', '${EC2_INSTANCE_IP}')
    ],
    'TECHNICAL_README.md': [
        (r'NEXT_PUBLIC_API_HOST=3\.81\.101\.190', 'NEXT_PUBLIC_API_HOST=${EC2_INSTANCE_IP}')
    ],
    'USER_GUIDE.md': [
        (r'http://3\.81\.101\.190:8812', 'http://${EC2_INSTANCE_IP}:8812'),
        (r'3\.81\.101\.190', '${EC2_INSTANCE_IP}')
    ],
    'frontend/next.config.js': [
        (r"'3\.81\.101\.190'", "'${process.env.NEXT_PUBLIC_API_HOST || \'localhost\'}'"),
        (r'3\.81\.101\.190', '${process.env.NEXT_PUBLIC_API_HOST || \'localhost\'}')
    ],
    'frontend/README.md': [
        (r'http://3\.81\.101\.190:', 'http://${EC2_INSTANCE_IP}:'),
        (r'3\.81\.101\.190', '${EC2_INSTANCE_IP}')
    ],
    'scripts/cleanup_redeploy.sh': [
        (r'3\.81\.101\.190', '${EC2_INSTANCE_IP}')
    ]
}

def read_file(file_path: Path) -> str:
    """Read file content"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return ""

def write_file(file_path: Path, content: str) -> bool:
    """Write content to file"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception as e:
        print(f"Error writing {file_path}: {e}")
        return False

def replace_in_content(content: str, replacements: List[Tuple[str, str]]) -> Tuple[str, int]:
    """Replace patterns in content and return updated content and count of replacements"""
    updated_content = content
    total_replacements = 0
    
    for pattern, replacement in replacements:
        matches = re.findall(pattern, updated_content)
        if matches:
            updated_content = re.sub(pattern, replacement, updated_content)
            total_replacements += len(matches)
            print(f"  - Replaced {len(matches)} occurrences of '{pattern}'")
    
    return updated_content, total_replacements

def create_env_template(project_root: Path):
    """Create environment template file"""
    env_template = """# GeoGPT-RAG Environment Configuration
# Copy this file to .env and update with your specific values

# ====================
# EC2 Instance Configuration
# ====================
EC2_INSTANCE_IP=your.ec2.ip.address
EC2_INSTANCE_ID=i-1234567890abcdef0
EC2_REGION=us-east-1

# ====================
# Service Ports (default values)
# ====================
EMBEDDING_PORT=8810
RERANKING_PORT=8811
MAIN_API_PORT=8812

# ====================
# LLM Provider Configuration
# ====================
# Options: openai, sagemaker, auto
LLM_PROVIDER=auto
LLM_MODEL=gpt-4-turbo

# OpenAI Configuration (if using OpenAI provider)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# AWS Sagemaker Configuration (if using Sagemaker provider)
SAGEMAKER_ENDPOINT=GeoGPT-R1-Sagemaker-Endpoint
SAGEMAKER_REGION=us-east-1
SAGEMAKER_MAX_TOKENS=8192

# ====================
# Database Configuration
# ====================
DATABASE_URL=postgresql://geogpt:geogpt_password@postgres:5432/geogpt_spatial
POSTGRES_URL=postgresql://geogpt:geogpt_password@postgres:5432/geogpt_spatial
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=geogpt_spatial
POSTGRES_USER=geogpt
POSTGRES_PASSWORD=geogpt_password

# ====================
# Redis Configuration
# ====================
REDIS_URL=redis://redis:6379

# ====================
# Frontend Configuration
# ====================
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_HOST=${EC2_INSTANCE_IP}
NEXT_PUBLIC_API_PROTOCOL=http
NEXT_PUBLIC_RAG_EMBEDDING_API=http://${EC2_INSTANCE_IP}:8810
NEXT_PUBLIC_RAG_RERANKING_API=http://${EC2_INSTANCE_IP}:8811

# ====================
# Vector Database (Zilliz Cloud)
# ====================
ZILLIZ_CLOUD_URI=your_zilliz_uri
ZILLIZ_CLOUD_API_KEY=your_zilliz_api_key

# ====================
# Memory and Conversation Configuration
# ====================
MAX_CONVERSATION_HISTORY=50
CONTEXT_WINDOW_SIZE=8192
ENABLE_CONVERSATION_PERSISTENCE=true

# ====================
# Map and GIS Configuration
# ====================
ENABLE_MAP_VISUALIZATIONS=true
DEFAULT_MAP_PROVIDER=openstreetmap
MAPBOX_ACCESS_TOKEN=your_mapbox_token  # Optional, for premium maps

# ====================
# Security Configuration
# ====================
API_SECRET_KEY=your_api_secret_key
ENABLE_API_AUTHENTICATION=false

# ====================
# Development Configuration
# ====================
DEBUG_MODE=false
LOG_LEVEL=INFO
"""
    
    template_path = project_root / ".env.template"
    if write_file(template_path, env_template):
        print(f"✅ Created environment template: {template_path}")
    else:
        print(f"❌ Failed to create environment template")

def update_frontend_config(project_root: Path):
    """Update frontend configuration to use environment variables"""
    frontend_env_path = project_root / "frontend" / ".env.local.example"
    
    frontend_env_content = """# Frontend Environment Configuration for GeoGPT-RAG
# Copy this file to .env.local and update with your EC2 instance details

# API Host Configuration
NEXT_PUBLIC_API_HOST=your.ec2.ip.address
NEXT_PUBLIC_API_PROTOCOL=http

# Service Endpoints
NEXT_PUBLIC_RAG_EMBEDDING_API=http://your.ec2.ip.address:8810
NEXT_PUBLIC_RAG_RERANKING_API=http://your.ec2.ip.address:8811
NEXT_PUBLIC_RAG_API=http://your.ec2.ip.address:8812

# Optional: Custom map providers
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_key
"""
    
    if write_file(frontend_env_path, frontend_env_content):
        print(f"✅ Created frontend environment example: {frontend_env_path}")

def create_deployment_script(project_root: Path):
    """Create deployment script with environment variable support"""
    
    script_content = """#!/bin/bash
# GeoGPT-RAG Deployment Script with Dynamic Configuration

set -e

echo "🚀 Starting GeoGPT-RAG deployment with dynamic configuration..."

# Load environment variables
if [ -f .env ]; then
    echo "📋 Loading environment variables from .env"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  .env file not found. Using default values."
fi

# Set defaults if not provided
export EC2_INSTANCE_IP=${EC2_INSTANCE_IP:-localhost}
export LLM_PROVIDER=${LLM_PROVIDER:-auto}
export CONTEXT_WINDOW_SIZE=${CONTEXT_WINDOW_SIZE:-8192}

echo "🔧 Configuration:"
echo "  - EC2 Instance IP: $EC2_INSTANCE_IP"
echo "  - LLM Provider: $LLM_PROVIDER"
echo "  - Context Window: $CONTEXT_WINDOW_SIZE"

# Update frontend environment
echo "📱 Updating frontend configuration..."
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_HOST=$EC2_INSTANCE_IP
NEXT_PUBLIC_API_PROTOCOL=http
NEXT_PUBLIC_RAG_EMBEDDING_API=http://$EC2_INSTANCE_IP:8810
NEXT_PUBLIC_RAG_RERANKING_API=http://$EC2_INSTANCE_IP:8811
NEXT_PUBLIC_RAG_API=http://$EC2_INSTANCE_IP:8812
EOF

# Build and start services
echo "🐳 Starting Docker services..."
cd ..
docker-compose down --remove-orphans
docker-compose up --build -d

echo "⏳ Waiting for services to start..."
sleep 30

# Health check
echo "🏥 Performing health checks..."
for port in 8810 8811 8812; do
    if curl -s http://$EC2_INSTANCE_IP:$port/health >/dev/null 2>&1; then
        echo "✅ Service on port $port is healthy"
    else
        echo "❌ Service on port $port is not responding"
    fi
done

echo "🎉 Deployment completed!"
echo "📊 Access your GeoGPT-RAG system at:"
echo "   - Main API: http://$EC2_INSTANCE_IP:8812"
echo "   - API Docs: http://$EC2_INSTANCE_IP:8812/docs"
echo "   - Frontend: http://localhost:3000 (if running separately)"
"""
    
    script_path = project_root / "scripts" / "deploy.sh"
    if write_file(script_path, script_content):
        # Make script executable
        os.chmod(script_path, 0o755)
        print(f"✅ Created deployment script: {script_path}")

def main():
    parser = argparse.ArgumentParser(description="Configure GeoGPT-RAG environment")
    parser.add_argument("--project-root", type=str, default=".", 
                       help="Path to project root directory")
    parser.add_argument("--dry-run", action="store_true", 
                       help="Show what would be changed without making changes")
    parser.add_argument("--create-templates", action="store_true",
                       help="Create environment template files")
    
    args = parser.parse_args()
    
    project_root = Path(args.project_root).resolve()
    
    if not project_root.exists():
        print(f"❌ Project root not found: {project_root}")
        sys.exit(1)
    
    print(f"🔧 Configuring GeoGPT-RAG environment in: {project_root}")
    
    if args.create_templates:
        print("📝 Creating environment template files...")
        create_env_template(project_root)
        update_frontend_config(project_root)
        create_deployment_script(project_root)
        print("✅ Template files created successfully!")
        return
    
    total_files_updated = 0
    total_replacements = 0
    
    for relative_file_path, replacements in FILE_UPDATES.items():
        file_path = project_root / relative_file_path
        
        if not file_path.exists():
            print(f"⚠️  File not found: {file_path}")
            continue
        
        print(f"📝 Processing {relative_file_path}...")
        
        content = read_file(file_path)
        if not content:
            continue
        
        updated_content, file_replacements = replace_in_content(content, replacements)
        
        if file_replacements > 0:
            if not args.dry_run:
                if write_file(file_path, updated_content):
                    print(f"✅ Updated {relative_file_path} ({file_replacements} replacements)")
                    total_files_updated += 1
                    total_replacements += file_replacements
                else:
                    print(f"❌ Failed to update {relative_file_path}")
            else:
                print(f"🔍 Would update {relative_file_path} ({file_replacements} replacements)")
                total_replacements += file_replacements
        else:
            print(f"ℹ️  No changes needed for {relative_file_path}")
    
    print(f"\n📊 Summary:")
    print(f"  - Files updated: {total_files_updated}")
    print(f"  - Total replacements: {total_replacements}")
    
    if args.dry_run:
        print("\n🔍 This was a dry run. Use --create-templates to create template files.")
    else:
        print("\n✅ Environment configuration completed!")
        print("\n📋 Next steps:")
        print("  1. Copy .env.template to .env and update with your values")
        print("  2. Copy frontend/.env.local.example to frontend/.env.local")
        print("  3. Run ./scripts/deploy.sh to deploy with new configuration")

if __name__ == "__main__":
    main() 