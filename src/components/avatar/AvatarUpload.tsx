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
import { Camera, Trash2 } from "lucide-react";

export const AvatarUpload = ({
  onUpload,
  currentAvatarUrl,
  size = 150,
  disabled = false
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
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
        // Extract the path from the full URL if needed, or use the path directly if stored that way
        // Assuming currentAvatarUrl is the file path in storage
        const oldFilePath = currentAvatarUrl.startsWith('http') 
          ? new URL(currentAvatarUrl).pathname.split('/').slice(3).join('/') // Adjust if your URL structure is different
          : currentAvatarUrl;

        if (oldFilePath) {
          const { error: deleteError } = await supabase.storage.from('avatars').remove([oldFilePath]);
          if (deleteError) {
            console.warn('🔼 [AVATAR] Failed to delete old avatar:', deleteError);
          } else {
            console.log('🔼 [AVATAR] Old avatar removed successfully');
          }
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
        upsert: true // Consider if upsert is truly needed if old one is deleted. Might be safer.
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

  // Handle click to trigger file input
  const handleClick = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  // Handle avatar removal
  const handleRemoveAvatar = async () => {
    if (!currentAvatarUrl || !user) return;

    try {
      setUploading(true);
      
      // Assuming currentAvatarUrl is the file path. If it's a full URL, extract the path.
      const filePathToRemove = currentAvatarUrl.startsWith('http')
        ? new URL(currentAvatarUrl).pathname.split('/').slice(3).join('/') // Adjust if URL structure differs
        : currentAvatarUrl;

      if (filePathToRemove) {
        // Remove from storage
        const { error: deleteError } = await supabase.storage.from('avatars').remove([filePathToRemove]);
        if (deleteError) {
            console.warn('🔼 [AVATAR] Failed to delete avatar from storage during removal:', deleteError);
            // Decide if to throw or just warn. For now, we'll try to update DB anyway.
        }
      }


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

    } catch (error: any)
     {
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
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_FILE_TYPES.join(',')}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Avatar Preview */}
      <div className="relative">
        <Avatar
          src={previewUrl || currentAvatarUrl}
          size={size}
          fallback={user?.user_metadata?.username || user?.email?.charAt(0)}
          className="border-2 border-border"
        />
        
        {uploading && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="text-white text-xs font-medium">
              {uploadProgress}%
            </div>
          </div>
        )}
      </div>

      {/* Upload Progress Bar (shown during actual upload, not just preview) */}
      {uploading && uploadProgress > 0 && (
        <div className="w-full max-w-[100px]"> {/* Adjusted width to be smaller */}
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          onClick={handleClick}
          disabled={disabled || uploading}
          size="sm"
          variant="outline"
          aria-label="Change profile photo"
        >
          <Camera className="h-4 w-4 mr-2" />
          {uploading && uploadProgress > 0 ? 'Uploading...' : 'Change Photo'}
        </Button>
        
        {currentAvatarUrl && (
          <Button
            onClick={handleRemoveAvatar}
            disabled={disabled || uploading}
            size="sm"
            variant="outline"
            aria-label="Remove profile photo"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};