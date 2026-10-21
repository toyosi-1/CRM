import { useState, useCallback, useRef } from 'react';
import { Upload, X, ImageIcon, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import {
  compressImage,
  formatFileSize,
  validateImageFile,
  type CompressionOptions,
} from '../../utils/imageCompression';

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  onCompress?: (results: Array<{ file: File; originalSize: number; compressedSize: number; reduction: number }>) => void;
  maxFiles?: number;
  compressionOptions?: CompressionOptions;
  className?: string;
}

interface CompressedFile {
  id: string;
  originalFile: File;
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  reduction: number;
  preview: string;
  status: 'compressing' | 'done' | 'error';
  error?: string;
}

export default function ImageUpload({
  onUpload,
  onCompress,
  maxFiles = 5,
  compressionOptions,
  className = '',
}: ImageUploadProps) {
  const [files, setFiles] = useState<CompressedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Check max files
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsProcessing(true);
    const newFiles: CompressedFile[] = [];

    for (const file of Array.from(selectedFiles)) {
      // Validate
      const validation = validateImageFile(file);
      if (!validation.valid) {
        newFiles.push({
          id: Math.random().toString(36).substring(7),
          originalFile: file,
          compressedFile: file,
          originalSize: file.size,
          compressedSize: file.size,
          reduction: 0,
          preview: '',
          status: 'error',
          error: validation.error,
        });
        continue;
      }

      const id = Math.random().toString(36).substring(7);
      
      // Create preview immediately
      const preview = URL.createObjectURL(file);
      
      newFiles.push({
        id,
        originalFile: file,
        compressedFile: file,
        originalSize: file.size,
        compressedSize: file.size,
        reduction: 0,
        preview,
        status: 'compressing',
      });

      setFiles(prev => [...prev, ...newFiles.filter(f => f.status === 'compressing')]);

      // Compress
      try {
        const result = await compressImage(file, compressionOptions);
        
        setFiles(prev =>
          prev.map(f =>
            f.id === id
              ? {
                  ...f,
                  compressedFile: result.file,
                  compressedSize: result.compressedSize,
                  reduction: result.reduction,
                  status: 'done',
                }
              : f
          )
        );
      } catch {
        setFiles(prev =>
          prev.map(f =>
            f.id === id
              ? { ...f, status: 'error', error: 'Compression failed' }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
    
    // Call callbacks with compressed files
    const allCompressed = [...files, ...newFiles].filter(f => f.status === 'done');
    onCompress?.(allCompressed.map(f => ({
      file: f.compressedFile,
      originalSize: f.originalSize,
      compressedSize: f.compressedSize,
      reduction: f.reduction,
    })));
    onUpload(allCompressed.map(f => f.compressedFile));
  }, [files, maxFiles, compressionOptions, onUpload, onCompress]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
  }, [files]);

  const totalSavings = files.reduce((acc, f) => acc + (f.originalSize - f.compressedSize), 0);
  const avgReduction = files.length > 0
    ? Math.round(files.reduce((acc, f) => acc + f.reduction, 0) / files.length)
    : 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragging 
            ? 'border-brand-500 bg-brand-50' 
            : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          {isProcessing ? (
            <Loader2 size={28} className="text-brand-600 animate-spin" />
          ) : (
            <Upload size={28} className="text-slate-500" />
          )}
        </div>
        
        <p className="text-sm font-semibold text-slate-700">
          {isProcessing ? 'Compressing images...' : 'Drop photos here or click to upload'}
        </p>
        <p className="text-xs text-slate-400 mt-2">
          JPG, PNG, WebP up to 20MB • Auto-compressed to ~500KB
        </p>
        <p className="text-xs text-brand-600 mt-1 font-medium">
          Saves {avgReduction > 0 ? `${avgReduction}%` : 'up to 80%'} storage space
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700">
              {files.length} {files.length === 1 ? 'file' : 'files'} ready
            </h4>
            <button
              onClick={clearAll}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  file.status === 'error' 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Preview */}
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.originalFile.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                    <ImageIcon size={20} className="text-slate-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {file.originalFile.name}
                  </p>
                  
                  {file.status === 'compressing' && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Compressing...</span>
                    </div>
                  )}
                  
                  {file.status === 'done' && (
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-slate-400 line-through">
                        {formatFileSize(file.originalSize)}
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        {formatFileSize(file.compressedSize)}
                      </span>
                      <span className="text-emerald-600">
                        ↓ {file.reduction}%
                      </span>
                    </div>
                  )}
                  
                  {file.status === 'error' && (
                    <div className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle size={12} />
                      <span>{file.error}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {file.status === 'done' && (
                  <CheckCircle size={18} className="text-emerald-500" />
                )}
                
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Total Savings */}
          {totalSavings > 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle size={18} />
                <span className="text-sm font-semibold">
                  Storage saved: {formatFileSize(totalSavings)}
                </span>
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                Images are compressed automatically before upload
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
