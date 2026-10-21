/**
 * Image Compression Utility
 * Compresses images before upload to reduce storage costs
 * Uses canvas-based compression (no external dependencies)
 */

export interface CompressionOptions {
  maxWidth?: number;        // Max width in pixels
  maxHeight?: number;       // Max height in pixels
  quality?: number;         // JPEG quality (0-1)
  maxSizeKB?: number;       // Target max file size in KB
  format?: 'jpeg' | 'webp' | 'png'; // Output format
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85,
  maxSizeKB: 500, // 500KB target
  format: 'jpeg',
};

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; file: File; originalSize: number; compressedSize: number; reduction: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Calculate new dimensions
          const { width, height } = calculateDimensions(img.width, img.height, opts.maxWidth!, opts.maxHeight!);
          
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          // Apply white background for JPEG (handles transparency)
          if (opts.format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }
          
          // Draw image
          ctx.drawImage(img, 0, 0, width, height);
          
          // Determine MIME type
          const mimeType = opts.format === 'webp' 
            ? 'image/webp' 
            : opts.format === 'png' 
              ? 'image/png' 
              : 'image/jpeg';
          
          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }
              
              // Create new file from blob
              const compressedFile = new File(
                [blob],
                generateFileName(file.name, opts.format!),
                { type: mimeType, lastModified: Date.now() }
              );
              
              const originalSize = file.size;
              const compressedSize = blob.size;
              const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
              
              resolve({
                blob,
                file: compressedFile,
                originalSize,
                compressedSize,
                reduction,
              });
            },
            mimeType,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  origWidth: number,
  origHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = origWidth;
  let height = origHeight;
  
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }
  
  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height);
    height = maxHeight;
  }
  
  return { width, height };
}

/**
 * Generate new filename with correct extension
 */
function generateFileName(originalName: string, format: string): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const extension = format === 'webp' ? 'webp' : format === 'png' ? 'png' : 'jpg';
  return `${baseName}_compressed.${extension}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file needs compression
 */
export function needsCompression(file: File, maxSizeKB: number = 500): boolean {
  return file.size > maxSizeKB * 1024;
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
  }
  
  // Check file size (max 20MB before compression)
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File too large. Maximum size is 20MB' };
  }
  
  return { valid: true };
}

/**
 * Batch compress multiple images
 */
export async function compressMultipleImages(
  files: File[],
  options?: CompressionOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ blob: Blob; file: File; originalSize: number; compressedSize: number; reduction: number }>> {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await compressImage(files[i], options);
    results.push(result);
    onProgress?.(i + 1, files.length);
  }
  
  return results;
}
