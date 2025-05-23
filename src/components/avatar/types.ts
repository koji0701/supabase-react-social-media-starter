export interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: number | string;
  className?: string;
  fallback?: string;
  userId?: string;
}

export interface AvatarUploadProps {
  onUpload: (filePath: string) => void;
  currentAvatarUrl?: string | null;
  size?: number;
  disabled?: boolean;
}

export interface ImageProcessingOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
}

export const DEFAULT_AVATAR_SIZE = 40;
export const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const IMAGE_PROCESSING_DEFAULTS: ImageProcessingOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.8,
  format: 'jpeg'
}; 