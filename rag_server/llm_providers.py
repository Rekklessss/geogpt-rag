"""
Dynamic LLM Provider System for GeoGPT-RAG
Supports OpenAI API and AWS Sagemaker with automatic fallback
"""

import os
import json
import logging
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import boto3
import openai
from litellm import completion
import litellm

# Configure logging
logger = logging.getLogger(__name__)

class LLMProvider(Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    SAGEMAKER = "sagemaker" 
    AUTO = "auto"

class LLMModel(Enum):
    """Supported LLM models"""
    # OpenAI models (ordered by cost - cheapest first)
    GPT_4_1_NANO = "gpt-4.1-nano-2025-04-14"        # Cheapest: Latest nano model
    GPT_4_1_MINI = "gpt-4.1-mini-2025-04-14"        # Budget: Latest mini model
    GPT_4O_MINI = "gpt-4o-mini-2024-07-18"          # Mid-range: Specific 4o mini version
    GPT_4_TURBO = "gpt-4-turbo"                      # Premium: $10/$30 per 1M tokens
    GPT_4 = "gpt-4"                                  # Expensive: $30/$60 per 1M tokens
    
    # Sagemaker model
    GEOGPT_R1 = "geogpt-r1-sagemaker"

@dataclass
class LLMConfig:
    """Configuration for LLM providers"""
    provider: LLMProvider
    model: LLMModel
    api_key: Optional[str] = None
    endpoint: Optional[str] = None
    region: Optional[str] = None
    temperature: float = 0.7
    top_p: float = 0.95
    timeout: int = 30
    max_retries: int = 3

class LLMProviderManager:
    """Manages multiple LLM providers with automatic fallback"""
    
    def __init__(self):
        self.providers = self._initialize_providers()
        self.current_provider = self._determine_primary_provider()
        self.fallback_providers = self._setup_fallback_chain()
        
        # Configure LiteLLM
        litellm.set_verbose = logger.level <= logging.DEBUG
        
    def _initialize_providers(self) -> Dict[LLMProvider, LLMConfig]:
        """Initialize all available LLM providers based on environment variables"""
        providers = {}
        
        # OpenAI Configuration - Using cheapest models for cost optimization
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            # Allow model selection via environment variable
            model_name = os.getenv("LLM_MODEL", "gpt-4.1-nano-2025-04-14").lower()
            
            # Map model names to enum values
            model_mapping = {
                "gpt-4.1-nano-2025-04-14": LLMModel.GPT_4_1_NANO,
                "gpt-4.1-mini-2025-04-14": LLMModel.GPT_4_1_MINI,
                "gpt-4o-mini-2024-07-18": LLMModel.GPT_4O_MINI,
                "nano": LLMModel.GPT_4_1_NANO,  # Short aliases
                "mini": LLMModel.GPT_4_1_MINI,
                "4o-mini": LLMModel.GPT_4O_MINI
            }
            
            selected_model = model_mapping.get(model_name, LLMModel.GPT_4_1_NANO)
            
            providers[LLMProvider.OPENAI] = LLMConfig(
                provider=LLMProvider.OPENAI,
                model=selected_model,
                api_key=openai_key,
                temperature=float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
            )
            logger.info(f"OpenAI provider configured with model: {selected_model.value} for cost optimization")
        
        # AWS Sagemaker Configuration
        sagemaker_endpoint = os.getenv("SAGEMAKER_ENDPOINT", "GeoGPT-R1-Sagemaker-Endpoint")
        aws_region = os.getenv("AWS_REGION", "us-east-1")
        if sagemaker_endpoint:
            providers[LLMProvider.SAGEMAKER] = LLMConfig(
                provider=LLMProvider.SAGEMAKER,
                model=LLMModel.GEOGPT_R1,
                endpoint=sagemaker_endpoint,
                region=aws_region,
                temperature=float(os.getenv("SAGEMAKER_TEMPERATURE", "0.7"))
            )
            logger.info("Sagemaker provider configured")
            
        if not providers:
            raise ValueError("No LLM providers configured. Set OPENAI_API_KEY or configure Sagemaker.")
            
        return providers
    
    def _determine_primary_provider(self) -> LLMProvider:
        """Determine primary provider based on environment variable or availability"""
        preferred = os.getenv("LLM_PROVIDER", "auto").lower()
        
        if preferred == "auto":
            # Auto mode: strongly prefer OpenAI cheapest models for cost optimization
            if LLMProvider.OPENAI in self.providers:
                logger.info("Auto mode: Using OpenAI GPT-4.1 Nano for maximum cost savings")
                return LLMProvider.OPENAI
            elif LLMProvider.SAGEMAKER in self.providers:
                logger.info("Auto mode: Falling back to Sagemaker (OpenAI not available)")
                return LLMProvider.SAGEMAKER
        elif preferred == "openai" and LLMProvider.OPENAI in self.providers:
            logger.info("Using OpenAI as explicitly requested")
            return LLMProvider.OPENAI
        elif preferred == "sagemaker" and LLMProvider.SAGEMAKER in self.providers:
            logger.info("Using Sagemaker as explicitly requested")
            return LLMProvider.SAGEMAKER
            
        # Default to first available provider
        logger.warning("Using first available provider as fallback")
        return list(self.providers.keys())[0]
    
    def _setup_fallback_chain(self) -> List[LLMProvider]:
        """Setup fallback provider chain"""
        fallbacks = []
        for provider in self.providers.keys():
            if provider != self.current_provider:
                fallbacks.append(provider)
        return fallbacks
    
    def _call_openai(self, messages: List[Dict], config: LLMConfig, **kwargs) -> str:
        """Call OpenAI API using LiteLLM"""
        try:
            # Prepare parameters, avoiding conflicts with kwargs
            params = {
                'model': config.model.value,
                'messages': messages,
                'api_key': config.api_key,
                'temperature': config.temperature,
                'top_p': config.top_p,
                'timeout': config.timeout
            }
            
            # Merge with kwargs, letting kwargs override
            params.update(kwargs)
            
            response = completion(**params)
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise
    
    def _call_sagemaker(self, messages: List[Dict], config: LLMConfig, **kwargs) -> str:
        """Call AWS Sagemaker endpoint"""
        try:
            # Initialize AWS session
            session = boto3.Session()
            runtime = session.client('sagemaker-runtime', region_name=config.region)
            
            # Convert messages to prompt for Sagemaker
            prompt = self._messages_to_prompt(messages)
            
            # Prepare payload
            payload = {
                "inputs": prompt,
                "parameters": {
                    "temperature": config.temperature,
                    "top_p": config.top_p,
                    "max_new_tokens": 2048,  # Fixed value since we removed config.max_tokens
                    "do_sample": True
                }
            }
            
            # Call Sagemaker endpoint
            response = runtime.invoke_endpoint(
                EndpointName=config.endpoint,
                ContentType='application/json',
                Body=json.dumps(payload)
            )
            
            # Parse response
            result = json.loads(response['Body'].read().decode())
            
            # Extract generated text
            if isinstance(result, list) and len(result) > 0:
                if isinstance(result[0], dict):
                    generated_text = result[0].get('generated_text', '')
                else:
                    generated_text = str(result[0])
            elif isinstance(result, dict):
                generated_text = result.get('generated_text', result.get('outputs', ''))
            else:
                generated_text = str(result)
                
            # Clean up the response (remove the input prompt if echoed)
            if generated_text.startswith(prompt):
                generated_text = generated_text[len(prompt):].strip()
                
            return generated_text
            
        except Exception as e:
            logger.error(f"Sagemaker API call failed: {e}")
            raise
    
    def _messages_to_prompt(self, messages: List[Dict]) -> str:
        """Convert OpenAI-style messages to a single prompt for Sagemaker"""
        prompt_parts = []
        
        for message in messages:
            role = message.get('role', '')
            content = message.get('content', '')
            
            if role == 'system':
                prompt_parts.append(f"System: {content}")
            elif role == 'user':
                prompt_parts.append(f"Human: {content}")
            elif role == 'assistant':
                prompt_parts.append(f"Assistant: {content}")
                
        prompt_parts.append("Assistant:")
        return "\n\n".join(prompt_parts)
    
    def generate(self, 
                messages_or_prompt: Union[List[Dict], str], 
                provider: Optional[LLMProvider] = None,
                enable_fallback: bool = True,
                **kwargs) -> Union[Dict[str, Any], str]:
        """
        Generate response using specified provider with automatic fallback
        
        Args:
            messages_or_prompt: OpenAI-style messages format or simple string prompt
            provider: Specific provider to use (None for primary)
            enable_fallback: Whether to use fallback providers on failure
            **kwargs: Additional parameters for the LLM call
            
        Returns:
            Dict containing response, provider used, and metadata (or just string if prompt input)
        """
        # Convert string prompt to messages format if needed
        if isinstance(messages_or_prompt, str):
            messages = [{"role": "user", "content": messages_or_prompt}]
            return_string_only = True
        else:
            messages = messages_or_prompt
            return_string_only = False
            
        target_provider = provider or self.current_provider
        providers_to_try = [target_provider]
        
        if enable_fallback:
            providers_to_try.extend(self.fallback_providers)
            
        last_error = None
        
        for attempt_provider in providers_to_try:
            if attempt_provider not in self.providers:
                continue
                
            config = self.providers[attempt_provider]
            start_time = time.time()
            
            try:
                logger.info(f"Attempting LLM call with provider: {attempt_provider.value}")
                
                if attempt_provider == LLMProvider.OPENAI:
                    response = self._call_openai(messages, config, **kwargs)
                elif attempt_provider == LLMProvider.SAGEMAKER:
                    response = self._call_sagemaker(messages, config, **kwargs)
                else:
                    raise ValueError(f"Unsupported provider: {attempt_provider}")
                
                processing_time = time.time() - start_time
                
                # Calculate token counts (approximate for Sagemaker)
                input_tokens = sum(len(msg.get('content', '').split()) for msg in messages)
                output_tokens = len(response.split())
                
                result = {
                    "response": response,
                    "provider_used": attempt_provider.value,
                    "model_used": config.model.value,
                    "processing_time": processing_time,
                    "tokens": {
                        "input": input_tokens,
                        "output": output_tokens,
                        "total": input_tokens + output_tokens
                    },
                    "success": True
                }
                
                logger.info(f"LLM call successful with {attempt_provider.value} in {processing_time:.2f}s")
                
                # Return just the response string if called with string prompt
                if return_string_only:
                    return response
                else:
                    return result
                
            except Exception as e:
                last_error = e
                logger.warning(f"Provider {attempt_provider.value} failed: {e}")
                continue
        
        # All providers failed
        logger.error(f"All LLM providers failed. Last error: {last_error}")
        raise Exception(f"All LLM providers failed. Last error: {last_error}")
    
    def get_available_providers(self) -> List[str]:
        """Get list of available provider names"""
        return [provider.value for provider in self.providers.keys()]
    
    def get_current_provider(self) -> str:
        """Get current primary provider name"""
        return self.current_provider.value
    
    def set_primary_provider(self, provider_name: str) -> bool:
        """Set primary provider by name"""
        try:
            provider = LLMProvider(provider_name.lower())
            if provider in self.providers:
                self.current_provider = provider
                self.fallback_providers = self._setup_fallback_chain()
                logger.info(f"Primary provider changed to: {provider_name}")
                return True
        except ValueError:
            pass
        
        logger.error(f"Invalid or unavailable provider: {provider_name}")
        return False
    
    def health_check(self) -> Dict[str, Any]:
        """Perform health check on all providers"""
        health_status = {}
        
        for provider, config in self.providers.items():
            try:
                # Test with a simple message
                test_messages = [{"role": "user", "content": "Test"}]
                result = self.generate(test_messages, provider=provider, enable_fallback=False)
                health_status[provider.value] = {
                    "status": "healthy",
                    "model": config.model.value,
                    "response_time": result.get("processing_time", 0)
                }
            except Exception as e:
                health_status[provider.value] = {
                    "status": "unhealthy",
                    "error": str(e),
                    "model": config.model.value
                }
        
        return health_status

# Global instance
llm_manager = None

def get_llm_manager() -> LLMProviderManager:
    """Get global LLM manager instance (singleton pattern)"""
    global llm_manager
    if llm_manager is None:
        llm_manager = LLMProviderManager()
    return llm_manager

def llm_generate(prompt: str, **kwargs) -> str:
    """
    Legacy compatibility function for existing code
    Converts simple prompt to messages format and returns just the response text
    """
    messages = [{"role": "user", "content": prompt}]
    manager = get_llm_manager()
    result = manager.generate(messages, **kwargs)
    return result["response"] 