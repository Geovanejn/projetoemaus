import puppeteer, { Browser, Page } from 'puppeteer';
import sharp from 'sharp'; // Importação necessária para o fix das bordas

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    console.log('[Puppeteer] Launching browser...');
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-file-access-from-files',
        '--single-process',
      ],
    });
  }
  return browserInstance;
}

// Função para processar o buffer e remover transparência substituindo por preto
async function processImageBuffer(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .flatten({ background: '#000000' }) // O "Segredo": Transforma transparência em Preto Puro
    .toBuffer();
}

export async function generateVerseShareImage(): Promise<Buffer> {
  console.log('[Puppeteer] Generating verse share image with Sharp flattening fix...');
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/versiculo-do-dia`;
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.waitForSelector('[data-testid="button-share-verse"]', { timeout: 30000 });
    await page.click('[data-testid="button-share-verse"]');
    await page.waitForSelector('[data-testid="dialog-share-verse"]', { timeout: 15000 });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const imageDataUrl = await page.evaluate(async () => {
      const whatsappButton = document.querySelector('[data-testid="button-share-whatsapp"]') as HTMLButtonElement;
      return new Promise<string>((resolve, reject) => {
        let capturedDataUrl: string | null = null;
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
          capturedDataUrl = this.toDataURL('image/png', 1.0);
          originalToBlob.call(this, callback, type, quality);
        };
        const checkInterval = setInterval(() => {
          if (capturedDataUrl) {
            clearInterval(checkInterval);
            HTMLCanvasElement.prototype.toBlob = originalToBlob;
            resolve(capturedDataUrl);
          }
        }, 100);
        setTimeout(() => { clearInterval(checkInterval); reject(new Error('Timeout')); }, 15000);
        whatsappButton.click();
      });
    });
    
    const rawBuffer = Buffer.from(imageDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    // AQUI A MÁGICA ACONTECE:
    // Processamos o buffer para garantir que não existam "pontas brancas"
    return await processImageBuffer(rawBuffer);
    
  } finally {
    await page.close();
  }
}

export async function generateReflectionShareImage(): Promise<Buffer> {
  console.log('[Puppeteer] Generating reflection share image with Sharp fix...');
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/versiculo-do-dia`;
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.waitForSelector('[data-testid="button-share-reflection"]', { timeout: 30000 });
    await page.click('[data-testid="button-share-reflection"]');
    await page.waitForSelector('[data-testid="dialog-share-reflection"]', { timeout: 15000 });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const imageDataUrl = await page.evaluate(async () => {
      const whatsappButton = document.querySelector('[data-testid="button-share-reflection-whatsapp"]') as HTMLButtonElement;
      return new Promise<string>((resolve, reject) => {
        let capturedDataUrl: string | null = null;
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
          capturedDataUrl = this.toDataURL('image/png', 1.0);
          originalToBlob.call(this, callback, type, quality);
        };
        const checkInterval = setInterval(() => {
          if (capturedDataUrl) {
            clearInterval(checkInterval);
            HTMLCanvasElement.prototype.toBlob = originalToBlob;
            resolve(capturedDataUrl);
          }
        }, 100);
        setTimeout(() => { clearInterval(checkInterval); reject(new Error('Timeout')); }, 15000);
        whatsappButton.click();
      });
    });
    
    const rawBuffer = Buffer.from(imageDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    return await processImageBuffer(rawBuffer);
    
  } finally {
    await page.close();
  }
}

export async function generateBirthdayShareImage(memberId: number): Promise<Buffer> {
  console.log(`[Puppeteer] Generating birthday share image for member ${memberId} with Sharp fix...`);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/aniversario/${memberId}`;
    
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.waitForSelector(`[data-testid="button-share-birthday-${memberId}"]`, { timeout: 30000 });
    await page.click(`[data-testid="button-share-birthday-${memberId}"]`);
    await page.waitForSelector('[data-testid="dialog-share-birthday"]', { timeout: 15000 });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const imageDataUrl = await page.evaluate(async () => {
      const whatsappButton = document.querySelector('[data-testid="button-share-whatsapp"]') as HTMLButtonElement;
      return new Promise<string>((resolve, reject) => {
        let capturedDataUrl: string | null = null;
        const originalToBlob = HTMLCanvasElement.prototype.toBlob;
        HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
          capturedDataUrl = this.toDataURL('image/png', 1.0);
          originalToBlob.call(this, callback, type, quality);
        };
        const checkInterval = setInterval(() => {
          if (capturedDataUrl) {
            clearInterval(checkInterval);
            HTMLCanvasElement.prototype.toBlob = originalToBlob;
            resolve(capturedDataUrl);
          }
        }, 100);
        setTimeout(() => { clearInterval(checkInterval); reject(new Error('Timeout')); }, 15000);
        whatsappButton.click();
      });
    });
    
    const rawBuffer = Buffer.from(imageDataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    return await processImageBuffer(rawBuffer);
    
  } finally {
    await page.close();
  }
}

function getBaseUrl(): string {
  const port = process.env.PORT || 5000;
  return process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : `http://localhost:${port}`;
}

export { closeBrowser };
