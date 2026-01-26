import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from 'canvas';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

interface VerseData {
  verse: string;
  reference: string;
  highlightedKeywords?: string[] | null;
}

interface ReflectionData {
  reflectionTitle: string;
  reflection: string;
  reflectionKeywords?: string[] | null;
  reflectionReferences?: string[] | null;
}

interface BirthdayData {
  firstName: string;
  photoUrl?: string | null;
}

async function loadBackgroundImage(imageUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('[StoryGenerator] Error loading background:', error);
    throw error;
  }
}

async function cropImageToCover(imageBuffer: Buffer, targetWidth: number, targetHeight: number): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }
  
  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = metadata.width / metadata.height;
  
  let extractWidth = metadata.width;
  let extractHeight = metadata.height;
  let left = 0;
  let top = 0;
  
  if (sourceAspect > targetAspect) {
    extractWidth = Math.round(metadata.height * targetAspect);
    left = Math.round((metadata.width - extractWidth) / 2);
  } else {
    extractHeight = Math.round(metadata.width / targetAspect);
    top = Math.round((metadata.height - extractHeight) / 2);
  }
  
  return await sharp(imageBuffer)
    .extract({ left, top, width: extractWidth, height: extractHeight })
    .resize(targetWidth, targetHeight)
    .toBuffer();
}

function wrapText(ctx: NodeCanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

export async function generateVerseStoryImage(
  verseData: VerseData,
  backgroundImageUrl: string
): Promise<Buffer> {
  console.log('[StoryGenerator] Generating verse story image...');
  
  const canvas = createCanvas(STORY_WIDTH, STORY_HEIGHT);
  const ctx = canvas.getContext('2d');
  
  try {
    const bgBuffer = await loadBackgroundImage(backgroundImageUrl);
    const croppedBg = await cropImageToCover(bgBuffer, STORY_WIDTH, STORY_HEIGHT);
    const bgImage = await loadImage(croppedBg);
    ctx.drawImage(bgImage, 0, 0, STORY_WIDTH, STORY_HEIGHT);
  } catch (error) {
    console.log('[StoryGenerator] Using fallback gradient background');
    const gradient = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  }
  
  const overlayGradient = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
  overlayGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
  overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
  ctx.fillStyle = overlayGradient;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  
  const padding = 80;
  const maxTextWidth = STORY_WIDTH - (padding * 2);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  
  ctx.font = 'italic 36px Georgia, serif';
  const verseLines = wrapText(ctx, `"${verseData.verse}"`, maxTextWidth);
  const lineHeight = 52;
  let y = STORY_HEIGHT * 0.35;
  
  for (const line of verseLines) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += lineHeight;
  }
  
  y += 40;
  ctx.font = 'bold 32px Georgia, serif';
  const formattedRef = verseData.reference.replace(/\s*\(ARA\)\s*/gi, '').toUpperCase();
  ctx.fillText(formattedRef, STORY_WIDTH / 2, y);
  
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('UMP EMAUS', STORY_WIDTH / 2, STORY_HEIGHT - 80);
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText('@umpemaus', STORY_WIDTH / 2, STORY_HEIGHT - 50);
  
  return canvas.toBuffer('image/png');
}

export async function generateReflectionStoryImage(
  reflectionData: ReflectionData,
  backgroundImageUrl: string
): Promise<Buffer> {
  console.log('[StoryGenerator] Generating reflection story image...');
  
  const canvas = createCanvas(STORY_WIDTH, STORY_HEIGHT);
  const ctx = canvas.getContext('2d');
  
  try {
    const bgBuffer = await loadBackgroundImage(backgroundImageUrl);
    const croppedBg = await cropImageToCover(bgBuffer, STORY_WIDTH, STORY_HEIGHT);
    const bgImage = await loadImage(croppedBg);
    ctx.drawImage(bgImage, 0, 0, STORY_WIDTH, STORY_HEIGHT);
  } catch (error) {
    console.log('[StoryGenerator] Using fallback gradient background');
    const gradient = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
    gradient.addColorStop(0, '#2d1b4e');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  }
  
  const overlayGradient = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
  overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
  overlayGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.6)');
  overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
  ctx.fillStyle = overlayGradient;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  
  const padding = 80;
  const maxTextWidth = STORY_WIDTH - (padding * 2);
  
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  
  ctx.font = 'bold 42px Georgia, serif';
  const titleLines = wrapText(ctx, reflectionData.reflectionTitle, maxTextWidth);
  let y = STORY_HEIGHT * 0.15;
  const titleLineHeight = 54;
  
  for (const line of titleLines) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += titleLineHeight;
  }
  
  y += 60;
  
  const cleanReflection = reflectionData.reflection
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1');
  
  const paragraphs = cleanReflection.split(/\n\n+/).slice(0, 3);
  
  ctx.font = '28px Georgia, serif';
  const reflectionLineHeight = 42;
  
  for (const para of paragraphs) {
    const lines = wrapText(ctx, para, maxTextWidth);
    for (const line of lines) {
      if (y > STORY_HEIGHT - 200) break;
      ctx.fillText(line, STORY_WIDTH / 2, y);
      y += reflectionLineHeight;
    }
    y += 20;
    if (y > STORY_HEIGHT - 200) break;
  }
  
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('UMP EMAUS', STORY_WIDTH / 2, STORY_HEIGHT - 80);
  ctx.font = '18px Arial, sans-serif';
  ctx.fillText('@umpemaus', STORY_WIDTH / 2, STORY_HEIGHT - 50);
  
  return canvas.toBuffer('image/png');
}

export async function generateBirthdayStoryImage(
  birthdayData: BirthdayData,
  templatePath?: string
): Promise<Buffer> {
  console.log('[StoryGenerator] Generating birthday story image for:', birthdayData.firstName);
  
  const templateWidth = 1221;
  const templateHeight = 2171;
  const finalWidth = 2160;
  const finalHeight = 3840;
  
  const canvas = createCanvas(templateWidth, templateHeight);
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, templateWidth, templateHeight);
  
  const photoSize = Math.round(templateWidth * 0.65);
  const photoX = (templateWidth - photoSize) / 2;
  const photoY = templateHeight * 0.49 - photoSize / 2;
  
  if (birthdayData.photoUrl) {
    try {
      let photoBuffer: Buffer;
      
      const response = await fetch(birthdayData.photoUrl);
      if (!response.ok) throw new Error('Failed to fetch photo');
      const arrayBuffer = await response.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      
      photoBuffer = await sharp(inputBuffer)
        .resize(photoSize, photoSize, { fit: 'cover' })
        .jpeg({ quality: 95 })
        .toBuffer();
      
      const photoImage = await loadImage(photoBuffer);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(photoImage, photoX, photoY, photoSize, photoSize);
      ctx.restore();
    } catch (error) {
      console.error('[StoryGenerator] Error loading member photo:', error);
      ctx.fillStyle = '#5B21B6';
      ctx.beginPath();
      ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${photoSize * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        birthdayData.firstName.charAt(0).toUpperCase(),
        photoX + photoSize / 2,
        photoY + photoSize / 2
      );
    }
  } else {
    ctx.fillStyle = '#5B21B6';
    ctx.beginPath();
    ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${photoSize * 0.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      birthdayData.firstName.charAt(0).toUpperCase(),
      photoX + photoSize / 2,
      photoY + photoSize / 2
    );
  }
  
  const defaultTemplatePath = path.join(process.cwd(), 'client/public/birthday-template.png');
  const actualTemplatePath = templatePath || defaultTemplatePath;
  
  if (fs.existsSync(actualTemplatePath)) {
    try {
      const templateImage = await loadImage(actualTemplatePath);
      ctx.drawImage(templateImage, 0, 0, templateWidth, templateHeight);
    } catch (error) {
      console.error('[StoryGenerator] Error loading birthday template:', error);
    }
  } else {
    console.log('[StoryGenerator] Birthday template not found at:', actualTemplatePath);
  }
  
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px "Dancing Script", cursive, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const firstName = birthdayData.firstName.charAt(0).toUpperCase() + 
                    birthdayData.firstName.slice(1).toLowerCase();
  
  const nameY = templateHeight * (1 - 0.275);
  ctx.fillText(firstName, templateWidth / 2, nameY);
  
  const finalCanvas = createCanvas(finalWidth, finalHeight);
  const finalCtx = finalCanvas.getContext('2d');
  
  finalCtx.clearRect(0, 0, finalWidth, finalHeight);
  
  const scaleX = finalWidth / templateWidth;
  const scaleY = finalHeight / templateHeight;
  
  const tempBuffer = canvas.toBuffer('image/png');
  const tempImage = await loadImage(tempBuffer);
  finalCtx.drawImage(tempImage, 0, 0, finalWidth, finalHeight);
  
  return finalCanvas.toBuffer('image/png');
}

export async function uploadStoryImageToR2(
  imageBuffer: Buffer,
  filename: string
): Promise<string | null> {
  const { uploadToR2, isR2Configured, getPublicUrl } = await import('./r2-storage');
  
  // CORREÇÃO CRÍTICA: Força a extensão .png para garantir transparência
  const finalFilename = filename.replace(/\.(jpg|jpeg)$/i, '.png');
  
  if (!isR2Configured()) {
    console.log('[StoryGenerator] R2 not configured - saving locally for development');
    
    const publicDir = path.join(process.cwd(), 'public', 'temp-stories');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    const localPath = path.join(publicDir, finalFilename);
    fs.writeFileSync(localPath, imageBuffer);
    
    const domain = process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
      : `http://localhost:5000`;
    const publicUrl = `${domain}/temp-stories/${finalFilename}`;
    
    console.log('[StoryGenerator] Story image saved locally:', publicUrl);
    return publicUrl;
  }
  
  // Upload como PNG
  const result = await uploadToR2(imageBuffer, 'instagram-stories' as any, 'image/png', finalFilename);
  
  if (result) {
    const publicUrl = getPublicUrl(result);
    console.log('[StoryGenerator] Story image uploaded to R2:', publicUrl);
    return publicUrl;
  }
  
  return null;
}
