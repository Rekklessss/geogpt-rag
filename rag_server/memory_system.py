"""
Memory and Conversation Management System for GeoGPT-RAG
Handles context windows, conversation persistence, and session management
"""

import os
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import redis
import tiktoken
from sqlalchemy import create_engine, Column, String, Text, DateTime, Integer, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

# SQLAlchemy models
Base = declarative_base()

class ConversationSession(Base):
    __tablename__ = "conversation_sessions"
    
    session_id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    title = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    metadata = Column(JSON)

class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    
    message_id = Column(String, primary_key=True)
    session_id = Column(String, index=True)
    role = Column(String)  # user, assistant, system
    content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    tokens = Column(Integer)
    metadata = Column(JSON)

class ContextSnippet(Base):
    __tablename__ = "context_snippets"
    
    snippet_id = Column(String, primary_key=True)
    session_id = Column(String, index=True)
    content = Column(Text)
    source = Column(String)  # rag, web, file, etc.
    relevance_score = Column(Integer)
    tokens = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    metadata = Column(JSON)

@dataclass
class Message:
    """Represents a conversation message"""
    role: str  # user, assistant, system
    content: str
    timestamp: datetime
    tokens: int = 0
    metadata: Optional[Dict] = None
    message_id: Optional[str] = None
    
    def __post_init__(self):
        if not self.message_id:
            self.message_id = str(uuid.uuid4())

@dataclass
class ConversationContext:
    """Represents conversation context with token management"""
    session_id: str
    messages: List[Message]
    total_tokens: int = 0
    max_tokens: int = 8192
    context_snippets: Optional[List[Dict]] = None
    metadata: Optional[Dict] = None

class TokenCounter:
    """Token counting utilities"""
    
    def __init__(self, model_name: str = "gpt-4"):
        try:
            self.encoding = tiktoken.encoding_for_model(model_name)
        except KeyError:
            # Fallback to cl100k_base for unknown models
            self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return len(self.encoding.encode(text))
    
    def truncate_to_tokens(self, text: str, max_tokens: int) -> str:
        """Truncate text to fit within token limit"""
        tokens = self.encoding.encode(text)
        if len(tokens) <= max_tokens:
            return text
        
        truncated_tokens = tokens[:max_tokens]
        return self.encoding.decode(truncated_tokens)

class MemoryManager:
    """Manages conversation memory and context windows"""
    
    def __init__(self, 
                 postgres_url: str = None,
                 redis_url: str = None,
                 max_context_tokens: int = 8192,
                 max_conversation_history: int = 50):
        
        self.max_context_tokens = max_context_tokens
        self.max_conversation_history = max_conversation_history
        self.token_counter = TokenCounter()
        
        # Initialize PostgreSQL connection
        if postgres_url:
            try:
                self.engine = create_engine(postgres_url)
                Base.metadata.create_all(self.engine)
                self.Session = sessionmaker(bind=self.engine)
                self.postgres_enabled = True
                logger.info("PostgreSQL connection established for conversation persistence")
            except Exception as e:
                logger.error(f"Failed to connect to PostgreSQL: {e}")
                self.postgres_enabled = False
        else:
            self.postgres_enabled = False
        
        # Initialize Redis connection
        if redis_url:
            try:
                self.redis_client = redis.from_url(redis_url)
                self.redis_client.ping()
                self.redis_enabled = True
                logger.info("Redis connection established for session caching")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.redis_enabled = False
        else:
            self.redis_enabled = False
        
        # In-memory fallback
        self.memory_cache = {}
    
    def create_session(self, user_id: str = "anonymous", title: str = None) -> str:
        """Create a new conversation session"""
        session_id = str(uuid.uuid4())
        
        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "title": title or f"Conversation {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "created_at": datetime.utcnow().isoformat(),
            "messages": [],
            "metadata": {}
        }
        
        # Store in database if available
        if self.postgres_enabled:
            try:
                session = self.Session()
                conv_session = ConversationSession(
                    session_id=session_id,
                    user_id=user_id,
                    title=session_data["title"],
                    metadata=session_data["metadata"]
                )
                session.add(conv_session)
                session.commit()
                session.close()
            except Exception as e:
                logger.error(f"Failed to store session in PostgreSQL: {e}")
        
        # Cache in Redis if available
        if self.redis_enabled:
            try:
                self.redis_client.setex(
                    f"session:{session_id}",
                    3600 * 24,  # 24 hours TTL
                    json.dumps(session_data)
                )
            except Exception as e:
                logger.error(f"Failed to cache session in Redis: {e}")
        
        # In-memory fallback
        self.memory_cache[session_id] = session_data
        
        logger.info(f"Created new conversation session: {session_id}")
        return session_id
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Dict = None) -> Message:
        """Add a message to the conversation"""
        message = Message(
            role=role,
            content=content,
            timestamp=datetime.utcnow(),
            tokens=self.token_counter.count_tokens(content),
            metadata=metadata or {}
        )
        
        # Store in database if available
        if self.postgres_enabled:
            try:
                session = self.Session()
                conv_message = ConversationMessage(
                    message_id=message.message_id,
                    session_id=session_id,
                    role=message.role,
                    content=message.content,
                    tokens=message.tokens,
                    metadata=message.metadata
                )
                session.add(conv_message)
                session.commit()
                session.close()
            except Exception as e:
                logger.error(f"Failed to store message in PostgreSQL: {e}")
        
        # Update session cache
        session_data = self.get_session_data(session_id)
        if session_data:
            session_data["messages"].append(asdict(message))
            
            # Trim conversation if too long
            if len(session_data["messages"]) > self.max_conversation_history:
                session_data["messages"] = session_data["messages"][-self.max_conversation_history:]
            
            self._update_session_cache(session_id, session_data)
        
        return message
    
    def get_conversation_context(self, session_id: str, include_system_prompt: bool = True) -> ConversationContext:
        """Get conversation context optimized for token limits"""
        session_data = self.get_session_data(session_id)
        if not session_data:
            return ConversationContext(session_id=session_id, messages=[])
        
        messages = [Message(**msg) for msg in session_data["messages"]]
        
        # Calculate total tokens
        total_tokens = sum(msg.tokens for msg in messages)
        
        # If within limits, return all messages
        if total_tokens <= self.max_context_tokens * 0.8:  # Leave 20% buffer
            return ConversationContext(
                session_id=session_id,
                messages=messages,
                total_tokens=total_tokens,
                metadata=session_data.get("metadata", {})
            )
        
        # Smart truncation: keep recent messages and important context
        context_messages = []
        current_tokens = 0
        
        # Always include the most recent messages
        for message in reversed(messages):
            if current_tokens + message.tokens <= self.max_context_tokens * 0.6:
                context_messages.insert(0, message)
                current_tokens += message.tokens
            else:
                break
        
        # Add system prompt if requested and there's room
        if include_system_prompt and current_tokens < self.max_context_tokens * 0.8:
            system_prompt = Message(
                role="system",
                content="You are GeoGPT, an advanced AI assistant specialized in geospatial analysis, GIS operations, and spatial data processing.",
                timestamp=datetime.utcnow(),
                tokens=self.token_counter.count_tokens("You are GeoGPT, an advanced AI assistant specialized in geospatial analysis, GIS operations, and spatial data processing.")
            )
            context_messages.insert(0, system_prompt)
            current_tokens += system_prompt.tokens
        
        return ConversationContext(
            session_id=session_id,
            messages=context_messages,
            total_tokens=current_tokens,
            metadata=session_data.get("metadata", {})
        )
    
    def get_session_data(self, session_id: str) -> Optional[Dict]:
        """Get session data from cache or storage"""
        # Try Redis first
        if self.redis_enabled:
            try:
                cached_data = self.redis_client.get(f"session:{session_id}")
                if cached_data:
                    return json.loads(cached_data)
            except Exception as e:
                logger.error(f"Failed to get session from Redis: {e}")
        
        # Try in-memory cache
        if session_id in self.memory_cache:
            return self.memory_cache[session_id]
        
        # Try PostgreSQL
        if self.postgres_enabled:
            try:
                session = self.Session()
                conv_session = session.query(ConversationSession).filter(
                    ConversationSession.session_id == session_id
                ).first()
                
                if conv_session:
                    messages = session.query(ConversationMessage).filter(
                        ConversationMessage.session_id == session_id
                    ).order_by(ConversationMessage.timestamp).all()
                    
                    session_data = {
                        "session_id": conv_session.session_id,
                        "user_id": conv_session.user_id,
                        "title": conv_session.title,
                        "created_at": conv_session.created_at.isoformat(),
                        "messages": [
                            {
                                "message_id": msg.message_id,
                                "role": msg.role,
                                "content": msg.content,
                                "timestamp": msg.timestamp.isoformat(),
                                "tokens": msg.tokens,
                                "metadata": msg.metadata or {}
                            }
                            for msg in messages
                        ],
                        "metadata": conv_session.metadata or {}
                    }
                    
                    session.close()
                    
                    # Cache it for next time
                    self._update_session_cache(session_id, session_data)
                    return session_data
                
                session.close()
            except Exception as e:
                logger.error(f"Failed to get session from PostgreSQL: {e}")
        
        return None
    
    def _update_session_cache(self, session_id: str, session_data: Dict):
        """Update session in cache"""
        # Update Redis
        if self.redis_enabled:
            try:
                self.redis_client.setex(
                    f"session:{session_id}",
                    3600 * 24,  # 24 hours TTL
                    json.dumps(session_data)
                )
            except Exception as e:
                logger.error(f"Failed to update session in Redis: {e}")
        
        # Update in-memory cache
        self.memory_cache[session_id] = session_data
    
    def cleanup_old_sessions(self, days: int = 30):
        """Clean up old conversation sessions"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        if self.postgres_enabled:
            try:
                session = self.Session()
                
                # Delete old messages
                session.query(ConversationMessage).filter(
                    ConversationMessage.timestamp < cutoff_date
                ).delete()
                
                # Delete old sessions
                session.query(ConversationSession).filter(
                    ConversationSession.updated_at < cutoff_date
                ).delete()
                
                session.commit()
                session.close()
                logger.info(f"Cleaned up conversations older than {days} days")
            except Exception as e:
                logger.error(f"Failed to cleanup old sessions: {e}")

# Global memory manager instance
_memory_manager = None

def get_memory_manager() -> MemoryManager:
    """Get or create global memory manager instance"""
    global _memory_manager
    if _memory_manager is None:
        postgres_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        
        _memory_manager = MemoryManager(
            postgres_url=postgres_url,
            redis_url=redis_url,
            max_context_tokens=int(os.getenv("CONTEXT_WINDOW_SIZE", "8192")),
            max_conversation_history=int(os.getenv("MAX_CONVERSATION_HISTORY", "50"))
        )
    return _memory_manager 