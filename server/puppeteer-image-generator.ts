import puppeteer, { Browser, Page } from 'puppeteer';
import sharp from 'sharp'; // Importação necessária para o fix das bordas

let browserInstance: Browser | null = null;

const NAV_TIMEOUT_MS = Number(process.env.PUPPETEER_NAV_TIMEOUT_MS || 60000);
const DEFAULT_TIMEOUT_MS = Number(process.env.PUPPETEER_DEFAULT_TIMEOUT_MS || 30000);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export async function closeBrowser(): Promise<void> {
  try {
    if (browserInstance) {
      await browserInstance.close();
    }
  } finally {
    browserInstance = null;
  }
}

// Processa o buffer e remove transparência substituindo por preto
async function processImageBuffer(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .flatten({ background: '#000000' }) // Transforma transparência em Preto Puro
    .png()
    .toBuffer();
}

async function preparePage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);

  // Menos ruído + ajuda a detectar falhas de assets.
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') console.log(`[Puppeteer][console:error] ${text}`);
    // info/debug podem ser muito barulhentos — mantemos só warning/error por padrão
    if (type === 'warning') console.log(`[Puppeteer][console:warn] ${text}`);
  });

  page.on('pageerror', (err) => {
    console.log(`[Puppeteer][pageerror] ${err?.message || String(err)}`);
  });

  await page.setViewport({ width: 1920, height: 1080 });

  return page;
}

async function waitForAnySelector(page: Page, selectors: string[], timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  const uniq = Array.from(new Set(selectors.filter(Boolean)));

  while (Date.now() < deadline) {
    for (const sel of uniq) {
      const el = await page.$(sel);
      if (el) return sel;
    }
    await sleep(250);
  }

  throw new Error(`Timeout waiting for any selector: ${uniq.join(' | ')}`);
}

async function clickFirstAvailable(page: Page, selectors: string[], timeoutMs: number): Promise<string> {
  const selector = await waitForAnySelector(page, selectors, timeoutMs);
  await page.click(selector);
  return selector;
}

async function getBodyText(page: Page): Promise<string> {
  try {
    return await page.evaluate(() => document.body?.innerText || '');
  } catch {
    return '';
  }
}

/**
 * Tenta capturar a imagem gerada:
 * 1) Preferencialmente pega o <canvas> dentro do dialog de share (toDataURL)
 * 2) Se não houver canvas, faz screenshot do dialog/elemento
 * 3) Como último fallback, screenshot da página
 */
async function captureShareImage(page: Page, dialogSelectors: string[], canvasSelectors: string[], fallbackElementSelectors: string[]): Promise<Buffer> {
  // dialog
  let dialogSelector: string | null = null;
  try {
    dialogSelector = await waitForAnySelector(page, dialogSelectors, 15000);
  } catch {
    dialogSelector = null;
  }

  // canvas (preferido)
  const canvasSelCandidates = [
    ...(dialogSelector ? canvasSelectors.map((s) => `${dialogSelector} ${s}`) : []),
    ...canvasSelectors,
  ];

  for (const canvasSel of Array.from(new Set(canvasSelCandidates))) {
    try {
      await page.waitForSelector(canvasSel, { timeout: 8000 });
      const dataUrl = await page.evaluate((sel) => {
        const canvas = document.querySelector(sel) as HTMLCanvasElement | null;
        if (!canvas) return null;
        try {
          return canvas.toDataURL('image/png', 1.0);
        } catch {
          return null;
        }
      }, canvasSel);

      if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        const rawBuffer = Buffer.from(dataUrl.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        return await processImageBuffer(rawBuffer);
      }
    } catch {
      // tenta próximo
    }
  }

  // screenshot do dialog/elemento (2º melhor)
  const elementCandidates = [
    ...(dialogSelector ? [dialogSelector] : []),
    ...fallbackElementSelectors,
  ];

  for (const sel of Array.from(new Set(elementCandidates.filter(Boolean)))) {
    try {
      const handle = await page.$(sel);
      if (handle) {
        const buf = (await handle.screenshot({ type: 'png' })) as Buffer;
        return await processImageBuffer(buf);
      }
    } catch {
      // tenta próximo
    }
  }

  // fallback final: página inteira
  const buf = (await page.screenshot({ type: 'png', fullPage: true })) as Buffer;
  return await processImageBuffer(buf);
}

function getBaseUrl(): string {
  // Permite forçar URL base em ambientes como HF Spaces / proxies
  const explicit = process.env.APP_BASE_URL || process.env.BASE_URL || process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const port = process.env.PORT || 5000;
  return process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : `http://localhost:${port}`;
}

async function gotoApp(page: Page, path: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  // Em SPA, networkidle0 pode nunca ocorrer por websockets/polling.
  // Damos um tempo curto para hidratar + requests iniciais.
  await sleep(1500);
}

export async function generateVerseShareImage(): Promise<Buffer> {
  console.log('[Puppeteer] Generating verse share image with Sharp fix...');
  const browser = await getBrowser();
  const page = await preparePage(browser);

  try {
    await gotoApp(page, '/versiculo-do-dia');

    // Aguarda app renderizar o conteúdo (ou detectar ausência)
    await sleep(1500);
    const bodyText = await getBodyText(page);
    if (bodyText.includes('Nenhum versículo do dia')) {
      throw new Error('Daily verse not available yet (UI reports 404/empty).');
    }

    const shareButtonSelectors = [
      '[data-testid="button-share-verse"]',
      'button[data-testid="button-share-verse"]',
      '[data-testid="share-verse"]',
      'button[aria-label*="Compartilhar"]',
      'button[aria-label*="compartilhar"]',
    ];

    // Clicar no botão de compartilhar (primário)
    await clickFirstAvailable(page, shareButtonSelectors, 30000);

    const dialogSelectors = [
      '[data-testid="dialog-share-verse"]',
      '[data-testid="dialog-share"]',
      '[role="dialog"]',
    ];

    const canvasSelectors = [
      'canvas[data-testid="share-canvas"]',
      'canvas',
    ];

    const fallbackElementSelectors = [
      '[data-testid="dialog-share-verse"]',
      '[data-testid="share-preview"]',
      '[data-testid="verse-share-preview"]',
      '#root',
      'body',
    ];

    return await captureShareImage(page, dialogSelectors, canvasSelectors, fallbackElementSelectors);
  } finally {
    await page.close();
  }
}

export async function generateReflectionShareImage(): Promise<Buffer> {
  console.log('[Puppeteer] Generating reflection share image with Sharp fix...');
  const browser = await getBrowser();
  const page = await preparePage(browser);

  try {
    await gotoApp(page, '/versiculo-do-dia');

    await sleep(1500);
    const bodyText = await getBodyText(page);
    if (bodyText.includes('Nenhum versículo do dia')) {
      throw new Error('Daily verse not available yet (UI reports 404/empty).');
    }

    const shareButtonSelectors = [
      '[data-testid="button-share-reflection"]',
      'button[data-testid="button-share-reflection"]',
      '[data-testid="share-reflection"]',
      'button[aria-label*="Reflexão"]',
      'button[aria-label*="reflexão"]',
      'button[aria-label*="Compartilhar"]',
      'button[aria-label*="compartilhar"]',
    ];

    await clickFirstAvailable(page, shareButtonSelectors, 30000);

    const dialogSelectors = [
      '[data-testid="dialog-share-reflection"]',
      '[data-testid="dialog-share"]',
      '[role="dialog"]',
    ];

    const canvasSelectors = [
      'canvas[data-testid="share-canvas"]',
      'canvas',
    ];

    const fallbackElementSelectors = [
      '[data-testid="dialog-share-reflection"]',
      '[data-testid="reflection-share-preview"]',
      '[data-testid="share-preview"]',
      '#root',
      'body',
    ];

    return await captureShareImage(page, dialogSelectors, canvasSelectors, fallbackElementSelectors);
  } finally {
    await page.close();
  }
}

export async function generateBirthdayShareImage(memberId: number): Promise<Buffer> {
  console.log(`[Puppeteer] Generating birthday share image for member ${memberId} with Sharp fix...`);
  const browser = await getBrowser();
  const page = await preparePage(browser);

  try {
    await gotoApp(page, `/aniversario/${memberId}`);

    await sleep(1500);

    const shareButtonSelectors = [
      `[data-testid="button-share-birthday-${memberId}"]`,
      `[data-testid="button-share-birthday"]`,
      'button[data-testid^="button-share-birthday"]',
      'button[aria-label*="Compartilhar"]',
      'button[aria-label*="compartilhar"]',
    ];

    await clickFirstAvailable(page, shareButtonSelectors, 30000);

    const dialogSelectors = [
      '[data-testid="dialog-share-birthday"]',
      '[data-testid="dialog-share"]',
      '[role="dialog"]',
    ];

    const canvasSelectors = [
      'canvas[data-testid="share-canvas"]',
      'canvas',
    ];

    const fallbackElementSelectors = [
      '[data-testid="dialog-share-birthday"]',
      '[data-testid="birthday-share-preview"]',
      '[data-testid="share-preview"]',
      '#root',
      'body',
    ];

    return await captureShareImage(page, dialogSelectors, canvasSelectors, fallbackElementSelectors);
  } finally {
    await page.close();
  }
}
