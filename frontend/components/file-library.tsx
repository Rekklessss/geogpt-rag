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
  HardDrive
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { FileItem } from '@/types'
import { mockFiles, generateMockFileUpload } from '@/lib/mock-data'

interface FileLibraryProps {
  selectedFiles: string[]
  onFileSelect: (fileIds: string[]) => void
  className?: string
}

export function FileLibrary({ selectedFiles, onFileSelect, className }: FileLibraryProps) {
  const [files, setFiles] = useState<FileItem[]>(mockFiles)
  const [searchQuery, setSearchQuery] = useState('')

  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'status'>('date')
  const [filterType, setFilterType] = useState<string>('all')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Simulate file processing updates
  useEffect(() => {
    const interval = setInterval(() => {
      setFiles(prevFiles => 
        prevFiles.map(file => {
          if (file.status === 'processing' && (file.progress || 0) < 100) {
            const newProgress = Math.min((file.progress || 0) + Math.random() * 15, 100)
            return {
              ...file,
              progress: newProgress,
              status: newProgress >= 100 ? 'ready' : 'processing'
            }
          }
          return file
        })
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const filteredAndSortedFiles = React.useMemo(() => {
    let filtered = files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || 
        (filterType === 'pdf' && file.type.includes('pdf')) ||
        (filterType === 'excel' && file.type.includes('spreadsheet')) ||
        (filterType === 'zip' && file.type.includes('zip')) ||
        (filterType === 'doc' && file.type.includes('word'))
      
      return matchesSearch && matchesType
    })

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.size - a.size
        case 'status':
          const statusOrder = { ready: 1, processing: 2, uploading: 3, error: 4 }
          return statusOrder[a.status] - statusOrder[b.status]
        case 'date':
        default:
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      }
    })
  }, [files, searchQuery, sortBy, filterType])

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

  const handleFileUpload = async (filesToUpload: File[]) => {
    setIsUploading(true)
    
    for (const file of filesToUpload) {
      // Create mock file item
      const mockFile = generateMockFileUpload(file.name, file.size)
      setFiles(prev => [...prev, mockFile])

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 200))
        setFiles(prev => prev.map(f => 
          f.id === mockFile.id 
            ? { ...f, progress, status: progress >= 100 ? 'processing' : 'uploading' }
            : f
        ))
      }
    }
    
    setIsUploading(false)
  }

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

  const handleDeleteFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    onFileSelect(selectedFiles.filter(id => id !== fileId))
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (type.includes('spreadsheet')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    if (type.includes('zip')) return <Archive className="h-5 w-5 text-yellow-500" />
    if (type.includes('image')) return <Image className="h-5 w-5 text-blue-500" />
    return <FileText className="h-5 w-5 text-gray-500" />
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'processing':
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStorageStats = () => {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const readyFiles = files.filter(f => f.status === 'ready').length
    const processingFiles = files.filter(f => f.status === 'processing').length
    
    return { totalSize, readyFiles, processingFiles, totalFiles: files.length }
  }

  const stats = getStorageStats()

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Document Library</h2>
          </div>
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

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 text-sm bg-muted/20 rounded-lg p-3">
          <div className="flex items-center justify-center space-x-1 text-muted-foreground">
            <FileCheck className="h-4 w-4 text-green-500" />
            <span className="font-medium">{stats.readyFiles}</span>
            <span className="text-xs">Ready</span>
          </div>
          <div className="flex items-center justify-center space-x-1 text-muted-foreground">
            <HardDrive className="h-4 w-4 text-purple-500" />
            <span className="font-medium text-xs">{formatFileSize(stats.totalSize)}</span>
          </div>
          <div className="flex items-center justify-center space-x-1 text-muted-foreground">
            <FileText className="h-4 w-4 text-orange-500" />
            <span className="font-medium">{stats.totalFiles}</span>
            <span className="text-xs">Total</span>
          </div>
        </div>

        {/* Search Bar - Separate Row */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
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
            className="px-3 py-2 border rounded-md text-sm bg-background h-10 min-w-[140px]"
          >
            <option value="all">All Files</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel</option>
            <option value="zip">Archive</option>
            <option value="doc">Word</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm bg-background h-10 min-w-[140px]"
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
            <span className="text-sm font-medium">
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
            ? "border-blue-500 bg-blue-50" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
      >
        <div className="text-center">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-1">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports PDF, Excel, Word, ZIP files up to 100MB
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.docx,.doc,.zip,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* Files List/Grid */}
      <div className="flex-1 overflow-auto p-4">
        {filteredAndSortedFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">
              {searchQuery ? 'No files found' : 'No documents uploaded'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery 
                ? 'Try adjusting your search or filter criteria' 
                : 'Upload your first document to get started'
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
                    ? "ring-2 ring-primary bg-primary/10 border-primary/20" 
                    : "hover:border-muted-foreground/50"
                )}
                onClick={() => file.status === 'ready' && handleFileSelection(file.id)}
              >
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(file.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                  
                  {file.status !== 'ready' && (
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-24">
                        <Progress value={file.progress || 0} className="h-1" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {file.progress || 0}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center flex-shrink-0">
                  {file.status === 'ready' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        console.log('Download file:', file.name)
                      }}
                      className="h-6 w-6 p-0 mr-1"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteFile(file.id)
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 