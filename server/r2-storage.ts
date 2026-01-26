import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let s3Client: S3Client | null = null;

export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
}

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!isR2Configured()) {
      throw new Error('R2 storage is not configured');
    }
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

export type ImageCategory = 'members' | 'devotionals' | 'events' | 'shop' | 'banners' | 'categories' | 'cards' | 'lessons' | 'verses' | 'general';

function generateKey(category: ImageCategory, filename: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const extension = filename.split('.').pop() || 'webp';
  return `${category}/${timestamp}-${randomSuffix}.${extension}`;
}

export async function uploadToR2(
  buffer: Buffer,
  category: ImageCategory,
  contentType: string = 'image/webp',
  originalFilename: string = 'image.webp'
): Promise<string> {
  const client = getS3Client();
  const key = generateKey(category, originalFilename);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await client.send(command);
  
  console.log(`[R2] Uploaded ${key} (${(buffer.length / 1024).toFixed(1)}KB)`);
  
  return `r2://${key}`;
}

export async function uploadBase64ToR2(
  base64Data: string,
  category: ImageCategory
): Promise<string> {
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 data URL format');
  }
  
  const contentType = matches[1];
  const base64 = matches[2];
  const buffer = Buffer.from(base64, 'base64');
  
  const extension = contentType.split('/')[1] || 'webp';
  return uploadToR2(buffer, category, contentType, `image.${extension}`);
}

export async function deleteFromR2(r2Url: string): Promise<void> {
  if (!r2Url.startsWith('r2://')) {
    return;
  }

  const client = getS3Client();
  const key = r2Url.replace('r2://', '');

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  try {
    await client.send(command);
    console.log(`[R2] Deleted ${key}`);
  } catch (error) {
    console.error('[R2] Error deleting file:', error);
  }
}

export async function getFromR2(r2Url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!r2Url.startsWith('r2://')) {
    return null;
  }

  const client = getS3Client();
  const key = r2Url.replace('r2://', '');

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await client.send(command);
    
    if (!response.Body) {
      return null;
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    const contentType = response.ContentType || 'image/webp';
    
    return { buffer, contentType };
  } catch (error) {
    console.error('[R2] Error getting file:', error);
    return null;
  }
}

export function getPublicUrl(r2Url: string | null | undefined, useProxy: boolean = false): string {
  if (!r2Url) return '';
  if (!r2Url.startsWith('r2://')) {
    return r2Url;
  }
  
  const key = r2Url.replace('r2://', '');
  
  // Always use proxy for better CORS support when requested
  if (useProxy) {
    return `/api/r2/${key}`;
  }
  
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/${key}`;
  }
  
  return `/api/r2/${key}`;
}

// Get proxy URL (always uses local proxy for CORS support)
export function getProxyUrl(r2Url: string | null | undefined): string {
  if (!r2Url) return '';
  if (!r2Url.startsWith('r2://')) {
    return r2Url;
  }
  
  const key = r2Url.replace('r2://', '');
  return `/api/r2/${key}`;
}

export async function getPresignedUploadUrl(
  category: ImageCategory,
  filename: string,
  contentType: string = 'image/webp',
  expiresIn: number = 3600
): Promise<{ uploadUrl: string; key: string }> {
  const client = getS3Client();
  const key = generateKey(category, filename);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  
  return { uploadUrl, key: `r2://${key}` };
}

export function isR2Url(url: string | null | undefined): boolean {
  return url?.startsWith('r2://') || false;
}

export function isBase64Url(url: string | null | undefined): boolean {
  return url?.startsWith('data:') || false;
}

export function getR2Key(r2Url: string): string {
  return r2Url.replace('r2://', '');
}

export function logR2Status(): void {
  if (isR2Configured()) {
    console.log(`[R2] Configured - Bucket: ${R2_BUCKET_NAME}, Public URL: ${R2_PUBLIC_URL || 'Using proxy'}`);
  } else {
    console.log('[R2] Not configured - Images will be stored as Base64 in database');
  }
}
