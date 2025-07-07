"use client"

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  Search, 
  File, 
  Trash2, 
  Eye, 
  Grid, 
  List,
  Filter,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatFileSize, getFileIcon, formatRelativeTime } from '@/lib/utils'
import type { FileItem } from '@/types'

interface FileLibraryProps {
  selectedFiles: string[]
  onFileSelect: (fileIds: string[]) => void
  className?: string
}

// Mock file data - in real app this would come from your backend
const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'Geospatial_Analysis_Report.pdf',
    size: 2048576,
    type: 'application/pdf',
    uploadedAt: new Date(Date.now() - 86400000),
    status: 'ready'
  },
  {
    id: '2',
    name: 'City_Planning_Data.xlsx',
    size: 1024000,
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: new Date(Date.now() - 172800000),
    status: 'ready'
  },
  {
    id: '3',
    name: 'Satellite_Images.zip',
    size: 15728640,
    type: 'application/zip',
    uploadedAt: new Date(Date.now() - 259200000),
    status: 'processing',
    progress: 65
  }
]

export function FileLibrary({ selectedFiles, onFileSelect, className }: FileLibraryProps) {
  const [files, setFiles] = useState<FileItem[]>(mockFiles)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showUploadZone, setShowUploadZone] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Handle file upload
    acceptedFiles.forEach(file => {
      const newFile: FileItem = {
        id: Date.now().toString() + Math.random().toString(36),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        status: 'uploading',
        progress: 0
      }
      
      setFiles(prev => [newFile, ...prev])
      
      // Simulate upload progress
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 30
        if (progress >= 100) {
          clearInterval(interval)
          setFiles(prev => prev.map(f => 
            f.id === newFile.id 
              ? { ...f, status: 'ready', progress: undefined }
              : f
          ))
        } else {
          setFiles(prev => prev.map(f => 
            f.id === newFile.id 
              ? { ...f, progress }
              : f
          ))
        }
      }, 500)
    })
    setShowUploadZone(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 50,
    maxSize: 104857600 // 100MB
  })

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleFileSelection = (fileId: string) => {
    if (selectedFiles.includes(fileId)) {
      onFileSelect(selectedFiles.filter(id => id !== fileId))
    } else {
      onFileSelect([...selectedFiles, fileId])
    }
  }

  const getStatusIcon = (file: FileItem) => {
    switch (file.status) {
      case 'uploading':
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-card", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Document Library</h2>
          <Button
            size="sm"
            onClick={() => setShowUploadZone(!showUploadZone)}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Files
          </Button>
        </div>
        
        {/* Search and Controls */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {filteredFiles.length} files
            </span>
            <div className="flex items-center space-x-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="h-8 w-8"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8"
              >
                <Grid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      {showUploadZone && (
        <div className="p-4 border-b bg-muted/50">
          <div
            {...getRootProps()}
            className={cn(
              "upload-dropzone",
              isDragActive && "dragover"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              {isDragActive ? "Drop files here..." : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOC, XLSX, TXT • Max 100MB • Up to 50 files
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUploadZone(false)}
            className="mt-2 w-full"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <File className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first document to get started with GeoGPT analysis
            </p>
            <Button onClick={() => setShowUploadZone(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </div>
        ) : (
          <div className="p-2">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "group relative p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm mb-2",
                  selectedFiles.includes(file.id) 
                    ? "bg-primary/10 border-primary" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => toggleFileSelection(file.id)}
              >
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{getFileIcon(file.name)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium truncate">{file.name}</h4>
                      {getStatusIcon(file)}
                    </div>
                    
                    <div className="flex items-center space-x-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(file.uploadedAt)}</span>
                    </div>
                    
                    {file.status === 'processing' && file.progress && (
                      <div className="w-full bg-muted rounded-full h-1 mt-2">
                        <div 
                          className="bg-primary h-1 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Handle preview
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFiles(prev => prev.filter(f => f.id !== file.id))
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {selectedFiles.includes(file.id) && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Files Footer */}
      {selectedFiles.length > 0 && (
        <div className="p-4 border-t bg-muted/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFileSelect([])}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 