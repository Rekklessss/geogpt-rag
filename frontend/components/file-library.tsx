"use client"

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { 
  Upload, 
  Search, 
  FileText, 
  Image, 
  Archive, 
  FileSpreadsheet,
  X,
  Plus,
  Trash2,
  Download,
  Eye,
  CheckCircle,
  Loader2,
  AlertCircle,
  FolderOpen,
  FileCheck,
  Clock,
  HardDrive,
  Database,
  RefreshCw,
  Settings,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

interface KnowledgeBaseFile {
  id: string
  filename: string
  path: string
  size: number
  upload_date: string
  status: 'ready' | 'processing' | 'indexing' | 'error'
  chunk_count?: number
  error_message?: string
  metadata?: {
    file_type: string
    page_count?: number
    embedding_model: string
    last_accessed?: string
  }
}

interface KnowledgeBaseStats {
  total_files: number
  total_chunks: number
  total_size: number
  index_status: 'healthy' | 'degraded' | 'rebuilding'
  last_updated: string
  embedding_model: string
  collection_name: string
  vector_count: number
}

interface ProcessingStatus {
  file_id: string
  stage: 'uploading' | 'chunking' | 'embedding' | 'indexing' | 'completed' | 'error'
  progress: number
  current_chunk?: number
  total_chunks?: number
  error_message?: string
}

interface FileLibraryProps {
  selectedFiles: string[]
  onFileSelect: (fileIds: string[]) => void
  className?: string
}

export function FileLibrary({ selectedFiles, onFileSelect, className }: FileLibraryProps) {
  const [files, setFiles] = useState<KnowledgeBaseFile[]>([])
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<Map<string, ProcessingStatus>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'status'>('date')
  const [filterType, setFilterType] = useState<string>('all')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Fetch knowledge base data
  const fetchKnowledgeBase = async () => {
    try {
      setLoading(true)
      const [filesResponse, statsResponse] = await Promise.all([
        fetch('http://54.224.133.45:8812/kb/files'),
        fetch('http://54.224.133.45:8812/kb/stats')
      ])

      if (filesResponse.ok) {
        const filesData = await filesResponse.json()
        setFiles(filesData.files || [])
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to fetch knowledge base data:', error)
      toast({
        title: "Error",
        description: "Failed to load knowledge base data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle real file upload to knowledge base
  const handleFileUpload = async (filesToUpload: File[]) => {
    setIsUploading(true)
    
    for (const file of filesToUpload) {
      const fileId = `${Date.now()}_${file.name}`
      
      // Initialize processing status
      setProcessing(prev => new Map(prev.set(fileId, {
        file_id: fileId,
        stage: 'uploading',
        progress: 0
      })))

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('max_size', '512') // Default chunk size

        const response = await fetch('http://54.224.133.45:8812/kb/upload', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const result = await response.json()
          
          // Start polling for processing status
          pollProcessingStatus(result.file_id || fileId, file.name)
          
          toast({
            title: "Upload Started",
            description: `${file.name} is being processed and indexed`,
          })
        } else {
          throw new Error(`Upload failed: ${response.statusText}`)
        }
      } catch (error) {
        console.error('Upload error:', error)
        setProcessing(prev => {
          const newMap = new Map(prev)
          newMap.set(fileId, {
            file_id: fileId,
            stage: 'error',
            progress: 0,
            error_message: error instanceof Error ? error.message : 'Upload failed'
          })
          return newMap
        })
        
        toast({
          title: "Upload Failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        })
      }
    }
    
    setIsUploading(false)
  }

  // Poll processing status
  const pollProcessingStatus = async (fileId: string, filename: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://54.224.133.45:8812/kb/status/${fileId}`)
        if (response.ok) {
          const status: ProcessingStatus = await response.json()
          
          setProcessing(prev => new Map(prev.set(fileId, status)))
          
          if (status.stage === 'completed' || status.stage === 'error') {
            clearInterval(pollInterval)
            setProcessing(prev => {
              const newMap = new Map(prev)
              newMap.delete(fileId)
              return newMap
            })
            
            if (status.stage === 'completed') {
              toast({
                title: "Processing Complete",
                description: `${filename} has been successfully indexed`,
              })
              fetchKnowledgeBase() // Refresh the file list
            } else {
              toast({
                title: "Processing Failed",
                description: `Failed to process ${filename}: ${status.error_message}`,
                variant: "destructive"
              })
            }
          }
        }
      } catch (error) {
        clearInterval(pollInterval)
        console.error('Status polling error:', error)
      }
    }, 2000)

    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000)
  }

  // Delete files from knowledge base
  const handleDeleteFiles = async (fileIds: string[]) => {
    try {
      for (const fileId of fileIds) {
        const response = await fetch(`http://54.224.133.45:8812/kb/files/${fileId}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to delete file ${fileId}`)
        }
      }
      
      toast({
        title: "Files Deleted",
        description: `${fileIds.length} file(s) removed from knowledge base`,
      })
      
      onFileSelect([]) // Clear selection
      fetchKnowledgeBase()
      
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Delete Failed",
        description: "Failed to delete selected files",
        variant: "destructive"
      })
    }
  }

  // Rebuild knowledge base index
  const handleRebuildIndex = async () => {
    try {
      const response = await fetch('http://54.224.133.45:8812/kb/rebuild', {
        method: 'POST'
      })
      
      if (response.ok) {
        toast({
          title: "Index Rebuild Started",
          description: "Knowledge base index is being rebuilt",
        })
        fetchKnowledgeBase()
      } else {
        throw new Error('Rebuild failed')
      }
    } catch (error) {
      console.error('Rebuild error:', error)
      toast({
        title: "Rebuild Failed",
        description: "Failed to rebuild knowledge base index",
        variant: "destructive"
      })
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFileUpload(droppedFiles)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(Array.from(e.target.files))
    }
  }

  const handleFileSelection = (fileId: string) => {
    const isSelected = selectedFiles.includes(fileId)
    if (isSelected) {
      onFileSelect(selectedFiles.filter(id => id !== fileId))
    } else {
      onFileSelect([...selectedFiles, fileId])
    }
  }

  const handleSelectAll = () => {
    const readyFiles = filteredAndSortedFiles
      .filter(file => file.status === 'ready')
      .map(file => file.id)
    
    if (selectedFiles.length === readyFiles.length) {
      onFileSelect([])
    } else {
      onFileSelect(readyFiles)
    }
  }

  // Filter and sort files
  const filteredAndSortedFiles = React.useMemo(() => {
    let filtered = files.filter(file => {
      const matchesSearch = file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || 
        (filterType === 'pdf' && file.filename.includes('.pdf')) ||
        (filterType === 'doc' && (file.filename.includes('.docx') || file.filename.includes('.doc'))) ||
        (filterType === 'txt' && (file.filename.includes('.txt') || file.filename.includes('.md')))
      
      return matchesSearch && matchesType
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename)
        case 'size':
          return b.size - a.size
        case 'status':
          const statusOrder = { ready: 1, processing: 2, indexing: 3, error: 4 }
          return statusOrder[a.status] - statusOrder[b.status]
        case 'date':
        default:
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
      }
    })
  }, [files, searchQuery, sortBy, filterType])

  const getFileIcon = (filename: string) => {
    if (filename.includes('.pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (filename.includes('.docx') || filename.includes('.doc')) return <FileText className="h-5 w-5 text-blue-500" />
    if (filename.includes('.txt') || filename.includes('.md')) return <FileText className="h-5 w-5 text-green-500" />
    return <FileText className="h-5 w-5 text-gray-500" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
      case 'indexing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get processing stage display
  const getProcessingStageDisplay = (stage: string) => {
    const stages = {
      uploading: 'Uploading file...',
      chunking: 'Splitting into chunks...',
      embedding: 'Generating embeddings...',
      indexing: 'Adding to index...',
      completed: 'Completed',
      error: 'Error occurred'
    }
    return stages[stage as keyof typeof stages] || stage
  }

  useEffect(() => {
    fetchKnowledgeBase()
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchKnowledgeBase, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className={cn("flex flex-col h-full bg-background items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading Knowledge Base...</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Knowledge Base</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={fetchKnowledgeBase}
              size="sm"
              variant="outline"
              className="flex items-center space-x-1"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleRebuildIndex}
              size="sm"
              variant="outline"
              className="flex items-center space-x-1"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              disabled={isUploading}
              className="flex items-center space-x-2"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Upload</span>
            </Button>
          </div>
        </div>

        {/* Knowledge Base Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 text-sm bg-muted/20 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center space-x-1 text-muted-foreground">
              <FileCheck className="h-4 w-4 text-green-500" />
              <span className="font-medium">{stats.total_files}</span>
              <span className="text-xs">Files</span>
            </div>
            <div className="flex items-center justify-center space-x-1 text-muted-foreground">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{stats.total_chunks.toLocaleString()}</span>
              <span className="text-xs">Chunks</span>
            </div>
            <div className="flex items-center justify-center space-x-1 text-muted-foreground">
              <HardDrive className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-xs">{formatFileSize(stats.total_size)}</span>
            </div>
            <div className="flex items-center justify-center space-x-1 text-muted-foreground">
              <Badge variant={stats.index_status === 'healthy' ? 'default' : 'destructive'} className="text-xs">
                {stats.index_status}
              </Badge>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {processing.size > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-foreground">Processing Files</h4>
            {Array.from(processing.values()).map((status) => (
              <div key={status.file_id} className="bg-muted p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {getProcessingStageDisplay(status.stage)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {status.progress}%
                  </Badge>
                </div>
                <Progress value={status.progress} className="h-2" />
                {status.current_chunk && status.total_chunks && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Chunk {status.current_chunk} of {status.total_chunks}
                  </p>
                )}
                {status.error_message && (
                  <p className="text-xs text-destructive mt-1">{status.error_message}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 w-full"
            />
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center justify-between mt-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm bg-background border-input text-foreground h-10 min-w-[140px]"
          >
            <option value="all">All Files</option>
            <option value="pdf">PDF</option>
            <option value="doc">Word</option>
            <option value="txt">Text</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm bg-background border-input text-foreground h-10 min-w-[140px]"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center justify-between mt-4 p-3 bg-muted/30 border rounded-lg">
            <span className="text-sm font-medium text-foreground">
              {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Button size="sm" variant="outline" onClick={() => onFileSelect([])}>
                Clear
              </Button>
              <Button size="sm" onClick={handleSelectAll}>
                {selectedFiles.length === filteredAndSortedFiles.filter(f => f.status === 'ready').length 
                  ? 'Deselect All' 
                  : 'Select All'
                }
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDeleteFiles(selectedFiles)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "mx-4 mt-4 p-6 border-2 border-dashed rounded-lg transition-colors",
          isDragOver 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <div className="text-center">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-1">
            Drag and drop files to add to knowledge base
          </p>
          <p className="text-xs text-muted-foreground">
            Supports PDF, Word, Text, Markdown files up to 100MB
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredAndSortedFiles.length === 0 ? (
          <div className="text-center py-12">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {searchQuery ? 'No files found' : 'Knowledge base is empty'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? 'Try adjusting your search or filter criteria' 
                : 'Upload documents to build your knowledge base'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center space-x-4 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                  selectedFiles.includes(file.id) 
                    ? "ring-2 ring-primary bg-primary/5 border-primary/20" 
                    : "border-border hover:border-muted-foreground/50"
                )}
                onClick={() => file.status === 'ready' && handleFileSelection(file.id)}
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.filename)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm truncate text-foreground" title={file.filename}>
                      {file.filename}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(file.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      {file.chunk_count && (
                        <span>{file.chunk_count} chunks</span>
                      )}
                      <span>{new Date(file.upload_date).toLocaleDateString()}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {file.status}
                    </Badge>
                  </div>
                  
                  {file.error_message && (
                    <p className="text-xs text-destructive mt-1">{file.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 