import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft,
  Calendar,
  Share2,
  BookOpen,
  Loader2,
  Download,
  Clock
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
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import logoWhite from "@assets/2-1_1766464654126.png";

interface DailyVersePost {
  id: number;
  verse: string;
  reference: string;
  reflection: string | null;
  reflectionTitle: string | null;
  highlightedKeywords: string[] | null;
  reflectionKeywords: string[] | null;
  reflectionReferences: string[] | null;
  imageUrl: string | null;
  publishedAt: string;
  expiresAt: string;
  isActive: boolean;
  stockImage: {
    id: number;
    imageUrl: string;
    category: string;
  } | null;
}

// Helper function to render verse text with highlighted keywords in bold
function renderVerseWithHighlights(verse: string, keywords: string[] | null | undefined): JSX.Element {
  if (!keywords || keywords.length === 0) {
    return <>{verse}</>;
  }
  
  // Sort keywords by length (longer first) to avoid partial matching issues
  const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
  
  // Create a regex pattern that matches any of the keywords (case-insensitive)
  const pattern = new RegExp(
    `(${sortedKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );
  
  const parts = verse.split(pattern);
  
  return (
    <>
      {parts.map((part, index) => {
        const isKeyword = sortedKeywords.some(k => k.toLowerCase() === part.toLowerCase());
        return isKeyword ? (
          <strong key={index} style={{ fontWeight: 700 }}>{part}</strong>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

// Helper function to format reference: remove (ARA), uppercase
function formatReference(reference: string): string {
  return reference.replace(/\s*\(ARA\)\s*/gi, '').toUpperCase();
}

// Helper function to render reflection with markdown bold (**text**) and italic (*text*) support
// Also highlights keywords and references from arrays
function renderReflectionWithFormatting(
  reflection: string, 
  keywords: string[] | null | undefined,
  references: string[] | null | undefined
): JSX.Element {
  // Split reflection into paragraphs (stanzas)
  const paragraphs = reflection.split(/\n\n+/);
  
  // Combine keywords and references for matching (without markdown markers)
  const allKeywords = (keywords || []).map(k => k.replace(/\*+/g, ''));
  const allReferences = (references || []).map(r => r.replace(/\*+/g, ''));
  
  // Sort by length (longer first) to avoid partial matching issues
  const sortedKeywords = [...allKeywords].sort((a, b) => b.length - a.length);
  const sortedReferences = [...allReferences].sort((a, b) => b.length - a.length);
  
  const renderParagraphContent = (para: string) => {
    // Parse markdown-style bold (**text**) and italic (*text*)
    // Pattern matches **bold**, *italic*, and plain text
    const markdownPattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = para.split(markdownPattern);
    
    return (
      <>
        {parts.map((part, index) => {
          // Check for markdown bold **text**
          if (part.startsWith('**') && part.endsWith('**')) {
            const text = part.slice(2, -2);
            return <strong key={index} style={{ fontWeight: 700 }}>{text}</strong>;
          }
          // Check for markdown italic *text*
          if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            const text = part.slice(1, -1);
            return <em key={index} style={{ fontStyle: 'italic' }}>{text}</em>;
          }
          
          // For plain text, check if it matches keywords or references
          if (sortedKeywords.length > 0 || sortedReferences.length > 0) {
            const allTerms = [...sortedKeywords, ...sortedReferences];
            const pattern = new RegExp(
              `(${allTerms.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
              'gi'
            );
            const subParts = part.split(pattern);
            return (
              <span key={index}>
                {subParts.map((subPart, subIndex) => {
                  const isKeyword = sortedKeywords.some(k => k.toLowerCase() === subPart.toLowerCase());
                  const isReference = sortedReferences.some(r => r.toLowerCase() === subPart.toLowerCase());
                  
                  if (isKeyword) {
                    return <strong key={subIndex} style={{ fontWeight: 700 }}>{subPart}</strong>;
                  } else if (isReference) {
                    return <em key={subIndex} style={{ fontStyle: 'italic' }}>{subPart}</em>;
                  }
                  return <span key={subIndex}>{subPart}</span>;
                })}
              </span>
            );
          }
          
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };
  
  return (
    <>
      {paragraphs.map((para, paraIndex) => (
        <span 
          key={paraIndex} 
          style={{ 
            display: 'block', 
            textIndent: '1.5em',
            marginBottom: paraIndex < paragraphs.length - 1 ? '0.8em' : 0
          }}
        >
          {renderParagraphContent(para)}
        </span>
      ))}
    </>
  );
}

export default function VersiculoDoDiaPage() {
  const [shareOpen, setShareOpen] = useState(false);
  const [reflectionShareOpen, setReflectionShareOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const reflectionCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const params = useParams<{ date?: string }>();
  const [, navigate] = useLocation();

  const isHistoricalView = !!params.date;

  const { data: todayVerse, isLoading } = useQuery<DailyVersePost>({
    queryKey: isHistoricalView ? ["/api/site/daily-verse", params.date] : ["/api/site/daily-verse"],
    queryFn: async () => {
      const endpoint = isHistoricalView 
        ? `/api/site/daily-verse/${params.date}` 
        : "/api/site/daily-verse";
      const res = await fetch(endpoint);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch verse");
      }
      return res.json();
    },
    retry: false,
  });

  const { data: verseHistory } = useQuery<DailyVersePost[]>({
    queryKey: ["/api/site/daily-verses"],
  });

  const backgroundImage = todayVerse?.stockImage?.imageUrl || todayVerse?.imageUrl;

  // Mutation to record share (only for authenticated users)
  const recordShareMutation = useMutation({
    mutationFn: async (data: { platform: string; versePostId?: number }) => {
      const res = await apiRequest("POST", "/api/study/daily-verse/share", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/study/daily-verse/shared-today"] });
    },
    onError: () => {
      // Silently fail - sharing should still work even if tracking fails
    },
  });

  // Pre-load image for html2canvas - use proxy URL for CORS compatibility
  const proxyImageUrl = backgroundImage 
    ? `/api/proxy-image?url=${encodeURIComponent(backgroundImage)}`
    : null;

  // State to hold the pre-cropped background image data URL
  const [croppedBgDataUrl, setCroppedBgDataUrl] = useState<string | null>(null);

  // Pre-load and crop background image to match 9:16 aspect ratio (simulates object-fit: cover)
  useEffect(() => {
    if (!proxyImageUrl || (!shareOpen && !reflectionShareOpen)) {
      setCroppedBgDataUrl(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Target aspect ratio is 9:16 (width:height)
      const targetAspect = 9 / 16;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      
      let srcX = 0, srcY = 0, srcW = img.naturalWidth, srcH = img.naturalHeight;
      
      if (imgAspect > targetAspect) {
        // Image is wider than target - crop sides (center horizontally)
        srcW = img.naturalHeight * targetAspect;
        srcX = (img.naturalWidth - srcW) / 2;
      } else {
        // Image is taller than target - crop top/bottom (center vertically)
        srcH = img.naturalWidth / targetAspect;
        srcY = (img.naturalHeight - srcH) / 2;
      }
      
      // Create canvas with exact 9:16 ratio at ultra high resolution (matches export size)
      const exportWidth = 2160;
      const exportHeight = 3840;
      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        // Draw cropped portion to fill the entire canvas at full export resolution
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, exportWidth, exportHeight);
        // Use PNG for better quality (no JPEG compression artifacts)
        setCroppedBgDataUrl(canvas.toDataURL('image/png'));
        console.log('[DailyVerse] Background image cropped at 2160x3840');
      }
    };
    img.onerror = () => {
      console.log('[DailyVerse] Failed to load background image');
      setCroppedBgDataUrl(null);
    };
    img.src = proxyImageUrl;
  }, [proxyImageUrl, shareOpen, reflectionShareOpen]);

  const generateAndShareImage = useCallback(async (platform: 'whatsapp' | 'instagram' | 'download') => {
    if (!shareCardRef.current) return;

    setGenerating(true);
    try {
      // Use ultra high resolution for sharp export (2x story resolution)
      const cardWidth = 2160; // 2x Full HD width for stories
      const cardHeight = 3840; // 2x Full HD height for stories (9:16)
      const scale = 1; // No scaling needed since we're already at full resolution
      const borderRadius = 80; // Scaled border-radius for ultra high res
      
      // Create off-screen container with fully transparent background
      // This prevents blending with Dialog's light background
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
      
      // Clone the share card into the off-screen container at full resolution
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
      
      // Set explicit pixel sizes for ultra high-res export (25% smaller than proportional preview sizes)
      // Preview at 270px width has these rem sizes, scaled to 2160px (8x) then reduced 25%
      const scaleFactor = 8 * 0.75; // 6x scale
      
      const textElements = clonedCard.querySelectorAll('h3, p');
      textElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const currentSize = parseFloat(htmlEl.style.fontSize);
        if (!isNaN(currentSize)) {
          // Convert rem to px at scale
          const pxSize = Math.round(currentSize * 16 * scaleFactor);
          htmlEl.style.fontSize = `${pxSize}px`;
        }
      });
      
      // Ensure strong/bold elements have proper font-weight for html2canvas
      const strongElements = clonedCard.querySelectorAll('strong');
      strongElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.fontWeight = '700';
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
      
      // Fix the reference container (p with inline-flex) and icon alignment
      const svgIcon = clonedCard.querySelector('svg');
      if (svgIcon) {
        const parentP = svgIcon.closest('p') as HTMLElement;
        const scaledSize = 58;
        
        if (parentP) {
          // Force explicit flex centering on parent container
          parentP.style.display = 'flex';
          parentP.style.alignItems = 'center';
          parentP.style.justifyContent = 'center';
          // Reduce gap - closer to reference
          parentP.style.gap = '48px';
          // Set line-height to match icon size to prevent clipping
          parentP.style.lineHeight = `${scaledSize}px`;
          parentP.style.overflow = 'visible';
        }
        
        // Wrap SVG in a fixed-height flex container for stable centering
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
        
        // Scale SVG size for high-res export
        svgIcon.setAttribute('width', `${scaledSize}`);
        svgIcon.setAttribute('height', `${scaledSize}`);
        svgIcon.style.width = `${scaledSize}px`;
        svgIcon.style.height = `${scaledSize}px`;
        svgIcon.style.flexShrink = '0';
        svgIcon.style.display = 'block';
        svgIcon.style.marginRight = '0';
        svgIcon.style.marginTop = '0';
        
        // Convert SVG to inline data URL image for maximum html2canvas compatibility
        const svgClone = svgIcon.cloneNode(true) as SVGElement;
        svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const svgString = new XMLSerializer().serializeToString(svgClone);
        const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
        const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;
        
        // Create img element to replace SVG
        const imgElement = document.createElement('img');
        imgElement.src = svgDataUrl;
        imgElement.style.cssText = `
          width: ${scaledSize}px;
          height: ${scaledSize}px;
          display: block;
          flex-shrink: 0;
        `;
        
        // Insert wrapper with the image instead of SVG
        svgIcon.parentNode?.insertBefore(wrapper, svgIcon);
        wrapper.appendChild(imgElement);
        svgIcon.remove();
      }
      
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
      
      // Wait for fonts to be fully loaded (ensures bold text renders correctly)
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      
      // Wait for images to load in cloned element
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Capture from the off-screen container at full resolution
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
      
      // Remove off-screen container
      document.body.removeChild(offscreenContainer);

      // Use clip-first strategy: draw mask first, then image with source-in
      // This prevents white pixels from ever being blended into the canvas
      const srcWidth = sourceCanvas.width;
      const srcHeight = sourceCanvas.height;
      const scaledRadius = Math.round(borderRadius * scale);
      
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = srcWidth;
      finalCanvas.height = srcHeight;
      const ctx = finalCanvas.getContext('2d');
      
      if (!ctx) {
        toast({ title: "Erro ao gerar imagem", variant: "destructive" });
        setGenerating(false);
        return;
      }

      // Step 1: Draw the rounded-rect mask FIRST (this defines what pixels can exist)
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
      
      // Step 2: Draw the image using source-in (only draws where mask exists)
      // This means white edge pixels from html2canvas will NOT be painted
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(sourceCanvas, 0, 0);
      
      // Step 3: Hard alpha clamp - force semi-transparent pixels to fully transparent
      // This removes anti-aliased edge pixels that appear white on white backgrounds
      const imageData = ctx.getImageData(0, 0, srcWidth, srcHeight);
      const data = imageData.data;
      const alphaThreshold = 250; // Pixels with alpha < 250 become fully transparent
      
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0 && data[i] < alphaThreshold) {
          data[i] = 0; // Force fully transparent
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const shareUrl = `${window.location.origin}/versiculo-do-dia`;
      const shareText = `✨ *Versículo do Dia* - UMP Emaús ✨\n\nLeia a reflexão completa:\n${shareUrl}`;

      if (platform === 'download') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setGenerating(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'versiculo-do-dia.png';
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Imagem baixada!" });
          // Record share for mission tracking
          recordShareMutation.mutate({ platform: 'download', versePostId: todayVerse?.id });
          setGenerating(false);
          setShareOpen(false);
        }, 'image/png', 1.0);
      } else if (platform === 'whatsapp') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setGenerating(false);
            return;
          }
          const file = new File([blob], 'versiculo-do-dia.png', { type: 'image/png' });
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
              title: 'Versiculo do Dia',
            });
          } else {
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            window.open(whatsappUrl, '_blank');
          }
          // Record share for mission tracking
          recordShareMutation.mutate({ platform: 'whatsapp', versePostId: todayVerse?.id });
          setGenerating(false);
          setShareOpen(false);
        }, 'image/png', 1.0);
      } else if (platform === 'instagram') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setGenerating(false);
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
          a.download = 'versiculo-do-dia.png';
          a.click();
          URL.revokeObjectURL(url);
          toast({ 
            title: "Imagem baixada + Legenda copiada!", 
            description: "Abra o Instagram e cole a legenda ao compartilhar" 
          });
          // Record share for mission tracking
          recordShareMutation.mutate({ platform: 'instagram', versePostId: todayVerse?.id });
          setGenerating(false);
          setShareOpen(false);
        }, 'image/png', 1.0);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
      setGenerating(false);
    }
  }, [todayVerse, toast, recordShareMutation]);

  // Function to generate and share reflection image - EXACT DUPLICATE of generateAndShareImage
  const generateAndShareReflectionImage = useCallback(async (platform: 'whatsapp' | 'instagram' | 'download') => {
    if (!reflectionCardRef.current) return;

    setGenerating(true);
    try {
      // Use ultra high resolution for sharp export (2x story resolution)
      const cardWidth = 2160; // 2x Full HD width for stories
      const cardHeight = 3840; // 2x Full HD height for stories (9:16)
      const scale = 1; // No scaling needed since we're already at full resolution
      const borderRadius = 80; // Scaled border-radius for ultra high res
      
      // Create off-screen container with fully transparent background
      // This prevents blending with Dialog's light background
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
      
      // Clone the share card into the off-screen container at full resolution
      const clonedCard = reflectionCardRef.current.cloneNode(true) as HTMLElement;
      clonedCard.style.cssText = `
        width: ${cardWidth}px;
        height: ${cardHeight}px;
        border-radius: ${borderRadius}px;
        overflow: hidden;
        background: transparent;
        margin: 0;
        padding: 0;
      `;
      
      // Set explicit pixel sizes for ultra high-res export (25% smaller than proportional preview sizes)
      // Preview at 270px width has these rem sizes, scaled to 2160px (8x) then reduced 25%
      const scaleFactor = 8 * 0.75; // 6x scale
      
      const textElements = clonedCard.querySelectorAll('h3, p');
      textElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const currentSize = parseFloat(htmlEl.style.fontSize);
        if (!isNaN(currentSize)) {
          // Convert rem to px at scale
          const pxSize = Math.round(currentSize * 16 * scaleFactor);
          htmlEl.style.fontSize = `${pxSize}px`;
        }
      });
      
      // Scale div elements with fontSize (for reflection content text that uses div)
      const divElements = clonedCard.querySelectorAll('div');
      divElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const currentSize = parseFloat(htmlEl.style.fontSize);
        if (!isNaN(currentSize) && currentSize > 0) {
          const pxSize = Math.round(currentSize * 16 * scaleFactor);
          htmlEl.style.fontSize = `${pxSize}px`;
        }
      });
      
      // Ensure strong/bold elements have proper font-weight for html2canvas
      const strongElements = clonedCard.querySelectorAll('strong');
      strongElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.fontWeight = '700';
      });
      
      // Ensure italic elements have proper font-style for html2canvas
      const emElements = clonedCard.querySelectorAll('em');
      emElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.fontStyle = 'italic';
      });
      
      // Scale reflection title margin-bottom (1.05rem * 16 * 6 = 101px)
      const allParagraphs = clonedCard.querySelectorAll('p');
      allParagraphs.forEach((p) => {
        const htmlP = p as HTMLElement;
        // Reflection title has fontWeight 700 and margin with 1.05rem
        if (htmlP.style.fontWeight === '700' && htmlP.style.margin?.includes('1.05rem')) {
          htmlP.style.margin = '0 0 101px 0';
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
      
      // Wait for fonts to be fully loaded (ensures bold text renders correctly)
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      
      // Wait for images to load in cloned element
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Capture from the off-screen container at full resolution
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
      
      // Remove off-screen container
      document.body.removeChild(offscreenContainer);

      // Use clip-first strategy: draw mask first, then image with source-in
      // This prevents white pixels from ever being blended into the canvas
      const srcWidth = sourceCanvas.width;
      const srcHeight = sourceCanvas.height;
      const scaledRadius = Math.round(borderRadius * scale);
      
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = srcWidth;
      finalCanvas.height = srcHeight;
      const ctx = finalCanvas.getContext('2d');
      
      if (!ctx) {
        toast({ title: "Erro ao gerar imagem", variant: "destructive" });
        setGenerating(false);
        return;
      }

      // Step 1: Draw the rounded-rect mask FIRST (this defines what pixels can exist)
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
      
      // Step 2: Draw the image using source-in (only draws where mask exists)
      // This means white edge pixels from html2canvas will NOT be painted
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(sourceCanvas, 0, 0);
      
      // Step 3: Hard alpha clamp - force semi-transparent pixels to fully transparent
      // This removes anti-aliased edge pixels that appear white on white backgrounds
      const imageData = ctx.getImageData(0, 0, srcWidth, srcHeight);
      const data = imageData.data;
      const alphaThreshold = 250; // Pixels with alpha < 250 become fully transparent
      
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0 && data[i] < alphaThreshold) {
          data[i] = 0; // Force fully transparent
        }
      }
      ctx.putImageData(imageData, 0, 0);

      const shareUrl = `${window.location.origin}/versiculo-do-dia`;
      const shareText = `✨ *Reflexão do Dia* - UMP Emaús ✨\n\nLeia mais:\n${shareUrl}`;

      if (platform === 'download') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setGenerating(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'reflexao-do-dia.png';
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Imagem baixada!" });
          // Record share for mission tracking
          recordShareMutation.mutate({ platform: 'download', versePostId: todayVerse?.id });
          setGenerating(false);
          setReflectionShareOpen(false);
        }, 'image/png', 1.0);
      } else if (platform === 'whatsapp') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setGenerating(false);
            return;
          }
          const file = new File([blob], 'reflexao-do-dia.png', { type: 'image/png' });
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
              title: 'Reflexão do Dia',
            });
          } else {
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
            window.open(whatsappUrl, '_blank');
          }
          // Record share for mission tracking
          recordShareMutation.mutate({ platform: 'whatsapp', versePostId: todayVerse?.id });
          setGenerating(false);
          setReflectionShareOpen(false);
        }, 'image/png', 1.0);
      } else if (platform === 'instagram') {
        finalCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setGenerating(false);
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
          a.download = 'reflexao-do-dia.png';
          a.click();
          URL.revokeObjectURL(url);
          toast({ 
            title: "Imagem baixada + Legenda copiada!", 
            description: "Abra o Instagram e cole a legenda ao compartilhar" 
          });
          // Record share for mission tracking
          recordShareMutation.mutate({ platform: 'instagram', versePostId: todayVerse?.id });
          setGenerating(false);
          setReflectionShareOpen(false);
        }, 'image/png', 1.0);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
      setGenerating(false);
    }
  }, [todayVerse, toast, recordShareMutation]);

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-6" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        {todayVerse ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden mb-8">
              <div 
                className="relative h-80 md:h-96 bg-cover bg-center"
                style={{ 
                  backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                  backgroundColor: backgroundImage ? undefined : 'hsl(var(--primary))'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white">
                  <div className="flex items-center gap-2 mb-4 text-white/80">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {format(new Date(todayVerse.publishedAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">Versículo do Dia</h1>
                  <p className="text-lg md:text-xl italic leading-relaxed">
                    "{todayVerse.verse}"
                  </p>
                  <p className="text-sm md:text-base mt-2 font-medium text-white/90">
                    {todayVerse.reference}
                  </p>
                </div>
              </div>

              <CardContent className="p-6 md:p-8">
                <div className="flex justify-center mb-6">
                  <Button 
                    onClick={() => setShareOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="button-share-verse"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartilhar Versículo
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <BookOpen className="h-5 w-5" />
                  <span>Reflexão</span>
                </div>

                {todayVerse.reflection ? (
                  <>
                    {todayVerse.reflectionTitle && (
                      <h3 className="text-xl font-bold mb-4 text-foreground">
                        {todayVerse.reflectionTitle}
                      </h3>
                    )}
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                      {todayVerse.reflection.split('\n\n').map((paragraph, index) => (
                        <p 
                          key={index} 
                          className="text-foreground/90 leading-relaxed mb-4"
                          style={{ textIndent: '1.5em' }}
                        >
                          {renderReflectionWithFormatting(
                            paragraph,
                            todayVerse.reflectionKeywords,
                            todayVerse.reflectionReferences
                          )}
                        </p>
                      ))}
                    </div>
                    <div className="mt-6 flex justify-center">
                      <Button 
                        onClick={() => setReflectionShareOpen(true)}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        data-testid="button-share-reflection"
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Compartilhar Reflexão
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground italic">
                    Reflexão em preparação...
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <Card className="p-8 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Versículo do Dia</h2>
            <p className="text-muted-foreground">
              O versículo de hoje será publicado às 7h da manhã. Volte mais tarde!
            </p>
          </Card>
        )}

        {verseHistory && verseHistory.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Histórico de Versículos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {verseHistory.slice(0, 12).map((verse) => (
                <Card 
                  key={verse.id} 
                  className="overflow-hidden hover-elevate cursor-pointer"
                  onClick={() => {
                    const date = format(new Date(verse.publishedAt), 'yyyy-MM-dd');
                    navigate(`/versiculo-do-dia/${date}`);
                  }}
                  data-testid={`card-verse-${verse.id}`}
                >
                  <div 
                    className="h-32 bg-cover bg-center relative"
                    style={{ 
                      backgroundImage: verse.stockImage?.imageUrl ? `url(${verse.stockImage.imageUrl})` : undefined,
                      backgroundColor: verse.stockImage?.imageUrl ? undefined : 'hsl(var(--primary))'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3 text-white">
                      <p className="text-xs opacity-80">
                        {format(new Date(verse.publishedAt), "d MMM yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm italic line-clamp-2 mb-2">
                      "{verse.verse}"
                    </p>
                    <p className="text-xs font-medium text-primary">
                      {verse.reference}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg mx-auto" data-testid="dialog-share-verse">
          <DialogHeader>
            <DialogTitle>Compartilhar Versículo</DialogTitle>
          </DialogHeader>

          <div 
            ref={shareCardRef}
            data-share-card="verse"
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
            {/* Background image - use pre-cropped data URL for exact 9:16 aspect ratio match */}
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
                  objectFit: croppedBgDataUrl ? 'fill' : 'cover', // Use fill for pre-cropped, cover for loading
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
                  VERSÍCULO DO DIA
                </h3>
                <p style={{ 
                  fontSize: '0.7rem', 
                  opacity: 0.9,
                  margin: '0.3rem 0 0 0',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)' 
                }}>
                  {todayVerse && format(new Date(todayVerse.publishedAt), "d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>

              <div style={{ 
                textAlign: 'center', 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '0 0.8rem',
                overflow: 'hidden'
              }}>
                <div>
                  <p style={{ 
                    fontSize: '1.1rem', 
                    fontStyle: 'italic', 
                    fontWeight: 400,
                    lineHeight: 1.4,
                    margin: '0 0 0.7rem 0',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)' 
                  }}>
                    {todayVerse?.verse ? renderVerseWithHighlights(todayVerse.verse, todayVerse.highlightedKeywords) : ''}
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
                    <span style={{ lineHeight: 1 }}>{todayVerse?.reference ? formatReference(todayVerse.reference) : ''}</span>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.8rem' }}>
                <img src={logoWhite} alt="UMP Emaús" style={{ height: '4.6rem', opacity: 0.95, display: 'block' }} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 justify-center">
            <Button
              onClick={() => generateAndShareImage('whatsapp')}
              disabled={generating}
              className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
              data-testid="button-share-whatsapp"
            >
              {generating ? (
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
              disabled={generating}
              className="flex-1 min-w-[120px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              data-testid="button-share-instagram"
            >
              {generating ? (
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
              disabled={generating}
              variant="outline"
              size="icon"
              data-testid="button-download"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reflectionShareOpen} onOpenChange={setReflectionShareOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg mx-auto" data-testid="dialog-share-reflection">
          <DialogHeader>
            <DialogTitle>Compartilhar Reflexão</DialogTitle>
          </DialogHeader>

          <div 
            ref={reflectionCardRef}
            data-share-card="reflection"
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
                  REFLEXÃO DO DIA
                </h3>
                <p style={{ 
                  fontSize: '0.7rem', 
                  opacity: 0.9,
                  margin: '0.3rem 0 0 0',
                  textShadow: '0 1px 3px rgba(0,0,0,0.5)' 
                }}>
                  {todayVerse && format(new Date(todayVerse.publishedAt), "d 'de' MMMM", { locale: ptBR })}
                </p>
              </div>

              <div style={{ 
                textAlign: 'center', 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '0 0.8rem',
                overflow: 'hidden'
              }}>
                <div>
                  {todayVerse?.reflectionTitle && (
                    <p style={{ 
                      fontSize: '0.908rem', 
                      fontWeight: 700,
                      lineHeight: 1.4,
                      margin: '0 0 1.05rem 0',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)' 
                    }}>
                      {todayVerse.reflectionTitle}
                    </p>
                  )}
                  <div style={{ 
                    fontSize: todayVerse?.reflection && todayVerse.reflection.length > 500 ? '0.787rem' : todayVerse?.reflection && todayVerse.reflection.length > 350 ? '0.908rem' : '1.029rem', 
                    fontWeight: 400,
                    lineHeight: todayVerse?.reflection && todayVerse.reflection.length > 500 ? 1.4 : 1.5,
                    margin: 0,
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    textAlign: 'justify'
                  }}>
                    {todayVerse?.reflection ? renderReflectionWithFormatting(
                      todayVerse.reflection,
                      todayVerse.reflectionKeywords,
                      todayVerse.reflectionReferences
                    ) : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.8rem' }}>
                <img src={logoWhite} alt="UMP Emaús" style={{ height: '4.6rem', opacity: 0.95, display: 'block' }} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 justify-center">
            <Button
              onClick={() => generateAndShareReflectionImage('whatsapp')}
              disabled={generating}
              className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
              data-testid="button-share-reflection-whatsapp"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <SiWhatsapp className="mr-2 h-4 w-4" />
                  WhatsApp
                </>
              )}
            </Button>
            <Button
              onClick={() => generateAndShareReflectionImage('instagram')}
              disabled={generating}
              className="flex-1 min-w-[120px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              data-testid="button-share-reflection-instagram"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <SiInstagram className="mr-2 h-4 w-4" />
                  Instagram
                </>
              )}
            </Button>
            <Button
              onClick={() => generateAndShareReflectionImage('download')}
              disabled={generating}
              variant="outline"
              size="icon"
              data-testid="button-download-reflection"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
