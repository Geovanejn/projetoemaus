import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import html2canvas from "html2canvas";
import { 
  ArrowLeft,
  Calendar,
  User,
  Share2,
  BookOpen,
  Loader2,
  Download,
  Check,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { SiWhatsapp, SiInstagram } from "react-icons/si";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DevotionalComments } from "@/components/DevotionalComments";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { parseTipTapContent } from "@/lib/utils";
import DOMPurify from "dompurify";

import logoWhite from "@assets/2-1_1766464654126.png";

// Configure DOMPurify to allow YouTube iframes
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe') {
    const element = node as Element;
    const src = element.getAttribute?.('src') || '';
    if (src.startsWith('https://www.youtube.com/') || src.startsWith('https://youtube.com/')) {
      return; // Allow YouTube iframes
    }
  }
});

const sanitizeConfig = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

import defaultDevImg from "@assets/stock_images/christian_prayer_spi_92875813.jpg";

// Instagram Embed Component using official blockquote method
function InstagramEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract post URL for blockquote
  const getCleanUrl = (instagramUrl: string) => {
    const match = instagramUrl.match(/instagram\.com\/(p|reel|reels)\/([A-Za-z0-9_-]+)/);
    if (match) {
      return `https://www.instagram.com/${match[1]}/${match[2]}/`;
    }
    return instagramUrl;
  };

  useEffect(() => {
    if (!url) return;

    const loadInstagramEmbed = () => {
      // Load Instagram embed script
      const existingScript = document.querySelector('script[src*="instagram.com/embed.js"]');
      
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://www.instagram.com/embed.js';
        script.async = true;
        script.onload = () => {
          if ((window as any).instgrm) {
            (window as any).instgrm.Embeds.process();
          }
          setIsLoading(false);
        };
        document.body.appendChild(script);
      } else {
        setTimeout(() => {
          if ((window as any).instgrm) {
            (window as any).instgrm.Embeds.process();
          }
          setIsLoading(false);
        }, 300);
      }
    };

    loadInstagramEmbed();
  }, [url]);

  const cleanUrl = getCleanUrl(url);

  return (
    <div ref={containerRef} className="instagram-embed-container relative rounded-lg overflow-hidden">
      {isLoading && (
        <div className="flex items-center justify-center py-8 bg-muted/30 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
        </div>
      )}
      <blockquote 
        className="instagram-media" 
        data-instgrm-captioned
        data-instgrm-permalink={cleanUrl}
        data-instgrm-version="14"
        style={{ 
          background: 'transparent', 
          border: 0, 
          margin: '0 auto', 
          maxWidth: '540px', 
          minWidth: '326px', 
          padding: 0, 
          width: '100%'
        }}
      >
        <a 
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-card rounded-lg p-4 text-center hover:bg-muted transition-colors"
        >
          <p className="text-sm text-muted-foreground mb-2">Ver no Instagram</p>
          <p className="text-xs text-muted-foreground truncate max-w-xs mx-auto">
            {url}
          </p>
        </a>
      </blockquote>
    </div>
  );
}

interface MobileCropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DevotionalData {
  id: number;
  title: string;
  verse: string;
  verseReference: string;
  content?: string;
  contentHtml?: string;
  summary?: string;
  imageUrl?: string;
  mobileCropData?: string | null;
  author?: string;
  publishedAt?: string;
  isRead?: boolean;
  youtubeUrl?: string;
  instagramUrl?: string;
  audioUrl?: string;
}

function parseMobileCropData(data: string | null | undefined): MobileCropData | null {
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function getMobileBackgroundStyle(cropData: MobileCropData | null): React.CSSProperties {
  if (!cropData) {
    return { backgroundPosition: 'center' };
  }
  const posX = cropData.x + (cropData.width / 2);
  const posY = cropData.y + (cropData.height / 2);
  return { backgroundPosition: `${posX}% ${posY}%` };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getYoutubeEmbedUrl(url: string): string {
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  // Return as-is if already an embed URL or unrecognized format
  if (url.includes('/embed/')) {
    return url;
  }
  
  return url;
}

function getCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('ora')) return 'Oracao';
  if (lowerTitle.includes('fe') || lowerTitle.includes('fé')) return 'Fe';
  if (lowerTitle.includes('amor')) return 'Amor';
  if (lowerTitle.includes('confia') || lowerTitle.includes('tempos')) return 'Confianca';
  if (lowerTitle.includes('serv')) return 'Servico';
  if (lowerTitle.includes('paz')) return 'Paz';
  return 'Fe';
}

export default function DevocionalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const devotionalId = parseInt(id || '0');
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [croppedBgDataUrl, setCroppedBgDataUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const { data: devotional, isLoading, isError } = useQuery<DevotionalData>({
    queryKey: ['/api/site/devotionals', devotionalId],
    staleTime: 5 * 60 * 1000,
    enabled: devotionalId > 0,
  });

  const { data: readStatus } = useQuery<{ isRead: boolean }>({
    queryKey: ['/api/study/devotional-status', devotionalId],
    enabled: isAuthenticated && devotionalId > 0,
  });

  const isAlreadyRead = readStatus?.isRead === true;

  const { data: allDevotionals } = useQuery<DevotionalData[]>({
    queryKey: ['/api/site/devotionals'],
    staleTime: 5 * 60 * 1000,
  });

  const relatedDevotionals = allDevotionals?.filter(d => d.id !== devotionalId).slice(0, 3) || [];

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/study/devotional-read/${devotionalId}`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/devotional-status", devotionalId] });
      queryClient.invalidateQueries({ queryKey: ["/api/study/weekly-goal"] });
      
      if (!data.alreadyRead) {
        toast({
          title: "Devocional marcado como lido!",
          description: "Você ganhou pontos para sua meta semanal.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro ao marcar como lido",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = () => {
    if (!isAuthenticated) {
      toast({
        title: "Faça login para continuar",
        description: "Você precisa estar logado para marcar o devocional como lido.",
        variant: "destructive",
      });
      return;
    }
    if (isAlreadyRead || markAsReadMutation.isPending) {
      return;
    }
    markAsReadMutation.mutate();
  };

  // Get proxy URL for background image
  const currentImageUrl = devotional?.imageUrl && !devotional.imageUrl.includes('placeholder') 
    ? devotional.imageUrl 
    : defaultDevImg;
  
  const proxyImageUrl = currentImageUrl.startsWith('http') && !currentImageUrl.includes(window.location.hostname)
    ? `/api/proxy-image?url=${encodeURIComponent(currentImageUrl)}`
    : currentImageUrl;

  // Pre-load and crop background image to 9:16 aspect ratio (same as daily verse)
  useEffect(() => {
    if (!proxyImageUrl || !isShareDialogOpen) {
      setCroppedBgDataUrl(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetAspect = 9 / 16;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      
      let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
      
      if (imgAspect > targetAspect) {
        srcW = img.naturalHeight * targetAspect;
        srcX = (img.naturalWidth - srcW) / 2;
      } else {
        srcH = img.naturalWidth / targetAspect;
        srcY = (img.naturalHeight - srcH) / 2;
      }
      
      const exportWidth = 2160;
      const exportHeight = 3840;
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, exportWidth, exportHeight);
        setCroppedBgDataUrl(canvas.toDataURL('image/png'));
        console.log('[Devotional Share] Background image cropped at 2160x3840');
      }
    };
    img.onerror = () => {
      console.log('[Devotional Share] Failed to load background image');
      setCroppedBgDataUrl(null);
    };
    img.src = proxyImageUrl;
  }, [proxyImageUrl, isShareDialogOpen]);

  // Generate and share image - EXACTLY like daily verse
  const generateAndShareImage = useCallback(async (platform: 'whatsapp' | 'instagram' | 'download') => {
    if (!shareCardRef.current || !devotional) return;

    setIsGenerating(true);
    try {
      const cardWidth = 2160;
      const cardHeight = 3840;
      const scale = 1;
      const borderRadius = 80;
      
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
        border-radius: ${borderRadius}px;
      `;
      document.body.appendChild(offscreenContainer);
      
      const clonedCard = shareCardRef.current.cloneNode(true) as HTMLElement;
      clonedCard.style.cssText = `
        width: ${cardWidth}px;
        height: ${cardHeight}px;
        border-radius: ${borderRadius}px;
        overflow: hidden;
        background: transparent;
        margin: 0;
        padding: 0;
      `;
      
      const scaleFactor = 8 * 0.75; // 6x scale
      
      const textElements = clonedCard.querySelectorAll('h3, p');
      textElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const currentSize = parseFloat(htmlEl.style.fontSize);
        if (!isNaN(currentSize)) {
          const pxSize = Math.round(currentSize * 16 * scaleFactor);
          htmlEl.style.fontSize = `${pxSize}px`;
        }
      });
      
      const strongElements = clonedCard.querySelectorAll('strong');
      strongElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.fontWeight = '700';
      });
      
      // Scale SVG icons
      const svgIcons = clonedCard.querySelectorAll('svg');
      svgIcons.forEach((svgIcon) => {
        const scaledSize = 58;
        const parentP = svgIcon.closest('p') as HTMLElement;
        
        if (parentP) {
          parentP.style.display = 'flex';
          parentP.style.alignItems = 'center';
          parentP.style.justifyContent = 'center';
          parentP.style.gap = '48px';
          parentP.style.lineHeight = `${scaledSize}px`;
          parentP.style.overflow = 'visible';
        }
        
        const wrapper = document.createElement('span');
        wrapper.style.cssText = `
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: ${scaledSize}px;
          height: ${scaledSize}px;
          overflow: visible;
          flex-shrink: 0;
          margin-top: 47px;
        `;
        
        svgIcon.setAttribute('width', `${scaledSize}`);
        svgIcon.setAttribute('height', `${scaledSize}`);
        svgIcon.style.width = `${scaledSize}px`;
        svgIcon.style.height = `${scaledSize}px`;
        svgIcon.style.flexShrink = '0';
        svgIcon.style.display = 'block';
        
        const svgClone = svgIcon.cloneNode(true) as SVGElement;
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
        const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;
        
        const imgElement = document.createElement('img');
        imgElement.src = svgDataUrl;
        imgElement.style.cssText = `
          width: ${scaledSize}px;
          height: ${scaledSize}px;
          display: block;
          flex-shrink: 0;
        `;
        
        svgIcon.parentNode?.insertBefore(wrapper, svgIcon);
        wrapper.appendChild(imgElement);
        svgIcon.remove();
      });
      
      // Find and fix the verse paragraph - increase margin-bottom for spacing from reference
      const allParagraphs = clonedCard.querySelectorAll('p');
      allParagraphs.forEach((p) => {
        const htmlP = p as HTMLElement;
        // Verse paragraph has italic style and 0.7rem margin
        if (htmlP.style.fontStyle === 'italic') {
          // Scale margin with 2x multiplier for better spacing (0.7rem * 16 * 6 * 2 = 134.4px)
          htmlP.style.marginBottom = '130px';
        }
      });
      
      // Scale padding for ultra high-res - find ALL containers with padding
      const allPaddingContainers = clonedCard.querySelectorAll('div[style*="padding"]');
      allPaddingContainers.forEach((container) => {
        const htmlContainer = container as HTMLElement;
        const paddingValue = htmlContainer.style.padding;
        if (paddingValue === '1.5rem') {
          htmlContainer.style.padding = '192px'; // 1.5rem * 16 * 8 = 192px
        } else if (paddingValue === '0 0.8rem' || paddingValue === '0px 0.8rem') {
          htmlContainer.style.padding = '0 102px'; // 0.8rem * 16 * 8 = 102px
        }
      });
      
      // Scale logo for ultra high-res (4.6rem * 16 * 8 * 0.75 = 442px)
      const logo = clonedCard.querySelector('img[alt="UMP Emaús"]') as HTMLImageElement;
      if (logo) {
        logo.style.height = '442px';
        logo.style.overflow = 'visible';
        // Scale logo container marginBottom (0.8rem * 16 * 8 = 102px)
        const logoContainer = logo.parentElement as HTMLElement;
        if (logoContainer) {
          logoContainer.style.marginBottom = '102px';
          logoContainer.style.overflow = 'visible';
        }
      }
      
      offscreenContainer.appendChild(clonedCard);
      
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const sourceCanvas = await html2canvas(clonedCard, {
        scale: scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        imageTimeout: 15000,
        width: cardWidth,
        height: cardHeight,
      });
      
      document.body.removeChild(offscreenContainer);

      const srcWidth = sourceCanvas.width;
      const srcHeight = sourceCanvas.height;
      const scaledRadius = Math.round(borderRadius * scale);
      
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = srcWidth;
      finalCanvas.height = srcHeight;
      const ctx = finalCanvas.getContext('2d');
      
      if (!ctx) {
        toast({ title: "Erro ao gerar imagem", variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      // Draw rounded-rect mask first
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(scaledRadius, 0);
      ctx.lineTo(srcWidth - scaledRadius, 0);
      ctx.arcTo(srcWidth, 0, srcWidth, scaledRadius, scaledRadius);
      ctx.lineTo(srcWidth, srcHeight - scaledRadius);
      ctx.arcTo(srcWidth, srcHeight, srcWidth - scaledRadius, srcHeight, scaledRadius);
      ctx.lineTo(scaledRadius, srcHeight);
      ctx.arcTo(0, srcHeight, 0, srcHeight - scaledRadius, scaledRadius);
      ctx.lineTo(0, scaledRadius);
      ctx.arcTo(0, 0, scaledRadius, 0, scaledRadius);
      ctx.closePath();
      ctx.fill();
      
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(sourceCanvas, 0, 0);
      
      // Hard alpha clamp for clean transparency
      const imageData = ctx.getImageData(0, 0, srcWidth, srcHeight);
      const data = imageData.data;
      const alphaThreshold = 250;
      
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0 && data[i] < alphaThreshold) {
          data[i] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const shareUrl = window.location.href;
      const shareText = `📖 *${devotional.title}* - UMP Emaús\n\nLeia o devocional completo:\n${shareUrl}`;

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
          a.download = `devocional-${devotional.title.toLowerCase().replace(/\s+/g, '-')}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Imagem baixada!" });
          setIsGenerating(false);
          setIsShareDialogOpen(false);
        }, 'image/png', 1.0);
      } else if (platform === 'whatsapp') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          const file = new File([blob], `devocional-${devotional.id}.png`, { type: 'image/png' });
          try {
            await navigator.clipboard.writeText(shareText);
          } catch (e) {
            console.log('Could not copy to clipboard');
          }
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            toast({ 
              title: "Legenda copiada!", 
              description: "Cole no campo 'Adicione uma legenda' do WhatsApp" 
            });
            await navigator.share({
              files: [file],
              title: devotional.title,
            });
          } else {
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            window.open(whatsappUrl, '_blank');
          }
          setIsGenerating(false);
          setIsShareDialogOpen(false);
        }, 'image/png', 1.0);
      } else if (platform === 'instagram') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          try {
            await navigator.clipboard.writeText(shareText);
          } catch (e) {
            console.log('Could not copy to clipboard');
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `devocional-${devotional.title.toLowerCase().replace(/\s+/g, '-')}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ 
            title: "Imagem baixada + Legenda copiada!", 
            description: "Abra o Instagram e cole a legenda ao compartilhar" 
          });
          setIsGenerating(false);
          setIsShareDialogOpen(false);
        }, 'image/png', 1.0);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
      setIsGenerating(false);
    }
  }, [devotional, toast]);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (isError || !devotional) {
    return (
      <SiteLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background gap-4">
          <BookOpen className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Devocional não encontrado</h2>
          <Link href="/devocionais">
            <Button variant="outline" data-testid="button-back-list">
              Voltar aos Devocionais
            </Button>
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const category = getCategory(devotional.title);
  const date = formatDate(devotional.publishedAt);
  const imageUrl = devotional.imageUrl && !devotional.imageUrl.includes('placeholder') 
    ? devotional.imageUrl 
    : defaultDevImg;
  const mobileCropData = parseMobileCropData(devotional.mobileCropData);
  const mobileBackgroundStyle = getMobileBackgroundStyle(mobileCropData);

  const hasHtmlContent = devotional.contentHtml && devotional.contentHtml.trim().length > 0;
  const contentText = parseTipTapContent(devotional.content) || parseTipTapContent(devotional.summary) || '';

  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        {/* Desktop background - hidden on mobile when crop is defined */}
        <div 
          className={`absolute inset-0 bg-cover bg-center ${mobileCropData ? 'hidden md:block' : ''}`}
          style={{ 
            backgroundImage: `url(${imageUrl})`,
          }}
        />
        {/* Mobile background with crop - only shown on mobile when crop is defined */}
        {mobileCropData && (
          <div 
            className="absolute inset-0 md:hidden bg-cover"
            style={{ 
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              ...mobileBackgroundStyle
            }}
          />
        )}
        {/* Fallback for mobile when no crop is defined */}
        {!mobileCropData && (
          <div 
            className="absolute inset-0 md:hidden bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${imageUrl})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-gray-800/60 to-gray-900/50" />
        <div className="relative text-white py-12">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link href="/devocionais">
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 gap-2 mb-6"
                  data-testid="button-back-devotionals"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar aos Devocionais
                </Button>
              </Link>

              <div className="max-w-3xl">
                <div className="flex items-center gap-4 text-sm opacity-90 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {date}
                  </span>
                  <span className="bg-white/20 px-3 py-1 rounded-full">
                    {category}
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-6" data-testid="devotional-detail-title">
                  {devotional.title}
                </h1>

                <blockquote className="border-l-4 border-white/50 pl-4 py-2">
                  <p className="text-xl italic opacity-95">
                    "{devotional.verse}"
                  </p>
                  <cite className="text-sm opacity-80 mt-2 block">
                    - {devotional.verseReference}
                  </cite>
                </blockquote>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="overflow-hidden">
                <CardContent className="p-4 sm:p-8 overflow-x-hidden">
                  <div className="prose prose-lg dark:prose-invert max-w-none break-words">
                    {hasHtmlContent ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(devotional.contentHtml!, sanitizeConfig) }}
                        className="devotional-content [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-lg [&_iframe]:my-4 [&_a]:text-primary [&_a]:underline"
                      />
                    ) : (
                      contentText.split('\n\n').map((paragraph, index) => {
                        if (!paragraph.trim()) return null;
                        if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                          return (
                            <h3 key={index} className="text-xl font-semibold mt-6 mb-3">
                              {paragraph.replace(/\*\*/g, '')}
                            </h3>
                          );
                        }
                        if (paragraph.match(/^\d\./)) {
                          return (
                            <p key={index} className="text-muted-foreground leading-relaxed mb-2">
                              {paragraph.split('**').map((part, i) => 
                                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                              )}
                            </p>
                          );
                        }
                        return (
                          <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                            {paragraph}
                          </p>
                        );
                      })
                    )}
                  </div>

                  {/* Media Section */}
                  {(devotional.youtubeUrl || devotional.instagramUrl || devotional.audioUrl) && (
                    <div className="space-y-6 mt-8 pt-6 border-t">
                      {devotional.youtubeUrl && (
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <span className="text-red-500">YouTube</span>
                          </h4>
                          <div className="aspect-video rounded-lg overflow-hidden">
                            <iframe
                              src={getYoutubeEmbedUrl(devotional.youtubeUrl)}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title="Video do YouTube"
                            />
                          </div>
                        </div>
                      )}

                      {devotional.instagramUrl && (
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <span className="text-pink-500">Instagram</span>
                          </h4>
                          <InstagramEmbed url={devotional.instagramUrl} />
                        </div>
                      )}

                      {devotional.audioUrl && (
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <span className="text-purple-500">Audio</span>
                          </h4>
                          <audio 
                            controls 
                            className="w-full rounded-lg" 
                            src={devotional.audioUrl}
                            data-testid="audio-player"
                          >
                            Seu navegador nao suporta o elemento de audio.
                          </audio>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-4 mt-8 pt-6 border-t">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{devotional.author || 'Secretaria de Espiritualidade'}</p>
                        <p className="text-sm text-muted-foreground">{date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {isAuthenticated && (
                        <Button 
                          variant={isAlreadyRead ? "default" : "outline"}
                          onClick={handleMarkAsRead}
                          disabled={isAlreadyRead || markAsReadMutation.isPending}
                          className="gap-2"
                          data-testid="button-mark-read"
                        >
                          {markAsReadMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isAlreadyRead ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          {isAlreadyRead ? "Lido" : "Marcar como lido"}
                        </Button>
                      )}
                      <Button 
                        onClick={() => setIsShareDialogOpen(true)}
                        className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                        data-testid="button-share-devotional"
                      >
                        <Share2 className="h-4 w-4" />
                        Compartilhar Devocional
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <DevotionalComments devotionalId={devotionalId} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Leia tambem
                  </h3>
                  {relatedDevotionals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum outro devocional disponivel.</p>
                  ) : (
                    <div className="space-y-4">
                      {relatedDevotionals.map((related) => (
                        <Link key={related.id} href={`/devocionais/${related.id}`}>
                          <div className="p-3 rounded-lg hover-elevate cursor-pointer">
                            <p className="text-xs text-muted-foreground mb-1">
                              {formatDate(related.publishedAt)}
                            </p>
                            <h4 className="font-medium text-sm">
                              {related.title}
                            </h4>
                            <span className="text-xs text-primary mt-1 inline-block">
                              {getCategory(related.title)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg mx-auto">
          <DialogHeader>
            <DialogTitle>Compartilhar Devocional</DialogTitle>
          </DialogHeader>

          <div 
            ref={shareCardRef}
            style={{ 
              width: '100%',
              aspectRatio: '9/16',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '10px',
              WebkitFontSmoothing: 'antialiased',
              textRendering: 'optimizeLegibility',
            }}
          >
            {(croppedBgDataUrl || proxyImageUrl) && (
              <img 
                src={croppedBgDataUrl || proxyImageUrl || ''}
                crossOrigin="anonymous"
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: croppedBgDataUrl ? 'fill' : 'cover',
                  display: 'block'
                }}
              />
            )}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.3), rgba(0,0,0,0.7))'
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.5rem',
              color: 'white',
              boxSizing: 'border-box'
            }}>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <h3 style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: 'bold', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em',
                  margin: 0,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)' 
                }}>
                  DEVOCIONAL DA SEMANA
                </h3>
                <p style={{ 
                  fontSize: '0.7rem', 
                  opacity: 0.9,
                  margin: '0.3rem 0 0 0',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)' 
                }}>
                  UMP Emaús
                </p>
              </div>

              <div style={{ 
                textAlign: 'center', 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '0 0.8rem'
              }}>
                <h3 style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 700, 
                  letterSpacing: '0.02em',
                  margin: '0 0 0.8rem 0',
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  lineHeight: 1.3
                }}>
                  {devotional?.title || ''}
                </h3>
                <div>
                  <p style={{ 
                    fontSize: '0.95rem', 
                    fontStyle: 'italic', 
                    fontWeight: 400,
                    lineHeight: 1.4,
                    margin: '0 0 0.7rem 0',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)' 
                  }}>
                    "{devotional?.verse || ''}"
                  </p>
                  <p style={{ 
                    fontSize: '0.608rem', 
                    fontWeight: 500,
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    textShadow: '0 1px 3px rgba(0,0,0,0.5)' 
                  }}>
                    <BookOpen style={{ width: '0.7rem', height: '0.7rem', color: '#FFA500', flexShrink: 0, verticalAlign: 'middle' }} />
                    <span style={{ lineHeight: 1 }}>{devotional?.verseReference?.toUpperCase() || ''}</span>
                  </p>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '0.8rem' }}>
                <p style={{ 
                  fontSize: '0.55rem', 
                  opacity: 0.9,
                  margin: 0,
                  lineHeight: 1.2,
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  letterSpacing: '0.03em'
                }}>
                  Leia a devocional em
                </p>
                <p style={{ 
                  fontSize: '0.65rem', 
                  fontWeight: 700,
                  margin: '0 0 0.5rem 0',
                  lineHeight: 1.2,
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                  letterSpacing: '0.03em'
                }}>
                  umpemaus.com.br
                </p>
                <img src={logoWhite} alt="UMP Emaús" style={{ height: '4.6rem', opacity: 0.95, display: 'block', margin: '0 auto' }} />
              </div>
            </div>
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
              size="icon"
              data-testid="button-download"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
