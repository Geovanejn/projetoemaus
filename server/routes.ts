import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { getTodayBrazilDate, createBrazilDate, getEventCurrentDay } from "./utils/date";
import { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  authenticateToken, 
  requireAdmin, 
  requireMember,
  requireAdminOrMarketing,
  requireAdminOrEspiritualidade,
  requireMarketing,
  requireTreasurer,
  requireMarketingOrTreasurer,
  type AuthRequest 
} from "./auth";
import { 
  loginSchema, 
  registerSchema, 
  insertCandidateSchema,
  requestCodeSchema,
  verifyCodeSchema,
  addMemberSchema,
  updateMemberSchema,
  setPasswordSchema,
  loginPasswordSchema,
  getGravatarUrl,
  generatePdfVerificationHash,
  insertStudyEventSchema,
  insertStudyEventLessonSchema,
  insertCollectibleCardSchema,
  insertBoardMemberSchema,
  insertBannerSchema,
  insertSiteEventSchema,
  insertSeasonSchema,
  calculateCardRarity,
  // Update schemas for secure partial updates
  updateBannerSchema,
  updateBoardMemberSchema,
  updateSiteEventSchema,
  updateSeasonSchema,
  updateStudyEventSchema,
  updateStudyEventLessonSchema,
  updateCollectibleCardSchema,
} from "@shared/schema";
import { z, ZodError } from "zod";

// Helper function to check if an error is a ZodError
function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError || (error as any)?.name === 'ZodError';
}

// Rate limiting helper for Resend (2 requests per second max)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const EMAIL_RATE_LIMIT_DELAY = 110; // 110ms between emails (10 req/s limit approved by Resend)
import type { AuthResponse } from "@shared/schema";
import { sendVerificationEmail, sendPasswordResetEmail, sendSeasonRankingEmail, sendNewProductEmail } from "./email";
import { 
  generateStudyContentFromText,
  generateEventContentFromText, 
  generateStudyContentFromPDF,
  generateExercisesFromTopic, 
  generateReflectionQuestions,
  summarizeText,
  isAIConfigured,
  generateLessonFromPDFExact,
  AIProvider,
  randomizeMultipleChoiceAnswer
} from "./ai";
import multer from "multer";
import sharp from "sharp";
import rateLimit from "express-rate-limit";
import { moderateContent, shouldAutoReject } from "./profanity-filter";
import { 
  createPixPayment, 
  getPaymentStatus, 
  isMercadoPagoConfigured, 
  calculatePixFee,
  isValidWebhookPayload 
} from "./mercadopago";
import { 
  notifyNewDevotional, 
  notifyNewEvent, 
  notifyNewPrayerRequest, 
  notifyPrayerApproved,
  notifyNewComment,
  notifyDevotionalComment,
  notifySeasonPublished,
  notifySeasonEnded,
  notifyNewLessonToAll,
  notifyNewStudyEvent,
  notifyEventEnded,
  sendPushToUser
} from "./notifications";
import { syncInstagramPosts, isInstagramConfigured, fetchInstagramComments, publishInstagramStory, isInstagramPublishingConfigured, testInstagramStoryConfig } from "./instagram";
import { uploadStoryImageToR2 } from "./story-image-generator";
import { generateVerseShareImage, generateReflectionShareImage, generateBirthdayShareImage } from "./puppeteer-image-generator";
import { getDailyVerse as fetchDailyVerseFromAPI } from "./bible-api";
import { uploadToR2, isR2Configured, getFromR2, isR2Url, isBase64Url, getPublicUrl, getProxyUrl, logR2Status, type ImageCategory } from "./r2-storage";

// ==================== IMAGE URL CONVERSION HELPER ====================
// Converts r2:// URLs to PUBLIC URLs for direct CDN access (fast, no server proxy)
// This dramatically improves performance by bypassing the server for image delivery
function convertImageUrls<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Handle arrays - convert each item
  if (Array.isArray(obj)) {
    return obj.map(item => convertImageUrls(item)) as T;
  }
  
  // Comprehensive list of all image fields in the application
  const imageFields = [
    'imageUrl', 
    'coverImageUrl', 
    'photoUrl', 
    'profileImage', 
    'bannerImageUrl', 
    'bannerImageData',
    'imageData',
    'imageDataUrl',
    'thumbnailUrl',
    'iconUrl',
    'logoUrl'
  ];
  
  const result = { ...obj } as any;
  
  for (const field of imageFields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = getPublicUrl(result[field]);
    }
  }
  
  // Handle nested 'card' object specifically (for user cards API)
  if (result.card && typeof result.card === 'object') {
    result.card = convertImageUrls(result.card);
  }
  
  // Handle nested 'season' object specifically
  if (result.season && typeof result.season === 'object') {
    result.season = convertImageUrls(result.season);
  }
  
  // Handle nested 'event' object specifically
  if (result.event && typeof result.event === 'object') {
    result.event = convertImageUrls(result.event);
  }
  
  return result as T;
}

// Convert array of objects with image fields
function convertImageUrlsArray<T>(arr: T[]): T[] {
  return arr.map(item => convertImageUrls(item));
}

// Alias for consistency (same as convertImageUrls now that all use proxy)
function convertDailyVerseImageUrls<T>(obj: T): T {
  return convertImageUrls(obj);
}

// ==================== RATE LIMITING CONFIGURATION ====================

// Rate limiter geral para APIs publicas (100 req/15min)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisicoes por janela
  message: { message: "Muitas requisicoes. Tente novamente em alguns minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter rigoroso para autenticacao (5 req/15min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // limite de 5 tentativas
  message: { message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para envio de códigos (3 req/hora)
const codeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // limite de 3 envios por hora
  message: { message: "Muitos códigos solicitados. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para pedidos de oracao (10 req/hora)
const prayerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // limite de 10 pedidos por hora
  message: { message: "Muitos pedidos enviados. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== AUDIT LOGGING HELPER ====================

async function logAuditAction(
  userId: number | undefined,
  action: string,
  resource: string,
  resourceId?: number,
  details?: string,
  req?: { ip?: string; headers?: { [key: string]: string | string[] | undefined } }
) {
  try {
    await storage.createAuditLog({
      userId: userId || null,
      action,
      resource,
      resourceId: resourceId || null,
      details: details || null,
      ipAddress: req?.ip || null,
      userAgent: (req?.headers?.['user-agent'] as string) || null,
    });
  } catch (error) {
    console.error("[Audit Log] Failed to create log:", error);
  }
}

// ==================== BRAZILIAN PRICE PARSING HELPER ====================

/**
 * Parses Brazilian price format to cents.
 * Handles formats like: "25,00", "R$ 25,00", "R$ 1.234,56", "25.00", "1234.56", "R$ 1.234"
 * Brazilian format uses period as thousands separator and comma as decimal separator.
 * @returns price in centavos (integer), or null if parsing fails
 */
function parseBrazilianPrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null;
  
  // Remove currency symbol, spaces, and other non-numeric characters except . and ,
  let cleaned = priceStr.replace(/[R$\s]/gi, '').trim();
  
  if (!cleaned) return null;
  
  // Determine format by analyzing the string
  // Brazilian: 1.234,56 (period=thousands, comma=decimal)
  // American: 1,234.56 (comma=thousands, period=decimal)
  
  const lastComma = cleaned.lastIndexOf(',');
  const lastPeriod = cleaned.lastIndexOf('.');
  
  let normalizedValue: number;
  
  if (lastComma > lastPeriod) {
    // Brazilian format: period is thousands separator, comma is decimal
    // Remove thousands separators (periods) and replace comma with period
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    normalizedValue = parseFloat(cleaned);
  } else if (lastPeriod > lastComma && lastComma >= 0) {
    // American format with both separators: comma is thousands, period is decimal
    // Remove commas (thousands separators)
    cleaned = cleaned.replace(/,/g, '');
    normalizedValue = parseFloat(cleaned);
  } else if (lastComma >= 0 && lastPeriod < 0) {
    // Only comma present - treat as decimal separator (Brazilian simple format)
    cleaned = cleaned.replace(',', '.');
    normalizedValue = parseFloat(cleaned);
  } else if (lastPeriod >= 0 && lastComma < 0) {
    // Only period present - need to determine if it's thousands separator or decimal
    // Check if digits after last period are exactly 3 (thousands separator pattern)
    const afterPeriod = cleaned.substring(lastPeriod + 1);
    const beforePeriod = cleaned.substring(0, lastPeriod);
    
    // If exactly 3 digits after period AND digits before period form valid thousands pattern,
    // it's likely a Brazilian thousands separator (e.g., "1.234" = 1234, "12.345" = 12345)
    // If 1-2 digits after period, it's likely a decimal (e.g., "25.5" = 25.50, "25.00" = 25.00)
    if (afterPeriod.length === 3 && /^\d+$/.test(afterPeriod) && /^\d+$/.test(beforePeriod)) {
      // Brazilian thousands separator - remove all periods
      cleaned = cleaned.replace(/\./g, '');
      normalizedValue = parseFloat(cleaned);
    } else {
      // American decimal format
      normalizedValue = parseFloat(cleaned);
    }
  } else {
    // No decimal separator - treat as whole number
    normalizedValue = parseFloat(cleaned);
  }
  
  if (isNaN(normalizedValue) || normalizedValue <= 0) {
    return null;
  }
  
  // Convert to centavos (multiply by 100 and round to avoid floating point issues)
  return Math.round(normalizedValue * 100);
}

import { PDFParse } from "pdf-parse";

async function parsePdfBuffer(buffer: Buffer): Promise<{ text: string }> {
  console.log("[PDF Parser] Starting PDF extraction, buffer size:", buffer.length);
  const parser = new PDFParse({ data: buffer });
  let textResult = "";
  
  try {
    const result = await parser.getText();
    textResult = result.text || "";
    console.log("[PDF Parser] Extraction result - pages:", (result as any).numpages, "text length:", textResult.length);
    
    if (textResult.trim().length < 100) {
      console.log("[PDF Parser] Insufficient text extracted. PDF must contain selectable text (not scanned images).");
    } else {
      console.log("[PDF Parser] Text extraction successful. First 500 chars:", textResult.substring(0, 500));
    }
  } catch (error) {
    console.error("[PDF Parser] Error extracting text with pdf-parse:", error);
  } finally {
    await parser.destroy();
  }
  
  return { text: textResult };
}

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'));
    }
  }
});

// Configure multer for image uploads (50MB limit - will be compressed by sharp)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit - sharp will compress/resize large images
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens JPEG, PNG, WebP ou HEIC são permitidas'));
    }
  }
});

// Configure multer for audio uploads (10MB limit)
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for audio
  },
  fileFilter: (req, file, cb) => {
    // Accept various audio MIME types (browsers report different types)
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/x-mpeg', 'audio/mpeg3', 'audio/x-mpeg-3',
      'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/x-pn-wav',
      'audio/ogg', 'audio/x-ogg', 'application/ogg',
      'audio/aac', 'audio/x-aac', 'audio/aacp',
      'audio/m4a', 'audio/x-m4a', 'audio/mp4',
      'audio/webm',
      // Android often sends files as octet-stream when selecting from file managers
      'application/octet-stream'
    ];
    // Also check file extension as fallback
    const ext = file.originalname.toLowerCase().split('.').pop();
    const allowedExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm', 'opus', 'mp4', '3gp'];
    
    // Accept if mime type matches, or if file has audio extension, or if it's octet-stream (trust frontend filter)
    if (allowedMimes.includes(file.mimetype) || (ext && allowedExts.includes(ext))) {
      console.log(`[Upload Audio] Accepted file: ${file.originalname}, mimetype: ${file.mimetype}`);
      cb(null, true);
    } else {
      console.log(`[Upload Audio] Rejected file: ${file.originalname}, mimetype: ${file.mimetype}`);
      cb(new Error('Apenas arquivos de áudio são permitidos (MP3, WAV, OGG, AAC, M4A)'));
    }
  }
});

// Image compression settings
const MAX_IMAGE_WIDTH = 1920;
const MAX_IMAGE_HEIGHT = 1080;
const JPEG_QUALITY = 85;

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getIconForLessonType(type: string): string {
  const icons: Record<string, string> = {
    intro: "book-open",
    study: "star",
    meditation: "heart",
    challenge: "trophy",
    review: "crown"
  };
  return icons[type] || "star";
}

// Função unificada para calcular weekKey (domingo a sábado, timezone São Paulo)
// A semana começa no domingo (dia 1) e termina no sábado (dia 7) às 23:59
function getWeekKeyForLesson(): string {
  // Get current date in São Paulo timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const brazilDateStr = formatter.format(new Date());
  const [year, month, day] = brazilDateStr.split('-').map(Number);
  
  // Create date object for Brazil's current date
  const brazilDate = new Date(year, month - 1, day);
  
  // Get the Sunday of the current week (week starts on Sunday)
  const dayOfWeek = brazilDate.getDay(); // 0 = Sunday, 6 = Saturday
  const sundayOfWeek = new Date(brazilDate);
  sundayOfWeek.setDate(brazilDate.getDate() - dayOfWeek);
  
  // Calculate week number based on the Sunday's date
  const startOfYear = new Date(sundayOfWeek.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor((sundayOfWeek.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
  
  return `${sundayOfWeek.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

function getStageFromUnitType(unitType: string): string {
  const unitTypeToStage: Record<string, string> = {
    'text': 'estude',
    'verse': 'estude',
    'meditation': 'medite',
    'reflection': 'medite',
    'multiple_choice': 'responda',
    'true_false': 'responda',
    'fill_blank': 'responda'
  };
  return unitTypeToStage[unitType] || 'estude';
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Aplicar rate limiter geral para APIs publicas do site
  app.use("/api/site", generalLimiter);

  // ==================== UPLOADS DIRECTORY ====================
  const uploadsDir = path.join(process.cwd(), "server", "public", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // ==================== IMAGE UPLOAD API ====================
  // Images are stored in Cloudflare R2 when configured, otherwise Base64 in database
  logR2Status();
  
  app.post("/api/upload", authenticateToken, imageUpload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const originalSizeKB = req.file.size / 1024;
      const uploadType = req.body.uploadType || req.query.uploadType || 'general';
      const isBanner = uploadType === 'banner';
      
      try {
        let processedBuffer: Buffer;
        let contentType: string;
        
        if (isBanner) {
          processedBuffer = req.file.buffer;
          contentType = req.file.mimetype || 'image/jpeg';
        } else {
          processedBuffer = await sharp(req.file.buffer)
            .webp({ quality: 100, lossless: true })
            .toBuffer();
          contentType = 'image/webp';
        }

        const compressedSizeKB = processedBuffer.length / 1024;
        
        if (processedBuffer.length > 10 * 1024 * 1024) {
          return res.status(400).json({ 
            message: `Imagem muito grande (${compressedSizeKB.toFixed(0)}KB). Máximo permitido: 10MB.` 
          });
        }

        if (isR2Configured()) {
          const category: ImageCategory = ['members', 'devotionals', 'events', 'shop', 'banners', 'categories', 'cards', 'lessons'].includes(uploadType) 
            ? uploadType as ImageCategory 
            : 'general';
          
          const r2Url = await uploadToR2(processedBuffer, category, contentType, req.file.originalname);
          const publicUrl = getPublicUrl(r2Url);
          
          console.log(`[Upload] R2: ${originalSizeKB.toFixed(1)}KB -> ${compressedSizeKB.toFixed(1)}KB, URL: ${publicUrl}`);
          return res.json({ url: r2Url, publicUrl, fileName: `image_${Date.now()}.webp` });
        }

        const base64 = processedBuffer.toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        console.log(`[Upload] Base64: ${originalSizeKB.toFixed(1)}KB -> ${compressedSizeKB.toFixed(1)}KB`);
        res.json({ url: dataUrl, fileName: `image_${Date.now()}.webp` });
      } catch (sharpError) {
        console.error("[Upload] Sharp error:", sharpError);
        
        if (isR2Configured()) {
          const r2Url = await uploadToR2(req.file.buffer, 'general', req.file.mimetype, req.file.originalname);
          return res.json({ url: r2Url, publicUrl: getPublicUrl(r2Url), fileName: `image_${Date.now()}` });
        }
        
        const base64 = req.file.buffer.toString('base64');
        const mimeType = req.file.mimetype || 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64}`;
        res.json({ url: dataUrl, fileName: `image_${Date.now()}` });
      }
    } catch (error) {
      console.error("[Upload] Error:", error);
      res.status(500).json({ message: "Erro ao fazer upload do arquivo" });
    }
  });
  
  // ==================== R2 IMAGE PROXY ====================
  app.get("/api/r2/:category/:filename", async (req, res) => {
    try {
      const { category, filename } = req.params;
      if (!category || !filename) {
        return res.status(400).json({ message: "Key not provided" });
      }
      
      const key = `${category}/${filename}`;
      const result = await getFromR2(`r2://${key}`);
      if (!result) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      res.set({
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      });
      res.send(result.buffer);
    } catch (error) {
      console.error("[R2 Proxy] Error:", error);
      res.status(500).json({ message: "Error fetching image" });
    }
  });

  // ==================== GENERIC IMAGE PROXY (for CORS support) ====================
  // This proxy fetches external images and returns them with CORS headers
  // Used for html2canvas and sharing functionality
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ message: "URL not provided" });
      }

      // Validate URL format
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(imageUrl);
      } catch {
        return res.status(400).json({ message: "Invalid URL format" });
      }

      // Security: Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ message: "Invalid protocol" });
      }

      // Fetch the image from the external URL
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ message: "Failed to fetch image" });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const buffer = Buffer.from(await response.arrayBuffer());

      // Set CORS headers and cache
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      });
      res.send(buffer);
    } catch (error) {
      console.error("[Image Proxy] Error:", error);
      res.status(500).json({ message: "Error fetching image" });
    }
  });

  // ==================== AUDIO UPLOAD API ====================
  // Audio files are stored as Base64 data URLs in the database
  app.post("/api/upload/audio", authenticateToken, audioUpload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }

      const fileSizeKB = req.file.size / 1024;
      const fileSizeMB = fileSizeKB / 1024;
      
      // Check if audio is too large (max 10MB)
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ 
          message: `Arquivo de áudio muito grande (${fileSizeMB.toFixed(1)}MB). Máximo permitido: 10MB.` 
        });
      }

      // Convert to Base64 data URL
      const base64 = req.file.buffer.toString('base64');
      
      // Determine correct MIME type - use audio/mpeg for unknown types like octet-stream
      let mimeType = req.file.mimetype;
      if (!mimeType || mimeType === 'application/octet-stream' || !mimeType.startsWith('audio/')) {
        // Try to detect from file extension
        const ext = req.file.originalname.toLowerCase().split('.').pop();
        const extToMime: Record<string, string> = {
          'mp3': 'audio/mpeg',
          'wav': 'audio/wav',
          'ogg': 'audio/ogg',
          'aac': 'audio/aac',
          'm4a': 'audio/mp4',
          'webm': 'audio/webm',
          'opus': 'audio/opus',
          'mp4': 'audio/mp4',
          '3gp': 'audio/3gpp'
        };
        mimeType = (ext && extToMime[ext]) || 'audio/mpeg';
      }
      
      const dataUrl = `data:${mimeType};base64,${base64}`;

      console.log(`[Upload] Audio converted to Base64: ${fileSizeKB.toFixed(1)}KB, mimeType: ${mimeType}`);

      res.json({ url: dataUrl, fileName: `audio_${Date.now()}.${mimeType.split('/')[1]}` });
    } catch (error) {
      console.error("[Upload Audio] Error:", error);
      res.status(500).json({ message: "Erro ao fazer upload do arquivo de áudio" });
    }
  });

  // ==================== STATIC FILES FOR UPLOADS (Legacy support) ====================
  // Keep this for backwards compatibility with existing file-based uploads
  app.use("/uploads", (await import("express")).default.static(uploadsDir));


  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const isPasswordValid = await comparePassword(
        validatedData.password,
        user.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const { password, ...userWithoutPassword } = user;
      const token = generateToken(userWithoutPassword);

      // Link any existing anonymous push subscriptions to this user
      const anonymousSubscriptionId = req.headers['x-anonymous-subscription-id'] as string;
      if (anonymousSubscriptionId) {
        try {
          console.log(`[Push] Login: Attempting to link anonymous subscription ID ${anonymousSubscriptionId} to user ${user.id}`);
          await storage.linkAnonymousSubscriptionToUser(parseInt(anonymousSubscriptionId), user.id);
          console.log(`[Push] Login: Successfully linked anonymous subscription ${anonymousSubscriptionId} to user ${user.id}`);
        } catch (linkError) {
          console.error("[Push] Login: Failed to link anonymous subscription:", linkError);
        }
      }

      const response: AuthResponse = {
        user: {
          ...userWithoutPassword,
          photoUrl: userWithoutPassword.photoUrl ? getPublicUrl(userWithoutPassword.photoUrl) : null,
        },
        token,
      };

      res.json(response);
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao fazer login" 
      });
    }
  });

  app.post("/api/auth/request-code", codeLimiter, async (req, res) => {
    try {
      const validatedData = requestCodeSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(404).json({ message: "Este e-mail não está cadastrado no sistema. Entre em contato com o administrador." });
      }

      // Check if user already has a password set and this is NOT a password reset request
      if (user.hasPassword && !validatedData.isPasswordReset) {
        return res.json({ 
          message: "Usuário já possui senha cadastrada",
          hasPassword: true 
        });
      }

      await storage.deleteVerificationCodesByEmail(validatedData.email);

      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const isPasswordReset = validatedData.isPasswordReset || false;

      await storage.createVerificationCode({
        email: validatedData.email,
        code,
        expiresAt,
        isPasswordReset,
      });

      const emailSent = isPasswordReset 
        ? await sendPasswordResetEmail(validatedData.email, code)
        : await sendVerificationEmail(validatedData.email, code);

      if (!emailSent) {
        console.log(`[FALLBACK] Código de ${isPasswordReset ? 'recuperação' : 'verificação'} para ${validatedData.email}: ${code}`);
      }

      res.json({ 
        message: "Código enviado para seu email",
        hasPassword: user.hasPassword 
      });
    } catch (error) {
      console.error("Request code error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao solicitar código" 
      });
    }
  });

  app.post("/api/auth/verify-code", authLimiter, async (req, res) => {
    try {
      const validatedData = verifyCodeSchema.parse(req.body);
      
      const verificationCode = await storage.getValidVerificationCode(
        validatedData.email,
        validatedData.code
      );

      if (!verificationCode) {
        return res.status(401).json({ message: "Código inválido ou expirado" });
      }

      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(404).json({ message: "Este e-mail não está cadastrado no sistema" });
      }

      await storage.deleteVerificationCodesByEmail(validatedData.email);

      const { password, ...userWithoutPassword } = user;
      const token = generateToken(userWithoutPassword);

      // Link any existing anonymous push subscriptions to this user
      const anonymousSubscriptionId = req.headers['x-anonymous-subscription-id'] as string;
      if (anonymousSubscriptionId) {
        try {
          await storage.linkAnonymousSubscriptionToUser(parseInt(anonymousSubscriptionId), user.id);
          console.log(`[Push] Linked anonymous subscription ${anonymousSubscriptionId} to user ${user.id}`);
        } catch (linkError) {
          console.error("[Push] Failed to link anonymous subscription:", linkError);
        }
      }

      const response: AuthResponse = {
        user: userWithoutPassword,
        token,
      };

      // If this is a password reset, indicate that user needs to set new password
      if (verificationCode.isPasswordReset) {
        return res.json({
          ...response,
          requiresPasswordReset: true,
        });
      }

      res.json(response);
    } catch (error) {
      console.error("Verify code error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao verificar código" 
      });
    }
  });

  app.post("/api/auth/set-password", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const validatedData = setPasswordSchema.parse(req.body);
      
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }

      const hashedPassword = await hashPassword(validatedData.password);
      
      const updatedUser = await storage.updateUser(req.user.id, {
        password: hashedPassword,
        hasPassword: true,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      const token = generateToken(userWithoutPassword);

      const response: AuthResponse = {
        user: {
          ...userWithoutPassword,
          photoUrl: userWithoutPassword.photoUrl ? getPublicUrl(userWithoutPassword.photoUrl) : null,
        },
        token,
      };

      res.json(response);
    } catch (error) {
      console.error("Set password error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao definir senha" 
      });
    }
  });

  app.post("/api/auth/login-password", authLimiter, async (req, res) => {
    try {
      const validatedData = loginPasswordSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      if (!user.hasPassword) {
        return res.status(400).json({ 
          message: "Você ainda não definiu uma senha. Use o código de verificação para fazer login." 
        });
      }

      const isPasswordValid = await comparePassword(
        validatedData.password,
        user.password
      );
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const { password, ...userWithoutPassword } = user;
      const token = generateToken(userWithoutPassword);

      // Link any existing anonymous push subscriptions to this user
      const anonymousSubscriptionId = req.headers['x-anonymous-subscription-id'] as string;
      if (anonymousSubscriptionId) {
        try {
          console.log(`[Push] Login: Attempting to link anonymous subscription ID ${anonymousSubscriptionId} to user ${user.id}`);
          await storage.linkAnonymousSubscriptionToUser(parseInt(anonymousSubscriptionId), user.id);
          console.log(`[Push] Login: Successfully linked anonymous subscription ${anonymousSubscriptionId} to user ${user.id}`);
        } catch (linkError) {
          console.error("[Push] Login: Failed to link anonymous subscription:", linkError);
        }
      }

      const response: AuthResponse = {
        user: {
          ...userWithoutPassword,
          photoUrl: userWithoutPassword.photoUrl ? getPublicUrl(userWithoutPassword.photoUrl) : null,
        },
        token,
      };

      res.json(response);
    } catch (error) {
      console.error("Login password error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao fazer login" 
      });
    }
  });

  // Listar membros para admin/tesouraria
  app.get("/api/admin/members", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const members = await storage.getAllMembers();
      // Filter out admin users from the treasury member list and total counts
      const membersWithoutPasswords = members
        .filter(user => user.role !== "admin" && user.isAdmin !== true)
        .map(({ password, ...user }) => ({
          ...user,
          photoUrl: user.photoUrl ? getPublicUrl(user.photoUrl) : null,
        }));
      res.json(membersWithoutPasswords);
    } catch (error) {
      console.error("Get admin members error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar membros" 
      });
    }
  });

  app.post("/api/admin/members", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const validatedData = addMemberSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const user = await storage.createUser({
        fullName: validatedData.fullName,
        email: validatedData.email,
        password: Math.random().toString(36),
        hasPassword: false,
        photoUrl: validatedData.photoUrl,
        birthdate: validatedData.birthdate,
        isAdmin: false,
        isMember: true,
        activeMember: validatedData.activeMember,
        isTreasurer: validatedData.isTreasurer ?? false,
        secretaria: validatedData.secretaria,
      } as any);

      const { password, ...userWithoutPassword } = user;
      res.json({
        ...userWithoutPassword,
        photoUrl: userWithoutPassword.photoUrl ? getPublicUrl(userWithoutPassword.photoUrl) : null,
      });
    } catch (error) {
      console.error("Add member error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao adicionar membro" 
      });
    }
  });

  app.patch("/api/admin/members/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const validatedData = updateMemberSchema.parse(req.body);

      if (validatedData.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== memberId) {
          return res.status(400).json({ message: "Este email já está sendo usado por outro membro" });
        }
      }

      const updatedUser = await storage.updateUser(memberId, validatedData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Membro não encontrado" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({
        ...userWithoutPassword,
        photoUrl: userWithoutPassword.photoUrl ? getPublicUrl(userWithoutPassword.photoUrl) : null,
      });
    } catch (error) {
      console.error("Update member error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao atualizar membro" 
      });
    }
  });

  app.delete("/api/admin/members/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      await storage.deleteMember(memberId);
      res.json({ message: "Membro removido com sucesso" });
    } catch (error) {
      console.error("Delete member error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao remover membro" 
      });
    }
  });

  app.post("/api/admin/devotionals/test-push", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const { notifyDailyVerse } = await import("./notifications");
      // Use a sample verse for the test
      await notifyDailyVerse("Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...", "João 3:16");
      res.json({ message: "Notificação de teste enviada com sucesso" });
    } catch (error) {
      console.error("Test push error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao enviar notificação de teste" 
      });
    }
  });

  // Trigger birthday emails manually for today

  app.post("/api/elections", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Nome da eleição é obrigatório" });
      }

      const election = await storage.createElection(name);
      res.json(election);
    } catch (error) {
      console.error("Create election error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao criar eleição" 
      });
    }
  });

  app.patch("/api/elections/:id/close", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      
      const election = await storage.getElectionById(electionId);
      if (!election) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }

      storage.closeElection(electionId);
      res.json({ message: "Eleição encerrada com sucesso" });
    } catch (error) {
      console.error("Close election error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao encerrar eleição" 
      });
    }
  });

  app.post("/api/elections/:id/finalize", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      
      const election = await storage.getElectionById(electionId);
      if (!election) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }

      // Verificar se todos os cargos estão decididos
      const positions = await storage.getElectionPositions(electionId);
      const allCompleted = positions.every(p => p.status === 'completed');
      
      if (!allCompleted) {
        return res.status(400).json({ message: "Todos os cargos devem estar decididos antes de finalizar a eleição" });
      }

      storage.finalizeElection(electionId);
      res.json({ message: "Eleição finalizada com sucesso" });
    } catch (error) {
      console.error("Finalize election error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao finalizar eleição" 
      });
    }
  });

  app.get("/api/elections/history", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const history = await storage.getElectionHistory();
      res.json(history);
    } catch (error) {
      console.error("Get election history error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar histórico de eleições" 
      });
    }
  });

  // OPTIMIZED: Election Attendance endpoints - batch query for users
  app.get("/api/elections/:id/attendance", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const [attendance, winners] = await Promise.all([
        storage.getElectionAttendance(electionId),
        storage.getElectionWinners(electionId)
      ]);
      
      const winnerUserIds = new Set(winners.map(w => w.userId));
      
      if (attendance.length === 0) {
        return res.json([]);
      }
      
      // Batch fetch all users at once
      const memberIds = [...new Set(attendance.map(att => att.memberId))];
      const usersMap = await storage.getUsersByIds(memberIds);
      
      // Build response with O(1) lookups and filter out winners
      const attendanceWithUsers = attendance
        .filter(att => !winnerUserIds.has(att.memberId))
        .map(att => {
          const user = usersMap.get(att.memberId);
          return {
            ...att,
            memberName: user?.fullName || '',
            memberEmail: user?.email || '',
          };
        });
      
      res.json(attendanceWithUsers);
    } catch (error) {
      console.error("Get attendance error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar presença" 
      });
    }
  });

  app.post("/api/elections/:id/attendance/initialize", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      await storage.initializeAttendance(electionId);
      res.json({ message: "Lista de presença inicializada" });
    } catch (error) {
      console.error("Initialize attendance error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao inicializar presença" 
      });
    }
  });

  app.patch("/api/elections/:id/attendance/:memberId", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const memberId = parseInt(req.params.memberId);
      const { isPresent } = req.body;
      
      if (typeof isPresent !== 'boolean') {
        return res.status(400).json({ message: "isPresent deve ser booleano" });
      }
      
      await storage.setMemberAttendance(electionId, memberId, isPresent);
      res.json({ message: "Presença atualizada" });
    } catch (error) {
      console.error("Set attendance error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao atualizar presença" 
      });
    }
  });

  app.get("/api/elections/:id/attendance/count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const count = await storage.getPresentCount(electionId);
      res.json({ presentCount: count });
    } catch (error) {
      console.error("Get present count error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao contar presentes" 
      });
    }
  });

  // Election Positions endpoints
  app.get("/api/elections/:id/positions", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const electionPositions = await storage.getElectionPositions(electionId);
      
      // Join with position names
      const allPositions = await storage.getAllPositions();
      const positionsWithNames = electionPositions.map(ep => {
        const position = allPositions.find(p => p.id === ep.positionId);
        return {
          ...ep,
          positionName: position?.name || '',
        };
      });
      
      res.json(positionsWithNames);
    } catch (error) {
      console.error("Get election positions error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar cargos da eleição" 
      });
    }
  });

  app.get("/api/elections/:id/positions/active", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const activePosition = await storage.getActiveElectionPosition(electionId);
      
      if (!activePosition) {
        return res.json(null);
      }
      
      // Join with position name
      const allPositions = await storage.getAllPositions();
      const position = allPositions.find(p => p.id === activePosition.positionId);
      
      res.json({
        ...activePosition,
        positionName: position?.name || '',
      });
    } catch (error) {
      console.error("Get active position error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar cargo ativo" 
      });
    }
  });

  app.post("/api/elections/:id/positions/advance-scrutiny", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const activePosition = await storage.getActiveElectionPosition(electionId);
      
      if (!activePosition) {
        return res.status(404).json({ message: "Nenhum cargo ativo encontrado" });
      }
      
      await storage.advancePositionScrutiny(activePosition.id);
      res.json({ message: "Escrutínio avançado com sucesso" });
    } catch (error) {
      console.error("Advance scrutiny error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao avançar escrutínio" 
      });
    }
  });

  app.get("/api/elections/:id/positions/check-tie", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const activePosition = await storage.getActiveElectionPosition(electionId);
      
      if (!activePosition) {
        return res.json({ isTie: false, candidates: [] });
      }
      
      const tieCheck = await storage.checkThirdScrutinyTie(activePosition.id);
      
      // If there's a tie, get candidate details
      if (tieCheck.isTie && tieCheck.candidates) {
        const candidates = await storage.getCandidatesByPosition(activePosition.positionId, electionId);
        const tiedCandidates = tieCheck.candidates.map(tc => {
          const candidate = candidates.find(c => c.id === tc.candidateId);
          return {
            ...tc,
            name: candidate?.name || '',
            email: candidate?.email || '',
          };
        });
        
        res.json({ isTie: true, candidates: tiedCandidates, electionPositionId: activePosition.id });
      } else {
        res.json({ isTie: false, candidates: [] });
      }
    } catch (error) {
      console.error("Check tie error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao verificar empate" 
      });
    }
  });

  app.post("/api/elections/:id/positions/resolve-tie", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const { electionPositionId, winnerId } = req.body;
      
      if (!electionPositionId || !winnerId) {
        return res.status(400).json({ message: "Dados incompletos" });
      }
      
      await storage.resolveThirdScrutinyTie(electionPositionId, winnerId);
      res.json({ message: "Empate resolvido com sucesso" });
    } catch (error) {
      console.error("Resolve tie error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao resolver empate" 
      });
    }
  });

  app.post("/api/elections/:id/positions/open-next", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      
      // Check if there are any present members before opening position
      const presentCount = await storage.getPresentCount(electionId);
      if (presentCount === 0) {
        return res.status(400).json({ message: "Registre primeiro a presença dos membros antes de abrir a votação" });
      }
      
      const nextPosition = await storage.openNextPosition(electionId);
      
      if (!nextPosition) {
        return res.status(404).json({ message: "Nenhum próximo cargo disponível" });
      }
      
      // Join with position name
      const allPositions = await storage.getAllPositions();
      const position = allPositions.find(p => p.id === nextPosition.positionId);
      
      res.json({
        ...nextPosition,
        positionName: position?.name || '',
      });
    } catch (error) {
      console.error("Open next position error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao abrir próximo cargo" 
      });
    }
  });

  app.post("/api/elections/:id/positions/:positionId/open", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const electionPositionId = parseInt(req.params.positionId);
      
      // Check if there are any present members before opening position
      const presentCount = await storage.getPresentCount(electionId);
      if (presentCount === 0) {
        return res.status(400).json({ message: "Confirme primeiro a presença dos membros antes de abrir a votação." });
      }
      
      // Open the specific position
      const openedPosition = await storage.openPosition(electionPositionId);
      
      // Join with position name
      const allPositions = await storage.getAllPositions();
      const position = allPositions.find(p => p.id === openedPosition.positionId);
      
      res.json({
        ...openedPosition,
        positionName: position?.name || '',
      });
    } catch (error) {
      console.error("Open position error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao abrir cargo" 
      });
    }
  });

  app.post("/api/elections/:id/positions/:positionId/force-close", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.id);
      const electionPositionId = parseInt(req.params.positionId);
      const { reason, shouldReopen } = req.body;
      
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ message: "É necessário fornecer um motivo para fechar manualmente" });
      }
      
      // Verify this is an active position
      const activePosition = await storage.getActiveElectionPosition(electionId);
      if (!activePosition || activePosition.id !== electionPositionId) {
        return res.status(400).json({ message: "Esta posição não está ativa" });
      }
      
      // Force complete the position
      await storage.forceCompletePosition(electionPositionId, reason, shouldReopen === true);
      
      const message = shouldReopen 
        ? "Cargo fechado e reaberto para nova votação" 
        : "Cargo fechado permanentemente com sucesso";
      
      res.json({ message });
    } catch (error) {
      console.error("Force close position error:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao fechar cargo manualmente" 
      });
    }
  });

  app.post("/api/candidates", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertCandidateSchema.parse(req.body);
      
      // Validate that the user is not an admin
      const user = await storage.getUserById(validatedData.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      if (user.isAdmin) {
        return res.status(400).json({ message: "Administradores não podem ser candidatos" });
      }

      // Check if user is present
      const isPresent = await storage.isMemberPresent(validatedData.electionId, validatedData.userId);
      if (!isPresent) {
        return res.status(400).json({ message: "Apenas membros com presença confirmada podem ser candidatos" });
      }
      
      // Validate that the user is not already a winner in this election
      const winners = await storage.getElectionWinners(validatedData.electionId);
      const isAlreadyWinner = winners.some(w => w.userId === validatedData.userId);
      if (isAlreadyWinner) {
        return res.status(400).json({ message: "Este membro já foi eleito para um cargo nesta eleição" });
      }

      // Check if candidate is already added to this position
      const existingCandidates = await storage.getCandidatesByPosition(validatedData.positionId, validatedData.electionId);
      const isDuplicate = existingCandidates.some(c => c.userId === validatedData.userId);
      if (isDuplicate) {
        return res.status(400).json({ message: "Este candidato já foi adicionado para este cargo" });
      }

      // Check if the position is active before adding candidates
      const activePosition = await storage.getActiveElectionPosition(validatedData.electionId);
      if (!activePosition || activePosition.positionId !== validatedData.positionId) {
        return res.status(400).json({ message: "A votação para este cargo ainda não foi aberta" });
      }
      
      const candidate = await storage.createCandidate(validatedData);
      res.json(candidate);
    } catch (error) {
      console.error("Create candidate error:", error);
      
      // Handle UNIQUE constraint violation
      if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
        return res.status(409).json({ message: "Este candidato já foi adicionado para este cargo" });
      }
      
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao adicionar candidato" 
      });
    }
  });

  app.post("/api/candidates/batch", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { candidates, positionId, electionId } = req.body;

      if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(400).json({ message: "Lista de candidatos inválida ou vazia" });
      }

      if (!positionId || !electionId) {
        return res.status(400).json({ message: "ID do cargo e eleição são obrigatórios" });
      }

      const activePosition = await storage.getActiveElectionPosition(electionId);
      if (!activePosition || activePosition.positionId !== positionId) {
        return res.status(400).json({ message: "A votação para este cargo ainda não foi aberta" });
      }

      // OPTIMIZED: Batch fetch all data upfront to avoid N+1 queries
      const userIds = candidates.filter(c => c.userId).map(c => c.userId);
      
      // Short-circuit if no valid userIds
      if (userIds.length === 0) {
        return res.status(400).json({ message: "Nenhum candidato válido fornecido" });
      }
      
      const [winners, existingCandidatesDb, usersMap, presenceMap] = await Promise.all([
        storage.getElectionWinners(electionId),
        storage.getCandidatesByPosition(positionId, electionId),
        storage.getUsersByIds(userIds),
        storage.getMemberPresenceByUserIds(electionId, userIds),
      ]);
      
      // Track already added userIds (from DB + current batch) to prevent duplicates
      const processedUserIds = new Set(existingCandidatesDb.map(c => c.userId));
      const createdCandidates = [];
      const errors = [];

      for (const candidate of candidates) {
        try {
          if (!candidate.userId || !candidate.name || !candidate.email) {
            errors.push(`Candidato inválido: dados incompletos`);
            continue;
          }

          // Check for duplicates in DB or current batch
          if (processedUserIds.has(candidate.userId)) {
            errors.push(`${candidate.name} já foi adicionado para este cargo`);
            continue;
          }

          const user = usersMap.get(candidate.userId);
          if (!user) {
            errors.push(`Usuário ${candidate.name} não encontrado`);
            continue;
          }
          
          if (user.isAdmin) {
            errors.push(`${candidate.name} é administrador e não pode ser candidato`);
            continue;
          }

          const isPresent = presenceMap.get(candidate.userId) || false;
          if (!isPresent) {
            errors.push(`${candidate.name} não está presente`);
            continue;
          }
          
          const isAlreadyWinner = winners.some(w => w.userId === candidate.userId);
          if (isAlreadyWinner) {
            errors.push(`${candidate.name} já foi eleito para um cargo nesta eleição`);
            continue;
          }

          // Mark as processed before creating to prevent race conditions in same batch
          processedUserIds.add(candidate.userId);

          const created = await storage.createCandidate({
            name: candidate.name,
            email: candidate.email,
            userId: candidate.userId,
            positionId,
            electionId,
          });

          createdCandidates.push(created);
        } catch (error) {
          errors.push(`Erro ao adicionar ${candidate.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      if (createdCandidates.length === 0) {
        return res.status(400).json({ 
          message: "Nenhum candidato foi adicionado", 
          errors 
        });
      }

      res.json({
        message: `${createdCandidates.length} candidato(s) adicionado(s) com sucesso`,
        candidates: createdCandidates,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Batch create candidates error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao adicionar candidatos em lote" 
      });
    }
  });

  app.get("/api/elections/active", async (req, res) => {
    try {
      const election = await storage.getActiveElection();
      res.json(election);
    } catch (error) {
      console.error("Get active election error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar eleição ativa" 
      });
    }
  });

  app.get("/api/members", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const members = await storage.getAllMembers();
      const membersWithoutPasswords = members.map(({ password, ...user }) => ({
        ...user,
        photoUrl: user.photoUrl ? getPublicUrl(user.photoUrl) : null,
      }));
      res.json(membersWithoutPasswords);
    } catch (error) {
      console.error("Get members error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar membros" 
      });
    }
  });

  app.get("/api/members/non-admins", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const members = await storage.getAllMembers(true); // Exclude admins
      let membersWithoutPasswords = members.map(({ password, ...user }) => ({
        ...user,
        photoUrl: user.photoUrl ? getPublicUrl(user.photoUrl) : null,
      }));
      
      // If electionId is provided, exclude members who already won a position in this election
      // and filter only members who are present
      const electionId = req.query.electionId ? parseInt(req.query.electionId as string) : null;
      if (electionId) {
        const winners = await storage.getElectionWinners(electionId);
        const winnerUserIds = new Set(winners.map(w => w.userId));
        
        // Filter by winners
        const beforeWinnerFilter = membersWithoutPasswords.length;
        membersWithoutPasswords = membersWithoutPasswords.filter(m => !winnerUserIds.has(m.id));
        
        // Filter by presence - only include members who are present
        const presenceCheckPromises = membersWithoutPasswords.map(async m => ({
          member: m,
          isPresent: await storage.isMemberPresent(electionId, m.id)
        }));
        const presenceResults = await Promise.all(presenceCheckPromises);
        membersWithoutPasswords = presenceResults.filter(r => r.isPresent).map(r => r.member);
      }
      
      res.json(membersWithoutPasswords);
    } catch (error) {
      console.error("Get non-admin members error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar membros" 
      });
    }
  });

  app.get("/api/positions", async (req, res) => {
    try {
      const positions = await storage.getAllPositions();
      res.json(positions);
    } catch (error) {
      console.error("Get positions error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar cargos" 
      });
    }
  });

  app.get("/api/candidates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const activeElection = await storage.getActiveElection();
      if (!activeElection) {
        return res.json([]);
      }

      const candidates = await storage.getCandidatesByElection(activeElection.id);
      res.json(candidates);
    } catch (error) {
      console.error("Get candidates error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar candidatos" 
      });
    }
  });

  // OPTIMIZED: Get candidates by position - batch query for users
  app.get("/api/elections/:electionId/positions/:positionId/candidates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const positionId = parseInt(req.params.positionId);
      
      if (isNaN(electionId) || isNaN(positionId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }

      const candidates = await storage.getCandidatesByPosition(positionId, electionId);
      if (candidates.length === 0) {
        return res.json([]);
      }
      
      // Batch fetch all users at once
      const userIds = [...new Set(candidates.map(c => c.userId))];
      const usersMap = await storage.getUsersByIds(userIds);
      
      // Build response with O(1) lookups
      const candidatesWithPhotos = candidates.map(candidate => {
        const user = usersMap.get(candidate.userId);
        const rawPhotoUrl = user?.photoUrl || getGravatarUrl(candidate.email);
        return {
          ...candidate,
          photoUrl: rawPhotoUrl ? getPublicUrl(rawPhotoUrl) : null,
        };
      });
      
      res.json(candidatesWithPhotos);
    } catch (error) {
      console.error("Get position candidates error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar candidatos" 
      });
    }
  });

  app.post("/api/vote", authenticateToken, requireMember, async (req: AuthRequest, res) => {
    try {
      const { candidateId, positionId, electionId } = req.body;
      const voterId = req.user!.id;

      if (!candidateId || !positionId || !electionId) {
        return res.status(400).json({ message: "Dados incompletos" });
      }

      // Check if voter is present
      const isPresent = await storage.isMemberPresent(electionId, voterId);
      if (!isPresent) {
        return res.status(403).json({ message: "Apenas membros com presença confirmada podem votar" });
      }

      // Get active position for this election to determine scrutiny round
      const activePosition = await storage.getActiveElectionPosition(electionId);
      if (!activePosition) {
        return res.status(400).json({ message: "Nenhum cargo ativo no momento" });
      }

      // Verify user is voting for the active position
      if (activePosition.positionId !== positionId) {
        return res.status(400).json({ message: "Este cargo não está ativo no momento" });
      }

      const scrutinyRound = activePosition.currentScrutiny;

      const hasVoted = await storage.hasUserVoted(voterId, positionId, electionId, scrutinyRound);
      if (hasVoted) {
        return res.status(403).json({ message: "Você já votou para esse cargo neste escrutínio." });
      }

      const vote = await storage.createVote({
        voterId,
        candidateId,
        positionId,
        electionId,
        scrutinyRound,
      });

      res.json({ 
        message: "Voto registrado com sucesso!",
        vote 
      });
    } catch (error) {
      console.error("Vote error:", error);
      
      if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
        return res.status(403).json({ message: "Você já votou para esse cargo neste escrutínio." });
      }
      
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Erro ao registrar voto" 
      });
    }
  });

  // OPTIMIZED: Helper to add candidate photos in batch (avoids N+1)
  async function addCandidatePhotosInBatch(positions: any[]) {
    // Collect all unique emails
    const emails = new Set<string>();
    for (const position of positions) {
      for (const candidate of position.candidates) {
        if (candidate.candidateEmail) emails.add(candidate.candidateEmail);
      }
    }
    
    // Batch fetch all users by email in parallel
    const emailArray = Array.from(emails);
    const userPromises = emailArray.map(email => storage.getUserByEmail(email));
    const users = await Promise.all(userPromises);
    
    // Create lookup map
    const userMap = new Map<string, any>();
    emailArray.forEach((email, i) => {
      if (users[i]) userMap.set(email, users[i]);
    });
    
    // Apply photos
    for (const position of positions) {
      for (const candidate of position.candidates) {
        const user = userMap.get(candidate.candidateEmail);
        const rawPhotoUrl = user?.photoUrl || getGravatarUrl(candidate.candidateEmail);
        candidate.photoUrl = rawPhotoUrl ? getPublicUrl(rawPhotoUrl) : null;
      }
    }
  }

  app.get("/api/results/latest", async (req, res) => {
    try {
      const results = await storage.getLatestElectionResults();
      if (results) {
        // OPTIMIZED: Batch fetch all candidate photos
        await addCandidatePhotosInBatch(results.positions);
      }
      res.json(results);
    } catch (error) {
      console.error("Get latest results error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar resultados" 
      });
    }
  });

  app.get("/api/results/:electionId", async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const results = await storage.getElectionResults(electionId);
      
      if (!results) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }

      // OPTIMIZED: Batch fetch all candidate photos
      await addCandidatePhotosInBatch(results.positions);

      res.json(results);
    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar resultados" 
      });
    }
  });

  // OPTIMIZED: Get election winners - batch query for users
  app.get("/api/elections/:electionId/winners", async (req, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const [winners, results, positions] = await Promise.all([
        storage.getElectionWinners(electionId),
        storage.getElectionResults(electionId),
        storage.getAllPositions()
      ]);
      
      if (!results) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }
      
      if (winners.length === 0) {
        return res.json([]);
      }
      
      // Batch fetch all winner users at once
      const userIds = [...new Set(winners.map(w => w.userId))];
      const usersMap = await storage.getUsersByIds(userIds);
      
      // Build response with O(1) lookups
      const formattedWinners = winners.map(w => {
        const user = usersMap.get(w.userId);
        const position = positions.find(p => p.id === w.positionId);
        
        // Find vote count from results
        const positionResults = results.positions.find(p => p.positionId === w.positionId);
        const candidateResults = positionResults?.candidates.find(c => c.candidateId === w.candidateId);
        
        const rawPhotoUrl = user?.photoUrl || (user?.email ? getGravatarUrl(user.email) : undefined);
        return {
          positionId: w.positionId,
          positionName: position?.name || '',
          candidateName: user?.fullName || '',
          photoUrl: rawPhotoUrl ? getPublicUrl(rawPhotoUrl) : undefined,
          voteCount: candidateResults?.voteCount || 0,
          wonAtScrutiny: w.wonAtScrutiny
        };
      });

      res.json(formattedWinners);
    } catch (error) {
      console.error("Get winners error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar vencedores" 
      });
    }
  });

  app.get("/api/elections/:electionId/audit", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const auditData = await storage.getElectionAuditData(electionId);
      
      if (!auditData) {
        return res.status(404).json({ message: "Dados de auditoria não encontrados para esta eleição" });
      }

      // OPTIMIZED: Batch fetch all candidate photos
      await addCandidatePhotosInBatch(auditData.results.positions);

      // Generate verification hash for PDF
      const verificationHash = generatePdfVerificationHash(
        electionId,
        auditData.results.electionName,
        new Date().toISOString()
      );

      // Add verification hash to audit data
      auditData.verificationHash = verificationHash;

      res.json(auditData);
    } catch (error) {
      console.error("Get election audit data error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao buscar dados de auditoria" 
      });
    }
  });

  app.post("/api/elections/:electionId/audit/send-email", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const { presidentEmail, presidentName, pdfBase64 } = req.body;

      if (!presidentEmail || !presidentName || !pdfBase64) {
        return res.status(400).json({ message: "Email do presidente, nome e PDF são obrigatórios" });
      }

      const election = await storage.getElectionById(electionId);
      if (!election) {
        return res.status(404).json({ message: "Eleição não encontrada" });
      }

      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      
      const emailModule = await import("./email");
      const success = await emailModule.sendAuditPDFEmail(
        presidentName,
        presidentEmail,
        election.name,
        pdfBuffer
      );

      if (!success) {
        return res.status(500).json({ message: "Erro ao enviar email. Verifique a configuração do serviço de email." });
      }

      res.json({ 
        message: "PDF de auditoria enviado com sucesso para o email do presidente",
        sentTo: presidentEmail
      });
    } catch (error) {
      console.error("Send audit PDF email error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao enviar PDF por email" 
      });
    }
  });

  // Public route to verify PDF authenticity
  app.get("/api/verify/:hash", async (req, res) => {
    try {
      const { hash } = req.params;
      
      if (!hash) {
        return res.status(400).json({ message: "Hash de verificação não fornecido" });
      }

      const verification = await storage.getPdfVerification(hash);
      
      if (!verification) {
        return res.status(404).json({ 
          verified: false,
          message: "Este documento não pôde ser verificado. O hash não foi encontrado no sistema." 
        });
      }

      res.json({
        verified: true,
        electionName: verification.electionName,
        electionId: verification.electionId,
        presidentName: verification.presidentName,
        createdAt: verification.createdAt,
        electionCreatedAt: verification.electionCreatedAt,
        electionClosedAt: verification.electionClosedAt,
      });
    } catch (error) {
      console.error("Verify PDF error:", error);
      res.status(500).json({ 
        verified: false,
        message: error instanceof Error ? error.message : "Erro ao verificar documento" 
      });
    }
  });

  // Route to save PDF verification hash
  app.post("/api/elections/:electionId/audit/save-hash", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const electionId = parseInt(req.params.electionId);
      const { verificationHash, presidentName } = req.body;

      if (!verificationHash) {
        return res.status(400).json({ message: "Hash de verificação é obrigatório" });
      }

      const verification = await storage.createPdfVerification(electionId, verificationHash, presidentName);
      res.json(verification);
    } catch (error) {
      console.error("Save verification hash error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao salvar hash de verificação" 
      });
    }
  });

  // ==================== STUDY SYSTEM ROUTES ====================

  // Get study profile for current user
  app.get("/api/study/profile", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const profile = await storage.getOrCreateStudyProfile(req.user.id);
      res.json(profile);
    } catch (error) {
      console.error("Get study profile error:", error);
      res.status(500).json({ message: "Erro ao buscar perfil de estudo" });
    }
  });

  // Get user statistics for profile page
  app.get("/api/study/profile/stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const stats = await storage.getUserProfileStats(req.user.id);
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // Get recent activities for profile page
  app.get("/api/study/profile/activities", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const activities = await storage.getUserRecentActivities(req.user.id, 10);
      res.json(activities);
    } catch (error) {
      console.error("Get recent activities error:", error);
      res.status(500).json({ message: "Erro ao buscar atividades recentes" });
    }
  });

  // Get streak recovery status for modal display
  app.get("/api/study/streak/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const status = await storage.getStreakRecoveryStatus(req.user.id);
      if (!status) {
        return res.status(404).json({ message: "Perfil de estudo não encontrado" });
      }
      res.json(status);
    } catch (error) {
      console.error("Get streak recovery status error:", error);
      res.status(500).json({ message: "Erro ao verificar status da ofensiva" });
    }
  });

  // Recover streak using crystals
  app.post("/api/study/streak/recover", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const result = await storage.recoverStreakWithCrystals(req.user.id);
      if (!result.success) {
        return res.status(400).json(result);
      }
      console.log(`[Streak Recovery] User ${req.user.id} recovered streak: ${result.crystalsSpent} crystals spent`);
      res.json(result);
    } catch (error) {
      console.error("Recover streak error:", error);
      res.status(500).json({ success: false, message: "Erro ao recuperar ofensiva" });
    }
  });

  // Mark streak as lost (called from modal when user acknowledges loss)
  app.post("/api/study/streak/acknowledge-loss", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      await storage.resetStreak(req.user.id);
      console.log(`[Streak] User ${req.user.id} acknowledged streak loss`);
      res.json({ success: true, message: "Ofensiva resetada" });
    } catch (error) {
      console.error("Acknowledge streak loss error:", error);
      res.status(500).json({ success: false, message: "Erro ao resetar ofensiva" });
    }
  });

  // Get all published study weeks
  app.get("/api/study/weeks", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const weeks = await storage.getPublishedStudyWeeks();
      res.json(weeks);
    } catch (error) {
      console.error("Get study weeks error:", error);
      res.status(500).json({ message: "Erro ao buscar semanas de estudo" });
    }
  });

  // IMPORTANT: Bulk endpoint MUST be defined BEFORE /:weekId to avoid route conflict
  // OPTIMIZED: Batch queries with data projection - 2 SQL queries instead of N+1
  app.get("/api/study/weeks/bulk", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const userId = req.user.id;
      const weekIds = (req.query.ids as string || '').split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

      if (weekIds.length === 0) {
        return res.json([]);
      }

      // Optimized: single batch method with minimal data projection
      const weeksWithLessons = await storage.getWeeksWithLessonsBulkOptimized(userId, weekIds);
      res.json(weeksWithLessons);
    } catch (error) {
      console.error("Get bulk weeks error:", error);
      res.status(500).json({ message: "Erro ao buscar semanas" });
    }
  });

  // Get a specific study week with lessons
  app.get("/api/study/weeks/:weekId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const weekId = parseInt(req.params.weekId);
      if (isNaN(weekId)) {
        return res.status(400).json({ message: "ID de semana inválido" });
      }
      const week = await storage.getStudyWeekById(weekId);
      if (!week) {
        return res.status(404).json({ message: "Semana de estudo não encontrada" });
      }
      const lessons = await storage.getLessonsWithProgress(req.user.id, weekId);
      res.json({ ...week, lessons });
    } catch (error) {
      console.error("Get study week error:", error);
      res.status(500).json({ message: "Erro ao buscar semana de estudo" });
    }
  });

  // OPTIMIZED: Get a specific lesson with units - parallel queries with season status
  app.get("/api/study/lessons/:lessonId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const lessonId = parseInt(req.params.lessonId);
      
      // Parallel fetch: lesson+season (single query), units, and progress
      const [lessonWithSeason, units, progress] = await Promise.all([
        storage.getLessonWithSeasonStatus(lessonId),
        storage.getUnitsByLessonId(lessonId),
        storage.getUserLessonProgress(req.user.id, lessonId)
      ]);
      
      if (!lessonWithSeason) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }
      
      // Check if season is ended - block access to lesson content
      if (lessonWithSeason.seasonEnded) {
        return res.status(403).json({ 
          message: "Esta revista foi encerrada. Não é possível acessar as lições.",
          seasonEnded: true,
          seasonTitle: lessonWithSeason.seasonTitle
        });
      }
      
      const unitsWithParsedContent = units.map((unit: any) => ({
        ...unit,
        content: typeof unit.content === 'string' ? JSON.parse(unit.content) : unit.content
      }));
      
      res.json({ ...lessonWithSeason.lesson, units: unitsWithParsedContent, progress });
    } catch (error) {
      console.error("Get lesson error:", error);
      res.status(500).json({ message: "Erro ao buscar lição" });
    }
  });

  // Start a lesson
  app.post("/api/study/lessons/:lessonId/start", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const lessonId = parseInt(req.params.lessonId);
      
      // OPTIMIZED: Check lesson and season status in single query
      const lessonWithSeason = await storage.getLessonWithSeasonStatus(lessonId);
      if (!lessonWithSeason) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }
      if (lessonWithSeason.seasonEnded) {
        return res.status(403).json({ 
          message: "Esta revista foi encerrada. Não é possível iniciar lições.",
          seasonEnded: true
        });
      }
      
      const profile = await storage.getOrCreateStudyProfile(req.user.id);
      
      if (profile.hearts <= 0) {
        return res.status(400).json({ 
          message: "Você não tem vidas suficientes. Leia versículos bíblicos para recuperar.",
          heartsNeeded: true
        });
      }
      
      const result = await storage.startLesson(req.user.id, lessonId);
      
      if (result.alreadyCompleted) {
        return res.status(400).json({ 
          message: "Esta lição já foi concluída. Não é possível refazê-la.",
          alreadyCompleted: true,
          progress: result.progress
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Start lesson error:", error);
      res.status(500).json({ message: "Erro ao iniciar lição" });
    }
  });

  // Submit answer for a unit
  app.post("/api/study/units/:unitId/answer", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const unitId = parseInt(req.params.unitId);
      const { answer } = req.body;

      if (answer === undefined) {
        return res.status(400).json({ message: "O campo answer e obrigatorio" });
      }

      const result = await storage.submitUnitAnswer(req.user.id, unitId, answer);
      const profile = await storage.getStudyProfile(req.user.id);
      
      res.json({ 
        unitProgress: result.unitProgress, 
        profile,
        correct: result.isCorrect,
        explanation: result.explanation
      });
    } catch (error) {
      console.error("Submit answer error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao submeter resposta" 
      });
    }
  });

  // Mark a unit as completed (for text/reading units)
  app.post("/api/study/units/:unitId/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const unitId = parseInt(req.params.unitId);
      
      const result = await storage.markUnitAsCompleted(req.user.id, unitId);
      
      // NOTE: Unidades individuais NÃO incrementam streak
      // Apenas a lição COMPLETA (após Estude + Medite + Responda) incrementa a ofensiva
      
      const profile = await storage.getStudyProfile(req.user.id);
      
      res.json({ 
        unitProgress: result.unitProgress, 
        profile,
        xpAwarded: result.xpAwarded
      });
    } catch (error) {
      console.error("Complete unit error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao completar unidade" 
      });
    }
  });

  // Complete a stage/section (estude, medite) with fixed XP
  app.post("/api/study/lessons/:lessonId/complete-stage", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const lessonId = parseInt(req.params.lessonId);
      const { stage } = req.body;
      
      // OPTIMIZED: Check lesson and season status in single query
      const lessonWithSeason = await storage.getLessonWithSeasonStatus(lessonId);
      if (!lessonWithSeason) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }
      if (lessonWithSeason.seasonEnded) {
        return res.status(403).json({ 
          message: "Esta revista foi encerrada. Não é possível completar seções.",
          seasonEnded: true
        });
      }
      
      const STAGE_XP = {
        estude: 50,
        medite: 50
      };
      
      const xpToAward = STAGE_XP[stage as keyof typeof STAGE_XP];
      if (!xpToAward) {
        return res.status(400).json({ message: "Stage inválido" });
      }
      
      await storage.addStageXp(req.user.id, xpToAward, stage, lessonId);
      
      // NOTE: Seções (estude/medite) NÃO incrementam streak
      // Apenas a lição COMPLETA (após Responda) incrementa a ofensiva
      
      // FIXED: Also track stage XP in season progress for magazine ranking
      try {
        const lesson = await storage.getLessonById(lessonId);
        if (lesson?.seasonId) {
          const currentProgress = await storage.getUserSeasonProgress(req.user.id, lesson.seasonId);
          await storage.updateUserSeasonProgress(req.user.id, lesson.seasonId, {
            xpEarned: (currentProgress?.xpEarned || 0) + xpToAward,
          });
        }
      } catch (seasonError) {
        console.error("Error updating season progress for stage XP:", seasonError);
      }
      
      const profile = await storage.getStudyProfile(req.user.id);
      
      res.json({ 
        xpAwarded: xpToAward,
        profile,
        stage
      });
    } catch (error) {
      console.error("Complete stage error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao completar seção" 
      });
    }
  });

  // Complete a lesson - OPTIMIZED: Using parallel processing for independent operations
  app.post("/api/study/lessons/:lessonId/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const lessonId = parseInt(req.params.lessonId);
      const { xpEarned, mistakesCount, timeSpentSeconds } = req.body;
      const userId = req.user.id;
      const isPerfect = mistakesCount === 0;
      const weekKey = getWeekKeyForLesson();
      const today = getTodayBrazilDate();

      // OPTIMIZED: Check lesson and season status in single query
      const lessonWithSeason = await storage.getLessonWithSeasonStatus(lessonId);
      if (!lessonWithSeason) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }
      if (lessonWithSeason.seasonEnded) {
        return res.status(403).json({ 
          message: "Esta revista foi encerrada. Não é possível completar lições.",
          seasonEnded: true
        });
      }

      // Step 1: Complete lesson (must happen first as other operations depend on it)
      const progress = await storage.completeLesson(
        userId, 
        lessonId, 
        xpEarned || 0, 
        mistakesCount || 0, 
        timeSpentSeconds || 0,
        isPerfect
      );

      // Step 2: Run independent operations in parallel using Promise.allSettled
      // These operations don't depend on each other's results
      const [
        seasonResult,
        weeklyLessonResult,
        streakResult,
        crystalResult,
        achievementsResult
      ] = await Promise.allSettled([
        // Update season progress
        (async () => {
          const lesson = await storage.getLessonById(lessonId);
          if (lesson?.seasonId) {
            const currentProgress = await storage.getUserSeasonProgress(userId, lesson.seasonId);
            await storage.updateUserSeasonProgress(userId, lesson.seasonId, {
              xpEarned: (currentProgress?.xpEarned || 0) + (xpEarned || 0),
              lessonsCompleted: (currentProgress?.lessonsCompleted || 0) + 1,
            });
          }
        })(),
        // Increment weekly lesson count
        storage.incrementWeeklyLesson(userId, weekKey),
        // Increment streak
        storage.incrementStreak(userId),
        // Check and award crystals
        storage.checkAndAwardLessonCrystals(userId, isPerfect),
        // Check achievements
        storage.checkAndUnlockAchievements(userId, { 
          event: 'lesson_complete', 
          value: isPerfect ? 1 : 0 
        })
      ]);

      // Extract results (with fallbacks for failed operations)
      const streakData = streakResult.status === 'fulfilled' ? streakResult.value : { newStreak: 0, isNewRecord: false };
      const crystalData = crystalResult.status === 'fulfilled' ? crystalResult.value : { crystalsAwarded: 0, rewards: [] };
      const unlockedAchievements = achievementsResult.status === 'fulfilled' ? achievementsResult.value : [];

      // Step 3: Check streak milestone (depends on streak result)
      let milestoneReward = null;
      if (streakData.newStreak > 0) {
        try {
          milestoneReward = await storage.checkAndAwardStreakMilestone(userId, streakData.newStreak);
        } catch (e) {
          console.error("Error checking streak milestone:", e);
        }
      }

      // Step 4: Process daily missions in parallel
      try {
        await storage.assignDailyMissions(userId, today);
        const userMissions = await storage.getUserDailyMissions(userId, today);
        const missionWeekKey = getCurrentWeekKey();
        const allCompletedBefore = userMissions.length > 0 && userMissions.every(m => m.completed);

        // Complete relevant missions in parallel
        const missionsToComplete = userMissions.filter(m => {
          if (m.completed) return false;
          const missionType = m.mission?.type;
          return missionType === 'complete_lesson' || missionType === 'maintain_streak';
        });

        if (missionsToComplete.length > 0) {
          await Promise.allSettled(
            missionsToComplete.map(m => storage.completeMission(userId, m.missionId, today))
          );
        }

        // Check if all missions are now completed
        if (!allCompletedBefore && missionsToComplete.length > 0) {
          const updatedMissions = await storage.getUserDailyMissions(userId, today);
          const allCompletedAfter = updatedMissions.length > 0 && updatedMissions.every(m => m.completed);
          if (allCompletedAfter) {
            await storage.incrementWeeklyMission(userId, missionWeekKey);
          }
        }
      } catch (missionError) {
        console.error("Error updating daily missions:", missionError);
      }

      // Step 5: Get final profile
      const profile = await storage.getStudyProfile(userId);
      
      res.json({ 
        progress, 
        profile,
        streakInfo: {
          newStreak: streakData.newStreak,
          isNewRecord: streakData.isNewRecord,
          crystalsAwarded: crystalData.crystalsAwarded,
          crystalRewards: crystalData.rewards,
          milestoneReward
        },
        unlockedAchievements: unlockedAchievements.map(ua => ua.achievement)
      });
    } catch (error) {
      console.error("Complete lesson error:", error);
      res.status(500).json({ message: "Erro ao completar licao" });
    }
  });

  // Get all bible verses
  app.get("/api/study/verses", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const verses = await storage.getUnreadVersesForUser(req.user.id);
      res.json(verses);
    } catch (error) {
      console.error("Get verses error:", error);
      res.status(500).json({ message: "Erro ao buscar versiculos" });
    }
  });

  // Read a verse to recover heart (3 verses = +1 heart)
  app.post("/api/study/verses/:verseId/read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const verseId = parseInt(req.params.verseId);
      const verse = await storage.getBibleVerseById(verseId);
      
      if (!verse) {
        return res.status(404).json({ message: "Versículo não encontrado" });
      }

      const result = await storage.readVerseAndRecoverHeart(req.user.id, verseId);
      
      // Check for achievements after reading verse
      const totalVersesRead = await storage.getTotalVersesReadByUser(req.user.id);
      let unlockedAchievements = await storage.checkAndUnlockAchievements(req.user.id, { 
        event: 'verse_read', 
        value: totalVersesRead 
      });
      
      // If heart was recovered and user now has full hearts, check for comeback_kid achievement
      // Note: result.profile is the updated profile after heart recovery
      const updatedProfile = await storage.getStudyProfile(req.user.id);
      if (result.heartRecovered && updatedProfile && updatedProfile.hearts === updatedProfile.heartsMax) {
        const comebackAchievements = await storage.checkAndUnlockAchievements(req.user.id, { 
          event: 'hearts_recovered' 
        });
        unlockedAchievements = [...unlockedAchievements, ...comebackAchievements];
      }
      
      // Return the updated profile for consistent UI state
      const finalProfile = updatedProfile || result.profile;
      res.json({ 
        verse, 
        profile: finalProfile, 
        heartRecovered: result.heartRecovered,
        versesRead: result.versesRead,
        versesNeeded: result.versesNeeded,
        unlockedAchievements: unlockedAchievements.map(ua => ua.achievement)
      });
    } catch (error) {
      console.error("Read verse error:", error);
      res.status(500).json({ message: "Erro ao ler versiculo" });
    }
  });

  // Get verse recovery progress
  app.get("/api/study/verses/recovery-progress", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const progress = await storage.getVerseRecoveryProgress(req.user.id);
      res.json(progress);
    } catch (error) {
      console.error("Get verse recovery progress error:", error);
      res.status(500).json({ message: "Erro ao buscar progresso" });
    }
  });

  // Get all achievements
  app.get("/api/study/achievements", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const allAchievements = await storage.getAllAchievements();
      const userAchievements = await storage.getUserAchievements(req.user.id);
      const unlockedIds = new Set(userAchievements.map(a => a.achievementId));
      
      const achievements = allAchievements.map(achievement => ({
        ...achievement,
        unlocked: unlockedIds.has(achievement.id),
        unlockedAt: userAchievements.find(ua => ua.achievementId === achievement.id)?.unlockedAt || null
      }));
      
      res.json(achievements);
    } catch (error) {
      console.error("Get achievements error:", error);
      res.status(500).json({ message: "Erro ao buscar conquistas" });
    }
  });

  // Get leaderboard
  app.get("/api/study/leaderboard", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const periodType = (req.query.period as string) || 'weekly';
      const seasonId = req.query.seasonId ? parseInt(req.query.seasonId as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const now = new Date();
      let periodKey: string;
      
      if (periodType === 'weekly') {
        // Weekly/General ranking - all XP from all sources
        const weekNumber = Math.ceil((now.getDate() + now.getDay()) / 7);
        periodKey = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
        const leaderboard = await storage.getLeaderboard(periodType, periodKey, 50);
        res.json({ periodType, periodKey, entries: convertImageUrlsArray(leaderboard) });
      } else if (periodType === 'monthly' || periodType === 'annual') {
        // Annual ranking - filter by year (Jan 1 00:00 to Dec 31 23:59)
        periodKey = year.toString();
        const leaderboard = await storage.getAnnualLeaderboard(year, 50);
        res.json({ periodType: 'annual', periodKey, year, entries: convertImageUrlsArray(leaderboard) });
      } else if (periodType === 'seasonal') {
        // Seasonal (Revista) - only lesson XP from that specific season
        if (!seasonId) {
          return res.json({ periodType, periodKey: '', entries: [] });
        }
        periodKey = `season-${seasonId}`;
        const leaderboard = await storage.getSeasonLeaderboard(seasonId, 50);
        res.json({ periodType, periodKey, seasonId, entries: convertImageUrlsArray(leaderboard) });
      } else {
        periodKey = now.getFullYear().toString();
        const leaderboard = await storage.getLeaderboard(periodType, periodKey, 50);
        res.json({ periodType, periodKey, entries: convertImageUrlsArray(leaderboard) });
      }
    } catch (error) {
      console.error("Get leaderboard error:", error);
      res.status(500).json({ message: "Erro ao buscar ranking" });
    }
  });

  // ==================== OPTIMIZED AGGREGATED ENDPOINTS ====================

  // OPTIMIZED: Dashboard aggregated endpoint - returns all home data in one request
  // This eliminates the "waterfall" of multiple sequential requests
  app.get("/api/study/dashboard", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      const userId = req.user.id;
      const weekKey = getCurrentWeekKey();
      const today = getTodayBrazilDate();

      // Run all queries in parallel for maximum performance
      const [
        profileResult,
        weeksResult,
        weeklyGoalResult,
        leaderboardResult,
        missionsResult
      ] = await Promise.allSettled([
        storage.getOrCreateStudyProfile(userId),
        storage.getPublishedStudyWeeks(),
        storage.getWeeklyGoalStatus(userId, weekKey),
        (async () => {
          const now = new Date();
          const weekNumber = Math.ceil((now.getDate() + now.getDay()) / 7);
          const periodKey = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
          return storage.getLeaderboard('weekly', periodKey, 10);
        })(),
        (async () => {
          await storage.assignDailyMissions(userId, today);
          return storage.getUserDailyMissions(userId, today);
        })()
      ]);

      // Extract results with fallbacks
      const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;
      const weeks = weeksResult.status === 'fulfilled' ? weeksResult.value : [];
      const weeklyGoal = weeklyGoalResult.status === 'fulfilled' ? weeklyGoalResult.value : null;
      const leaderboard = leaderboardResult.status === 'fulfilled' ? leaderboardResult.value : [];
      const missions = missionsResult.status === 'fulfilled' ? missionsResult.value : [];

      // OPTIMIZED: Use batch query instead of N individual queries
      let weeksWithLessons: any[] = [];
      if (weeks.length > 0) {
        const weekIds = weeks.map((w: any) => w.id);
        weeksWithLessons = await storage.getWeeksWithLessonsBulkOptimized(userId, weekIds);
      }

      res.json({
        profile,
        weeksWithLessons,
        weeklyGoal,
        leaderboard: { periodType: 'weekly', entries: convertImageUrlsArray(leaderboard) },
        missions
      });
    } catch (error) {
      console.error("Get dashboard error:", error);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard" });
    }
  });

  // ==================== MEMBER INTERACTION ENDPOINTS ====================

  // Update online status (heartbeat)
  app.post("/api/study/online-status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      await storage.updateUserOnlineStatus(req.user.id, true);
      res.json({ success: true });
    } catch (error) {
      console.error("Update online status error:", error);
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });

  // Get online users
  app.get("/api/study/online-users", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const onlineUserIds = await storage.getOnlineUserIds();
      res.json({ onlineUserIds });
    } catch (error) {
      console.error("Get online users error:", error);
      res.status(500).json({ message: "Erro ao buscar usuarios online" });
    }
  });

  // Get public member profile
  app.get("/api/study/member/:userId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      const profile = await storage.getPublicMemberProfile(targetUserId, req.user.id);
      if (!profile) {
        return res.status(404).json({ message: "Membro não encontrado" });
      }
      
      res.json(convertImageUrls(profile));
    } catch (error) {
      console.error("Get member profile error:", error);
      res.status(500).json({ message: "Erro ao buscar perfil do membro" });
    }
  });

  // Like achievement
  app.post("/api/study/member/:userId/achievement/:achievementId/like", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const targetUserId = parseInt(req.params.userId);
      const achievementId = parseInt(req.params.achievementId);
      
      if (isNaN(targetUserId) || isNaN(achievementId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      if (targetUserId === req.user.id) {
        return res.status(400).json({ message: "Você não pode curtir suas próprias conquistas" });
      }
      
      const success = await storage.likeAchievement(req.user.id, targetUserId, achievementId);
      
      // Send notification to the target user
      if (success) {
        const liker = await storage.getUserById(req.user.id);
        const achievement = await storage.getAchievementById(achievementId);
        if (liker && achievement) {
          const { notifyAchievementLiked } = await import('./notifications');
          notifyAchievementLiked(targetUserId, liker.fullName, achievement.name).catch(err => 
            console.error("[Notifications] Error notifying achievement liked:", err)
          );
        }
      }
      
      res.json({ success, liked: true });
    } catch (error) {
      console.error("Like achievement error:", error);
      res.status(500).json({ message: "Erro ao curtir conquista" });
    }
  });

  // Unlike achievement
  app.delete("/api/study/member/:userId/achievement/:achievementId/like", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const targetUserId = parseInt(req.params.userId);
      const achievementId = parseInt(req.params.achievementId);
      
      if (isNaN(targetUserId) || isNaN(achievementId)) {
        return res.status(400).json({ message: "IDs inválidos" });
      }
      
      const success = await storage.unlikeAchievement(req.user.id, targetUserId, achievementId);
      res.json({ success, liked: false });
    } catch (error) {
      console.error("Unlike achievement error:", error);
      res.status(500).json({ message: "Erro ao remover curtida" });
    }
  });

  // OPTIMIZED: Get member's collectible cards - batch queries instead of N+1
  app.get("/api/study/member/:userId/cards", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ message: "ID de usuario invalido" });
      }
      
      const userCards = await storage.getUserCards(targetUserId);
      if (userCards.length === 0) {
        return res.json([]);
      }
      
      // Batch fetch all cards at once
      const cardIds = [...new Set(userCards.map(uc => uc.cardId))];
      const cardsMap = await storage.getCollectibleCardsByIds(cardIds);
      
      // Collect event IDs from cards
      const eventIds = [...new Set(
        Array.from(cardsMap.values())
          .filter(c => c.sourceType === 'event')
          .map(c => c.sourceId)
      )];
      const eventsMap = await storage.getStudyEventsByIds(eventIds);
      
      // Build response with O(1) lookups
      const cardsWithDetails = userCards.map(uc => {
        const card = cardsMap.get(uc.cardId);
        if (!card) return null;
        const event = card.sourceType === 'event' ? eventsMap.get(card.sourceId) : null;
        return {
          id: uc.id,
          cardId: card.id,
          rarity: uc.rarity,
          performance: uc.performance,
          earnedAt: uc.earnedAt,
          card: {
            name: card.name,
            imageUrl: getPublicUrl(card.imageUrl),
            description: card.description,
          },
          event: event ? {
            id: event.id,
            title: event.title,
            theme: event.theme,
          } : null,
        };
      });
      
      res.json(cardsWithDetails.filter(Boolean));
    } catch (error) {
      console.error("Get member cards error:", error);
      res.status(500).json({ message: "Erro ao buscar cards do membro" });
    }
  });

  // Send encouragement message
  app.post("/api/study/member/:userId/encourage", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const receiverId = parseInt(req.params.userId);
      const { messageKey, messageText } = req.body;
      
      if (isNaN(receiverId)) {
        return res.status(400).json({ message: "ID de usuário inválido" });
      }
      
      if (receiverId === req.user.id) {
        return res.status(400).json({ message: "Você não pode enviar mensagem para si mesmo" });
      }
      
      if (!messageKey || !messageText) {
        return res.status(400).json({ message: "Mensagem inválida" });
      }
      
      // Save encouragement
      const encouragement = await storage.sendEncouragement(req.user.id, receiverId, messageKey, messageText);
      
      // Send push notification and create in-app notification
      const sender = await storage.getUserById(req.user.id);
      const { notifyEncouragement } = await import('./notifications');
      notifyEncouragement(receiverId, sender?.fullName || 'Um membro', messageText, encouragement.id).catch(err =>
        console.error("[Notifications] Error sending encouragement notification:", err)
      );
      
      res.json({ success: true, encouragement });
    } catch (error) {
      console.error("Send encouragement error:", error);
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  });

  // Get predefined encouragement messages
  app.get("/api/study/encouragement-messages", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const { PREDEFINED_ENCOURAGEMENT_MESSAGES } = await import('@shared/schema');
      // Map to expected format: key, text, icon (frontend expects text field)
      const messages = PREDEFINED_ENCOURAGEMENT_MESSAGES.map(msg => ({
        key: msg.key,
        text: msg.text,
        icon: msg.icon,
      }));
      res.json({ messages });
    } catch (error) {
      console.error("Get encouragement messages error:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });

  // OPTIMIZED: Get received encouragements - batch query for senders
  app.get("/api/study/encouragements", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const encouragements = await storage.getReceivedEncouragements(req.user.id, limit);
      
      if (encouragements.length === 0) {
        return res.json({ encouragements: [] });
      }
      
      // Batch fetch all senders at once
      const senderIds = [...new Set(encouragements.map(e => e.senderId))];
      const sendersMap = await storage.getUsersByIds(senderIds);
      
      // Build response with O(1) lookups
      const encouragementsWithSender = encouragements.map(e => {
        const sender = sendersMap.get(e.senderId);
        return {
          ...e,
          senderName: sender?.fullName || 'Membro',
          senderPhotoUrl: sender?.photoUrl ? getPublicUrl(sender.photoUrl) : null,
        };
      });
      
      res.json({ encouragements: encouragementsWithSender });
    } catch (error) {
      console.error("Get encouragements error:", error);
      res.status(500).json({ message: "Erro ao buscar mensagens" });
    }
  });

  // Admin: Send encouragement to all members
  app.post("/api/admin/study/encourage-all", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const { messageKey, messageText } = req.body;
      
      if (!messageKey || !messageText) {
        return res.status(400).json({ message: "Mensagem invalida" });
      }
      
      // Send to all members
      const sentCount = await storage.sendEncouragementToAll(req.user.id, messageKey, messageText);
      
      // Send push notification to ALL members (including inactive)
      const { sendPushToAllMembersIncludingInactive } = await import('./notifications');
      const pushResult = await sendPushToAllMembersIncludingInactive({
        title: "📣 Mensagem da UMP Emaus",
        body: messageText,
        url: "/study",
        tag: `admin-encouragement-${Date.now()}`,
        icon: "/logo.png",
      });
      console.log(`[Admin] Encouragement push: ${pushResult.sent} sent, ${pushResult.failed} failed`);
      
      res.json({ success: true, sentCount });
    } catch (error) {
      console.error("Encourage all error:", error);
      res.status(500).json({ message: "Erro ao enviar mensagens" });
    }
  });

  // ==================== CRYSTAL AND STREAK FREEZE ENDPOINTS ====================

  // OPTIMIZED: Get crystals - parallel queries
  app.get("/api/study/crystals", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Parallel fetch: balance and profile
      const [balance, profile] = await Promise.all([
        storage.getCrystalBalance(req.user.id),
        storage.getStudyProfile(req.user.id)
      ]);
      
      res.json({ 
        balance,
        freezesAvailable: profile?.streakFreezesAvailable ?? 0,
        currentStreak: profile?.currentStreak ?? 0,
        longestStreak: profile?.longestStreak ?? 0,
        nextFreezeCost: 10 + ((profile?.streakFreezesAvailable ?? 0) * 10)
      });
    } catch (error) {
      console.error("Get crystals error:", error);
      res.status(500).json({ message: "Erro ao buscar cristais" });
    }
  });

  app.get("/api/study/crystals/history", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getCrystalHistory(req.user.id, limit);
      
      res.json({ history });
    } catch (error) {
      console.error("Get crystal history error:", error);
      res.status(500).json({ message: "Erro ao buscar historico de cristais" });
    }
  });

  app.post("/api/study/streak/freeze/purchase", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const result = await storage.purchaseStreakFreeze(req.user.id);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Cristais insuficientes para comprar congelamento",
          cost: result.cost,
          freezesAvailable: result.freezesAvailable
        });
      }
      
      res.json({ 
        message: "Congelamento comprado com sucesso!",
        cost: result.cost,
        freezesAvailable: result.freezesAvailable
      });
    } catch (error) {
      console.error("Purchase streak freeze error:", error);
      res.status(500).json({ message: "Erro ao comprar congelamento" });
    }
  });

  app.get("/api/study/streak/freeze/history", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const history = await storage.getStreakFreezeHistory(req.user.id);
      
      res.json({ history });
    } catch (error) {
      console.error("Get streak freeze history error:", error);
      res.status(500).json({ message: "Erro ao buscar historico de congelamentos" });
    }
  });

  app.get("/api/study/streak/milestones", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      const profile = await storage.getStudyProfile(req.user.id);
      const currentStreak = profile?.currentStreak ?? 0;
      
      const milestones = [
        { days: 7, crystalReward: 5, xpReward: 50, title: "Primeira Semana", achieved: currentStreak >= 7 },
        { days: 14, crystalReward: 10, xpReward: 75, title: "Duas Semanas", achieved: currentStreak >= 14 },
        { days: 30, crystalReward: 25, xpReward: 150, title: "Um Mes", achieved: currentStreak >= 30 },
        { days: 60, crystalReward: 50, xpReward: 300, title: "Dois Meses", achieved: currentStreak >= 60 },
        { days: 100, crystalReward: 100, xpReward: 500, title: "Centenario", achieved: currentStreak >= 100 },
        { days: 180, crystalReward: 200, xpReward: 750, title: "Meio Ano", achieved: currentStreak >= 180 },
        { days: 365, crystalReward: 500, xpReward: 1500, title: "Um Ano", achieved: currentStreak >= 365 },
      ];
      
      res.json({ milestones, currentStreak });
    } catch (error) {
      console.error("Get streak milestones error:", error);
      res.status(500).json({ message: "Erro ao buscar marcos de ofensiva" });
    }
  });

  // OPTIMIZED: Get practice exercises from completed lessons - batch query instead of N+1
  app.get("/api/study/practice-exercises", authenticateToken, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Não autenticado" });
      }
      
      // Get all completed lessons for this user
      const completedLessons = await storage.getCompletedLessonsWithExercises(req.user.id);
      
      if (completedLessons.length === 0) {
        return res.json({ exercises: [] });
      }
      
      // Create lesson lookup map for O(1) access
      const lessonMap = new Map(completedLessons.map(l => [l.id, l]));
      const lessonIds = completedLessons.map(l => l.id);
      
      // Batch fetch all units at once (single query instead of N queries)
      const allUnits = await storage.getUnitsByLessonIds(lessonIds);
      
      // Filter and build exercises
      const exercises = allUnits
        .filter(unit => 
          unit.stage === "responda" && 
          ["multiple_choice", "true_false", "fill_blank"].includes(unit.type)
        )
        .map(unit => {
          const lesson = lessonMap.get(unit.lessonId);
          const content = typeof unit.content === 'string' ? JSON.parse(unit.content) : unit.content;
          return {
            id: unit.id,
            type: unit.type,
            stage: unit.stage,
            content,
            lessonId: unit.lessonId,
            lessonTitle: lesson?.title || ''
          };
        });
      
      res.json({ exercises });
    } catch (error) {
      console.error("Get practice exercises error:", error);
      res.status(500).json({ message: "Erro ao buscar exercicios de pratica" });
    }
  });

  // Admin: Seed study data (development only)
  app.post("/api/study/seed", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const results = {
        verses: 0,
        achievements: 0,
        weeks: 0,
        lessons: 0,
        units: 0
      };

      // Check if verses already exist
      const existingVerses = await storage.getAllBibleVerses();
      if (existingVerses.length === 0) {
        // Seed Bible verses for heart recovery
        const verses = [
          { reference: "Joao 3:16", text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigenito, para que todo aquele que nele cre nao pereca, mas tenha a vida eterna.", reflection: "O amor de Deus e incondicional e oferece salvacao a todos.", category: "amor" },
          { reference: "Salmos 23:1", text: "O Senhor e o meu pastor; nada me faltara.", reflection: "Deus cuida de nos como um pastor cuida de suas ovelhas.", category: "provisao" },
          { reference: "Filipenses 4:13", text: "Posso todas as coisas naquele que me fortalece.", reflection: "Cristo nos da forca para enfrentar qualquer situacao.", category: "forca" },
          { reference: "Jeremias 29:11", text: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e nao de mal, para vos dar o fim que esperais.", reflection: "Deus tem planos de esperanca e futuro para nos.", category: "esperanca" },
          { reference: "Isaias 41:10", text: "Nao temas, porque eu sou contigo; nao te assombres, porque eu sou teu Deus; eu te fortaleco, e te ajudo, e te sustento com a destra da minha justica.", reflection: "Deus esta sempre conosco para nos fortalecer.", category: "forca" },
          { reference: "Romanos 8:28", text: "E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que sao chamados segundo o seu proposito.", reflection: "Deus transforma todas as situacoes para o nosso bem.", category: "esperanca" },
          { reference: "Salmos 46:1", text: "Deus e o nosso refugio e fortaleza, socorro bem presente na angustia.", reflection: "Podemos confiar em Deus em todos os momentos.", category: "protecao" },
          { reference: "Mateus 11:28", text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", reflection: "Jesus oferece descanso para nossas almas.", category: "descanso" },
          { reference: "Proverbios 3:5-6", text: "Confia no Senhor de todo o teu coracao, e nao te estribes no teu proprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitara as tuas veredas.", reflection: "Confiar em Deus nos guia pelo caminho certo.", category: "sabedoria" },
          { reference: "1 Corintios 10:13", text: "Nao veio sobre vos tentacao, senao humana; mas fiel e Deus, que nao vos deixara tentar acima do que podeis, antes com a tentacao dara tambem o escape, para que a possais suportar.", reflection: "Deus sempre nos da um caminho de saida nas tentacoes.", category: "forca" },
          { reference: "Salmos 119:105", text: "Lampada para os meus pes e a tua palavra, e luz para o meu caminho.", reflection: "A Palavra de Deus ilumina nossa vida.", category: "sabedoria" },
          { reference: "2 Timoteo 1:7", text: "Porque Deus nao nos deu o espirito de temor, mas de fortaleza, e de amor, e de moderacao.", reflection: "Deus nos capacita com coragem e amor.", category: "coragem" },
          { reference: "Hebreus 11:1", text: "Ora, a fe e o firme fundamento das coisas que se esperam, e a prova das coisas que se nao veem.", reflection: "A fe e a certeza do que esperamos em Deus.", category: "fe" },
          { reference: "Romanos 12:2", text: "E nao sede conformados com este mundo, mas sede transformados pela renovacao do vosso entendimento, para que experimenteis qual seja a boa, agradavel, e perfeita vontade de Deus.", reflection: "Devemos buscar a transformacao em Cristo.", category: "transformacao" },
          { reference: "Galatas 5:22-23", text: "Mas o fruto do Espirito e: amor, gozo, paz, longanimidade, benignidade, bondade, fe, mansidao, temperanca. Contra estas coisas nao ha lei.", reflection: "O Espirito Santo produz frutos em nossa vida.", category: "espirito" }
        ];

        for (const verse of verses) {
          await storage.createBibleVerse(verse.reference, verse.text, verse.reflection, verse.category);
          results.verses++;
        }
      }

      // Check if achievements already exist
      const existingAchievements = await storage.getAllAchievements();
      if (existingAchievements.length === 0) {
        // Seed achievements with requirements for auto-unlocking
        const achievements = [
          { code: "first_lesson", name: "Primeiro Passo", description: "Complete sua primeira licao", icon: "trophy", xpReward: 50, category: "lessons", requirement: JSON.stringify({ lessons: 1 }) },
          { code: "lessons_5", name: "Estudante Dedicado", description: "Complete 5 licoes", icon: "book-open", xpReward: 75, category: "lessons", requirement: JSON.stringify({ lessons: 5 }) },
          { code: "lessons_10", name: "Discipulo Fiel", description: "Complete 10 licoes", icon: "book-marked", xpReward: 150, category: "lessons", requirement: JSON.stringify({ lessons: 10 }) },
          { code: "lessons_25", name: "Mestre da Palavra", description: "Complete 25 licoes", icon: "graduation-cap", xpReward: 300, category: "lessons", requirement: JSON.stringify({ lessons: 25 }) },
          { code: "streak_3", name: "Constante", description: "Mantenha uma sequencia de 3 dias", icon: "flame", xpReward: 30, category: "streak", requirement: JSON.stringify({ streak: 3 }) },
          { code: "streak_7", name: "Dedicado", description: "Mantenha uma sequencia de 7 dias", icon: "flame", xpReward: 100, category: "streak", requirement: JSON.stringify({ streak: 7 }) },
          { code: "streak_14", name: "Perseverante", description: "Mantenha uma sequencia de 14 dias", icon: "flame", xpReward: 200, category: "streak", requirement: JSON.stringify({ streak: 14 }) },
          { code: "streak_30", name: "Imbativel", description: "Mantenha uma sequencia de 30 dias", icon: "flame", xpReward: 500, category: "streak", requirement: JSON.stringify({ streak: 30 }) },
          { code: "streak_60", name: "Lenda Viva", description: "Mantenha uma sequencia de 60 dias", icon: "crown", xpReward: 1000, category: "streak", requirement: JSON.stringify({ streak: 60 }) },
          { code: "xp_100", name: "Iniciante", description: "Alcance 100 XP", icon: "zap", xpReward: 25, category: "xp", requirement: JSON.stringify({ xp: 100 }) },
          { code: "xp_500", name: "Intermediario", description: "Alcance 500 XP", icon: "zap", xpReward: 50, category: "xp", requirement: JSON.stringify({ xp: 500 }) },
          { code: "xp_1000", name: "Avancado", description: "Alcance 1000 XP", icon: "trending-up", xpReward: 100, category: "xp", requirement: JSON.stringify({ xp: 1000 }) },
          { code: "xp_5000", name: "Expert", description: "Alcance 5000 XP", icon: "star", xpReward: 250, category: "xp", requirement: JSON.stringify({ xp: 5000 }) },
          { code: "level_5", name: "Aprendiz", description: "Alcance o nivel 5", icon: "award", xpReward: 100, category: "xp", requirement: JSON.stringify({ level: 5 }) },
          { code: "level_10", name: "Estudante", description: "Alcance o nivel 10", icon: "award", xpReward: 200, category: "xp", requirement: JSON.stringify({ level: 10 }) },
          { code: "level_25", name: "Mestre", description: "Alcance o nivel 25", icon: "crown", xpReward: 500, category: "xp", requirement: JSON.stringify({ level: 25 }) },
          { code: "perfect_lesson", name: "Perfeito!", description: "Complete uma licao sem erros", icon: "star", xpReward: 25, category: "special", isSecret: false },
          { code: "early_bird", name: "Madrugador", description: "Estude antes das 7h da manha", icon: "sunrise", xpReward: 30, category: "special", isSecret: false },
          { code: "night_owl", name: "Coruja Noturna", description: "Estude apos as 22h", icon: "moon", xpReward: 30, category: "special", isSecret: false },
          { code: "bookworm", name: "Leitor Voraz", description: "Leia 10 versiculos biblicos", icon: "book-heart", xpReward: 50, category: "special", isSecret: false },
          { code: "comeback_kid", name: "Nunca Desisto", description: "Recupere todas as vidas usando versiculos", icon: "heart", xpReward: 30, category: "special", isSecret: false },
          { code: "top_10", name: "Elite", description: "Fique entre os 10 primeiros do ranking semanal", icon: "medal", xpReward: 150, category: "special", isSecret: false }
        ];

        for (const achievement of achievements) {
          await storage.createAchievement(achievement);
          results.achievements++;
        }
      }

      // Check if study weeks already exist
      const existingWeeks = await storage.getPublishedStudyWeeks();
      if (existingWeeks.length === 0) {
        // Create a sample study week based on "Nao jogue sua vida fora"
        const week = await storage.createStudyWeek({
          weekNumber: 1,
          year: 2025,
          title: "Nao Jogue Sua Vida Fora",
          description: "Estudo sobre o proposito da vida e como viver de acordo com a vontade de Deus"
        });
        results.weeks++;

        // Create lessons for the week
        const lessonsData = [
          { 
            orderIndex: 0, 
            title: "O Valor da Vida", 
            type: "study", 
            description: "Entenda o verdadeiro valor que Deus da a sua vida",
            xpReward: 15,
            estimatedMinutes: 5
          },
          { 
            orderIndex: 1, 
            title: "Proposito Divino", 
            type: "study", 
            description: "Descubra o proposito que Deus tem para voce",
            xpReward: 15,
            estimatedMinutes: 5
          },
          { 
            orderIndex: 2, 
            title: "Decisoes que Importam", 
            type: "study", 
            description: "Aprenda a tomar decisoes sabias para sua vida",
            xpReward: 15,
            estimatedMinutes: 5
          },
          { 
            orderIndex: 3, 
            title: "Vivendo com Proposito", 
            type: "study", 
            description: "Coloque em pratica o que aprendeu",
            xpReward: 20,
            estimatedMinutes: 7
          },
          { 
            orderIndex: 4, 
            title: "Desafio da Semana", 
            type: "challenge", 
            description: "Teste seus conhecimentos sobre a revista",
            xpReward: 30,
            estimatedMinutes: 10,
            isBonus: true
          }
        ];

        for (const lessonData of lessonsData) {
          const lesson = await storage.createStudyLesson({
            studyWeekId: week.id,
            ...lessonData
          });
          results.lessons++;

          // Create units (exercises) for each lesson
          if (lessonData.orderIndex === 0) {
            // Lesson 1: O Valor da Vida
            const units = [
              {
                type: "multiple_choice",
                content: {
                  question: "Segundo a Biblia, o que faz a vida humana ter tanto valor?",
                  options: [
                    "Nossas conquistas materiais",
                    "Fomos criados a imagem e semelhanca de Deus",
                    "Nossa posicao social",
                    "Nossa inteligencia"
                  ],
                  correctIndex: 1,
                  explanation: "Genesis 1:27 nos ensina que fomos criados a imagem de Deus, isso nos da valor unico."
                },
                xpValue: 3
              },
              {
                type: "true_false",
                content: {
                  statement: "Deus conhecia voce antes mesmo de nascer e ja tinha planos para sua vida.",
                  isTrue: true,
                  reference: "Jeremias 1:5",
                  explanation: "Deus diz: 'Antes que te formasse no ventre te conheci, e antes que saísses da madre, te santifiquei'."
                },
                xpValue: 2
              },
              {
                type: "fill_blank",
                content: {
                  sentence: "Porque Deus amou o _____ de tal maneira que deu o seu Filho unigenito.",
                  correctAnswer: "mundo",
                  reference: "Joao 3:16",
                  hint: "Pense em toda a humanidade"
                },
                xpValue: 3
              },
              {
                type: "multiple_choice",
                content: {
                  question: "O que significa 'nao jogar sua vida fora'?",
                  options: [
                    "Acumular riquezas para o futuro",
                    "Viver de acordo com o proposito de Deus",
                    "Evitar todos os riscos na vida",
                    "Fazer apenas o que nos agrada"
                  ],
                  correctIndex: 1,
                  explanation: "Viver com proposito significa alinhar nossa vida com os planos de Deus para nos."
                },
                xpValue: 3
              }
            ];

            for (let i = 0; i < units.length; i++) {
              const unitType = units[i].type;
              await storage.createStudyUnit({
                lessonId: lesson.id,
                orderIndex: i,
                type: unitType,
                content: units[i].content,
                xpValue: units[i].xpValue,
                stage: getStageFromUnitType(unitType)
              });
              results.units++;
            }
          } else if (lessonData.orderIndex === 1) {
            // Lesson 2: Proposito Divino
            const units = [
              {
                type: "multiple_choice",
                content: {
                  question: "Qual e o proposito principal do ser humano segundo Eclesiastes?",
                  options: [
                    "Buscar prazeres e diversao",
                    "Acumular conhecimento",
                    "Temer a Deus e guardar seus mandamentos",
                    "Conquistar sucesso profissional"
                  ],
                  correctIndex: 2,
                  explanation: "Eclesiastes 12:13 diz: 'Teme a Deus, e guarda os seus mandamentos; porque isto e o dever de todo o homem'."
                },
                xpValue: 3
              },
              {
                type: "true_false",
                content: {
                  statement: "Deus tem um plano especifico e unico para cada pessoa.",
                  isTrue: true,
                  reference: "Jeremias 29:11",
                  explanation: "Deus conhece os planos que tem para nos, planos de paz e nao de mal."
                },
                xpValue: 2
              },
              {
                type: "multiple_choice",
                content: {
                  question: "Como podemos descobrir nosso proposito divino?",
                  options: [
                    "Atraves da oracao e estudo da Biblia",
                    "Consultando horoscopos",
                    "Seguindo nossos impulsos",
                    "Imitando pessoas famosas"
                  ],
                  correctIndex: 0,
                  explanation: "A oracao e a Palavra de Deus sao os meios pelos quais Deus nos revela Sua vontade."
                },
                xpValue: 3
              },
              {
                type: "fill_blank",
                content: {
                  sentence: "Eu vim para que tenham _____ e a tenham em abundancia.",
                  correctAnswer: "vida",
                  reference: "Joao 10:10",
                  hint: "O oposto de morte"
                },
                xpValue: 3
              }
            ];

            for (let i = 0; i < units.length; i++) {
              const unitType = units[i].type;
              await storage.createStudyUnit({
                lessonId: lesson.id,
                orderIndex: i,
                type: unitType,
                content: units[i].content,
                xpValue: units[i].xpValue,
                stage: getStageFromUnitType(unitType)
              });
              results.units++;
            }
          } else if (lessonData.orderIndex === 2) {
            // Lesson 3: Decisoes que Importam
            const units = [
              {
                type: "multiple_choice",
                content: {
                  question: "Qual deve ser a base para nossas decisoes importantes?",
                  options: [
                    "Opiniao dos amigos",
                    "A Palavra de Deus e oracao",
                    "Tendencias da sociedade",
                    "Nossos sentimentos momentaneos"
                  ],
                  correctIndex: 1,
                  explanation: "Proverbios 3:5-6 nos ensina a confiar no Senhor e reconhece-Lo em todos os nossos caminhos."
                },
                xpValue: 3
              },
              {
                type: "true_false",
                content: {
                  statement: "Pequenas decisoes diarias nao afetam nosso destino espiritual.",
                  isTrue: false,
                  explanation: "Cada decisao, por menor que seja, contribui para formar nosso carater e caminho."
                },
                xpValue: 2
              },
              {
                type: "multiple_choice",
                content: {
                  question: "O que acontece quando seguimos nosso proprio entendimento sem consultar a Deus?",
                  options: [
                    "Sempre damos certo",
                    "Podemos nos desviar do caminho de Deus",
                    "Nao faz diferenca",
                    "Deus fica satisfeito com nossa independencia"
                  ],
                  correctIndex: 1,
                  explanation: "Proverbios 14:12 diz: 'Ha um caminho que ao homem parece direito, mas o fim dele sao os caminhos da morte'."
                },
                xpValue: 3
              },
              {
                type: "fill_blank",
                content: {
                  sentence: "Confia no Senhor de todo o teu _____, e nao te estribes no teu proprio entendimento.",
                  correctAnswer: "coracao",
                  reference: "Proverbios 3:5",
                  hint: "Orgao que representa nossos sentimentos e vontade"
                },
                xpValue: 3
              }
            ];

            for (let i = 0; i < units.length; i++) {
              const unitType = units[i].type;
              await storage.createStudyUnit({
                lessonId: lesson.id,
                orderIndex: i,
                type: unitType,
                content: units[i].content,
                xpValue: units[i].xpValue,
                stage: getStageFromUnitType(unitType)
              });
              results.units++;
            }
          } else if (lessonData.orderIndex === 3) {
            // Lesson 4: Vivendo com Proposito
            const units = [
              {
                type: "multiple_choice",
                content: {
                  question: "Como podemos viver cada dia com proposito?",
                  options: [
                    "Fazendo apenas o que nos agrada",
                    "Buscando primeiro o Reino de Deus e Sua justica",
                    "Focando apenas em nossa carreira",
                    "Evitando compromissos"
                  ],
                  correctIndex: 1,
                  explanation: "Mateus 6:33 nos ensina a buscar primeiro o Reino de Deus, e tudo mais nos sera acrescentado."
                },
                xpValue: 3
              },
              {
                type: "true_false",
                content: {
                  statement: "Servir aos outros e uma forma de viver com proposito segundo Jesus.",
                  isTrue: true,
                  reference: "Marcos 10:45",
                  explanation: "Jesus disse que veio para servir e dar Sua vida, e nos devemos seguir Seu exemplo."
                },
                xpValue: 2
              },
              {
                type: "multiple_choice",
                content: {
                  question: "Qual e o maior mandamento segundo Jesus?",
                  options: [
                    "Guardar o sabado",
                    "Dar dizimos",
                    "Amar a Deus de todo coracao e ao proximo como a si mesmo",
                    "Ir a igreja todos os domingos"
                  ],
                  correctIndex: 2,
                  explanation: "Em Mateus 22:37-39, Jesus resume toda a lei no amor a Deus e ao proximo."
                },
                xpValue: 3
              },
              {
                type: "fill_blank",
                content: {
                  sentence: "Portanto ide, fazei _____ de todas as nacoes.",
                  correctAnswer: "discipulos",
                  reference: "Mateus 28:19",
                  hint: "Seguidores de Jesus"
                },
                xpValue: 3
              },
              {
                type: "multiple_choice",
                content: {
                  question: "O que podemos fazer hoje para nao 'jogar nossa vida fora'?",
                  options: [
                    "Buscar Deus em primeiro lugar em todas as decisoes",
                    "Ignorar os conselhos biblicos",
                    "Viver apenas para nos mesmos",
                    "Adiar nosso relacionamento com Deus"
                  ],
                  correctIndex: 0,
                  explanation: "Colocar Deus em primeiro lugar e a chave para uma vida com proposito e significado."
                },
                xpValue: 4
              }
            ];

            for (let i = 0; i < units.length; i++) {
              const unitType = units[i].type;
              await storage.createStudyUnit({
                lessonId: lesson.id,
                orderIndex: i,
                type: unitType,
                content: units[i].content,
                xpValue: units[i].xpValue,
                stage: getStageFromUnitType(unitType)
              });
              results.units++;
            }
          } else if (lessonData.orderIndex === 4) {
            // Bonus Challenge
            const units = [
              {
                type: "multiple_choice",
                content: {
                  question: "Qual versiculo fala sobre Deus nos conhecer antes de nascermos?",
                  options: [
                    "Joao 3:16",
                    "Jeremias 1:5",
                    "Salmos 23:1",
                    "Genesis 1:1"
                  ],
                  correctIndex: 1,
                  explanation: "Jeremias 1:5: 'Antes que te formasse no ventre te conheci'."
                },
                xpValue: 4
              },
              {
                type: "true_false",
                content: {
                  statement: "Segundo Eclesiastes, o dever de todo homem e temer a Deus e guardar seus mandamentos.",
                  isTrue: true,
                  reference: "Eclesiastes 12:13"
                },
                xpValue: 3
              },
              {
                type: "fill_blank",
                content: {
                  sentence: "Buscai primeiro o _____ de Deus e a sua justica.",
                  correctAnswer: "Reino",
                  reference: "Mateus 6:33",
                  hint: "Onde Deus reina"
                },
                xpValue: 4
              },
              {
                type: "multiple_choice",
                content: {
                  question: "Qual livro da Biblia fala 'Ha caminho que ao homem parece direito, mas o fim dele sao caminhos de morte'?",
                  options: [
                    "Salmos",
                    "Proverbios",
                    "Eclesiastes",
                    "Isaias"
                  ],
                  correctIndex: 1,
                  explanation: "Este versiculo esta em Proverbios 14:12."
                },
                xpValue: 4
              },
              {
                type: "true_false",
                content: {
                  statement: "Jesus disse que veio para que tenhamos vida e vida em abundancia.",
                  isTrue: true,
                  reference: "Joao 10:10"
                },
                xpValue: 3
              },
              {
                type: "multiple_choice",
                content: {
                  question: "Quantos mandamentos Jesus resumiu toda a lei?",
                  options: [
                    "Dez",
                    "Cinco",
                    "Dois",
                    "Tres"
                  ],
                  correctIndex: 2,
                  explanation: "Jesus resumiu em dois: Amar a Deus e amar ao proximo (Mateus 22:37-40)."
                },
                xpValue: 5
              }
            ];

            for (let i = 0; i < units.length; i++) {
              const unitType = units[i].type;
              await storage.createStudyUnit({
                lessonId: lesson.id,
                orderIndex: i,
                type: unitType,
                content: units[i].content,
                xpValue: units[i].xpValue,
                stage: getStageFromUnitType(unitType)
              });
              results.units++;
            }
          }
        }
      }

      res.json({
        message: "Dados de estudo criados com sucesso",
        results
      });
    } catch (error) {
      console.error("Seed study data error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao criar dados de estudo" 
      });
    }
  });

  // Admin: Get all study weeks (including drafts) - admin or espiritualidade
  app.get("/api/study/admin/weeks", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const weeks = await storage.getAllStudyWeeks();
      res.json(weeks);
    } catch (error) {
      console.error("Get admin weeks error:", error);
      res.status(500).json({ message: "Erro ao buscar semanas" });
    }
  });

  // Admin: Get study stats - admin or espiritualidade
  app.get("/api/study/admin/stats", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getStudyDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  app.get("/api/study/admin/monthly-progress", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const data = await storage.getMonthlyProgressData();
      res.json(data);
    } catch (error) {
      console.error("Get monthly progress error:", error);
      res.status(500).json({ message: "Erro ao buscar progresso mensal" });
    }
  });

  app.get("/api/study/admin/weekly-activity", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const data = await storage.getWeeklyActivityData();
      res.json(data);
    } catch (error) {
      console.error("Get weekly activity error:", error);
      res.status(500).json({ message: "Erro ao buscar atividade semanal" });
    }
  });

  app.get("/api/study/admin/weekly-top-members", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const data = await storage.getTopWeeklyMembers(limit);
      res.json(data);
    } catch (error) {
      console.error("Get weekly top members error:", error);
      res.status(500).json({ message: "Erro ao buscar top membros da semana" });
    }
  });

  app.get("/api/study/admin/events-stats", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const allEvents = await storage.getAllStudyEvents();
      const now = new Date();
      
      const activeEvents = allEvents.filter(e => e.status === 'published' && new Date(e.startDate) <= now && new Date(e.endDate) >= now);
      const upcomingEvents = allEvents.filter(e => e.status === 'published' && new Date(e.startDate) > now);
      const completedEvents = allEvents.filter(e => e.status === 'completed');
      
      // Note: Removed unused N+1 loop that was fetching lessons/progress but not using the results
      const cards = await storage.getActiveCollectibleCards();
      
      res.json({
        totalEvents: allEvents.length,
        activeEvents: activeEvents.length,
        upcomingEvents: upcomingEvents.length,
        completedEvents: completedEvents.length,
        recentEvents: allEvents.slice(0, 5).map(e => ({
          id: e.id,
          title: e.title,
          theme: e.theme,
          status: e.status,
          startDate: e.startDate,
          endDate: e.endDate,
          imageUrl: e.imageUrl
        }))
      });
    } catch (error) {
      console.error("Get events stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de eventos" });
    }
  });

  // Admin: Get all users with study profiles - admin or espiritualidade
  app.get("/api/study/admin/users", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getStudyUsersWithProfiles();
      res.json(users);
    } catch (error) {
      console.error("Get study users error:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Admin: Recalculate all user levels based on XP - admin only
  app.post("/api/study/admin/recalculate-levels", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const result = await storage.recalculateAllLevels();
      res.json({ 
        message: `Níveis recalculados: ${result.updated} de ${result.total} perfis atualizados`,
        ...result 
      });
    } catch (error) {
      console.error("Recalculate levels error:", error);
      res.status(500).json({ message: "Erro ao recalcular níveis" });
    }
  });

  // Admin: Get lessons for a week - admin or espiritualidade
  app.get("/api/study/admin/lessons", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.query.weekId as string);
      if (!weekId) {
        return res.status(400).json({ message: "ID da semana e obrigatorio" });
      }
      const lessons = await storage.getLessonsForWeek(weekId);
      res.json(lessons);
    } catch (error) {
      console.error("Get admin lessons error:", error);
      res.status(500).json({ message: "Erro ao buscar licoes" });
    }
  });

  // Admin: Create a new study week - admin or espiritualidade
  app.post("/api/study/admin/weeks", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const { title, description, weekNumber, year } = req.body;
      if (!title) {
        return res.status(400).json({ message: "Titulo e obrigatorio" });
      }
      const week = await storage.createStudyWeek({
        title,
        description: description || null,
        weekNumber: weekNumber || 1,
        year: year || new Date().getFullYear(),
        createdBy: req.user!.id
      });
      res.json(week);
    } catch (error) {
      console.error("Create week error:", error);
      res.status(500).json({ message: "Erro ao criar semana" });
    }
  });

  // Admin: Publish a study week - admin or espiritualidade
  app.post("/api/study/admin/weeks/:weekId/publish", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const week = await storage.publishStudyWeek(weekId);
      if (!week) {
        return res.status(404).json({ message: "Semana não encontrada" });
      }
      res.json(week);
    } catch (error) {
      console.error("Publish week error:", error);
      res.status(500).json({ message: "Erro ao publicar semana" });
    }
  });

  // ============================================
  // AI-POWERED CONTENT GENERATION ROUTES
  // ============================================

  // Check if AI is configured - admin or espiritualidade
  app.get("/api/ai/status", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      res.json({ 
        configured: isAIConfigured(),
        message: isAIConfigured() 
          ? "IA configurada e pronta para uso" 
          : "Chave de API do Gemini não configurada"
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao verificar status da IA" });
    }
  });

  // Generate complete study week content from PDF and save to database - admin or espiritualidade
  app.post("/api/ai/generate-week-from-pdf", authenticateToken, requireAdminOrEspiritualidade, upload.single('pdf'), async (req: AuthRequest, res) => {
    try {
      const geminiKey = req.body.geminiKey || "1";
      const openaiKey = req.body.openaiKey || "1";
      const aiProvider: AIProvider = req.body.aiProvider === "openai" ? "openai" : "gemini";

      // Check AI configuration based on provider
      if (aiProvider === "gemini" && !isAIConfigured()) {
        return res.status(503).json({ message: "IA não configurada. Adicione a chave GEMINI_API_KEY." });
      }
      if (aiProvider === "openai" && !process.env.OPENAI_API_KEY) {
        return res.status(503).json({ message: "OpenAI não configurada. Adicione a chave OPENAI_API_KEY." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo PDF enviado." });
      }

      const weekNumber = parseInt(req.body.weekNumber);
      const year = parseInt(req.body.year);

      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
        return res.status(400).json({ message: "Número da semana inválido. Deve ser entre 1 e 53." });
      }

      if (isNaN(year) || year < 2020 || year > 2100) {
        return res.status(400).json({ message: "Ano inválido. Deve ser entre 2020 e 2100." });
      }

      // Check if week already exists
      const existingWeek = await storage.getStudyWeekByNumber(weekNumber, year);
      if (existingWeek) {
        return res.status(409).json({ 
          message: `Já existe conteúdo para a semana ${weekNumber} de ${year}. Delete a semana existente primeiro ou escolha outra semana/ano.`,
          existingWeek
        });
      }

      // Parse PDF content
      const pdfData = await parsePdfBuffer(req.file.buffer);
      const pdfText = pdfData.text;

      if (!pdfText || pdfText.trim().length < 100) {
        return res.status(400).json({ message: "PDF muito curto ou sem texto legível. Forneça pelo menos 100 caracteres de conteúdo." });
      }

      // Generate content with AI using selected provider and key
      const generatedContent = await generateStudyContentFromPDF(pdfText, weekNumber, year, geminiKey, aiProvider, openaiKey);

      // Create the week in database
      const week = await storage.createStudyWeek({
        title: generatedContent.weekTitle,
        description: generatedContent.weekDescription,
        weekNumber: weekNumber,
        year: year,
        createdBy: req.user!.id,
        aiMetadata: JSON.stringify({
          generatedAt: new Date().toISOString(),
          model: "gemini-3-flash-preview",
          source: "pdf",
          lessonsCount: generatedContent.lessons.length
        })
      });

      // Create lessons and units
      let totalLessons = 0;
      let totalUnits = 0;

      for (let i = 0; i < generatedContent.lessons.length; i++) {
        const lessonData = generatedContent.lessons[i];
        
        const lesson = await storage.createStudyLesson({
          studyWeekId: week.id,
          orderIndex: i,
          title: lessonData.title,
          description: lessonData.description || undefined,
          type: lessonData.type,
          xpReward: lessonData.xpReward,
          estimatedMinutes: lessonData.estimatedMinutes,
          icon: getIconForLessonType(lessonData.type),
          isBonus: false
        });
        totalLessons++;

        // Create units for this lesson - use unit's stage from AI, fallback to lesson type
        const stageMap: Record<string, string> = {
          'study': 'estude',
          'meditation': 'medite',
          'challenge': 'responda'
        };
        const defaultStage = stageMap[lessonData.type] || 'estude';

        for (let j = 0; j < lessonData.units.length; j++) {
          const unitData = lessonData.units[j];
          
          await storage.createStudyUnit({
            lessonId: lesson.id,
            orderIndex: j,
            type: unitData.type,
            content: unitData.content,
            xpValue: unitData.xpValue,
            stage: unitData.stage || defaultStage
          });
          totalUnits++;
        }
      }

      // Generate practice questions for the week immediately after creation
      try {
        console.log(`[Week Creation] Generating practice questions for week ${week.id}...`);
        await storage.generatePracticeQuestionsFromAI(week.id);
        console.log(`[Week Creation] Practice questions generated successfully for week ${week.id}`);
      } catch (practiceError) {
        console.error(`[Week Creation] Failed to generate practice questions for week ${week.id}:`, practiceError);
        // Don't fail the entire week creation if practice questions fail
      }

      res.json({
        message: "Semana criada com sucesso usando IA a partir do PDF",
        week,
        stats: {
          lessons: totalLessons,
          units: totalUnits
        }
      });
    } catch (error) {
      console.error("AI generate week from PDF error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao gerar conteudo com IA a partir do PDF" 
      });
    }
  });

  // Generate complete study week content from text - admin or espiritualidade
  app.post("/api/ai/generate-week", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(400).json({ message: "IA nao configurada. Adicione a chave GEMINI_API_KEY." });
      }

      const { text, weekNumber, year } = req.body;
      
      if (!text || text.trim().length < 100) {
        return res.status(400).json({ message: "Texto muito curto. Forneca pelo menos 100 caracteres." });
      }

      const content = await generateStudyContentFromText(
        text,
        weekNumber || 1,
        year || new Date().getFullYear()
      );

      res.json(content);
    } catch (error) {
      console.error("AI generate week error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao gerar conteudo com IA" 
      });
    }
  });

  // Generate exercises from a topic - admin or espiritualidade
  app.post("/api/ai/generate-exercises", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(400).json({ message: "IA nao configurada. Adicione a chave GEMINI_API_KEY." });
      }

      const { topic, count } = req.body;
      
      if (!topic || topic.trim().length < 10) {
        return res.status(400).json({ message: "Forneca um topico com pelo menos 10 caracteres." });
      }

      const exercises = await generateExercisesFromTopic(topic, count || 5);
      res.json({ exercises });
    } catch (error) {
      console.error("AI generate exercises error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao gerar exercicios com IA" 
      });
    }
  });

  // Generate reflection questions from text - admin or espiritualidade
  app.post("/api/ai/generate-reflections", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(400).json({ message: "IA nao configurada. Adicione a chave GEMINI_API_KEY." });
      }

      const { text, count } = req.body;
      
      if (!text || text.trim().length < 50) {
        return res.status(400).json({ message: "Texto muito curto para gerar reflexoes." });
      }

      const questions = await generateReflectionQuestions(text, count || 3);
      res.json({ questions });
    } catch (error) {
      console.error("AI generate reflections error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao gerar reflexoes com IA" 
      });
    }
  });

  // Summarize text - admin or espiritualidade
  app.post("/api/ai/summarize", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(400).json({ message: "IA nao configurada. Adicione a chave GEMINI_API_KEY." });
      }

      const { text } = req.body;
      
      if (!text || text.trim().length < 100) {
        return res.status(400).json({ message: "Texto muito curto para resumir." });
      }

      const summary = await summarizeText(text);
      res.json({ summary });
    } catch (error) {
      console.error("AI summarize error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao resumir texto com IA" 
      });
    }
  });

  // Create week with AI-generated content and save to database - admin or espiritualidade
  app.post("/api/ai/create-week-with-content", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      if (!isAIConfigured()) {
        return res.status(400).json({ message: "IA nao configurada. Adicione a chave GEMINI_API_KEY." });
      }

      const { text, weekNumber, year, geminiKey, aiProvider, openaiKey } = req.body;
      
      if (!text || text.trim().length < 100) {
        return res.status(400).json({ message: "Texto muito curto. Forneca pelo menos 100 caracteres." });
      }

      const currentYear = year || new Date().getFullYear();
      const currentWeekNumber = weekNumber || 1;
      const selectedGeminiKey = geminiKey || "1";
      const selectedOpenaiKey = openaiKey || "1";
      const selectedProvider: AIProvider = aiProvider === "openai" ? "openai" : "gemini";

      // Check if week already exists
      const existingWeek = await storage.getStudyWeekByNumber(currentWeekNumber, currentYear);
      if (existingWeek) {
        return res.status(409).json({ 
          message: `Ja existe conteudo para a semana ${currentWeekNumber} de ${currentYear}. Delete a semana existente primeiro ou escolha outra semana/ano.`,
          existingWeek
        });
      }

      // Generate content with AI using selected key and provider
      const generatedContent = await generateStudyContentFromText(text, currentWeekNumber, currentYear, selectedGeminiKey, selectedProvider, selectedOpenaiKey);

      // Create the week in database
      const week = await storage.createStudyWeek({
        title: generatedContent.weekTitle,
        description: generatedContent.weekDescription,
        weekNumber: currentWeekNumber,
        year: currentYear,
        createdBy: req.user!.id,
        aiMetadata: JSON.stringify({
          generatedAt: new Date().toISOString(),
          model: "gemini-3-flash-preview",
          lessonsCount: generatedContent.lessons.length
        })
      });

      // Create lessons and units
      let totalLessons = 0;
      let totalUnits = 0;

      for (let i = 0; i < generatedContent.lessons.length; i++) {
        const lessonData = generatedContent.lessons[i];
        
        const lesson = await storage.createStudyLesson({
          studyWeekId: week.id,
          orderIndex: i,
          title: lessonData.title,
          description: lessonData.description || undefined,
          type: lessonData.type,
          xpReward: lessonData.xpReward,
          estimatedMinutes: lessonData.estimatedMinutes,
          icon: getIconForLessonType(lessonData.type),
          isBonus: false
        });
        totalLessons++;

        // Create units for this lesson - use unit's stage from AI, fallback to lesson type
        const stageMap: Record<string, string> = {
          'study': 'estude',
          'meditation': 'medite',
          'challenge': 'responda'
        };
        const defaultStage = stageMap[lessonData.type] || 'estude';

        for (let j = 0; j < lessonData.units.length; j++) {
          const unitData = lessonData.units[j];
          
          await storage.createStudyUnit({
            lessonId: lesson.id,
            orderIndex: j,
            type: unitData.type,
            content: unitData.content,
            xpValue: unitData.xpValue,
            stage: unitData.stage || defaultStage
          });
          totalUnits++;
        }
      }

      // Generate practice questions for the week immediately after creation
      try {
        console.log(`[Week Creation] Generating practice questions for week ${week.id}...`);
        await storage.generatePracticeQuestionsFromAI(week.id);
        console.log(`[Week Creation] Practice questions generated successfully for week ${week.id}`);
      } catch (practiceError) {
        console.error(`[Week Creation] Failed to generate practice questions for week ${week.id}:`, practiceError);
        // Don't fail the entire week creation if practice questions fail
      }

      res.json({
        message: "Semana criada com sucesso usando IA",
        week,
        stats: {
          lessons: totalLessons,
          units: totalUnits
        }
      });
    } catch (error) {
      console.error("AI create week error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Erro ao criar semana com IA" 
      });
    }
  });

  // Admin: Create a new lesson - admin or espiritualidade
  app.post("/api/study/admin/lessons", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const { studyWeekId, title, type, description, xpReward, estimatedMinutes, isBonus } = req.body;
      
      if (!studyWeekId || !title) {
        return res.status(400).json({ message: "ID da semana e titulo sao obrigatorios" });
      }

      const existingLessons = await storage.getLessonsForWeek(studyWeekId);
      const orderIndex = existingLessons.length;

      const lesson = await storage.createStudyLesson({
        studyWeekId,
        orderIndex,
        title,
        type: type || 'study',
        description: description || undefined,
        xpReward: xpReward || 10,
        estimatedMinutes: estimatedMinutes || 5,
        icon: getIconForLessonType(type || 'study'),
        isBonus: isBonus || false
      });

      res.json(lesson);
    } catch (error) {
      console.error("Create lesson error:", error);
      res.status(500).json({ message: "Erro ao criar licao" });
    }
  });

  // Admin: Update a lesson - admin or espiritualidade
  app.put("/api/study/admin/lessons/:lessonId", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const { title, type, description, xpReward, estimatedMinutes, isBonus, orderIndex } = req.body;

      const lesson = await storage.updateStudyLesson(lessonId, {
        title,
        type,
        description,
        xpReward,
        estimatedMinutes,
        icon: type ? getIconForLessonType(type) : undefined,
        isBonus,
        orderIndex
      });

      if (!lesson) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }

      res.json(lesson);
    } catch (error) {
      console.error("Update lesson error:", error);
      res.status(500).json({ message: "Erro ao atualizar licao" });
    }
  });

  // Admin: Delete a lesson - admin or espiritualidade
  app.delete("/api/study/admin/lessons/:lessonId", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const deleted = await storage.deleteStudyLesson(lessonId);

      if (!deleted) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }

      res.json({ message: "Lição excluida com sucesso" });
    } catch (error) {
      console.error("Delete lesson error:", error);
      res.status(500).json({ message: "Erro ao excluir licao" });
    }
  });

  // Admin: Get a single lesson by ID - admin or espiritualidade
  app.get("/api/study/admin/lessons/:lessonId", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      if (isNaN(lessonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const lesson = await storage.getLessonById(lessonId);
      if (!lesson) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Get lesson by id error:", error);
      res.status(500).json({ message: "Erro ao buscar lição" });
    }
  });

  // Admin: PATCH a lesson (partial update including isLocked) - admin or espiritualidade
  app.patch("/api/study/admin/lessons/:lessonId", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      if (isNaN(lessonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      const { isLocked, title, description } = req.body;

      if (typeof isLocked === 'boolean') {
        const lesson = isLocked 
          ? await storage.lockLesson(lessonId)
          : await storage.unlockLesson(lessonId);
        
        if (!lesson) {
          return res.status(404).json({ message: "Lição não encontrada" });
        }
        return res.json(lesson);
      }

      const lesson = await storage.updateStudyLesson(lessonId, { title, description });
      if (!lesson) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }
      res.json(lesson);
    } catch (error) {
      console.error("Patch lesson error:", error);
      res.status(500).json({ message: "Erro ao atualizar licao" });
    }
  });

  // Admin: Lock a lesson - admin or espiritualidade
  app.post("/api/study/admin/lessons/:lessonId/lock", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const lesson = await storage.lockLesson(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }

      res.json({ message: "Lição bloqueada com sucesso", lesson });
    } catch (error) {
      console.error("Lock lesson error:", error);
      res.status(500).json({ message: "Erro ao bloquear licao" });
    }
  });

  // Admin: Unlock a lesson - admin or espiritualidade
  app.post("/api/study/admin/lessons/:lessonId/unlock", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const lesson = await storage.unlockLesson(lessonId);

      if (!lesson) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }

      // Get season (revista) title for notification - prioritize seasonId
      if (lesson.seasonId) {
        const season = await storage.getSeasonById(lesson.seasonId);
        if (season) {
          notifyNewLessonToAll(lesson.title, season.title, "revista").catch(err => 
            console.error("[Notifications] Error notifying new lesson:", err)
          );
        }
      } else if (lesson.studyWeekId) {
        // Fallback for legacy weeks (unidades)
        const week = await storage.getStudyWeekById(lesson.studyWeekId);
        if (week) {
          notifyNewLessonToAll(lesson.title, week.title, "unidade").catch(err => 
            console.error("[Notifications] Error notifying new lesson:", err)
          );
        }
      }

      res.json({ message: "Lição liberada com sucesso", lesson });
    } catch (error) {
      console.error("Unlock lesson error:", error);
      res.status(500).json({ message: "Erro ao liberar licao" });
    }
  });

  // Admin: Set unlock date for a lesson - admin or espiritualidade
  app.post("/api/study/admin/lessons/:lessonId/schedule", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const { unlockDate } = req.body;
      
      const lesson = await storage.setLessonUnlockDate(lessonId, unlockDate || null);

      if (!lesson) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }

      res.json({ message: unlockDate ? "Data de liberacao agendada" : "Agendamento removido", lesson });
    } catch (error) {
      console.error("Schedule lesson error:", error);
      res.status(500).json({ message: "Erro ao agendar liberacao" });
    }
  });

  // Admin: Unlock all lessons for a week - admin or espiritualidade
  app.post("/api/study/admin/weeks/:weekId/unlock-all", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const count = await storage.unlockAllLessonsForWeek(weekId);

      res.json({ message: `${count} licoes liberadas com sucesso` });
    } catch (error) {
      console.error("Unlock all lessons error:", error);
      res.status(500).json({ message: "Erro ao liberar todas as licoes" });
    }
  });

  // Admin: Lock all lessons for a week - admin or espiritualidade
  app.post("/api/study/admin/weeks/:weekId/lock-all", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const count = await storage.lockAllLessonsForWeek(weekId);

      res.json({ message: `${count} licoes bloqueadas com sucesso` });
    } catch (error) {
      console.error("Lock all lessons error:", error);
      res.status(500).json({ message: "Erro ao bloquear todas as licoes" });
    }
  });

  // Admin: Set weekly unlock schedule (one lesson per week) - admin or espiritualidade
  app.post("/api/study/admin/weeks/:weekId/schedule-weekly", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const { startDate } = req.body;

      if (!startDate) {
        return res.status(400).json({ message: "Data inicial e obrigatoria" });
      }

      const count = await storage.setWeeklyUnlockSchedule(weekId, startDate);

      res.json({ message: `Agendamento criado para ${count} licoes (uma por semana)` });
    } catch (error) {
      console.error("Schedule weekly error:", error);
      res.status(500).json({ message: "Erro ao criar agendamento semanal" });
    }
  });

  // Admin: Get units for a lesson - admin or espiritualidade
  app.get("/api/study/admin/lessons/:lessonId/units", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      const units = await storage.getUnitsForLesson(lessonId);
      res.json(units);
    } catch (error) {
      console.error("Get units error:", error);
      res.status(500).json({ message: "Erro ao buscar exercicios" });
    }
  });

  // Admin: Create a new unit - admin or espiritualidade
  app.post("/api/study/admin/units", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const { lessonId, type, content, xpValue, stage } = req.body;

      if (!lessonId || !type || !content) {
        return res.status(400).json({ message: "ID da licao, tipo e conteudo sao obrigatorios" });
      }

      // Get lesson to determine stage if not provided
      let unitStage = stage;
      if (!unitStage) {
        const lesson = await storage.getLessonById(lessonId);
        if (lesson) {
          const stageMap: Record<string, string> = {
            'study': 'estude',
            'meditation': 'medite',
            'challenge': 'responda'
          };
          unitStage = stageMap[lesson.type] || 'estude';
        }
      }

      const existingUnits = await storage.getUnitsForLesson(lessonId);
      const orderIndex = existingUnits.length;

      const unit = await storage.createStudyUnit({
        lessonId,
        orderIndex,
        type,
        content,
        xpValue: xpValue || 5,
        stage: unitStage || 'estude'
      });

      res.json(unit);
    } catch (error) {
      console.error("Create unit error:", error);
      res.status(500).json({ message: "Erro ao criar exercicio" });
    }
  });

  // Admin: Update a unit - admin or espiritualidade
  app.put("/api/study/admin/units/:unitId", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const unitId = parseInt(req.params.unitId);
      const { type, content, xpValue, orderIndex } = req.body;

      const unit = await storage.updateStudyUnit(unitId, {
        type,
        content,
        xpValue,
        orderIndex
      });

      if (!unit) {
        return res.status(404).json({ message: "Exercicio nao encontrado" });
      }

      res.json(unit);
    } catch (error) {
      console.error("Update unit error:", error);
      res.status(500).json({ message: "Erro ao atualizar exercicio" });
    }
  });

  // Admin: Delete a unit - admin or espiritualidade
  app.delete("/api/study/admin/units/:unitId", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const unitId = parseInt(req.params.unitId);
      const deleted = await storage.deleteStudyUnit(unitId);

      if (!deleted) {
        return res.status(404).json({ message: "Exercicio nao encontrado" });
      }

      res.json({ message: "Exercicio excluido com sucesso" });
    } catch (error) {
      console.error("Delete unit error:", error);
      res.status(500).json({ message: "Erro ao excluir exercicio" });
    }
  });

  // Admin: Delete a week - admin or espiritualidade
  app.delete("/api/study/admin/weeks/:weekId", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const deleted = await storage.deleteStudyWeek(weekId);

      if (!deleted) {
        return res.status(404).json({ message: "Semana não encontrada" });
      }

      res.json({ message: "Semana excluida com sucesso" });
    } catch (error) {
      console.error("Delete week error:", error);
      res.status(500).json({ message: "Erro ao excluir semana" });
    }
  });

  // Admin: Update a week - admin or espiritualidade
  app.put("/api/study/admin/weeks/:weekId", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      const { title, description, weekNumber, year, status } = req.body;

      const week = await storage.updateStudyWeek(weekId, {
        title,
        description,
        weekNumber,
        year,
        status
      });

      if (!week) {
        return res.status(404).json({ message: "Semana não encontrada" });
      }

      res.json(week);
    } catch (error) {
      console.error("Update week error:", error);
      res.status(500).json({ message: "Erro ao atualizar semana" });
    }
  });

  // Admin: Seed study data with real content (resets all DeoGlory data) - admin or espiritualidade
  app.post("/api/study/admin/seed", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const { seedAllData } = await import("../scripts/seed-study-data");
      await seedAllData();
      res.json({ 
        message: "Todos os dados do sistema DeoGlory foram resetados e novos dados inseridos com sucesso",
        success: true
      });
    } catch (error) {
      console.error("Seed study data error:", error);
      res.status(500).json({ message: "Erro ao inserir dados de estudo" });
    }
  });

  // ==================== DAILY MISSIONS ROUTES ====================

  // Helper to get current daily verse date key (resets at 6 AM São Paulo time)
  function getDailyVerseDateKeyMission(): string {
    const now = new Date();
    const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    if (spTime.getHours() < 6) {
      spTime.setDate(spTime.getDate() - 1);
    }
    return spTime.toISOString().split('T')[0];
  }

  // Get user's daily missions for today
  app.get("/api/missions/daily", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const today = getTodayBrazilDate();
      
      // Assign missions for today if not already assigned
      let missions = await storage.assignDailyMissions(userId, today);
      const content = await storage.getDailyMissionContent(today);
      
      // Check user's profile for auto-completable missions
      const profile = await storage.getStudyProfile(userId);
      const verseDateKey = getDailyVerseDateKeyMission();
      const hasReadVerse = profile?.dailyVerseReadDate === verseDateKey;
      
      // Check if user completed a lesson today (using lastLessonCompletedAt)
      let hasCompletedLessonToday = false;
      if (profile?.lastLessonCompletedAt) {
        const lastLessonDate = new Date(profile.lastLessonCompletedAt);
        const spLastLesson = new Date(lastLessonDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const spNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        hasCompletedLessonToday = spLastLesson.toISOString().split('T')[0] === spNow.toISOString().split('T')[0];
      }
      
      let needsRefresh = false;
      
      // Auto-complete "read_daily_verse" mission if user already read the verse on Explore
      if (hasReadVerse) {
        for (const mission of missions) {
          if (mission.mission?.type === 'read_daily_verse' && !mission.completed) {
            await storage.completeMission(userId, mission.missionId, today);
            needsRefresh = true;
          }
        }
      }
      
      // Auto-complete "maintain_streak" and "complete_lesson" missions if user completed a lesson today
      if (hasCompletedLessonToday) {
        for (const mission of missions) {
          const missionType = mission.mission?.type;
          if ((missionType === 'maintain_streak' || missionType === 'complete_lesson') && !mission.completed) {
            await storage.completeMission(userId, mission.missionId, today);
            needsRefresh = true;
          }
        }
      }
      
      // Refresh missions list after auto-completions
      if (needsRefresh) {
        missions = await storage.getUserDailyMissions(userId, today);
      }
      
      const completedCount = missions.filter(m => m.completed).length;
      const allCompleted = missions.length > 0 && completedCount === missions.length;
      
      res.json({
        missions,
        completedCount,
        totalCount: missions.length,
        allCompleted,
        bonusXpAvailable: allCompleted ? 0 : 50,
        content,
        date: today,
      });
    } catch (error) {
      console.error("Get daily missions error:", error);
      res.status(500).json({ message: "Erro ao buscar missoes diarias" });
    }
  });

  // Get mission detail for activity page
  app.get("/api/missions/:missionId/detail", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const missionId = parseInt(req.params.missionId);
      const today = getTodayBrazilDate();
      
      const mission = await storage.getUserMissionById(userId, missionId, today);
      
      if (!mission) {
        return res.status(404).json({ message: "Missao não encontrada" });
      }
      
      const rawContent = await storage.getDailyMissionContent(today);
      
      // Parse JSON fields from stored strings
      const parsedContent: any = {};
      if (rawContent) {
        // Parse quiz questions from JSON string - use timedQuizQuestions for timed_challenge missions
        const missionType = mission.mission?.type;
        const isTimedChallenge = missionType === 'timed_challenge';
        const isQuickQuiz = missionType === 'quick_quiz';
        
        // For timed_challenge, use timedQuizQuestions if available
        if (isTimedChallenge && (rawContent as any).timedQuizQuestions) {
          try {
            let questions = JSON.parse((rawContent as any).timedQuizQuestions);
            // Shuffle questions for variety each time user accesses
            if (Array.isArray(questions) && questions.length > 0) {
              for (let i = questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questions[i], questions[j]] = [questions[j], questions[i]];
              }
            }
            parsedContent.quizQuestions = questions;
          } catch (e) {
            console.error('[Mission Content] Failed to parse timedQuizQuestions:', e);
          }
        }
        // For quick_quiz and other quiz missions, use regular quizQuestions
        if ((isQuickQuiz || !parsedContent.quizQuestions) && rawContent.quizQuestions) {
          try {
            let questions = JSON.parse(rawContent.quizQuestions);
            // Shuffle questions for variety each time user accesses
            if (Array.isArray(questions) && questions.length > 0) {
              for (let i = questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questions[i], questions[j]] = [questions[j], questions[i]];
              }
            }
            parsedContent.quizQuestions = questions;
          } catch (e) {
            console.error('[Mission Content] Failed to parse quizQuestions:', e);
          }
        }
        // Parse bible fact from JSON string
        if (rawContent.bibleFact) {
          try {
            const parsed = JSON.parse(rawContent.bibleFact);
            parsedContent.bibleFact = parsed.fact || rawContent.bibleFact;
          } catch (e) {
            // If not JSON, use as plain string
            parsedContent.bibleFact = rawContent.bibleFact;
          }
        }
        // Copy other fields directly
        if (rawContent.dailyVerse) parsedContent.dailyVerse = rawContent.dailyVerse;
        if (rawContent.dailyTheme) parsedContent.dailyTheme = rawContent.dailyTheme;
        
        // Parse bible character from JSON string
        if (rawContent.bibleCharacter) {
          try {
            const parsed = JSON.parse(rawContent.bibleCharacter);
            parsedContent.bibleCharacter = parsed.name || 'Daniel';
            parsedContent.characterStory = parsed.description || parsed.story || 'Daniel foi um jovem judeu levado cativo para a Babilônia. Ele se destacou por sua fé inabalável em Deus.';
          } catch (e) {
            // If not JSON, use as plain string (name)
            parsedContent.bibleCharacter = rawContent.bibleCharacter;
          }
        }
        
        // Parse verse memory from JSON string
        if (rawContent.verseMemory) {
          try {
            const parsed = JSON.parse(rawContent.verseMemory);
            parsedContent.themeToMemorize = parsed.verse || parsed.text || '';
            parsedContent.themeExplanation = parsed.explanation || '';
            parsedContent.verseReference = parsed.reference || '';
          } catch (e) {
            // If not JSON, use as plain string
            parsedContent.themeToMemorize = rawContent.verseMemory;
          }
        }
      }
      
      res.json({
        ...mission,
        content: parsedContent,
      });
    } catch (error) {
      console.error("Get mission detail error:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes da missao" });
    }
  });

  // Complete a mission
  app.post("/api/missions/:missionId/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const missionId = parseInt(req.params.missionId);
      const today = getTodayBrazilDate();
      
      // Check how many missions were completed before this one
      const missionsBeforeCompletion = await storage.getUserDailyMissions(userId, today);
      const completedBeforeCount = missionsBeforeCompletion.filter(m => m.completed).length;
      
      const result = await storage.completeMission(userId, missionId, today);
      
      if (!result) {
        return res.status(404).json({ message: "Missao não encontrada ou ja concluida" });
      }
      
      // Check if ALL daily missions are now completed (this was the last one)
      const missionsAfterCompletion = await storage.getUserDailyMissions(userId, today);
      const completedAfterCount = missionsAfterCompletion.filter(m => m.completed).length;
      const allCompleted = missionsAfterCompletion.length > 0 && completedAfterCount === missionsAfterCompletion.length;
      
      // Only increment weekly mission count when ALL daily missions are completed for the first time
      if (allCompleted && completedBeforeCount < missionsAfterCompletion.length) {
        const weekKey = getCurrentWeekKey();
        await storage.incrementWeeklyMission(userId, weekKey);
      }
      
      res.json({
        message: "Missao concluida com sucesso!",
        ...result,
        allDailyMissionsCompleted: allCompleted,
      });
    } catch (error) {
      console.error("Complete mission error:", error);
      res.status(500).json({ message: "Erro ao concluir missao" });
    }
  });

  // Get daily mission content (verse, fact, character)
  app.get("/api/missions/content", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const today = getTodayBrazilDate();
      const content = await storage.getDailyMissionContent(today);
      
      res.json(content || {});
    } catch (error) {
      console.error("Get mission content error:", error);
      res.status(500).json({ message: "Erro ao buscar conteudo das missoes" });
    }
  });

  // Admin: Initialize daily missions (seed templates)
  app.post("/api/missions/admin/init", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      await storage.initializeDailyMissions();
      res.json({ message: "Missoes diarias inicializadas com sucesso" });
    } catch (error) {
      console.error("Init daily missions error:", error);
      res.status(500).json({ message: "Erro ao inicializar missoes diarias" });
    }
  });

  // ==================== NOTIFICATION ENDPOINTS ====================

  // OPTIMIZED: Diagnostic endpoint to check push notification status (admin only) - batch query
  app.get("/api/admin/push-status", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const members = await storage.getAllMembers();
      
      // OPTIMIZED: Batch fetch all subscription counts in one query
      const memberIds = members.map(m => m.id);
      const [subscriptionCountsMap, anonymousSubscriptions] = await Promise.all([
        storage.getPushSubscriptionCountsByUserIds(memberIds),
        storage.getAllAnonymousPushSubscriptions(),
      ]);
      
      const results = members.map(member => ({
        userId: member.id,
        fullName: member.fullName,
        subscriptionCount: subscriptionCountsMap.get(member.id) || 0,
      }));
      
      const vapidConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
      const viteVapidConfigured = Boolean(process.env.VITE_VAPID_PUBLIC_KEY);
      
      res.json({
        vapidConfigured,
        viteVapidConfigured,
        totalMembers: members.length,
        membersWithPush: results.filter(r => r.subscriptionCount > 0).length,
        membersWithoutPush: results.filter(r => r.subscriptionCount === 0).length,
        anonymousSubscriptions: anonymousSubscriptions.length,
        details: results,
      });
    } catch (error) {
      console.error("Push status error:", error);
      res.status(500).json({ message: "Erro ao verificar status push" });
    }
  });

  // Subscribe to push notifications
  app.post("/api/notifications/subscribe", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { endpoint, p256dh, auth, syncOnly } = req.body;
      const anonSubId = req.headers['x-anonymous-subscription-id'] as string;

      console.log(`[Push] Subscribe sync: userId=${userId}, anonSubId=${anonSubId}, syncOnly=${syncOnly}, bodyKeys=${Object.keys(req.body)}`);

      if (anonSubId) {
        try {
          const subId = parseInt(anonSubId);
          
          // Verify if the anonymous subscription exists before linking
          const allAnon = await storage.getAllAnonymousPushSubscriptions();
          const targetAnon = allAnon.find(a => a.id === subId);
          
          if (targetAnon) {
            console.log(`[Push] Found anonymous sub ${subId}, linking to user ${userId}...`);
            await storage.linkAnonymousSubscriptionToUser(subId, userId);
            console.log(`[Push] Database link successful for user ${userId}`);
          }
          // Note: If not found, it was already linked during login - this is expected, not an error
          
          if (syncOnly) {
            return res.json({ message: "Subscription linked successfully" });
          }
        } catch (err) {
          console.error("[Push] Database link failed:", err);
          if (syncOnly) {
            return res.status(500).json({ message: "Error linking subscription" });
          }
        }
      }

      if (!endpoint || !p256dh || !auth) {
        if (syncOnly) {
           return res.json({ message: "Sync attempt finished (no data provided)" });
        }
        console.error("[Push] Missing required subscription fields:", { 
          endpoint: !!endpoint, 
          p256dh: !!p256dh, 
          auth: !!auth,
          userId 
        });
        return res.status(400).json({ message: "Dados de inscricao invalidos" });
      }
      
      await storage.savePushSubscription(userId, endpoint, p256dh, auth);
      
      try {
        await storage.removeAnonymousPushSubscription(endpoint);
        console.log(`[Push] Migrated subscription from anonymous to user ${userId}`);
      } catch (e) {
      }
      
      console.log(`[Push] Subscription saved for user ${userId}. Keys present: p256dh=${!!p256dh}, auth=${!!auth}`);
      res.json({ message: "Inscrito para notificacoes com sucesso" });
    } catch (error) {
      console.error("[Push] Subscribe push error:", error);
      res.status(500).json({ message: "Erro ao inscrever para notificacoes" });
    }
  });

  // Check push subscription status for current user
  app.get("/api/notifications/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const subscriptions = await storage.getPushSubscriptionsByUserId(userId);
      
      res.json({
        isSubscribed: subscriptions.length > 0,
        subscriptionCount: subscriptions.length,
        endpoints: subscriptions.map(s => s.endpoint.substring(0, 50) + '...')
      });
    } catch (error) {
      console.error("[Push] Status check error:", error);
      res.status(500).json({ message: "Erro ao verificar status" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/notifications/unsubscribe", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { endpoint } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint nao fornecido" });
      }
      
      await storage.removePushSubscription(userId, endpoint);
      
      res.json({ message: "Desinscrito de notificacoes com sucesso" });
    } catch (error) {
      console.error("Unsubscribe push error:", error);
      res.status(500).json({ message: "Erro ao desinscrever de notificacoes" });
    }
  });

  // Subscribe to push notifications (anonymous visitors)
  app.post("/api/notifications/subscribe-anonymous", async (req, res) => {
    try {
      const { endpoint, p256dh, auth } = req.body;
      
      console.log(`[Push Anonymous] Subscribe request received, endpoint: ${endpoint?.substring(0, 50)}...`);
      
      if (!endpoint || !p256dh || !auth) {
        console.log(`[Push Anonymous] Invalid subscription data: endpoint=${!!endpoint}, p256dh=${!!p256dh}, auth=${!!auth}`);
        return res.status(400).json({ message: "Dados de inscricao invalidos" });
      }
      
      const result = await storage.saveAnonymousPushSubscription(endpoint, p256dh, auth);
      
      console.log(`[Push Anonymous] Subscription saved successfully, id: ${result.id}, isNew: ${result.isNew}`);
      console.log(`[Push Anonymous] IMPORTANT: Frontend should save this ID (${result.id}) to localStorage as 'anonymous_push_subscription_id'`);
      
      res.json({ 
        message: "Inscrito para notificacoes com sucesso", 
        id: result.id,
        isNew: result.isNew 
      });
    } catch (error) {
      console.error("[Push Anonymous] Subscribe error:", error);
      res.status(500).json({ message: "Erro ao inscrever para notificacoes" });
    }
  });

  // Unsubscribe from push notifications (anonymous visitors)
  app.post("/api/notifications/unsubscribe-anonymous", async (req, res) => {
    try {
      const { endpoint } = req.body;
      
      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint nao fornecido" });
      }
      
      await storage.removeAnonymousPushSubscription(endpoint);
      
      res.json({ message: "Desinscrito de notificacoes com sucesso" });
    } catch (error) {
      console.error("Unsubscribe anonymous push error:", error);
      res.status(500).json({ message: "Erro ao desinscrever de notificacoes" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const notifications = await storage.getUserNotifications(userId, limit, offset);
      const unreadCount = await storage.getUnreadNotificationCount(userId);
      
      res.json({
        notifications,
        unreadCount,
        hasMore: notifications.length === limit,
      });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Erro ao buscar notificacoes" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const notificationId = parseInt(req.params.id);
      
      await storage.markNotificationRead(userId, notificationId);
      
      res.json({ message: "Notificacao marcada como lida" });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Erro ao marcar notificacao como lida" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      
      await storage.markAllNotificationsRead(userId);
      
      res.json({ message: "Todas as notificacoes marcadas como lidas" });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Erro ao marcar notificacoes como lidas" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const notificationId = parseInt(req.params.id);
      
      await storage.deleteNotification(userId, notificationId);
      
      res.json({ message: "Notificacao removida" });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Erro ao remover notificacao" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationCount(userId);
      
      res.json({ count });
    } catch (error) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Erro ao buscar contagem de notificacoes" });
    }
  });

  // ==================== SITE CONTENT API ====================

  // Get site highlights (latest devotional, upcoming events, instagram posts)
  app.get("/api/site/highlights", async (req, res) => {
    try {
      const highlights = await storage.getSiteHighlights();
      const bannerHighlights = await storage.getBannerHighlights();
      res.json({ ...highlights, bannerHighlights });
    } catch (error) {
      console.error("Get site highlights error:", error);
      res.status(500).json({ message: "Erro ao buscar destaques do site" });
    }
  });

  // Banner highlights management (admin/marketing)
  app.get("/api/admin/banner-highlights", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const highlights = await storage.getBannerHighlights();
      const count = await storage.getBannerHighlightCount();
      res.json({ highlights, count, maxAllowed: 10 });
    } catch (error) {
      console.error("Get banner highlights error:", error);
      res.status(500).json({ message: "Erro ao buscar destaques do banner" });
    }
  });

  app.post("/api/admin/banner-highlights", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const { contentType, contentId } = req.body;
      if (!contentType || !contentId) {
        return res.status(400).json({ message: "Tipo e ID do conteúdo são obrigatórios" });
      }
      if (!['devotional', 'event', 'instagram'].includes(contentType)) {
        return res.status(400).json({ message: "Tipo de conteúdo inválido" });
      }
      const highlight = await storage.addBannerHighlight(contentType, contentId);
      await logAuditAction(req.user?.id, "create", "banner_highlight", highlight.id, `Destaque adicionado: ${contentType} #${contentId}`, req);
      res.json(highlight);
    } catch (error: any) {
      console.error("Add banner highlight error:", error);
      res.status(400).json({ message: error.message || "Erro ao adicionar destaque" });
    }
  });

  app.delete("/api/admin/banner-highlights/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.removeBannerHighlight(id);
      await logAuditAction(req.user?.id, "delete", "banner_highlight", id, `Destaque removido`, req);
      res.json({ message: "Destaque removido com sucesso" });
    } catch (error) {
      console.error("Remove banner highlight error:", error);
      res.status(500).json({ message: "Erro ao remover destaque" });
    }
  });

  app.patch("/api/admin/banner-highlights/reorder", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        return res.status(400).json({ message: "Lista de IDs ordenados é obrigatória" });
      }
      await storage.reorderBannerHighlights(orderedIds);
      await logAuditAction(req.user?.id, "update", "banner_highlights", undefined, `Destaques reordenados`, req);
      res.json({ message: "Ordem atualizada com sucesso" });
    } catch (error) {
      console.error("Reorder banner highlights error:", error);
      res.status(500).json({ message: "Erro ao reordenar destaques" });
    }
  });

  // Get all devotionals
  app.get("/api/site/devotionals", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const devotionals = await storage.getAllDevotionals(limit);
      res.json(convertImageUrlsArray(devotionals));
    } catch (error) {
      console.error("Get devotionals error:", error);
      res.status(500).json({ message: "Erro ao buscar devocionais" });
    }
  });

  // Get single devotional by ID
  app.get("/api/site/devotionals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const devotional = await storage.getDevotionalById(id);
      if (!devotional) {
        return res.status(404).json({ message: "Devocional nao encontrado" });
      }
      res.json(convertImageUrls(devotional));
    } catch (error) {
      console.error("Get devotional by ID error:", error);
      res.status(500).json({ message: "Erro ao buscar devocional" });
    }
  });

  // Get upcoming events
  app.get("/api/site/events", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const events = await storage.getUpcomingEvents(limit);
      res.json(convertImageUrlsArray(events));
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  // OPTIMIZED: Get confirmation counts for multiple events (parallel)
  app.get("/api/site/events/confirmation-counts", async (req, res) => {
    try {
      const idsParam = req.query.ids as string;
      if (!idsParam) {
        return res.json({});
      }
      
      const eventIds = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (eventIds.length === 0) {
        return res.json({});
      }
      
      // OPTIMIZED: Parallel fetch all confirmation counts using Promise.all
      const countsPromises = eventIds.map(async (eventId) => ({
        eventId,
        counts: await storage.getEventConfirmationCount(eventId),
      }));
      
      const countsResults = await Promise.all(countsPromises);
      
      const result: Record<number, { members: number; visitors: number }> = {};
      for (const { eventId, counts } of countsResults) {
        result[eventId] = counts;
      }
      
      res.json(result);
    } catch (error) {
      console.error("Get confirmation counts batch error:", error);
      res.status(500).json({ message: "Erro ao buscar contagens" });
    }
  });

  // Get instagram posts
  app.get("/api/site/instagram", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      const posts = await storage.getLatestInstagramPosts(limit);
      res.json(posts);
    } catch (error) {
      console.error("Get instagram posts error:", error);
      res.status(500).json({ message: "Erro ao buscar posts do Instagram" });
    }
  });

  // Get instagram post comments
  app.get("/api/site/instagram/:instagramId/comments", async (req, res) => {
    try {
      const { instagramId } = req.params;
      if (!instagramId) {
        return res.status(400).json({ message: "Instagram ID é obrigatório" });
      }
      const comments = await fetchInstagramComments(instagramId);
      res.json(comments);
    } catch (error) {
      console.error("Get instagram comments error:", error);
      res.status(500).json({ message: "Erro ao buscar comentários" });
    }
  });

  // Submit prayer request (public) - Rate limited to prevent spam
  app.post("/api/site/prayer-requests", prayerLimiter, async (req, res) => {
    try {
      const { name, whatsapp, category, request, isPrivate } = req.body;
      
      if (!name || !category || !request) {
        return res.status(400).json({ message: "Nome, categoria e pedido sao obrigatorios" });
      }
      
      if (name.trim().length < 2) {
        return res.status(400).json({ message: "Nome deve ter pelo menos 2 caracteres" });
      }
      
      const moderation = moderateContent(request);
      
      if (shouldAutoReject(moderation)) {
        return res.status(400).json({ 
          message: "Seu pedido contem conteudo inapropriado e nao pode ser enviado.",
          moderated: true 
        });
      }
      
      // Determinar status inicial - sempre "pending" exceto para privados
      let status: "pending" | "approved" | "rejected" | "archived" = isPrivate ? "archived" : "pending";
      const shouldAutoApprove = !isPrivate && !moderation.hasProfanity;
      
      // Apenas enviar dados de moderacao se houver problemas detectados
      const moderationData = moderation.hasProfanity ? {
        hasProfanity: moderation.hasProfanity,
        hasHateSpeech: moderation.hasHateSpeech,
        hasSexualContent: moderation.hasSexualContent,
        moderationDetails: moderation.details,
      } : undefined;
      
      const prayerRequest = await storage.createPrayerRequest({
        name: name.trim(),
        whatsapp,
        category,
        request: moderation.hasProfanity ? moderation.cleanedText : request,
        status,
      }, moderationData);
      
      // Se conteudo limpo e nao privado, aprovar automaticamente
      if (shouldAutoApprove) {
        await storage.autoApprovePrayerRequest(prayerRequest.id);
      } else if (!isPrivate) {
        notifyNewPrayerRequest(prayerRequest.id, name.trim(), category, request).catch(err => 
          console.error("[Notifications] Error notifying new prayer request:", err)
        );
      }
      
      const message = moderation.hasProfanity 
        ? "Pedido enviado e sera analisado antes de ser publicado."
        : "Pedido de oracao publicado com sucesso!";
      
      res.status(201).json({ message, id: prayerRequest.id, autoApproved: shouldAutoApprove });
    } catch (error) {
      console.error("Create prayer request error:", error);
      res.status(500).json({ message: "Erro ao enviar pedido de oracao" });
    }
  });

  // Get approved prayer requests for the public prayer wall (Mural da Oracao)
  app.get("/api/site/prayer-requests/approved", async (req, res) => {
    try {
      const requests = await storage.getApprovedPrayerRequests();
      const publicRequests = requests.map(r => ({
        id: r.id,
        name: r.name,
        request: r.request,
        category: r.category,
        inPrayerCount: r.inPrayerCount,
        createdAt: r.createdAt,
      }));
      res.json(publicRequests);
    } catch (error) {
      console.error("Get approved prayer requests error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos aprovados" });
    }
  });

  // Check if session is praying for a specific request
  app.get("/api/site/prayer-requests/:id/is-praying", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sessionId = req.query.sessionId as string;
      
      if (isNaN(id) || !sessionId) {
        return res.status(400).json({ message: "ID e sessionId sao obrigatorios" });
      }
      
      const isPraying = await storage.checkIfPraying(id, sessionId);
      res.json({ isPraying });
    } catch (error) {
      console.error("Check praying error:", error);
      res.status(500).json({ message: "Erro ao verificar status" });
    }
  });

  // Get praying status for multiple prayer requests
  app.get("/api/site/prayer-requests/praying-status", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      const ids = req.query.ids as string;
      
      if (!sessionId || !ids) {
        return res.status(400).json({ message: "sessionId e ids sao obrigatorios" });
      }
      
      const prayerRequestIds = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
      if (prayerRequestIds.length === 0) {
        return res.json({ prayingIds: [] });
      }
      
      const prayingSet = await storage.getPrayingSessionsForRequests(prayerRequestIds, sessionId);
      res.json({ prayingIds: Array.from(prayingSet) });
    } catch (error) {
      console.error("Get praying status error:", error);
      res.status(500).json({ message: "Erro ao verificar status" });
    }
  });

  // Toggle prayer status (public) - Someone is praying for this request
  app.post("/api/site/prayer-requests/:id/pray", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { sessionId } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      if (!sessionId) {
        return res.status(400).json({ message: "sessionId e obrigatorio" });
      }
      
      const result = await storage.togglePraying(id, sessionId);
      
      if (!result) {
        return res.status(404).json({ message: "Pedido nao encontrado ou nao aprovado" });
      }
      
      res.json({ success: true, isPraying: result.isPraying, inPrayerCount: result.inPrayerCount });
    } catch (error) {
      console.error("Toggle prayer error:", error);
      res.status(500).json({ message: "Erro ao registrar oracao" });
    }
  });

  // Get board members (public)
  app.get("/api/site/board-members", async (req, res) => {
    try {
      const currentOnly = req.query.current !== "false";
      const members = await storage.getAllBoardMembers(currentOnly);
      res.json(convertImageUrlsArray(members));
    } catch (error) {
      console.error("Get board members error:", error);
      res.status(500).json({ message: "Erro ao buscar membros da diretoria" });
    }
  });

  // Get active banners (public)
  app.get("/api/site/banners", async (req, res) => {
    try {
      const banners = await storage.getActiveBanners();
      res.json(convertImageUrlsArray(banners));
    } catch (error) {
      console.error("Get banners error:", error);
      res.status(500).json({ message: "Erro ao buscar banners" });
    }
  });

  // ==================== PUBLIC DAILY VERSE API ====================
  
  // Get active daily verse post (public)
  app.get("/api/site/daily-verse", async (req, res) => {
    try {
      const post = await storage.getActiveDailyVersePost();
      if (!post) {
        return res.status(404).json({ message: "Nenhum versículo do dia ativo" });
      }
      
      // Get the stock image if available (use proxy for CORS support)
      let stockImage = null;
      if (post.stockImageId) {
        stockImage = await storage.getDailyVerseStockById(post.stockImageId);
      }
      
      res.json({
        ...convertDailyVerseImageUrls(post),
        stockImage: stockImage ? convertDailyVerseImageUrls(stockImage) : null,
      });
    } catch (error) {
      console.error("Get daily verse error:", error);
      res.status(500).json({ message: "Erro ao buscar versículo do dia" });
    }
  });
  
  // Get daily verse by date (public)
  app.get("/api/site/daily-verse/:date", async (req, res) => {
    try {
      const date = new Date(req.params.date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Data inválida" });
      }
      
      const post = await storage.getDailyVersePostByDate(date);
      if (!post) {
        return res.status(404).json({ message: "Versículo não encontrado para esta data" });
      }
      
      let stockImage = null;
      if (post.stockImageId) {
        stockImage = await storage.getDailyVerseStockById(post.stockImageId);
      }
      
      res.json({
        ...convertDailyVerseImageUrls(post),
        stockImage: stockImage ? convertDailyVerseImageUrls(stockImage) : null,
      });
    } catch (error) {
      console.error("Get daily verse by date error:", error);
      res.status(500).json({ message: "Erro ao buscar versículo" });
    }
  });
  
  // Get daily verse history/calendar (public)
  app.get("/api/site/daily-verses", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const posts = await storage.getDailyVersePosts(limit, offset);
      
      // Get stock images for all posts (use proxy for CORS support)
      const postsWithImages = await Promise.all(posts.map(async (post) => {
        let stockImage = null;
        if (post.stockImageId) {
          stockImage = await storage.getDailyVerseStockById(post.stockImageId);
        }
        return {
          ...convertDailyVerseImageUrls(post),
          stockImage: stockImage ? convertDailyVerseImageUrls(stockImage) : null,
        };
      }));
      
      res.json(postsWithImages);
    } catch (error) {
      console.error("Get daily verses history error:", error);
      res.status(500).json({ message: "Erro ao buscar histórico" });
    }
  });

  // Get member for birthday page (public - for Puppeteer capture)
  app.get("/api/site/birthday-member/:id", async (req, res) => {
    try {
      const memberId = parseInt(req.params.id);
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const member = await storage.getUserById(memberId);
      if (!member) {
        return res.status(404).json({ message: "Membro não encontrado" });
      }
      
      const firstName = member.fullName.split(' ')[0];
      const convertedMember = convertImageUrls(member);
      
      res.json({
        id: member.id,
        fullName: member.fullName,
        firstName,
        photoUrl: convertedMember.photoUrl || null,
      });
    } catch (error) {
      console.error("Get birthday member error:", error);
      res.status(500).json({ message: "Erro ao buscar membro" });
    }
  });

  // ==================== ADMIN SITE MANAGEMENT API ====================

  // Force generate daily verse (admin only - for testing)
  app.post("/api/admin/daily-verse/force-generate", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { forceDailyVerseGeneration } = await import('./scheduler');
      const result = await forceDailyVerseGeneration();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Force daily verse generation error:", error);
      res.status(500).json({ success: false, message: "Erro ao gerar versículo" });
    }
  });

  // Populate daily verse stock images (admin only) - idempotent, uploads to R2
  app.post("/api/admin/daily-verse/populate-stock", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      // Check if already populated
      const existingStock = await storage.getAllDailyVerseStock();
      if (existingStock.length >= 60) {
        return res.json({ 
          success: true, 
          message: `Já existem ${existingStock.length} imagens stock cadastradas. Nenhuma adicionada.`,
          existing: existingStock.length
        });
      }

      // Check if R2 is configured
      const { isR2Configured, uploadToR2 } = await import('./r2-storage');
      if (!isR2Configured()) {
        return res.status(400).json({ 
          success: false, 
          message: "R2 não está configurado. Configure as variáveis R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET_NAME." 
        });
      }

      // 60 high-quality Unsplash images for daily verses
      const unsplashImages = [
        // Nature (20)
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&q=90",
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=90",
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&q=90",
        "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1200&q=90",
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=90",
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=90",
        "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&q=90",
        "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=90",
        "https://images.unsplash.com/photo-1518173946687-a4c036bc8bf1?w=1200&q=90",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=90",
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&q=90",
        "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=1200&q=90",
        "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1200&q=90",
        "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1200&q=90",
        "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1200&q=90",
        "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1200&q=90",
        "https://images.unsplash.com/photo-1497449493050-aad1e7cad165?w=1200&q=90",
        "https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=1200&q=90",
        "https://images.unsplash.com/photo-1510797215324-95aa89f43c33?w=1200&q=90",
        "https://images.unsplash.com/photo-1552083375-1447ce886485?w=1200&q=90",
        // Mountains (15)
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=90",
        "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200&q=90",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=90",
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=90",
        "https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&q=90",
        "https://images.unsplash.com/photo-1434394354979-a235cd36269d?w=1200&q=90",
        "https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=90",
        "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=1200&q=90",
        "https://images.unsplash.com/photo-1454982523318-4b6f2d0c0b78?w=1200&q=90",
        "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1200&q=90",
        "https://images.unsplash.com/photo-1464278533981-50106e6176b1?w=1200&q=90",
        "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1200&q=90",
        "https://images.unsplash.com/photo-1445363692815-ebcd599f7621?w=1200&q=90",
        "https://images.unsplash.com/photo-1464852045489-bccb7d17fe39?w=1200&q=90",
        "https://images.unsplash.com/photo-1464817739973-0128fe77aaa1?w=1200&q=90",
        // Sky/Sunrise/Sunset (15)
        "https://images.unsplash.com/photo-1489549132488-d00b7eee80f1?w=1200&q=90",
        "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1200&q=90",
        "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=90",
        "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=1200&q=90",
        "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1200&q=90",
        "https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=1200&q=90",
        "https://images.unsplash.com/photo-1503803548695-c2a7b4a5b875?w=1200&q=90",
        "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?w=1200&q=90",
        "https://images.unsplash.com/photo-1517483000871-1dbf64a6e1c6?w=1200&q=90",
        "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1200&q=90",
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=90",
        "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&q=90",
        "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1200&q=90",
        "https://images.unsplash.com/photo-1532274402911-5a369e4c4bb5?w=1200&q=90",
        "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=90",
        // Contemplative/Spiritual (10)
        "https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=1200&q=90",
        "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200&q=90",
        "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1200&q=90",
        "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1200&q=90",
        "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1200&q=90",
        "https://images.unsplash.com/photo-1465189684280-6a8fa9b19a00?w=1200&q=90",
        "https://images.unsplash.com/photo-1516410529446-2c777cb7366d?w=1200&q=90",
        "https://images.unsplash.com/photo-1449057528837-7ca097b3520c?w=1200&q=90",
        "https://images.unsplash.com/photo-1531685250784-7569952593d2?w=1200&q=90",
        "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&q=90",
      ];

      const categories = [
        ...Array(20).fill("nature"),
        ...Array(15).fill("mountains"),
        ...Array(15).fill("sky"),
        ...Array(10).fill("contemplative"),
      ];

      let addedCount = 0;
      const startIndex = existingStock.length;

      console.log(`[Stock Images] Starting upload of ${unsplashImages.length - startIndex} images to R2...`);

      for (let i = startIndex; i < unsplashImages.length; i++) {
        try {
          const url = unsplashImages[i];
          const category = categories[i];
          
          // Fetch image from Unsplash
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`[Stock Images] Failed to fetch image ${i + 1}: ${response.status}`);
            continue;
          }
          
          const buffer = Buffer.from(await response.arrayBuffer());
          
          // Upload to R2
          const r2Url = await uploadToR2(buffer, 'verses', 'image/jpeg', `verse-stock-${i + 1}.jpg`);
          
          // Save to database
          await storage.createDailyVerseStock({
            imageUrl: r2Url,
            category,
            orderIndex: i + 1,
            isActive: true,
          });
          
          addedCount++;
          console.log(`[Stock Images] Uploaded ${addedCount}/${unsplashImages.length - startIndex} (${category})`);
        } catch (imgError) {
          console.error(`[Stock Images] Error processing image ${i + 1}:`, imgError);
        }
      }

      res.json({ 
        success: true, 
        message: `${addedCount} imagens stock adicionadas ao R2 com sucesso!`,
        total: existingStock.length + addedCount
      });
    } catch (error) {
      console.error("Populate stock error:", error);
      res.status(500).json({ success: false, message: "Erro ao popular imagens stock" });
    }
  });

  // Get all daily verse posts (admin only)
  app.get("/api/admin/daily-verses", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      // Allow admin to see inactive verses with ?includeInactive=true
      const includeInactive = req.query.includeInactive === 'true';
      const verses = await storage.getDailyVersePosts(100, 0, !includeInactive);
      // Use proxy URLs for CORS support
      res.json(verses.map(v => convertDailyVerseImageUrls(v)));
    } catch (error) {
      console.error("Get all daily verses error:", error);
      res.status(500).json({ message: "Erro ao buscar versículos" });
    }
  });
  
  // Permanently delete a daily verse post (admin only)
  app.delete("/api/admin/daily-verse/:id/permanent", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      await storage.deleteDailyVersePost(id);
      res.json({ success: true, message: "Versículo excluído permanentemente" });
    } catch (error) {
      console.error("Permanent delete daily verse error:", error);
      res.status(500).json({ message: "Erro ao excluir versículo" });
    }
  });

  // Delete a daily verse post (admin only)
  app.delete("/api/admin/daily-verse/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      await storage.updateDailyVersePost(id, { isActive: false });
      res.json({ success: true, message: "Versículo removido" });
    } catch (error) {
      console.error("Delete daily verse error:", error);
      res.status(500).json({ message: "Erro ao remover versículo" });
    }
  });

  // Get all prayer requests (admin or marketing)
  app.get("/api/admin/prayer-requests", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.getAllPrayerRequests(status);
      res.json(requests);
    } catch (error) {
      console.error("Get prayer requests error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos de oracao" });
    }
  });

  // Update prayer request status (admin or marketing)
  app.patch("/api/admin/prayer-requests/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(id) || !status) {
        return res.status(400).json({ message: "ID e status sao obrigatorios" });
      }
      
      const updated = await storage.updatePrayerRequestStatus(id, status, req.user!.id);
      if (!updated) {
        return res.status(404).json({ message: "Pedido nao encontrado" });
      }
      
      // Audit log
      await logAuditAction(req.user?.id, "update", "prayer_request", id, `Status alterado para: ${status}`, req);
      
      res.json(updated);
    } catch (error) {
      console.error("Update prayer request error:", error);
      res.status(500).json({ message: "Erro ao atualizar pedido de oracao" });
    }
  });

  // Get all board members (admin or marketing)
  app.get("/api/admin/board-members", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const members = await storage.getAllBoardMembers(false);
      res.json(members);
    } catch (error) {
      console.error("Get board members admin error:", error);
      res.status(500).json({ message: "Erro ao buscar membros da diretoria" });
    }
  });

  // Create board member (admin or marketing)
  app.post("/api/admin/board-members", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertBoardMemberSchema.parse(req.body);
      const member = await storage.createBoardMember(validatedData);
      
      // Audit log
      await logAuditAction(req.user?.id, "create", "board_member", member.id, `Criado: ${validatedData.name} - ${validatedData.position}`, req);
      
      res.status(201).json(member);
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Create board member error:", error);
      res.status(500).json({ message: "Erro ao criar membro da diretoria" });
    }
  });

  // Update board member (admin or marketing)
  app.patch("/api/admin/board-members/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Validate with dedicated update schema (strict mode rejects unknown fields)
      const validatedData = updateBoardMemberSchema.parse(req.body);
      
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo valido para atualizar" });
      }
      
      const updated = await storage.updateBoardMember(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "Membro nao encontrado" });
      }
      
      // Audit log
      await logAuditAction(req.user?.id, "update", "board_member", id, `Atualizado: ${updated.name}`, req);
      
      res.json(convertImageUrls(updated));
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Update board member error:", error);
      res.status(500).json({ message: "Erro ao atualizar membro da diretoria" });
    }
  });

  // Delete board member (admin or marketing)
  app.delete("/api/admin/board-members/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Audit log before deletion
      await logAuditAction(req.user?.id, "delete", "board_member", id, "Membro removido", req);
      
      await storage.deleteBoardMember(id);
      res.json({ message: "Membro removido com sucesso" });
    } catch (error) {
      console.error("Delete board member error:", error);
      res.status(500).json({ message: "Erro ao remover membro da diretoria" });
    }
  });

  // ==================== MARKETING ADMIN ROUTES ====================

  // Get marketing stats
  app.get("/api/marketing/stats", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getMarketingStats();
      res.json(stats);
    } catch (error) {
      console.error("Get marketing stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // Get users for board member selection (marketing can select from active members)
  app.get("/api/marketing/users", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      // Return only active members with basic info for selection
      const users = allUsers
        .filter(u => u.activeMember && u.isMember)
        .map(u => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          photoUrl: u.photoUrl ? getPublicUrl(u.photoUrl) : null,
        }));
      res.json(users);
    } catch (error) {
      console.error("Get users for marketing error:", error);
      res.status(500).json({ message: "Erro ao buscar usuarios" });
    }
  });

  // ==================== SITE CONTENT ROUTES ====================

  // Get all site content (admin/marketing)
  app.get("/api/marketing/site-content", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const content = await storage.getAllSiteContent();
      res.json(content);
    } catch (error) {
      console.error("Get site content error:", error);
      res.status(500).json({ message: "Erro ao buscar conteudo do site" });
    }
  });

  // Get site content by page and section (admin/marketing)
  app.get("/api/marketing/site-content/:page/:section", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const { page, section } = req.params;
      const content = await storage.getSiteContent(page, section);
      res.json(content);
    } catch (error) {
      console.error("Get site content error:", error);
      res.status(500).json({ message: "Erro ao buscar conteudo do site" });
    }
  });

  // Upsert site content (admin/marketing)
  app.put("/api/marketing/site-content", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const { page, section, title, content, imageUrl, metadata } = req.body;
      if (!page || !section) {
        return res.status(400).json({ message: "Pagina e secao sao obrigatorios" });
      }
      const saved = await storage.upsertSiteContent({
        page,
        section,
        title,
        content,
        imageUrl,
        metadata,
        updatedBy: req.user!.id,
      });
      
      await logAuditAction(req.user?.id, "update", "site_content", saved.id, `${page}/${section}`, req);
      
      res.json(saved);
    } catch (error) {
      console.error("Upsert site content error:", error);
      res.status(500).json({ message: "Erro ao salvar conteudo do site" });
    }
  });

  // Public: Get site content for a page
  app.get("/api/site-content/:page", async (req, res) => {
    try {
      const { page } = req.params;
      const allContent = await storage.getAllSiteContent();
      const pageContent = allContent.filter(c => c.page === page);
      
      // Convert to object keyed by section
      const contentMap: Record<string, any> = {};
      for (const item of pageContent) {
        contentMap[item.section] = {
          title: item.title,
          content: item.content,
          imageUrl: item.imageUrl ? getPublicUrl(item.imageUrl) : null,
          metadata: item.metadata ? JSON.parse(item.metadata) : null,
        };
      }
      
      res.json(contentMap);
    } catch (error) {
      console.error("Get public site content error:", error);
      res.status(500).json({ message: "Erro ao buscar conteudo" });
    }
  });

  // Get all events (admin or marketing)
  app.get("/api/admin/events", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const events = await storage.getAllSiteEvents();
      res.json(convertImageUrlsArray(events));
    } catch (error) {
      console.error("Get events admin error:", error);
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  // Get single event (admin or marketing)
  app.get("/api/admin/events/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const event = await storage.getSiteEventById(id);
      if (!event) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      res.json(convertImageUrls(event));
    } catch (error) {
      console.error("Get event error:", error);
      res.status(500).json({ message: "Erro ao buscar evento" });
    }
  });

  // Create event (admin or marketing)
  app.post("/api/admin/events", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const event = await storage.createSiteEvent({ ...req.body, createdBy: req.user!.id });
      
      // If event has a price and valid date, create event_fee entry automatically
      if (req.body.price && (req.body.startDate || req.body.endDate)) {
        const priceCentavos = parseBrazilianPrice(req.body.price);
        if (priceCentavos !== null && priceCentavos > 0) {
          // Calculate deadline: use endDate if exists, otherwise startDate at 23:59:59
          const dateForDeadline = req.body.endDate || req.body.startDate;
          const deadlineDate = new Date(dateForDeadline + 'T23:59:59');
          
          // Only create fee if deadline is valid
          if (!isNaN(deadlineDate.getTime())) {
            try {
              await storage.createEventFee({
                eventId: event.id,
                feeAmount: priceCentavos,
                deadline: deadlineDate,
              });
              console.log(`[Events] Event fee created for event ${event.id}: R$ ${(priceCentavos / 100).toFixed(2)}`);
            } catch (feeError) {
              console.error("[Events] Error creating event fee:", feeError);
            }
          }
        }
      }
      
      // Audit log
      await logAuditAction(req.user?.id, "create", "event", event.id, `Criado: ${req.body.title}`, req);
      
      if (req.body.isPublished !== false) {
        notifyNewEvent(event.id, event.title, event.startDate, event.location, event.imageUrl).catch(err => 
          console.error("[Notifications] Error notifying new event:", err)
        );
      }
      
      res.status(201).json(convertImageUrls(event));
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Erro ao criar evento" });
    }
  });

  // Update event (admin or marketing)
  app.patch("/api/admin/events/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Validate with dedicated update schema (strict mode rejects unknown fields)
      const validatedData = updateSiteEventSchema.parse(req.body);
      
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo valido para atualizar" });
      }
      
      // Check if event is being published (was not published, now is)
      const existingEvent = await storage.getSiteEventById(id);
      const wasPublished = existingEvent?.isPublished;
      
      const updated = await storage.updateSiteEvent(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      
      // Handle event fee sync when price is updated
      if ('price' in validatedData) {
        const priceCentavos = parseBrazilianPrice(validatedData.price || null);
        const existingFee = await storage.getEventFee(id);
        
        if (priceCentavos !== null && priceCentavos > 0) {
          // Calculate deadline from updated or existing dates (only if date exists)
          const dateForDeadline = updated.endDate || updated.startDate;
          if (dateForDeadline) {
            const deadlineDate = new Date(dateForDeadline + 'T23:59:59');
            
            // Only sync if deadline is valid
            if (!isNaN(deadlineDate.getTime())) {
              try {
                if (existingFee) {
                  await storage.updateEventFee(id, { feeAmount: priceCentavos, deadline: deadlineDate });
                  console.log(`[Events] Event fee updated for event ${id}: R$ ${(priceCentavos / 100).toFixed(2)}`);
                } else {
                  await storage.createEventFee({ eventId: id, feeAmount: priceCentavos, deadline: deadlineDate });
                  console.log(`[Events] Event fee created for event ${id}: R$ ${(priceCentavos / 100).toFixed(2)}`);
                }
              } catch (feeError) {
                console.error("[Events] Error syncing event fee:", feeError);
              }
            }
          }
        } else if (existingFee) {
          // Price removed, delete the fee
          try {
            await storage.deleteEventFee(id);
            console.log(`[Events] Event fee deleted for event ${id}`);
          } catch (feeError) {
            console.error("[Events] Error deleting event fee:", feeError);
          }
        }
      }
      
      // Send notification if event is being published for the first time
      if (!wasPublished && updated.isPublished) {
        notifyNewEvent(updated.id, updated.title, updated.startDate, updated.location, updated.imageUrl).catch(err => 
          console.error("[Notifications] Error notifying new event:", err)
        );
      }
      
      // Audit log
      await logAuditAction(req.user?.id, "update", "event", id, `Atualizado: ${updated.title}`, req);
      
      res.json(convertImageUrls(updated));
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Update event error:", error);
      res.status(500).json({ message: "Erro ao atualizar evento" });
    }
  });

  // Delete event (admin or marketing)
  app.delete("/api/admin/events/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Audit log before deletion
      await logAuditAction(req.user?.id, "delete", "event", id, "Evento removido", req);
      
      await storage.deleteSiteEvent(id);
      res.json({ message: "Evento removido com sucesso" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Erro ao remover evento" });
    }
  });

  // Export events to ICS calendar format (using ical-generator for better compatibility)
  app.get("/api/site/events/calendar.ics", async (req, res) => {
    try {
      const ical = await import("ical-generator");
      const events = await storage.getUpcomingEvents();
      
      const calendar = ical.default({
        name: "UMP Emaus - Eventos",
        prodId: { company: "UMP Emaus", product: "Calendario", language: "PT" },
        timezone: "America/Sao_Paulo",
      });
      
      events.forEach(event => {
        // Use T12:00:00 to avoid timezone issues (noon is safe from day boundaries)
        const startDate = new Date(event.startDate + 'T12:00:00');
        const endDate = event.endDate ? new Date(event.endDate + 'T12:00:00') : new Date(event.startDate + 'T12:00:00');
        
        if (event.time && !event.isAllDay) {
          const [hours, minutes] = event.time.split(":").map(Number);
          startDate.setHours(hours || 0, minutes || 0);
          endDate.setHours((hours || 0) + 2, minutes || 0);
        }
        
        calendar.createEvent({
          id: `event-${event.id}@umpemaus.com`,
          start: startDate,
          end: endDate,
          allDay: event.isAllDay || false,
          summary: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          url: event.registrationUrl || undefined,
          categories: [{ name: event.category }],
        });
      });
      
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="ump-emaus-eventos.ics"');
      res.send(calendar.toString());
    } catch (error) {
      console.error("Export calendar error:", error);
      res.status(500).json({ message: "Erro ao exportar calendario" });
    }
  });

  // Export single event to ICS
  app.get("/api/site/events/:id/calendar.ics", async (req, res) => {
    try {
      const ical = await import("ical-generator");
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const event = await storage.getSiteEventById(id);
      if (!event) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      
      const calendar = ical.default({
        name: event.title,
        prodId: { company: "UMP Emaus", product: "Evento", language: "PT" },
        timezone: "America/Sao_Paulo",
      });
      
      // Use T12:00:00 to avoid timezone issues (noon is safe from day boundaries)
      const startDate = new Date(event.startDate + 'T12:00:00');
      const endDate = event.endDate ? new Date(event.endDate + 'T12:00:00') : new Date(event.startDate + 'T12:00:00');
      
      if (event.time && !event.isAllDay) {
        const [hours, minutes] = event.time.split(":").map(Number);
        startDate.setHours(hours || 0, minutes || 0);
        endDate.setHours((hours || 0) + 2, minutes || 0);
      }
      
      calendar.createEvent({
        id: `event-${event.id}@umpemaus.com`,
        start: startDate,
        end: endDate,
        allDay: event.isAllDay || false,
        summary: event.title,
        description: event.description || undefined,
        location: event.location || undefined,
        url: event.registrationUrl || undefined,
        categories: [{ name: event.category }],
      });
      
      const filename = event.title.toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .substring(0, 30);
      
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.ics"`);
      res.send(calendar.toString());
    } catch (error) {
      console.error("Export single event calendar error:", error);
      res.status(500).json({ message: "Erro ao exportar evento" });
    }
  });

  // Generate Google Calendar add URL for event
  app.get("/api/site/events/:id/google-calendar-url", async (req, res) => {
    try {
      const { generateGoogleCalendarAddUrl } = await import("./utils/google-calendar");
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const event = await storage.getSiteEventById(id);
      if (!event) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      
      const googleCalendarUrl = generateGoogleCalendarAddUrl(event);
      res.json({ url: googleCalendarUrl });
    } catch (error) {
      console.error("Generate Google Calendar URL error:", error);
      res.status(500).json({ message: "Erro ao gerar URL do Google Calendar" });
    }
  });

  // Get Google Calendar subscribe URL for all events
  app.get("/api/site/events/google-calendar-subscribe", async (req, res) => {
    try {
      const { generateGoogleCalendarSubscribeUrl } = await import("./utils/google-calendar");
      
      // Use Replit's public domain instead of localhost
      const replitDomain = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
      let baseUrl: string;
      
      if (replitDomain) {
        // Use the first domain if multiple are provided (comma-separated)
        const domain = replitDomain.split(',')[0].trim();
        baseUrl = `https://${domain}`;
      } else {
        // Fallback for local development
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['host'] || 'localhost:5000';
        baseUrl = `${protocol}://${host}`;
      }
      
      const subscribeUrl = generateGoogleCalendarSubscribeUrl(baseUrl);
      res.json({ url: subscribeUrl });
    } catch (error) {
      console.error("Generate Google Calendar subscribe URL error:", error);
      res.status(500).json({ message: "Erro ao gerar URL de inscricao do Google Calendar" });
    }
  });

  // Sync events to Google Calendar (admin only)
  app.post("/api/admin/events/sync-google-calendar", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const { syncAllEventsToGoogleCalendar } = await import("./utils/google-calendar");
      const events = await storage.getUpcomingEvents();
      
      const result = await syncAllEventsToGoogleCalendar(events);
      
      if (result.success) {
        res.json({ 
          message: `${result.synced} evento(s) sincronizado(s) com sucesso!`,
          synced: result.synced,
          failed: result.failed
        });
      } else {
        res.status(207).json({
          message: `Sincronizacao parcial: ${result.synced} sucesso, ${result.failed} falha(s)`,
          synced: result.synced,
          failed: result.failed,
          errors: result.errors
        });
      }
    } catch (error) {
      console.error("Sync Google Calendar error:", error);
      res.status(500).json({ message: "Erro ao sincronizar com Google Calendar" });
    }
  });

  // Get all banners (admin or marketing)
  app.get("/api/admin/banners", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const banners = await storage.getAllBanners();
      res.json(banners);
    } catch (error) {
      console.error("Get banners admin error:", error);
      res.status(500).json({ message: "Erro ao buscar banners" });
    }
  });

  // Create banner (admin or marketing)
  app.post("/api/admin/banners", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertBannerSchema.omit({ createdBy: true }).parse(req.body);
      const banner = await storage.createBanner({ ...validatedData, createdBy: req.user!.id });
      
      // Audit log
      await logAuditAction(req.user?.id, "create", "banner", banner.id, `Criado: ${validatedData.title}`, req);
      
      res.status(201).json(banner);
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Create banner error:", error);
      res.status(500).json({ message: "Erro ao criar banner" });
    }
  });

  // Update banner (admin or marketing)
  app.patch("/api/admin/banners/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Validate with dedicated update schema (strict mode rejects unknown fields)
      const validatedData = updateBannerSchema.parse(req.body);
      
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo valido para atualizar" });
      }
      
      const updated = await storage.updateBanner(id, validatedData);
      if (!updated) {
        return res.status(404).json({ message: "Banner nao encontrado" });
      }
      
      // Audit log
      await logAuditAction(req.user?.id, "update", "banner", id, `Atualizado: ${updated.title}`, req);
      
      res.json(convertImageUrls(updated));
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Update banner error:", error);
      res.status(500).json({ message: "Erro ao atualizar banner" });
    }
  });

  // Delete banner (admin or marketing)
  app.delete("/api/admin/banners/:id", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Audit log before deletion
      await logAuditAction(req.user?.id, "delete", "banner", id, "Banner removido", req);
      
      await storage.deleteBanner(id);
      res.json({ message: "Banner removido com sucesso" });
    } catch (error) {
      console.error("Delete banner error:", error);
      res.status(500).json({ message: "Erro ao remover banner" });
    }
  });

  // ==================== INSTAGRAM ADMIN API ====================

  // Get Instagram status and posts (admin or marketing)
  app.get("/api/admin/instagram", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const posts = await storage.getInstagramPostsForAdmin();
      const configured = isInstagramConfigured();
      res.json({ 
        configured, 
        posts,
        message: configured ? null : "Instagram API nao configurada. Configure INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID."
      });
    } catch (error) {
      console.error("Get Instagram admin error:", error);
      res.status(500).json({ message: "Erro ao buscar dados do Instagram" });
    }
  });

  // Sync Instagram posts (admin or marketing)
  app.post("/api/admin/instagram/sync", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      if (!isInstagramConfigured()) {
        return res.status(400).json({ 
          message: "Instagram API nao configurada. Configure INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_USER_ID." 
        });
      }
      
      const result = await syncInstagramPosts();
      await logAuditAction(req.user?.id, "sync", "instagram", undefined, `Sincronizados ${result.synced} posts`, req);
      
      res.json({ 
        message: `Sincronizacao concluida: ${result.synced} posts sincronizados`,
        synced: result.synced,
        errors: result.errors
      });
    } catch (error) {
      console.error("Sync Instagram error:", error);
      res.status(500).json({ message: "Erro ao sincronizar Instagram" });
    }
  });

  // Set Instagram post as featured banner (admin or marketing)
  app.patch("/api/admin/instagram/:id/feature", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }

      const post = await storage.getInstagramPostById(id);
      if (!post) {
        return res.status(404).json({ message: "Post nao encontrado" });
      }

      const updated = await storage.setFeaturedInstagramPost(id);
      await logAuditAction(req.user?.id, "update", "instagram", id, `Post definido como destaque do banner`, req);

      res.json({ 
        message: "Post definido como destaque do banner com sucesso",
        post: updated
      });
    } catch (error) {
      console.error("Feature Instagram post error:", error);
      res.status(500).json({ message: "Erro ao definir post como destaque" });
    }
  });

  // Remove featured banner from Instagram post (admin or marketing)
  app.delete("/api/admin/instagram/:id/feature", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }

      await storage.removeFeaturedInstagramPost(id);

      await logAuditAction(req.user?.id, "update", "instagram", id, `Post removido do destaque do banner`, req);

      res.json({ message: "Post removido do destaque" });
    } catch (error) {
      console.error("Remove featured Instagram post error:", error);
      res.status(500).json({ message: "Erro ao remover destaque" });
    }
  });

  // ==================== BIRTHDAY ART API ====================

  // Get members with birthdays today or upcoming (for birthday art generation)
  app.get("/api/admin/birthdays", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const today = new Date();
      const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
      const todayDay = String(today.getDate()).padStart(2, '0');
      const todayMonthDay = `${todayMonth}-${todayDay}`;
      
      // Get all active members with birthdate
      const allUsers = await storage.getAllUsers();
      const activeMembers = allUsers.filter(u => u.activeMember && u.birthdate);
      
      // Filter for today's birthdays and upcoming (next 7 days)
      const birthdayMembers = activeMembers.map(user => {
        if (!user.birthdate) return null;
        // birthdate format: YYYY-MM-DD or DD/MM/YYYY
        let monthDay: string;
        if (user.birthdate.includes('-')) {
          const parts = user.birthdate.split('-');
          monthDay = `${parts[1]}-${parts[2]}`;
        } else if (user.birthdate.includes('/')) {
          const parts = user.birthdate.split('/');
          monthDay = `${parts[1]}-${parts[0]}`;
        } else {
          return null;
        }
        
        const isToday = monthDay === todayMonthDay;
        
        // Calculate days until birthday (for sorting upcoming)
        const currentYear = today.getFullYear();
        const birthdayThisYear = new Date(`${currentYear}-${monthDay}T00:00:00`);
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        
        let daysUntil = Math.ceil((birthdayThisYear.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          birthdayThisYear.setFullYear(currentYear + 1);
          daysUntil = Math.ceil((birthdayThisYear.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        return {
          id: user.id,
          fullName: user.fullName,
          firstName: user.fullName.split(' ')[0],
          photoUrl: user.photoUrl,
          birthdate: user.birthdate,
          isToday,
          daysUntil
        };
      }).filter(Boolean);
      
      // Sort: today's first, then by days until
      birthdayMembers.sort((a, b) => {
        if (a!.isToday && !b!.isToday) return -1;
        if (!a!.isToday && b!.isToday) return 1;
        return a!.daysUntil - b!.daysUntil;
      });
      
      // Return only next 30 days
      const upcomingBirthdays = birthdayMembers.filter(m => m && m.daysUntil <= 30);
      
      // Convert R2 URLs to proxy URLs for CORS support (crossOrigin="anonymous" requires CORS headers)
      const convertBirthdayPhotos = (members: any[]) => {
        return members.map(m => ({
          ...m,
          photoUrl: m.photoUrl ? getProxyUrl(m.photoUrl) : null
        }));
      };
      
      const todayBirthdays = convertBirthdayPhotos(upcomingBirthdays.filter(m => m && m.isToday) as any[]);
      const upcomingList = convertBirthdayPhotos(upcomingBirthdays.filter(m => m && !m.isToday) as any[]);
      
      res.json({
        today: todayBirthdays,
        upcoming: upcomingList
      });
    } catch (error) {
      console.error("Get birthdays error:", error);
      res.status(500).json({ message: "Erro ao buscar aniversariantes" });
    }
  });

  // ==================== INSTAGRAM STORIES API ====================

  // Test Instagram Story configuration
  app.get("/api/admin/instagram/test-config", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const result = await testInstagramStoryConfig();
      res.json(result);
    } catch (error) {
      console.error("Instagram config test error:", error);
      res.status(500).json({ message: "Erro ao testar configuração do Instagram" });
    }
  });

  // Publish verse story to Instagram (uses saved image or generates via Puppeteer)
  app.post("/api/admin/instagram/publish-verse-story", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      if (!isInstagramPublishingConfigured()) {
        return res.status(400).json({ message: "Instagram não está configurado para publicação" });
      }
      
      const dailyVerse = await storage.getActiveDailyVersePost();
      if (!dailyVerse) {
        return res.status(404).json({ message: "Nenhum versículo do dia encontrado" });
      }
      
      let imageUrl = dailyVerse.verseShareImageUrl;
      
      // If no saved image, generate on-demand using Puppeteer (SAME as frontend WhatsApp button)
      if (!imageUrl) {
        console.log(`[Instagram Stories] No saved verse image, generating via Puppeteer...`);
        
        const verseImageBuffer = await generateVerseShareImage();
        
        const verseFilename = `verse-story-${dailyVerse.id}-${Date.now()}.jpg`;
        imageUrl = await uploadStoryImageToR2(verseImageBuffer, verseFilename);
        
        if (!imageUrl) {
          return res.status(500).json({ message: "Falha ao gerar imagem do versículo" });
        }
      }
      
      console.log(`[Instagram Stories] Publishing verse story...`);
      
      const result = await publishInstagramStory(imageUrl);
      
      if (result.success) {
        // Clear the image URL after successful publish
        await storage.updateDailyVersePost(dailyVerse.id, { verseShareImageUrl: null });
        
        res.json({ 
          success: true, 
          message: `Story do versículo publicado!`, 
          mediaId: result.mediaId
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.error || "Falha ao publicar story" 
        });
      }
    } catch (error: any) {
      console.error("Instagram verse story publish error:", error);
      res.status(500).json({ message: error.message || "Erro ao publicar story do versículo" });
    }
  });

  // Publish reflection story to Instagram (uses saved image or generates via Puppeteer)
  app.post("/api/admin/instagram/publish-reflection-story", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      if (!isInstagramPublishingConfigured()) {
        return res.status(400).json({ message: "Instagram não está configurado para publicação" });
      }
      
      const dailyVerse = await storage.getActiveDailyVersePost();
      if (!dailyVerse) {
        return res.status(404).json({ message: "Nenhuma reflexão do dia encontrada" });
      }
      
      if (!dailyVerse.reflection || !dailyVerse.reflectionTitle) {
        return res.status(400).json({ message: "Este versículo não possui reflexão" });
      }
      
      let imageUrl = dailyVerse.reflectionShareImageUrl;
      
      // If no saved image, generate on-demand using Puppeteer (SAME as frontend WhatsApp button)
      if (!imageUrl) {
        console.log(`[Instagram Stories] No saved reflection image, generating via Puppeteer...`);
        
        const reflectionImageBuffer = await generateReflectionShareImage();
        
        const reflectionFilename = `reflection-story-${dailyVerse.id}-${Date.now()}.jpg`;
        imageUrl = await uploadStoryImageToR2(reflectionImageBuffer, reflectionFilename);
        
        if (!imageUrl) {
          return res.status(500).json({ message: "Falha ao gerar imagem da reflexão" });
        }
      }
      
      console.log(`[Instagram Stories] Publishing reflection story...`);
      
      const result = await publishInstagramStory(imageUrl);
      
      if (result.success) {
        // Clear the image URL after successful publish
        await storage.updateDailyVersePost(dailyVerse.id, { reflectionShareImageUrl: null });
        
        res.json({ 
          success: true, 
          message: `Story da reflexão publicado!`, 
          mediaId: result.mediaId
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.error || "Falha ao publicar story" 
        });
      }
    } catch (error: any) {
      console.error("Instagram reflection story publish error:", error);
      res.status(500).json({ message: error.message || "Erro ao publicar story da reflexão" });
    }
  });

  // Publish birthday story to Instagram (uses saved image or generates via Puppeteer)
  app.post("/api/admin/instagram/publish-birthday-story", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const { memberId } = req.body;
      
      if (!isInstagramPublishingConfigured()) {
        return res.status(400).json({ message: "Instagram não está configurado para publicação" });
      }
      
      if (!memberId) {
        return res.status(400).json({ message: "ID do membro é obrigatório" });
      }
      
      const member = await storage.getUserById(memberId);
      if (!member) {
        return res.status(404).json({ message: "Membro não encontrado" });
      }
      
      const firstName = member.fullName.split(' ')[0];
      const todayFullDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Try to use pre-generated image (saved at 08:01)
      let savedImage = await storage.getBirthdayShareImage(memberId, todayFullDate);
      let imageUrl: string | null = savedImage?.imageUrl || null;
      
      // If no saved image, generate on-demand using Puppeteer (SAME as frontend WhatsApp button)
      if (!imageUrl) {
        console.log(`[Instagram Stories] No saved birthday image for ${firstName}, generating via Puppeteer...`);
        
        const birthdayImageBuffer = await generateBirthdayShareImage(memberId);
        
        const birthdayFilename = `birthday-story-${memberId}-${Date.now()}.jpg`;
        imageUrl = await uploadStoryImageToR2(birthdayImageBuffer, birthdayFilename);
        
        if (!imageUrl) {
          return res.status(500).json({ message: "Falha ao gerar imagem de aniversário" });
        }
      }
      
      console.log(`[Instagram Stories] Publishing birthday story for ${firstName}...`);
      
      const result = await publishInstagramStory(imageUrl);
      
      if (result.success) {
        // Delete the saved image from database after successful publish
        if (savedImage) {
          await storage.deleteBirthdayShareImage(savedImage.id);
        }
        
        res.json({ 
          success: true, 
          message: `Story de aniversário para ${firstName} publicado!`, 
          mediaId: result.mediaId
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.error || "Falha ao publicar story" 
        });
      }
    } catch (error: any) {
      console.error("Instagram birthday story publish error:", error);
      res.status(500).json({ message: error.message || "Erro ao publicar story de aniversário" });
    }
  });

  // Test publish Instagram Story with a public image URL
  app.post("/api/admin/instagram/test-story", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { imageUrl } = req.body;
      
      if (!imageUrl) {
        return res.status(400).json({ message: "imageUrl é obrigatório" });
      }
      
      if (!isInstagramPublishingConfigured()) {
        return res.status(400).json({ message: "Instagram não está configurado para publicação" });
      }
      
      console.log(`[Instagram Stories] Testing story publish with image: ${imageUrl}`);
      
      const result = await publishInstagramStory(imageUrl);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: "Story publicado com sucesso!", 
          mediaId: result.mediaId 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.error || "Falha ao publicar story" 
        });
      }
    } catch (error) {
      console.error("Instagram story test error:", error);
      res.status(500).json({ message: "Erro ao publicar story de teste" });
    }
  });

  // ==================== AUDIT LOGS API ====================

  // Get audit logs (admin only)
  app.get("/api/admin/audit-logs", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const resource = req.query.resource as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const logs = await storage.getAuditLogs({ userId, resource, limit });
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ message: "Erro ao buscar logs de auditoria" });
    }
  });

  // Get site content (admin or marketing)
  app.get("/api/admin/site-content", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const content = await storage.getAllSiteContent();
      res.json(content);
    } catch (error) {
      console.error("Get site content error:", error);
      res.status(500).json({ message: "Erro ao buscar conteudo do site" });
    }
  });

  // Update site content (admin or marketing)
  app.post("/api/admin/site-content", authenticateToken, requireAdminOrMarketing, async (req: AuthRequest, res) => {
    try {
      const content = await storage.upsertSiteContent({ ...req.body, updatedBy: req.user!.id });
      res.json(content);
    } catch (error) {
      console.error("Update site content error:", error);
      res.status(500).json({ message: "Erro ao atualizar conteudo do site" });
    }
  });

  // ==================== TEMPORADAS (SEASONS) ====================

  // Função auxiliar para obter a chave da semana atual (domingo a sábado, timezone São Paulo)
  // A semana começa no domingo (dia 1) e termina no sábado (dia 7) às 23:59
  function getCurrentWeekKey(): string {
    // Get current date in São Paulo timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const brazilDateStr = formatter.format(new Date());
    const [year, month, day] = brazilDateStr.split('-').map(Number);
    
    // Create date object for Brazil's current date
    const brazilDate = new Date(year, month - 1, day);
    
    // Get the Sunday of the current week (week starts on Sunday)
    const dayOfWeek = brazilDate.getDay(); // 0 = Sunday, 6 = Saturday
    const sundayOfWeek = new Date(brazilDate);
    sundayOfWeek.setDate(brazilDate.getDate() - dayOfWeek);
    
    // Calculate week number based on the Sunday's date
    const startOfYear = new Date(sundayOfWeek.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((sundayOfWeek.getTime() - startOfYear.getTime()) / 86400000);
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
    
    return `${sundayOfWeek.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  }

  // Obter lição atual em progresso do usuário (para "Continue estudando")
  // OPTIMIZED: Single method with minimal SQL queries instead of loading all lessons
  app.get("/api/study/current-lesson", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const result = await storage.getCurrentLessonOptimized(req.user!.id);
      res.json(result);
    } catch (error) {
      console.error("Get current lesson error:", error);
      res.status(500).json({ message: "Erro ao buscar lição atual" });
    }
  });

  // Listar temporadas publicadas (usuário autenticado) com progresso
  // OPTIMIZED: Batch fetch all season progress in single query instead of N+1
  app.get("/api/study/seasons", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const seasons = await storage.getPublishedSeasons();
      
      // Batch fetch all progress in one query
      const seasonIds = seasons.map(s => s.id);
      const progressMap = await storage.getUserSeasonProgressBatch(req.user!.id, seasonIds);
      
      const seasonsWithProgress = seasons.map((season) => {
        const progress = progressMap.get(season.id) || null;
        const lessonsCompleted = progress?.lessonsCompleted || 0;
        const totalLessons = season.totalLessons || 0;
        const isCompleted = totalLessons > 0 && lessonsCompleted >= totalLessons;
        
        return convertImageUrls({
          ...season,
          progress: progress ? {
            lessonsCompleted: progress.lessonsCompleted,
            totalLessons: progress.totalLessons,
            xpEarned: progress.xpEarned,
            isMastered: progress.isMastered || isCompleted,
            completedAt: progress.completedAt
          } : null
        });
      });
      
      res.json(seasonsWithProgress);
    } catch (error) {
      console.error("Get seasons error:", error);
      res.status(500).json({ message: "Erro ao buscar temporadas" });
    }
  });

  // Obter temporada com lições - OPTIMIZED: parallel data fetching
  app.get("/api/study/seasons/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Fetch all data in parallel for faster response
      const [season, lessons, userProgress, finalChallenge] = await Promise.all([
        storage.getSeasonById(seasonId),
        storage.getLessonsWithProgressForSeason(req.user!.id, seasonId),
        storage.getUserSeasonProgress(req.user!.id, seasonId),
        storage.getSeasonFinalChallenge(seasonId)
      ]);
      
      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }
      
      const lessonsCompleted = userProgress?.lessonsCompleted || 0;
      const totalLessons = season.totalLessons || 0;
      const isCompleted = totalLessons > 0 && lessonsCompleted >= totalLessons;

      res.json({
        ...season,
        lessons,
        userProgress,
        progress: userProgress ? {
          lessonsCompleted: userProgress.lessonsCompleted,
          totalLessons: userProgress.totalLessons,
          xpEarned: userProgress.xpEarned,
          isMastered: userProgress.isMastered || isCompleted,
          completedAt: userProgress.completedAt
        } : null,
        finalChallenge: finalChallenge ? { 
          id: finalChallenge.id,
          title: finalChallenge.title,
          description: finalChallenge.description,
          timeLimitSeconds: finalChallenge.timeLimitSeconds,
          questionCount: finalChallenge.questionCount,
          isActive: finalChallenge.isActive
        } : null
      });
    } catch (error) {
      console.error("Get season error:", error);
      res.status(500).json({ message: "Erro ao buscar temporada" });
    }
  });

  // OPTIMIZED: Obter desafio final da temporada - parallel queries
  app.get("/api/study/seasons/:id/final-challenge", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      // Parallel fetch: season, progress, and challenge
      const [season, progress, challenge] = await Promise.all([
        storage.getSeasonById(seasonId),
        storage.getUserSeasonProgress(req.user!.id, seasonId),
        storage.getSeasonFinalChallenge(seasonId)
      ]);

      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }

      const lessonsCompleted = progress?.lessonsCompleted || 0;
      if (lessonsCompleted < season.totalLessons) {
        return res.status(403).json({ message: "Complete todas as lições antes de acessar o desafio final" });
      }

      if (!challenge || !challenge.isActive) {
        return res.status(404).json({ message: "Desafio final não disponível" });
      }

      const questions = JSON.parse(challenge.questions);
      res.json({
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        timeLimitSeconds: challenge.timeLimitSeconds,
        questionCount: challenge.questionCount,
        questions: questions.map((q: any, index: number) => ({
          id: index + 1,
          question: q.question,
          options: q.options
        }))
      });
    } catch (error) {
      console.error("Get final challenge error:", error);
      res.status(500).json({ message: "Erro ao buscar desafio final" });
    }
  });

  // Submeter respostas do desafio final
  app.post("/api/study/seasons/:id/final-challenge/submit", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const { answers, token } = req.body;
      if (!Array.isArray(answers)) {
        return res.status(400).json({ message: "Respostas inválidas" });
      }

      const challenge = await storage.getSeasonFinalChallenge(seasonId);
      if (!challenge) {
        return res.status(404).json({ message: "Desafio não encontrado" });
      }

      const result = await storage.submitFinalChallenge(req.user!.id, challenge.id, token || "", answers);
      res.json(result);
    } catch (error) {
      console.error("Submit final challenge error:", error);
      res.status(500).json({ message: "Erro ao submeter desafio" });
    }
  });

  // Iniciar desafio final (obter token)
  app.post("/api/study/seasons/:id/final-challenge/start", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const challenge = await storage.getSeasonFinalChallenge(seasonId);
      if (!challenge) {
        return res.status(404).json({ message: "Desafio não encontrado" });
      }

      const result = await storage.startFinalChallenge(req.user!.id, challenge.id);
      res.json(result);
    } catch (error) {
      console.error("Start final challenge error:", error);
      res.status(500).json({ message: "Erro ao iniciar desafio" });
    }
  });

  // Obter ranking da temporada
  app.get("/api/study/seasons/:id/ranking", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const ranking = await storage.getSeasonRankings(seasonId, limit);
      res.json(ranking);
    } catch (error) {
      console.error("Get season ranking error:", error);
      res.status(500).json({ message: "Erro ao buscar ranking" });
    }
  });

  // Obter progresso da meta semanal
  app.get("/api/study/weekly-goal", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const weekKey = getCurrentWeekKey();
      const weeklyGoal = await storage.getWeeklyGoalStatus(req.user!.id, weekKey);
      res.json(weeklyGoal);
    } catch (error) {
      console.error("Get weekly goal error:", error);
      res.status(500).json({ message: "Erro ao buscar meta semanal" });
    }
  });

  // Incrementar progresso da meta semanal
  app.post("/api/study/weekly-goal/increment", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { type } = req.body;
      const weekKey = getCurrentWeekKey();
      
      switch (type) {
        case "lessons":
          await storage.incrementWeeklyLesson(req.user!.id, weekKey);
          break;
        case "verses":
          await storage.incrementWeeklyVerse(req.user!.id, weekKey);
          break;
        case "missions":
          await storage.incrementWeeklyMission(req.user!.id, weekKey);
          break;
        case "devotionals":
          await storage.incrementWeeklyDevotional(req.user!.id, weekKey);
          break;
        default:
          return res.status(400).json({ message: "Tipo inválido" });
      }
      
      const weeklyGoal = await storage.getWeeklyGoalStatus(req.user!.id, weekKey);
      res.json(weeklyGoal);
    } catch (error) {
      console.error("Increment weekly goal error:", error);
      res.status(500).json({ message: "Erro ao atualizar meta" });
    }
  });

  // ==================== WEEKLY PRACTICE (PRATIQUE) ====================

  // Get practice status for a week
  app.get("/api/study/practice/:weekId/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      if (isNaN(weekId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const status = await storage.getWeeklyPracticeStatus(req.user!.id, weekId);
      res.json(status);
    } catch (error) {
      console.error("Get practice status error:", error);
      res.status(500).json({ message: "Erro ao buscar status do pratique" });
    }
  });

  // Start practice - get questions
  app.post("/api/study/practice/:weekId/start", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      if (isNaN(weekId)) {
        return res.status(400).json({ message: "ID invalido" });
      }

      const status = await storage.getWeeklyPracticeStatus(req.user!.id, weekId);
      if (!status.isUnlocked) {
        return res.status(403).json({ 
          message: "Complete todas as licoes da semana para desbloquear o Pratique",
          lessonsCompleted: status.lessonsCompleted,
          totalLessons: status.totalLessons
        });
      }

      // Block retry if already mastered (3 stars)
      if (status.isMastered) {
        return res.status(403).json({ 
          message: "Voce ja dominou esta semana! Parabens!"
        });
      }

      let questions = await storage.getPracticeQuestions(weekId);
      if (questions.length < 10) {
        questions = await storage.generatePracticeQuestionsFromAI(weekId);
      }

      // Shuffle questions array for retry attempts (randomize order)
      const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      };

      const shuffledQuestions = shuffleArray(questions);

      const parsedQuestions = shuffledQuestions.map((q, index) => ({
        id: q.id,
        type: q.type,
        content: typeof q.content === 'string' ? JSON.parse(q.content) : q.content,
        orderIndex: index,
      }));

      res.json({ 
        questions: parsedQuestions,
        timeLimit: 120,
        totalQuestions: 10
      });
    } catch (error) {
      console.error("Start practice error:", error);
      res.status(500).json({ message: "Erro ao iniciar pratique" });
    }
  });

  // Complete practice
  app.post("/api/study/practice/:weekId/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const weekId = parseInt(req.params.weekId);
      if (isNaN(weekId)) {
        return res.status(400).json({ message: "ID invalido" });
      }

      const { correctAnswers, timeSpentSeconds } = req.body;
      if (typeof correctAnswers !== 'number' || typeof timeSpentSeconds !== 'number') {
        return res.status(400).json({ message: "Dados invalidos" });
      }

      const practice = await storage.completePractice(req.user!.id, weekId, correctAnswers, timeSpentSeconds);
      
      // Check and unlock achievements after completing practice
      const unlockedAchievements = await storage.checkAndUnlockAchievements(req.user!.id, { 
        event: 'practice_complete', 
        value: practice.isMastered ? 1 : 0
      });
      
      res.json({
        starsEarned: practice.starsEarned,
        correctAnswers: practice.correctAnswers,
        totalQuestions: practice.totalQuestions,
        timeSpentSeconds: practice.timeSpentSeconds,
        completedWithinTime: practice.completedWithinTime,
        isMastered: practice.isMastered,
        unlockedAchievements: unlockedAchievements.length > 0 ? unlockedAchievements : undefined,
      });
    } catch (error) {
      console.error("Complete practice error:", error);
      res.status(500).json({ message: "Erro ao completar pratique" });
    }
  });

  // Verificar status de leitura do devocional
  app.get("/api/study/devotional-status/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const devotionalId = parseInt(req.params.id);
      if (isNaN(devotionalId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const isRead = await storage.hasReadDevotional(req.user!.id, devotionalId);
      res.json({ isRead });
    } catch (error) {
      console.error("Check devotional status error:", error);
      res.status(500).json({ message: "Erro ao verificar status" });
    }
  });

  // Marcar devocional como lido (para meta semanal)
  app.post("/api/study/devotional-read/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const devotionalId = parseInt(req.params.id);
      if (isNaN(devotionalId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const alreadyRead = await storage.hasReadDevotional(req.user!.id, devotionalId);
      if (alreadyRead) {
        return res.json({ success: true, message: "Devocional ja foi lido", alreadyRead: true });
      }

      const weekKey = getCurrentWeekKey();
      // confirmDevotionalRead ja chama incrementWeeklyDevotional internamente quando weekKey e fornecido
      await storage.confirmDevotionalRead(req.user!.id, devotionalId, weekKey);
      res.json({ success: true, message: "Leitura registrada" });
    } catch (error) {
      console.error("Mark devotional read error:", error);
      res.status(500).json({ message: "Erro ao registrar leitura" });
    }
  });

  // Get daily verse (separate from recovery verses)
  app.get("/api/study/daily-verse", async (req, res) => {
    try {
      const dailyVerse = await fetchDailyVerseFromAPI();
      if (!dailyVerse) {
        return res.status(503).json({ 
          message: "Versículo do dia indisponível no momento",
          fallback: {
            verse: "O Senhor é o meu pastor; nada me faltará.",
            reference: "Salmos 23:1 (ARA)"
          }
        });
      }
      res.json(dailyVerse);
    } catch (error) {
      console.error("Get daily verse error:", error);
      res.json({
        verse: "O Senhor é o meu pastor; nada me faltará.",
        reference: "Salmos 23:1 (ARA)"
      });
    }
  });

  // Helper to get current daily verse date key (resets at 6 AM São Paulo time)
  function getDailyVerseDateKey(): string {
    const now = new Date();
    const spTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    // If before 6 AM, consider it as the previous day
    if (spTime.getHours() < 6) {
      spTime.setDate(spTime.getDate() - 1);
    }
    return spTime.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Check if daily verse was read today
  app.get("/api/study/daily-verse/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const profile = await storage.getStudyProfile(req.user!.id);
      const todayKey = getDailyVerseDateKey();
      const isRead = profile?.dailyVerseReadDate === todayKey;
      res.json({ isRead, dateKey: todayKey });
    } catch (error) {
      console.error("Get daily verse status error:", error);
      res.status(500).json({ message: "Erro ao verificar status" });
    }
  });

  // Confirmar leitura do versículo do dia
  app.post("/api/study/daily-verse/confirm", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const todayKey = getDailyVerseDateKey();
      
      // First, check current status
      const profile = await storage.getStudyProfile(userId);
      
      // Check if already read today
      if (profile?.dailyVerseReadDate === todayKey) {
        return res.json({ 
          success: false, 
          alreadyRead: true, 
          message: "Versículo do dia já foi lido hoje" 
        });
      }
      
      // IMPORTANT: Update dailyVerseReadDate FIRST to prevent race conditions
      // This marks as read immediately so subsequent requests will be rejected
      await storage.updateStudyProfile(userId, { dailyVerseReadDate: todayKey });
      
      // Double-check after update to handle race conditions
      // Re-fetch the profile to ensure we have the latest state
      const updatedProfile = await storage.getStudyProfile(userId);
      if (updatedProfile?.dailyVerseReadDate !== todayKey) {
        // This shouldn't happen but handle gracefully
        return res.json({ 
          success: false, 
          alreadyRead: true, 
          message: "Erro de sincronização, tente novamente" 
        });
      }
      
      // Now safely increment the weekly goal (only happens once per day)
      const weekKey = getCurrentWeekKey();
      await storage.incrementWeeklyVerse(userId, weekKey);
      
      res.json({ success: true, message: "Leitura do versículo confirmada" });
    } catch (error) {
      console.error("Confirm daily verse error:", error);
      res.status(500).json({ message: "Erro ao confirmar leitura" });
    }
  });

  // ==================== DAILY VERSE SHARING ====================

  // Record daily verse share
  app.post("/api/study/daily-verse/share", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { platform, versePostId } = req.body;
      
      if (!platform || !['whatsapp', 'instagram', 'download'].includes(platform)) {
        return res.status(400).json({ message: "Plataforma inválida" });
      }
      
      const todayKey = getDailyVerseDateKey();
      
      // Record the share
      await storage.recordDailyVerseShare(userId, versePostId || null, platform, todayKey);
      
      res.json({ success: true, message: "Compartilhamento registrado" });
    } catch (error) {
      console.error("Record daily verse share error:", error);
      res.status(500).json({ message: "Erro ao registrar compartilhamento" });
    }
  });

  // Check if user has shared daily verse today
  app.get("/api/study/daily-verse/shared-today", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const todayKey = getDailyVerseDateKey();
      
      const hasShared = await storage.hasUserSharedDailyVerseToday(userId, todayKey);
      
      res.json({ hasShared, dateKey: todayKey });
    } catch (error) {
      console.error("Check daily verse share status error:", error);
      res.status(500).json({ message: "Erro ao verificar status" });
    }
  });

  // ==================== ADMINISTRAÇÃO DE TEMPORADAS ====================

  // Listar todas as temporadas (admin)
  app.get("/api/study/admin/seasons", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasons = await storage.getAllSeasons();
      res.json(convertImageUrlsArray(seasons));
    } catch (error) {
      console.error("Get all seasons error:", error);
      res.status(500).json({ message: "Erro ao buscar temporadas" });
    }
  });

  // Obter uma temporada específica por ID (admin)
  app.get("/api/study/admin/seasons/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const season = await storage.getSeasonById(seasonId);
      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }
      res.json(convertImageUrls(season));
    } catch (error) {
      console.error("Get season by id error:", error);
      res.status(500).json({ message: "Erro ao buscar temporada" });
    }
  });

  // Obter lições de uma temporada específica (admin)
  app.get("/api/study/admin/seasons/:id/lessons", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const season = await storage.getSeasonById(seasonId);
      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }

      const lessons = await storage.getLessonsForSeason(seasonId);
      res.json(lessons);
    } catch (error) {
      console.error("Get lessons for season error:", error);
      res.status(500).json({ message: "Erro ao buscar lições" });
    }
  });

  // Criar temporada
  app.post("/api/study/admin/seasons", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      // Validate with insert schema (omitting createdBy which is set server-side)
      const validatedData = insertSeasonSchema.omit({ createdBy: true }).parse(req.body);
      
      const season = await storage.createSeason({
        ...validatedData,
        createdBy: req.user!.id
      });
      res.status(201).json(convertImageUrls(season));
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Create season error:", error);
      res.status(500).json({ message: "Erro ao criar temporada" });
    }
  });

  // Atualizar temporada
  app.put("/api/study/admin/seasons/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      // Validate with dedicated update schema (strict mode rejects unknown fields)
      const validatedData = updateSeasonSchema.parse(req.body);
      
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo valido para atualizar" });
      }

      const season = await storage.updateSeason(seasonId, validatedData);
      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }
      res.json(convertImageUrls(season));
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Update season error:", error);
      res.status(500).json({ message: "Erro ao atualizar temporada" });
    }
  });

  // Deletar temporada
  app.delete("/api/study/admin/seasons/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      await storage.deleteSeason(seasonId);
      res.json({ message: "Temporada removida com sucesso" });
    } catch (error) {
      console.error("Delete season error:", error);
      res.status(500).json({ message: "Erro ao remover temporada" });
    }
  });

  // Publicar temporada
  app.post("/api/study/admin/seasons/:id/publish", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const season = await storage.publishSeason(seasonId);
      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }
      
      notifySeasonPublished(season.id, season.title, season.description, season.coverImageUrl).catch(err => 
        console.error("[Notifications] Error notifying season published:", err)
      );
      
      res.json(season);
    } catch (error) {
      console.error("Publish season error:", error);
      res.status(500).json({ message: "Erro ao publicar temporada" });
    }
  });

  // Bloquear/desbloquear temporada
  app.post("/api/study/admin/seasons/:id/toggle-lock", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const { isLocked } = req.body;
      if (typeof isLocked !== 'boolean') {
        return res.status(400).json({ message: "isLocked é obrigatório" });
      }

      const season = await storage.toggleSeasonLock(seasonId, isLocked);
      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }
      
      res.json(season);
    } catch (error) {
      console.error("Toggle season lock error:", error);
      res.status(500).json({ message: "Erro ao bloquear/desbloquear temporada" });
    }
  });

  // Encerrar temporada e enviar email para top 3 (mesma estrutura dos eventos)
  app.post("/api/study/admin/seasons/:id/end", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const result = await storage.endSeason(seasonId);
      if (!result) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }

      // Get lessons count
      const lessons = await storage.getLessonsForSeason(seasonId);
      if (lessons.length === 0) {
        return res.status(400).json({ message: "Revista não possui lições" });
      }

      // Get users who completed ALL lessons (same logic as events)
      const completedUsers = await storage.getUsersWhoCompletedSeason(seasonId);
      console.log(`[Season End] Found ${completedUsers.length} users who completed all ${lessons.length} lessons`);

      // Auto-create collectible card if it doesn't exist (same as events)
      let cardId = result.season.cardId;
      if (!cardId) {
        console.log(`[Season End] Creating collectible card for season ${seasonId}`);
        const newCard = await storage.createCollectibleCard({
          name: result.season.title,
          description: `Card exclusivo da revista "${result.season.title}"`,
          imageUrl: result.season.coverImageUrl || null,
          sourceType: "season",
          sourceId: seasonId,
          availableRarities: ["common", "rare", "epic", "legendary"],
          isActive: true,
        });
        cardId = newCard.id;
        await storage.updateSeason(seasonId, { cardId });
        console.log(`[Season End] Created card ${cardId} for season ${seasonId}`);
      }

      // Distribute cards to users who completed ALL lessons (same structure as events)
      let cardsDistributed = 0;
      for (const { userId, performance } of completedUsers) {
        try {
          // Check if user already has this card
          const existingCard = await storage.getUserCard(userId, cardId);
          if (existingCard) {
            console.log(`[Season End] User ${userId} already has card ${cardId}, skipping`);
            continue;
          }

          // Calculate rarity based on performance (same as events)
          const usedHints = false; // Seasons don't track hints
          const rarity = calculateCardRarity(performance, usedHints);
          
          await storage.awardUserCard({
            userId,
            cardId,
            rarity,
            sourceType: 'season',
            sourceId: seasonId,
            performance,
          });
          cardsDistributed++;
          console.log(`[Season End] Awarded card to user ${userId} with rarity ${rarity} (performance: ${performance.toFixed(1)}%)`);
        } catch (cardError) {
          console.error(`[Season End] Error awarding card to user ${userId}:`, cardError);
        }
      }
      console.log(`[Season End] Cards distributed: ${cardsDistributed}/${completedUsers.length}`);

      // Send congratulations emails to top 3 rankers with rate limiting
      for (let i = 0; i < result.topRankers.length && i < 3; i++) {
        const ranker = result.topRankers[i];
        try {
          const user = await storage.getUserById(ranker.userId);
          if (user?.email) {
            await sendSeasonRankingEmail(
              user.fullName,
              user.email,
              result.season.title,
              i + 1, // position (1, 2, or 3)
              ranker.xpEarned,
              result.topRankers.slice(0, 3).map((r, idx) => ({
                name: r.user.fullName,
                position: idx + 1,
                xp: r.xpEarned
              })),
              result.season.coverImage // include cover image
            );
            console.log(`[Season End] Sent ranking email to ${user.email} (position ${i + 1})`);
            
            // Rate limiting: wait between emails (Resend: 2 req/s max)
            if (i < 2) {
              await delay(EMAIL_RATE_LIMIT_DELAY);
            }
          }
        } catch (emailError) {
          console.error(`[Season End] Error sending email to user ${ranker.userId}:`, emailError);
        }
      }
      
      // Send push and in-app notifications to users who completed the season
      try {
        // Create participant list from completed users for notifications
        const completedParticipants = completedUsers.map(u => ({
          userId: u.userId,
          xpEarned: 0,
          correctPercentage: u.performance,
          rankPosition: 0,
          user: { id: u.userId, fullName: '', email: null }
        }));
        await notifySeasonEnded(result.season.id, result.season.title, result.topRankers, completedParticipants as any);
        console.log(`[Season End] Notifications sent to ${completedUsers.length} users who completed the season`);
      } catch (notifError) {
        console.error("[Notifications] Error notifying season ended:", notifError);
      }
      
      res.json({ 
        season: result.season, 
        topRankers: result.topRankers,
        cardsDistributed,
        usersCompleted: completedUsers.length,
        totalLessons: lessons.length,
        message: "Revista encerrada com sucesso" 
      });
    } catch (error) {
      console.error("End season error:", error);
      res.status(500).json({ message: "Erro ao encerrar temporada" });
    }
  });

  // Importar PDF e gerar lições com IA
  app.post("/api/study/admin/seasons/:id/import-pdf", authenticateToken, requireAdminOrEspiritualidade, upload.single('pdf'), async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Arquivo PDF não enviado" });
      }

      const season = await storage.getSeasonById(seasonId);
      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }

      // Salvar o status original para restaurar após o processamento
      const originalStatus = season.status;

      if (!isAIConfigured()) {
        return res.status(500).json({ message: "IA não configurada" });
      }

      await storage.updateSeason(seasonId, { status: "processing" });

      const pdfData = await parsePdfBuffer(req.file.buffer);
      const pdfText = pdfData.text;

      const generateFinalChallenge = req.body.generateFinalChallenge === "true";

      const now = new Date();
      const weekNumber = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 604800000);
      const lessonsData = await generateStudyContentFromText(pdfText, weekNumber, now.getFullYear());

      if (!lessonsData || !lessonsData.lessons || lessonsData.lessons.length === 0) {
        await storage.updateSeason(seasonId, { status: "draft" });
        return res.status(500).json({ message: "Erro ao processar PDF com IA" });
      }

      await storage.updateSeason(seasonId, {
        aiExtractedTitle: lessonsData.weekTitle || season.title,
        totalLessons: lessonsData.lessons.length
      });

      const createdLessons = [];
      for (let i = 0; i < lessonsData.lessons.length; i++) {
        const lessonData = lessonsData.lessons[i];
        const lesson = await storage.createSeasonLesson({
          seasonId,
          title: lessonData.title,
          description: lessonData.description || "",
          type: "study",
          orderIndex: i + 1,
          xpReward: 50,
          icon: "book-open"
        });

        if (lessonData.units && lessonData.units.length > 0) {
          for (let j = 0; j < lessonData.units.length; j++) {
            const unit = lessonData.units[j];
            await storage.createStudyUnit({
              lessonId: lesson.id,
              type: unit.type,
              content: unit.content,
              orderIndex: j,
              xpValue: 10,
              stage: unit.stage || "estude"
            });
          }
        }

        createdLessons.push(lesson);
      }

      // Restaurar o status original da revista (publicada ou rascunho)
      await storage.updateSeason(seasonId, { status: originalStatus });

      if (generateFinalChallenge && lessonsData.lessons.length > 0) {
        const lessonTitles = lessonsData.lessons.map((l: any) => l.title).join(", ");
        const challengeUnits = await generateExercisesFromTopic(
          `Gere 15 perguntas para desafio final sobre: ${lessonTitles}`,
          15
        );
        
        if (challengeUnits && challengeUnits.length > 0) {
          const questions = challengeUnits.map((u: any, idx: number) => ({
            id: idx + 1,
            question: u.content?.question || u.content,
            options: u.content?.options || [],
            correctAnswer: u.content?.correctAnswer || 0,
            explanation: u.content?.explanation || ""
          }));

          await storage.createFinalChallenge({
            seasonId,
            title: "Desafio Final",
            description: `Desafio final da temporada ${season.title}`,
            questions: JSON.stringify(questions),
            timeLimitSeconds: 150,
            questionCount: questions.length,
            xpReward: 200,
            perfectXpBonus: 100,
            isActive: true
          });
        }
      }

      res.json({
        message: "PDF processado com sucesso",
        lessonsCreated: createdLessons.length,
        lessons: createdLessons
      });
    } catch (error) {
      console.error("Import PDF error:", error);
      await storage.updateSeason(parseInt(req.params.id), { status: "draft" });
      res.status(500).json({ message: "Erro ao importar PDF" });
    }
  });

  // Importar PDF usando extração EXATA (nova função para DeoGlory)
  app.post("/api/study/admin/seasons/:id/import-pdf-exact", authenticateToken, requireAdminOrEspiritualidade, upload.single('pdf'), async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido", errorType: "validation" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Arquivo PDF não enviado", errorType: "validation" });
      }

      const geminiKey = req.body.geminiKey || "1";
      const openaiKey = req.body.openaiKey || "1";
      const aiProvider: AIProvider = req.body.aiProvider === "openai" ? "openai" : "gemini";

      const season = await storage.getSeasonById(seasonId);
      if (!season) {
        return res.status(404).json({ message: "Revista não encontrada", errorType: "not_found" });
      }

      // Salvar o status original para restaurar após o processamento
      const originalStatus = season.status;

      if (!isAIConfigured() && aiProvider === "gemini") {
        return res.status(500).json({ message: "IA não configurada. Configure a chave GEMINI_API_KEY nas variáveis de ambiente.", errorType: "config" });
      }

      if (aiProvider === "openai" && !process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI não configurada. Configure a chave OPENAI_API_KEY nas variáveis de ambiente.", errorType: "config" });
      }

      await storage.updateSeason(seasonId, { status: "processing" });

      const pdfData = await parsePdfBuffer(req.file.buffer);
      const pdfText = pdfData.text;

      if (!pdfText || pdfText.trim().length < 100) {
        await storage.updateSeason(seasonId, { status: originalStatus });
        return res.status(400).json({ message: "PDF não contém texto suficiente para processamento. Verifique se o PDF contém texto selecionável.", errorType: "pdf_content" });
      }

      const extractedLesson = await generateLessonFromPDFExact(pdfText, geminiKey, aiProvider, openaiKey);

      if (!extractedLesson || !extractedLesson.title) {
        await storage.updateSeason(seasonId, { status: originalStatus });
        return res.status(500).json({ message: "Erro ao processar PDF com IA" });
      }

      // Get existing lessons to calculate the next order index and total count
      const existingLessons = await storage.getLessonsForSeason(seasonId);
      
      // Check for duplicate lesson with same title (prevent multiple imports of same PDF)
      const duplicateLesson = existingLessons.find(l => 
        l.title.toLowerCase().trim() === extractedLesson.title.toLowerCase().trim()
      );
      if (duplicateLesson) {
        await storage.updateSeason(seasonId, { status: originalStatus });
        return res.status(409).json({ 
          message: `Já existe uma lição com o título "${extractedLesson.title}" nesta revista. Exclua a lição existente antes de importar novamente.`,
          errorType: "duplicate"
        });
      }
      
      const nextOrderIndex = existingLessons.length > 0 
        ? Math.max(...existingLessons.map(l => l.orderIndex)) + 1 
        : 1;
      const newTotalLessons = existingLessons.length + 1;
      
      // Use the lesson number selected by the user (from form) or fallback to auto-incrementing
      const selectedLessonNumber = parseInt(req.body.lessonNumber) || newTotalLessons;

      await storage.updateSeason(seasonId, {
        aiExtractedTitle: extractedLesson.title,
        totalLessons: newTotalLessons
      });

      const lesson = await storage.createSeasonLesson({
        seasonId,
        title: extractedLesson.title,
        description: extractedLesson.baseVerseReference ? `Versículo base: ${extractedLesson.baseVerseReference}` : "",
        type: "study",
        orderIndex: nextOrderIndex,
        lessonNumber: selectedLessonNumber,
        xpReward: 50,
        icon: "book-open"
      });

      let unitIndex = 0;

      if (extractedLesson.baseVerse && extractedLesson.baseVerseReference) {
        await storage.createStudyUnit({
          lessonId: lesson.id,
          type: "verse",
          content: JSON.stringify({
            text: extractedLesson.baseVerse,
            reference: extractedLesson.baseVerseReference
          }),
          orderIndex: unitIndex++,
          xpValue: 10,
          stage: "estude"
        });
      }

      if (extractedLesson.studyContent) {
        for (const content of extractedLesson.studyContent) {
          await storage.createStudyUnit({
            lessonId: lesson.id,
            type: content.type,
            content: JSON.stringify(content.content),
            orderIndex: unitIndex++,
            xpValue: 10,
            stage: "estude"
          });
        }
      }

      if (extractedLesson.meditationContent) {
        for (const content of extractedLesson.meditationContent) {
          await storage.createStudyUnit({
            lessonId: lesson.id,
            type: content.type,
            content: JSON.stringify(content.content),
            orderIndex: unitIndex++,
            xpValue: 10,
            stage: "medite"
          });
        }
      }

      if (extractedLesson.questions && extractedLesson.questions.length > 0) {
        for (const question of extractedLesson.questions) {
          // Use the actual question type from the AI response
          const questionType = question.type || "multiple_choice";
          await storage.createStudyUnit({
            lessonId: lesson.id,
            type: questionType,
            content: JSON.stringify(question.content || question),
            orderIndex: unitIndex++,
            xpValue: 15,
            stage: "responda"
          });
        }
      }

      // Restaurar o status original da revista (publicada ou rascunho)
      await storage.updateSeason(seasonId, { status: originalStatus });

      res.json({
        message: "PDF processado com sucesso",
        lessonTitle: extractedLesson.title,
        lessonId: lesson.id,
        topicsCount: extractedLesson.topics?.length || 0,
        questionsCount: extractedLesson.questions?.length || 0
      });
    } catch (error) {
      console.error("Import PDF exact error:", error);
      // Em caso de erro, restaurar para rascunho
      await storage.updateSeason(parseInt(req.params.id), { status: "draft" });
      
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      let userMessage = "Erro ao importar PDF";
      let errorType = "unknown";
      
      if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests") || errorMessage.includes("quota")) {
        userMessage = "Limite de requisições atingido. Aguarde alguns segundos e tente novamente, ou use outra chave Gemini.";
        errorType = "rate_limit";
      } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("API key")) {
        userMessage = "Chave da API inválida ou expirada. Verifique a configuração da chave Gemini.";
        errorType = "auth";
      } else if (errorMessage.includes("503") || errorMessage.includes("Service Unavailable")) {
        userMessage = "Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.";
        errorType = "service_unavailable";
      } else if (errorMessage.includes("500") || errorMessage.includes("Internal Server Error")) {
        userMessage = "Erro interno no serviço de IA. Tente novamente mais tarde.";
        errorType = "server_error";
      } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
        userMessage = "Tempo limite excedido. O PDF pode ser muito grande. Tente novamente.";
        errorType = "timeout";
      } else if (errorMessage.includes("JSON") || errorMessage.includes("parse")) {
        userMessage = "Erro ao processar resposta da IA. Tente novamente.";
        errorType = "parse_error";
      }
      
      res.status(500).json({ message: userMessage, errorType, details: errorMessage });
    }
  });

  // Criar/atualizar desafio final
  app.post("/api/study/admin/seasons/:id/final-challenge", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const { title, description, questions, timeLimitSeconds, xpReward, perfectXpBonus } = req.body;

      const existing = await storage.getSeasonFinalChallenge(seasonId);
      if (existing) {
        const updated = await storage.updateFinalChallenge(existing.id, {
          title,
          description,
          questions: JSON.stringify(questions),
          timeLimitSeconds: timeLimitSeconds || 150,
          questionCount: questions.length,
          xpReward: xpReward || 200,
          perfectXpBonus: perfectXpBonus || 100
        });
        return res.json(updated);
      }

      const challenge = await storage.createFinalChallenge({
        seasonId,
        title: title || "Desafio Final",
        description,
        questions: JSON.stringify(questions),
        timeLimitSeconds: timeLimitSeconds || 150,
        questionCount: questions.length,
        xpReward: xpReward || 200,
        perfectXpBonus: perfectXpBonus || 100,
        isActive: true
      });
      res.status(201).json(challenge);
    } catch (error) {
      console.error("Create final challenge error:", error);
      res.status(500).json({ message: "Erro ao criar desafio final" });
    }
  });

  // Gerar desafio final com IA
  app.post("/api/study/admin/seasons/:id/generate-final-challenge", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.id);
      if (isNaN(seasonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const season = await storage.getSeasonById(seasonId);
      if (!season) {
        return res.status(404).json({ message: "Temporada não encontrada" });
      }

      const lessons = await storage.getLessonsForSeason(seasonId);
      if (lessons.length === 0) {
        return res.status(400).json({ message: "Temporada não possui lições" });
      }

      if (!isAIConfigured()) {
        return res.status(500).json({ message: "IA não configurada" });
      }

      const lessonTitles = lessons.map((l: any) => l.title).join(", ");
      const challengeUnits = await generateExercisesFromTopic(
        `Gere 15 perguntas de múltipla escolha para um desafio final sobre os temas: ${lessonTitles}. 
        A temporada é "${season.title}". 
        Cada pergunta deve ter 4 opções e apenas 1 correta.`,
        15
      );

      if (!challengeUnits || challengeUnits.length === 0) {
        return res.status(500).json({ message: "Erro ao gerar perguntas com IA" });
      }

      const questions = challengeUnits.map((u: any, idx: number) => ({
        id: idx + 1,
        question: u.content?.question || u.content,
        options: u.content?.options || [],
        correctAnswer: u.content?.correctAnswer || 0,
        explanation: u.content?.explanation || ""
      }));

      const existing = await storage.getSeasonFinalChallenge(seasonId);
      if (existing) {
        const updated = await storage.updateFinalChallenge(existing.id, {
          questions: JSON.stringify(questions),
          questionCount: questions.length
        });
        return res.json({ message: "Desafio atualizado", challenge: updated });
      }

      const challenge = await storage.createFinalChallenge({
        seasonId,
        title: "Desafio Final",
        description: `Desafio final da temporada ${season.title}`,
        questions: JSON.stringify(questions),
        timeLimitSeconds: 150,
        questionCount: questions.length,
        xpReward: 200,
        perfectXpBonus: 100,
        isActive: true
      });

      res.status(201).json({ message: "Desafio criado", challenge });
    } catch (error) {
      console.error("Generate final challenge error:", error);
      res.status(500).json({ message: "Erro ao gerar desafio final" });
    }
  });

  // Liberar/bloquear lição de temporada
  app.post("/api/study/admin/seasons/:seasonId/lessons/:lessonId/toggle-lock", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const seasonId = parseInt(req.params.seasonId);
      const lessonId = parseInt(req.params.lessonId);
      
      if (isNaN(seasonId) || isNaN(lessonId)) {
        return res.status(400).json({ message: "ID inválido" });
      }

      const lesson = await storage.getLessonById(lessonId);
      if (!lesson || lesson.seasonId !== seasonId) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }

      const updated = await storage.updateStudyLesson(lessonId, {
        isLocked: !lesson.isLocked
      });

      res.json(updated);
    } catch (error) {
      console.error("Toggle lesson lock error:", error);
      res.status(500).json({ message: "Erro ao alterar estado da lição" });
    }
  });

  // ==================== PAINEL ESPIRITUALIDADE API ====================

  // Listar todos os devocionais (admin/espiritualidade)
  app.get("/api/espiritualidade/devotionals", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const devotionals = await storage.getAllDevotionalsAdmin();
      res.json(convertImageUrlsArray(devotionals));
    } catch (error) {
      console.error("Get all devotionals admin error:", error);
      res.status(500).json({ message: "Erro ao buscar devocionais" });
    }
  });

  // Buscar devocional por ID (admin/espiritualidade)
  app.get("/api/espiritualidade/devotionals/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const devotional = await storage.getDevotionalById(id);
      if (!devotional) {
        return res.status(404).json({ message: "Devocional nao encontrado" });
      }
      res.json(convertImageUrls(devotional));
    } catch (error) {
      console.error("Get devotional by id error:", error);
      res.status(500).json({ message: "Erro ao buscar devocional" });
    }
  });

  // Criar novo devocional (admin/espiritualidade)
  app.post("/api/espiritualidade/devotionals", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const { title, verse, verseReference, content, contentHtml, summary, prayer, imageUrl, mobileCropData, author, youtubeUrl, instagramUrl, audioUrl, isPublished, isFeatured, scheduledAt } = req.body;
      
      if (!title || !verse || !verseReference || !content) {
        return res.status(400).json({ message: "Titulo, versiculo, referencia e conteudo sao obrigatorios" });
      }
      
      const devotional = await storage.createDevotional({
        title,
        verse,
        verseReference,
        content,
        contentHtml,
        summary,
        prayer,
        imageUrl,
        mobileCropData: mobileCropData ? JSON.stringify(mobileCropData) : null,
        author: author || req.user?.fullName || "Espiritualidade UMP",
        youtubeUrl,
        instagramUrl,
        audioUrl,
        isPublished: isPublished || false,
        isFeatured: isFeatured || false,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        createdBy: req.user?.id
      } as any);
      
      if (isPublished) {
        notifyNewDevotional(devotional.id, title, imageUrl).catch(err => 
          console.error("[Notifications] Error notifying new devotional:", err)
        );
      }
      
      res.status(201).json(convertImageUrls(devotional));
    } catch (error) {
      console.error("Create devotional error:", error);
      res.status(500).json({ message: "Erro ao criar devocional" });
    }
  });

  // Atualizar devocional (admin/espiritualidade)
  app.put("/api/espiritualidade/devotionals/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, verse, verseReference, content, contentHtml, summary, prayer, imageUrl, mobileCropData, author, youtubeUrl, instagramUrl, audioUrl, isPublished, isFeatured, scheduledAt } = req.body;
      
      const updateData: any = {
        title,
        verse,
        verseReference,
        content,
        contentHtml,
        summary,
        prayer,
        imageUrl,
        author,
        youtubeUrl,
        instagramUrl,
        audioUrl,
        isPublished,
        isFeatured,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      };
      
      if (mobileCropData !== undefined) {
        updateData.mobileCropData = mobileCropData ? JSON.stringify(mobileCropData) : null;
      }
      
      const devotional = await storage.updateDevotional(id, updateData);
      
      if (!devotional) {
        return res.status(404).json({ message: "Devocional nao encontrado" });
      }
      
      res.json(convertImageUrls(devotional));
    } catch (error) {
      console.error("Update devotional error:", error);
      res.status(500).json({ message: "Erro ao atualizar devocional" });
    }
  });

  // Excluir devocional (admin/espiritualidade)
  app.delete("/api/espiritualidade/devotionals/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDevotional(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Devocional nao encontrado" });
      }
      
      res.json({ message: "Devocional excluido com sucesso" });
    } catch (error) {
      console.error("Delete devotional error:", error);
      res.status(500).json({ message: "Erro ao excluir devocional" });
    }
  });

  // Publicar devocional (admin/espiritualidade)
  app.post("/api/espiritualidade/devotionals/:id/publish", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const devotional = await storage.publishDevotional(id);
      
      if (!devotional) {
        return res.status(404).json({ message: "Devocional nao encontrado" });
      }
      
      // Send push notification when devotional is published
      notifyNewDevotional(devotional.id, devotional.title, devotional.imageUrl).catch(err => 
        console.error("[Notifications] Error notifying new devotional:", err)
      );
      
      res.json(convertImageUrls(devotional));
    } catch (error) {
      console.error("Publish devotional error:", error);
      res.status(500).json({ message: "Erro ao publicar devocional" });
    }
  });

  // Despublicar devocional (admin/espiritualidade)
  app.post("/api/espiritualidade/devotionals/:id/unpublish", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const devotional = await storage.unpublishDevotional(id);
      
      if (!devotional) {
        return res.status(404).json({ message: "Devocional nao encontrado" });
      }
      
      res.json(convertImageUrls(devotional));
    } catch (error) {
      console.error("Unpublish devotional error:", error);
      res.status(500).json({ message: "Erro ao despublicar devocional" });
    }
  });

  // Listar pedidos de oracao pendentes (admin/espiritualidade)
  app.get("/api/espiritualidade/prayers", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string;
      let prayers;
      
      if (status === "pending") {
        prayers = await storage.getPendingPrayerRequests();
      } else if (status === "approved") {
        prayers = await storage.getApprovedPrayerRequests();
      } else {
        prayers = await storage.getAllPrayerRequests(status);
      }
      
      res.json(prayers);
    } catch (error) {
      console.error("Get prayers error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos de oracao" });
    }
  });

  // Buscar pedido de oracao por ID (admin/espiritualidade)
  app.get("/api/espiritualidade/prayers/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const prayer = await storage.getPrayerRequestById(id);
      
      if (!prayer) {
        return res.status(404).json({ message: "Pedido nao encontrado" });
      }
      
      res.json(prayer);
    } catch (error) {
      console.error("Get prayer by id error:", error);
      res.status(500).json({ message: "Erro ao buscar pedido de oracao" });
    }
  });

  // Aprovar pedido de oracao (admin/espiritualidade)
  app.patch("/api/espiritualidade/prayers/:id/approve", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const prayer = await storage.approvePrayerRequest(id, req.user!.id);
      
      if (!prayer) {
        return res.status(404).json({ message: "Pedido nao encontrado" });
      }
      
      // Prayer requests don't have a userId field in this schema
      if ((prayer as any).userId) {
        notifyPrayerApproved((prayer as any).userId, prayer.id).catch(err => 
          console.error("[Notifications] Error notifying prayer approved:", err)
        );
      }
      
      res.json(prayer);
    } catch (error) {
      console.error("Approve prayer error:", error);
      res.status(500).json({ message: "Erro ao aprovar pedido de oracao" });
    }
  });

  // Rejeitar pedido de oracao (admin/espiritualidade)
  app.patch("/api/espiritualidade/prayers/:id/reject", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { reason } = req.body;
      const prayer = await storage.rejectPrayerRequest(id, req.user!.id, reason);
      
      if (!prayer) {
        return res.status(404).json({ message: "Pedido nao encontrado" });
      }
      
      res.json(prayer);
    } catch (error) {
      console.error("Reject prayer error:", error);
      res.status(500).json({ message: "Erro ao rejeitar pedido de oracao" });
    }
  });

  app.delete("/api/espiritualidade/prayers/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const prayer = await storage.getPrayerRequestById(id);
      if (!prayer) {
        return res.status(404).json({ message: "Pedido nao encontrado" });
      }
      
      await logAuditAction(req.user?.id, "delete", "prayer_request", id, `Pedido de oracao removido: ${prayer.name}`, req);
      
      await storage.deletePrayerRequest(id);
      
      res.json({ message: "Pedido de oracao removido com sucesso" });
    } catch (error) {
      console.error("Delete prayer error:", error);
      res.status(500).json({ message: "Erro ao remover pedido de oracao" });
    }
  });

  // Mural da oracao publico (pedidos aprovados)
  app.get("/api/site/prayer-wall", async (req, res) => {
    try {
      const prayers = await storage.getApprovedPrayerRequests();
      res.json(prayers);
    } catch (error) {
      console.error("Get prayer wall error:", error);
      res.status(500).json({ message: "Erro ao buscar mural de oracao" });
    }
  });

  // Incrementar contador "Estou orando" (publico)
  app.post("/api/site/prayer-wall/:id/pray", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const prayer = await storage.incrementPrayerCount(id);
      
      if (!prayer) {
        return res.status(404).json({ message: "Pedido nao encontrado" });
      }
      
      res.json({ inPrayerCount: prayer.inPrayerCount });
    } catch (error) {
      console.error("Increment prayer count error:", error);
      res.status(500).json({ message: "Erro ao registrar oracao" });
    }
  });

  // Dashboard estatisticas espiritualidade
  app.get("/api/espiritualidade/stats", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const [allDevotionals, pendingPrayers, approvedPrayers] = await Promise.all([
        storage.getAllDevotionalsAdmin(),
        storage.getPendingPrayerRequests(),
        storage.getApprovedPrayerRequests()
      ]);
      
      const publishedDevotionals = allDevotionals.filter(d => d.isPublished);
      const draftDevotionals = allDevotionals.filter(d => !d.isPublished);
      
      res.json({
        devotionals: {
          total: allDevotionals.length,
          published: publishedDevotionals.length,
          drafts: draftDevotionals.length
        },
        prayers: {
          pending: pendingPrayers.length,
          approved: approvedPrayers.length
        }
      });
    } catch (error) {
      console.error("Get espiritualidade stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // ==================== DEVOTIONAL COMMENTS ROUTES ====================

  // Get approved comments for a devotional (public)
  app.get("/api/site/devotionals/:id/comments", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const comments = await storage.getApprovedDevotionalComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Get devotional comments error:", error);
      res.status(500).json({ message: "Erro ao buscar comentarios" });
    }
  });

  // Add comment to a devotional (public)
  app.post("/api/site/devotionals/:id/comments", async (req, res) => {
    try {
      const devotionalId = parseInt(req.params.id);
      if (isNaN(devotionalId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const { name, content, userId } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ message: "Nome e comentario sao obrigatorios" });
      }
      
      if (name.trim().length < 2) {
        return res.status(400).json({ message: "Nome deve ter pelo menos 2 caracteres" });
      }
      
      if (content.trim().length < 3) {
        return res.status(400).json({ message: "Comentario deve ter pelo menos 3 caracteres" });
      }
      
      if (content.trim().length > 500) {
        return res.status(400).json({ message: "Comentario deve ter no maximo 500 caracteres" });
      }
      
      const moderation = moderateContent(content);
      
      if (shouldAutoReject(moderation)) {
        return res.status(400).json({ 
          message: "Seu comentario contem conteudo inapropriado e nao pode ser enviado.",
          moderated: true 
        });
      }
      
      const comment = await storage.createDevotionalComment({
        devotionalId,
        name: name.trim(),
        content: moderation.hasProfanity ? moderation.cleanedText : content.trim(),
        userId: userId || null,
      });
      
      // Auto-approve if content is clean (no profanity)
      const shouldAutoApprove = !moderation.hasProfanity;
      if (shouldAutoApprove) {
        await storage.autoApproveDevotionalComment(comment.id);
      }
      
      const devotional = await storage.getDevotionalById(devotionalId);
      if (devotional) {
        notifyNewComment(devotionalId, devotional.title, name.trim(), content.trim()).catch(err => 
          console.error("[Notifications] Error notifying new comment:", err)
        );
        
        // Notify devotional author if exists
        if (devotional.createdBy) {
          notifyDevotionalComment(devotional.createdBy, name.trim(), devotional.title, devotionalId).catch(err =>
            console.error("[Notifications] Error notifying devotional author:", err)
          );
        }
      }
      
      const message = shouldAutoApprove 
        ? "Comentario publicado com sucesso!" 
        : "Comentario enviado! Aguardando aprovacao.";
      
      res.status(201).json({ message, id: comment.id, autoApproved: shouldAutoApprove });
    } catch (error) {
      console.error("Create devotional comment error:", error);
      res.status(500).json({ message: "Erro ao enviar comentario" });
    }
  });

  // Get all comments for moderation (admin/espiritualidade)
  app.get("/api/espiritualidade/comments", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const comments = await storage.getAllDevotionalComments();
      res.json(comments);
    } catch (error) {
      console.error("Get all comments error:", error);
      res.status(500).json({ message: "Erro ao buscar comentarios" });
    }
  });

  // Approve a comment (admin/espiritualidade)
  app.patch("/api/espiritualidade/comments/:id/approve", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const comment = await storage.approveDevotionalComment(id, req.user!.id);
      if (!comment) {
        return res.status(404).json({ message: "Comentario nao encontrado" });
      }
      
      await logAuditAction(req.user?.id, "update", "devotional_comment", id, "Comentario aprovado", req);
      
      res.json(comment);
    } catch (error) {
      console.error("Approve comment error:", error);
      res.status(500).json({ message: "Erro ao aprovar comentario" });
    }
  });

  // Highlight/unhighlight a comment (admin/espiritualidade)
  app.patch("/api/espiritualidade/comments/:id/highlight", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const { isHighlighted } = req.body;
      const comment = await storage.highlightDevotionalComment(id, isHighlighted === true);
      if (!comment) {
        return res.status(404).json({ message: "Comentario nao encontrado" });
      }
      
      res.json(comment);
    } catch (error) {
      console.error("Highlight comment error:", error);
      res.status(500).json({ message: "Erro ao destacar comentario" });
    }
  });

  // Delete a comment (admin/espiritualidade)
  app.delete("/api/espiritualidade/comments/:id", authenticateToken, requireAdminOrEspiritualidade, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      await logAuditAction(req.user?.id, "delete", "devotional_comment", id, "Comentario removido", req);
      
      await storage.deleteDevotionalComment(id);
      res.json({ message: "Comentario removido com sucesso" });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ message: "Erro ao remover comentario" });
    }
  });

  // ==================== EVENTOS ESPECIAIS + CARDS COLECIONÁVEIS ====================

  // === ROTAS ADMIN - EVENTOS ESPECIAIS DE ESTUDO ===

  // Listar todos os eventos de estudo (admin)
  app.get("/api/admin/study-events", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const events = await storage.getAllStudyEvents();
      res.json(convertImageUrlsArray(events));
    } catch (error) {
      console.error("Get study events error:", error);
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  // Criar novo evento de estudo (admin)
  app.post("/api/admin/study-events", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertStudyEventSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
      });
      const event = await storage.createStudyEvent(validatedData);
      await logAuditAction(req.user?.id, "create", "study_event", event.id, `Evento criado: ${event.title}`, req);
      res.status(201).json(convertImageUrls(event));
    } catch (error) {
      console.error("Create study event error:", error);
      res.status(500).json({ message: "Erro ao criar evento" });
    }
  });

  // Obter evento de estudo por ID (admin)
  app.get("/api/admin/study-events/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const event = await storage.getStudyEventById(id);
      if (!event) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      res.json(convertImageUrls(event));
    } catch (error) {
      console.error("Get study event error:", error);
      res.status(500).json({ message: "Erro ao buscar evento" });
    }
  });

  // Helper function to release event lessons based on current day
  // Called when: 1) Event is manually published, 2) User completes a lesson
  async function releaseEventLessonsForCurrentDay(eventId: number): Promise<number> {
    const event = await storage.getStudyEventById(eventId);
    if (!event || event.status !== 'published') return 0;
    
    const currentDay = getEventCurrentDay(new Date(event.startDate), new Date(event.endDate));
    if (currentDay <= 0) return 0; // Event hasn't started or already ended
    
    const lessons = await storage.getStudyEventLessons(eventId);
    let releasedCount = 0;
    
    for (const lesson of lessons) {
      // Release lessons up to and including the current day
      if (lesson.dayNumber <= currentDay && lesson.status !== 'published') {
        await storage.updateStudyEventLesson(lesson.id, { status: 'published' });
        console.log(`[Event Release] Released lesson day ${lesson.dayNumber} for event "${event.title}"`);
        releasedCount++;
      }
    }
    
    return releasedCount;
  }

  // Atualizar evento de estudo (admin)
  app.patch("/api/admin/study-events/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Validate with dedicated update schema (strict mode rejects unknown fields)
      const validatedData = updateStudyEventSchema.parse(req.body);
      
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo valido para atualizar" });
      }
      
      // Check if status is being changed to 'published' or 'ended'/'completed'
      const previousEvent = await storage.getStudyEventById(id);
      const isBeingPublished = previousEvent && 
        previousEvent.status !== 'published' && 
        validatedData.status === 'published';
      const isBeingEnded = previousEvent &&
        previousEvent.status !== 'ended' && previousEvent.status !== 'completed' &&
        (validatedData.status === 'ended' || validatedData.status === 'completed');
      
      const event = await storage.updateStudyEvent(id, validatedData);
      if (!event) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      
      // If event was just published, release lessons based on current date and send notifications
      if (isBeingPublished) {
        const releasedCount = await releaseEventLessonsForCurrentDay(id);
        console.log(`[Event Publish] Event "${event.title}" published. Released ${releasedCount} lessons.`);
        
        // Send push notifications and emails to all members
        notifyNewStudyEvent(
          event.id,
          event.title,
          event.description,
          event.startDate.toISOString(),
          event.endDate.toISOString(),
          event.imageUrl
        ).catch(err => console.error("[Event Publish] Notification error:", err));
      }
      
      // If event was just ended, send notification to all members
      if (isBeingEnded) {
        console.log(`[Event End] Event "${event.title}" ended via PATCH.`);
        notifyEventEnded(event.id, event.title)
          .catch(err => console.error("[Event End] Notification error:", err));
      }
      
      await logAuditAction(req.user?.id, "update", "study_event", id, `Evento atualizado: ${event.title}`, req);
      res.json(convertImageUrls(event));
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Update study event error:", error);
      res.status(500).json({ message: "Erro ao atualizar evento" });
    }
  });

  // Deletar evento de estudo (admin)
  app.delete("/api/admin/study-events/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      await logAuditAction(req.user?.id, "delete", "study_event", id, "Evento removido", req);
      await storage.deleteStudyEvent(id);
      res.json({ message: "Evento removido com sucesso" });
    } catch (error) {
      console.error("Delete study event error:", error);
      res.status(500).json({ message: "Erro ao remover evento" });
    }
  });

  // Encerrar evento manualmente e distribuir cards
  app.post("/api/admin/study-events/:id/end", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const event = await storage.getStudyEventById(id);
      if (!event) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      
      // Check if already ended to avoid duplicate notifications
      const wasAlreadyEnded = event.status === 'ended' || event.status === 'completed';
      
      // Update event end date to now
      await storage.updateStudyEvent(id, {
        endDate: new Date(),
        status: "ended",
      });
      
      // Distribute cards to users who completed
      const lessons = await storage.getStudyEventLessons(id);
      if (lessons.length > 0) {
        // Create card automatically if event doesn't have one
        let cardId = event.cardId;
        if (!cardId) {
          const newCard = await storage.createCollectibleCard({
            name: event.title,
            description: `Card exclusivo do evento "${event.title}"`,
            imageUrl: event.imageUrl || null,
            sourceType: "event",
            sourceId: id,
            availableRarities: ["common", "rare", "epic", "legendary"],
            isActive: true,
          });
          cardId = newCard.id;
          await storage.updateStudyEvent(id, { cardId });
          console.log(`[Admin Event End] Created card ${cardId} for event ${id}`);
        }
        
        const completedUserIds = await storage.getUsersWhoCompletedEvent(id, lessons.length);
        let cardsDistributed = 0;
        
        for (const userId of completedUserIds) {
          // Check if user already has this card
          const existingCard = await storage.getUserCard(userId, cardId);
          if (existingCard) continue;
          
          const allProgress = await storage.getUserEventProgress(userId, id);
          const totalCorrect = allProgress.reduce((sum, p) => sum + (p.correctAnswers || 0), 0);
          const totalQs = allProgress.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
          const avgPerformance = totalQs > 0 ? (totalCorrect / totalQs) * 100 : 0;
          const anyHints = allProgress.some(p => p.usedHints);
          
          const rarity = calculateCardRarity(avgPerformance, anyHints);
          await storage.awardUserCard({
            userId,
            cardId,
            rarity,
            sourceType: "event",
            sourceId: id,
            performance: avgPerformance,
          });
          cardsDistributed++;
        }
        
        console.log(`[Admin Event End] Distributed ${cardsDistributed} cards for event ${id}`);
      }
      
      // Send notification to all members about event ending (only if not already ended)
      if (!wasAlreadyEnded) {
        notifyEventEnded(event.id, event.title)
          .catch(err => console.error("[Admin Event End] Notification error:", err));
      }
      
      await logAuditAction(req.user?.id, "update", "study_event", id, "Evento encerrado manualmente", req);
      res.json({ message: "Evento encerrado com sucesso" });
    } catch (error) {
      console.error("End study event error:", error);
      res.status(500).json({ message: "Erro ao encerrar evento" });
    }
  });

  // Liberar licao de evento manualmente
  app.post("/api/admin/study-events/:eventId/lessons/:lessonId/unlock", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const lessonId = parseInt(req.params.lessonId);
      if (isNaN(eventId) || isNaN(lessonId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      await storage.updateStudyEventLesson(lessonId, { status: "published" });
      await logAuditAction(req.user?.id, "update", "study_event_lesson", lessonId, "Licao liberada manualmente", req);
      res.json({ message: "Licao liberada com sucesso" });
    } catch (error) {
      console.error("Unlock lesson error:", error);
      res.status(500).json({ message: "Erro ao liberar licao" });
    }
  });

  // Distribuir cards manualmente
  app.post("/api/admin/study-events/:id/distribute-cards", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      let event = await storage.getStudyEventById(id);
      if (!event) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      
      // Create card automatically if event doesn't have one
      let cardId = event.cardId;
      if (!cardId) {
        const newCard = await storage.createCollectibleCard({
          name: event.title,
          description: `Card exclusivo do evento "${event.title}"`,
          imageUrl: event.imageUrl || null,
          sourceType: "event",
          sourceId: id,
          availableRarities: ["common", "rare", "epic", "legendary"],
          isActive: true,
        });
        cardId = newCard.id;
        await storage.updateStudyEvent(id, { cardId });
        console.log(`[Admin Card Distribution] Created card ${cardId} for event ${id}`);
      }
      
      const lessons = await storage.getStudyEventLessons(id);
      if (lessons.length === 0) {
        return res.status(400).json({ message: "Evento nao possui licoes" });
      }
      
      const completedUserIds = await storage.getUsersWhoCompletedEvent(id, lessons.length);
      let cardsDistributed = 0;
      
      for (const userId of completedUserIds) {
        // Check if user already has this card
        const existingCard = await storage.getUserCard(userId, cardId);
        if (existingCard) continue;
        
        const allProgress = await storage.getUserEventProgress(userId, id);
        const totalCorrect = allProgress.reduce((sum, p) => sum + (p.correctAnswers || 0), 0);
        const totalQs = allProgress.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
        const avgPerformance = totalQs > 0 ? (totalCorrect / totalQs) * 100 : 0;
        const anyHints = allProgress.some(p => p.usedHints);
        
        const rarity = calculateCardRarity(avgPerformance, anyHints);
        await storage.awardUserCard({
          userId,
          cardId,
          rarity,
          sourceType: "event",
          sourceId: id,
          performance: avgPerformance,
        });
        cardsDistributed++;
      }
      
      console.log(`[Admin Card Distribution] Distributed ${cardsDistributed} cards for event ${id}`);
      await logAuditAction(req.user?.id, "create", "user_cards", id, `${cardsDistributed} cards distribuidos`, req);
      res.json({ message: "Cards distribuidos com sucesso", cardsDistributed, totalEligible: completedUserIds.length });
    } catch (error) {
      console.error("Distribute cards error:", error);
      res.status(500).json({ message: "Erro ao distribuir cards" });
    }
  });

  // === ROTAS ADMIN - LIÇÕES DE EVENTOS ===

  // Listar licoes de um evento (admin)
  app.get("/api/admin/study-events/:eventId/lessons", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const lessons = await storage.getStudyEventLessons(eventId);
      res.json(lessons);
    } catch (error) {
      console.error("Get event lessons error:", error);
      res.status(500).json({ message: "Erro ao buscar licoes" });
    }
  });

  // Criar licao de evento (admin)
  app.post("/api/admin/study-events/:eventId/lessons", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const validatedData = insertStudyEventLessonSchema.parse({
        ...req.body,
        eventId,
      });
      const lesson = await storage.createStudyEventLesson(validatedData);
      res.status(201).json(lesson);
    } catch (error) {
      console.error("Create event lesson error:", error);
      res.status(500).json({ message: "Erro ao criar licao" });
    }
  });

  // Gerar licoes com IA para evento existente (admin)
  app.post("/api/admin/study-events/:eventId/generate-lessons", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const event = await storage.getStudyEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      
      const existingLessons = await storage.getStudyEventLessons(eventId);
      if (existingLessons.length > 0) {
        return res.status(400).json({ message: "Evento ja possui licoes. Remova as licoes existentes primeiro." });
      }
      
      const { text, theme, month, keyNumber } = req.body;
      const contentText = text || event.description || `Estudo sobre ${event.theme}`;
      const contentTheme = theme || event.theme || event.title;
      const monthName = month || new Date(event.startDate).toLocaleString("pt-BR", { month: "long" });
      
      console.log(`[Admin] Gerando licoes com IA para evento ${eventId} - Tema: ${contentTheme}`);
      
      const generatedContent = await generateEventContentFromText(contentText, contentTheme, monthName, keyNumber);
      
      for (const lessonData of generatedContent.lessons) {
        await storage.createStudyEventLesson({
          eventId,
          dayNumber: lessonData.dayNumber,
          title: lessonData.title,
          content: lessonData.content,
          verseReference: lessonData.verseReference,
          verseText: lessonData.verseText,
          questions: lessonData.questions,
          xpReward: lessonData.xpReward,
          status: "draft",
        });
      }
      
      await logAuditAction(req.user?.id, "update", "study_event", eventId, `${generatedContent.lessons.length} licoes geradas por IA`, req);
      
      res.json({
        eventId,
        lessonsCreated: generatedContent.lessons.length,
        message: `${generatedContent.lessons.length} licoes geradas com sucesso`
      });
    } catch (error: any) {
      console.error("Generate lessons error:", error);
      res.status(500).json({ message: error.message || "Erro ao gerar licoes com IA" });
    }
  });

  // Atualizar licao de evento (admin)
  app.patch("/api/admin/study-events/:eventId/lessons/:lessonId", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      if (isNaN(lessonId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Validate with dedicated update schema (strict mode rejects unknown fields)
      const validatedData = updateStudyEventLessonSchema.parse(req.body);
      
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo valido para atualizar" });
      }
      
      const lesson = await storage.updateStudyEventLesson(lessonId, validatedData);
      if (!lesson) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }
      res.json(lesson);
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Update event lesson error:", error);
      res.status(500).json({ message: "Erro ao atualizar licao" });
    }
  });

  // Deletar licao de evento (admin)
  app.delete("/api/admin/study-events/:eventId/lessons/:lessonId", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const lessonId = parseInt(req.params.lessonId);
      if (isNaN(lessonId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      await storage.deleteStudyEventLesson(lessonId);
      res.json({ message: "Lição removida com sucesso" });
    } catch (error) {
      console.error("Delete event lesson error:", error);
      res.status(500).json({ message: "Erro ao remover licao" });
    }
  });

  // Gerar evento com IA (admin)
  app.post("/api/admin/study-events/ai-generate", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { text, theme, imageUrl, year, month, startDay, endDay, keyNumber } = req.body;
      
      if (!text || !theme || !year || !month || !startDay || !endDay) {
        return res.status(400).json({ message: "Campos obrigatórios: text, theme, year, month, startDay, endDay" });
      }

      // Create dates with São Paulo timezone (UTC-3) to avoid date shifting
      const startDate = createBrazilDate(year, month, startDay, 0, 0, 0);
      const endDate = createBrazilDate(year, month, endDay, 23, 59, 59);
      
      if (endDate <= startDate) {
        return res.status(400).json({ message: "Data de término deve ser após a data de início" });
      }

      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
                          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const monthName = monthNames[month - 1];

      console.log(`[Admin] Gerando evento com IA - Tema: ${theme}, Mês: ${monthName}, Chave: ${keyNumber || 'auto'}`);
      
      const generatedContent = await generateEventContentFromText(text, theme, monthName, keyNumber);
      
      const event = await storage.createStudyEvent({
        title: generatedContent.title,
        description: generatedContent.description,
        theme: theme.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: imageUrl || null,
        startDate: startDate,
        endDate: endDate,
        status: "draft",
        lessonsCount: 5,
        xpMultiplier: 1,
        createdBy: req.user!.id,
      });
      
      for (const lessonData of generatedContent.lessons) {
        await storage.createStudyEventLesson({
          eventId: event.id,
          dayNumber: lessonData.dayNumber,
          title: lessonData.title,
          content: lessonData.content,
          verseReference: lessonData.verseReference,
          verseText: lessonData.verseText,
          questions: lessonData.questions,
          xpReward: lessonData.xpReward,
          status: "draft",
        });
      }

      await logAuditAction(req.user?.id, "create", "study_event", event.id, `Evento gerado por IA: ${event.title}`, req);
      
      res.status(201).json({
        event,
        lessonsCreated: generatedContent.lessons.length,
        message: `Evento "${event.title}" criado com ${generatedContent.lessons.length} lições`
      });
    } catch (error: any) {
      console.error("AI event generation error:", error);
      res.status(500).json({ message: error.message || "Erro ao gerar evento com IA" });
    }
  });

  // === ROTAS ADMIN - CARDS COLECIONÁVEIS ===

  // Listar todos os cards (admin)
  app.get("/api/admin/cards", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const cards = await storage.getAllCollectibleCards();
      res.json(convertImageUrlsArray(cards));
    } catch (error) {
      console.error("Get cards error:", error);
      res.status(500).json({ message: "Erro ao buscar cards" });
    }
  });

  // Criar novo card (admin)
  app.post("/api/admin/cards", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const validatedData = insertCollectibleCardSchema.parse(req.body);
      const card = await storage.createCollectibleCard(validatedData);
      await logAuditAction(req.user?.id, "create", "collectible_card", card.id, `Card criado: ${card.name}`, req);
      res.status(201).json(convertImageUrls(card));
    } catch (error) {
      console.error("Create card error:", error);
      res.status(500).json({ message: "Erro ao criar card" });
    }
  });

  // Atualizar card (admin)
  app.patch("/api/admin/cards/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      // Validate with dedicated update schema (strict mode rejects unknown fields)
      const validatedData = updateCollectibleCardSchema.parse(req.body);
      
      if (Object.keys(validatedData).length === 0) {
        return res.status(400).json({ message: "Nenhum campo valido para atualizar" });
      }
      
      const card = await storage.updateCollectibleCard(id, validatedData);
      if (!card) {
        return res.status(404).json({ message: "Card nao encontrado" });
      }
      await logAuditAction(req.user?.id, "update", "collectible_card", id, `Card atualizado: ${card.name}`, req);
      res.json(convertImageUrls(card));
    } catch (error: any) {
      if (isZodError(error)) {
        return res.status(400).json({ message: "Dados invalidos", errors: error.errors });
      }
      console.error("Update card error:", error);
      res.status(500).json({ message: "Erro ao atualizar card" });
    }
  });

  // Deletar card (admin)
  app.delete("/api/admin/cards/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      await logAuditAction(req.user?.id, "delete", "collectible_card", id, "Card removido", req);
      await storage.deleteCollectibleCard(id);
      res.json({ message: "Card removido com sucesso" });
    } catch (error) {
      console.error("Delete card error:", error);
      res.status(500).json({ message: "Erro ao remover card" });
    }
  });

  // === ROTAS MEMBROS - EVENTOS ESPECIAIS ===

  // OPTIMIZED: Listar eventos ativos para membros - batch confirmation and participant counts
  app.get("/api/study/events", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const events = await storage.getActiveStudyEvents();
      
      if (events.length === 0) {
        return res.json([]);
      }
      
      // OPTIMIZED: Batch fetch all confirmation counts, participant counts, and user progress in parallel
      const eventIds = events.map(e => e.id);
      const userId = req.user!.id;
      const [countsMap, participantCountsMap, userProgressMap] = await Promise.all([
        storage.getEventConfirmationCountsByEventIds(eventIds),
        storage.getEventParticipantsCountBatch(eventIds),
        storage.getUserEventProgressBatch(userId, eventIds)
      ]);
      
      const eventsWithCounts = events.map(event => {
        const progress = userProgressMap.get(event.id) || [];
        const hasProgress = progress.length > 0;
        return {
          ...event,
          confirmationCount: countsMap.get(event.id) || { members: 0, visitors: 0 },
          participantsCount: participantCountsMap.get(event.id) || 0,
          isParticipating: hasProgress,
        };
      });
      
      res.json(eventsWithCounts);
    } catch (error) {
      console.error("Get active events error:", error);
      res.status(500).json({ message: "Erro ao buscar eventos" });
    }
  });

  // Obter evento por ID com progresso do usuario - LIGHTWEIGHT (no content/questions)
  app.get("/api/study/events/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const event = await storage.getStudyEventById(id);
      // Accept active, published, completed, or ended events
      const validStatuses = ["active", "published", "completed", "ended"];
      if (!event || !validStatuses.includes(event.status)) {
        return res.status(404).json({ message: "Evento nao encontrado" });
      }
      // Parallel fetch for better performance
      const [progress, lessons] = await Promise.all([
        storage.getUserEventProgress(req.user!.id, id),
        storage.getStudyEventLessonsLightweight(id), // OPTIMIZED: excludes content/questions
      ]);
      res.json({ event, lessons, progress });
    } catch (error) {
      console.error("Get event details error:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes do evento" });
    }
  });

  // Obter licao de evento
  app.get("/api/study/events/:eventId/lessons/:dayNumber", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const dayNumber = parseInt(req.params.dayNumber);
      if (isNaN(eventId) || isNaN(dayNumber)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const lesson = await storage.getStudyEventLessonByDay(eventId, dayNumber);
      if (!lesson) {
        return res.status(404).json({ message: "Lição não encontrada" });
      }
      
      // Process questions to ensure correctIndex is properly set and typed
      if (lesson.questions && Array.isArray(lesson.questions)) {
        const processedQuestions = lesson.questions.map((q: any) => {
          // Handle nested content structure (like study units)
          const content = q.content || q;
          
          if (q.type === "multiple_choice" && (q.options || content.options)) {
            const options = q.options || content.options;
            // Convert correctAnswer to correctIndex if needed
            if (q.correctAnswer !== undefined && q.correctIndex === undefined) {
              q.correctIndex = Number(q.correctAnswer);
            } else if (content.correctIndex !== undefined && q.correctIndex === undefined) {
              q.correctIndex = Number(content.correctIndex);
            } else if (q.correctIndex === undefined) {
              q.correctIndex = 0;
            }
            q.correctIndex = Number(q.correctIndex);
            q.options = options;
            q.question = q.question || q.statement || content.question || content.statement || "";
            q.explanation = q.explanation || content.explanation || "";
            
            const correctAnswerText = q.options[q.correctIndex];
            
            // Then randomize
            const processed = randomizeMultipleChoiceAnswer(q);
            processed.correctIndex = Number(processed.correctIndex);
            
            return processed;
          }
          
          // Handle true_false type
          if (q.type === "true_false") {
            // Helper function to parse boolean from various formats
            // Must explicitly handle both true AND false encodings
            const parseBoolean = (value: any): boolean | null => {
              if (typeof value === 'boolean') return value;
              if (value === 1 || value === "1") return true;
              if (value === 0 || value === "0") return false;
              if (typeof value === 'string') {
                const lower = value.toLowerCase().trim();
                if (lower === 'true' || lower === 'verdadeiro') return true;
                if (lower === 'false' || lower === 'falso') return false;
              }
              return null;
            };
            
            // Normalize the isTrue value from multiple possible locations
            let isTrue: boolean | null = null;
            
            // Check q.isTrue first
            isTrue = parseBoolean(q.isTrue);
            
            // Then check content.isTrue
            if (isTrue === null) {
              isTrue = parseBoolean(content.isTrue);
            }
            
            // Check correctAnswer as fallback
            if (isTrue === null) {
              isTrue = parseBoolean(q.correctAnswer);
            }
            if (isTrue === null) {
              isTrue = parseBoolean(content.correctAnswer);
            }
            
            // Default to false if nothing found
            if (isTrue === null) {
              isTrue = false;
            }
            
            // Normalize the question structure
            const processed = {
              ...q,
              type: "true_false",
              question: q.question || q.statement || content.question || content.statement || "",
              statement: q.statement || content.statement || q.question || content.question || "",
              isTrue: isTrue,
              correctAnswer: isTrue, // Provide both for compatibility
              explanation: q.explanation || content.explanation || ""
            };
            
            return processed;
          }
          
          // Handle fill_blank type
          if (q.type === "fill_blank") {
            return {
              ...q,
              type: "fill_blank",
              question: q.question || q.sentence || content.question || content.sentence || "",
              correctAnswer: q.correctAnswer || content.correctAnswer || "",
              explanation: q.explanation || content.explanation || ""
            };
          }
          
          // Handle other types - keep original
          if (q.correctAnswer !== undefined && q.correctIndex === undefined) {
            q.correctIndex = Number(q.correctAnswer);
          }
          if (q.correctIndex !== undefined) {
            q.correctIndex = Number(q.correctIndex);
          }
          return q;
        });
        lesson.questions = processedQuestions;
      }
      
      const progress = await storage.getUserEventLessonProgress(req.user!.id, lesson.id);
      res.json({ lesson, progress });
    } catch (error) {
      console.error("Get event lesson error:", error);
      res.status(500).json({ message: "Erro ao buscar lição" });
    }
  });

  // Completar licao de evento
  app.post("/api/study/events/:eventId/lessons/:lessonId/complete", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const lessonId = parseInt(req.params.lessonId);
      if (isNaN(eventId) || isNaN(lessonId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const { score, totalQuestions, correctAnswers, usedHints } = req.body;
      
      // Check if lesson was already completed (prevent duplicate XP)
      const existingProgress = await storage.getUserEventLessonProgress(req.user!.id, lessonId);
      if (existingProgress?.completed) {
        return res.json(existingProgress);
      }
      
      // Event lesson XP: Estude (30) + Medite (30) + Responda (10 per correct, max 50)
      // Total max = 30 + 30 + 50 = 110 XP per lesson
      const XP_ESTUDE = 30;
      const XP_MEDITE = 30;
      const XP_PER_CORRECT = 10;
      const MAX_RESPONDA_XP = 50;
      const respondaXp = Math.min((correctAnswers || 0) * XP_PER_CORRECT, MAX_RESPONDA_XP);
      const totalXpEarned = XP_ESTUDE + XP_MEDITE + respondaXp;
      
      // Salvar progresso
      const progress = await storage.saveUserEventProgress({
        userId: req.user!.id,
        eventId,
        lessonId,
        completed: true,
        score: score || 0,
        totalQuestions: totalQuestions || 0,
        correctAnswers: correctAnswers || 0,
        usedHints: usedHints || false,
        xpEarned: totalXpEarned,
        completedAt: new Date(),
      });
      
      // Add event XP to user profile (counts for general and annual ranking, NOT revista/season)
      // addEventXp is idempotent - it won't add XP if already awarded for this lesson
      await storage.addEventXp(req.user!.id, totalXpEarned, eventId, lessonId);
      
      // Increment streak for event lessons too (same as magazine lessons)
      // This ensures daily streak is counted for ALL types of lessons
      try {
        await storage.incrementStreak(req.user!.id);
      } catch (streakError) {
        console.error("Error incrementing streak for event lesson:", streakError);
      }
      
      // After completing a lesson, check if subsequent days should be unlocked
      // This handles the case where past days weren't unlocked yet (e.g., user started late)
      await releaseEventLessonsForCurrentDay(eventId);

      // Verificar se completou todas as licoes do evento
      let cardEarned = null;
      const event = await storage.getStudyEventById(eventId);
      if (event && event.cardId) {
        const allProgress = await storage.getUserEventProgress(req.user!.id, eventId);
        const completedLessons = allProgress.filter(p => p.completed).length;
        const eventLessons = await storage.getStudyEventLessons(eventId);
        
        if (completedLessons === eventLessons.length) {
          // Calcular performance media
          const totalCorrect = allProgress.reduce((sum, p) => sum + (p.correctAnswers || 0), 0);
          const totalQs = allProgress.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
          const avgPerformance = totalQs > 0 ? (totalCorrect / totalQs) * 100 : 0;
          const anyHints = allProgress.some(p => p.usedHints);
          
          // Calcular raridade e dar o card
          const rarity = calculateCardRarity(avgPerformance, anyHints);
          const userCard = await storage.awardUserCard({
            userId: req.user!.id,
            cardId: event.cardId,
            rarity,
            sourceType: "event",
            sourceId: eventId,
            performance: avgPerformance,
          });
          
          // Get full card details to return to client
          if (userCard) {
            const cardDetails = await storage.getCollectibleCardById(event.cardId);
            cardEarned = {
              ...userCard,
              card: cardDetails,
              rarity,
            };
          }
        }
      }

      res.json({ 
        ...progress, 
        cardEarned,
        xpEarned: totalXpEarned,
        correctAnswers: correctAnswers || 0,
        totalQuestions: totalQuestions || 0,
      });
    } catch (error) {
      console.error("Complete event lesson error:", error);
      res.status(500).json({ message: "Erro ao completar licao" });
    }
  });

  // Registrar participação em evento (chamado quando membro clica em "Estude")
  app.post("/api/study/events/:eventId/participate", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const userId = req.user!.id;
      
      // Register participation (idempotent - won't duplicate if already registered)
      const success = await storage.registerEventParticipant(userId, eventId);
      
      if (!success) {
        console.error(`[Event Participate] Failed to register user ${userId} in event ${eventId}`);
        return res.status(500).json({ success: false, message: "Falha ao registrar participação" });
      }
      
      console.log(`[Event Participate] User ${userId} registered as participant in event ${eventId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Register event participation error:", error);
      res.status(500).json({ success: false, message: "Erro ao registrar participação" });
    }
  });

  // === ROTAS MEMBROS - MEUS CARDS ===

  // OPTIMIZED: Listar cards do usuario com detalhes - batch query
  app.get("/api/study/cards", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userCards = await storage.getUserCards(req.user!.id);
      
      if (userCards.length === 0) {
        return res.json([]);
      }
      
      // Batch fetch all card details at once
      const cardIds = [...new Set(userCards.map(uc => uc.cardId))];
      const cardsMap = await storage.getCollectibleCardsByIds(cardIds);
      
      // Build response with O(1) lookups
      const cardsWithDetails = userCards.map(userCard => {
        const card = cardsMap.get(userCard.cardId);
        return {
          ...userCard,
          card: card ? convertImageUrls(card) : null,
        };
      });
      
      res.json(cardsWithDetails);
    } catch (error) {
      console.error("Get user cards error:", error);
      res.status(500).json({ message: "Erro ao buscar seus cards" });
    }
  });

  // Obter detalhes de um card do usuario
  app.get("/api/study/cards/:cardId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cardId = parseInt(req.params.cardId);
      if (isNaN(cardId)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      const userCard = await storage.getUserCard(req.user!.id, cardId);
      if (!userCard) {
        return res.status(404).json({ message: "Card nao encontrado" });
      }
      const cardDetails = await storage.getCollectibleCardById(cardId);
      res.json({ ...userCard, card: cardDetails ? convertImageUrls(cardDetails) : null });
    } catch (error) {
      console.error("Get user card error:", error);
      res.status(500).json({ message: "Erro ao buscar card" });
    }
  });

  // Listar todos os cards disponiveis (catalogo)
  app.get("/api/study/cards/catalog", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const allCards = await storage.getActiveCollectibleCards();
      const userCards = await storage.getUserCards(req.user!.id);
      const userCardIds = userCards.map(c => c.cardId);
      
      const catalog = allCards.map(card => ({
        ...card,
        owned: userCardIds.includes(card.id),
        userRarity: userCards.find(uc => uc.cardId === card.id)?.rarity || null,
      }));
      
      res.json(catalog);
    } catch (error) {
      console.error("Get cards catalog error:", error);
      res.status(500).json({ message: "Erro ao buscar catalogo" });
    }
  });

  // ==================== SHOP ROUTES - ADMIN (MARKETING) ====================

  // Listar categorias da loja (admin) - retorna URLs para imagens
  app.get("/api/admin/shop/categories", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      // Use Light version to avoid loading Base64 from database
      const categories = await storage.getShopCategoriesLight();
      const categoryIds = categories.map(c => c.id);
      // Check which categories have images
      const hasImageMap = await storage.getShopCategoriesWithImageCheck(categoryIds);
      
      // Return URLs instead of base64 for display
      const categoriesWithUrls = categories.map(cat => ({
        ...cat,
        imageData: hasImageMap.get(cat.id) ? `/api/shop/images/category/${cat.id}` : null,
        hasImage: hasImageMap.get(cat.id) || false,
      }));
      res.json(categoriesWithUrls);
    } catch (error) {
      console.error("Get shop categories error:", error);
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  // Criar categoria (admin) - suporta imageData
  app.post("/api/admin/shop/categories", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const { name, imageData } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "Nome obrigatório" });
      }
      const category = await storage.createShopCategory({ 
        name, 
        imageData: imageData || null,
        isDefault: false 
      });
      // Return URL instead of base64
      res.json({
        ...category,
        imageData: category.imageData ? `/api/shop/images/category/${category.id}` : null,
        hasImage: !!category.imageData,
      });
    } catch (error) {
      console.error("Create shop category error:", error);
      res.status(500).json({ message: "Erro ao criar categoria" });
    }
  });

  // Atualizar categoria (admin)
  app.patch("/api/admin/shop/categories/:id", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { name, imageData } = req.body;
      const updateData: { name?: string; imageData?: string | null } = {};
      
      if (name !== undefined) updateData.name = name;
      if (imageData !== undefined) updateData.imageData = imageData;
      
      const category = await storage.updateShopCategory(id, updateData);
      if (!category) {
        return res.status(404).json({ message: "Categoria não encontrada" });
      }
      
      // Return URL instead of base64
      res.json({
        ...category,
        imageData: category.imageData ? `/api/shop/images/category/${category.id}` : null,
        hasImage: !!category.imageData,
      });
    } catch (error) {
      console.error("Update shop category error:", error);
      res.status(500).json({ message: "Erro ao atualizar categoria" });
    }
  });

  // Deletar categoria (admin)
  app.delete("/api/admin/shop/categories/:id", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      await storage.deleteShopCategory(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shop category error:", error);
      res.status(500).json({ message: "Erro ao deletar categoria" });
    }
  });

  // Listar itens da loja (admin - todos os itens) - otimizado com versões Light (sem Base64)
  app.get("/api/admin/shop/items", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const [items, categories] = await Promise.all([
        storage.getShopItemsLight(false),
        storage.getShopCategories()
      ]);
      
      if (items.length === 0) {
        return res.json([]);
      }
      
      const categoryMap = new Map(categories.map(c => [c.id, c]));
      const itemIds = items.map(item => item.id);
      
      const [imagesMap, sizesMap] = await Promise.all([
        storage.getShopItemImagesByItemIdsLight(itemIds),
        storage.getShopItemSizesByItemIds(itemIds)
      ]);
      
      // Get items that have banner images
      const bannerCheck = await storage.getShopItemsWithBannerCheck(itemIds);
      const hasBannerMap = new Map(bannerCheck.map(b => [b.id, b.hasBanner]));
      
      const itemsWithDetails = items.map(item => {
        const hasBanner = hasBannerMap.get(item.id) || false;
        return {
          ...item,
          category: categoryMap.get(item.categoryId) || null,
          images: (imagesMap.get(item.id) || []).map(img => ({
            ...img,
            imageUrl: `/api/shop/images/item/${img.id}`,
            imageData: `/api/shop/images/item/${img.id}`, // Maintain backward compatibility
          })),
          sizes: sizesMap.get(item.id) || [],
          hasBanner,
          bannerImageData: hasBanner ? `/api/shop/images/banner/${item.id}` : null,
          bannerImageUrl: hasBanner ? `/api/shop/images/banner/${item.id}` : null,
        };
      });
      
      res.json(itemsWithDetails);
    } catch (error) {
      console.error("Get admin shop items error:", error);
      res.status(500).json({ message: "Erro ao buscar itens" });
    }
  });

  // Criar item da loja (admin)
  app.post("/api/admin/shop/items", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const { name, description, price, categoryId, genderType, hasSize, isAvailable, isPreOrder, allowInstallments, maxInstallments, stockQuantity } = req.body;
      
      if (!name || price === undefined || !categoryId || !genderType) {
        return res.status(400).json({ message: "Campos obrigatórios faltando" });
      }
      
      const item = await storage.createShopItem({
        name,
        description: description || null,
        price: Number(price),
        categoryId: Number(categoryId),
        genderType,
        hasSize: hasSize ?? true,
        isAvailable: isAvailable ?? true,
        isPreOrder: isPreOrder ?? false,
        isPublished: false,
        allowInstallments: allowInstallments ?? false,
        maxInstallments: allowInstallments ? (Number(maxInstallments) || 3) : 1,
        stockQuantity: stockQuantity === null || stockQuantity === '' || stockQuantity === undefined ? null : Number(stockQuantity),
      });
      
      res.json(item);
    } catch (error) {
      console.error("Create shop item error:", error);
      res.status(500).json({ message: "Erro ao criar item" });
    }
  });

  // Atualizar item da loja (admin)
  app.patch("/api/admin/shop/items/:id", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { name, description, price, categoryId, genderType, hasSize, isAvailable, isPreOrder, isFeatured, featuredOrder, bannerImageData, allowInstallments, maxInstallments, stockQuantity } = req.body;
      
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (price !== undefined) updates.price = Number(price);
      if (categoryId !== undefined) updates.categoryId = Number(categoryId);
      if (genderType !== undefined) updates.genderType = genderType;
      if (hasSize !== undefined) updates.hasSize = hasSize;
      if (isAvailable !== undefined) updates.isAvailable = isAvailable;
      if (isPreOrder !== undefined) updates.isPreOrder = isPreOrder;
      if (isFeatured !== undefined) updates.isFeatured = isFeatured;
      if (featuredOrder !== undefined) updates.featuredOrder = Number(featuredOrder);
      if (bannerImageData !== undefined) updates.bannerImageData = bannerImageData;
      if (allowInstallments !== undefined) updates.allowInstallments = allowInstallments;
      if (maxInstallments !== undefined) updates.maxInstallments = Number(maxInstallments);
      if (stockQuantity !== undefined) updates.stockQuantity = stockQuantity === null || stockQuantity === '' ? null : Number(stockQuantity);
      
      const item = await storage.updateShopItem(id, updates);
      if (!item) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Update shop item error:", error);
      res.status(500).json({ message: "Erro ao atualizar item" });
    }
  });

  // Publicar item da loja e enviar notificações (admin)
  app.post("/api/admin/shop/items/:id/publish", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const item = await storage.getShopItemById(id);
      if (!item) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      
      // Check if already published
      if (item.isPublished) {
        return res.status(400).json({ message: "Produto já foi publicado" });
      }
      
      // Mark as published and available
      await storage.updateShopItem(id, { isPublished: true, isAvailable: true });
      
      // Get product image (prefer banner, then first gallery image)
      let productImageBase64: string | null = item.bannerImageData;
      if (!productImageBase64) {
        const images = await storage.getShopItemImages(id);
        if (images.length > 0) {
          productImageBase64 = images[0].imageData;
        }
      }
      
      // Get base URL from request
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'] || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      // Get all members for notifications (push for everyone, email for those with addresses)
      const allMembers = await storage.getAllMembers();
      const membersWithEmail = allMembers.filter(m => m.email);
      
      let pushSent = 0;
      
      // Product identifier for URLs (use ID since slug doesn't exist)
      const productIdentifier = `${item.id}`;
      
      // Send push and in-app notifications to ALL members (regardless of active status or email)
      for (const member of allMembers) {
        try {
          // Create in-app notification
          await storage.createNotification({
            userId: member.id,
            type: 'shop_new_product',
            title: '🛍️ Novidade na Loja!',
            body: `${item.name} agora disponivel na loja!`,
            data: JSON.stringify({ itemId: item.id }),
          });
          
          // Send push notification
          await sendPushToUser(member.id, {
            title: '🛍️ Novidade na Loja!',
            body: `${item.name} - Confira agora!`,
            url: `/loja/produto/${productIdentifier}`,
            tag: `shop-product-${item.id}`,
            icon: '/logo.png',
          });
          pushSent++;
        } catch (pushError) {
          console.error(`[Shop] Push error for user ${member.id}:`, pushError);
        }
      }
      
      // Send emails only to members with email addresses with rate limiting (Resend: 2 req/s max)
      let emailsSent = 0;
      for (let i = 0; i < membersWithEmail.length; i++) {
        const member = membersWithEmail[i];
        try {
          const result = await sendNewProductEmail(
            member.email!,
            member.fullName || 'Membro',
            item.name,
            productIdentifier,
            productImageBase64,
            item.price,
            item.description,
            baseUrl
          );
          if (result) emailsSent++;
        } catch (err) {
          console.error(`[Shop] Email error for ${member.email}:`, err);
        }
        // Rate limiting: wait between emails
        if (i < membersWithEmail.length - 1) {
          await delay(EMAIL_RATE_LIMIT_DELAY);
        }
      }
      
      console.log(`[Shop] Product ${item.name} published. Push: ${pushSent}, Emails sent: ${emailsSent}/${membersWithEmail.length}`);
      
      res.json({ 
        success: true, 
        message: `Produto publicado! ${pushSent} notificações enviadas, ${emailsSent} emails enviados.`,
        pushSent,
        emailsSent
      });
    } catch (error) {
      console.error("Publish shop item error:", error);
      res.status(500).json({ message: "Erro ao publicar item" });
    }
  });

  // Excluir item da loja (admin)
  app.delete("/api/admin/shop/items/:id", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      await storage.deleteShopItem(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shop item error:", error);
      res.status(500).json({ message: "Erro ao excluir item" });
    }
  });

  // Upload de imagem do item (admin)
  app.post("/api/admin/shop/items/:id/images", authenticateToken, requireMarketing, imageUpload.array("images", 10), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const item = await storage.getShopItemById(id);
      if (!item) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Pelo menos uma imagem é obrigatória" });
      }
      
      if (files.length > 10) {
        return res.status(400).json({ message: "Máximo de 10 imagens por upload" });
      }
      
      const gender = req.body.gender || "unissex";
      
      const existingImages = await storage.getShopItemImages(id);
      let sortOrder = existingImages.length;
      
      const createdImages = [];
      
      // Process images in order (respects selection order from frontend)
      for (const file of files) {
        const processedImage = await sharp(file.buffer)
          .rotate() // Auto-rotate based on EXIF orientation
          .jpeg({ quality: 95 })
          .toBuffer();
        
        let imageDataUrl: string;
        
        // Upload to R2 if configured, otherwise use Base64
        if (isR2Configured()) {
          const r2Url = await uploadToR2(processedImage, 'image/jpeg', 'shop');
          imageDataUrl = r2Url;
        } else {
          imageDataUrl = `data:image/jpeg;base64,${processedImage.toString("base64")}`;
        }
        
        const image = await storage.createShopItemImage({
          itemId: id,
          gender,
          imageData: imageDataUrl,
          sortOrder,
        });
        
        createdImages.push(image);
        sortOrder++;
      }
      
      res.json(createdImages);
    } catch (error) {
      console.error("Upload shop item image error:", error);
      res.status(500).json({ message: "Erro ao fazer upload da imagem" });
    }
  });

  // Excluir imagem do item (admin)
  app.delete("/api/admin/shop/items/:itemId/images/:imageId", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const imageId = parseInt(req.params.imageId);
      if (isNaN(imageId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      await storage.deleteShopItemImage(imageId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete shop item image error:", error);
      res.status(500).json({ message: "Erro ao excluir imagem" });
    }
  });

  // Reordenar imagens do item (admin)
  app.patch("/api/admin/shop/items/:itemId/images/reorder", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { imageIds } = req.body;
      
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      if (!Array.isArray(imageIds) || imageIds.length === 0) {
        return res.status(400).json({ message: "Lista de IDs de imagens inválida" });
      }
      
      // Validate all IDs are numbers
      const validImageIds = imageIds.filter(id => typeof id === 'number' && !isNaN(id));
      if (validImageIds.length !== imageIds.length) {
        return res.status(400).json({ message: "IDs de imagens devem ser números válidos" });
      }
      
      // Verify all images belong to this item
      const existingImages = await storage.getShopItemImages(itemId);
      const existingImageMap = new Map(existingImages.map(img => [img.id, img]));
      
      // Verify all IDs belong to the item and are from the same gender
      let targetGender: string | null = null;
      const seenIds = new Set<number>();
      for (const id of validImageIds) {
        // Check for duplicates
        if (seenIds.has(id)) {
          return res.status(400).json({ message: "IDs de imagens duplicados não são permitidos" });
        }
        seenIds.add(id);
        
        const img = existingImageMap.get(id);
        if (!img) {
          return res.status(400).json({ message: "Uma ou mais imagens não pertencem a este produto" });
        }
        if (targetGender === null) {
          targetGender = img.gender;
        } else if (img.gender !== targetGender) {
          return res.status(400).json({ message: "Todas as imagens devem ser do mesmo gênero" });
        }
      }
      
      // Ensure all images of the target gender are included
      if (targetGender) {
        const genderImageCount = existingImages.filter(img => img.gender === targetGender).length;
        if (validImageIds.length !== genderImageCount) {
          return res.status(400).json({ message: "Todas as imagens do gênero devem ser incluídas na reordenação" });
        }
      }
      
      await storage.reorderShopItemImages(itemId, validImageIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Reorder shop item images error:", error);
      res.status(500).json({ message: "Erro ao reordenar imagens" });
    }
  });

  // Upload de imagem de banner do item (admin) - para carrossel da home
  app.post("/api/admin/shop/items/:id/banner", authenticateToken, requireMarketing, imageUpload.single("bannerImage"), async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const item = await storage.getShopItemById(id);
      if (!item) {
        return res.status(404).json({ message: "Item nao encontrado" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "Imagem obrigatoria" });
      }
      
      // Process banner image - high quality 1:1 for home carousel
      const processedImage = await sharp(req.file.buffer)
        .rotate()
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      
      let imageDataUrl: string;
      
      // Upload to R2 if configured, otherwise use Base64
      if (isR2Configured()) {
        const r2Url = await uploadToR2(processedImage, 'image/jpeg', 'banners');
        imageDataUrl = r2Url;
      } else {
        imageDataUrl = `data:image/jpeg;base64,${processedImage.toString("base64")}`;
      }
      
      const updatedItem = await storage.updateShopItem(id, { bannerImageData: imageDataUrl });
      res.json(updatedItem);
    } catch (error) {
      console.error("Upload shop item banner error:", error);
      res.status(500).json({ message: "Erro ao fazer upload do banner" });
    }
  });

  // Excluir imagem de banner do item (admin)
  app.delete("/api/admin/shop/items/:id/banner", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const item = await storage.getShopItemById(id);
      if (!item) {
        return res.status(404).json({ message: "Item nao encontrado" });
      }
      
      const updatedItem = await storage.updateShopItem(id, { bannerImageData: null });
      res.json(updatedItem);
    } catch (error) {
      console.error("Delete shop item banner error:", error);
      res.status(500).json({ message: "Erro ao excluir banner" });
    }
  });

  // Adicionar tamanho ao item (admin)
  app.post("/api/admin/shop/items/:id/sizes", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { gender, size } = req.body;
      if (!gender || !size) {
        return res.status(400).json({ message: "Gênero e tamanho obrigatórios" });
      }
      
      const existingSizes = await storage.getShopItemSizes(id);
      const sortOrder = existingSizes.length;
      
      const newSize = await storage.createShopItemSize({
        itemId: id,
        gender,
        size,
        sortOrder,
      });
      
      res.json(newSize);
    } catch (error) {
      console.error("Add shop item size error:", error);
      res.status(500).json({ message: "Erro ao adicionar tamanho" });
    }
  });

  // Upsert size chart dimensions (admin)
  app.post("/api/admin/shop/items/:id/size-charts", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { gender, size, width, length, sleeve, shoulder } = req.body;
      if (!gender || !size) {
        return res.status(400).json({ message: "Genero e tamanho obrigatorios" });
      }
      
      const chart = await storage.upsertShopItemSizeChart(id, gender, size, {
        width: width !== undefined ? Number(width) : null,
        length: length !== undefined ? Number(length) : null,
        sleeve: sleeve !== undefined ? Number(sleeve) : null,
        shoulder: shoulder !== undefined ? Number(shoulder) : null,
      });
      
      res.json(chart);
    } catch (error) {
      console.error("Upsert size chart error:", error);
      res.status(500).json({ message: "Erro ao salvar dimensoes do tamanho" });
    }
  });

  // Get size charts for an item (admin)
  app.get("/api/admin/shop/items/:id/size-charts", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const charts = await storage.getShopItemSizeCharts(id);
      res.json(charts);
    } catch (error) {
      console.error("Get size charts error:", error);
      res.status(500).json({ message: "Erro ao buscar dimensoes" });
    }
  });

  // Listar pedidos da loja (admin/marketing)
  // Marketing needs to see order values for logistics management
  app.get("/api/admin/shop/orders", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string | undefined;
      const orders = await storage.getShopOrders(status ? { status } : undefined);
      
      if (orders.length === 0) {
        return res.json([]);
      }
      
      const orderIds = orders.map(o => o.id);
      const userIds = Array.from(new Set(orders.map(o => o.userId)));
      
      const [orderItemsMap, usersMap] = await Promise.all([
        storage.getShopOrderItemsByOrderIds(orderIds),
        storage.getUsersByIds(userIds),
      ]);
      
      const allItems = Array.from(orderItemsMap.values()).flat();
      const itemProductIds = Array.from(new Set(allItems.map(i => i.itemId)));
      const products = await storage.getShopItemsByIds(itemProductIds);
      const productsMap = new Map(products.map(p => [p.id, p]));
      
      const ordersWithDetails = orders.map(order => {
        const items = orderItemsMap.get(order.id) || [];
        const user = usersMap.get(order.userId);
        
        const itemsWithProduct = items.map(item => {
          const product = productsMap.get(item.itemId);
          return { 
            ...item, 
            unitPrice: item.unitPrice,
            product: product ? {
              id: product.id,
              name: product.name,
              price: product.price,
            } : null 
          };
        });
        
        // Extract manual customer name from observation if present
        let manualCustomerName: string | null = null;
        if (order.observation?.includes('Pedido manual - Cliente:')) {
          const match = order.observation.match(/Pedido manual - Cliente:\s*(.+)/);
          if (match) {
            manualCustomerName = match[1].trim();
          }
        }
        
        return {
          ...order,
          totalAmount: order.totalAmount || 0,
          manualCustomerName,
          user: user ? { 
            id: user.id, 
            fullName: user.fullName, 
            email: user.email,
          } : null,
          items: itemsWithProduct,
        };
      });
      
      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Get admin shop orders error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  // Atualizar status do pedido (admin)
  app.patch("/api/admin/shop/orders/:id/status", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { orderStatus } = req.body;
      if (!orderStatus) {
        return res.status(400).json({ message: "Status obrigatório" });
      }
      
      const validStatuses = ["awaiting_payment", "paid", "producing", "ready", "delivered", "cancelled"];
      if (!validStatuses.includes(orderStatus)) {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      // Get current order to validate status transition
      const currentOrder = await storage.getShopOrderById(id);
      if (!currentOrder) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      // Security: Prevent changing from paid/producing/ready/delivered to awaiting_payment
      const paidStatuses = ["paid", "producing", "ready", "delivered"];
      if (paidStatuses.includes(currentOrder.orderStatus) && orderStatus === "awaiting_payment") {
        return res.status(400).json({ message: "Não é permitido reverter um pedido pago para aguardando pagamento" });
      }
      
      const order = await storage.updateShopOrder(id, { orderStatus });
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      // Enviar notificação quando pedido está pronto para retirada
      if (orderStatus === 'ready') {
        try {
          const orderItems = await storage.getShopOrderItems(id);
          const itemNames: string[] = [];
          for (const item of orderItems.slice(0, 2)) {
            const product = await storage.getShopItemById(item.itemId);
            itemNames.push(product?.name || 'Produto');
          }
          const firstName = itemNames[0] || 'Produto';
          const itemsText = orderItems.length > 1 ? `${firstName} e mais ${orderItems.length - 1}` : firstName;
          
          await storage.createNotification({
            userId: order.userId,
            type: 'order_ready',
            title: '📦 Pedido Pronto para Retirada',
            body: `Seu pedido #${order.orderCode} (${itemsText}) está pronto para retirada na igreja!`,
            data: JSON.stringify({ orderId: order.id, orderCode: order.orderCode }),
          });
          
          await sendPushToUser(order.userId, {
            title: '📦 Pedido Pronto para Retirada',
            body: `Seu pedido #${order.orderCode} está pronto para retirada na igreja!`,
            url: '/study/meus-pedidos',
            tag: `order-ready-${order.id}`,
            icon: '/logo.png',
          });
        } catch (notifError) {
          console.error('Error sending order ready notification:', notifError);
        }
      }
      
      res.json(order);
    } catch (error) {
      console.error("Update shop order status error:", error);
      res.status(500).json({ message: "Erro ao atualizar status" });
    }
  });

  // Atualizar status de múltiplos pedidos em lote (admin)
  app.patch("/api/admin/shop/orders/bulk-status", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const { orderIds, orderStatus } = req.body;
      
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ message: "IDs de pedidos obrigatórios" });
      }
      
      if (!orderStatus) {
        return res.status(400).json({ message: "Status obrigatório" });
      }
      
      const validStatuses = ["awaiting_payment", "paid", "producing", "ready", "delivered", "cancelled"];
      if (!validStatuses.includes(orderStatus)) {
        return res.status(400).json({ message: "Status inválido" });
      }
      
      // Security: For bulk updates, if target is awaiting_payment, check all orders
      const paidStatuses = ["paid", "producing", "ready", "delivered"];
      if (orderStatus === "awaiting_payment") {
        for (const orderId of orderIds) {
          const currentOrder = await storage.getShopOrderById(orderId);
          if (currentOrder && paidStatuses.includes(currentOrder.orderStatus)) {
            return res.status(400).json({ 
              message: `Pedido ${currentOrder.orderCode || orderId} já foi pago e não pode ser revertido para aguardando pagamento` 
            });
          }
        }
      }
      
      const updatedOrders = [];
      for (const orderId of orderIds) {
        const order = await storage.updateShopOrder(orderId, { orderStatus });
        if (order) {
          updatedOrders.push(order);
          
          // Enviar notificação quando pedido está pronto para retirada
          if (orderStatus === 'ready') {
            try {
              const orderItems = await storage.getShopOrderItems(orderId);
              const itemNames: string[] = [];
              for (const item of orderItems.slice(0, 2)) {
                const product = await storage.getShopItemById(item.itemId);
                itemNames.push(product?.name || 'Produto');
              }
              const firstName = itemNames[0] || 'Produto';
              const itemsText = orderItems.length > 1 ? `${firstName} e mais ${orderItems.length - 1}` : firstName;
              
              await storage.createNotification({
                userId: order.userId,
                type: 'order_ready',
                title: '📦 Pedido Pronto para Retirada',
                body: `Seu pedido #${order.orderCode} (${itemsText}) está pronto para retirada na igreja!`,
                data: JSON.stringify({ orderId: order.id, orderCode: order.orderCode }),
              });
              
              await sendPushToUser(order.userId, {
                title: '📦 Pedido Pronto para Retirada',
                body: `Seu pedido #${order.orderCode} está pronto para retirada na igreja!`,
                url: '/study/meus-pedidos',
                tag: `order-ready-${order.id}`,
                icon: '/logo.png',
              });
            } catch (notifError) {
              console.error('Error sending order ready notification:', notifError);
            }
          }
        }
      }
      
      res.json({ updated: updatedOrders.length, orders: updatedOrders });
    } catch (error) {
      console.error("Bulk update shop order status error:", error);
      res.status(500).json({ message: "Erro ao atualizar status em lote" });
    }
  });

  // Buscar membros para criação manual de pedidos (marketing) - otimizado com projeção
  app.get("/api/admin/shop/members", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const simplifiedMembers = await storage.getMembersBasicInfo();
      res.json(simplifiedMembers);
    } catch (error) {
      console.error("Get shop members error:", error);
      res.status(500).json({ message: "Erro ao buscar membros" });
    }
  });

  // Criar pedido manualmente (admin/marketing)
  const manualOrderSchema = z.object({
    memberId: z.number().optional(),
    manualName: z.string().optional(),
    items: z.array(z.object({
      itemId: z.number(),
      quantity: z.number().min(1).default(1),
      size: z.string().optional(),
      gender: z.string().optional(),
    })).min(1, "Pelo menos um item e obrigatorio"),
    installmentCount: z.number().min(1).max(12).default(1),
  }).refine(data => data.memberId || data.manualName, {
    message: "Selecione um membro ou informe um nome",
  });

  app.post("/api/admin/shop/orders/manual", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const parseResult = manualOrderSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: parseResult.error.errors[0]?.message || "Dados invalidos" 
        });
      }
      
      const { memberId, manualName, items, installmentCount } = parseResult.data;
      
      // Validate items and calculate total
      let totalAmount = 0;
      const validatedItems: Array<{
        itemId: number;
        quantity: number;
        size: string | null;
        gender: string | null;
        unitPrice: number;
      }> = [];
      
      for (const item of items) {
        const shopItem = await storage.getShopItemById(item.itemId);
        if (!shopItem) {
          return res.status(400).json({ message: `Produto ${item.itemId} nao encontrado` });
        }
        
        // Validate size if product has sizes
        if (shopItem.sizes && shopItem.sizes.length > 0 && !item.size) {
          return res.status(400).json({ message: `Tamanho obrigatorio para ${shopItem.name}` });
        }
        
        // Validate gender if product requires it
        if (shopItem.hasGenderOption && !item.gender) {
          return res.status(400).json({ message: `Modelo (M/F) obrigatorio para ${shopItem.name}` });
        }
        
        const quantity = item.quantity || 1;
        const unitPrice = shopItem.price;
        totalAmount += unitPrice * quantity;
        
        validatedItems.push({
          itemId: item.itemId,
          quantity,
          size: item.size || null,
          gender: item.gender || null,
          unitPrice,
        });
      }
      
      // Generate order code
      const year = new Date().getFullYear();
      const orders = await storage.getShopOrders();
      const yearOrders = orders.filter(o => o.orderCode?.includes(`${year}`));
      const nextNumber = String(yearOrders.length + 1).padStart(4, '0');
      const orderCode = `#${year}-${nextNumber}`;
      
      // If using memberId, verify member exists
      let userId = memberId;
      let memberRecord = null;
      if (memberId) {
        memberRecord = await storage.getUserById(memberId);
        if (!memberRecord) {
          return res.status(400).json({ message: "Membro nao encontrado" });
        }
      }
      
      // For external customers without memberId, use the system admin user
      let orderUserId = userId;
      if (!orderUserId) {
        const admins = await storage.getAdminUsers();
        const systemAdmin = admins.find(a => a.isAdmin === true) || admins[0];
        if (!systemAdmin) {
          return res.status(500).json({ message: "Administrador do sistema nao encontrado" });
        }
        orderUserId = systemAdmin.id;
      }
      
      // Create order
      const order = await storage.createShopOrder({
        orderCode,
        userId: orderUserId,
        totalAmount,
        observation: manualName ? `Pedido manual - Cliente: ${manualName}` : 'Pedido criado manualmente',
        paymentStatus: "pending",
        orderStatus: "awaiting_payment",
        installmentCount: installmentCount || 1,
      });
      
      // Create order items
      for (const oi of validatedItems) {
        await storage.createShopOrderItem({
          orderId: order.id,
          itemId: oi.itemId,
          quantity: oi.quantity,
          gender: oi.gender,
          size: oi.size,
          unitPrice: oi.unitPrice,
        });
      }
      
      // Create installments if applicable
      const finalInstallmentCount = installmentCount || 1;
      if (finalInstallmentCount > 1) {
        const installmentAmount = Math.floor(totalAmount / finalInstallmentCount);
        const remainder = totalAmount - (installmentAmount * finalInstallmentCount);
        
        for (let i = 1; i <= finalInstallmentCount; i++) {
          const amount = i === 1 ? installmentAmount + remainder : installmentAmount;
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i);
          dueDate.setDate(10);
          
          await storage.createShopInstallment({
            orderId: order.id,
            installmentNumber: i,
            amount,
            dueDate,
            status: 'pending',
          });
        }
      }
      
      // Create treasury entry for all manual orders (member or external customer)
      const settings = await storage.getTreasurySettings(new Date().getFullYear());
      if (settings) {
        const treasuryEntry = await storage.createTreasuryEntry({
          userId: memberId || null,
          externalPayerName: manualName || null,
          category: 'loja',
          referenceYear: new Date().getFullYear(),
          referenceMonth: new Date().getMonth() + 1,
          type: 'income',
          description: `Pedido ${orderCode}${manualName ? ` - Cliente: ${manualName}` : ''}`,
          amount: totalAmount,
          paymentMethod: 'manual',
          paymentStatus: 'pending',
          orderId: order.id,
        });
        
        // Link entry to order
        await storage.updateShopOrder(order.id, { entryId: treasuryEntry.id });
      }
      
      console.log(`[Shop] Manual order ${orderCode} created by ${req.user!.fullName}`);
      
      res.json({ 
        success: true, 
        order,
        message: `Pedido ${orderCode} criado com sucesso!`
      });
    } catch (error) {
      console.error("Create manual order error:", error);
      res.status(500).json({ message: "Erro ao criar pedido manual" });
    }
  });

  // ==================== SHOP INSTALLMENTS - ADMIN ====================

  // Listar parcelas de um pedido
  app.get("/api/admin/shop/orders/:orderId/installments", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const installments = await storage.getShopInstallments(orderId);
      res.json(installments);
    } catch (error) {
      console.error("Get shop installments error:", error);
      res.status(500).json({ message: "Erro ao buscar parcelas" });
    }
  });

  // Listar parcelas do membro (área do membro)
  app.get("/api/shop/meus-pedidos/:orderId/installments", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await storage.getShopOrderById(orderId);
      
      if (!order || order.userId !== req.user!.id) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      const installments = await storage.getShopInstallments(orderId);
      res.json(installments);
    } catch (error) {
      console.error("Get member shop installments error:", error);
      res.status(500).json({ message: "Erro ao buscar parcelas" });
    }
  });

  // ==================== PROMO CODES - ADMIN ====================

  // Listar códigos promocionais
  app.get("/api/admin/shop/promo-codes", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const codes = await storage.getPromoCodes();
      const categories = await storage.getShopCategories();
      const codesWithCategory = codes.map(code => ({
        ...code,
        category: code.categoryId ? categories.find(c => c.id === code.categoryId) : null,
      }));
      res.json(codesWithCategory);
    } catch (error) {
      console.error("Get promo codes error:", error);
      res.status(500).json({ message: "Erro ao buscar códigos promocionais" });
    }
  });

  // Criar código promocional
  app.post("/api/admin/shop/promo-codes", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const { code, discountType, discountValue, categoryId, startDate, endDate, isActive, maxUses } = req.body;
      
      if (!code || !discountValue || !startDate || !endDate) {
        return res.status(400).json({ message: "Código, valor do desconto, data de início e fim são obrigatórios" });
      }
      
      const existing = await storage.getPromoCodeByCode(code);
      if (existing) {
        return res.status(400).json({ message: "Este código já existe" });
      }
      
      const promoCode = await storage.createPromoCode({
        code,
        discountType: discountType || "percentage",
        discountValue: Number(discountValue),
        categoryId: categoryId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive !== false,
        maxUses: maxUses || null,
      });
      
      res.json(promoCode);
    } catch (error) {
      console.error("Create promo code error:", error);
      res.status(500).json({ message: "Erro ao criar código promocional" });
    }
  });

  // Atualizar código promocional
  app.patch("/api/admin/shop/promo-codes/:id", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { code, discountType, discountValue, categoryId, startDate, endDate, isActive, maxUses } = req.body;
      
      const updateData: any = {};
      if (code !== undefined) updateData.code = code;
      if (discountType !== undefined) updateData.discountType = discountType;
      if (discountValue !== undefined) updateData.discountValue = Number(discountValue);
      if (categoryId !== undefined) updateData.categoryId = categoryId || null;
      if (startDate !== undefined) updateData.startDate = new Date(startDate);
      if (endDate !== undefined) updateData.endDate = new Date(endDate);
      if (isActive !== undefined) updateData.isActive = isActive;
      if (maxUses !== undefined) updateData.maxUses = maxUses || null;
      
      const promoCode = await storage.updatePromoCode(id, updateData);
      if (!promoCode) {
        return res.status(404).json({ message: "Código não encontrado" });
      }
      
      res.json(promoCode);
    } catch (error) {
      console.error("Update promo code error:", error);
      res.status(500).json({ message: "Erro ao atualizar código promocional" });
    }
  });

  // Deletar código promocional
  app.delete("/api/admin/shop/promo-codes/:id", authenticateToken, requireMarketing, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePromoCode(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete promo code error:", error);
      res.status(500).json({ message: "Erro ao deletar código promocional" });
    }
  });

  // ==================== SHOP ROUTES - MEMBER ====================

  // In-memory cache for shop images (avoids repeated database queries and image processing)
  const shopImageCache = new Map<string, { buffer: Buffer; timestamp: number }>();
  const SHOP_IMAGE_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
  const SHOP_IMAGE_CACHE_MAX_SIZE = 200; // Max 200 images in cache

  function getFromShopCache(key: string): Buffer | null {
    const cached = shopImageCache.get(key);
    if (cached && Date.now() - cached.timestamp < SHOP_IMAGE_CACHE_TTL) {
      return cached.buffer;
    }
    if (cached) {
      shopImageCache.delete(key);
    }
    return null;
  }

  function setInShopCache(key: string, buffer: Buffer): void {
    if (shopImageCache.size >= SHOP_IMAGE_CACHE_MAX_SIZE) {
      const firstKey = shopImageCache.keys().next().value;
      if (firstKey) shopImageCache.delete(firstKey);
    }
    shopImageCache.set(key, { buffer, timestamp: Date.now() });
  }

  // Helper function to resolve image buffer from R2 or Base64
  async function resolveImageBuffer(imageData: string): Promise<Buffer | null> {
    if (isR2Url(imageData)) {
      const r2Result = await getFromR2(imageData);
      return r2Result ? r2Result.buffer : null;
    } else if (isBase64Url(imageData)) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        return Buffer.from(matches[2], 'base64');
      }
    }
    return null;
  }

  // Helper function to get optimal image URL (direct R2 CDN or proxy fallback)
  function getOptimalImageUrl(imageData: string | null | undefined, proxyFallback: string): string {
    if (!imageData) return proxyFallback;
    // If R2 URL, use public CDN for fast loading
    if (isR2Url(imageData)) {
      return getPublicUrl(imageData);
    }
    // If Base64 or other format, use proxy (slower but works)
    return proxyFallback;
  }

  // Proxy de imagens - serve imagens sob demanda com compressão WebP (lazy loading)
  app.get("/api/shop/images/banner/:itemId", async (req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      if (isNaN(itemId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const cacheKey = `banner:${itemId}`;
      const cached = getFromShopCache(cacheKey);
      if (cached) {
        res.set({
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': cached.length,
        });
        return res.send(cached);
      }
      
      const imageData = await storage.getShopItemBannerImage(itemId);
      if (!imageData) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }
      
      const buffer = await resolveImageBuffer(imageData);
      if (!buffer) {
        return res.status(400).json({ message: "Formato de imagem inválido" });
      }
      
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 2000, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
      
      setInShopCache(cacheKey, optimizedBuffer);
      
      res.set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': optimizedBuffer.length,
      });
      res.send(optimizedBuffer);
    } catch (error) {
      console.error("Get banner image error:", error);
      res.status(500).json({ message: "Erro ao buscar imagem" });
    }
  });

  app.get("/api/shop/images/item/:imageId", async (req, res) => {
    try {
      const imageId = parseInt(req.params.imageId);
      if (isNaN(imageId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const cacheKey = `item:${imageId}`;
      const cached = getFromShopCache(cacheKey);
      if (cached) {
        res.set({
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': cached.length,
        });
        return res.send(cached);
      }
      
      const imageData = await storage.getShopItemImageData(imageId);
      if (!imageData) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }
      
      const buffer = await resolveImageBuffer(imageData);
      if (!buffer) {
        return res.status(400).json({ message: "Formato de imagem inválido" });
      }
      
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 2000, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
      
      setInShopCache(cacheKey, optimizedBuffer);
      
      res.set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': optimizedBuffer.length,
      });
      res.send(optimizedBuffer);
    } catch (error) {
      console.error("Get item image error:", error);
      res.status(500).json({ message: "Erro ao buscar imagem" });
    }
  });

  // Proxy de imagem de categoria (lazy loading) com compressão WebP
  app.get("/api/shop/images/category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const cacheKey = `category:${categoryId}`;
      const cached = getFromShopCache(cacheKey);
      if (cached) {
        res.set({
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': cached.length,
        });
        return res.send(cached);
      }
      
      const imageData = await storage.getShopCategoryImageData(categoryId);
      if (!imageData) {
        return res.status(404).json({ message: "Imagem não encontrada" });
      }
      
      const buffer = await resolveImageBuffer(imageData);
      if (!buffer) {
        return res.status(400).json({ message: "Formato de imagem inválido" });
      }
      
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 400, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      
      setInShopCache(cacheKey, optimizedBuffer);
      
      res.set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': optimizedBuffer.length,
      });
      res.send(optimizedBuffer);
    } catch (error) {
      console.error("Get category image error:", error);
      res.status(500).json({ message: "Erro ao buscar imagem" });
    }
  });

  // Listar categorias da loja (publico) - OTIMIZADO COM R2 CDN
  app.get("/api/shop/categories", async (req, res) => {
    try {
      // Use Light version to avoid loading Base64 from database
      const categories = await storage.getShopCategoriesLight();
      const categoryIds = categories.map(c => c.id);
      // Fetch actual image URLs for direct R2 CDN access
      const imageUrlsMap = await storage.getShopCategoryImageUrls(categoryIds);
      
      // Return direct R2 URLs when available, fallback to proxy
      const categoriesWithUrls = categories.map(cat => ({
        ...cat,
        imageData: getOptimalImageUrl(imageUrlsMap.get(cat.id), `/api/shop/images/category/${cat.id}`),
      }));
      res.json(categoriesWithUrls);
    } catch (error) {
      console.error("Get shop categories error:", error);
      res.status(500).json({ message: "Erro ao buscar categorias" });
    }
  });

  // Listar itens em destaque (para hero banner - publico) - OTIMIZADO COM R2 CDN
  app.get("/api/shop/featured", async (req, res) => {
    try {
      const items = await storage.getShopItemsLight(false);
      
      // Filtrar apenas itens publicados
      const publishedItems = items.filter(item => item.isPublished);
      
      // Primeiro os itens explicitamente marcados como featured
      const explicitFeatured = publishedItems.filter(item => item.isFeatured).sort((a, b) => 
        (a.featuredOrder ?? 999) - (b.featuredOrder ?? 999)
      );
      
      // Todos os itens featured (fallback para todos se nenhum estiver marcado)
      const featured = explicitFeatured.length > 0 ? explicitFeatured : publishedItems.slice(0, 5);
      
      if (featured.length === 0) {
        return res.json([]);
      }
      
      const featuredIds = featured.map(item => item.id);
      // Fetch actual image URLs for direct R2 CDN access
      const [bannerUrlsMap, imagesUrlsMap] = await Promise.all([
        storage.getShopItemBannerUrls(featuredIds),
        storage.getShopItemImageUrls(featuredIds)
      ]);
      
      const featuredWithImages = featured.map(item => ({
        ...item,
        bannerImageData: getOptimalImageUrl(bannerUrlsMap.get(item.id), `/api/shop/images/banner/${item.id}`),
        images: (imagesUrlsMap.get(item.id) || []).map(img => ({
          id: img.id,
          sortOrder: img.sortOrder,
          imageData: getOptimalImageUrl(img.imageData, `/api/shop/images/item/${img.id}`),
        }))
      }));
      
      res.json(featuredWithImages);
    } catch (error) {
      console.error("Get featured items error:", error);
      res.status(500).json({ message: "Erro ao buscar itens em destaque" });
    }
  });

  // Listar itens disponiveis (catalogo publico) - OTIMIZADO COM R2 CDN
  app.get("/api/shop/items", async (req, res) => {
    try {
      const allItems = await storage.getShopItemsLight(false);
      // Filtrar apenas itens publicados para o catálogo público
      const items = allItems.filter(item => item.isPublished);
      if (items.length === 0) {
        return res.json([]);
      }
      
      const itemIds = items.map(item => item.id);
      // Fetch actual image URLs for direct R2 CDN access
      const [bannerUrlsMap, imagesUrlsMap, sizesMap, sizeChartsMap] = await Promise.all([
        storage.getShopItemBannerUrls(itemIds),
        storage.getShopItemImageUrls(itemIds),
        storage.getShopItemSizesByItemIds(itemIds),
        storage.getShopItemSizeChartsByItemIds(itemIds)
      ]);
      
      const itemsWithDetails = items.map(item => ({
        ...item,
        bannerImageData: getOptimalImageUrl(bannerUrlsMap.get(item.id), `/api/shop/images/banner/${item.id}`),
        images: (imagesUrlsMap.get(item.id) || []).map(img => ({
          id: img.id,
          sortOrder: img.sortOrder,
          imageData: getOptimalImageUrl(img.imageData, `/api/shop/images/item/${img.id}`),
        })),
        sizes: sizesMap.get(item.id) || [],
        sizeCharts: sizeChartsMap.get(item.id) || []
      }));
      
      res.json(itemsWithDetails);
    } catch (error) {
      console.error("Get shop items error:", error);
      res.status(500).json({ message: "Erro ao buscar itens" });
    }
  });

  // Obter item específico
  app.get("/api/shop/items/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const item = await storage.getShopItemById(id);
      if (!item || !item.isAvailable || !item.isPublished) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      
      const [images, sizes, sizeCharts] = await Promise.all([
        storage.getShopItemImages(id),
        storage.getShopItemSizes(id),
        storage.getShopItemSizeCharts(id)
      ]);
      
      res.json({ ...item, images, sizes, sizeCharts });
    } catch (error) {
      console.error("Get shop item error:", error);
      res.status(500).json({ message: "Erro ao buscar item" });
    }
  });

  // Obter carrinho do usuário
  app.get("/api/shop/cart", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const cartItems = await storage.getCartItems(req.user!.id);
      if (cartItems.length === 0) {
        return res.json([]);
      }
      
      const itemIds = Array.from(new Set(cartItems.map(c => c.itemId)));
      const [items, imagesMap] = await Promise.all([
        storage.getShopItemsByIds(itemIds),
        storage.getShopItemImagesByItemIds(itemIds)
      ]);
      const itemsMap = new Map(items.map((item: any) => [item.id, item]));
      
      const itemsWithDetails = cartItems.map(cartItem => {
        const item = itemsMap.get(cartItem.itemId);
        if (!item) return { ...cartItem, item: null };
        const rawImages = imagesMap.get(item.id) || [];
        // Convert image data to proxy URLs for proper display
        const imagesWithUrls = rawImages.map(img => ({
          ...img,
          imageData: `/api/shop/images/item/${img.id}`,
        }));
        return { 
          ...cartItem, 
          item: { 
            ...item, 
            images: imagesWithUrls,
          } 
        };
      });
      
      res.json(itemsWithDetails);
    } catch (error) {
      console.error("Get cart error:", error);
      res.status(500).json({ message: "Erro ao buscar carrinho" });
    }
  });

  // Adicionar ao carrinho
  app.post("/api/shop/cart", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { itemId, quantity, gender, size } = req.body;
      
      if (!itemId || !quantity) {
        return res.status(400).json({ message: "Item e quantidade obrigatórios" });
      }
      
      const item = await storage.getShopItemById(itemId);
      if (!item || !item.isAvailable) {
        return res.status(404).json({ message: "Item não disponível" });
      }
      
      const cartItem = await storage.addToCart({
        userId: req.user!.id,
        itemId: Number(itemId),
        quantity: Number(quantity),
        gender: gender || null,
        size: size || null,
      });
      
      res.json(cartItem);
    } catch (error) {
      console.error("Add to cart error:", error);
      res.status(500).json({ message: "Erro ao adicionar ao carrinho" });
    }
  });

  // Atualizar quantidade no carrinho
  app.patch("/api/shop/cart/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { quantity } = req.body;
      
      if (isNaN(id) || !quantity) {
        return res.status(400).json({ message: "Dados inválidos" });
      }
      
      const cartItem = await storage.updateCartItem(id, Number(quantity));
      if (!cartItem) {
        return res.status(404).json({ message: "Item não encontrado" });
      }
      
      res.json(cartItem);
    } catch (error) {
      console.error("Update cart error:", error);
      res.status(500).json({ message: "Erro ao atualizar carrinho" });
    }
  });

  // Remover do carrinho
  app.delete("/api/shop/cart/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      await storage.removeFromCart(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove from cart error:", error);
      res.status(500).json({ message: "Erro ao remover do carrinho" });
    }
  });

  // Limpar carrinho
  app.delete("/api/shop/cart", authenticateToken, async (req: AuthRequest, res) => {
    try {
      await storage.clearCart(req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Clear cart error:", error);
      res.status(500).json({ message: "Erro ao limpar carrinho" });
    }
  });

  // Validar código promocional
  app.post("/api/shop/validate-promo", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { code, cartItems } = req.body;
      
      if (!code) {
        return res.status(400).json({ message: "Código obrigatório" });
      }
      
      const promoCode = await storage.getPromoCodeByCode(code);
      
      if (!promoCode) {
        return res.status(404).json({ message: "Código promocional não encontrado" });
      }
      
      if (!promoCode.isActive) {
        return res.status(400).json({ message: "Código promocional inativo" });
      }
      
      const now = new Date();
      if (now < new Date(promoCode.startDate)) {
        return res.status(400).json({ message: "Código promocional ainda não está ativo" });
      }
      
      if (now > new Date(promoCode.endDate)) {
        return res.status(400).json({ message: "Código promocional expirado" });
      }
      
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        return res.status(400).json({ message: "Código promocional atingiu o limite de usos" });
      }
      
      // Calculate discount based on cart items
      let applicableAmount = 0;
      const userCart = await storage.getCartItems(req.user!.id);
      
      for (const cartItem of userCart) {
        const product = await storage.getShopItemById(cartItem.itemId);
        if (!product) continue;
        
        // Check if promo code applies to this product's category
        if (promoCode.categoryId === null || product.categoryId === promoCode.categoryId) {
          applicableAmount += product.price * cartItem.quantity;
        }
      }
      
      let discountAmount = 0;
      if (promoCode.discountType === "percentage") {
        discountAmount = Math.floor(applicableAmount * (promoCode.discountValue / 100));
      } else {
        discountAmount = Math.min(promoCode.discountValue, applicableAmount);
      }
      
      const category = promoCode.categoryId ? await storage.getShopCategoryById(promoCode.categoryId) : null;
      
      res.json({
        valid: true,
        code: promoCode.code,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountAmount,
        categoryId: promoCode.categoryId,
        categoryName: category?.name || null,
        promoCodeId: promoCode.id,
      });
    } catch (error) {
      console.error("Validate promo code error:", error);
      res.status(500).json({ message: "Erro ao validar código promocional" });
    }
  });

  // Finalizar pedido (checkout)
  app.post("/api/shop/checkout", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { items, observation, promoCode: promoCodeStr, installmentCount: reqInstallmentCount } = req.body;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Itens obrigatórios" });
      }
      
      let totalAmount = 0;
      let discountAmount = 0;
      let promoCodeId: number | null = null;
      let maxAllowedInstallments = 1;
      const orderItems: { itemId: number; quantity: number; unitPrice: number; gender?: string; size?: string; categoryId?: number | null }[] = [];
      
      // Get cart items for the user to map cartItemId to product data
      const userCart = await storage.getCartItems(req.user!.id);
      const cartMap = new Map(userCart.map(c => [c.id, c]));
      
      for (const requestItem of items) {
        // Get cart item by cartItemId
        const cartEntry = cartMap.get(requestItem.cartItemId);
        if (!cartEntry) {
          return res.status(400).json({ message: `Item do carrinho não encontrado` });
        }
        
        // Get the product using the itemId from the cart entry
        const item = await storage.getShopItemById(cartEntry.itemId);
        if (!item) {
          return res.status(400).json({ message: `Produto "${cartEntry.itemId}" não encontrado` });
        }
        if (!item.isAvailable) {
          return res.status(400).json({ message: `Produto "${item.name}" não disponível` });
        }
        
        const qty = Number(cartEntry.quantity) || 1;
        console.log(`[Shop Checkout] Item ${item.name}:`, {
          itemId: item.id,
          price: item.price,
          priceReais: item.price / 100,
          quantity: qty,
          subtotal: item.price * qty,
          subtotalReais: (item.price * qty) / 100,
        });
        totalAmount += item.price * qty;
        orderItems.push({
          itemId: item.id,
          quantity: qty,
          unitPrice: item.price,
          gender: requestItem.gender || cartEntry.gender,
          size: requestItem.size || cartEntry.size,
          categoryId: item.categoryId,
        });
        
        // Track max installments allowed based on products
        if (item.allowInstallments && item.maxInstallments && item.maxInstallments > maxAllowedInstallments) {
          maxAllowedInstallments = item.maxInstallments;
        }
      }
      
      // Apply promo code if provided
      if (promoCodeStr) {
        const promoCode = await storage.getPromoCodeByCode(promoCodeStr);
        if (promoCode && promoCode.isActive) {
          const now = new Date();
          if (now >= new Date(promoCode.startDate) && now <= new Date(promoCode.endDate)) {
            if (!promoCode.maxUses || promoCode.usedCount < promoCode.maxUses) {
              // Calculate applicable amount
              let applicableAmount = 0;
              for (const oi of orderItems) {
                if (promoCode.categoryId === null || oi.categoryId === promoCode.categoryId) {
                  applicableAmount += oi.unitPrice * oi.quantity;
                }
              }
              
              if (promoCode.discountType === "percentage") {
                discountAmount = Math.floor(applicableAmount * (promoCode.discountValue / 100));
              } else {
                discountAmount = Math.min(promoCode.discountValue, applicableAmount);
              }
              
              promoCodeId = promoCode.id;
            }
          }
        }
      }
      
      const finalAmount = Math.max(0, totalAmount - discountAmount);
      
      console.log(`[Shop Checkout] Order totals:`, {
        totalAmount,
        totalAmountReais: totalAmount / 100,
        discountAmount,
        discountAmountReais: discountAmount / 100,
        finalAmount,
        finalAmountReais: finalAmount / 100,
      });
      
      // Validate installment count
      const installmentCount = Math.min(Math.max(1, reqInstallmentCount || 1), maxAllowedInstallments);
      
      const year = new Date().getFullYear();
      const existingOrders = await storage.getShopOrders();
      const yearOrders = existingOrders.filter(o => o.orderCode.startsWith(`#${year}-`));
      const nextNumber = (yearOrders.length + 1).toString().padStart(4, "0");
      const orderCode = `#${year}-${nextNumber}`;
      
      const order = await storage.createShopOrder({
        orderCode,
        userId: req.user!.id,
        totalAmount: finalAmount,
        observation: observation ? (discountAmount > 0 ? `${observation} [Cupom aplicado: -R$${(discountAmount/100).toFixed(2)}]` : observation) : (discountAmount > 0 ? `[Cupom aplicado: -R$${(discountAmount/100).toFixed(2)}]` : null),
        paymentStatus: "pending",
        orderStatus: "awaiting_payment",
        installmentCount,
      });
      
      // OPTIMIZED: Batch insert all order items in a single query
      const orderItemsData = orderItems.map(oi => ({
        orderId: order.id,
        itemId: oi.itemId,
        quantity: oi.quantity,
        gender: oi.gender || null,
        size: oi.size || null,
        unitPrice: oi.unitPrice,
      }));
      await storage.createShopOrderItemsBatch(orderItemsData);
      
      // Increment promo code usage
      if (promoCodeId) {
        await storage.incrementPromoCodeUsage(promoCodeId);
      }
      
      // OPTIMIZED: Batch insert all installments in a single query
      if (installmentCount > 1) {
        const installmentAmount = Math.floor(finalAmount / installmentCount);
        const remainder = finalAmount - (installmentAmount * installmentCount);
        
        const installmentsData = [];
        for (let i = 1; i <= installmentCount; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i - 1);
          dueDate.setDate(10);
          dueDate.setHours(23, 59, 59, 999);
          
          const amount = i === 1 ? installmentAmount + remainder : installmentAmount;
          
          installmentsData.push({
            orderId: order.id,
            installmentNumber: i,
            amount,
            dueDate,
            status: "pending" as const,
          });
        }
        await storage.createShopInstallmentsBatch(installmentsData);
      }
      
      await storage.clearCart(req.user!.id);
      
      res.json({ ...order, originalAmount: totalAmount, discountAmount, installmentCount });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Erro ao finalizar pedido" });
    }
  });

  // Listar meus pedidos - OTIMIZADO sem Base64
  app.get("/api/shop/my-orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orders = await storage.getShopOrders({ userId: req.user!.id });
      
      if (orders.length === 0) {
        return res.json([]);
      }
      
      const orderIds = orders.map(o => o.id);
      
      // Batch fetch all related data in parallel
      const [orderItemsMap, installmentsMap] = await Promise.all([
        storage.getShopOrderItemsByOrderIds(orderIds),
        storage.getShopInstallmentsByOrderIds(orderIds),
      ]);
      
      const allItems = Array.from(orderItemsMap.values()).flat();
      const productIds = Array.from(new Set(allItems.map(i => i.itemId)));
      
      // Usar versão otimizada que traz apenas id, name, price
      const [products, imagesMap] = await Promise.all([
        storage.getShopItemsByIdsLight(productIds),
        storage.getShopItemImagesByItemIdsLight(productIds),
      ]);
      const productsMap = new Map(products.map(p => [p.id, p]));
      
      const ordersWithItems = orders.map(order => {
        const items = orderItemsMap.get(order.id) || [];
        const installments = installmentsMap.get(order.id) || [];
        const itemsWithProduct = items.map(item => {
          const product = productsMap.get(item.itemId);
          const images = product ? (imagesMap.get(product.id) || []) : [];
          const firstImageId = images[0]?.id || null;
          return { 
            ...item, 
            product: product ? { 
              id: product.id,
              name: product.name,
              price: product.price,
              firstImage: firstImageId ? `/api/shop/images/item/${firstImageId}` : null,
            } : null 
          };
        });
        return { ...order, items: itemsWithProduct, installments };
      });
      
      res.json(ordersWithItems);
    } catch (error) {
      console.error("Get my orders error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  // Obter pedido específico
  app.get("/api/shop/my-orders/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const order = await storage.getShopOrderById(id);
      if (!order || order.userId !== req.user!.id) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      // Batch fetch items and installments in parallel
      const [items, installments] = await Promise.all([
        storage.getShopOrderItems(order.id),
        storage.getShopInstallments(order.id),
      ]);
      
      // Batch fetch products and images
      const productIds = Array.from(new Set(items.map(i => i.itemId)));
      const [products, imagesMap] = await Promise.all([
        storage.getShopItemsByIds(productIds),
        storage.getShopItemImagesByItemIds(productIds),
      ]);
      const productsMap = new Map(products.map(p => [p.id, p]));
      
      const itemsWithProduct = items.map(item => {
        const product = productsMap.get(item.itemId);
        const images = product ? (imagesMap.get(product.id) || []) : [];
        return { ...item, product: product ? { ...product, images } : null };
      });
      
      res.json({ ...order, items: itemsWithProduct, installments });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Erro ao buscar pedido" });
    }
  });

  // Cancelar pedido (antes de pagar)
  app.delete("/api/shop/my-orders/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const order = await storage.getShopOrderById(id);
      if (!order || order.userId !== req.user!.id) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      if (order.paymentStatus !== "pending") {
        return res.status(400).json({ message: "Não é possível cancelar pedido já pago" });
      }
      
      await storage.updateShopOrder(id, { orderStatus: "cancelled" });
      res.json({ success: true });
    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({ message: "Erro ao cancelar pedido" });
    }
  });

  // ==================== TREASURY ROUTES (Tesoureiro/Admin) ====================

  // Obter configurações da tesouraria
  app.get("/api/treasury/settings", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      let settings = await storage.getTreasurySettings(year);
      
      if (!settings) {
        settings = await storage.createTreasurySettings({
          year,
          percaptaAmount: 0,
          umpMonthlyAmount: 0,
          pixKey: null,
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Get treasury settings error:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  // Atualizar configurações da tesouraria
  app.put("/api/treasury/settings/:id", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { percaptaAmount, umpMonthlyAmount, pixKey } = req.body;
      
      const settings = await storage.updateTreasurySettings(id, {
        percaptaAmount,
        umpMonthlyAmount,
        pixKey,
      });
      
      if (!settings) {
        return res.status(404).json({ message: "Configurações não encontradas" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Update treasury settings error:", error);
      res.status(500).json({ message: "Erro ao atualizar configurações" });
    }
  });

  // Criar ou atualizar configurações (POST para frontend)
  app.post("/api/treasury/settings", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { year, percaptaAmount, umpMonthlyAmount, pixKey } = req.body;
      const targetYear = year || new Date().getFullYear();
      
      let settings = await storage.getTreasurySettings(targetYear);
      
      if (settings) {
        settings = await storage.updateTreasurySettings(settings.id, {
          percaptaAmount: percaptaAmount ?? settings.percaptaAmount,
          umpMonthlyAmount: umpMonthlyAmount ?? settings.umpMonthlyAmount,
          pixKey: pixKey !== undefined ? pixKey : settings.pixKey,
        });
      } else {
        settings = await storage.createTreasurySettings({
          year: targetYear,
          percaptaAmount: percaptaAmount ?? 0,
          umpMonthlyAmount: umpMonthlyAmount ?? 0,
          pixKey: pixKey || null,
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Create/update treasury settings error:", error);
      res.status(500).json({ message: "Erro ao salvar configurações" });
    }
  });

  // Obter resumo do dashboard
  app.get("/api/treasury/dashboard", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const summary = await storage.getTreasuryDashboardSummary(year);
      res.json(summary);
    } catch (error) {
      console.error("Get treasury dashboard error:", error);
      res.status(500).json({ message: "Erro ao buscar resumo" });
    }
  });

  // Alias para o frontend
  app.get("/api/treasury/dashboard/summary", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const summary = await storage.getTreasuryDashboardSummary(year);
      res.json(summary);
    } catch (error) {
      console.error("Get treasury dashboard error:", error);
      res.status(500).json({ message: "Erro ao buscar resumo" });
    }
  });

  // Dados mensais para gráfico
  app.get("/api/treasury/dashboard/monthly", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const entries = await storage.getTreasuryEntries({ year });
      
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: new Date(year, i).toLocaleDateString('pt-BR', { month: 'short' }),
        income: 0,
        expense: 0,
      }));

      entries.forEach(entry => {
        // Status "completed" is set when PIX is confirmed via webhook or manual check
        if ((entry.paymentStatus === 'paid' || entry.paymentStatus === 'completed') && entry.createdAt) {
          const month = new Date(entry.createdAt).getMonth();
          if (entry.type === 'income') {
            monthlyData[month].income += entry.amount;
          } else {
            monthlyData[month].expense += entry.amount;
          }
        }
      });

      res.json(monthlyData);
    } catch (error) {
      console.error("Get monthly treasury data error:", error);
      res.status(500).json({ message: "Erro ao buscar dados mensais" });
    }
  });

  // Get expense breakdown by category
  app.get("/api/treasury/dashboard/category-expenses", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const entries = await storage.getTreasuryEntries({ year, type: "expense" });
      
      const categoryMap = new Map<string, number>();
      
      entries.forEach(entry => {
        // Status "completed" is set when PIX is confirmed via webhook or manual check
        if (entry.paymentStatus === "paid" || entry.paymentStatus === "completed") {
          const current = categoryMap.get(entry.category) || 0;
          categoryMap.set(entry.category, current + entry.amount);
        }
      });
      
      const categoryData = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      
      res.json(categoryData);
    } catch (error) {
      console.error("Get category expenses error:", error);
      res.status(500).json({ message: "Erro ao buscar dados por categoria" });
    }
  });

  // Get income breakdown by category
  app.get("/api/treasury/dashboard/category-income", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const entries = await storage.getTreasuryEntries({ year, type: "income" });
      
      const categoryMap = new Map<string, number>();
      
      entries.forEach(entry => {
        if (entry.paymentStatus === "paid" || entry.paymentStatus === "completed") {
          const current = categoryMap.get(entry.category) || 0;
          categoryMap.set(entry.category, current + entry.amount);
        }
      });
      
      const categoryData = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
      
      res.json(categoryData);
    } catch (error) {
      console.error("Get category income error:", error);
      res.status(500).json({ message: "Erro ao buscar dados de entrada por categoria" });
    }
  });

  // Get settings by year (for frontend query format)
  app.get("/api/treasury/settings/:year", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) {
        return res.status(400).json({ message: "Ano inválido" });
      }
      
      let settings = await storage.getTreasurySettings(year);
      
      if (!settings) {
        settings = await storage.createTreasurySettings({
          year,
          percaptaAmount: 0,
          umpMonthlyAmount: 0,
          pixKey: null,
        });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Get treasury settings by year error:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  // OPTIMIZED: Get member tax status for treasury panel - batch queries
  app.get("/api/treasury/members/tax-status/:year", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.params.year);
      if (isNaN(year)) {
        return res.status(400).json({ message: "Ano inválido" });
      }
      
      // Batch fetch settings and members in parallel
      const [settings, allMembers] = await Promise.all([
        storage.getTreasurySettings(year),
        storage.getAllMembers(true),
      ]);
      
      const percaptaAmount = settings?.percaptaAmount ?? 0;
      const umpMonthlyAmount = settings?.umpMonthlyAmount ?? 0;
      
      // Filter only sócio ativo (activeMember = true) for tax tracking
      const activeMembers = allMembers.filter(m => m.activeMember === true);
      
      // OPTIMIZED: Batch fetch all percapta and ump payments in one query each
      const [percaptaMap, umpMap] = await Promise.all([
        storage.getAllMemberPercaptaPayments(year),
        storage.getAllMemberUmpPayments(year),
      ]);
      
      // Calculate total annual debt using batch data
      const memberStatuses = activeMembers.map(member => {
        const percaptaPayment = percaptaMap.get(member.id);
        const umpPayments = umpMap.get(member.id) || [];
        
        const paidMonths = umpPayments.filter(p => p.paidAt).map(p => p.month);
        const unpaidMonths = Array.from({ length: 12 }, (_, i) => i + 1)
          .filter(m => !paidMonths.includes(m));
        
        const percaptaOwed = percaptaPayment?.paidAt ? 0 : percaptaAmount;
        const umpOwed = unpaidMonths.length * umpMonthlyAmount;
        
        return {
          userId: member.id,
          fullName: member.fullName,
          email: member.email,
          photoUrl: member.photoUrl ? getPublicUrl(member.photoUrl) : null,
          percaptaPaid: !!percaptaPayment?.paidAt,
          umpMonthsPaid: paidMonths,
          totalOwed: percaptaOwed + umpOwed,
        };
      });
      
      res.json(memberStatuses);
    } catch (error) {
      console.error("Get member tax status error:", error);
      res.status(500).json({ message: "Erro ao buscar status de taxas" });
    }
  });

  // Upload de comprovante (stores in database as compressed base64)
  app.post("/api/treasury/upload-receipt", authenticateToken, requireTreasurer, imageUpload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Nenhum arquivo enviado" });
      }
      
      // Validate file type strictly
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Tipo de arquivo nao permitido. Use imagens (JPEG, PNG, WebP, GIF) ou PDF." });
      }
      
      // Enforce max size (5MB for images, 2MB for PDFs)
      const maxSize = req.file.mimetype === "application/pdf" ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({ 
          message: req.file.mimetype === "application/pdf" 
            ? "PDF muito grande. Maximo 2MB." 
            : "Imagem muito grande. Maximo 5MB." 
        });
      }
      
      const sharp = (await import("sharp")).default;
      const crypto = (await import("crypto")).default;
      
      let fileBuffer = req.file.buffer;
      let mimeType = req.file.mimetype;
      
      // Compress images to reduce storage size
      if (mimeType.startsWith("image/")) {
        fileBuffer = await sharp(req.file.buffer)
          .resize(800, 800, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 70 })
          .toBuffer();
        mimeType = "image/jpeg";
      }
      
      // Generate unique ID and store in database
      const fileId = crypto.randomBytes(16).toString("hex");
      const base64 = fileBuffer.toString("base64");
      
      await storage.createTreasuryReceipt({ id: fileId, mimeType, data: base64 });
      
      // Return URL that can be used to retrieve the file
      res.json({ url: `/api/treasury/receipts/${fileId}` });
    } catch (error) {
      console.error("Upload receipt error:", error);
      res.status(500).json({ message: "Erro ao fazer upload do comprovante" });
    }
  });

  // Serve uploaded receipts
  app.get("/api/treasury/receipts/:id", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const receipt = await storage.getTreasuryReceipt(id);
      
      if (!receipt) {
        return res.status(404).json({ message: "Comprovante nao encontrado" });
      }
      
      const buffer = Buffer.from(receipt.data, "base64");
      res.set("Content-Type", receipt.mimeType);
      res.set("Cache-Control", "private, max-age=86400");
      res.send(buffer);
    } catch (error) {
      console.error("Get receipt error:", error);
      res.status(500).json({ message: "Erro ao buscar comprovante" });
    }
  });

  // Listar lançamentos da tesouraria
  app.get("/api/treasury/entries", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { type, userId, year, status } = req.query;
      
      const entries = await storage.getTreasuryEntries({
        type: type as string | undefined,
        userId: userId ? parseInt(userId as string) : undefined,
        year: year ? parseInt(year as string) : undefined,
        status: status as string | undefined,
      });
      
      res.json(entries);
    } catch (error) {
      console.error("Get treasury entries error:", error);
      res.status(500).json({ message: "Erro ao buscar lançamentos" });
    }
  });

  // Criar lançamento manual
  app.post("/api/treasury/entries", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { type, category, description, amount, userId, referenceYear, referenceMonth, receiptUrl, paymentMethod } = req.body;
      
      if (!type || !category || !amount) {
        return res.status(400).json({ message: "Dados incompletos" });
      }
      
      const entry = await storage.createTreasuryEntry({
        type,
        category,
        description,
        amount,
        userId: userId || null,
        referenceYear: referenceYear || new Date().getFullYear(),
        referenceMonth: referenceMonth || null,
        paymentStatus: "paid",
        paymentMethod: paymentMethod || "manual",
        receiptUrl: receiptUrl || null,
      });
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Create treasury entry error:", error);
      res.status(500).json({ message: "Erro ao criar lançamento" });
    }
  });

  // OPTIMIZED: Listar empréstimos - batch installments
  app.get("/api/treasury/loans", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const loans = await storage.getTreasuryLoans();
      
      if (loans.length === 0) {
        return res.json([]);
      }
      
      // OPTIMIZED: Batch fetch all installments in one query
      const loanIds = loans.map(l => l.id);
      const installmentsMap = await storage.getTreasuryLoanInstallmentsByLoanIds(loanIds);
      
      const loansWithInstallments = loans.map(loan => ({
        ...loan,
        installments: installmentsMap.get(loan.id) || [],
      }));
      
      res.json(loansWithInstallments);
    } catch (error) {
      console.error("Get treasury loans error:", error);
      res.status(500).json({ message: "Erro ao buscar empréstimos" });
    }
  });

  // Criar empréstimo
  app.post("/api/treasury/loans", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { origin, originName, originMemberId, description, totalAmount, isInstallment, installmentCount, installmentAmount, installmentDueDates } = req.body;
      
      if (!origin || !totalAmount) {
        return res.status(400).json({ message: "Dados incompletos" });
      }
      
      const loan = await storage.createTreasuryLoan({
        origin,
        originName: originName || null,
        originMemberId: originMemberId || null,
        description: description || null,
        totalAmount,
        isInstallment: isInstallment || false,
        installmentCount: installmentCount || null,
        installmentAmount: installmentAmount || null,
        status: "active",
      });
      
      if (isInstallment && installmentCount > 0) {
        for (let i = 0; i < installmentCount; i++) {
          await storage.createTreasuryLoanInstallment({
            loanId: loan.id,
            installmentNumber: i + 1,
            amount: installmentAmount,
            dueDate: installmentDueDates?.[i] ? new Date(installmentDueDates[i]) : new Date(),
            status: "pending",
          });
        }
      }
      
      const installments = await storage.getTreasuryLoanInstallments(loan.id);
      res.status(201).json({ ...loan, installments });
    } catch (error) {
      console.error("Create treasury loan error:", error);
      res.status(500).json({ message: "Erro ao criar empréstimo" });
    }
  });

  // Marcar parcela como paga
  app.put("/api/treasury/loans/:loanId/installments/:installmentId", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const loanId = parseInt(req.params.loanId);
      const installmentId = parseInt(req.params.installmentId);
      
      if (isNaN(loanId) || isNaN(installmentId)) {
        return res.status(400).json({ message: "ID inválido" });
      }
      
      const { status, paidAt } = req.body;
      const isPaid = status === "paid";
      
      const installment = await storage.updateTreasuryLoanInstallment(installmentId, {
        status: status || "pending",
        paidAt: isPaid ? (paidAt ? new Date(paidAt) : new Date()) : null,
      });
      
      if (!installment) {
        return res.status(404).json({ message: "Parcela não encontrada" });
      }
      
      const loan = await storage.getTreasuryLoanById(loanId);
      if (loan) {
        const installments = await storage.getTreasuryLoanInstallments(loanId);
        const allPaid = installments.every(i => i.status === "paid");
        
        await storage.updateTreasuryLoan(loanId, {
          status: allPaid ? "paid" : "active",
        });
      }
      
      res.json(installment);
    } catch (error) {
      console.error("Update installment error:", error);
      res.status(500).json({ message: "Erro ao atualizar parcela" });
    }
  });

  // OPTIMIZED: Listar status de pagamentos de todos os membros - batch queries
  // IMPORTANT: Only "sócio ativo" (activeMember = true) pay taxes (Percapta/UMP)
  app.get("/api/treasury/member-payments", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const members = await storage.getAllMembers(true);
      // Filter by activeMember (sócio ativo checkbox), not isMember
      const activeMembers = members.filter(m => m.activeMember === true);
      
      // OPTIMIZED: Batch fetch all percapta and ump payments in one query each
      const [percaptaMap, umpMap] = await Promise.all([
        storage.getAllMemberPercaptaPayments(year),
        storage.getAllMemberUmpPayments(year),
      ]);
      
      const memberPayments = activeMembers.map(member => {
        const percapta = percaptaMap.get(member.id);
        const umpPayments = umpMap.get(member.id) || [];
        
        return {
          member: {
            id: member.id,
            name: member.fullName,
            email: member.email,
            profileImage: member.photoUrl ? getPublicUrl(member.photoUrl) : null,
          },
          percapta: percapta ? { isPaid: true, amount: percapta.amount, paidAt: percapta.paidAt } : { isPaid: false, amount: null, paidAt: null },
          umpPayments,
          umpPaidMonths: umpPayments.length,
          umpTotalMonths: 12,
        };
      });
      
      res.json(memberPayments);
    } catch (error) {
      console.error("Get member payments error:", error);
      res.status(500).json({ message: "Erro ao buscar pagamentos" });
    }
  });

  // ==================== MEMBER FINANCIAL PANEL ROUTES ====================

  // OPTIMIZED: Obter meu painel financeiro - parallel + batch queries
  app.get("/api/my-finances", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const userId = req.user!.id;
      
      // OPTIMIZED: Parallel fetch all data
      const [settings, percapta, umpPayments, orders] = await Promise.all([
        storage.getTreasurySettings(year),
        storage.getMemberPercaptaPayment(userId, year),
        storage.getMemberUmpPayments(userId, year),
        storage.getShopOrders({ userId }),
      ]);
      
      // OPTIMIZED: Batch fetch order items if there are orders
      let ordersWithItems: Array<typeof orders[0] & { items: any[] }> = [];
      if (orders.length > 0) {
        const orderIds = orders.map(o => o.id);
        const orderItemsMap = await storage.getShopOrderItemsByOrderIds(orderIds);
        ordersWithItems = orders.map(order => ({
          ...order,
          items: orderItemsMap.get(order.id) || [],
        }));
      }
      
      res.json({
        year,
        isMember: req.user!.isMember,
        settings: settings ? {
          percaptaAmount: settings.percaptaAmount,
          umpMonthlyAmount: settings.umpMonthlyAmount,
        } : null,
        percapta: percapta ? { isPaid: true, amount: percapta.amount, paidAt: percapta.paidAt } : { isPaid: false, amount: null, paidAt: null },
        umpPayments: umpPayments.map(p => ({ ...p, isPaid: true })),
        umpPaidMonths: umpPayments.length,
        orders: ordersWithItems,
      });
    } catch (error) {
      console.error("Get my finances error:", error);
      res.status(500).json({ message: "Erro ao buscar dados financeiros" });
    }
  });

  // Registrar pagamento de taxa Percapta
  app.post("/api/treasury/payments/percapta", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { userId, year, amount, paidAt } = req.body;
      
      if (!userId || !year || !amount) {
        return res.status(400).json({ message: "Dados incompletos" });
      }
      
      // CRITICAL: Only active members can pay percapta tax
      const member = await storage.getUserById(userId);
      if (!member) {
        return res.status(404).json({ message: "Membro não encontrado" });
      }
      if (!member.activeMember) {
        return res.status(403).json({ 
          message: "Apenas membros ativos podem pagar taxa Percapta" 
        });
      }
      
      // Criar entrada na tesouraria primeiro
      const entry = await storage.createTreasuryEntry({
        type: "income",
        category: "taxa_percapta",
        description: `Taxa Percapta ${year} - Membro #${userId}`,
        amount,
        userId,
        referenceYear: year,
        paymentStatus: "paid",
        paymentMethod: "manual",
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      });
      
      let payment = await storage.getMemberPercaptaPayment(userId, year);
      
      if (payment) {
        payment = await storage.updateMemberPercaptaPayment(payment.id, {
          amount,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          entryId: entry.id,
        });
      } else {
        payment = await storage.createMemberPercaptaPayment({
          userId,
          year,
          amount,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          entryId: entry.id,
        });
      }
      
      res.json(payment);
    } catch (error) {
      console.error("Create percapta payment error:", error);
      res.status(500).json({ message: "Erro ao registrar pagamento" });
    }
  });

  // Registrar pagamento de taxa UMP
  app.post("/api/treasury/payments/ump", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { userId, year, months, amountPerMonth, paidAt } = req.body;
      
      if (!userId || !year || !months || !amountPerMonth) {
        return res.status(400).json({ message: "Dados incompletos" });
      }
      
      // CRITICAL: Only active members can pay UMP tax
      const member = await storage.getUserById(userId);
      if (!member) {
        return res.status(404).json({ message: "Membro não encontrado" });
      }
      if (!member.activeMember) {
        return res.status(403).json({ 
          message: "Apenas membros ativos podem pagar taxa UMP" 
        });
      }
      
      const payments = [];
      
      for (const month of months) {
        // Criar entrada na tesouraria primeiro
        const entry = await storage.createTreasuryEntry({
          type: "income",
          category: "taxa_ump",
          description: `Taxa UMP ${month}/${year} - Membro #${userId}`,
          amount: amountPerMonth,
          userId,
          referenceYear: year,
          referenceMonth: month,
          paymentStatus: "paid",
          paymentMethod: "manual",
          paidAt: paidAt ? new Date(paidAt) : new Date(),
        });
        
        let payment = await storage.getMemberUmpPayment(userId, year, month);
        
        if (payment) {
          payment = await storage.updateMemberUmpPayment(payment.id, {
            amount: amountPerMonth,
            paidAt: paidAt ? new Date(paidAt) : new Date(),
            entryId: entry.id,
          });
        } else {
          payment = await storage.createMemberUmpPayment({
            userId,
            year,
            month,
            amount: amountPerMonth,
            paidAt: paidAt ? new Date(paidAt) : new Date(),
            entryId: entry.id,
          });
        }
        
        payments.push(payment);
      }
      
      res.json(payments);
    } catch (error) {
      console.error("Create UMP payment error:", error);
      res.status(500).json({ message: "Erro ao registrar pagamento" });
    }
  });

  // ==================== MEMBER FINANCIAL STATUS (Accessible by member) ====================

  // Get member's own financial status
  app.get("/api/treasury/member/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const yearParam = req.query.year;
      const year = yearParam ? parseInt(yearParam as string) : new Date().getFullYear();
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Get treasury settings for current values
      const settings = await storage.getTreasurySettings(year);
      const percaptaAmount = settings?.percaptaAmount || 0;
      const umpMonthlyAmount = settings?.umpMonthlyAmount || 0;
      
      // Get Percapta payment status
      const percaptaPayment = await storage.getMemberPercaptaPayment(userId, year);
      const percaptaStatus = {
        amount: percaptaAmount,
        paidAmount: percaptaPayment?.amount || 0,
        isPaid: !!percaptaPayment?.paidAt,
        paidAt: percaptaPayment?.paidAt || null,
        dueDate: null,
      };
      
      // Get UMP monthly payments
      const umpPayments = await storage.getMemberUmpPayments(userId, year);
      const paidMonths = umpPayments
        .filter(p => p.paidAt)
        .map(p => p.month);
      
      const currentMonth = new Date().getMonth() + 1;
      const unpaidMonths: number[] = [];
      
      // Calculate starting month based on Day 10 Rule:
      // - If became active on day 1-10 of a month: pays from THAT month
      // - If became active on day 11-31: pays from NEXT month
      let startingMonth = 1;
      if (user.activeMemberSince) {
        const activeSince = new Date(user.activeMemberSince);
        if (activeSince.getFullYear() === year) {
          const dayOfMonth = activeSince.getDate();
          const monthActive = activeSince.getMonth() + 1;
          
          if (dayOfMonth <= 10) {
            startingMonth = monthActive; // Pays from this month
          } else {
            startingMonth = monthActive + 1; // Pays from next month
          }
        } else if (activeSince.getFullYear() > year) {
          // Not active in this year - no months due
          startingMonth = 13; // No months will be added
        }
      }
      
      // Only count months from starting month up to current month as unpaid
      for (let m = startingMonth; m <= currentMonth; m++) {
        if (!paidMonths.includes(m)) {
          unpaidMonths.push(m);
        }
      }
      
      const umpStatus = {
        monthlyAmount: umpMonthlyAmount,
        paidMonths: paidMonths.sort((a, b) => a - b),
        unpaidMonths: unpaidMonths.sort((a, b) => a - b),
        totalOwed: unpaidMonths.length * umpMonthlyAmount,
        totalPaid: paidMonths.length * umpMonthlyAmount,
      };
      
      // Calculate total owed
      const percaptaOwed = percaptaStatus.isPaid ? 0 : percaptaAmount;
      const totalOwed = percaptaOwed + umpStatus.totalOwed;
      
      // Get recent transactions for this member
      const allEntries = await storage.getTreasuryEntries({ userId, year });
      const transactions = allEntries
        .filter(e => e.category === "taxa_ump" || e.category === "taxa_percapta")
        .slice(0, 10)
        .map(e => ({
          id: e.id,
          type: e.type,
          amount: e.amount,
          description: e.description,
          status: e.paymentStatus || "pending",
          createdAt: e.createdAt?.toISOString() || new Date().toISOString(),
        }));
      
      res.json({
        memberId: userId,
        memberName: user.fullName,
        isActiveMember: user.activeMember, // CRITICAL: Used to show/hide payment buttons
        year,
        percaptaStatus,
        umpStatus,
        totalOwed,
        transactions,
      });
    } catch (error) {
      console.error("Get member financial status error:", error);
      res.status(500).json({ message: "Erro ao buscar status financeiro" });
    }
  });

  // Member event history (only events with fees)
  app.get("/api/treasury/member/events", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const yearParam = req.query.year;
      const year = yearParam ? parseInt(yearParam as string) : new Date().getFullYear();
      
      const data = await storage.getMemberEventConfirmationsWithFees(userId, year);
      
      const memberEvents = data
        .map(({ confirmation, event, fee, entry }) => {
          // Use fee from eventFees table, or parse from event.price as fallback
          let baseAmount = 0;
          if (fee?.feeAmount) {
            baseAmount = fee.feeAmount;
          } else if (event?.price) {
            // Parse price from event using robust Brazilian format parser
            const priceCentavos = parseBrazilianPrice(event.price);
            if (priceCentavos !== null && priceCentavos > 0) {
              baseAmount = priceCentavos;
            }
          }
          
          // Visitor amount is same as base amount per visitor
          const visitorAmount = baseAmount;
          const totalAmount = baseAmount + ((confirmation.visitorCount || 0) * visitorAmount);
          
          // Check if paid - either via entry or via entryId on confirmation
          const entryYear = entry?.referenceYear || (entry?.createdAt ? new Date(entry.createdAt).getFullYear() : null);
          const isPaidThisYear = entry?.paymentStatus === "completed" && entryYear === year;
          
          return {
            id: confirmation.id,
            eventId: confirmation.eventId,
            eventName: event?.title || "Evento",
            eventDate: event?.startDate || null,
            eventImageUrl: event?.imageUrl || null,
            isVisitor: confirmation.isVisitor,
            visitorCount: confirmation.visitorCount || 0,
            confirmedAt: confirmation.confirmedAt?.toISOString() || null,
            totalAmount,
            hasFee: totalAmount > 0,
            isPaid: isPaidThisYear,
            entryId: confirmation.entryId || null,
          };
        })
        .filter(e => e.totalAmount > 0);
      
      res.json(memberEvents);
    } catch (error) {
      console.error("Get member events error:", error);
      res.status(500).json({ message: "Erro ao buscar eventos do membro" });
    }
  });

  // OPTIMIZED: Get member's shop orders with installments - batch all queries
  app.get("/api/treasury/member/shop-orders", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const orders = await storage.getShopOrders({ userId });
      
      if (orders.length === 0) {
        return res.json([]);
      }
      
      const orderIds = orders.map(o => o.id);
      // OPTIMIZED: Batch fetch items and installments in parallel (single query each)
      const [orderItemsMap, installmentsMap] = await Promise.all([
        storage.getShopOrderItemsByOrderIds(orderIds),
        storage.getShopInstallmentsByOrderIds(orderIds),
      ]);
      
      const allItems = Array.from(orderItemsMap.values()).flat();
      const productIds = Array.from(new Set(allItems.map(i => i.itemId)));
      const products = productIds.length > 0 ? await storage.getShopItemsByIds(productIds) : [];
      const productsMap = new Map(products.map(p => [p.id, p]));
      
      const ordersWithDetails = orders.map(order => {
        const items = orderItemsMap.get(order.id) || [];
        const installments = installmentsMap.get(order.id) || [];
        
        const itemsWithProduct = items.map(item => {
          const product = productsMap.get(item.itemId);
          return { 
            ...item, 
            productName: product?.name || "Produto",
          };
        });
        
        return {
          id: order.id,
          orderCode: order.orderCode,
          totalAmount: order.totalAmount || 0,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
          items: itemsWithProduct,
          installments: installments.map(inst => ({
            id: inst.id,
            installmentNumber: inst.installmentNumber,
            amount: inst.amount,
            dueDate: inst.dueDate,
            status: inst.status,
            paidAt: inst.paidAt,
            paymentId: inst.paymentId,
          })),
          hasInstallments: installments.length > 1,
        };
      });
      
      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Get member shop orders error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos da loja" });
    }
  });

  // Generate PIX for specific shop installment (with reuse)
  app.post("/api/pix/shop-installment/:installmentId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const installmentId = parseInt(req.params.installmentId);
      const userId = req.user!.id;

      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({ message: "Pagamento PIX não configurado" });
      }

      const installment = await storage.getShopInstallmentById(installmentId);
      if (!installment) {
        return res.status(404).json({ message: "Parcela não encontrada" });
      }

      const order = await storage.getShopOrderById(installment.orderId);
      if (!order || order.userId !== userId) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      if (installment.status === "paid") {
        return res.status(400).json({ message: "Parcela já paga" });
      }

      // Check if there's existing valid PIX for this installment
      if (installment.pixCode && installment.paymentId && installment.pixExpiresAt &&
          new Date(installment.pixExpiresAt) > new Date()) {
        return res.json({
          installmentId: installment.id,
          paymentId: installment.paymentId,
          qrCode: installment.pixCode,
          qrCodeBase64: installment.pixQrCodeBase64,
          expiresAt: installment.pixExpiresAt,
          amount: installment.amount / 100,
        });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const pixResult = await createPixPayment({
        amountCentavos: installment.amount,
        description: `Pedido #${order.orderCode} - Parcela ${installment.installmentNumber}`,
        payerEmail: user.email,
        payerName: user.fullName,
        externalReference: `shop_installment_${installment.id}`,
      });

      if (!pixResult.success) {
        return res.status(500).json({ message: pixResult.error || "Erro ao gerar PIX" });
      }

      // Update installment with PIX data
      await storage.updateShopInstallment(installment.id, {
        paymentId: pixResult.paymentId?.toString(),
        pixCode: pixResult.qrCode,
        pixQrCodeBase64: pixResult.qrCodeBase64,
        pixExpiresAt: pixResult.expiresAt,
      });

      res.json({
        installmentId: installment.id,
        paymentId: pixResult.paymentId,
        qrCode: pixResult.qrCode,
        qrCodeBase64: pixResult.qrCodeBase64,
        expiresAt: pixResult.expiresAt,
        amount: installment.amount / 100,
      });
    } catch (error) {
      console.error("Generate PIX for installment error:", error);
      res.status(500).json({ message: "Erro ao gerar PIX da parcela" });
    }
  });

  // Send manual treasury notification
  app.post("/api/treasury/notifications/send", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { type, userIds, title, message } = req.body;
      
      if (!type || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "Tipo e destinatários são obrigatórios" });
      }
      
      const validTypes = ["percapta", "ump", "evento", "diversos"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Tipo inválido" });
      }
      
      let notificationTitle = title || "";
      let notificationBody = message || "";
      
      if (!title) {
        switch (type) {
          case "percapta":
            notificationTitle = "💰 Lembrete: Taxa Percapta Pendente";
            notificationBody = message || "Você tem a Taxa Percapta pendente. Acesse o painel financeiro para regularizar.";
            break;
          case "ump":
            notificationTitle = "💰 Lembrete: Taxa UMP Pendente";
            notificationBody = message || "Você tem mensalidades da Taxa UMP pendentes. Acesse o painel financeiro para regularizar.";
            break;
          case "evento":
            notificationTitle = "📌 Lembrete: Taxa de Evento Pendente";
            notificationBody = message || "Você tem taxa de evento pendente. Acesse o painel financeiro para regularizar.";
            break;
          default:
            notificationTitle = "💰 Lembrete Financeiro";
            notificationBody = message || "Você tem pendências financeiras. Acesse o painel financeiro para mais detalhes.";
        }
      }
      
      // OPTIMIZED: Batch insert all notifications in a single query
      const notificationsData = userIds.map(userId => ({
        userId,
        type: `treasury_${type}`,
        title: notificationTitle,
        body: notificationBody,
        data: JSON.stringify({ type, isManual: true }),
      }));
      
      await storage.createNotificationsBatch(notificationsData);
      
      // Push notifications must be sent individually (transport-level requirement)
      let sent = 0;
      let failed = 0;
      
      for (const userId of userIds) {
        try {
          await sendPushToUser(userId, {
            title: notificationTitle,
            body: notificationBody,
            url: '/study/financeiro',
            tag: `treasury-manual-${type}-${userId}`,
            icon: '/logo.png',
          });
          sent++;
        } catch (err) {
          console.error(`Failed to send push to user ${userId}:`, err);
          failed++;
        }
      }
      
      res.json({ sent, failed, total: userIds.length });
    } catch (error) {
      console.error("Send manual notification error:", error);
      res.status(500).json({ message: "Erro ao enviar notificações" });
    }
  });

  // OPTIMIZED: Get pending fee members for manual notifications - batch queries
  app.get("/api/treasury/notifications/pending-members", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const year = new Date().getFullYear();
      const [allMembers, settings] = await Promise.all([
        storage.getAllMembers(),
        storage.getTreasurySettings(year),
      ]);
      
      if (!settings) {
        return res.json([]);
      }
      
      // OPTIMIZED: Batch fetch all percapta and ump payments
      const [percaptaMap, umpMap] = await Promise.all([
        storage.getAllMemberPercaptaPayments(year),
        storage.getAllMemberUmpPayments(year),
      ]);
      
      const pendingPercapta: Array<{ id: number; fullName: string; type: string }> = [];
      const pendingUmp: Array<{ id: number; fullName: string; type: string }> = [];
      const currentMonth = new Date().getMonth() + 1;
      
      for (const member of allMembers) {
        // CRITICAL: Only active members should pay percapta and UMP
        if (!member.activeMember) continue;
        
        const percaptaPayment = percaptaMap.get(member.id);
        if (!percaptaPayment) {
          pendingPercapta.push({ id: member.id, fullName: member.fullName, type: "percapta" });
        }
        
        const umpPayments = umpMap.get(member.id) || [];
        const paidMonths = umpPayments.map(p => p.month);
        const unpaidMonths = Array.from({ length: currentMonth }, (_, i) => i + 1)
          .filter(m => !paidMonths.includes(m));
        
        if (unpaidMonths.length > 0) {
          pendingUmp.push({ id: member.id, fullName: member.fullName, type: "ump" });
        }
      }
      
      res.json({ pendingPercapta, pendingUmp });
    } catch (error) {
      console.error("Get pending members error:", error);
      res.status(500).json({ message: "Erro ao buscar membros pendentes" });
    }
  });

  // ==================== TREASURY REPORTS (Treasurer) ====================

  // Generate treasury report (Excel)
  app.get("/api/treasury/reports/excel", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const ExcelJSModule = await import("exceljs");
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const yearParam = req.query.year as string;
      const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
      const monthParam = req.query.month as string;
      const month = monthParam ? parseInt(monthParam) : undefined;
      const categoryParam = req.query.category as string;
      
      const entries = await storage.getTreasuryEntries({ year });
      let filteredEntries = month 
        ? entries.filter(e => {
            const entryDate = e.paidAt || e.createdAt;
            return entryDate && new Date(entryDate).getMonth() + 1 === month;
          })
        : entries;
      
      // Filter by category if specified
      if (categoryParam === "loja") {
        filteredEntries = filteredEntries.filter(e => e.category === "venda_loja" || e.category === "loja");
      } else if (categoryParam === "emprestimo" || categoryParam === "emprestimos") {
        filteredEntries = filteredEntries.filter(e => e.category === "emprestimo" || e.category === "emprestimo_parcela");
      }
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "UMP Emaus - Tesouraria";
      workbook.created = new Date();
      
      const sheet = workbook.addWorksheet("Movimentacoes");
      
      sheet.columns = [
        { header: "Data", key: "date", width: 15 },
        { header: "Tipo", key: "type", width: 12 },
        { header: "Categoria", key: "category", width: 20 },
        { header: "Descricao", key: "description", width: 40 },
        { header: "Valor (R$)", key: "amount", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Membro", key: "member", width: 25 },
      ];
      
      const members = await storage.getAllMembers();
      const memberMap = new Map(members.map(m => [m.id, m.fullName]));
      
      for (const entry of filteredEntries) {
        const entryDate = entry.paidAt || entry.createdAt;
        sheet.addRow({
          date: entryDate ? new Date(entryDate).toLocaleDateString("pt-BR") : "-",
          type: entry.type === "income" ? "Entrada" : "Saida",
          category: entry.category,
          description: entry.description || "-",
          amount: (entry.amount / 100).toFixed(2),
          status: entry.paymentStatus === "paid" ? "Pago" : entry.paymentStatus === "pending" ? "Pendente" : "Cancelado",
          member: entry.userId ? memberMap.get(entry.userId) || "-" : "-",
        });
      }
      
      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=relatorio-tesouraria-${year}${month ? `-${month.toString().padStart(2, "0")}` : ""}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Generate Excel report error:", error);
      res.status(500).json({ message: "Erro ao gerar relatorio" });
    }
  });

  // Generate member payments report (Excel)
  app.get("/api/treasury/reports/member-payments", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const ExcelJSModule = await import("exceljs");
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const yearParam = req.query.year as string;
      const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
      
      const members = await storage.getAllMembers();
      const settings = await storage.getTreasurySettings(year);
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "UMP Emaus - Tesouraria";
      workbook.created = new Date();
      
      const sheet = workbook.addWorksheet("Pagamentos");
      
      // Header row for months
      const headers = ["Membro", "Percapta"];
      for (let m = 1; m <= 12; m++) {
        headers.push(["", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][m]);
      }
      headers.push("Total Pago", "Total Devido");
      
      sheet.columns = headers.map((h, i) => ({ 
        header: h, 
        key: i === 0 ? "member" : i === 1 ? "percapta" : i <= 13 ? `month${i - 1}` : i === 14 ? "totalPaid" : "totalOwed",
        width: i === 0 ? 30 : 12,
      }));
      
      // OPTIMIZED: Batch fetch all payments instead of N+1
      const [percaptaMap, umpPaymentsMap] = await Promise.all([
        storage.getAllMemberPercaptaPayments(year),
        storage.getAllMemberUmpPayments(year),
      ]);
      
      for (const member of members) {
        const percaptaPayment = percaptaMap.get(member.id);
        const umpPayments = umpPaymentsMap.get(member.id) || [];
        const paidMonths = new Set(umpPayments.filter(p => p.paidAt).map(p => p.month));
        
        const row: Record<string, string> = {
          member: member.fullName,
          percapta: percaptaPayment?.paidAt ? "Pago" : "Pendente",
        };
        
        let totalPaid = percaptaPayment?.paidAt ? (settings?.percaptaAmount || 0) : 0;
        let totalOwed = !percaptaPayment?.paidAt ? (settings?.percaptaAmount || 0) : 0;
        
        for (let m = 1; m <= 12; m++) {
          if (paidMonths.has(m)) {
            row[`month${m}`] = "Pago";
            totalPaid += settings?.umpMonthlyAmount || 0;
          } else if (m <= new Date().getMonth() + 1) {
            row[`month${m}`] = "Pendente";
            totalOwed += settings?.umpMonthlyAmount || 0;
          } else {
            row[`month${m}`] = "-";
          }
        }
        
        row.totalPaid = `R$ ${(totalPaid / 100).toFixed(2)}`;
        row.totalOwed = `R$ ${(totalOwed / 100).toFixed(2)}`;
        
        sheet.addRow(row);
      }
      
      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=pagamentos-membros-${year}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Generate member payments report error:", error);
      res.status(500).json({ message: "Erro ao gerar relatorio" });
    }
  });

  // ==================== TREASURY NOTIFICATIONS (Treasurer) ====================

  // Send manual payment reminder to member
  app.post("/api/treasury/notifications/reminder", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { userId, message } = req.body;
      
      const parsedUserId = parseInt(userId);
      if (!userId || isNaN(parsedUserId)) {
        return res.status(400).json({ message: "ID do membro invalido" });
      }
      
      const member = await storage.getUserById(parsedUserId);
      if (!member) {
        return res.status(404).json({ message: "Membro nao encontrado" });
      }
      
      // Check if member has push subscriptions
      const subscriptions = await storage.getPushSubscriptionsByUserId(parsedUserId);
      if (subscriptions.length === 0) {
        return res.json({ 
          success: false, 
          sent: 0,
          message: `${member.fullName} nao tem notificacoes push ativadas. O membro precisa ativar as notificacoes no app.` 
        });
      }
      
      const customMessage = (message && typeof message === "string" && message.trim()) 
        ? message.trim().substring(0, 500)
        : "Você tem pagamentos pendentes na tesouraria. Acesse seu painel financeiro para mais detalhes.";
      
      const result = await sendPushToUser(parsedUserId, {
        title: "💰 Lembrete da Tesouraria",
        body: customMessage,
        icon: "/logo.png",
        data: { url: "/financeiro" },
      });
      
      if (result === 0) {
        return res.json({ 
          success: false, 
          sent: 0,
          message: `Falha ao enviar para ${member.fullName}. As subscricoes push podem estar expiradas.` 
        });
      }
      
      res.json({ 
        success: true, 
        sent: result,
        message: `Notificacao enviada para ${member.fullName}` 
      });
    } catch (error) {
      console.error("Send treasury reminder error:", error);
      res.status(500).json({ message: "Erro ao enviar notificacao" });
    }
  });

  // Send bulk payment reminder to all members with pending payments
  app.post("/api/treasury/notifications/bulk-reminder", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const { message } = req.body;
      const year = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      const members = await storage.getAllMembers();
      const membersWithPending = new Set<number>();
      
      for (const member of members) {
        // Only send reminders to active members for percapta/UMP
        if (!member.activeMember) {
          continue;
        }
        
        const percapta = await storage.getMemberPercaptaPayment(member.id, year);
        const umpPayments = await storage.getMemberUmpPayments(member.id, year);
        
        // Percapta: no record means NOT paid (record is created when payment is confirmed)
        const percaptaPending = !percapta;
        
        // UMP: check which months should be paid but aren't
        // umpPayments only contains months that were paid (created on payment confirmation)
        const paidMonths = new Set(umpPayments.map(p => p.month));
        const umpPending = Array.from({ length: currentMonth }, (_, i) => i + 1)
          .some(month => !paidMonths.has(month));
        
        if (percaptaPending || umpPending) {
          membersWithPending.add(member.id);
        }
      }
      
      const memberIds = Array.from(membersWithPending);
      
      if (memberIds.length === 0) {
        return res.json({ 
          success: true, 
          membersNotified: 0,
          sent: 0,
          message: "Nenhum membro com pagamentos pendentes" 
        });
      }
      
      const customMessage = (message && typeof message === "string" && message.trim()) 
        ? message.trim().substring(0, 500)
        : "Você tem pagamentos pendentes na tesouraria. Acesse seu painel financeiro para regularizar.";
      
      let sentCount = 0;
      for (const memberId of memberIds) {
        try {
          await sendPushToUser(memberId, {
            title: "💰 Lembrete de Pagamentos Pendentes",
            body: customMessage,
            url: "/study/financeiro",
            tag: `treasury-bulk-${memberId}`,
            icon: "/logo.png",
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send to member ${memberId}:`, err);
        }
      }
      const result = sentCount;
      
      res.json({ 
        success: true, 
        membersNotified: memberIds.length,
        sent: result,
      });
    } catch (error) {
      console.error("Send bulk treasury reminder error:", error);
      res.status(500).json({ message: "Erro ao enviar notificacoes" });
    }
  });

  // ==================== TREASURY ENTRY STATUS (for PIX polling) ====================
  
  // Get treasury entry payment status (for PIX modal polling)
  app.get("/api/treasury/entries/:entryId/status", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const entryId = parseInt(req.params.entryId);
      const userId = req.user!.id;
      
      const entry = await storage.getTreasuryEntryById(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      // Verify user owns this entry (for event fee, shop order, etc.)
      if (entry.userId && entry.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      res.json({ 
        paymentStatus: entry.paymentStatus,
        paidAt: entry.paidAt,
      });
    } catch (error) {
      console.error("Get entry status error:", error);
      res.status(500).json({ message: "Erro ao buscar status" });
    }
  });

  // ==================== EVENT FEES (Admin/Treasurer) ====================

  // Create/update fee for an event
  app.post("/api/treasury/event-fees/:eventId", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const { feeAmount, deadline } = req.body;
      
      if (!feeAmount || !deadline) {
        return res.status(400).json({ message: "Valor e prazo são obrigatórios" });
      }
      
      // Check if event exists
      const event = await storage.getSiteEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Check if fee already exists
      const existingFee = await storage.getEventFee(eventId);
      if (existingFee) {
        const updated = await storage.updateEventFee(eventId, {
          feeAmount: Math.round(feeAmount * 100),
          deadline: new Date(deadline),
        });
        return res.json(updated);
      }
      
      const fee = await storage.createEventFee({
        eventId,
        feeAmount: Math.round(feeAmount * 100),
        deadline: new Date(deadline),
      });
      
      res.status(201).json(fee);
    } catch (error) {
      console.error("Create event fee error:", error);
      res.status(500).json({ message: "Erro ao criar taxa do evento" });
    }
  });

  // Get event fee
  app.get("/api/treasury/event-fees/:eventId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const fee = await storage.getEventFee(eventId);
      
      if (!fee) {
        return res.status(404).json({ message: "Taxa não encontrada" });
      }
      
      res.json(fee);
    } catch (error) {
      console.error("Get event fee error:", error);
      res.status(500).json({ message: "Erro ao buscar taxa" });
    }
  });

  // Delete event fee
  app.delete("/api/treasury/event-fees/:eventId", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const deleted = await storage.deleteEventFee(eventId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Taxa não encontrada" });
      }
      
      res.json({ message: "Taxa removida com sucesso" });
    } catch (error) {
      console.error("Delete event fee error:", error);
      res.status(500).json({ message: "Erro ao remover taxa" });
    }
  });

  // OPTIMIZED: List all events with fees - batch confirmation counts
  app.get("/api/treasury/events-with-fees", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const eventsWithFees = await storage.getEventsWithFees();
      
      if (eventsWithFees.length === 0) {
        return res.json([]);
      }
      
      // OPTIMIZED: Batch fetch all confirmation counts in one query
      const eventIds = eventsWithFees.map(e => e.event.id);
      const countsMap = await storage.getEventConfirmationCountsByEventIds(eventIds);
      
      const result = eventsWithFees.map(({ event, fee }) => ({
        event,
        fee,
        confirmationCount: countsMap.get(event.id) || { members: 0, visitors: 0 },
      }));
      
      res.json(result);
    } catch (error) {
      console.error("Get events with fees error:", error);
      res.status(500).json({ message: "Erro ao listar eventos com taxa" });
    }
  });

  // ==================== SHOP PAYMENTS (TREASURER) ====================
  
  // OPTIMIZED: List all shop orders with payment details for treasurer - batch all queries
  app.get("/api/treasury/shop/orders", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string | undefined;
      const orders = await storage.getShopOrders(status ? { status } : undefined);
      
      if (orders.length === 0) {
        return res.json([]);
      }
      
      // OPTIMIZED: Collect all IDs for batch fetching
      const orderIds = orders.map(o => o.id);
      const userIds = Array.from(new Set(orders.map(o => o.userId)));
      
      // OPTIMIZED: Batch fetch all related data in parallel
      const [orderItemsMap, usersMap, installmentsMap] = await Promise.all([
        storage.getShopOrderItemsByOrderIds(orderIds),
        storage.getUsersByIds(userIds),
        storage.getShopInstallmentsByOrderIds(orderIds),
      ]);
      
      // Collect all product IDs from items
      const allItems = Array.from(orderItemsMap.values()).flat();
      const productIds = Array.from(new Set(allItems.map(i => i.itemId)));
      
      // OPTIMIZED: Batch fetch all products
      const products = productIds.length > 0 ? await storage.getShopItemsByIds(productIds) : [];
      const productsMap = new Map(products.map(p => [p.id, p]));
      
      const ordersWithDetails = orders.map(order => {
        const items = orderItemsMap.get(order.id) || [];
        const user = usersMap.get(order.userId);
        const installments = installmentsMap.get(order.id) || [];
        
        const itemsWithProduct = items.map(item => {
          const product = productsMap.get(item.itemId);
          return { 
            ...item, 
            product: product ? {
              id: product.id,
              name: product.name,
              price: product.price,
            } : null 
          };
        });
        
        // Extract manual customer name from observation
        let manualCustomerName: string | null = null;
        let isManualOrder = false;
        if (order.observation) {
          const manualMatch = order.observation.match(/\[PEDIDO MANUAL\] Cliente: ([^|]+)/);
          if (manualMatch) {
            manualCustomerName = manualMatch[1].trim();
            isManualOrder = true;
          }
        }
        
        return {
          ...order,
          user: user ? { 
            id: user.id, 
            fullName: user.fullName, 
            email: user.email,
          } : null,
          items: itemsWithProduct,
          installments: installments.map(inst => ({
            ...inst,
            isOverdue: inst.status === 'pending' && new Date(inst.dueDate) < new Date(),
          })),
          manualCustomerName,
          isManualOrder,
        };
      });
      
      res.json(ordersWithDetails);
    } catch (error) {
      console.error("Get treasury shop orders error:", error);
      res.status(500).json({ message: "Erro ao buscar pedidos da loja" });
    }
  });
  
  // Generate PIX for manual shop order (total or installment)
  app.post("/api/treasury/shop/orders/:orderId/generate-pix", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { installmentId } = req.body; // optional: if provided, generate for specific installment
      
      const order = await storage.getShopOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }
      
      // Check if Mercado Pago is configured
      if (!isMercadoPagoConfigured()) {
        return res.status(400).json({ message: "Sistema de pagamento PIX não configurado" });
      }
      
      // Get user info for email (if member)
      const user = await storage.getUserById(order.userId);
      
      // Determine if this is an external customer
      let customerName = user?.fullName || "Cliente";
      let customerEmail = user?.email;
      let isExternalCustomer = false;
      
      if (order.observation) {
        const manualMatch = order.observation.match(/\[PEDIDO MANUAL\] Cliente: ([^|]+)/);
        if (manualMatch) {
          customerName = manualMatch[1].trim();
          isExternalCustomer = true;
          customerEmail = undefined; // External customers don't have email in system
        }
      }
      
      if (installmentId) {
        // Generate PIX for specific installment
        const installments = await storage.getShopInstallments(orderId);
        const installment = installments.find(i => i.id === installmentId);
        
        if (!installment) {
          return res.status(404).json({ message: "Parcela não encontrada" });
        }
        
        if (installment.status === "paid") {
          return res.status(400).json({ message: "Parcela já foi paga" });
        }
        
        // Check if there's an existing valid PIX
        if (installment.pixCode && installment.pixExpiresAt && new Date(installment.pixExpiresAt) > new Date()) {
          return res.json({
            type: "installment",
            installmentId: installment.id,
            installmentNumber: installment.installmentNumber,
            amount: installment.amount / 100,
            qrCode: installment.pixCode,
            qrCodeBase64: installment.pixQrCodeBase64,
            expiresAt: installment.pixExpiresAt,
            customerName,
            customerEmail,
            isExternalCustomer,
          });
        }
        
        // Create new PIX payment for installment
        const result = await createPixPayment({
          amountCentavos: installment.amount,
          description: `Loja Emaustore - Pedido #${order.orderCode} - Parcela ${installment.installmentNumber}`,
          payerEmail: customerEmail || `pedido${orderId}@umpemaus.com.br`,
          payerName: customerName,
          externalReference: `shop-installment-${installment.id}`,
        });
        
        if (!result.success) {
          console.error("PIX payment creation failed:", result.error);
          return res.status(500).json({ message: result.error || "Erro ao gerar PIX" });
        }
        
        // Save PIX data to installment
        await storage.updateShopInstallment(installment.id, {
          pixCode: result.qrCode,
          pixQrCodeBase64: result.qrCodeBase64,
          pixExpiresAt: result.expiresAt,
          paymentId: result.paymentId?.toString(),
        });
        
        res.json({
          type: "installment",
          installmentId: installment.id,
          installmentNumber: installment.installmentNumber,
          amount: installment.amount / 100,
          qrCode: result.qrCode,
          qrCodeBase64: result.qrCodeBase64,
          expiresAt: result.expiresAt,
          paymentId: result.paymentId,
          customerName,
          customerEmail,
          isExternalCustomer,
        });
      } else {
        // Generate PIX for total amount (single payment orders or full payment)
        if (order.paymentStatus === "paid") {
          return res.status(400).json({ message: "Pedido já foi pago" });
        }
        
        // Get treasury entry if exists
        let entry = order.entryId ? await storage.getTreasuryEntryById(order.entryId) : null;
        
        // Check if there's an existing valid PIX on the entry
        if (entry?.pixQrCode && entry?.pixExpiresAt && new Date(entry.pixExpiresAt) > new Date()) {
          return res.json({
            type: "total",
            orderId: order.id,
            amount: order.totalAmount / 100,
            qrCode: entry.pixQrCode,
            qrCodeBase64: entry.pixQrCodeBase64,
            expiresAt: entry.pixExpiresAt,
            customerName,
            customerEmail,
            isExternalCustomer,
          });
        }
        
        // Create new PIX payment
        const result = await createPixPayment({
          amountCentavos: order.totalAmount,
          description: `Loja Emaustore - Pedido #${order.orderCode}`,
          payerEmail: customerEmail || `pedido${orderId}@umpemaus.com.br`,
          payerName: customerName,
          externalReference: `shop-order-${order.id}`,
        });
        
        if (!result.success) {
          console.error("PIX payment creation failed:", result.error);
          return res.status(500).json({ message: result.error || "Erro ao gerar PIX" });
        }
        
        // Save PIX data to treasury entry if exists
        if (entry) {
          await storage.updateTreasuryEntry(entry.id, {
            pixTransactionId: result.paymentId?.toString(),
            pixQrCode: result.qrCode,
            pixQrCodeBase64: result.qrCodeBase64,
            pixExpiresAt: result.expiresAt,
          });
        }
        
        res.json({
          type: "total",
          orderId: order.id,
          amount: order.totalAmount / 100,
          qrCode: result.qrCode,
          qrCodeBase64: result.qrCodeBase64,
          expiresAt: result.expiresAt,
          paymentId: result.paymentId,
          customerName,
          customerEmail,
          isExternalCustomer,
        });
      }
    } catch (error) {
      console.error("Generate shop order PIX error:", error);
      res.status(500).json({ message: "Erro ao gerar pagamento PIX" });
    }
  });

  // OPTIMIZED: List all shop installments for treasurer - batch queries
  app.get("/api/treasury/shop/installments", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const status = req.query.status as string | undefined;
      const allOrders = await storage.getShopOrders();
      
      if (allOrders.length === 0) {
        return res.json([]);
      }
      
      // Batch fetch all installments and users
      const orderIds = allOrders.map(o => o.id);
      const userIds = Array.from(new Set(allOrders.map(o => o.userId)));
      
      const [installmentsMap, usersMap] = await Promise.all([
        storage.getShopInstallmentsByOrderIds(orderIds),
        storage.getUsersByIds(userIds),
      ]);
      
      const allInstallments = [];
      for (const order of allOrders) {
        const installments = installmentsMap.get(order.id) || [];
        const user = usersMap.get(order.userId);
        
        for (const inst of installments) {
          if (status && inst.status !== status) continue;
          
          allInstallments.push({
            ...inst,
            orderCode: order.orderCode,
            isOverdue: inst.status === 'pending' && new Date(inst.dueDate) < new Date(),
            user: user ? {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              phone: user.phone,
            } : null,
          });
        }
      }
      
      // Sort by due date
      allInstallments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      
      res.json(allInstallments);
    } catch (error) {
      console.error("Get treasury shop installments error:", error);
      res.status(500).json({ message: "Erro ao buscar parcelas" });
    }
  });

  // Update installment payment status (treasurer manually marks as paid)
  app.patch("/api/treasury/shop/installments/:id", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID invalido" });
      }
      
      const installment = await storage.getShopInstallmentById(id);
      if (!installment) {
        return res.status(404).json({ message: "Parcela nao encontrada" });
      }
      
      const { status, paidAt } = req.body;
      const updates: Partial<typeof installment> = {};
      
      if (status) updates.status = status;
      if (status === 'paid' && !installment.paidAt) {
        updates.paidAt = paidAt ? new Date(paidAt) : new Date();
      }
      
      const updated = await storage.updateShopInstallment(id, updates);
      
      // Check if all installments are paid to update order status
      if (status === 'paid') {
        const order = await storage.getShopOrderById(installment.orderId);
        if (order) {
          const allInstallments = await storage.getShopInstallments(order.id);
          const allPaid = allInstallments.every(inst => inst.id === id ? true : inst.status === 'paid');
          
          if (allPaid) {
            await storage.updateShopOrder(order.id, { 
              paymentStatus: 'paid',
              paidAt: new Date(),
            });
          }
        }
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Update shop installment error:", error);
      res.status(500).json({ message: "Erro ao atualizar parcela" });
    }
  });

  // OPTIMIZED: Send push notification to all members with overdue installments - batch queries
  app.post("/api/treasury/shop/notify-overdue", authenticateToken, requireTreasurer, async (req: AuthRequest, res) => {
    try {
      const allOrders = await storage.getShopOrders();
      const now = new Date();
      
      // Filter pending orders only
      const pendingOrders = allOrders.filter(o => 
        o.paymentStatus !== 'paid' && o.paymentStatus !== 'cancelled'
      );
      
      if (pendingOrders.length === 0) {
        return res.json({ 
          message: "Nenhum pedido pendente encontrado",
          usersNotified: 0,
          notificationsSent: 0,
        });
      }
      
      // Batch fetch all installments
      const orderIds = pendingOrders.map(o => o.id);
      const installmentsMap = await storage.getShopInstallmentsByOrderIds(orderIds);
      
      // Aggregate all overdue installments per user
      const userOverdueMap = new Map<number, { count: number; total: number }>();
      
      for (const order of pendingOrders) {
        const installments = installmentsMap.get(order.id) || [];
        const overdueInstallments = installments.filter(inst => 
          inst.status === 'pending' && new Date(inst.dueDate) < now
        );
        
        if (overdueInstallments.length > 0) {
          const existing = userOverdueMap.get(order.userId) || { count: 0, total: 0 };
          existing.count += overdueInstallments.length;
          existing.total += overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0);
          userOverdueMap.set(order.userId, existing);
        }
      }
      
      // Batch fetch all users at once
      const userIds = Array.from(userOverdueMap.keys());
      const usersMap = await storage.getUsersByIds(userIds);
      
      // Send notifications to each user with aggregated totals
      let totalNotifications = 0;
      for (const [userId, data] of Array.from(userOverdueMap)) {
        const user = usersMap.get(userId);
        if (user) {
          const count = await sendPushToUser(userId, {
            title: "🔴 Parcela(s) Vencida(s) - Loja UMP",
            body: `Olá ${user.fullName.split(' ')[0]}, você tem ${data.count} parcela(s) vencida(s) no valor total de R$ ${(data.total / 100).toFixed(2).replace('.', ',')}. Regularize seu pagamento.`,
            url: "/membro/financeiro",
          });
          totalNotifications += count;
        }
      }
      
      res.json({ 
        message: `Notificacoes enviadas para ${userOverdueMap.size} membro(s)`,
        usersNotified: userOverdueMap.size,
        notificationsSent: totalNotifications,
      });
    } catch (error) {
      console.error("Notify overdue installments error:", error);
      res.status(500).json({ message: "Erro ao enviar notificacoes" });
    }
  });

  // ==================== EVENT CONFIRMATIONS ====================

  // Get confirmations for an event (admin/treasurer/marketing)
  // Per spec: Marketing can see list of confirmed attendees
  app.get("/api/treasury/event-confirmations/:eventId", authenticateToken, requireMarketingOrTreasurer, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const confirmations = await storage.getEventConfirmationsWithUsers(eventId);
      const counts = await storage.getEventConfirmationCount(eventId);
      
      res.json({
        confirmations,
        counts,
      });
    } catch (error) {
      console.error("Get event confirmations error:", error);
      res.status(500).json({ message: "Erro ao buscar confirmações" });
    }
  });

  // Confirm attendance at event (member)
  app.post("/api/events/:eventId/confirm", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user!.id;
      const rawVisitorCount = req.body.visitorCount;
      
      // Validate visitorCount
      const visitorCount = typeof rawVisitorCount === "number" && rawVisitorCount >= 0 
        ? Math.floor(rawVisitorCount) 
        : 0;
      
      // Check if event exists
      const event = await storage.getSiteEventById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Evento não encontrado" });
      }
      
      // Check if already confirmed
      const existing = await storage.getEventConfirmation(eventId, userId);
      if (existing) {
        return res.status(400).json({ message: "Você já confirmou presença neste evento" });
      }
      
      // Check if fee exists in event_fees table
      const fee = await storage.getEventFee(eventId);
      
      // Determine fee amount: use event_fee if exists, otherwise parse from event.price
      let feeAmountCentavos = 0;
      let hasFee = false;
      let deadline: Date | null = null;
      
      if (fee) {
        // Use existing event_fee
        feeAmountCentavos = fee.feeAmount;
        hasFee = true;
        deadline = fee.deadline;
        
        // Check deadline
        if (new Date() > fee.deadline) {
          return res.status(400).json({ message: "Prazo de confirmação encerrado" });
        }
      } else if (event.price && event.startDate) {
        // Parse price from event using robust Brazilian format parser
        // Only if startDate exists to avoid Invalid Date
        const priceCentavos = parseBrazilianPrice(event.price);
        if (priceCentavos !== null && priceCentavos > 0) {
          feeAmountCentavos = priceCentavos;
          hasFee = true;
          // Default deadline: event start date
          deadline = new Date(event.startDate + 'T23:59:59');
        }
      }
      
      const year = new Date().getFullYear();
      let entryId: number | null = null;
      let totalAmount = 0;
      
      if (hasFee && feeAmountCentavos > 0) {
        // Calculate total amount in centavos (member + visitors)
        const memberFee = feeAmountCentavos;
        const visitorsFee = visitorCount * feeAmountCentavos;
        totalAmount = memberFee + visitorsFee;
        
        // Create treasury entry for the fee
        const entry = await storage.createTreasuryEntry({
          type: "income",
          category: "taxa_evento",
          description: `Taxa do evento: ${event.title}${visitorCount > 0 ? ` (+${visitorCount} visitante(s))` : ''}`,
          amount: totalAmount,
          userId,
          referenceYear: year,
          paymentMethod: "pix",
          paymentStatus: "pending",
          eventId: eventId,
        });
        entryId = entry.id;
      }
      
      // Create confirmation
      const confirmation = await storage.createEventConfirmation({
        eventId,
        userId,
        isVisitor: false,
        visitorCount,
        entryId: entryId,
      });
      
      if (hasFee && totalAmount > 0) {
        res.status(201).json({
          confirmation,
          entryId,
          totalAmount: totalAmount / 100,
          hasFee: true,
          message: "Presença confirmada! Realize o pagamento em Meu Financeiro para completar sua inscrição.",
        });
      } else {
        res.status(201).json({
          confirmation,
          hasFee: false,
          message: "Presença confirmada com sucesso!",
        });
      }
    } catch (error) {
      console.error("Confirm event attendance error:", error);
      res.status(500).json({ message: "Erro ao confirmar presença" });
    }
  });

  // Cancel event confirmation (member)
  app.delete("/api/events/:eventId/confirm", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user!.id;
      
      // Check if confirmed
      const confirmation = await storage.getEventConfirmation(eventId, userId);
      if (!confirmation) {
        return res.status(404).json({ message: "Confirmação não encontrada" });
      }
      
      // Check if already paid
      if (confirmation.entryId) {
        const entry = await storage.getTreasuryEntryById(confirmation.entryId);
        if (entry?.paymentStatus === "paid") {
          return res.status(400).json({ message: "Não é possível cancelar após o pagamento. Entre em contato com o tesoureiro." });
        }
      }
      
      // Delete confirmation first, then update entry status
      await storage.deleteEventConfirmation(eventId, userId);
      
      // Mark entry as cancelled (after confirmation removed so counts stay accurate)
      if (confirmation.entryId) {
        await storage.updateTreasuryEntry(confirmation.entryId, { paymentStatus: "cancelled" });
      }
      
      res.json({ message: "Confirmação cancelada com sucesso" });
    } catch (error) {
      console.error("Cancel event confirmation error:", error);
      res.status(500).json({ message: "Erro ao cancelar confirmação" });
    }
  });

  // Get my confirmation status for an event (member)
  app.get("/api/events/:eventId/my-confirmation", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user!.id;
      
      const confirmation = await storage.getEventConfirmation(eventId, userId);
      const fee = await storage.getEventFee(eventId);
      const event = await storage.getSiteEventById(eventId);
      
      // Determine fee info: use event_fee if exists, otherwise parse from event.price
      let feeInfo: { amount: number; deadline: string } | null = null;
      
      if (fee) {
        feeInfo = { amount: fee.feeAmount / 100, deadline: fee.deadline.toISOString() };
      } else if (event?.price && event?.startDate) {
        // Only if startDate exists to avoid Invalid Date
        const priceCentavos = parseBrazilianPrice(event.price);
        if (priceCentavos !== null && priceCentavos > 0) {
          feeInfo = { 
            amount: priceCentavos / 100, 
            deadline: new Date(event.startDate + 'T23:59:59').toISOString() 
          };
        }
      }
      
      if (!confirmation) {
        return res.json({
          confirmed: false,
          fee: feeInfo,
        });
      }
      
      let paymentStatus = "pending";
      if (confirmation.entryId) {
        const entry = await storage.getTreasuryEntryById(confirmation.entryId);
        paymentStatus = entry?.paymentStatus || "pending";
      }
      
      res.json({
        confirmed: true,
        confirmation,
        paymentStatus,
        fee: feeInfo,
      });
    } catch (error) {
      console.error("Get my confirmation error:", error);
      res.status(500).json({ message: "Erro ao buscar confirmação" });
    }
  });

  // Generate PIX payment for event fee (member)
  app.post("/api/events/:eventId/generate-pix", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user!.id;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Check if confirmation exists
      const confirmation = await storage.getEventConfirmation(eventId, userId);
      if (!confirmation) {
        return res.status(400).json({ message: "Você precisa confirmar presença primeiro" });
      }
      
      if (!confirmation.entryId) {
        return res.status(400).json({ message: "Este evento não possui taxa" });
      }
      
      // Get the treasury entry
      const entry = await storage.getTreasuryEntryById(confirmation.entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entrada de pagamento não encontrada" });
      }
      
      // Check if already paid
      if (entry.paymentStatus === "completed" || entry.paymentStatus === "paid") {
        return res.status(400).json({ message: "Pagamento já foi realizado" });
      }
      
      // Check if there's an existing valid PIX with QR data
      if (entry.pixTransactionId && entry.pixExpiresAt && new Date(entry.pixExpiresAt) > new Date() && entry.pixQrCode && entry.pixQrCodeBase64) {
        // Return existing PIX data only if QR code is available
        return res.json({
          entryId: entry.id,
          amount: entry.amount / 100,
          qrCode: entry.pixQrCode,
          qrCodeBase64: entry.pixQrCodeBase64,
          expiresAt: entry.pixExpiresAt,
          paymentId: entry.pixTransactionId,
        });
      }
      
      // Check if Mercado Pago is configured
      if (!isMercadoPagoConfigured()) {
        return res.status(400).json({ message: "Sistema de pagamento PIX não configurado" });
      }
      
      // Get event details
      const event = await storage.getSiteEventById(eventId);
      const eventName = event?.title || "Evento";
      
      // Create new PIX payment
      const result = await createPixPayment({
        amountCentavos: entry.amount,
        description: `Taxa: ${eventName}`,
        payerEmail: user.email || `user${userId}@umpemaus.com.br`,
        payerName: user.fullName || user.username,
        externalReference: `event-fee-${entry.id}`,
      });
      
      if (!result.success) {
        console.error("PIX payment creation failed:", result.error);
        return res.status(500).json({ message: result.error || "Erro ao gerar PIX" });
      }
      
      // Save PIX data to treasury entry
      await storage.updateTreasuryEntry(entry.id, {
        pixTransactionId: result.paymentId?.toString(),
        pixQrCode: result.qrCode,
        pixQrCodeBase64: result.qrCodeBase64,
        pixExpiresAt: result.expiresAt,
      });
      
      res.json({
        entryId: entry.id,
        amount: entry.amount / 100,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        expiresAt: result.expiresAt,
        paymentId: result.paymentId,
      });
    } catch (error) {
      console.error("Generate event PIX error:", error);
      res.status(500).json({ message: "Erro ao gerar pagamento PIX" });
    }
  });

  // Get event confirmation counts (public for showing on event page)
  app.get("/api/events/:eventId/confirmation-count", async (req, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const counts = await storage.getEventConfirmationCount(eventId);
      const fee = await storage.getEventFee(eventId);
      const event = await storage.getSiteEventById(eventId);
      
      // Determine if event has fee
      let hasFee = !!fee;
      let deadline = fee?.deadline || null;
      let feeAmount: number | null = fee ? fee.feeAmount / 100 : null;
      
      if (!fee && event?.price && event?.startDate) {
        // Only if startDate exists to avoid Invalid Date
        const priceCentavos = parseBrazilianPrice(event.price);
        if (priceCentavos !== null && priceCentavos > 0) {
          hasFee = true;
          feeAmount = priceCentavos / 100;
          deadline = new Date(event.startDate + 'T23:59:59');
        }
      }
      
      res.json({
        ...counts,
        hasFee,
        feeAmount,
        deadline,
      });
    } catch (error) {
      console.error("Get confirmation count error:", error);
      res.status(500).json({ message: "Erro ao buscar contagem" });
    }
  });

  // ==================== PIX PAYMENT ENDPOINTS ====================

  // Check if Mercado Pago is configured
  app.get("/api/pix/status", authenticateToken, async (req: AuthRequest, res) => {
    res.json({ configured: isMercadoPagoConfigured() });
  });

  // Generate PIX for treasury entry payment
  app.post("/api/pix/generate/:entryId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const entryId = parseInt(req.params.entryId);
      const userId = req.user!.id;

      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({ message: "Pagamento PIX não configurado" });
      }

      const entry = await storage.getTreasuryEntryById(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada" });
      }

      if (entry.userId !== userId && !req.user!.isAdmin && !req.user!.isTreasurer) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      if (entry.paymentStatus === "completed") {
        return res.status(400).json({ message: "Este pagamento já foi realizado" });
      }

      if (entry.paymentStatus === "cancelled") {
        return res.status(400).json({ message: "Este pagamento foi cancelado" });
      }

      // Check if there's a valid unexpired PIX
      if (entry.pixQrCode && entry.pixExpiresAt && new Date(entry.pixExpiresAt) > new Date()) {
        return res.json({
          paymentId: entry.pixTransactionId,
          qrCode: entry.pixQrCode,
          qrCodeBase64: entry.pixQrCodeBase64,
          expiresAt: entry.pixExpiresAt,
          amount: entry.amount / 100,
        });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const result = await createPixPayment({
        amountCentavos: entry.amount,
        description: entry.description || `Pagamento UMP - ${entry.category}`,
        payerEmail: user.email,
        payerName: user.fullName,
        externalReference: `entry-${entryId}`,
      });

      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }

      await storage.updateTreasuryEntry(entryId, {
        pixTransactionId: result.paymentId?.toString(),
        pixQrCode: result.qrCode,
        pixQrCodeBase64: result.qrCodeBase64,
        pixExpiresAt: result.expiresAt,
        paymentStatus: "pending",
      });

      res.json({
        paymentId: result.paymentId,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        expiresAt: result.expiresAt,
        amount: entry.amount / 100,
      });
    } catch (error) {
      console.error("Generate PIX error:", error);
      res.status(500).json({ message: "Erro ao gerar PIX" });
    }
  });

  // Check PIX payment status
  app.get("/api/pix/check/:entryId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const entryId = parseInt(req.params.entryId);
      const userId = req.user!.id;

      const entry = await storage.getTreasuryEntryById(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada" });
      }

      if (entry.userId !== userId && !req.user!.isAdmin && !req.user!.isTreasurer) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      if (entry.paymentStatus === "completed") {
        return res.json({ status: "completed", approved: true });
      }

      if (!entry.pixTransactionId) {
        return res.json({ status: entry.paymentStatus, approved: false });
      }

      if (!isMercadoPagoConfigured()) {
        return res.json({ status: entry.paymentStatus, approved: false });
      }

      const result = await getPaymentStatus(parseInt(entry.pixTransactionId));

      if (result.success && result.approved) {
        await storage.updateTreasuryEntry(entryId, {
          paymentStatus: "completed",
          paidAt: new Date(),
        });

        // Process post-payment logic based on category
        await processPaymentCompletion(entry);

        return res.json({ status: "completed", approved: true });
      }

      // Check if expired
      if (entry.pixExpiresAt && new Date(entry.pixExpiresAt) < new Date()) {
        return res.json({ status: "expired", approved: false });
      }

      res.json({ 
        status: result.status || entry.paymentStatus, 
        approved: false 
      });
    } catch (error) {
      console.error("Check PIX status error:", error);
      res.status(500).json({ message: "Erro ao verificar pagamento" });
    }
  });

  // Webhook verification endpoint (GET) - Mercado Pago may use this to verify URL
  app.get("/api/pix/webhook", (req, res) => {
    console.log("[Webhook] GET verification request received");
    res.status(200).json({ status: "ok", message: "Webhook endpoint active" });
  });

  // Webhook for Mercado Pago notifications (POST)
  app.post("/api/pix/webhook", async (req, res) => {
    console.log("[Webhook] POST received:", JSON.stringify(req.body));
    
    try {
      // Handle Mercado Pago's verification/test requests
      if (!req.body || Object.keys(req.body).length === 0) {
        console.log("[Webhook] Empty body - responding OK for verification");
        return res.sendStatus(200);
      }

      // Handle action-based format (used in Mercado Pago tests)
      if (req.body.action && req.body.data?.id) {
        const { action, data } = req.body;
        console.log(`[Webhook] Action-based notification: ${action}, ID: ${data.id}`);
        
        // Process both payment.updated and payment.created
        // MercadoPago may send payment.created with status=approved in some cases
        // We always verify the actual status before marking as paid
        if (action === "payment.updated" || action === "payment.created") {
          const paymentId = typeof data.id === "string" ? parseInt(data.id) : data.id;
          
          if (isMercadoPagoConfigured() && !isNaN(paymentId)) {
            const result = await getPaymentStatus(paymentId);
            
            console.log(`[Webhook] Payment ${paymentId} status check:`, {
              success: result.success,
              status: result.status,
              statusDetail: result.statusDetail,
              approved: result.approved,
            });
            
            // IMPORTANT: Only mark as paid if:
            // 1. status === "approved" AND
            // 2. statusDetail === "accredited" (funds actually credited to account)
            // This prevents false positives from pending PIX creations or reserved funds
            const isActuallyPaid = result.success && 
                                   result.status === "approved" && 
                                   result.statusDetail === "accredited";
            
            if (!isActuallyPaid) {
              console.log(`[Webhook] Payment ${paymentId} NOT accredited yet. Status: ${result.status}, Detail: ${result.statusDetail}. Skipping completion.`);
            }
            
            if (isActuallyPaid) {
              // First, check treasury entries
              const entry = await storage.getTreasuryEntryByPixId(paymentId.toString());
              
              if (entry && entry.paymentStatus !== "completed") {
                await storage.updateTreasuryEntry(entry.id, {
                  paymentStatus: "completed",
                  paidAt: new Date(),
                });
                await processPaymentCompletion(entry);
                console.log(`[Webhook] Payment ${paymentId} approved for entry ${entry.id}`);
              }
              
              // Also check shop installments
              const installment = await storage.getShopInstallmentByPixId(paymentId.toString());
              if (installment) {
                // Skip if already paid - prevents duplicate processing on retries
                if (installment.status === "paid") {
                  console.log(`[Webhook Action-based] Installment ${installment.id} already paid, skipping`);
                } else {
                  const order = await storage.getShopOrderById(installment.orderId);
                  if (order) {
                    // Reuse existing entry: first check installment link, then earlier lookup
                    let entryId = installment.entryId;
                    if (!entryId && entry) {
                      // Reuse the entry found earlier by pixId lookup
                      entryId = entry.id;
                    }
                    if (!entryId) {
                      // Only create a new entry if no existing one found
                      const newEntry = await storage.createTreasuryEntry({
                        type: "income",
                        category: "loja",
                        description: `Pedido ${order.orderCode} - Parcela ${installment.installmentNumber}`,
                        amount: installment.amount,
                        userId: order.userId,
                        referenceYear: new Date().getFullYear(),
                        paymentMethod: "pix",
                        paymentStatus: "completed",
                        orderId: order.id,
                        pixTransactionId: paymentId.toString(),
                        paidAt: new Date(),
                      });
                      entryId = newEntry.id;
                    }
                    
                    // Update installment with paid status and entry link
                    await storage.updateShopInstallment(installment.id, {
                      status: "paid",
                      paidAt: new Date(),
                      entryId: entryId,
                    });
                    
                    // Check if all installments are paid (re-fetch to get fresh status)
                    const allInstallments = await storage.getShopInstallmentsByOrderId(installment.orderId);
                    const allPaid = allInstallments.every((inst: { status: string }) => 
                      inst.status === "paid"
                    );
                    
                    if (allPaid) {
                      await storage.updateShopOrder(installment.orderId, {
                        paymentStatus: "paid",
                        orderStatus: "paid",
                        paidAt: new Date(),
                      });
                    }
                    
                    // Send notification
                    await storage.createNotification({
                      userId: order.userId,
                      type: 'payment_confirmed',
                      title: '✅ Parcela Paga',
                      body: `Parcela ${installment.installmentNumber} do pedido ${order.orderCode} foi paga!`,
                      data: JSON.stringify({ orderId: order.id, installmentId: installment.id }),
                    });
                    
                    await sendPushToUser(order.userId, {
                      title: '✅ Parcela Paga',
                      body: `Parcela ${installment.installmentNumber} do pedido ${order.orderCode} confirmada!`,
                      url: '/membro/financeiro',
                      tag: `installment-paid-${installment.id}`,
                      icon: '/logo.png',
                    });
                    
                    console.log(`[Webhook] Installment ${installment.id} paid for order ${order.id}`);
                  }
                }
              }
            }
          }
        }
        
        return res.sendStatus(200);
      }

      // Handle type-based format (standard webhook format)
      if (!isValidWebhookPayload(req.body)) {
        console.log("[Webhook] Invalid payload format");
        return res.sendStatus(200); // Return 200 anyway to prevent retries
      }

      const { type, data } = req.body;
      console.log(`[Webhook] Type-based notification: ${type}, ID: ${data.id}`);

      if (type === "payment" || type === "payment.updated") {
        const paymentId = typeof data.id === "string" ? parseInt(data.id) : data.id;

        if (!isMercadoPagoConfigured()) {
          return res.sendStatus(200);
        }

        const result = await getPaymentStatus(paymentId);
        
        console.log(`[Webhook Type-based] Payment ${paymentId} status check:`, {
          success: result.success,
          status: result.status,
          statusDetail: result.statusDetail,
          approved: result.approved,
        });

        // IMPORTANT: Only mark as paid if:
        // 1. status === "approved" AND
        // 2. statusDetail === "accredited" (funds actually credited to account)
        const isActuallyPaid = result.success && 
                               result.status === "approved" && 
                               result.statusDetail === "accredited";
        
        if (!isActuallyPaid) {
          console.log(`[Webhook Type-based] Payment ${paymentId} NOT accredited. Status: ${result.status}, Detail: ${result.statusDetail}. Skipping.`);
          return res.sendStatus(200);
        }

        if (isActuallyPaid) {
          const entry = await storage.getTreasuryEntryByPixId(paymentId.toString());

          if (entry && entry.paymentStatus !== "completed") {
            await storage.updateTreasuryEntry(entry.id, {
              paymentStatus: "completed",
              paidAt: new Date(),
            });

            await processPaymentCompletion(entry);
            console.log(`[Webhook] Payment ${paymentId} approved for entry ${entry.id}`);
          }
          
          // Also check shop installments (same logic as action-based)
          const installment = await storage.getShopInstallmentByPixId(paymentId.toString());
          if (installment) {
            // Skip if already paid - prevents duplicate processing on retries
            if (installment.status === "paid") {
              console.log(`[Webhook Type-based] Installment ${installment.id} already paid, skipping`);
            } else {
              const order = await storage.getShopOrderById(installment.orderId);
              if (order) {
                // Reuse existing entry: first check installment, then earlier lookup
                let entryId = installment.entryId;
                if (!entryId && entry) {
                  entryId = entry.id;
                }
                if (!entryId) {
                  const newEntry = await storage.createTreasuryEntry({
                    type: "income",
                    category: "loja",
                    description: `Pedido ${order.orderCode} - Parcela ${installment.installmentNumber}`,
                    amount: installment.amount,
                    userId: order.userId,
                    referenceYear: new Date().getFullYear(),
                    paymentMethod: "pix",
                    paymentStatus: "completed",
                    orderId: order.id,
                    pixTransactionId: paymentId.toString(),
                    paidAt: new Date(),
                  });
                  entryId = newEntry.id;
                }
                
                await storage.updateShopInstallment(installment.id, {
                  status: "paid",
                  paidAt: new Date(),
                  entryId: entryId,
                });
                
                const allInstallments = await storage.getShopInstallmentsByOrderId(installment.orderId);
                const allPaid = allInstallments.every((inst: { status: string }) => inst.status === "paid");
                
                if (allPaid) {
                  await storage.updateShopOrder(installment.orderId, {
                    paymentStatus: "paid",
                    orderStatus: "paid",
                    paidAt: new Date(),
                  });
                }
                
                await storage.createNotification({
                  userId: order.userId,
                  type: 'payment_confirmed',
                  title: '✅ Parcela Paga',
                  body: `Parcela ${installment.installmentNumber} do pedido ${order.orderCode} foi paga!`,
                  data: JSON.stringify({ orderId: order.id, installmentId: installment.id }),
                });
                
                await sendPushToUser(order.userId, {
                  title: '✅ Parcela Paga',
                  body: `Parcela ${installment.installmentNumber} do pedido ${order.orderCode} confirmada!`,
                  url: '/membro/financeiro',
                  tag: `installment-paid-${installment.id}`,
                  icon: '/logo.png',
                });
                
                console.log(`[Webhook Type-based] Installment ${installment.id} paid for order ${order.id}`);
              }
            }
          }
        }
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("[Webhook] Error processing:", error);
      res.sendStatus(200); // Always return 200 to prevent retries
    }
  });

  // Helper function to process payment completion
  async function processPaymentCompletion(entry: any) {
    try {
      const now = new Date();

      // Handle UMP fee payment (supports multiple months)
      if (entry.category === "taxa_ump" && entry.userId) {
        let monthsToPay: number[] = [];
        
        // Check for multiple months in referenceMonths field
        if (entry.referenceMonths) {
          try {
            monthsToPay = JSON.parse(entry.referenceMonths);
          } catch (e) {
            console.error("Error parsing referenceMonths:", e);
          }
        }
        
        // Fallback to single month if no referenceMonths
        if (monthsToPay.length === 0 && entry.referenceMonth) {
          monthsToPay = [entry.referenceMonth];
        }
        
        // Create payment record for each month
        const settings = await storage.getTreasurySettings(entry.referenceYear);
        const amountPerMonth = settings ? settings.umpMonthlyAmount : Math.floor(entry.amount / monthsToPay.length);
        
        for (const month of monthsToPay) {
          try {
            await storage.createMemberUmpPayment({
              userId: entry.userId,
              year: entry.referenceYear,
              month,
              amount: amountPerMonth,
              entryId: entry.id,
              paidAt: now,
            });
          } catch (err) {
            console.error(`Error creating UMP payment for month ${month}:`, err);
          }
        }
        
        // Send push notification for UMP payment confirmation
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const monthsText = monthsToPay.length === 1 
          ? monthNames[monthsToPay[0] - 1]
          : `${monthsToPay.length} meses`;
        
        await storage.createNotification({
          userId: entry.userId,
          type: 'payment_confirmed',
          title: '✅ Pagamento UMP Confirmado',
          body: `Seu pagamento da taxa UMP (${monthsText}/${entry.referenceYear}) foi confirmado!`,
          data: JSON.stringify({ entryId: entry.id, category: 'taxa_ump' }),
        });
        
        await sendPushToUser(entry.userId, {
          title: '✅ Pagamento Confirmado',
          body: `Taxa UMP (${monthsText}/${entry.referenceYear}) paga com sucesso!`,
          url: '/membro/financeiro',
          tag: `payment-ump-${entry.id}`,
          icon: '/logo.png',
        });
        console.log(`[Payment] UMP payment notification sent to user ${entry.userId}`);
      }

      // Handle Percapta payment
      if (entry.category === "taxa_percapta" && entry.userId) {
        await storage.createMemberPercaptaPayment({
          userId: entry.userId,
          year: entry.referenceYear,
          amount: entry.amount,
          entryId: entry.id,
          paidAt: now,
        });
        
        // Send push notification for Percapta payment confirmation
        await storage.createNotification({
          userId: entry.userId,
          type: 'payment_confirmed',
          title: '✅ Pagamento Percapta Confirmado',
          body: `Seu pagamento da taxa Percapta ${entry.referenceYear} foi confirmado!`,
          data: JSON.stringify({ entryId: entry.id, category: 'taxa_percapta' }),
        });
        
        await sendPushToUser(entry.userId, {
          title: '✅ Pagamento Confirmado',
          body: `Taxa Percapta ${entry.referenceYear} paga com sucesso!`,
          url: '/membro/financeiro',
          tag: `payment-percapta-${entry.id}`,
          icon: '/logo.png',
        });
        console.log(`[Payment] Percapta payment notification sent to user ${entry.userId}`);
      }

      // Handle shop order
      if (entry.orderId) {
        await storage.updateShopOrder(entry.orderId, {
          paymentStatus: "paid",
          orderStatus: "paid",
          paidAt: now,
        });

        // Deduct stock for each item in the order
        const orderItems = await storage.getShopOrderItems(entry.orderId);
        for (const orderItem of orderItems) {
          await storage.deductStockQuantity(orderItem.itemId, orderItem.quantity);
        }
        console.log(`[Payment] Stock deducted for ${orderItems.length} items in order ${entry.orderId}`);

        // Send notification for paid order
        const order = await storage.getShopOrderById(entry.orderId);
        if (order) {
          await storage.createNotification({
            userId: order.userId,
            type: 'order_paid',
            title: '✅ Pagamento Confirmado',
            body: `O pagamento do pedido ${order.orderCode} foi confirmado! Aguarde a producao.`,
            data: JSON.stringify({ orderId: order.id, orderCode: order.orderCode }),
          });
          
          await sendPushToUser(order.userId, {
            title: '✅ Pagamento Confirmado',
            body: `O pagamento do pedido ${order.orderCode} foi confirmado!`,
            url: '/study/meus-pedidos',
            tag: `order-paid-${order.id}`,
            icon: '/logo.png',
          });
        }
      }

      // Handle event fee confirmation
      if (entry.eventId && entry.userId) {
        const confirmation = await storage.getEventConfirmation(entry.eventId, entry.userId);
        if (confirmation && !confirmation.entryId) {
          await storage.updateEventConfirmation(confirmation.id, {
            entryId: entry.id,
          });
        }
        
        // Send push notification for event fee payment confirmation
        const event = await storage.getSiteEventById(entry.eventId);
        const eventName = event?.title || 'Evento';
        
        await storage.createNotification({
          userId: entry.userId,
          type: 'payment_confirmed',
          title: '✅ Taxa de Evento Confirmada',
          body: `Seu pagamento para ${eventName} foi confirmado!`,
          data: JSON.stringify({ entryId: entry.id, eventId: entry.eventId }),
        });
        
        await sendPushToUser(entry.userId, {
          title: '✅ Pagamento Confirmado',
          body: `Taxa de ${eventName} paga com sucesso!`,
          url: '/membro/financeiro',
          tag: `payment-event-${entry.id}`,
          icon: '/logo.png',
        });
        console.log(`[Payment] Event fee notification sent to user ${entry.userId}`);
      }

      // Handle loan installment
      if (entry.loanId && entry.userId) {
        const loan = await storage.getTreasuryLoanById(entry.loanId);
        if (loan) {
          const installments = await storage.getTreasuryLoanInstallments(entry.loanId);
          const pendingInstallment = installments.find(i => i.status === "pending");
          if (pendingInstallment) {
            await storage.updateTreasuryLoanInstallment(pendingInstallment.id, {
              status: "paid",
              paidAt: now,
              entryId: entry.id,
            });

            // Check if all installments are paid
            const allPaid = installments.every(i => 
              i.id === pendingInstallment.id || i.status === "paid"
            );
            if (allPaid) {
              await storage.updateTreasuryLoan(entry.loanId, { status: "paid" });
            }
            
            // Send push notification for loan payment confirmation
            const paidCount = installments.filter(i => i.status === "paid").length + 1;
            const totalCount = installments.length;
            const isFullyPaid = allPaid;
            
            await storage.createNotification({
              userId: entry.userId,
              type: 'payment_confirmed',
              title: isFullyPaid ? '🎉 Empréstimo Quitado' : '✅ Parcela de Empréstimo Paga',
              body: isFullyPaid 
                ? `Seu empréstimo foi quitado! Todas as ${totalCount} parcelas foram pagas.`
                : `Parcela ${paidCount}/${totalCount} do empréstimo paga com sucesso!`,
              data: JSON.stringify({ entryId: entry.id, loanId: entry.loanId, installmentId: pendingInstallment.id }),
            });
            
            await sendPushToUser(entry.userId, {
              title: isFullyPaid ? '🎉 Empréstimo Quitado' : '✅ Parcela Paga',
              body: isFullyPaid 
                ? `Seu empréstimo foi totalmente quitado!`
                : `Parcela ${paidCount}/${totalCount} do empréstimo confirmada!`,
              url: '/membro/financeiro',
              tag: `payment-loan-${entry.id}`,
              icon: '/logo.png',
            });
            console.log(`[Payment] Loan payment notification sent to user ${entry.userId}`);
          }
        }
      }
    } catch (error) {
      console.error("Process payment completion error:", error);
    }
  }

  // Create payment entry and generate PIX for member fees
  app.post("/api/pix/member-fee", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { type, year, months } = req.body;

      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({ message: "Pagamento PIX não configurado" });
      }

      const settings = await storage.getTreasurySettings(year);
      if (!settings) {
        return res.status(400).json({ message: "Configurações da tesouraria não definidas" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // CRITICAL: Only active members can pay percapta and UMP taxes
      if (!user.activeMember) {
        return res.status(403).json({ 
          message: "Apenas membros ativos podem pagar taxas Percapta e UMP. Entre em contato com a liderança." 
        });
      }

      // PIX REUSE: Check for existing pending entry with valid PIX before creating new one
      let targetCategory = type === "percapta" ? "taxa_percapta" : "taxa_ump";
      const pendingEntries = await storage.getTreasuryEntriesByUserAndCategory(userId, targetCategory, year);
      const validPendingEntry = pendingEntries.find(e => 
        e.paymentStatus === "pending" && 
        e.pixQrCode && 
        e.pixExpiresAt && 
        new Date(e.pixExpiresAt) > new Date()
      );
      
      if (validPendingEntry) {
        // Return existing valid PIX instead of creating duplicate
        return res.json({
          entryId: validPendingEntry.id,
          paymentId: validPendingEntry.pixTransactionId,
          qrCode: validPendingEntry.pixQrCode,
          qrCodeBase64: validPendingEntry.pixQrCodeBase64,
          expiresAt: validPendingEntry.pixExpiresAt,
          amount: validPendingEntry.amount / 100,
        });
      }

      let amount: number;
      let description: string;
      let category: string;
      let referenceMonth: number | null = null;

      if (type === "percapta") {
        // Check if already paid
        const existingPayment = await storage.getMemberPercaptaPayment(userId, year);
        if (existingPayment) {
          return res.status(400).json({ message: "Taxa Percapta já paga para este ano" });
        }
        
        amount = settings.percaptaAmount;
        description = `Taxa Percapta ${year}`;
        category = "taxa_percapta";
      } else if (type === "ump") {
        if (!months || !Array.isArray(months) || months.length === 0) {
          return res.status(400).json({ message: "Selecione os meses para pagamento" });
        }

        // Check which months are already paid
        const paidMonths = await storage.getMemberUmpPayments(userId, year);
        const paidMonthNumbers = paidMonths.map(p => p.month);
        const unpaidMonths = months.filter((m: number) => !paidMonthNumbers.includes(m));

        if (unpaidMonths.length === 0) {
          return res.status(400).json({ message: "Todos os meses selecionados já foram pagos" });
        }

        // CRITICAL: Validate sequential months rule - cannot skip months
        // Per spec: "Não pode pular meses (deve pagar em ordem)"
        const sortedRequestedMonths = [...unpaidMonths].sort((a, b) => a - b);
        
        // Calculate starting month based on Day 10 Rule:
        // - If became active on day 1-10 of a month: pays from THAT month
        // - If became active on day 11-31: pays from NEXT month
        let startingMonth = 1;
        if (user.activeMemberSince) {
          const activeSince = new Date(user.activeMemberSince);
          if (activeSince.getFullYear() === year) {
            const dayOfMonth = activeSince.getDate();
            const monthActive = activeSince.getMonth() + 1;
            
            if (dayOfMonth <= 10) {
              startingMonth = monthActive; // Pays from this month
            } else {
              startingMonth = monthActive + 1; // Pays from next month
            }
          } else if (activeSince.getFullYear() > year) {
            // Not active in this year - no months due
            return res.status(400).json({ message: "Você não possui meses de UMP a pagar neste ano" });
          }
        }
        
        // Find the first unpaid month (next due month), starting from the member's starting month
        let firstUnpaidMonth = startingMonth;
        for (let m = startingMonth; m <= 12; m++) {
          if (!paidMonthNumbers.includes(m)) {
            firstUnpaidMonth = m;
            break;
          }
        }
        
        // Validate that no requested months are before the member's starting month
        if (sortedRequestedMonths[0] < startingMonth) {
          const startMonthName = new Date(2000, startingMonth - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
          return res.status(400).json({ 
            message: `Seu primeiro mês de UMP é ${startMonthName}. Meses anteriores não podem ser pagos.` 
          });
        }
        
        // Check if requested months start from the first unpaid month
        if (sortedRequestedMonths[0] !== firstUnpaidMonth) {
          const monthName = new Date(2000, firstUnpaidMonth - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
          return res.status(400).json({ 
            message: `Você precisa pagar primeiro o mês de ${monthName}. Não é permitido pular meses.` 
          });
        }
        
        // Check if requested months are sequential (no gaps)
        for (let i = 1; i < sortedRequestedMonths.length; i++) {
          if (sortedRequestedMonths[i] !== sortedRequestedMonths[i - 1] + 1) {
            return res.status(400).json({ 
              message: "Os meses selecionados devem ser sequenciais. Não é permitido pular meses." 
            });
          }
        }

        // Handle multiple months payment
        referenceMonth = sortedRequestedMonths[0]; // First month for backwards compatibility
        amount = settings.umpMonthlyAmount * sortedRequestedMonths.length;
        const monthNames = sortedRequestedMonths.map((m: number) => 
          new Date(2000, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" })
        ).join(", ");
        description = `Taxa UMP - ${monthNames}/${year}`;
        category = "taxa_ump";
      } else {
        return res.status(400).json({ message: "Tipo de taxa inválido" });
      }

      // For UMP, store the validated sequential months
      let referenceMonthsJson: string | null = null;
      if (type === "ump" && category === "taxa_ump") {
        // Re-check paid months to get valid unpaid months
        const paidMonthsCheck = await storage.getMemberUmpPayments(userId, year);
        const paidMonthNumbersCheck = paidMonthsCheck.map(p => p.month);
        const sortedMonths = [...months].filter((m: number) => !paidMonthNumbersCheck.includes(m)).sort((a, b) => a - b);
        referenceMonthsJson = JSON.stringify(sortedMonths);
      }

      // Create treasury entry with all months stored
      const entry = await storage.createTreasuryEntry({
        type: "income",
        category,
        description,
        amount,
        userId,
        referenceYear: year,
        referenceMonth,
        referenceMonths: referenceMonthsJson,
        paymentMethod: "pix",
        paymentStatus: "pending",
      });

      // Generate PIX
      const result = await createPixPayment({
        amountCentavos: amount,
        description,
        payerEmail: user.email,
        payerName: user.fullName,
        externalReference: `entry-${entry.id}`,
      });

      if (!result.success) {
        await storage.updateTreasuryEntry(entry.id, { paymentStatus: "cancelled" });
        return res.status(500).json({ message: result.error });
      }

      await storage.updateTreasuryEntry(entry.id, {
        pixTransactionId: result.paymentId?.toString(),
        pixQrCode: result.qrCode,
        pixQrCodeBase64: result.qrCodeBase64,
        pixExpiresAt: result.expiresAt,
      });

      res.json({
        entryId: entry.id,
        paymentId: result.paymentId,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        expiresAt: result.expiresAt,
        amount: amount / 100,
      });
    } catch (error) {
      console.error("Create member fee PIX error:", error);
      res.status(500).json({ message: "Erro ao criar pagamento" });
    }
  });

  // Generate PIX for shop order
  app.post("/api/pix/shop-order/:orderId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const userId = req.user!.id;

      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({ message: "Pagamento PIX não configurado" });
      }

      const order = await storage.getShopOrderById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Pedido não encontrado" });
      }

      if (order.userId !== userId) {
        return res.status(403).json({ message: "Não autorizado" });
      }

      if (order.paymentStatus === "paid") {
        return res.status(400).json({ message: "Pedido já pago" });
      }

      // Check if order has installments - if so, redirect to first installment payment
      const installments = await storage.getShopInstallmentsByOrderId(orderId);
      if (installments && installments.length > 1) {
        // Find first unpaid installment
        const firstUnpaidInstallment = installments.find((inst: { status: string }) => inst.status !== "paid");
        if (firstUnpaidInstallment) {
          // Check if there's existing valid PIX for this installment
          if (firstUnpaidInstallment.pixCode && firstUnpaidInstallment.paymentId &&
              firstUnpaidInstallment.pixExpiresAt && new Date(firstUnpaidInstallment.pixExpiresAt) > new Date()) {
            return res.json({
              installmentId: firstUnpaidInstallment.id,
              paymentId: firstUnpaidInstallment.paymentId,
              qrCode: firstUnpaidInstallment.pixCode,
              qrCodeBase64: firstUnpaidInstallment.pixQrCodeBase64,
              expiresAt: firstUnpaidInstallment.pixExpiresAt,
              amount: firstUnpaidInstallment.amount / 100,
              isInstallment: true,
              installmentNumber: firstUnpaidInstallment.installmentNumber,
              totalInstallments: installments.length,
            });
          }

          // Generate new PIX for first installment
          const user = await storage.getUserById(userId);
          if (!user) {
            return res.status(404).json({ message: "Usuário não encontrado" });
          }

          const pixResult = await createPixPayment({
            amountCentavos: firstUnpaidInstallment.amount,
            description: `Pedido ${order.orderCode} - Parcela ${firstUnpaidInstallment.installmentNumber}/${installments.length}`,
            payerEmail: user.email,
            payerName: user.fullName,
            externalReference: `shop_installment_${firstUnpaidInstallment.id}`,
          });

          if (!pixResult.success) {
            return res.status(500).json({ message: pixResult.error });
          }

          await storage.updateShopInstallment(firstUnpaidInstallment.id, {
            paymentId: pixResult.paymentId?.toString(),
            pixCode: pixResult.qrCode,
            pixQrCodeBase64: pixResult.qrCodeBase64,
            pixExpiresAt: pixResult.expiresAt,
          });

          return res.json({
            installmentId: firstUnpaidInstallment.id,
            paymentId: pixResult.paymentId,
            qrCode: pixResult.qrCode,
            qrCodeBase64: pixResult.qrCodeBase64,
            expiresAt: pixResult.expiresAt,
            amount: firstUnpaidInstallment.amount / 100,
            isInstallment: true,
            installmentNumber: firstUnpaidInstallment.installmentNumber,
            totalInstallments: installments.length,
          });
        }
      }

      // Non-installment order - generate PIX for full amount
      // Check if there's an existing valid entry with PIX
      if (order.entryId) {
        const existingEntry = await storage.getTreasuryEntryById(order.entryId);
        if (existingEntry?.pixQrCode && existingEntry.pixExpiresAt && 
            new Date(existingEntry.pixExpiresAt) > new Date()) {
          return res.json({
            entryId: existingEntry.id,
            paymentId: existingEntry.pixTransactionId,
            qrCode: existingEntry.pixQrCode,
            qrCodeBase64: existingEntry.pixQrCodeBase64,
            expiresAt: existingEntry.pixExpiresAt,
            amount: order.totalAmount / 100,
          });
        }
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Create or update treasury entry
      let entry;
      if (order.entryId) {
        entry = await storage.getTreasuryEntryById(order.entryId);
      }

      if (!entry) {
        entry = await storage.createTreasuryEntry({
          type: "income",
          category: "loja",
          description: `Pedido ${order.orderCode}`,
          amount: order.totalAmount,
          userId,
          referenceYear: new Date().getFullYear(),
          paymentMethod: "pix",
          paymentStatus: "pending",
          orderId: order.id,
        });

        await storage.updateShopOrder(orderId, { entryId: entry.id });
      }

      // Generate PIX
      console.log(`[Shop PIX] Generating PIX for order ${order.orderCode}:`, {
        orderId,
        totalAmount: order.totalAmount,
        totalAmountReais: order.totalAmount / 100,
      });
      
      const result = await createPixPayment({
        amountCentavos: order.totalAmount,
        description: `Pedido ${order.orderCode} - Loja UMP`,
        payerEmail: user.email,
        payerName: user.fullName,
        externalReference: `order-${orderId}`,
      });

      console.log(`[Shop PIX] MercadoPago response for order ${order.orderCode}:`, {
        success: result.success,
        hasQrCode: !!result.qrCode,
        hasQrCodeBase64: !!result.qrCodeBase64,
        paymentId: result.paymentId,
        status: result.status,
        error: result.error,
      });

      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }

      await storage.updateTreasuryEntry(entry.id, {
        pixTransactionId: result.paymentId?.toString(),
        pixQrCode: result.qrCode,
        pixQrCodeBase64: result.qrCodeBase64,
        pixExpiresAt: result.expiresAt,
      });

      res.json({
        entryId: entry.id,
        paymentId: result.paymentId,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        expiresAt: result.expiresAt,
        amount: order.totalAmount / 100,
      });
    } catch (error) {
      console.error("Create shop order PIX error:", error);
      res.status(500).json({ message: "Erro ao gerar PIX do pedido" });
    }
  });

  // Generate PIX for event fee
  app.post("/api/pix/event-fee/:eventId", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const eventId = parseInt(req.params.eventId);
      const userId = req.user!.id;

      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({ message: "Pagamento PIX não configurado" });
      }

      const confirmation = await storage.getEventConfirmation(eventId, userId);
      if (!confirmation) {
        return res.status(404).json({ message: "Confirmação não encontrada. Confirme presença primeiro." });
      }

      if (!confirmation.entryId) {
        return res.status(400).json({ message: "Entrada de pagamento não encontrada" });
      }

      const entry = await storage.getTreasuryEntryById(confirmation.entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada" });
      }

      if (entry.paymentStatus === "completed") {
        return res.status(400).json({ message: "Pagamento já realizado" });
      }

      // Check if there's a valid unexpired PIX
      if (entry.pixQrCode && entry.pixExpiresAt && new Date(entry.pixExpiresAt) > new Date()) {
        return res.json({
          entryId: entry.id,
          paymentId: entry.pixTransactionId,
          qrCode: entry.pixQrCode,
          qrCodeBase64: entry.pixQrCodeBase64,
          expiresAt: entry.pixExpiresAt,
          amount: entry.amount / 100,
        });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const event = await storage.getSiteEventById(eventId);

      // Generate PIX
      const result = await createPixPayment({
        amountCentavos: entry.amount,
        description: `Taxa do evento: ${event?.title || "Evento"}`,
        payerEmail: user.email,
        payerName: user.fullName,
        externalReference: `event-${eventId}-${userId}`,
      });

      if (!result.success) {
        return res.status(500).json({ message: result.error });
      }

      await storage.updateTreasuryEntry(entry.id, {
        pixTransactionId: result.paymentId?.toString(),
        pixQrCode: result.qrCode,
        pixQrCodeBase64: result.qrCodeBase64,
        pixExpiresAt: result.expiresAt,
      });

      res.json({
        entryId: entry.id,
        paymentId: result.paymentId,
        qrCode: result.qrCode,
        qrCodeBase64: result.qrCodeBase64,
        expiresAt: result.expiresAt,
        amount: entry.amount / 100,
      });
    } catch (error) {
      console.error("Create event fee PIX error:", error);
      res.status(500).json({ message: "Erro ao gerar PIX da taxa" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
