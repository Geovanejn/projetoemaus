import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ImageCropDialog from "@/components/ImageCropDialog";
import { Upload, Trash2, Loader2, ImageIcon } from "lucide-react";

function getDisplayUrl(url: string): string {
  if (!url) return url;
  // If it's already an HTTP URL (from API response with public R2 URL), use it directly
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If it's a data URL (base64), use it directly
  if (url.startsWith('data:')) {
    return url;
  }
  // If it's an r2:// URL (raw from database), convert to proxy (fallback)
  if (url.startsWith('r2://')) {
    const key = url.replace('r2://', '');
    return `/api/r2/${key}`;
  }
  return url;
}

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  aspectRatio?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  uploadType?: string;
}

export function ImageUpload({
  value,
  onChange,
  aspectRatio = 1,
  placeholder = "Selecionar Imagem",
  className,
  disabled = false,
  uploadType,
}: ImageUploadProps) {
  const { toast } = useToast();
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-enable body scroll when file selector is opened on mobile
  useEffect(() => {
    if (isSelectingFile) {
      // Temporarily remove any scroll locks when file picker is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = '';
      
      // Reset state when window regains focus (user cancelled or selected file)
      const handleFocus = () => {
        setTimeout(() => setIsSelectingFile(false), 300);
      };
      window.addEventListener('focus', handleFocus);
      
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [isSelectingFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSelectingFile(false);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleCropComplete = async (croppedImage: string) => {
    setIsUploading(true);
    try {
      const blob = await fetch(croppedImage).then((r) => r.blob());
      const formData = new FormData();
      formData.append("file", blob, "image.jpg");

      const token = localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/upload${uploadType ? `?uploadType=${uploadType}` : ''}`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onChange(data.url);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setTempImageSrc(null);
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  const handleClick = () => {
    if (!disabled) {
      setIsSelectingFile(true);
      // Small delay to ensure state is set before file picker opens
      setTimeout(() => {
        inputRef.current?.click();
      }, 10);
    }
  };

  const isSquare = aspectRatio === 1;

  return (
    <div className={cn("w-full", className)}>
      {value ? (
        <div className="relative group">
          <div 
            className={cn(
              "overflow-hidden rounded-md border border-border bg-muted",
              isSquare ? "aspect-square max-w-[200px]" : "aspect-video"
            )}
          >
            <img 
              src={getDisplayUrl(value || '')} 
              alt="Preview" 
              className="w-full h-full object-cover"
              data-testid="img-upload-preview"
            />
          </div>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-md">
            <Button 
              type="button"
              size="icon" 
              variant="secondary"
              onClick={handleClick}
              disabled={disabled}
              data-testid="button-change-image"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button 
              type="button"
              size="icon" 
              variant="destructive"
              onClick={handleRemove}
              disabled={disabled}
              data-testid="button-remove-image"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isUploading}
          className={cn(
            "w-full border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer transition-colors",
            "hover-elevate",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed",
            isSquare ? "aspect-square max-w-[200px]" : "aspect-video"
          )}
          data-testid="button-select-image"
        >
          <div className="flex flex-col items-center justify-center h-full gap-2">
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                <span className="text-sm text-muted-foreground">Enviando...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{placeholder}</span>
              </>
            )}
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-file-upload"
      />

      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageSrc={tempImageSrc || ""}
        onCropComplete={handleCropComplete}
        aspectRatio={aspectRatio}
      />
    </div>
  );
}

export const IMAGE_UPLOAD_CONFIGS = {
  event: {
    aspectRatio: 16 / 9,
    placeholder: "Selecionar Imagem do Evento",
  },
  devotional: {
    aspectRatio: 16 / 9,
    placeholder: "Selecionar Imagem de Capa",
  },
  board: {
    aspectRatio: 1,
    placeholder: "Selecionar Foto",
  },
  avatar: {
    aspectRatio: 1,
    placeholder: "Selecionar Foto de Perfil",
  },
} as const;
