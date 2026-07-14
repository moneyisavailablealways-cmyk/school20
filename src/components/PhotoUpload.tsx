import React, { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X } from 'lucide-react';

interface PhotoUploadProps {
  value?: string | null;
  file?: File | null;
  onFileSelected: (file: File | null) => void;
  fallback?: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Reusable avatar/photo upload widget.
 * Parent owns the file state and handles the actual upload to storage.
 */
const PhotoUpload: React.FC<PhotoUploadProps> = ({
  value,
  file,
  onFileSelected,
  fallback = '?',
  label = 'Profile Photo',
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  React.useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);

  const displaySrc = preview || value || undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    if (f.size > 5 * 1024 * 1024) return;
    onFileSelected(f);
  };

  const clear = () => {
    onFileSelected(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-20 w-20 border-2 border-border">
        <AvatarImage src={displaySrc} alt="Profile" />
        <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
      </Avatar>
      <div className="space-y-2">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {displaySrc ? <Camera className="h-4 w-4 mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            {displaySrc ? 'Change' : 'Upload'}
          </Button>
          {(file || value) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={clear}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPG or PNG, max 5MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default PhotoUpload;
