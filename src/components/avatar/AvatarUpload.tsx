import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Avatar } from "./Avatar";
import { 
  AvatarUploadProps, 
  MAX_FILE_SIZE, 
  ALLOWED_FILE_TYPES, 
  IMAGE_PROCESSING_DEFAULTS 
} from "./types";
import { Upload, Camera, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const AvatarUpload = ({
  onUpload,
  currentAvatarUrl,
  size = 150,
  disabled = false
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `Invalid file type. Please upload ${ALLOWED_FILE_TYPES.join(', ')} files.`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }
    
    return null;
  };

  // Process and compress image
  const processImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const { maxWidth, maxHeight, quality } = IMAGE_PROCESSING_DEFAULTS;
        
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to process image'));
            }
          },
          `image/${IMAGE_PROCESSING_DEFAULTS.format}`,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Upload file to Supabase Storage
  const uploadToStorage = async (file: File) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('🔼 [AVATAR] Starting upload process for user:', user.id);

    // Process the image
    console.log('🔼 [AVATAR] Processing image...');
    const processedBlob = await processImage(file);
    console.log('🔼 [AVATAR] Image processed successfully, size:', processedBlob.size);
    
    // Generate unique filename
    const fileExt = IMAGE_PROCESSING_DEFAULTS.format;
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    console.log('🔼 [AVATAR] Generated file path:', filePath);

    // Delete old avatar if it exists
    if (currentAvatarUrl) {
      try {
        console.log('🔼 [AVATAR] Removing old avatar:', currentAvatarUrl);
        const { error: deleteError } = await supabase.storage.from('avatars').remove([currentAvatarUrl]);
        if (deleteError) {
          console.warn('🔼 [AVATAR] Failed to delete old avatar:', deleteError);
        } else {
          console.log('🔼 [AVATAR] Old avatar removed successfully');
        }
      } catch (error) {
        console.warn('🔼 [AVATAR] Error during old avatar cleanup:', error);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new avatar
    console.log('🔼 [AVATAR] Uploading new avatar...');
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, processedBlob, {
        contentType: `image/${fileExt}`,
        upsert: true
      });

    if (uploadError) {
      console.error('🔼 [AVATAR] Upload failed:', uploadError);
      throw uploadError;
    }

    console.log('🔼 [AVATAR] Upload successful:', filePath);
    return filePath;
  };

  // Handle file upload
  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        toast({
          title: "Invalid file",
          description: validationError,
          variant: "destructive"
        });
        return;
      }

      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      setUploadProgress(25);

      // Upload to storage
      setUploadProgress(50);
      const filePath = await uploadToStorage(file);
      setUploadProgress(75);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', user?.id);

      if (updateError) {
        throw updateError;
      }

      setUploadProgress(100);
      
      // Call success callback
      onUpload(filePath);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully."
      });

      // Clean up preview
      URL.revokeObjectURL(preview);
      setPreviewUrl(null);

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
  };

  // Handle click
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, []);

  // Handle avatar removal
  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl || !user) return;

    try {
      setUploading(true);

      // Remove from storage
      await supabase.storage.from('avatars').remove([currentAvatarUrl]);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      onUpload(''); // Empty string to indicate removal
      
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed."
      });

    } catch (error: any) {
      console.error('Remove avatar error:', error);
      toast({
        title: "Failed to remove avatar",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Avatar Preview */}
      <div className="relative">
        <Avatar
          src={previewUrl || currentAvatarUrl}
          size={size}
          fallback={user?.user_metadata?.username || user?.email?.charAt(0)}
          className="border-2 border-border"
        />
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="text-white text-xs font-medium">
              {uploadProgress}%
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="w-full max-w-xs">
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!disabled ? handleClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || uploading}
        />
        
        <div className="space-y-2">
          <div className="flex justify-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {uploading ? 'Uploading...' : 'Upload a profile picture'}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag and drop or click to select (Max {MAX_FILE_SIZE / 1024 / 1024}MB)
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          onClick={handleClick}
          disabled={disabled || uploading}
          size="sm"
          variant="outline"
        >
          <Camera className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Change Photo'}
        </Button>
        
        {currentAvatarUrl && (
          <Button
            onClick={handleRemoveAvatar}
            disabled={disabled || uploading}
            size="sm"
            variant="outline"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}; 