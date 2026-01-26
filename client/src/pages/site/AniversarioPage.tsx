import { useState, useRef, useCallback, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Loader2,
  User,
} from "lucide-react";
import { SiWhatsapp, SiInstagram } from "react-icons/si";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemberData {
  id: number;
  fullName: string;
  firstName: string;
  photoUrl: string | null;
}

export default function AniversarioPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/aniversario/:id");
  const memberId = params?.id ? parseInt(params.id) : null;
  
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const { data: member, isLoading } = useQuery<MemberData>({
    queryKey: ["/api/site/birthday-member", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/site/birthday-member/${memberId}`);
      if (!res.ok) throw new Error("Member not found");
      return res.json();
    },
    enabled: !!memberId,
  });

  useEffect(() => {
    if (member && !isShareDialogOpen) {
      setIsShareDialogOpen(true);
    }
  }, [member, isShareDialogOpen]);

  const generateAndShareImage = useCallback(async (platform: 'whatsapp' | 'instagram' | 'download') => {
    if (!shareCardRef.current || !member) return;

    setIsGenerating(true);
    try {
      const cardWidth = 2160;
      const cardHeight = 3840;
      const scale = 1;
      const borderRadius = 0;
      
      const offscreenContainer = document.createElement('div');
      offscreenContainer.style.cssText = `
        position: fixed;
        left: -10000px;
        top: 0;
        width: ${cardWidth}px;
        height: ${cardHeight}px;
        background: transparent;
        padding: 0;
        margin: 0;
        overflow: hidden;
      `;
      document.body.appendChild(offscreenContainer);
      
      const clonedCard = shareCardRef.current.cloneNode(true) as HTMLElement;
      clonedCard.style.cssText = `
        width: ${cardWidth}px;
        height: ${cardHeight}px;
        overflow: hidden;
        background: transparent;
        margin: 0;
        padding: 0;
      `;
      
      const scaleFactor = 8;
      const textElements = clonedCard.querySelectorAll('p, span');
      textElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const currentSize = parseFloat(htmlEl.style.fontSize);
        if (!isNaN(currentSize) && currentSize > 0) {
          const pxSize = Math.round(currentSize * 16 * scaleFactor);
          htmlEl.style.fontSize = `${pxSize}px`;
        }
      });

      const memberPhoto = clonedCard.querySelector('img[data-member-photo]') as HTMLImageElement;
      if (memberPhoto) {
        memberPhoto.style.width = '1404px';
        memberPhoto.style.height = '1404px';
      }
      
      const placeholderDiv = clonedCard.querySelector('div[data-placeholder-photo]') as HTMLElement;
      if (placeholderDiv) {
        placeholderDiv.style.width = '1404px';
        placeholderDiv.style.height = '1404px';
      }
      
      const nameElement = clonedCard.querySelector('p') as HTMLElement;
      if (nameElement) {
        nameElement.style.bottom = '27.5%';
      }
      
      offscreenContainer.appendChild(clonedCard);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const sourceCanvas = await html2canvas(clonedCard, {
        scale: scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        width: cardWidth,
        height: cardHeight,
      });
      
      document.body.removeChild(offscreenContainer);
      
      const srcWidth = sourceCanvas.width;
      const srcHeight = sourceCanvas.height;
      
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = srcWidth;
      finalCanvas.height = srcHeight;
      const ctx = finalCanvas.getContext('2d');
      
      if (!ctx) {
        toast({ title: "Erro ao gerar imagem", variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      ctx.drawImage(sourceCanvas, 0, 0);

      if (platform === 'download') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `aniversario-${member.firstName}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Imagem baixada!" });
          setIsGenerating(false);
        }, 'image/png', 1.0);
      } else if (platform === 'whatsapp') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          const file = new File([blob], `aniversario-${member.firstName}.png`, { type: 'image/png' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Aniversário UMP Emaús',
            });
          } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aniversario-${member.firstName}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
          setIsGenerating(false);
        }, 'image/png', 1.0);
      } else if (platform === 'instagram') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `aniversario-${member.firstName}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Imagem baixada!" });
          setIsGenerating(false);
        }, 'image/png', 1.0);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
      setIsGenerating(false);
    }
  }, [member, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Membro não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="w-[85vw] max-w-xs sm:max-w-sm mx-auto" data-testid="dialog-share-birthday">
          <DialogHeader>
            <DialogTitle>Compartilhar Arte de Aniversário</DialogTitle>
          </DialogHeader>

          <div 
            ref={shareCardRef}
            data-share-card="birthday"
            style={{ 
              width: '100%',
              aspectRatio: '9/16',
              position: 'relative',
              overflow: 'hidden',
              WebkitFontSmoothing: 'antialiased',
              textRendering: 'optimizeLegibility',
            }}
          >
            {member.photoUrl && (
              <img 
                src={member.photoUrl}
                data-member-photo="true"
                crossOrigin="anonymous"
                alt=""
                style={{
                  position: 'absolute',
                  width: '65%',
                  aspectRatio: '1/1',
                  top: '49%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  objectFit: 'cover',
                  zIndex: 1,
                }}
              />
            )}
            {!member.photoUrl && (
              <div
                data-placeholder-photo="true"
                style={{
                  position: 'absolute',
                  width: '65%',
                  aspectRatio: '1/1',
                  top: '49%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <User style={{ width: '50%', height: '50%', color: '#9CA3AF' }} />
              </div>
            )}
            <img 
              src="/birthday-template.png"
              crossOrigin="anonymous"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 2,
              }}
            />
            <p style={{
              position: 'absolute',
              bottom: '27.5%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: '#000000',
              textAlign: 'center',
              zIndex: 3,
              whiteSpace: 'nowrap',
              fontFamily: "'Dancing Script', cursive",
              textTransform: 'capitalize',
            }}>
              {member.firstName || ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 justify-center">
            <Button
              onClick={() => generateAndShareImage('whatsapp')}
              disabled={isGenerating}
              className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
              data-testid="button-share-whatsapp"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <SiWhatsapp className="mr-2 h-4 w-4" />
                  WhatsApp
                </>
              )}
            </Button>
            <Button
              onClick={() => generateAndShareImage('instagram')}
              disabled={isGenerating}
              className="flex-1 min-w-[120px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              data-testid="button-share-instagram"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <SiInstagram className="mr-2 h-4 w-4" />
                  Instagram
                </>
              )}
            </Button>
            <Button
              onClick={() => generateAndShareImage('download')}
              disabled={isGenerating}
              variant="outline"
              className="flex-1 min-w-[120px]"
              data-testid="button-download"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={() => setIsShareDialogOpen(true)}
        data-testid={`button-share-birthday-${member.id}`}
        className="invisible absolute"
      >
        Compartilhar
      </Button>
    </div>
  );
}
