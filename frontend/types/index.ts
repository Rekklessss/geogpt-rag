// File Management Types
export interface FileItem {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  status: 'uploading' | 'processing' | 'ready' | 'error'
  progress?: number
  error?: string
  thumbnail?: string
  embeddings?: number[]
}

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadDate: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  pages?: number
  processingProgress: number
  error?: string
}

export interface FileUploadProgress {
  fileId: string
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

// Chat Interface Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'code' | 'file' | 'thinking'
  metadata?: {
    thinking?: string
    code?: string
    codeLanguage?: string
    executionResult?: string
    sources?: DocumentSource[]
    tokens?: number
    processingTime?: number
  }
}

export interface DocumentSource {
  filename: string
  pageNumber?: number
  relevanceScore: number
  excerpt: string
  type?: 'knowledge_base' | 'web_search' | 'wikipedia' | 'analysis' | 'report'
  url?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

// RAG API Types
export interface EmbeddingRequest {
  text: string
  model?: string
}

export interface EmbeddingResponse {
  embedding: number[]
  model: string
  tokens: number
}

export interface RerankingRequest {
  query: string
  documents: string[]
  top_k?: number
}

export interface RerankingResponse {
  rankings: Array<{
    index: number
    score: number
    text: string
  }>
  query: string
  model: string
}

export interface DocumentSearchRequest {
  query: string
  fileIds?: string[]
  maxResults?: number
  threshold?: number
}

export interface DocumentSearchResponse {
  results: Array<{
    fileId: string
    filename: string
    chunks: Array<{
      text: string
      score: number
      pageNumber?: number
      metadata?: Record<string, any>
    }>
  }>
  totalResults: number
  processingTime: number
}

// GeoGPT Model Types
export interface GeoGPTRequest {
  prompt: string
  context?: string[]
  parameters?: {
    max_tokens?: number
    temperature?: number
    top_p?: number
    stream?: boolean
  }
}

export interface GeoGPTResponse {
  response: string
  thinking?: string
  code?: string
  codeLanguage?: string
  executionResult?: string
  sources?: DocumentSource[]
  tokens: {
    input: number
    output: number
    total: number
  }
  processingTime: number
}

export interface GeoGPTStreamChunk {
  type: 'thinking' | 'response' | 'code' | 'execution' | 'complete'
  content: string
  metadata?: Record<string, any>
}

// User Interface Types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system'
  primaryColor: string
  borderRadius: number
}

export interface UserPreferences {
  theme: ThemeConfig
  language: string
  autoSave: boolean
  showThumbnails: boolean
  maxFilesPerUpload: number
  defaultModel: string
}

// Application State Types
export interface AppState {
  files: FileItem[]
  chatSessions: ChatSession[]
  currentSessionId: string | null
  isLoading: boolean
  error: string | null
  preferences: UserPreferences
}

export interface FileState {
  files: FileItem[]
  uploadProgress: Record<string, FileUploadProgress>
  selectedFiles: string[]
  searchQuery: string
  sortBy: 'name' | 'size' | 'date'
  sortOrder: 'asc' | 'desc'
  viewMode: 'grid' | 'list'
}

export interface ChatState {
  sessions: ChatSession[]
  currentSessionId: string | null
  isThinking: boolean
  isStreaming: boolean
  currentMessage: string
  selectedModel: string
}

// API Error Types
export interface APIError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: Date
}

// Component Props Types
export interface BaseComponentProps {
  className?: string
  children?: import('react').ReactNode
}

export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
}

// Analytics and Monitoring Types
export interface UsageMetrics {
  totalQueries: number
  totalFiles: number
  averageResponseTime: number
  errorRate: number
  lastActive: Date
}

export interface SystemStatus {
  embeddingAPI: 'online' | 'offline' | 'error'
  rerankingAPI: 'online' | 'offline' | 'error'
  geoGPTModel: 'online' | 'offline' | 'error'
  lastChecked: Date
}

// Workflow and Chain-of-Thought Types
export interface ThoughtStep {
  id: string
  type: 'analysis' | 'search' | 'reasoning' | 'code_generation' | 'execution'
  description: string
  input: string
  output: string
  confidence: number
  timestamp: Date
}

export interface WorkflowExecution {
  id: string
  query: string
  steps: ThoughtStep[]
  finalResult: string
  success: boolean
  totalTime: number
  createdAt: Date
}

// Deep Discovery Types
export interface DiscoveryStep {
  id: number
  name: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  result?: string
  error?: string
  sources?: Array<{
    id: string
    title: string
    type: string
    relevance: number
    excerpt: string
    url?: string
    timestamp: string
  }>
}

export interface DiscoverySource {
  id: string
  title: string
  type: 'knowledge_base' | 'web_search' | 'wikipedia' | 'analysis' | 'report'
  url?: string
  relevance: number
  excerpt: string
  timestamp: string
  content?: string
} 