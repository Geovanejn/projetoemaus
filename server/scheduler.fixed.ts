import cron from "node-cron";
import { storage } from "./storage";
import { sendBirthdayEmail } from "./email";
import { notifyStreakReminder, notifyInactivity, notifyDailyVerse, notifyDailyVerseWithLink, notifyEventDeadline, notifyEventStartingSoon, notifyEventStarted, notifyMarketingEventReminder, sendPushToAllMembers, sendPushToUser } from "./notifications";
import { syncInstagramPosts, isInstagramConfigured, publishInstagramStory, isInstagramPublishingConfigured, refreshInstagramToken } from "./instagram";
import { generateDailyVerseWithAI, generateRecoveryVersesWithAI, isAIConfigured } from "./ai";
import { getEventCurrentDay, getEventTotalDays, createBrazilDate, getDatePartsFromDate, getTodayBrazilParts } from "./utils/date";
import { uploadStoryImageToR2 } from "./story-image-generator";
import { generateVerseShareImage, generateReflectionShareImage, generateBirthdayShareImage } from "./puppeteer-image-generator";
import { getPublicUrl } from "./r2-storage";
import sharp from "sharp";

// Rate limiting helper for Resend (10 requests per second approved)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const EMAIL_RATE_LIMIT_DELAY = 110; // 110ms between emails (10 req/s limit approved by Resend)

// ==================== R2 UPLOAD WRAPPER (compatível com versões antigas) ====================
// Alguns trechos do scheduler referenciam "uploadToR2" por compatibilidade.
// A implementação abaixo delega para "uploadStoryImageToR2" e normaliza o retorno.
async function uploadToR2(
  buffer: Buffer,
  folder: string,
  contentType: string,
  filename: string
): Promise<string> {
  const result: any = await uploadStoryImageToR2(buffer, folder, contentType, filename);

  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    return (
      result.key ||
      result.r2Key ||
      result.path ||
      result.objectKey ||
      result.Key ||
      result.name
    );
  }
  throw new Error("uploadStoryImageToR2 retornou um tipo inesperado");
}

// ==================== FALLBACK DE IMAGENS (SEM PUPPETEER) ====================
// Motivação: em ambientes como Hugging Face Spaces, o Puppeteer pode falhar (timeouts/seletores).
// Este fallback gera imagens 1080x1920 via SVG+Sharp, sem depender do front-end.

function escapeXml(input: string): string {
  return (input || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTextToLines(text: string, maxCharsPerLine: number): string[] {
  const clean = (text || "").trim().replace(/\s+/g, " ");
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = w;
  }
  if (current) lines.push(current);
  return lines;
}

function buildStorySvg(params: {
  title: string;
  bodyLines: string[];
  footer?: string;
  accent?: string;
}): string {
  const { title, bodyLines, footer, accent } = params;

  // Layout constants
  const W = 1080;
  const H = 1920;
  const marginX = 110;
  const titleY = 220;
  const bodyStartY = 420;
  const lineHeight = 68;

  const safeTitle = escapeXml(title);
  const safeFooter = footer ? escapeXml(footer) : "";
  const stroke = accent || "#f5c542";

  // Body lines (clamp to avoid overflow)
  const maxLines = 18;
  const lines = bodyLines.slice(0, maxLines);

  const bodyTspans = lines
    .map((l, i) => {
      const y = bodyStartY + i * lineHeight;
      return `<text x="${marginX}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="46" fill="#F3F4F6" opacity="0.98">${escapeXml(l)}</text>`;
    })
    .join("");

  const footerBlock = footer
    ? `<text x="${marginX}" y="${H - 210}" font-family="Arial, Helvetica, sans-serif" font-size="38" fill="#E5E7EB" opacity="0.92">${safeFooter}</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0B0F1A"/>
      <stop offset="55%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#0B0F1A"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${stroke}" stop-opacity="0.0"/>
      <stop offset="35%" stop-color="${stroke}" stop-opacity="0.45"/>
      <stop offset="65%" stop-color="${stroke}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${stroke}" stop-opacity="0.0"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="110" width="${W}" height="10" fill="url(#accent)"/>
  <rect x="0" y="${H - 140}" width="${W}" height="10" fill="url(#accent)"/>

  <g filter="url(#softShadow)">
    <text x="${marginX}" y="${titleY}" font-family="Arial, Helvetica, sans-serif" font-size="54" font-weight="700" fill="#FFFFFF">${safeTitle}</text>
    ${bodyTspans}
    ${footerBlock}
    <text x="${marginX}" y="${H - 120}" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#9CA3AF" opacity="0.9">UMP Emaús • Conteúdo automático</text>
  </g>
</svg>`;
}

async function generateVerseStoryFallbackPng(post: any): Promise<Buffer> {
  const verseText = String(post?.verse || "").trim();
  const reference = String(post?.reference || "").trim();
  const lines = wrapTextToLines(verseText, 36);

  const svg = buildStorySvg({
    title: "VERSÍCULO DO DIA",
    bodyLines: lines.length ? lines : ["(Sem conteúdo disponível no momento)"],
    footer: reference || undefined,
    accent: "#F59E0B"
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function generateReflectionStoryFallbackPng(post: any): Promise<Buffer> {
  const title = String(post?.reflectionTitle || "REFLEXÃO DO DIA").trim() || "REFLEXÃO DO DIA";
  const reflection = String(post?.reflection || "").trim();
  const lines = wrapTextToLines(reflection, 42);

  const svg = buildStorySvg({
    title: title.toUpperCase().slice(0, 36),
    bodyLines: lines.length ? lines : ["(Reflexão ainda não gerada. Tente novamente em alguns minutos.)"],
    footer: post?.reference ? `Base: ${String(post.reference)}` : undefined,
    accent: "#60A5FA"
  });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function getSaoPauloDateParts(date = new Date()): { dateKey: string; day: number; month: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === "year")?.value || "2025";
  const month = parts.find(p => p.type === "month")?.value || "01";
  const day = parts.find(p => p.type === "day")?.value || "01";
  return { dateKey: `${year}-${month}-${day}`, day: parseInt(day, 10), month: parseInt(month, 10) };
}

async function waitForTodayDailyVersePost(maxWaitMs: number = 12 * 60 * 1000, pollMs: number = 15000): Promise<any | null> {
  const { dateKey } = getSaoPauloDateParts();
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const post = await storage.getActiveDailyVersePost();
    if (post) {
      // Confirma que é do "hoje" em São Paulo (evita pegar o de ontem perto da virada UTC)
      const publishedKey = getSaoPauloDateParts(new Date(post.publishedAt)).dateKey;
      if (publishedKey === dateKey) return post;
    }
    await delay(pollMs);
  }
  return null;
}
// =========================================================================================


const BIBLE_VERSES = [
  { verse: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", reference: "João 3:16 (ARA)" },
  { verse: "O Senhor é o meu pastor; nada me faltará.", reference: "Salmos 23:1 (ARA)" },
  { verse: "Tudo posso naquele que me fortalece.", reference: "Filipenses 4:13 (ARA)" },
  { verse: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.", reference: "Provérbios 3:5 (ARA)" },
  { verse: "Porque eu sei os planos que tenho para vocês, diz o Senhor, planos de prosperidade e não de calamidade, para dar-lhes um futuro e uma esperança.", reference: "Jeremias 29:11 (ARA)" },
  { verse: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.", reference: "Isaías 41:10 (ARA)" },
  { verse: "O Senhor é a minha luz e a minha salvação; a quem temerei? O Senhor é a força da minha vida; de quem me recearei?", reference: "Salmos 27:1 (ARA)" },
  { verse: "Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.", reference: "Mateus 6:33 (ARA)" },
  { verse: "Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.", reference: "Salmos 37:5 (ARA)" },
  { verse: "Porque pela graça sois salvos, mediante a fé; e isto não vem de vós; é dom de Deus.", reference: "Efésios 2:8 (ARA)" },
  { verse: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", reference: "Mateus 11:28 (ARA)" },
  { verse: "O Senhor é bom, e serve de fortaleza no dia da angústia, e conhece os que confiam nele.", reference: "Naum 1:7 (ARA)" },
  { verse: "Alegrem-se na esperança, sejam pacientes na tribulação, perseverem na oração.", reference: "Romanos 12:12 (ARA)" },
  { verse: "Sejam fortes e corajosos. Não tenham medo nem fiquem apavorados, pois o Senhor, o seu Deus, estará com vocês por onde vocês andarem.", reference: "Josué 1:9 (ARA)" },
  { verse: "Ele dá força ao cansado e aumenta o poder do fraco.", reference: "Isaías 40:29 (ARA)" },
  { verse: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", reference: "Salmos 46:1 (ARA)" },
  { verse: "E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos em Cristo Jesus.", reference: "Filipenses 4:7 (ARA)" },
  { verse: "O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se orgulha.", reference: "1 Coríntios 13:4 (ARA)" },
  { verse: "Se Deus é por nós, quem será contra nós?", reference: "Romanos 8:31 (ARA)" },
  { verse: "O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti.", reference: "Números 6:24-25 (ARA)" },
  { verse: "Aquele que habita no abrigo do Altíssimo descansará à sombra do Todo-Poderoso.", reference: "Salmos 91:1 (ARA)" },
  { verse: "Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.", reference: "1 Pedro 5:7 (ARA)" },
  { verse: "Eu sou o caminho, a verdade e a vida. Ninguém vem ao Pai senão por mim.", reference: "João 14:6 (ARA)" },
  { verse: "Porque onde estiver o vosso tesouro, aí estará também o vosso coração.", reference: "Mateus 6:21 (ARA)" },
  { verse: "Orem sem cessar.", reference: "1 Tessalonicenses 5:17 (ARA)" },
  { verse: "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições, pela oração e pela súplica.", reference: "Filipenses 4:6 (ARA)" },
  { verse: "Antes sede uns para com os outros benignos, misericordiosos, perdoando-vos uns aos outros, como também Deus vos perdoou em Cristo.", reference: "Efésios 4:32 (ARA)" },
  { verse: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias; correrão e não se cansarão; caminharão e não se fatigarão.", reference: "Isaías 40:31 (ARA)" },
  { verse: "O Senhor é fiel; ele os fortalecerá e os protegerá do Maligno.", reference: "2 Tessalonicenses 3:3 (ARA)" },
  { verse: "Deem graças em todas as circunstâncias, pois esta é a vontade de Deus para vocês em Cristo Jesus.", reference: "1 Tessalonicenses 5:18 (ARA)" },
];

function getTodayDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(new Date());
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  
  return `${month}-${day}`;
}

// Calculate the 5th business day of a given month (excludes weekends)
function getFifthBusinessDay(year: number, month: number): number {
  let businessDays = 0;
  let day = 1;
  
  while (businessDays < 5) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    // 0 = Sunday, 6 = Saturday - skip weekends
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
    if (businessDays < 5) {
      day++;
    }
  }
  
  return day;
}

// Check if today is the 5th business day of the month
function isFifthBusinessDayToday(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
  const today = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  
  const fifthBusinessDay = getFifthBusinessDay(year, month);
  return today === fifthBusinessDay;
}

async function sendBirthdayEmails(): Promise<void> {
  console.log('[Birthday Scheduler] Running daily birthday check...');
  
  try {
    const allMembers = await storage.getAllMembers();
    const todayDateString = getTodayDateString();
    
    const birthdayMembers = allMembers.filter(member => {
      if (!member.birthdate) return false;
      
      const birthdateParts = member.birthdate.split('-');
      if (birthdateParts.length !== 3) return false;
      
      const month = birthdateParts[1];
      const day = birthdateParts[2];
      const memberDateString = `${month}-${day}`;
      
      return memberDateString === todayDateString;
    });
    
    if (birthdayMembers.length === 0) {
      console.log('[Birthday Scheduler] No birthdays today');
      return;
    }
    
    console.log(`[Birthday Scheduler] Found ${birthdayMembers.length} birthday(s) today`);
    
    // Send personal push to each birthday member with rate limiting for emails
    for (let i = 0; i < birthdayMembers.length; i++) {
      const member = birthdayMembers[i];
      try {
        await sendPushToUser(member.id, {
          title: '🎂 Feliz Aniversário!',
          body: `Parabéns, ${member.fullName.split(' ')[0]}! A UMP Emaús deseja um dia muito especial para você!`,
          url: '/study/profile',
          tag: `birthday-${member.id}`,
          icon: "/logo.png",
        });
        console.log(`[Birthday Scheduler] ✓ Sent birthday push to ${member.fullName}`);
        
        // Send email to the birthday member
        const sent = await sendBirthdayEmail(
          member.fullName, 
          member.email,
          member.photoUrl || null
        );
        if (sent) {
          console.log(`[Birthday Scheduler] ✓ Sent birthday email to ${member.fullName} (${member.email})`);
        } else {
          console.log(`[Birthday Scheduler] ✗ Failed to send birthday email to ${member.fullName} (${member.email})`);
        }
        
        // Rate limiting: wait between emails (Resend: 2 req/s max)
        if (i < birthdayMembers.length - 1) {
          await delay(EMAIL_RATE_LIMIT_DELAY);
        }
      } catch (error) {
        console.error(`[Birthday Scheduler] Error sending to ${member.fullName}:`, error);
      }
    }
    
    // Send ONE consolidated announcement to all members about today's birthdays
    const birthdayNames = birthdayMembers.map(m => m.fullName.split(' ')[0]).join(', ');
    const announcementBody = birthdayMembers.length === 1
      ? `Hoje é aniversário de ${birthdayMembers[0].fullName}! Envie uma mensagem de parabéns!`
      : `Hoje temos ${birthdayMembers.length} aniversariantes: ${birthdayNames}! Envie mensagens de parabéns!`;
    
    const birthdayPayload = {
      title: birthdayMembers.length === 1 ? '🎉 Aniversário de Membro!' : '🎉 Aniversariantes do Dia!',
      body: announcementBody,
      url: '/diretoria',
      tag: `birthday-announcement-${todayDateString}`,
      icon: "/logo.png",
    };
    const pushResult = await sendPushToAllMembers(birthdayPayload);
    console.log(`[Birthday Scheduler] Birthday announcement push: ${pushResult.sent} success, ${pushResult.failed} failed`);
    
    console.log(`[Birthday Scheduler] Completed. Processed ${birthdayMembers.length} birthday(s)`);
  } catch (error) {
    console.error('[Birthday Scheduler] Error during birthday check:', error);
  }
}

export function initBirthdayScheduler(): void {
  cron.schedule('0 7 * * *', sendBirthdayEmails, {
    timezone: 'America/Sao_Paulo'
  });
  
  console.log('[Birthday Scheduler] Initialized - will run daily at 07:00 AM (America/Sao_Paulo)');
}

async function processStreakCheck(): Promise<void> {
  console.log('[DeoGlory Scheduler] Running streak check at 19:00...');
  
  try {
    const usersNeedingCheck = await storage.getUsersNeedingStreakCheck();
    
    if (usersNeedingCheck.length === 0) {
      console.log('[DeoGlory Scheduler] No users with active streak needing check');
      return;
    }
    
    console.log(`[DeoGlory Scheduler] Found ${usersNeedingCheck.length} user(s) needing streak check`);
    
    let remindersCount = 0;
    let freezesUsed = 0;
    let streaksLost = 0;
    
    for (const user of usersNeedingCheck) {
      try {
        const newWarningDay = user.streakWarningDay + 1;
        
        if (newWarningDay === 1) {
          await storage.updateStreakWarningDay(user.userId, 1);
          await notifyStreakWarningDay1(user.userId, user.currentStreak);
          remindersCount++;
          console.log(`[DeoGlory Scheduler] Day 1 warning sent to user ${user.userId} (streak: ${user.currentStreak})`);
        } else if (newWarningDay >= 2) {
          if (user.streakFreezesAvailable > 0) {
            const froze = await storage.useStreakFreeze(user.userId, user.currentStreak, true);
            if (froze) {
              await notifyStreakFreezeUsed(user.userId, user.currentStreak);
              freezesUsed++;
              console.log(`[DeoGlory Scheduler] Streak freeze auto-used for user ${user.userId} (streak: ${user.currentStreak})`);
            }
          } else {
            await storage.resetStreak(user.userId);
            await notifyStreakLost(user.userId, user.currentStreak);
            streaksLost++;
            console.log(`[DeoGlory Scheduler] Streak lost for user ${user.userId} (was: ${user.currentStreak})`);
          }
        }
      } catch (error) {
        console.error(`[DeoGlory Scheduler] Error processing streak for user ${user.userId}:`, error);
      }
    }
    
    console.log(`[DeoGlory Scheduler] Streak check completed. Reminders: ${remindersCount}, Freezes used: ${freezesUsed}, Streaks lost: ${streaksLost}`);
  } catch (error) {
    console.error('[DeoGlory Scheduler] Error during streak check:', error);
  }
}

async function notifyStreakWarningDay1(userId: number, currentStreak: number): Promise<void> {
  const messages = [
    `Sua ofensiva de ${currentStreak} dias está em risco! Faça uma lição hoje para manter.`,
    `Ei! Não deixe sua sequência de ${currentStreak} dias escapar. Uma lição rápida resolve!`,
    `Faltam poucas horas! Proteja sua ofensiva de ${currentStreak} dias agora.`,
    `Sua dedicação de ${currentStreak} dias é inspiradora! Continue hoje.`,
  ];
  const message = messages[Math.floor(Math.random() * messages.length)];
  
  await notifyStreakReminder(userId, currentStreak, message, "warning");
}

async function notifyStreakFreezeUsed(userId: number, savedStreak: number): Promise<void> {
  const message = `Seu congelamento salvou sua ofensiva de ${savedStreak} dias! Volte amanhã para continuar.`;
  await notifyStreakReminder(userId, savedStreak, message, "freeze_used");
}

async function notifyStreakLost(userId: number, lostStreak: number): Promise<void> {
  const message = `Que pena! Sua ofensiva de ${lostStreak} dias foi perdida. Mas não desista, comece uma nova hoje!`;
  await notifyStreakReminder(userId, 0, message, "lost");
}

async function sendStreakReminders(): Promise<void> {
  console.log('[DeoGlory Scheduler] Running streak reminder check...');
  
  try {
    const usersWithStreak = await storage.getUsersWithActiveStreakNotStudiedToday();
    
    if (usersWithStreak.length === 0) {
      console.log('[DeoGlory Scheduler] No users with active streak needing reminder');
      return;
    }
    
    console.log(`[DeoGlory Scheduler] Found ${usersWithStreak.length} user(s) with active streak needing reminder`);
    
    for (const user of usersWithStreak) {
      try {
        await notifyStreakReminder(user.userId, user.currentStreak);
        console.log(`[DeoGlory Scheduler] Sent streak reminder to user ${user.userId} (streak: ${user.currentStreak})`);
      } catch (error) {
        console.error(`[DeoGlory Scheduler] Error sending streak reminder to user ${user.userId}:`, error);
      }
    }
    
    console.log(`[DeoGlory Scheduler] Streak reminder completed. Sent ${usersWithStreak.length} notification(s)`);
  } catch (error) {
    console.error('[DeoGlory Scheduler] Error during streak reminder check:', error);
  }
}

async function sendInactivityReminders(): Promise<void> {
  console.log('[DeoGlory Scheduler] Running inactivity check...');
  
  const inactivityDays = [2, 3, 5, 7, 10, 15];
  let totalSent = 0;
  
  try {
    for (const days of inactivityDays) {
      const inactiveUsers = await storage.getInactiveUsersByDays(days);
      
      for (const user of inactiveUsers) {
        try {
          await notifyInactivity(user.userId, user.daysSinceLastActivity);
          totalSent++;
          console.log(`[DeoGlory Scheduler] Sent ${days}-day inactivity reminder to user ${user.userId}`);
        } catch (error) {
          console.error(`[DeoGlory Scheduler] Error sending inactivity reminder to user ${user.userId}:`, error);
        }
      }
    }
    
    console.log(`[DeoGlory Scheduler] Inactivity check completed. Sent ${totalSent} notification(s)`);
  } catch (error) {
    console.error('[DeoGlory Scheduler] Error during inactivity check:', error);
  }
}

export function initDeoGlorySchedulers(): void {
  cron.schedule('0 19 * * *', processStreakCheck, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[DeoGlory Scheduler] Streak check initialized - will run daily at 19:00 (America/Sao_Paulo)');
  
  cron.schedule('30 15 * * *', sendInactivityReminders, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[DeoGlory Scheduler] Inactivity check initialized - will run daily at 15:30 (America/Sao_Paulo)');
}

function getRandomBibleVerse(): { verse: string; reference: string } {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % BIBLE_VERSES.length;
  return BIBLE_VERSES[index];
}

function getTodayDateKey(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value || '2025';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

// Model priority order - same as lesson system in ai.ts
const GEMINI_MODEL_PRIORITY = [
  'gemini-3-flash-preview',  // Primary
  'gemini-2.5-flash',        // Fallback 1
  'gemini-2.5-lite',         // Fallback 2
];

interface VerseReflectionResult {
  reflection: string | null;
  reflectionTitle: string | null;
  highlightedKeywords: string[];
  reflectionKeywords: string[];
  reflectionReferences: string[];
}

async function generateVerseReflection(verse: string, reference: string): Promise<VerseReflectionResult> {
  if (!isAIConfigured()) return { reflection: null, reflectionTitle: null, highlightedKeywords: [], reflectionKeywords: [], reflectionReferences: [] };
  
  const prompt = `Você é um pastor presbiteriano experiente. Para o seguinte versículo bíblico, forneça:

1. Um TÍTULO impactante e curto para a reflexão (máximo 5 palavras)
2. Uma reflexão devocional estruturada em EXATAMENTE 2 estrofes (parágrafos), separadas por uma linha em branco
3. 2-4 palavras-chave do VERSÍCULO para destaque em negrito
4. 2-4 palavras-chave da REFLEXÃO para destaque em negrito
5. Referências bíblicas ou citações de autores mencionadas na reflexão para destaque em itálico

Versículo: "${verse}" - ${reference}

REGRAS PARA O TÍTULO:
- Máximo 5 palavras
- Deve resumir a essência da reflexão
- Impactante e inspirador
- Ex: "Refúgio na Presença Divina", "A Paz que Restaura"

REGRAS PARA A REFLEXÃO:
- OBRIGATÓRIO: Exatamente 2 estrofes (parágrafos)
- Cada estrofe deve ter 2-3 frases bem desenvolvidas
- Primeira estrofe: contexto e significado do versículo
- Segunda estrofe: aplicação prática para o dia a dia
- Use formatação ABNT: parágrafos justificados, com recuo
- Ser edificante e encorajadora
- Linguagem acessível
- Não usar emojis
- IMPORTANTE: A reflexão DEVE ter entre 400 e 450 caracteres (incluindo espaços) - gere EXATAMENTE nessa faixa para consistência visual

REGRAS PARA PALAVRAS-CHAVE DO VERSÍCULO:
- Máximo 4 palavras/expressões impactantes
- Use EXATAMENTE como aparecem no versículo

REGRAS PARA PALAVRAS-CHAVE DA REFLEXÃO:
- OBRIGATÓRIO: Exatamente 6 palavras-chave da reflexão
- 3 palavras-chave da PRIMEIRA estrofe
- 3 palavras-chave da SEGUNDA estrofe
- Devem ser termos espirituais ou expressões importantes
- Ex: "graça divina", "fé", "esperança", "amor de Deus", "renovação", "propósito"

REGRAS PARA REFERÊNCIAS:
- Citações de autores (ex: "Como disse C.S. Lewis")
- Referências bíblicas adicionais (ex: "Romanos 8:28")
- Deixe vazio se não houver

Responda APENAS no formato JSON:
{
  "title": "Título Impactante Aqui",
  "reflection": "Primeira estrofe aqui...\\n\\nSegunda estrofe aqui...",
  "keywords": ["palavra1", "expressão chave"],
  "reflectionKeywords": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5", "palavra6"],
  "reflectionReferences": ["Romanos 8:28", "C.S. Lewis"]
}`;

  const { getGeminiModel, GEMINI_KEY_ROTATION } = await import('./ai.js');
  
  // For each key, try all models before moving to next key
  for (const keyNumber of GEMINI_KEY_ROTATION) {
    for (const modelName of GEMINI_MODEL_PRIORITY) {
      try {
        console.log(`[Daily Verse] Trying key ${keyNumber} with model ${modelName}...`);
        const model = getGeminiModel(keyNumber, modelName);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        
        // Remove markdown code block if present
        if (text.startsWith('```json')) {
          text = text.slice(7);
        } else if (text.startsWith('```')) {
          text = text.slice(3);
        }
        if (text.endsWith('```')) {
          text = text.slice(0, -3);
        }
        text = text.trim();
        
        if (text) {
          try {
            const parsed = JSON.parse(text);
            console.log(`[Daily Verse] Reflection and keywords generated successfully with key ${keyNumber}, model ${modelName}`);
            return {
              reflection: parsed.reflection || null,
              reflectionTitle: parsed.title || null,
              highlightedKeywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 4) : [],
              reflectionKeywords: Array.isArray(parsed.reflectionKeywords) ? parsed.reflectionKeywords.slice(0, 6) : [],
              reflectionReferences: Array.isArray(parsed.reflectionReferences) ? parsed.reflectionReferences : []
            };
          } catch (parseError) {
            // If JSON parsing fails, try to extract just the reflection
            console.warn(`[Daily Verse] JSON parsing failed, using text as reflection`);
            return { reflection: text, reflectionTitle: null, highlightedKeywords: [], reflectionKeywords: [], reflectionReferences: [] };
          }
        }
      } catch (error: any) {
        console.warn(`[Daily Verse] Key ${keyNumber} model ${modelName} failed:`, error.message?.substring(0, 100) || error);
        continue;
      }
    }
  }
  
  console.error('[Daily Verse] All Gemini keys and models exhausted for reflection generation');
  return { reflection: null, reflectionTitle: null, highlightedKeywords: [], reflectionKeywords: [], reflectionReferences: [] };
}

export async function forceDailyVerseGeneration(): Promise<{ success: boolean; message: string; postId?: number }> {
  console.log('[Daily Verse] FORCE generating daily verse (admin triggered)...');
  
  try {
    // Check if already exists for today
    const existingPost = await storage.getActiveDailyVersePost();
    if (existingPost) {
      return { success: false, message: 'Já existe um versículo do dia ativo. Remova-o antes de gerar outro.' };
    }
    
    let verse: string;
    let reference: string;
    
    if (isAIConfigured()) {
      const aiVerse = await generateDailyVerseWithAI();
      if (aiVerse) {
        verse = aiVerse.verse;
        reference = aiVerse.reference;
        console.log('[Daily Verse] Using AI-generated verse');
      } else {
        const fallback = getRandomBibleVerse();
        verse = fallback.verse;
        reference = fallback.reference;
        console.log('[Daily Verse] AI failed, using fallback verse');
      }
    } else {
      const fallback = getRandomBibleVerse();
      verse = fallback.verse;
      reference = fallback.reference;
      console.log('[Daily Verse] AI not configured, using fallback verse');
    }
    
    const stockImage = await storage.getNextDailyVerseStockImage();
    const { reflection, reflectionTitle, highlightedKeywords, reflectionKeywords, reflectionReferences } = await generateVerseReflection(verse, reference);
    
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '2025');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '01') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '01');
    const expiresAt = new Date(year, month, day, 23 + 3, 59, 59);
    
    const post = await storage.createDailyVersePost({
      verse,
      reference,
      reflection: reflection || undefined,
      reflectionTitle: reflectionTitle || undefined,
      highlightedKeywords: highlightedKeywords.length > 0 ? highlightedKeywords : undefined,
      reflectionKeywords: reflectionKeywords.length > 0 ? reflectionKeywords : undefined,
      reflectionReferences: reflectionReferences.length > 0 ? reflectionReferences : undefined,
      stockImageId: stockImage?.id,
      imageUrl: stockImage?.imageUrl,
      publishedAt: now,
      expiresAt,
      isActive: true,
    });
    
    if (stockImage) {
      await storage.updateDailyVerseStock(stockImage.id, { lastUsedAt: now });
    }
    
    // Mark as sent so regular scheduler won't duplicate
    const todayKey = getTodayDateKey();
    const reminderKey = `daily_verse:${todayKey}`;
    await storage.markSchedulerReminderSent(reminderKey, 'daily_verse');
    
    // Send push notification for force-generated verse (same as scheduler)
    await notifyDailyVerseWithLink(verse, reference, '/versiculo-do-dia');
    
    console.log(`[Daily Verse] Force generated post ${post.id}`);
    return { 
      success: true, 
      message: `Versículo gerado com sucesso: "${verse.substring(0, 50)}..." - ${reference}`,
      postId: post.id 
    };
  } catch (error) {
    console.error('[Daily Verse] Force generation error:', error);
    return { success: false, message: 'Erro ao gerar versículo: ' + (error as Error).message };
  }
}

async function sendDailyVerse(): Promise<void> {
  console.log('[Daily Verse Scheduler] Sending daily verse notification...');
  
  try {
    // Check if already sent today (survives server restarts)
    const todayKey = getTodayDateKey();
    const reminderKey = `daily_verse:${todayKey}`;
    const alreadySent = await storage.hasSentSchedulerReminder(reminderKey);
    
    if (alreadySent) {
      console.log(`[Daily Verse Scheduler] Already sent today (${todayKey}), skipping`);
      return;
    }
    
    let verse: string;
    let reference: string;
    
    if (isAIConfigured()) {
      const aiVerse = await generateDailyVerseWithAI();
      if (aiVerse) {
        verse = aiVerse.verse;
        reference = aiVerse.reference;
        console.log('[Daily Verse Scheduler] Using AI-generated verse');
      } else {
        const fallback = getRandomBibleVerse();
        verse = fallback.verse;
        reference = fallback.reference;
        console.log('[Daily Verse Scheduler] AI failed, using fallback verse');
      }
    } else {
      const fallback = getRandomBibleVerse();
      verse = fallback.verse;
      reference = fallback.reference;
      console.log('[Daily Verse Scheduler] AI not configured, using fallback verse');
    }
    
    // Get next stock image for the daily verse post
    const stockImage = await storage.getNextDailyVerseStockImage();
    
    // Generate AI reflection and highlighted keywords
    const { reflection, reflectionTitle, highlightedKeywords, reflectionKeywords, reflectionReferences } = await generateVerseReflection(verse, reference);
    
    // Create expiration time (23:59:59 today in São Paulo timezone)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '2025');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '01') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '01');
    
    // Set expiration to 23:59:59 São Paulo time
    const expiresAt = new Date(year, month, day, 23 + 3, 59, 59); // +3 for UTC offset from São Paulo
    
    // Create daily verse post
    const post = await storage.createDailyVersePost({
      verse,
      reference,
      reflection: reflection || undefined,
      reflectionTitle: reflectionTitle || undefined,
      highlightedKeywords: highlightedKeywords.length > 0 ? highlightedKeywords : undefined,
      reflectionKeywords: reflectionKeywords.length > 0 ? reflectionKeywords : undefined,
      reflectionReferences: reflectionReferences.length > 0 ? reflectionReferences : undefined,
      stockImageId: stockImage?.id,
      imageUrl: stockImage?.imageUrl,
      publishedAt: now,
      expiresAt,
      isActive: true,
    });
    
    // Mark stock image as used
    if (stockImage) {
      await storage.updateDailyVerseStock(stockImage.id, { lastUsedAt: now });
    }
    
    console.log(`[Daily Verse Scheduler] Created post ${post.id} with stock image ${stockImage?.id || 'none'}`);
    
    // Send push notification with link to public page
    await notifyDailyVerseWithLink(verse, reference, '/versiculo-do-dia');
    
    // Mark as sent in database (survives server restarts)
    await storage.markSchedulerReminderSent(reminderKey, 'daily_verse');
    
    console.log(`[Daily Verse Scheduler] Sent: ${reference}`);
  } catch (error) {
    console.error('[Daily Verse Scheduler] Error sending daily verse:', error);
  }
}

async function removeFromBanner(): Promise<void> {
  console.log('[Daily Verse Scheduler] Removing daily verse from banner (keeping in history)...');
  try {
    // Only mark as not showing in banner, but keep the post accessible for history/calendar
    await storage.deactivateExpiredDailyVersePosts();
    console.log('[Daily Verse Scheduler] Daily verse removed from banner');
  } catch (error) {
    console.error('[Daily Verse Scheduler] Error removing from banner:', error);
  }
}

function getCurrentHourInSaoPaulo(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false
  });
  return parseInt(formatter.format(new Date()), 10);
}

export function initDailyVerseScheduler(): void {
  // Publish daily verse at 7:00 AM
  cron.schedule('0 7 * * *', sendDailyVerse, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Daily Verse Scheduler] Initialized - will run daily at 07:00 (America/Sao_Paulo)');
  
  // Remove from banner at 23:59 (keeps in history)
  cron.schedule('59 23 * * *', removeFromBanner, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Daily Verse Scheduler] Banner cleanup initialized - will remove from banner at 23:59 (America/Sao_Paulo)');
  
  setTimeout(async () => {
    try {
      const currentHour = getCurrentHourInSaoPaulo();
      
      // If deploy is BEFORE 7:00 AM, skip startup check - let the cron do it at 7:00
      if (currentHour < 7) {
        console.log(`[Daily Verse Scheduler] Startup at ${currentHour}:xx (before 07:00), skipping - cron will send at 07:00`);
        return;
      }
      
      // If deploy is AFTER 7:00 AM, check database to see if already sent today
      console.log('[Daily Verse Scheduler] Running initial check at startup...');
      await sendDailyVerse();
    } catch (error) {
      console.error('[Daily Verse Scheduler] Startup error:', error);
    }
  }, 5000);
}

function getTodayRecoveryCategory(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value || '2025';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `recovery-${year}-${month}-${day}`;
}

async function generateDailyRecoveryVerses(): Promise<void> {
  console.log('[Recovery Verses Scheduler] Generating daily recovery verses...');

  try {
    const todayCategory = getTodayRecoveryCategory();
    const targetPerDay = 50;

    // Busca tudo (pode crescer, mas é o método existente sem mexer em outras camadas).
    // IMPORTANTE: não fazemos dedupe GLOBAL por referência, senão o scheduler trava em versículos "clássicos".
    const allVerses = await storage.getAllBibleVerses();
    const todayVerses = allVerses.filter(v => v.category === todayCategory);

    if (todayVerses.length >= targetPerDay) {
      console.log(`[Recovery Verses Scheduler] Verses already generated for today (${todayCategory}) - count=${todayVerses.length}`);
      return;
    }

    const needed = targetPerDay - todayVerses.length;
    console.log(`[Recovery Verses Scheduler] Need to add ${needed} verse(s) for ${todayCategory}`);

    // Dedupe SOMENTE dentro do dia/categoria
    const todayReferences = new Set<string>(todayVerses.map(v => String(v.reference || '').trim()).filter(Boolean));

    let addedCount = 0;
    let attempts = 0;

    // Vamos tentar múltiplos lotes para chegar em 50 mesmo quando a API retornar repetidos
    while (addedCount < needed && attempts < 6) {
      attempts++;
      const batchSize = Math.max(35, Math.min(120, (needed - addedCount) + 25));

      let generatedVerses: any[] = [];
      try {
        generatedVerses = await generateRecoveryVersesWithAI(batchSize);
      } catch (err) {
        console.error('[Recovery Verses Scheduler] Error fetching verses batch:', err);
        generatedVerses = [];
      }

      if (!generatedVerses || generatedVerses.length === 0) {
        console.log(`[Recovery Verses Scheduler] No verses returned on attempt ${attempts}/6`);
        await delay(1000);
        continue;
      }

      for (const verse of generatedVerses) {
        if (addedCount >= needed) break;

        const ref = String(verse.reference || '').trim();
        const txt = String(verse.verse || verse.text || '').trim();
        const refl = String(verse.reflection || '').trim();

        if (!ref || !txt) continue;

        if (todayReferences.has(ref)) {
          // Só evita repetição no mesmo dia
          continue;
        }

        await storage.createBibleVerse(
          ref,
          txt,
          refl || 'Leia este versículo e medite na presença de Deus.',
          todayCategory
        );

        todayReferences.add(ref);
        addedCount++;
      }
    }

    console.log(`[Recovery Verses Scheduler] Added ${addedCount} new recovery verse(s) for ${todayCategory} (finalCount=${todayVerses.length + addedCount})`);

    if (todayVerses.length + addedCount < targetPerDay) {
      console.warn(`[Recovery Verses Scheduler] WARNING: Could not reach ${targetPerDay} verses for ${todayCategory}. Current=${todayVerses.length + addedCount}. Check Bible API availability/deduplication.`);
    }
  } catch (error) {
    console.error('[Recovery Verses Scheduler] Error generating recovery verses:', error);
  }
}

export function initRecoveryVersesScheduler(): void {
  cron.schedule('30 15 * * *', generateDailyRecoveryVerses, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Recovery Verses Scheduler] Initialized - will run daily at 15:30 (America/Sao_Paulo)');
  
  setTimeout(async () => {
    try {
      console.log('[Recovery Verses Scheduler] Running initial check at startup...');
      await generateDailyRecoveryVerses();
    } catch (error) {
      console.error('[Recovery Verses Scheduler] Startup error:', error);
    }
  }, 7000);
}

async function runInstagramSync(): Promise<void> {
  console.log('[Instagram Scheduler] Running sync...');
  
  try {
    const result = await syncInstagramPosts();
    console.log(`[Instagram Scheduler] Sync completed: ${result.synced} posts synced, ${result.errors} errors`);
  } catch (error) {
    console.error('[Instagram Scheduler] Error during sync:', error);
  }
}

export function initInstagramScheduler(): void {
  if (!isInstagramConfigured()) {
    console.log('[Instagram Scheduler] Not configured - INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID required');
    return;
  }
  
  cron.schedule('0 */6 * * *', runInstagramSync, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Instagram Scheduler] Initialized - will sync every 6 hours (America/Sao_Paulo)');
  
  runInstagramSync();
}

async function refreshDailyMissionsWithAI(): Promise<void> {
  console.log('[Daily Missions Scheduler] Refreshing daily missions with AI...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const existingContent = await storage.getDailyMissionContent(today);
    
    // Check if content exists AND has valid AI-generated data
    if (existingContent) {
      let needsRegeneration = false;
      
      // Check if critical fields are empty/invalid
      try {
        const quizData = JSON.parse(existingContent.quizQuestions || '[]');
        const timedQuizData = JSON.parse(existingContent.timedQuizQuestions || '[]');
        const characterData = JSON.parse(existingContent.bibleCharacter || '{}');
        
        // If any critical content is missing, regenerate
        if (!quizData.length || !timedQuizData.length || !characterData.name) {
          console.log(`[Daily Missions Scheduler] Content for ${today} is incomplete, regenerating...`);
          console.log(`  - Quiz: ${quizData.length} questions`);
          console.log(`  - Timed Quiz: ${timedQuizData.length} questions`);
          console.log(`  - Character: ${characterData.name || 'MISSING'}`);
          needsRegeneration = true;
        }
      } catch (e) {
        console.log(`[Daily Missions Scheduler] Content parsing failed, regenerating...`);
        needsRegeneration = true;
      }
      
      if (!needsRegeneration) {
        console.log(`[Daily Missions Scheduler] Content already generated for today (${today})`);
        return;
      }
    }
    
    // Import AI generation functions
    const { 
      generateDailyMissionsWithAI, 
      generateQuizQuestionsWithAI, 
      generateBibleFactWithAI,
      generateBibleCharacterWithAI,
      generateVerseMemoryWithAI,
      generateTimedQuizWithAI
    } = await import('./ai');
    
    console.log('[Daily Missions Scheduler] Generating all mission content with AI (NO FALLBACK)...');
    console.log('[Daily Missions Scheduler] Key rotation: Chave 1 → Chave 2 → ... → Chave 5');
    console.log('[Daily Missions Scheduler] Model fallback per key: gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-lite');
    
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Generate content - each AI function handles key rotation and model fallback internally
    console.log('[Daily Missions Scheduler] Generating AI Missions...');
    const aiMissions = await generateDailyMissionsWithAI();
    await delay(1000);
    
    console.log('[Daily Missions Scheduler] Generating Quiz Questions...');
    const quizQuestions = await generateQuizQuestionsWithAI(10);
    await delay(1000);
    
    console.log('[Daily Missions Scheduler] Generating Bible Fact...');
    const bibleFact = await generateBibleFactWithAI();
    await delay(1000);
    
    console.log('[Daily Missions Scheduler] Generating Bible Character...');
    const bibleCharacter = await generateBibleCharacterWithAI();
    await delay(1000);
    
    console.log('[Daily Missions Scheduler] Generating Verse Memory...');
    const verseMemory = await generateVerseMemoryWithAI();
    await delay(1000);
    
    console.log('[Daily Missions Scheduler] Generating Timed Quiz...');
    const timedQuizQuestions = await generateTimedQuizWithAI(10);
    
    // Check if critical content was generated successfully
    const hasQuiz = quizQuestions && quizQuestions.length >= 5;
    const hasTimedQuiz = timedQuizQuestions && timedQuizQuestions.length >= 5;
    const hasCharacter = bibleCharacter && bibleCharacter.name;
    
    // NEVER save incomplete data - abort if any critical content is missing
    if (!hasQuiz || !hasTimedQuiz || !hasCharacter) {
      console.error('[Daily Missions Scheduler] CRITICAL: Failed to generate essential content!');
      console.error(`  - Quiz: ${hasQuiz ? 'OK' : 'FAILED'}`);
      console.error(`  - Timed Quiz: ${hasTimedQuiz ? 'OK' : 'FAILED'}`);
      console.error(`  - Bible Character: ${hasCharacter ? 'OK' : 'FAILED'}`);
      console.error('[Daily Missions Scheduler] NOT saving incomplete content - will retry on next schedule');
      // Do NOT save anything - return without persisting
      return;
    }
    
    // Only save if ALL critical content was successfully generated
    console.log('[Daily Missions Scheduler] All critical content generated successfully, saving...');
    
    // Delete existing incomplete content if any
    if (existingContent) {
      console.log('[Daily Missions Scheduler] Replacing incomplete content with new complete content...');
    }
    
    await storage.createDailyMissionContent({
      contentDate: today,
      aiGeneratedMissions: JSON.stringify(aiMissions || []),
      quizQuestions: JSON.stringify(quizQuestions),
      bibleFact: JSON.stringify(bibleFact || {}),
      bibleCharacter: JSON.stringify(bibleCharacter),
      verseMemory: JSON.stringify(verseMemory || {}),
      timedQuizQuestions: JSON.stringify(timedQuizQuestions),
    });
    
    console.log(`[Daily Missions Scheduler] Successfully saved content for ${today}:`);
    console.log(`  - AI Missions: ${aiMissions?.length || 0}`);
    console.log(`  - Quiz questions: ${quizQuestions.length}`);
    console.log(`  - Bible fact: ${bibleFact?.fact ? 'Yes' : 'No'}`);
    console.log(`  - Bible character: ${bibleCharacter.name}`);
    console.log(`  - Verse memory: ${verseMemory?.reference || 'No'}`);
    console.log(`  - Timed quiz: ${timedQuizQuestions.length} questions`);
  } catch (error) {
    console.error('[Daily Missions Scheduler] Error refreshing missions:', error);
  }
}

export function initDailyMissionsScheduler(): void {
  // Run daily at midnight (00:00) to refresh missions
  cron.schedule('0 0 * * *', refreshDailyMissionsWithAI, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Daily Missions Scheduler] Initialized - will run daily at 00:00 (America/Sao_Paulo)');
  
  // Also run at startup to ensure missions are available
  setTimeout(async () => {
    try {
      console.log('[Daily Missions Scheduler] Running initial check at startup...');
      await refreshDailyMissionsWithAI();
    } catch (error) {
      console.error('[Daily Missions Scheduler] Startup error:', error);
    }
  }, 10000);
}

// ==================== WEEKLY GOAL SCHEDULER ====================

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

function getPreviousWeekKey(): string {
  // Get current date in São Paulo timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const brazilDateStr = formatter.format(new Date());
  const [year, month, day] = brazilDateStr.split('-').map(Number);
  
  // Create date object for Brazil's current date - 7 days (previous week)
  const brazilDate = new Date(year, month - 1, day - 7);
  
  // Get the Sunday of that week (week starts on Sunday)
  const dayOfWeek = brazilDate.getDay();
  const sundayOfWeek = new Date(brazilDate);
  sundayOfWeek.setDate(brazilDate.getDate() - dayOfWeek);
  
  // Calculate week number based on the Sunday's date
  const startOfYear = new Date(sundayOfWeek.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor((sundayOfWeek.getTime() - startOfYear.getTime()) / 86400000);
  const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
  
  return `${sundayOfWeek.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
}

async function processWeeklyGoalRewards(): Promise<void> {
  console.log('[Weekly Goal Scheduler] Processing weekly goal rewards...');
  
  try {
    const previousWeekKey = getPreviousWeekKey();
    console.log(`[Weekly Goal Scheduler] Checking week: ${previousWeekKey}`);
    
    // OPTIMIZED: Batch fetch profiles and progress in 2 queries instead of N+1
    const [allProfiles, allProgress] = await Promise.all([
      storage.getAllStudyProfiles(),
      storage.getAllWeeklyGoalProgressByWeek(previousWeekKey)
    ]);
    
    // Create lookup map for O(1) access
    const progressMap = new Map(allProgress.map(p => [p.userId, p]));
    console.log(`[Weekly Goal Scheduler] Found ${allProfiles.length} profiles, ${allProgress.length} progress records`);
    
    let rewardsDistributed = 0;
    
    for (const profile of allProfiles) {
      try {
        const progress = progressMap.get(profile.userId);
        
        if (!progress || progress.weeklyBonusDistributed) {
          continue;
        }
        
        // Count completed goals
        const goals = {
          lessons: (progress.lessonsCompleted || 0) >= (profile.weeklyLessonsGoal || 10),
          verses: (progress.versesRead || 0) >= (profile.weeklyVersesGoal || 7),
          missions: (progress.missionsCompleted || 0) >= (profile.weeklyMissionsGoal || 3),
          devotionals: (progress.devotionalsRead || 0) >= (profile.weeklyDevotionalsGoal || 1),
        };
        
        const completedGoals = Object.values(goals).filter(Boolean).length;
        
        // Calculate XP bonus: 25 per goal, max 100 + 50 bonus for all = 150
        let xpBonus = 0;
        if (completedGoals === 4) {
          xpBonus = 150; // All 4 goals completed
        } else if (completedGoals > 0) {
          xpBonus = completedGoals * 25; // Proportional: 25, 50, or 75 XP
        }
        
        if (xpBonus > 0) {
          await storage.awardWeeklyGoalXp(profile.userId, xpBonus);
          await storage.updateWeeklyGoalProgress(profile.userId, previousWeekKey, {
            weeklyBonusDistributed: true,
            xpBonus: xpBonus
          } as any);
          
          console.log(`[Weekly Goal Scheduler] User ${profile.userId}: ${completedGoals}/4 goals, awarded ${xpBonus} XP`);
          rewardsDistributed++;
        }
      } catch (error) {
        console.error(`[Weekly Goal Scheduler] Error processing user ${profile.userId}:`, error);
      }
    }
    
    console.log(`[Weekly Goal Scheduler] Distributed rewards to ${rewardsDistributed} users`);
  } catch (error) {
    console.error('[Weekly Goal Scheduler] Error:', error);
  }
}

export function initWeeklyGoalScheduler(): void {
  // Run every Saturday at 23:59 to process weekly goals
  cron.schedule('59 23 * * 6', processWeeklyGoalRewards, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Weekly Goal Scheduler] Initialized - will run every Saturday at 23:59 (America/Sao_Paulo)');
}

async function processEventLessonsRelease(): Promise<void> {
  console.log('[Event Scheduler] Checking for events and lessons to release at 00:00...');
  
  try {
    const allEvents = await storage.getAllStudyEvents();
    
    for (const event of allEvents) {
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      // Use Brazil timezone-aware function to get current day
      const currentDay = getEventCurrentDay(startDate, endDate);
      
      // Auto-publish event on start date (currentDay === 1 means it's day 1)
      let eventStatus = event.status;
      if (eventStatus === 'draft' && currentDay === 1) {
        await storage.updateStudyEvent(event.id, { status: 'published' });
        eventStatus = 'published'; // Update local status to continue processing
        console.log(`[Event Scheduler] Auto-published event "${event.title}" on start date`);
        
        // Send push notifications for new event
        try {
          const pushPayload = {
            title: '🎯 Novo Evento Especial!',
            body: `O evento "${event.title}" começou! Participe e ganhe cards exclusivos.`,
            url: `/study/eventos/${event.id}`,
            tag: `event-${event.id}-start`,
            icon: "/logo.png",
          };
          
          // Send real push notification to all members
          const pushResult = await sendPushToAllMembers(pushPayload);
          console.log(`[Event Scheduler] Push notifications sent: ${pushResult.sent} success, ${pushResult.failed} failed`);
          
          // Also save in-app notifications for history
          const activeMembers = await storage.getActiveMembers();
          for (const member of activeMembers) {
            await storage.createNotification({
              userId: member.id,
              type: 'new_event',
              title: pushPayload.title,
              body: pushPayload.body,
              data: JSON.stringify({ link: pushPayload.url }),
            });
          }
          console.log(`[Event Scheduler] Sent notifications for event "${event.title}"`);
        } catch (notifError) {
          console.error('[Event Scheduler] Error sending event notifications:', notifError);
        }
      }
      
      // Only process lessons for published events within event date range
      if (eventStatus !== 'published') continue;
      if (currentDay <= 0) continue; // Event hasn't started or already ended
      
      const lessons = await storage.getStudyEventLessons(event.id);
      
      for (const lesson of lessons) {
        if (lesson.dayNumber <= currentDay && lesson.status !== 'published') {
          await storage.updateStudyEventLesson(lesson.id, { status: 'published' });
          console.log(`[Event Scheduler] Released lesson day ${lesson.dayNumber} for event "${event.title}"`);
        }
      }
    }
    
    console.log('[Event Scheduler] Event and lesson release check completed');
  } catch (error) {
    console.error('[Event Scheduler] Error releasing lessons:', error);
  }
}

async function processEventCardsDistribution(): Promise<void> {
  console.log('[Event Scheduler] Checking for cards to distribute at 23:59...');
  
  try {
    const allEvents = await storage.getAllStudyEvents();
    
    for (const event of allEvents) {
      if (event.status === 'completed' || event.status === 'draft') continue;
      
      const startDate = new Date(event.startDate);
      const endDate = new Date(event.endDate);
      
      // Use Brazil timezone-aware functions for consistent calendar day handling
      const currentDay = getEventCurrentDay(startDate, endDate);
      const totalDays = getEventTotalDays(startDate, endDate);
      
      // Only distribute cards on the last day of the event (when currentDay equals total days)
      // Since this runs at 23:59, we check if we're on the final day
      if (currentDay <= 0) continue; // Event hasn't started or already processed
      if (currentDay !== totalDays) continue; // Only process on the last day
      
      console.log(`[Event Scheduler] Processing card distribution for event "${event.title}"`);
      
      const lessons = await storage.getStudyEventLessons(event.id);
      const totalLessons = lessons.length;
      
      if (totalLessons === 0) {
        await storage.updateStudyEvent(event.id, { status: 'completed' });
        continue;
      }
      
      const completedUsers = await storage.getUsersWhoCompletedEvent(event.id, totalLessons);
      const cardsAwarded: Array<{ userId: number; rarity: string }> = [];
      
      // Create card automatically if event doesn't have one (same as manual end)
      let cardId = event.cardId;
      if (!cardId) {
        console.log(`[Event Scheduler] Creating collectible card for event "${event.title}"`);
        const newCard = await storage.createCollectibleCard({
          name: event.title,
          description: `Card exclusivo do evento "${event.title}"`,
          imageUrl: event.imageUrl || null,
          sourceType: "event",
          sourceId: event.id,
          availableRarities: ["common", "rare", "epic", "legendary"],
          isActive: true,
        });
        cardId = newCard.id;
        await storage.updateStudyEvent(event.id, { cardId });
        console.log(`[Event Scheduler] Created card ${cardId} for event ${event.id}`);
      }
      
      if (cardId) {
        for (const userId of completedUsers) {
          // Use same calculation as manual end: correctAnswers/totalQuestions
          const allProgress = await storage.getUserEventProgress(userId, event.id);
          const totalCorrect = allProgress.reduce((sum, p) => sum + (p.correctAnswers || 0), 0);
          const totalQs = allProgress.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
          const avgPerformance = totalQs > 0 ? (totalCorrect / totalQs) * 100 : 0;
          const anyHints = allProgress.some(p => p.usedHints);
          
          // Calculate rarity using same thresholds as manual end
          let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
          if (avgPerformance >= 95 && !anyHints) {
            rarity = 'legendary';
          } else if (avgPerformance >= 85) {
            rarity = 'epic';
          } else if (avgPerformance >= 70) {
            rarity = 'rare';
          }
          
          const existingCard = await storage.getUserCard(userId, cardId);
          if (!existingCard) {
            await storage.awardUserCard({ 
              userId, 
              cardId, 
              rarity,
              sourceType: 'event',
              sourceId: event.id,
              performance: avgPerformance
            });
            cardsAwarded.push({ userId, rarity });
            console.log(`[Event Scheduler] Awarded ${rarity} card (performance: ${avgPerformance.toFixed(1)}%) to user ${userId} for event "${event.title}"`);
          }
        }
      }
      
      await storage.updateStudyEvent(event.id, { status: 'completed' });
      console.log(`[Event Scheduler] Event "${event.title}" marked as completed`);
      
      // Send push notifications for event completion and card distribution
      try {
        // First, send push to all members announcing event completion
        const generalPayload = {
          title: '🏁 Evento Encerrado',
          body: `O evento "${event.title}" foi encerrado!`,
          url: `/study/eventos`,
          tag: `event-${event.id}-end`,
          icon: "/logo.png",
        };
        const pushResult = await sendPushToAllMembers(generalPayload);
        console.log(`[Event Scheduler] Event completion push: ${pushResult.sent} success, ${pushResult.failed} failed`);
        
        // Send personalized push to card winners
        for (const { userId, rarity } of cardsAwarded) {
          const rarityLabel = rarity === 'legendary' ? 'Lendário' : rarity === 'epic' ? 'Épico' : rarity === 'rare' ? 'Raro' : 'Comum';
          await sendPushToUser(userId, {
            title: '🃏 Parabéns! Você ganhou um card!',
            body: `Você completou o evento "${event.title}" e ganhou um card ${rarityLabel}!`,
            url: `/study/profile`,
            tag: `card-${event.id}-${userId}`,
            icon: "/logo.png",
          });
        }
        
        // Save in-app notifications for history
        const activeMembers = await storage.getActiveMembers();
        for (const member of activeMembers) {
          const cardInfo = cardsAwarded.find(c => c.userId === member.id);
          const rarityLabel = cardInfo?.rarity === 'legendary' ? 'Lendário' : cardInfo?.rarity === 'epic' ? 'Épico' : cardInfo?.rarity === 'rare' ? 'Raro' : 'Comum';
          const body = cardInfo 
            ? `O evento "${event.title}" foi encerrado! Você ganhou um card ${rarityLabel}!`
            : `O evento "${event.title}" foi encerrado.`;
          
          await storage.createNotification({
            userId: member.id,
            type: 'event_completed',
            title: '🏁 Evento Encerrado',
            body,
            data: JSON.stringify({ link: `/study/profile` }),
          });
        }
        console.log(`[Event Scheduler] Sent completion notifications for event "${event.title}"`);
      } catch (notifError) {
        console.error('[Event Scheduler] Error sending completion notifications:', notifError);
      }
    }
    
    console.log('[Event Scheduler] Card distribution check completed');
  } catch (error) {
    console.error('[Event Scheduler] Error distributing cards:', error);
  }
}

export function initEventScheduler(): void {
  cron.schedule('0 0 * * *', processEventLessonsRelease, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Event Scheduler] Lesson release initialized - will run daily at 00:00 (America/Sao_Paulo)');
  
  cron.schedule('59 23 * * *', processEventCardsDistribution, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Event Scheduler] Card distribution initialized - will run daily at 23:59 (America/Sao_Paulo)');
}

// ==================== EVENT DEADLINE NOTIFICATION SCHEDULER ====================

// Now using database persistence instead of in-memory Map
// This prevents notifications from being sent multiple times after server restarts

// Clean old entries from database (keep entries for 48 hours max)
async function cleanDeadlineNotificationsCache(): Promise<void> {
  try {
    const deleted = await storage.cleanOldEventNotifications(48);
    if (deleted > 0) {
      console.log(`[Event Deadline Scheduler] Cleaned ${deleted} old notification cache entries`);
    }
  } catch (error) {
    console.error('[Event Deadline Scheduler] Error cleaning notification cache:', error);
  }
}

async function processEventDeadlineNotifications(): Promise<void> {
  console.log('[Event Deadline Scheduler] Checking for events approaching start/deadline...');
  
  try {
    // Clean old cache entries at the start of each check
    cleanDeadlineNotificationsCache();
    
    const allEvents = await storage.getAllStudyEvents();
    
    // Get current time in Sao Paulo timezone for accurate comparisons
    const nowParts = getTodayBrazilParts();
    const nowFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const nowTimeParts = nowFormatter.formatToParts(new Date());
    const nowHour = parseInt(nowTimeParts.find(p => p.type === 'hour')?.value || '0');
    const nowMinute = parseInt(nowTimeParts.find(p => p.type === 'minute')?.value || '0');
    const nowBrazil = createBrazilDate(nowParts.year, nowParts.month, nowParts.day, nowHour, nowMinute);
    
    let notificationsSent = 0;
    
    for (const event of allEvents) {
      // Wrap each event processing in try/catch to continue on individual failures
      try {
        // Only check published events
        if (event.status !== 'published') continue;
        
        // Get event dates in Sao Paulo timezone
        const startParts = getDatePartsFromDate(new Date(event.startDate));
        const endParts = getDatePartsFromDate(new Date(event.endDate));
        
        // Event starts at 00:00 Sao Paulo time on start date
        const eventStartBrazil = createBrazilDate(startParts.year, startParts.month, startParts.day, 0, 0, 0);
        // Event ends at 23:59:59 Sao Paulo time on end date
        const eventEndBrazil = createBrazilDate(endParts.year, endParts.month, endParts.day, 23, 59, 59);
        
        // === Check 24h before event STARTS ===
        const msUntilStart = eventStartBrazil.getTime() - nowBrazil.getTime();
        const hoursUntilStart = msUntilStart / (1000 * 60 * 60);
        
        // If event hasn't started yet and is within 24h of starting (range: <=24 && >0)
        // Cache key prevents duplicate notifications
        if (hoursUntilStart > 0 && hoursUntilStart <= 24) {
          const startCacheKey = `${event.id}-start-24h`;
          const alreadySentStart = await storage.hasEventNotificationBeenSent(startCacheKey);
          
          if (!alreadySentStart) {
            try {
              await notifyEventStartingSoon(event.id, event.title, hoursUntilStart);
              await storage.markEventNotificationSent(startCacheKey, event.id, 'start-24h');
              notificationsSent++;
              console.log(`[Event Deadline Scheduler] Sent 24h before start notification for event "${event.title}" (${hoursUntilStart.toFixed(1)}h until start)`);
            } catch (notifyError) {
              console.error(`[Event Deadline Scheduler] Error sending start notification for event ${event.id}:`, notifyError);
            }
          }
        }
        
        // === Check if event just STARTED (within first hour of start) ===
        // This handles the case when the scheduler runs exactly at 00:00 when event starts
        const hoursSinceStart = -hoursUntilStart; // Positive if event already started
        if (hoursSinceStart >= 0 && hoursSinceStart < 1) {
          const startedCacheKey = `${event.id}-started`;
          const alreadySentStarted = await storage.hasEventNotificationBeenSent(startedCacheKey);
          
          if (!alreadySentStarted) {
            try {
              await notifyEventStarted(event.id, event.title);
              await storage.markEventNotificationSent(startedCacheKey, event.id, 'started');
              notificationsSent++;
              console.log(`[Event Deadline Scheduler] Sent "event started" notification for event "${event.title}"`);
            } catch (notifyError) {
              console.error(`[Event Deadline Scheduler] Error sending started notification for event ${event.id}:`, notifyError);
            }
          }
        }
        
        // === Check before event ENDS ===
        // Skip events that have already ended
        if (eventEndBrazil <= nowBrazil) continue;
        
        const msRemaining = eventEndBrazil.getTime() - nowBrazil.getTime();
        const hoursRemaining = msRemaining / (1000 * 60 * 60);
        
        // Define notification thresholds (in hours) with explicit lower bounds
        // Thresholds are ordered from largest to smallest
        // Each threshold has a lower bound to prevent duplicate notifications
        const thresholds = [
          { hours: 24, lowerBound: 3, label: '1 dia' },   // 24h > remaining > 3h
          { hours: 3, lowerBound: 1, label: '3 horas' },  // 3h > remaining > 1h
          { hours: 1, lowerBound: 0, label: '1 hora' },   // 1h > remaining > 0h
        ];
        
        for (const threshold of thresholds) {
          const cacheKey = `${event.id}-end-${threshold.hours}h`;
          
          // Check if we should send this notification:
          // - Time remaining is within threshold range (crossed upper limit but above lower bound)
          // - Haven't sent this notification before (now using database persistence)
          const isInRange = hoursRemaining <= threshold.hours && hoursRemaining > threshold.lowerBound;
          const alreadySent = await storage.hasEventNotificationBeenSent(cacheKey);
          
          if (isInRange && !alreadySent) {
            try {
              await notifyEventDeadline(event.id, event.title, threshold.label);
              await storage.markEventNotificationSent(cacheKey, event.id, `end-${threshold.hours}h`);
              notificationsSent++;
              console.log(`[Event Deadline Scheduler] Sent ${threshold.label} deadline notification for event "${event.title}" (${hoursRemaining.toFixed(1)}h remaining)`);
            } catch (notifyError) {
              console.error(`[Event Deadline Scheduler] Error sending notification for event ${event.id}:`, notifyError);
            }
          }
        }
      } catch (eventError) {
        console.error(`[Event Deadline Scheduler] Error processing event ${event.id}:`, eventError);
        // Continue processing other events
      }
    }
    
    console.log(`[Event Deadline Scheduler] Check completed. Sent ${notificationsSent} notification(s)`);
  } catch (error) {
    console.error('[Event Deadline Scheduler] Error:', error);
  }
}

export function initEventDeadlineScheduler(): void {
  // Clean old entries from database on startup
  cleanDeadlineNotificationsCache();
  
  cron.schedule('0 * * * *', processEventDeadlineNotifications, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Event Deadline Scheduler] Initialized - will run every hour at :00 (America/Sao_Paulo) with database persistence');
}

// Marketing Event Reminder Scheduler
// Sends reminders: 5 days, 3 days, 1 day, day-of at 08:00, 1 hour before event
// Uses database persistence (sent_scheduler_reminders table) to survive server restarts

// Convert event date string (YYYY-MM-DD) and time (HH:MM) in Sao Paulo timezone to UTC Date
// Sao Paulo is UTC-3 (Brazil no longer uses daylight saving time since 2019)
function parseEventDateInSaoPaulo(dateStr: string, timeStr: string | null): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  let hour = 9; // Default to 9:00 if no time specified
  let minute = 0;
  
  if (timeStr) {
    const [h, m] = timeStr.split(':');
    hour = parseInt(h) || 9;
    minute = parseInt(m) || 0;
  }
  
  // Build ISO string with Sao Paulo offset (-03:00)
  const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00-03:00`;
  return new Date(isoString);
}

// Get current date in Sao Paulo timezone as YYYY-MM-DD
function getSaoPauloDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

// Get current hour in Sao Paulo timezone
function getSaoPauloHour(): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false
  });
  return parseInt(formatter.format(new Date()));
}

async function processMarketingEventReminders(): Promise<void> {
  console.log('[Marketing Reminder Scheduler] Processing marketing event reminders...');
  
  try {
    const upcomingEvents = await storage.getUpcomingEvents(50);
    
    if (upcomingEvents.length === 0) {
      console.log('[Marketing Reminder Scheduler] No upcoming marketing events found');
      return;
    }

    const now = new Date();
    const todayStr = getSaoPauloDateString();
    const currentHour = getSaoPauloHour();
    let notificationsSent = 0;

    for (const event of upcomingEvents) {
      try {
        if (!event.isPublished) continue;

        // Validate event date format
        const eventDateParts = event.startDate.split('-');
        if (eventDateParts.length !== 3) continue;
        
        // Parse event date/time as Sao Paulo timezone and convert to UTC for comparison
        const eventDateTime = parseEventDateInSaoPaulo(event.startDate, event.time || null);
        const msUntilEvent = eventDateTime.getTime() - now.getTime();
        const hoursUntilEvent = msUntilEvent / (1000 * 60 * 60);
        
        // Skip events that already started
        if (hoursUntilEvent <= 0) continue;

        // Reminder thresholds: 5 days, 3 days, 1 day, 1 hour before
        // Each threshold has a range to avoid missing and to prevent duplicates
        const thresholds = [
          { hours: 120, lowerBound: 72, label: '5-dias', key: '5d' },   // 5 days (120h), range: 120h > remaining > 72h
          { hours: 72, lowerBound: 24, label: '3-dias', key: '3d' },    // 3 days (72h), range: 72h > remaining > 24h
          { hours: 24, lowerBound: 1, label: '1-dia', key: '1d' },      // 1 day (24h), range: 24h > remaining > 1h
          { hours: 1, lowerBound: 0, label: '1-hora', key: '1h' },      // 1 hour, range: 1h > remaining > 0h
        ];

        for (const threshold of thresholds) {
          const reminderKey = `marketing_event:${event.id}:${threshold.key}`;

          // Check if we should send this notification
          const isInRange = hoursUntilEvent <= threshold.hours && hoursUntilEvent > threshold.lowerBound;
          
          if (isInRange) {
            // Check database for persistence (survives server restarts)
            const alreadySent = await storage.hasSentSchedulerReminder(reminderKey);
            
            if (!alreadySent) {
              try {
                await notifyMarketingEventReminder(
                  event.id,
                  event.title,
                  event.startDate,
                  event.time || null,
                  threshold.label,
                  hoursUntilEvent
                );
                await storage.markSchedulerReminderSent(reminderKey, 'marketing_event', event.id);
                notificationsSent++;
                console.log(`[Marketing Reminder Scheduler] Sent ${threshold.label} reminder for "${event.title}" (${hoursUntilEvent.toFixed(1)}h until event)`);
              } catch (notifyError) {
                console.error(`[Marketing Reminder Scheduler] Error sending notification for event ${event.id}:`, notifyError);
              }
            }
          }
        }

        // Special case: Day-of 08:00 notification
        // Only send if it's the event day and current hour is 8 (between 08:00 and 08:59)
        const isEventDay = event.startDate === todayStr;
        const is8AMHour = currentHour === 8;
        
        if (isEventDay && is8AMHour) {
          const dayOfReminderKey = `marketing_event:${event.id}:day-of-8am`;
          const dayOfAlreadySent = await storage.hasSentSchedulerReminder(dayOfReminderKey);
          
          if (!dayOfAlreadySent) {
            try {
              await notifyMarketingEventReminder(
                event.id,
                event.title,
                event.startDate,
                event.time || null,
                'dia-do-evento',
                hoursUntilEvent
              );
              await storage.markSchedulerReminderSent(dayOfReminderKey, 'marketing_event', event.id);
              notificationsSent++;
              console.log(`[Marketing Reminder Scheduler] Sent day-of 08:00 reminder for "${event.title}" (${hoursUntilEvent.toFixed(1)}h until event)`);
            } catch (notifyError) {
              console.error(`[Marketing Reminder Scheduler] Error sending day-of notification for event ${event.id}:`, notifyError);
            }
          }
        }
      } catch (eventError) {
        console.error(`[Marketing Reminder Scheduler] Error processing event ${event.id}:`, eventError);
      }
    }

    console.log(`[Marketing Reminder Scheduler] Check completed. Sent ${notificationsSent} reminder(s)`);
  } catch (error) {
    console.error('[Marketing Reminder Scheduler] Error:', error);
  }
}

export function initMarketingReminderScheduler(): void {
  // Run every hour at :30 to avoid overlapping with other schedulers
  cron.schedule('30 * * * *', processMarketingEventReminders, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Marketing Reminder Scheduler] Initialized - will run every hour at :30 (America/Sao_Paulo) with database persistence');
}

// ==================== TREASURY SCHEDULERS ====================
// Note: These schedulers use in-memory caches for idempotency (consistent with other schedulers in this file).
// Limitation: Reminders may repeat after server restarts. Consider persisting reminder state to DB
// when PIX integration is complete and more robust tracking is needed.

const sentTreasuryReminders = new Map<string, number>();

async function processTreasuryDay5Reminder(): Promise<void> {
  console.log('[Treasury Scheduler] Processing day 5 tax reminder...');
  
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const reminderKey = `${currentYear}-${currentMonth}`;
    
    const allMembers = await storage.getAllMembers();
    const settings = await storage.getTreasurySettings(currentYear);
    const percaptaAmount = settings?.percaptaAmount || 0;
    
    let notificationsSent = 0;
    
    for (const member of allMembers) {
      if (!member.activeMember) continue;
      
      const memberKey = `${member.id}-${reminderKey}`;
      if (sentTreasuryReminders.has(memberKey)) continue;
      
      try {
        // Reuse same logic as /api/treasury/member/status route
        const percaptaPayment = await storage.getMemberPercaptaPayment(member.id, currentYear);
        const hasPendingPercapta = percaptaAmount > 0 && !percaptaPayment?.paidAt;
        
        const umpPayments = await storage.getMemberUmpPayments(member.id, currentYear);
        const paidMonths = umpPayments.filter(p => p.paidAt).map(p => p.month);
        const unpaidMonths: number[] = [];
        
        // Apply Day 10 Rule for starting month
        let startingMonth = 1;
        if (member.activeMemberSince) {
          const activeSince = new Date(member.activeMemberSince);
          if (activeSince.getFullYear() === currentYear) {
            const dayOfMonth = activeSince.getDate();
            const monthActive = activeSince.getMonth() + 1;
            startingMonth = dayOfMonth <= 10 ? monthActive : monthActive + 1;
          } else if (activeSince.getFullYear() > currentYear) {
            startingMonth = 13; // Not active this year
          }
        }
        
        for (let m = startingMonth; m <= currentMonth; m++) {
          if (!paidMonths.includes(m)) unpaidMonths.push(m);
        }
        const hasPendingUmp = unpaidMonths.length > 0;
        
        if (hasPendingPercapta || hasPendingUmp) {
          let body = 'Você possui taxas pendentes: ';
          const pending: string[] = [];
          if (hasPendingPercapta) pending.push('Percapta anual');
          if (hasPendingUmp) pending.push(`Taxa UMP (${unpaidMonths.length} meses)`);
          body += pending.join(' e ') + '. Acesse seu painel financeiro para regularizar.';
          
          await storage.createNotification({
            userId: member.id,
            type: 'treasury_reminder',
            title: '💰 Lembrete de Taxas',
            body,
            data: JSON.stringify({ year: currentYear, month: currentMonth }),
          });
          
          await sendPushToUser(member.id, {
            title: '💰 Lembrete de Taxas',
            body,
            url: '/study/financeiro',
            tag: `treasury-reminder-${currentYear}-${currentMonth}`,
            icon: '/logo.png',
          });
          
          sentTreasuryReminders.set(memberKey, Date.now());
          notificationsSent++;
        }
      } catch (memberError) {
        console.error(`[Treasury Scheduler] Error processing member ${member.id}:`, memberError);
      }
    }
    
    console.log(`[Treasury Scheduler] Day 5 reminder completed. Sent ${notificationsSent} notification(s)`);
  } catch (error) {
    console.error('[Treasury Scheduler] Error during day 5 reminder:', error);
  }
}

// Abandoned cart reminder intervals per spec: 1h, 12h, 24h, 48h
// After 48h, order is automatically cancelled
const ABANDONED_CART_INTERVALS = [
  { hours: 1, label: '1h', urgency: 'low' },
  { hours: 12, label: '12h', urgency: 'medium' },
  { hours: 24, label: '24h', urgency: 'high' },
  { hours: 48, label: '48h', urgency: 'final' },
];

async function processAbandonedCartReminder(): Promise<void> {
  console.log('[Shop Scheduler] Processing abandoned cart reminders...');
  
  try {
    const now = Date.now();
    const allOrders = await storage.getShopOrders({ status: 'awaiting_payment' });
    
    let notificationsSent = 0;
    
    for (const order of allOrders) {
      if (!order.createdAt) continue;
      if (order.orderStatus !== 'awaiting_payment') continue;
      
      const orderDate = new Date(order.createdAt);
      const hoursElapsed = (now - orderDate.getTime()) / (1000 * 60 * 60);
      
      // Find the appropriate interval for this order based on elapsed time
      // We only send the CURRENT interval notification, not skipped ones
      let currentInterval = null;
      for (let i = ABANDONED_CART_INTERVALS.length - 1; i >= 0; i--) {
        const interval = ABANDONED_CART_INTERVALS[i];
        if (hoursElapsed >= interval.hours) {
          // Check if this is the right interval (not the next one)
          const nextInterval = ABANDONED_CART_INTERVALS[i + 1];
          if (!nextInterval || hoursElapsed < nextInterval.hours) {
            currentInterval = interval;
            break;
          }
        }
      }
      
      if (!currentInterval) continue;
      
      const reminderKey = `abandoned-cart-${order.id}-${currentInterval.hours}h`;
      
      // Check if we already sent this reminder (using persistent storage)
      const alreadySent = await storage.hasSentSchedulerReminder(reminderKey);
      
      // Special handling for orders past 48h: auto-cancel if 48h reminder was already sent
      if (hoursElapsed >= 48) {
        const finalReminderKey = `abandoned-cart-${order.id}-48h`;
        const finalReminderSent = await storage.hasSentSchedulerReminder(finalReminderKey);
        
        if (finalReminderSent) {
          // 48h reminder was sent, cancel the order
          try {
            await storage.updateShopOrder(order.id, { orderStatus: 'cancelled' });
            console.log(`[Shop Scheduler] Auto-cancelled order ${order.orderCode} after 48h`);
          } catch (cancelError) {
            console.error(`[Shop Scheduler] Error cancelling order ${order.id}:`, cancelError);
          }
          continue; // Order cancelled, no more notifications
        }
        // 48h reminder not sent yet, fall through to send it
      }
      
      // Skip if already sent this reminder
      if (alreadySent) continue;
      
      const interval = currentInterval;
      
      try {
        let title = '🛒 Pedido Pendente';
        let body = '';
        
        switch (interval.urgency) {
          case 'low':
            title = '🛒 Lembrete de Pagamento';
            body = `Seu pedido #${order.orderCode} está aguardando pagamento. Conclua sua compra!`;
            break;
          case 'medium':
            title = '⏳ Pedido Aguardando';
            body = `Não esqueça: seu pedido #${order.orderCode} ainda não foi pago. Complete sua compra!`;
            break;
          case 'high':
            title = '⚠️ Última Chance!';
            body = `Seu pedido #${order.orderCode} vai expirar em breve. Finalize o pagamento agora!`;
            break;
          case 'final':
            title = '🚨 Pedido Expirando!';
            body = `URGENTE: Seu pedido #${order.orderCode} será cancelado se não for pago em breve!`;
            break;
        }
        
        await storage.createNotification({
          userId: order.userId,
          type: 'abandoned_cart',
          title,
          body,
          data: JSON.stringify({ orderId: order.id, orderCode: order.orderCode, interval: interval.hours }),
        });
        
        await sendPushToUser(order.userId, {
          title,
          body,
          url: '/study/meus-pedidos',
          tag: `abandoned-cart-${order.id}-${interval.hours}`,
          icon: '/logo.png',
        });
        
        // Persist that this reminder was sent (survives restarts)
        await storage.markSchedulerReminderSent(reminderKey, 'abandoned_cart', order.id);
        notificationsSent++;
      } catch (orderError) {
        console.error(`[Shop Scheduler] Error processing order ${order.id} for ${interval.label}:`, orderError);
      }
    }
    
    // Cleanup old reminders (older than 48h) from persistent storage
    await storage.cleanOldSchedulerReminders(48);
    
    console.log(`[Shop Scheduler] Abandoned cart check completed. Sent ${notificationsSent} notification(s)`);
  } catch (error) {
    console.error('[Shop Scheduler] Error during abandoned cart check:', error);
  }
}

// ==================== LOAN INSTALLMENT REMINDERS ====================

async function processLoanInstallmentReminders(): Promise<void> {
  console.log('[Treasury Scheduler] Processing loan installment reminders...');
  
  try {
    const treasurer = await storage.getTreasurer();
    if (!treasurer) {
      console.log('[Treasury Scheduler] No treasurer configured, skipping loan reminders');
      return;
    }
    
    const unpaidInstallments = await storage.getAllUnpaidLoanInstallments();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let notificationsSent = 0;
    
    for (const installment of unpaidInstallments) {
      if (!installment.dueDate) continue;
      
      const dueDate = new Date(installment.dueDate);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const daysUntilDue = Math.round((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const thresholds = [
        { days: 3, label: '3 dias' },
        { days: 1, label: '1 dia' },
        { days: 0, label: 'hoje' },
      ];
      
      for (const threshold of thresholds) {
        if (daysUntilDue !== threshold.days) continue;
        
        const reminderKey = `loan-installment-${installment.id}-${threshold.days}d`;
        
        // Check persistent storage instead of in-memory Map
        const alreadySent = await storage.hasSentSchedulerReminder(reminderKey);
        if (alreadySent) continue;
        
        const dueDateStr = dueDate.toLocaleDateString('pt-BR');
        const body = threshold.days === 0
          ? `Parcela de R$${installment.amount.toFixed(2)} do empréstimo "${installment.loanDescription || 'Empréstimo'}" vence HOJE (${dueDateStr})!`
          : `Parcela de R$${installment.amount.toFixed(2)} do empréstimo "${installment.loanDescription || 'Empréstimo'}" vence em ${threshold.label} (${dueDateStr}).`;
        
        await storage.createNotification({
          userId: treasurer.id,
          type: 'loan_installment_due',
          title: threshold.days === 0 ? '🔴 Parcela Vence Hoje!' : '💳 Lembrete de Parcela',
          body,
          data: JSON.stringify({ installmentId: installment.id, loanId: installment.loanId }),
        });
        
        await sendPushToUser(treasurer.id, {
          title: threshold.days === 0 ? '🔴 Parcela Vence Hoje!' : '💳 Lembrete de Parcela',
          body,
          url: '/admin/tesouraria/emprestimos',
          tag: reminderKey,
          icon: '/logo.png',
        });
        
        // Persist reminder in database (survives restarts)
        await storage.markSchedulerReminderSent(reminderKey, 'loan_installment', installment.id);
        notificationsSent++;
        console.log(`[Treasury Scheduler] Sent ${threshold.label} reminder for installment ${installment.id}`);
      }
    }
    
    console.log(`[Treasury Scheduler] Loan installment check completed. Sent ${notificationsSent} notification(s)`);
  } catch (error) {
    console.error('[Treasury Scheduler] Error during loan installment check:', error);
  }
}

// ==================== SHOP INSTALLMENT REMINDERS ====================

async function processShopInstallmentReminders(): Promise<void> {
  console.log('[Shop Scheduler] Processing shop installment reminders...');
  
  try {
    const thresholds = [
      { days: 5, label: '5 dias' },
      { days: 3, label: '3 dias' },
      { days: 1, label: '1 dia' },
      { days: 0, label: 'hoje' },
    ];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let notificationsSent = 0;
    
    // Get installments due within 5 days
    const pendingInstallments = await storage.getShopInstallmentsDueSoon(5);
    
    for (const installment of pendingInstallments) {
      if (!installment.dueDate) continue;
      
      const order = await storage.getShopOrderById(installment.orderId);
      if (!order) continue;
      
      const dueDate = new Date(installment.dueDate);
      const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
      const daysUntilDue = Math.round((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      for (const threshold of thresholds) {
        if (daysUntilDue !== threshold.days) continue;
        
        const reminderKey = `shop-installment-${installment.id}-${threshold.days}d`;
        
        const alreadySent = await storage.hasSentSchedulerReminder(reminderKey);
        if (alreadySent) continue;
        
        const dueDateStr = dueDate.toLocaleDateString('pt-BR');
        const amountStr = `R$ ${(installment.amount / 100).toFixed(2).replace('.', ',')}`;
        
        const body = threshold.days === 0
          ? `Parcela ${installment.installmentNumber} do pedido ${order.orderCode} (${amountStr}) vence HOJE!`
          : `Parcela ${installment.installmentNumber} do pedido ${order.orderCode} (${amountStr}) vence em ${threshold.label} (${dueDateStr}).`;
        
        await storage.createNotification({
          userId: order.userId,
          type: 'shop_installment_due',
          title: threshold.days === 0 ? '🔴 Parcela Vence Hoje!' : '💳 Lembrete de Parcela',
          body,
          data: JSON.stringify({ installmentId: installment.id, orderId: order.id }),
        });
        
        await sendPushToUser(order.userId, {
          title: threshold.days === 0 ? '🔴 Parcela Vence Hoje!' : '💳 Lembrete de Parcela',
          body,
          url: '/study/meus-pedidos',
          tag: reminderKey,
          icon: '/logo.png',
        });
        
        await storage.markSchedulerReminderSent(reminderKey, 'shop_installment', installment.id);
        notificationsSent++;
        console.log(`[Shop Scheduler] Sent ${threshold.label} reminder for installment ${installment.id}`);
      }
    }
    
    console.log(`[Shop Scheduler] Shop installment check completed. Sent ${notificationsSent} notification(s)`);
  } catch (error) {
    console.error('[Shop Scheduler] Error during shop installment check:', error);
  }
}

// ==================== YEAR ROLLOVER SCHEDULER ====================

async function processYearRollover(): Promise<void> {
  console.log('[Treasury Scheduler] Processing year rollover...');
  
  try {
    const newYear = new Date().getFullYear();
    
    // Prepare storage for new year (creates new settings if needed)
    await storage.resetYearlyTaxes(newYear);
    
    // Notify all active members about new fiscal year
    const allMembers = await storage.getAllMembers();
    const activeMembers = allMembers.filter(m => m.activeMember);
    
    let notificationsSent = 0;
    
    for (const member of activeMembers) {
      try {
        const body = `Feliz Ano Novo! O período fiscal de ${newYear} começou. Suas taxas Percapta e UMP foram renovadas. Acesse seu painel financeiro para mais detalhes.`;
        
        await storage.createNotification({
          userId: member.id,
          type: 'year_rollover',
          title: `🎊 Novo Período Fiscal ${newYear}`,
          body,
          data: JSON.stringify({ year: newYear }),
        });
        
        await sendPushToUser(member.id, {
          title: `🎊 Novo Período Fiscal ${newYear}`,
          body,
          url: '/study/financeiro',
          tag: `year-rollover-${newYear}`,
          icon: '/logo.png',
        });
        
        notificationsSent++;
      } catch (memberError) {
        console.error(`[Treasury Scheduler] Error notifying member ${member.id}:`, memberError);
      }
    }
    
    console.log(`[Treasury Scheduler] Year rollover completed. Notified ${notificationsSent} member(s)`);
  } catch (error) {
    console.error('[Treasury Scheduler] Error during year rollover:', error);
  }
}

// ==================== MONTHLY SUMMARY SCHEDULER ====================

async function processMonthlyTreasurySummary(): Promise<void> {
  console.log('[Treasury Scheduler] Processing monthly summary...');
  
  try {
    const treasurer = await storage.getTreasurer();
    if (!treasurer) {
      console.log('[Treasury Scheduler] No treasurer configured, skipping monthly summary');
      return;
    }
    
    const now = new Date();
    const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const summaryYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const currentYear = now.getFullYear();
    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    // Get summary for just the last month
    const monthSummary = await storage.getTreasuryMonthSummary(summaryYear, lastMonth);
    
    // Get overall balance (year to date) for balance alert
    const yearSummary = await storage.getTreasuryDashboardSummary(currentYear);
    
    const body = `Resumo de ${monthNames[lastMonth]}/${summaryYear}: Entradas R$${monthSummary.totalIncome.toFixed(2)}, Saídas R$${monthSummary.totalExpense.toFixed(2)}, Resultado R$${monthSummary.balance.toFixed(2)}. Saldo atual: R$${yearSummary.balance.toFixed(2)}.`;
    
    await storage.createNotification({
      userId: treasurer.id,
      type: 'monthly_summary',
      title: `📊 Resumo Mensal - ${monthNames[lastMonth]}`,
      body,
      data: JSON.stringify({ month: lastMonth, year: summaryYear, ...monthSummary, currentBalance: yearSummary.balance }),
    });
    
    await sendPushToUser(treasurer.id, {
      title: `📊 Resumo Mensal - ${monthNames[lastMonth]}`,
      body,
      url: '/admin/tesouraria',
      tag: `monthly-summary-${summaryYear}-${lastMonth}`,
      icon: '/logo.png',
    });
    
    // Check for negative/zero balance and alert (using current year balance)
    if (yearSummary.balance <= 0) {
      const alertBody = yearSummary.balance < 0
        ? `ALERTA: O saldo da tesouraria está NEGATIVO: R$${yearSummary.balance.toFixed(2)}. Atenção urgente necessária!`
        : `AVISO: O saldo da tesouraria está ZERADO. Considere revisar as finanças.`;
      
      await storage.createNotification({
        userId: treasurer.id,
        type: 'balance_alert',
        title: yearSummary.balance < 0 ? '🚨 Saldo Negativo!' : '⚠️ Saldo Zerado',
        body: alertBody,
        data: JSON.stringify({ balance: yearSummary.balance }),
      });
      
      await sendPushToUser(treasurer.id, {
        title: yearSummary.balance < 0 ? '🚨 Saldo Negativo!' : '⚠️ Saldo Zerado',
        body: alertBody,
        url: '/admin/tesouraria',
        tag: `balance-alert-${summaryYear}-${lastMonth}`,
        icon: '/logo.png',
      });
    }
    
    console.log(`[Treasury Scheduler] Monthly summary sent to treasurer`);
  } catch (error) {
    console.error('[Treasury Scheduler] Error during monthly summary:', error);
  }
}

// ==================== EVENT FEE REMINDER SCHEDULER ====================

async function processEventFeeReminders(): Promise<void> {
  console.log('[Event Fee Scheduler] Processing event fee reminders...');
  
  try {
    const daysToCheck = [5, 3, 1];
    
    for (const days of daysToCheck) {
      const eventsWithPending = await storage.getEventsWithPendingFees(days);
      
      for (const { event, fee, unpaidConfirmations } of eventsWithPending) {
        console.log(`[Event Fee Scheduler] Event "${event.title}" has ${unpaidConfirmations.length} unpaid confirmations, deadline in ${days} day(s)`);
        
        for (const confirmation of unpaidConfirmations) {
          const baseAmount = fee.feeAmount || 0;
          const totalAmount = baseAmount;
          
          const title = days === 1 
            ? `🚨 ULTIMO DIA: Taxa de ${event.title}` 
            : `📌 Lembrete: Taxa de ${event.title}`;
          const body = days === 1
            ? `Hoje e o ultimo dia para pagar R$${(totalAmount / 100).toFixed(2)} da taxa do evento ${event.title}. Acesse o painel financeiro.`
            : `Faltam ${days} dias para pagar R$${(totalAmount / 100).toFixed(2)} da taxa do evento ${event.title}. Acesse o painel financeiro.`;
          
          try {
            await storage.createNotification({
              userId: confirmation.userId,
              type: 'event_fee_reminder',
              title,
              body,
              data: JSON.stringify({ eventId: event.id, deadline: fee.deadline, daysRemaining: days }),
            });
            
            await sendPushToUser(confirmation.userId, {
              title,
              body,
              url: '/study/financeiro',
              tag: `event-fee-${event.id}-${days}`,
              icon: '/logo.png',
            });
          } catch (err) {
            console.error(`[Event Fee Scheduler] Error notifying user ${confirmation.userId}:`, err);
          }
        }
      }
    }
    
    console.log('[Event Fee Scheduler] Event fee reminders completed');
  } catch (error) {
    console.error('[Event Fee Scheduler] Error processing event fee reminders:', error);
  }
}

// Check if today is calendar day 5
function isCalendarDay5Today(): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric'
  });
  const today = parseInt(formatter.format(now));
  return today === 5;
}

// Wrapper to run reminder on 5th business day only if it's NOT also calendar day 5 (to avoid duplicates)
async function processFifthBusinessDayReminder(): Promise<void> {
  const is5thBusinessDay = isFifthBusinessDayToday();
  const isDay5 = isCalendarDay5Today();
  
  // Skip if today is ALSO calendar day 5 (since the other cron will handle it)
  if (is5thBusinessDay && isDay5) {
    console.log('[Treasury Scheduler] 5th business day coincides with calendar day 5 - skipping to avoid duplicate');
    return;
  }
  
  if (is5thBusinessDay) {
    console.log('[Treasury Scheduler] Today is the 5th business day - running tax reminder...');
    await processTreasuryDay5Reminder();
  }
}

export function initTreasurySchedulers(): void {
  // Day 5 (calendar) reminder for pending taxes (per spec: 08:00)
  cron.schedule('0 8 5 * *', processTreasuryDay5Reminder, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Treasury Scheduler] Day 5 reminder initialized - will run on day 5 of each month at 08:00 (America/Sao_Paulo)');
  
  // 5th business day reminder (runs on weekdays, skips if coincides with day 5 to avoid duplicates)
  cron.schedule('0 8 * * 1-5', processFifthBusinessDayReminder, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Treasury Scheduler] 5th business day reminder initialized - will run on weekdays at 08:00 (America/Sao_Paulo)');
  
  // Abandoned cart reminder (every hour to catch 1h/12h/24h/48h intervals, auto-cancel after 48h)
  cron.schedule('0 * * * *', processAbandonedCartReminder, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Shop Scheduler] Abandoned cart reminder initialized - will run every hour (America/Sao_Paulo) with auto-cancel after 48h');
  
  // Loan installment reminders (daily at 08:00)
  cron.schedule('0 8 * * *', processLoanInstallmentReminders, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Treasury Scheduler] Loan installment reminder initialized - will run daily at 08:00 (America/Sao_Paulo)');
  
  // Shop installment reminders (daily at 08:00 - 5, 3, 1, 0 days before due date)
  cron.schedule('0 8 * * *', processShopInstallmentReminders, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Shop Scheduler] Shop installment reminder initialized - will run daily at 08:00 (America/Sao_Paulo)');
  
  // Event fee reminders (daily at 08:00 - checks 5, 3, 1 days before deadline)
  cron.schedule('0 8 * * *', processEventFeeReminders, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Event Fee Scheduler] Event fee reminder initialized - will run daily at 08:00 (America/Sao_Paulo)');
  
  // Year rollover (Jan 1st at 00:05)
  cron.schedule('5 0 1 1 *', processYearRollover, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Treasury Scheduler] Year rollover initialized - will run on Jan 1st at 00:05 (America/Sao_Paulo)');
  
  // Monthly summary (1st of each month at 08:00)
  cron.schedule('0 8 1 * *', processMonthlyTreasurySummary, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Treasury Scheduler] Monthly summary initialized - will run on day 1 of each month at 08:00 (America/Sao_Paulo)');
}

// ==================== INSTAGRAM STORIES SCHEDULERS ====================

// 1. Gera e salva as imagens do Versículo e Reflexão (Roda às 07:01)
async function generateAndSaveStoryImages() {
  console.log('[Instagram Stories] Starting daily image generation...');
  const { dateKey: todayKey } = getSaoPauloDateParts();

  try {
    // Evita gerar duplicado caso já tenha salvo
    const existingVerseImg = await storage.getDailyStoryImage('verse', todayKey);
    const existingReflectionImg = await storage.getDailyStoryImage('reflection', todayKey);

    // Aguarda o Versículo do Dia estar disponível (o cron das 07:00 pode demorar por causa do AI/reflexão)
    const post = await waitForTodayDailyVersePost();

    if (!post) {
      console.error(`[Instagram Stories] Daily verse post not available for ${todayKey} after waiting. Skipping story image generation.`);
      return;
    }

    // --- VERSÍCULO ---
    if (!existingVerseImg) {
      console.log('[Instagram Stories] Generating verse image...');

      let verseBuffer: Buffer;
      try {
        verseBuffer = await generateVerseShareImage();
      } catch (err) {
        console.warn('[Instagram Stories] Puppeteer verse generation failed, using fallback generator:', err);
        verseBuffer = await generateVerseStoryFallbackPng(post);
      }

      // Força PNG
      const verseR2Key = await uploadToR2(verseBuffer, 'stories', 'image/png', `verse-story-${todayKey}.png`);
      const versePublicUrl = getPublicUrl(verseR2Key);

      await storage.saveDailyStoryImage({
        type: 'verse',
        dateKey: todayKey,
        imageUrl: versePublicUrl,
        r2Key: verseR2Key
      });

      console.log(`[Instagram Stories] Verse image saved: ${versePublicUrl}`);
    } else {
      console.log('[Instagram Stories] Verse image already exists for today - skipping generation');
    }

    // --- REFLEXÃO ---
    if (!existingReflectionImg) {
      console.log('[Instagram Stories] Generating reflection image...');

      let reflectionBuffer: Buffer;
      try {
        reflectionBuffer = await generateReflectionShareImage();
      } catch (err) {
        console.warn('[Instagram Stories] Puppeteer reflection generation failed, using fallback generator:', err);
        reflectionBuffer = await generateReflectionStoryFallbackPng(post);
      }

      const reflectionR2Key = await uploadToR2(reflectionBuffer, 'stories', 'image/png', `reflection-story-${todayKey}.png`);
      const reflectionPublicUrl = getPublicUrl(reflectionR2Key);

      await storage.saveDailyStoryImage({
        type: 'reflection',
        dateKey: todayKey,
        imageUrl: reflectionPublicUrl,
        r2Key: reflectionR2Key
      });

      console.log(`[Instagram Stories] Reflection image saved: ${reflectionPublicUrl}`);
    } else {
      console.log('[Instagram Stories] Reflection image already exists for today - skipping generation');
    }
  } catch (error) {
    console.error('[Instagram Stories] Error generating daily images:', error);
  }
}

// 2. Publica o Story do Versículo (Roda às 07:05)
async function publishVerseStoryToInstagram() {
  const { dateKey: todayKey } = getSaoPauloDateParts();
  console.log(`[Instagram Stories] Attempting to publish verse story for ${todayKey}...`);

  if (!isInstagramPublishingConfigured()) {
    console.log('[Instagram Stories] Publishing not configured - skipping (check INSTAGRAM_* env vars)');
    return;
  }

  try {
    // Tenta algumas vezes pois a geração pode terminar após o cron de publicação (AI pode atrasar)
    for (let attempt = 1; attempt <= 6; attempt++) {
      const savedImage = await storage.getDailyStoryImage('verse', todayKey);

      if (!savedImage) {
        console.log(`[Instagram Stories] No pre-generated verse image found (attempt ${attempt}/6). Trying to generate now...`);
        await generateAndSaveStoryImages();
        await delay(30000);
        continue;
      }

      const result = await publishInstagramStory(savedImage.imageUrl);

      if (result.success) {
        console.log(`[Instagram Stories] Verse story published! Media ID: ${result.mediaId}`);
        return;
      }

      console.error(`[Instagram Stories] Failed to publish verse story (attempt ${attempt}/6):`, result.error);
      await delay(45000);
    }
  } catch (error) {
    console.error('[Instagram Stories] Error publishing verse story:', error);
  }
}

// 3. Publica o Story da Reflexão (Roda às 07:10)
async function publishReflectionStoryToInstagram() {
  const { dateKey: todayKey } = getSaoPauloDateParts();
  console.log(`[Instagram Stories] Attempting to publish reflection story for ${todayKey}...`);

  if (!isInstagramPublishingConfigured()) {
    console.log('[Instagram Stories] Publishing not configured - skipping (check INSTAGRAM_* env vars)');
    return;
  }

  try {
    for (let attempt = 1; attempt <= 6; attempt++) {
      const savedImage = await storage.getDailyStoryImage('reflection', todayKey);

      if (!savedImage) {
        console.log(`[Instagram Stories] No pre-generated reflection image found (attempt ${attempt}/6). Trying to generate now...`);
        await generateAndSaveStoryImages();
        await delay(30000);
        continue;
      }

      const result = await publishInstagramStory(savedImage.imageUrl);

      if (result.success) {
        console.log(`[Instagram Stories] Reflection story published! Media ID: ${result.mediaId}`);
        return;
      }

      console.error(`[Instagram Stories] Failed to publish reflection story (attempt ${attempt}/6):`, result.error);
      await delay(45000);
    }
  } catch (error) {
    console.error('[Instagram Stories] Error publishing reflection story:', error);
  }
}

// 4. Gera e salva as imagens de Aniversariantes (Roda às 08:01)
async function generateAndSaveBirthdayImages() {
  console.log('[Instagram Stories] Checking for birthdays to generate images...');
  const { dateKey: todayFullDate, day: currentDay, month: currentMonth } = getSaoPauloDateParts();

  try {
    const members = await storage.getMembersByBirthday(currentDay, currentMonth);

    if (members.length === 0) {
      console.log('[Instagram Stories] No birthdays today.');
      return;
    }

    console.log(`[Instagram Stories] Found ${members.length} birthdays. Generating images...`);

    for (const member of members) {
      try {
        const firstName = member.fullName.split(' ')[0];
        console.log(`[Instagram Stories] Generating image for ${firstName}...`);

        let buffer: Buffer;
        try {
          buffer = await generateBirthdayShareImage(member.id);
        } catch (err) {
          console.warn(`[Instagram Stories] Puppeteer birthday generation failed for ${member.id}, using simple fallback:`, err);

          const svg = buildStorySvg({
            title: "FELIZ ANIVERSÁRIO 🎉",
            bodyLines: wrapTextToLines(`Que Deus abençoe sua vida, ${firstName}!`, 34),
            footer: "UMP Emaús",
            accent: "#A78BFA"
          });
          buffer = await sharp(Buffer.from(svg)).png().toBuffer();
        }

        const filename = `birthday-${member.id}-${todayFullDate}.png`;
        const r2Key = await uploadToR2(buffer, 'stories', 'image/png', filename);
        const publicUrl = getPublicUrl(r2Key);

        await storage.saveBirthdayShareImage({
          memberId: member.id,
          dateKey: todayFullDate,
          imageUrl: publicUrl,
          r2Key
        });

        console.log(`[Instagram Stories] Image saved for ${firstName}: ${publicUrl}`);
        await delay(2000);
      } catch (err) {
        console.error(`[Instagram Stories] Failed to generate image for member ${member.id}:`, err);
      }
    }
  } catch (error) {
    console.error('[Instagram Stories] Error in birthday image generation process:', error);
  }
}

// 5. Publica os Stories de Aniversariantes (Roda às 08:05)
async function publishBirthdayStoriesToInstagram() {
  console.log('[Instagram Stories] Starting birthday stories publication...');
  const { dateKey: todayFullDate, day: currentDay, month: currentMonth } = getSaoPauloDateParts();

  if (!isInstagramPublishingConfigured()) {
    console.log('[Instagram Stories] Publishing not configured - skipping (check INSTAGRAM_* env vars)');
    return;
  }

  try {
    const members = await storage.getMembersByBirthday(currentDay, currentMonth);

    if (members.length === 0) {
      console.log('[Instagram Stories] No birthdays today to publish.');
      return;
    }

    // Se as imagens ainda não foram geradas (por atraso), tenta gerar aqui
    await generateAndSaveBirthdayImages();

    for (const member of members) {
      try {
        const firstName = member.fullName.split(' ')[0];

        // Use pre-generated image from DB
        let savedImage = await storage.getBirthdayShareImage(member.id, todayFullDate);

        // Retry rápido caso ainda não tenha
        for (let attempt = 1; !savedImage && attempt <= 3; attempt++) {
          console.log(`[Instagram Stories] No pre-generated birthday image for ${firstName} (attempt ${attempt}/3) - regenerating...`);
          await generateAndSaveBirthdayImages();
          await delay(5000);
          savedImage = await storage.getBirthdayShareImage(member.id, todayFullDate);
        }

        if (!savedImage) {
          console.log(`[Instagram Stories] Still no birthday image for ${firstName} - skipping`);
          continue;
        }

        console.log(`[Instagram Stories] Publishing birthday story for ${firstName} using saved image...`);
        const result = await publishInstagramStory(savedImage.imageUrl);

        if (result.success) {
          console.log(`[Instagram Stories] Birthday story for ${firstName} published! Media ID: ${result.mediaId}`);
          await storage.deleteBirthdayShareImage(savedImage.id);
          console.log(`[Instagram Stories] Birthday image marked as published for ${firstName}`);
        } else {
          console.error(`[Instagram Stories] Failed to publish birthday story for ${firstName}:`, result.error);
        }

        await delay(5000);
      } catch (error) {
        console.error(`[Instagram Stories] Error publishing birthday story for ${member.fullName}:`, error);
      }
    }
  } catch (error) {
    console.error('[Instagram Stories] Error publishing birthday stories:', error);
  }
}

// Refresh Instagram access token (runs daily at 07:00)
async function refreshInstagramAccessToken(): Promise<void> {
  console.log('[Instagram Token Scheduler] Attempting to refresh access token...');
  
  try {
    const result = await refreshInstagramToken();
    if (result) {
      console.log('[Instagram Token Scheduler] Token refreshed successfully');
    } else {
      console.log('[Instagram Token Scheduler] Token refresh failed or not configured');
    }
  } catch (error) {
    console.error('[Instagram Token Scheduler] Error refreshing token:', error);
  }
}

export function initInstagramStoriesSchedulers(): void {
  // Refresh Instagram token at 07:00 (America/Sao_Paulo) - before stories are published
  cron.schedule('0 7 * * *', refreshInstagramAccessToken, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Instagram Token Scheduler] Token refresh initialized - will run daily at 07:00 (America/Sao_Paulo)');
  
  // Generate and save verse/reflection images at 07:01 (America/Sao_Paulo)
  cron.schedule('1 7 * * *', generateAndSaveStoryImages, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Instagram Stories Scheduler] Image generation initialized - will run daily at 07:01 (America/Sao_Paulo)');
  
  // Daily verse story at 07:05 (America/Sao_Paulo)
  cron.schedule('5 7 * * *', publishVerseStoryToInstagram, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Instagram Stories Scheduler] Verse story initialized - will run daily at 07:05 (America/Sao_Paulo)');
  
  // Daily reflection story at 07:10 (America/Sao_Paulo)
  cron.schedule('10 7 * * *', publishReflectionStoryToInstagram, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Instagram Stories Scheduler] Reflection story initialized - will run daily at 07:10 (America/Sao_Paulo)');
  
  // Generate and save birthday images at 08:01 (America/Sao_Paulo)
  cron.schedule('1 8 * * *', generateAndSaveBirthdayImages, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Instagram Stories Scheduler] Birthday image generation initialized - will run daily at 08:01 (America/Sao_Paulo)');
  
  // Birthday stories at 08:05 (America/Sao_Paulo)
  cron.schedule('5 8 * * *', publishBirthdayStoriesToInstagram, {
    timezone: 'America/Sao_Paulo'
  });
  console.log('[Instagram Stories Scheduler] Birthday stories initialized - will run daily at 08:05 (America/Sao_Paulo)');
}

export { 
  sendBirthdayEmails, sendStreakReminders, sendInactivityReminders, sendDailyVerse, 
  generateDailyRecoveryVerses, runInstagramSync, refreshDailyMissionsWithAI, 
  processWeeklyGoalRewards, processEventLessonsRelease, processEventCardsDistribution, 
  processEventDeadlineNotifications, processMarketingEventReminders, processTreasuryDay5Reminder, 
  processAbandonedCartReminder, processLoanInstallmentReminders, processShopInstallmentReminders, 
  processYearRollover, processMonthlyTreasurySummary, processEventFeeReminders, 
  publishVerseStoryToInstagram, publishReflectionStoryToInstagram, publishBirthdayStoriesToInstagram, 
  generateAndSaveStoryImages, generateAndSaveBirthdayImages 
};
