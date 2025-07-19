"""
Dynamic Instance Configuration Management for GeoGPT-RAG
Handles EC2 instance details, API endpoints, and dynamic configurations
"""

import os
import json
import logging
from typing import Dict, Optional, Any
from dataclasses import dataclass, asdict
import requests

logger = logging.getLogger(__name__)

@dataclass
class InstanceConfig:
    """Configuration for EC2 instance and API endpoints"""
    # Instance details
    ec2_instance_ip: str
    ec2_instance_id: Optional[str] = None
    ec2_region: str = "us-east-1"
    
    # API endpoints
    embedding_port: int = 8810
    reranking_port: int = 8811
    main_api_port: int = 8812
    
    # Service URLs (auto-generated)
    embedding_url: Optional[str] = None
    reranking_url: Optional[str] = None
    api_base_url: Optional[str] = None
    
    # Frontend configuration
    frontend_url: str = "http://localhost:3000"
    
    # Database configuration
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "geogpt_spatial"
    postgres_user: str = "geogpt"
    postgres_password: Optional[str] = None
    
    # Redis configuration
    redis_url: str = "redis://localhost:6379"
    
    def __post_init__(self):
        """Auto-generate service URLs after initialization"""
        self.embedding_url = f"http://{self.ec2_instance_ip}:{self.embedding_port}"
        self.reranking_url = f"http://{self.ec2_instance_ip}:{self.reranking_port}"
        self.api_base_url = f"http://{self.ec2_instance_ip}:{self.main_api_port}"

class InstanceConfigManager:
    """Manages dynamic instance configuration"""
    
    def __init__(self):
        self.config = self._load_configuration()
        self._validate_configuration()
    
    def _load_configuration(self) -> InstanceConfig:
        """Load configuration from environment variables"""
        # Try to get EC2 instance IP from environment
        ec2_ip = os.getenv("EC2_INSTANCE_IP")
        
        # If not set, try to auto-detect from EC2 metadata (if running on EC2)
        if not ec2_ip:
            ec2_ip = self._auto_detect_ec2_ip()
        
        # Fallback to current production instance for deployment
        if not ec2_ip:
            ec2_ip = "3.236.251.69"  # Current production EC2 instance
            logger.info("Using current production EC2 instance IP as fallback")
        
        config = InstanceConfig(
            ec2_instance_ip=ec2_ip,
            ec2_instance_id=os.getenv("EC2_INSTANCE_ID"),
            ec2_region=os.getenv("AWS_REGION", "us-east-1"),
            embedding_port=int(os.getenv("EMBEDDING_PORT", "8810")),
            reranking_port=int(os.getenv("RERANKING_PORT", "8811")),
            main_api_port=int(os.getenv("MAIN_API_PORT", "8812")),
            frontend_url=os.getenv("FRONTEND_URL", "http://localhost:3000"),
            postgres_host=os.getenv("POSTGRES_HOST", "localhost"),
            postgres_port=int(os.getenv("POSTGRES_PORT", "5432")),
            postgres_db=os.getenv("POSTGRES_DB", "geogpt_spatial"),
            postgres_user=os.getenv("POSTGRES_USER", "geogpt"),
            postgres_password=os.getenv("POSTGRES_PASSWORD"),
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379")
        )
        
        logger.info(f"Loaded configuration with EC2 IP: {config.ec2_instance_ip}")
        return config
    
    def _auto_detect_ec2_ip(self) -> Optional[str]:
        """Auto-detect EC2 instance IP from metadata service"""
        try:
            # Try EC2 metadata service to get public IP
            response = requests.get(
                "http://169.254.169.254/latest/meta-data/public-ipv4",
                timeout=5
            )
            if response.status_code == 200:
                public_ip = response.text.strip()
                logger.info(f"Auto-detected EC2 public IP: {public_ip}")
                return public_ip
        except Exception as e:
            logger.debug(f"Could not auto-detect EC2 IP: {e}")
        
        return None
    
    def _validate_configuration(self):
        """Validate the loaded configuration"""
        if not self.config.ec2_instance_ip:
            raise ValueError("EC2_INSTANCE_IP is required")
        
        if self.config.postgres_password is None:
            logger.warning("POSTGRES_PASSWORD not set - database connections may fail")
        
        # Log configuration (excluding sensitive data)
        safe_config = asdict(self.config)
        safe_config['postgres_password'] = "***" if self.config.postgres_password else None
        logger.info(f"Instance configuration validated: {safe_config}")
    
    def get_config(self) -> InstanceConfig:
        """Get the current configuration"""
        return self.config
    
    def update_ec2_ip(self, new_ip: str) -> bool:
        """Update EC2 IP address and regenerate URLs"""
        try:
            self.config.ec2_instance_ip = new_ip
            # Regenerate URLs
            self.config.__post_init__()
            logger.info(f"Updated EC2 IP to: {new_ip}")
            return True
        except Exception as e:
            logger.error(f"Failed to update EC2 IP: {e}")
            return False
    
    def get_service_urls(self) -> Dict[str, str]:
        """Get all service URLs"""
        return {
            "embedding_url": self.config.embedding_url,
            "reranking_url": self.config.reranking_url,
            "api_base_url": self.config.api_base_url,
            "frontend_url": self.config.frontend_url
        }
    
    def get_database_config(self) -> Dict[str, Any]:
        """Get database configuration"""
        return {
            "host": self.config.postgres_host,
            "port": self.config.postgres_port,
            "database": self.config.postgres_db,
            "user": self.config.postgres_user,
            "password": self.config.postgres_password
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Check health of configured services"""
        health_status = {}
        
        urls_to_check = {
            "embedding": f"{self.config.embedding_url}/health",
            "reranking": f"{self.config.reranking_url}/health",
            "main_api": f"{self.config.api_base_url}/health"
        }
        
        for service, url in urls_to_check.items():
            try:
                response = requests.get(url, timeout=10)
                health_status[service] = {
                    "status": "healthy" if response.status_code == 200 else "unhealthy",
                    "response_code": response.status_code,
                    "url": url
                }
            except Exception as e:
                health_status[service] = {
                    "status": "unreachable",
                    "error": str(e),
                    "url": url
                }
        
        return health_status
    
    def export_config(self) -> Dict[str, Any]:
        """Export configuration for external use (e.g., frontend)"""
        return {
            "api_base_url": self.config.api_base_url,
            "embedding_url": self.config.embedding_url,
            "reranking_url": self.config.reranking_url,
            "frontend_url": self.config.frontend_url,
            "ec2_instance_ip": self.config.ec2_instance_ip,
            "ports": {
                "embedding": self.config.embedding_port,
                "reranking": self.config.reranking_port,
                "main_api": self.config.main_api_port
            }
        }

# Global instance
config_manager = None

def get_config_manager() -> InstanceConfigManager:
    """Get global configuration manager instance (singleton pattern)"""
    global config_manager
    if config_manager is None:
        config_manager = InstanceConfigManager()
    return config_manager

def get_instance_config() -> InstanceConfig:
    """Get current instance configuration"""
    return get_config_manager().get_config()

def get_service_urls() -> Dict[str, str]:
    """Get service URLs for backward compatibility"""
    return get_config_manager().get_service_urls() 