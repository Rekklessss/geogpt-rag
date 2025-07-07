# GeoGPT Frontend Integration Guide

## Overview

This guide explains how to integrate with the GeoGPT API from frontend applications. The API provides advanced geospatial chat, deep discovery research, and secure code execution capabilities.

## API Base URLs

**Production Environment:**
- **Main API**: `http://3.234.222.18:8812`
- **Embedding Service**: `http://3.234.222.18:8810` 
- **Reranking Service**: `http://3.234.222.18:8811`

**Local Development:**
- **Main API**: `http://localhost:8812`
- **Embedding Service**: `http://localhost:8810`
- **Reranking Service**: `http://localhost:8811`

## Core API Endpoints

### 1. Health Check

Monitor system health across all services.

```javascript
// Check API health
const checkHealth = async () => {
  try {
    const response = await fetch('http://3.234.222.18:8812/health');
    const health = await response.json();
    
    console.log('System Status:', health.status);
    console.log('Services:', health.services);
    
    return health.status === 'online';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};
```

### 2. Chat Interface

Advanced chat with RAG integration and web search.

```javascript
// Basic chat request
const chatWithGeoGPT = async (message, options = {}) => {
  const payload = {
    message: message,
    include_thinking: options.thinking || true,
    include_sources: options.sources || true,
    use_web_search: options.webSearch || false,
    max_context_length: options.contextLength || 4000
  };
  
  try {
    const response = await fetch('http://3.234.222.18:8812/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      response: result.response,
      thinking: result.thinking,
      sources: result.sources,
      processingTime: result.processing_time,
      tokens: result.tokens
    };
  } catch (error) {
    console.error('Chat request failed:', error);
    throw error;
  }
};

// Usage example
const handleChatSubmit = async (userMessage) => {
  try {
    const result = await chatWithGeoGPT(userMessage, {
      thinking: true,
      sources: true,
      webSearch: true
    });
    
    // Display response
    displayMessage(result.response, 'assistant');
    
    // Show sources if available
    if (result.sources?.length > 0) {
      displaySources(result.sources);
    }
    
    // Show thinking process if available
    if (result.thinking) {
      displayThinking(result.thinking);
    }
    
  } catch (error) {
    displayError('Failed to get response. Please try again.');
  }
};
```

### 3. Deep Discovery Research

Comprehensive multi-step research process.

```javascript
// Start discovery process
const startDiscovery = async (query, maxSteps = 5) => {
  const payload = {
    query: query,
    max_steps: maxSteps,
    include_web_search: true,
    include_knowledge_base: true
  };
  
  try {
    const response = await fetch('http://3.234.222.18:8812/discovery/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const discovery = await response.json();
    return discovery.discovery_id;
  } catch (error) {
    console.error('Failed to start discovery:', error);
    throw error;
  }
};

// Monitor discovery progress
const monitorDiscovery = async (discoveryId, onProgress) => {
  const maxAttempts = 60; // 5 minutes max
  let attempt = 0;
  
  const checkProgress = async () => {
    try {
      const response = await fetch(`http://3.234.222.18:8812/discovery/${discoveryId}`);
      const status = await response.json();
      
      // Call progress callback
      onProgress(status);
      
      if (status.status === 'completed') {
        return status;
      } else if (status.status === 'error') {
        throw new Error('Discovery process failed');
      } else if (attempt >= maxAttempts) {
        throw new Error('Discovery process timed out');
      }
      
      attempt++;
      
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      return checkProgress();
      
    } catch (error) {
      console.error('Discovery monitoring failed:', error);
      throw error;
    }
  };
  
  return checkProgress();
};

// Complete discovery workflow
const runDiscoveryResearch = async (query) => {
  try {
    // Start discovery
    const discoveryId = await startDiscovery(query);
    
    // Monitor progress with UI updates
    const result = await monitorDiscovery(discoveryId, (status) => {
      updateProgressBar(status.progress);
      updateCurrentStep(status.current_step, status.steps);
    });
    
    // Display final report
    displayDiscoveryReport(result.final_report);
    displayDiscoverySources(result.sources);
    
    return result;
  } catch (error) {
    displayError('Discovery research failed. Please try again.');
    throw error;
  }
};
```

### 4. Code Execution

Secure sandboxed code execution.

```javascript
// Execute code
const executeCode = async (code, language = 'python', timeout = 30) => {
  const payload = {
    code: code,
    language: language,
    timeout: timeout,
    allow_network: false
  };
  
  try {
    const response = await fetch('http://3.234.222.18:8812/code/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    const execution = await response.json();
    return execution.execution_id;
  } catch (error) {
    console.error('Code execution failed:', error);
    throw error;
  }
};

// Monitor execution
const monitorExecution = async (executionId) => {
  const maxAttempts = 30; // 1 minute max
  let attempt = 0;
  
  const checkStatus = async () => {
    try {
      const response = await fetch(`http://3.234.222.18:8812/code/execution/${executionId}`);
      const status = await response.json();
      
      if (status.status === 'completed' || status.status === 'error' || status.status === 'timeout') {
        return status;
      }
      
      if (attempt >= maxAttempts) {
        throw new Error('Execution monitoring timed out');
      }
      
      attempt++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      return checkStatus();
      
    } catch (error) {
      console.error('Execution monitoring failed:', error);
      throw error;
    }
  };
  
  return checkStatus();
};

// Complete code execution workflow
const runCode = async (code) => {
  try {
    const executionId = await executeCode(code);
    const result = await monitorExecution(executionId);
    
    if (result.status === 'completed') {
      displayCodeOutput(result.output);
      displayExecutionStats(result.execution_time, result.exit_code);
    } else {
      displayCodeError(result.error);
    }
    
    return result;
  } catch (error) {
    displayError('Code execution failed. Please try again.');
    throw error;
  }
};
```

## Frontend Integration Patterns

### React Integration Example

```jsx
import React, { useState, useEffect } from 'react';

const GeoGPTChat = () => {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);

  // Check system health on component mount
  useEffect(() => {
    checkHealth().then(setSystemHealth);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { role: 'user', content: message };
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const result = await chatWithGeoGPT(message, {
        thinking: true,
        sources: true,
        webSearch: true
      });

      const assistantMessage = {
        role: 'assistant',
        content: result.response,
        thinking: result.thinking,
        sources: result.sources,
        metadata: {
          processingTime: result.processingTime,
          tokens: result.tokens
        }
      };

      setConversation(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'error',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="geogpt-chat">
      {/* System health indicator */}
      <div className={`health-indicator ${systemHealth ? 'online' : 'offline'}`}>
        System Status: {systemHealth ? 'Online' : 'Offline'}
      </div>

      {/* Conversation display */}
      <div className="conversation">
        {conversation.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}
        {isLoading && <LoadingIndicator />}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about geospatial analysis, GIS, or any geographic topic..."
          disabled={isLoading || !systemHealth}
        />
        <button type="submit" disabled={isLoading || !systemHealth}>
          Send
        </button>
      </form>
    </div>
  );
};
```

### Vue.js Integration Example

```javascript
export default {
  data() {
    return {
      message: '',
      conversation: [],
      isLoading: false,
      systemHealth: false
    };
  },
  
  async mounted() {
    this.systemHealth = await checkHealth();
  },
  
  methods: {
    async sendMessage() {
      if (!this.message.trim()) return;
      
      this.conversation.push({
        role: 'user',
        content: this.message
      });
      
      const query = this.message;
      this.message = '';
      this.isLoading = true;
      
      try {
        const result = await chatWithGeoGPT(query, {
          thinking: true,
          sources: true,
          webSearch: true
        });
        
        this.conversation.push({
          role: 'assistant',
          content: result.response,
          thinking: result.thinking,
          sources: result.sources
        });
      } catch (error) {
        this.conversation.push({
          role: 'error',
          content: 'Failed to get response. Please try again.'
        });
      } finally {
        this.isLoading = false;
      }
    }
  }
};
```

## Error Handling

### Common Error Scenarios

```javascript
const handleAPIError = (error, response) => {
  switch (response?.status) {
    case 503:
      return 'System is temporarily unavailable. Please try again later.';
    case 404:
      return 'The requested operation was not found.';
    case 408:
      return 'Request timed out. Please try again.';
    case 400:
      return 'Invalid request. Please check your input.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

// Robust request wrapper
const apiRequest = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = new Error(handleAPIError(null, response));
      error.status = response.status;
      throw error;
    }
    
    return response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};
```

## Performance Optimization

### Request Caching
```javascript
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const cachedRequest = async (key, requestFn) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await requestFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};
```

### Request Debouncing
```javascript
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const debouncedSearch = debounce(async (query) => {
  if (query.length > 2) {
    await chatWithGeoGPT(query);
  }
}, 300);
```

## CORS Configuration

The API is configured to accept requests from any origin during development. For production, ensure your frontend domain is properly configured.

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Chat**: 60 requests per minute
- **Discovery**: 10 requests per hour
- **Code Execution**: 30 requests per hour

## WebSocket Integration (Future)

For real-time updates during discovery and code execution, consider implementing WebSocket connections:

```javascript
// Future WebSocket implementation
const ws = new WebSocket('ws://3.234.222.18:8812/ws');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  handleRealtimeUpdate(update);
};
```

## Testing Frontend Integration

Use the provided test endpoints:

```javascript
// Test all endpoints
const testIntegration = async () => {
  try {
    // Test health
    const health = await checkHealth();
    console.log('Health check:', health);
    
    // Test chat
    const chat = await chatWithGeoGPT('What is GIS?');
    console.log('Chat test:', chat);
    
    // Test discovery
    const discoveryId = await startDiscovery('Remote sensing applications');
    console.log('Discovery started:', discoveryId);
    
    // Test code execution
    const executionId = await executeCode('print("Hello, GeoGPT!")');
    console.log('Code execution started:', executionId);
    
    console.log('All integrations working!');
  } catch (error) {
    console.error('Integration test failed:', error);
  }
};
```

## Security Considerations

1. **API Key Management**: While the current API doesn't require keys, implement proper authentication for production
2. **Input Validation**: Always validate user inputs before sending to the API
3. **XSS Protection**: Sanitize any content received from the API before displaying
4. **Rate Limiting**: Implement client-side rate limiting to prevent abuse
5. **Error Handling**: Never expose sensitive error details to end users

## Support

For frontend integration support:
- Check API health endpoints first
- Review browser console for network errors
- Test with curl commands to isolate frontend vs API issues
- Monitor API logs for detailed error information 