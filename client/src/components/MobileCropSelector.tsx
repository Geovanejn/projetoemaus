import { useState, useCallback, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Smartphone } from "lucide-react";
import type { MobileCropData } from "@shared/schema";

interface MobileCropSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  cropData: MobileCropData | null | undefined;
  onCropComplete: (data: MobileCropData) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function MobileCropSelector({
  open,
  onOpenChange,
  imageSrc,
  cropData,
  onCropComplete,
}: MobileCropSelectorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<CropArea | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (open && !hasInitialized.current) {
      hasInitialized.current = true;
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      
      if (cropData) {
        setCroppedAreaPercent({
          x: cropData.x,
          y: cropData.y,
          width: cropData.width,
          height: cropData.height,
        });
      } else {
        setCroppedAreaPercent(null);
      }

      if (imageSrc) {
        const img = new Image();
        img.onload = () => {
          setImageSize({ width: img.width, height: img.height });
        };
        img.src = imageSrc;
      }
    }
    
    if (!open) {
      hasInitialized.current = false;
    }
  }, [open, imageSrc, cropData]);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaChange = useCallback(
    (croppedArea: CropArea, croppedAreaPixels: CropArea) => {
      if (imageSize.width > 0 && imageSize.height > 0) {
        const percentCrop: CropArea = {
          x: (croppedAreaPixels.x / imageSize.width) * 100,
          y: (croppedAreaPixels.y / imageSize.height) * 100,
          width: (croppedAreaPixels.width / imageSize.width) * 100,
          height: (croppedAreaPixels.height / imageSize.height) * 100,
        };
        setCroppedAreaPercent(percentCrop);
      }
    },
    [imageSize]
  );

  const handleSave = useCallback(() => {
    if (!croppedAreaPercent) return;

    onCropComplete({
      x: Math.round(croppedAreaPercent.x * 100) / 100,
      y: Math.round(croppedAreaPercent.y * 100) / 100,
      width: Math.round(croppedAreaPercent.width * 100) / 100,
      height: Math.round(croppedAreaPercent.height * 100) / 100,
    });
  }, [croppedAreaPercent, onCropComplete]);

  if (!imageSrc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Configurar Recorte Mobile
          </DialogTitle>
          <DialogDescription>
            Arraste e ajuste a area que sera exibida em dispositivos moveis. A proporcao 4:5 e otimizada para telas de celular.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-80 bg-muted rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={4 / 5}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
            objectFit="contain"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Zoom</label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">1x</span>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="flex-1"
              data-testid="slider-zoom"
            />
            <span className="text-sm text-muted-foreground">3x</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-crop">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!croppedAreaPercent} data-testid="button-save-crop">
            Salvar Recorte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
