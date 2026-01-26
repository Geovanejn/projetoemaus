import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  aspectRatio?: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: CropArea,
  aspectRatio: number = 1
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  const isSquare = aspectRatio === 1;
  const isPortrait = aspectRatio < 1;
  let maxWidth: number;
  let maxHeight: number;
  
  if (isSquare) {
    maxWidth = 400;
    maxHeight = 400;
  } else if (isPortrait) {
    maxHeight = 1500;
    maxWidth = Math.round(maxHeight * aspectRatio);
  } else {
    maxWidth = 800;
    maxHeight = Math.round(maxWidth / aspectRatio);
  }
  
  canvas.width = maxWidth;
  canvas.height = maxHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    maxWidth,
    maxHeight
  );

  let quality = 0.75;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  
  const maxSizeBytes = 500 * 1024;
  while (dataUrl.length > maxSizeBytes && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
}

interface MediaSize {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface CropSize {
  width: number;
  height: number;
}

export default function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [mediaSize, setMediaSize] = useState<MediaSize | null>(null);
  const [cropSize, setCropSize] = useState<CropSize | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setMinZoom(1);
      setCroppedAreaPixels(null);
      setMediaSize(null);
      setCropSize(null);
    }
  }, [open]);

  // Calculate minZoom when both media and crop sizes are available
  useEffect(() => {
    if (mediaSize && cropSize) {
      // Calculate minZoom to ensure image covers entire crop area (cover fit)
      const zoomForWidth = cropSize.width / mediaSize.width;
      const zoomForHeight = cropSize.height / mediaSize.height;
      // Take the maximum to ensure both dimensions are covered
      const requiredZoom = Math.max(zoomForWidth, zoomForHeight);
      // Ensure minimum zoom of 1 with small buffer
      const calculatedMinZoom = Math.max(1, requiredZoom * 1.01);
      setMinZoom(calculatedMinZoom);
      setZoom(calculatedMinZoom);
    }
  }, [mediaSize, cropSize]);

  const onMediaLoaded = useCallback((size: MediaSize) => {
    setMediaSize(size);
  }, []);

  const onCropSizeChange = useCallback((size: CropSize) => {
    setCropSize(size);
  }, []);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaChange = useCallback(
    (_: CropArea, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, aspectRatio);
      onCropComplete(croppedImage);
      onOpenChange(false);
    } catch (e) {
      console.error("Error cropping image:", e);
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete, onOpenChange, aspectRatio]);

  const isSquare = aspectRatio === 1;
  const isPortrait = aspectRatio < 1;
  const dialogTitle = isSquare ? "Ajustar Foto" : isPortrait ? "Ajustar Capa" : "Ajustar Imagem";
  const dialogDescription = isSquare 
    ? "Posicione e ajuste o zoom da imagem para centralizar o rosto"
    : isPortrait
    ? "Posicione e ajuste o zoom para enquadrar a capa da revista"
    : "Posicione e ajuste o zoom para enquadrar a imagem";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent 
        className="w-[95vw] max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative w-full h-[50vh] sm:h-[60vh] md:h-96 bg-muted rounded-md overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              aspect={aspectRatio}
              cropShape={isSquare ? "round" : "rect"}
              showGrid={!isSquare}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropAreaChange}
              onMediaLoaded={onMediaLoaded}
              onCropSizeChange={onCropSizeChange}
              objectFit="contain"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider
              value={[zoom]}
              onValueChange={(values) => setZoom(values[0])}
              min={minZoom}
              max={Math.max(3, minZoom + 2)}
              step={0.1}
              className="w-full"
              data-testid="slider-zoom"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-crop"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} data-testid="button-save-crop">
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
