import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";
import { initBirthdayScheduler, initDeoGlorySchedulers, initDailyVerseScheduler, initRecoveryVersesScheduler, initInstagramScheduler, initDailyMissionsScheduler, initWeeklyGoalScheduler, initEventScheduler, initEventDeadlineScheduler, initMarketingReminderScheduler, initTreasurySchedulers, initInstagramStoriesSchedulers } from "./scheduler";
import { runImageMigration } from "./migrate-images-to-r2";
import { initializeWebSocket } from "./websocket";
import { storage } from "./storage";
import cors from "cors";
import compression from "compression";
import path from "path";

// ==================== DNS FIX (VERSÃO NATIVA - SEM PACOTES EXTRAS) ====================
// Removemos o 'undici' para evitar o erro de "Module Not Found".
// Voltamos a usar apenas o módulo nativo DNS do Node.js.
import dns from 'node:dns';

try {
  // 1. Força a ordem de resolução para IPv4 primeiro
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }

  // 2. Define servidores DNS públicos e confiáveis
  // Isso tenta sobrescrever a configuração do container do Hugging Face
  dns.setServers([
    '8.8.8.8', // Google
    '1.1.1.1', // Cloudflare
  ]);
  
  console.log("🔧 [System] DNS Configurado: IPv4 First + Google DNS (8.8.8.8)");
} catch (error) {
  console.error("⚠️ [System] Aviso: Não foi possível ajustar configurações de DNS:", error);
}
// ====================================================================================

async function seedShopCategories() {
  try {
    const existingCategories = await storage.getShopCategories();
    if (existingCategories.length === 0) {
      console.log("[Seed] Criando categorias da loja...");
      const defaultCategories = [
        { name: "Vestuários", isDefault: true },
        { name: "Acessórios", isDefault: true },
        { name: "Livros", isDefault: true },
        { name: "Kit UMP", isDefault: true },
      ];
      
      for (const cat of defaultCategories) {
        await storage.createShopCategory(cat);
      }
      console.log(`[Seed] ${defaultCategories.length} categorias da loja criadas!`);
    }
  } catch (error: any) {
    console.error("[Seed] Erro ao criar categorias da loja:", error.message);
  }
}

async function seedAchievementsAndVerses() {
  try {
    const existingVerses = await storage.getAllBibleVerses();
    if (existingVerses.length === 0) {
      console.log("[Seed] Criando versículos bíblicos iniciais...");
      const verses = [
        { reference: "João 3:16", text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", reflection: "O amor de Deus é tão grande que Ele sacrificou Seu próprio Filho por nós.", category: "amor" },
        { reference: "Salmos 23:1", text: "O Senhor é o meu pastor; nada me faltará.", reflection: "Deus cuida de nós como um pastor cuida de suas ovelhas.", category: "provisão" },
        { reference: "Filipenses 4:13", text: "Posso todas as coisas naquele que me fortalece.", reflection: "Cristo nos dá força para enfrentar qualquer situação.", category: "força" },
        { reference: "Jeremias 29:11", text: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais.", reflection: "Deus tem planos de esperança e futuro para nós.", category: "esperança" },
        { reference: "Isaías 41:10", text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.", reflection: "Deus está sempre conosco para nos fortalecer.", category: "força" },
        { reference: "Romanos 8:28", text: "E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.", reflection: "Deus transforma todas as situações para o nosso bem.", category: "esperança" },
        { reference: "Salmos 46:1", text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", reflection: "Podemos confiar em Deus em todos os momentos.", category: "proteção" },
        { reference: "Mateus 11:28", text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", reflection: "Jesus oferece descanso para nossas almas.", category: "descanso" },
        { reference: "Provérbios 3:5-6", text: "Confia no Senhor de todo o teu coração, e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.", reflection: "Confiar em Deus nos guia pelo caminho certo.", category: "sabedoria" },
        { reference: "1 Coríntios 10:13", text: "Não veio sobre vós tentação, senão humana; mas fiel é Deus, que não vos deixará tentar acima do que podeis, antes com a tentação dará também o escape, para que a possais suportar.", reflection: "Deus sempre nos dá um caminho de saída nas tentações.", category: "força" },
        { reference: "Salmos 119:105", text: "Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.", reflection: "A Palavra de Deus ilumina nossa vida.", category: "sabedoria" },
        { reference: "2 Timóteo 1:7", text: "Porque Deus não nos deu o espírito de temor, mas de fortaleza, e de amor, e de moderação.", reflection: "Deus nos capacita com coragem e amor.", category: "coragem" },
        { reference: "Hebreus 11:1", text: "Ora, a fé é o firme fundamento das coisas que se esperam, e a prova das coisas que se não veem.", reflection: "A fé é a certeza do que esperamos em Deus.", category: "fé" },
        { reference: "Romanos 12:2", text: "E não sede conformados com este mundo, mas sede transformados pela renovação do vosso entendimento, para que experimenteis qual seja a boa, agradável, e perfeita vontade de Deus.", reflection: "Devemos buscar a transformação em Cristo.", category: "transformação" },
        { reference: "Gálatas 5:22-23", text: "Mas o fruto do Espírito é: amor, gozo, paz, longanimidade, benignidade, bondade, fé, mansidão, temperança. Contra estas coisas não há lei.", reflection: "O Espírito Santo produz frutos em nossa vida.", category: "espírito" }
      ];

      for (const verse of verses) {
        await storage.createBibleVerse(verse.reference, verse.text, verse.reflection, verse.category);
      }
      console.log(`[Seed] ${verses.length} versículos bíblicos criados com sucesso!`);
    }

    const existingAchievements = await storage.getAllAchievements();
    if (existingAchievements.length === 0) {
      console.log("[Seed] Criando conquistas iniciais...");
      const achievements = [
        // LIÇÕES (12 conquistas)
        { code: "first_lesson", name: "Primeiro Passo", description: "Complete sua primeira lição", icon: "trophy", xpReward: 50, category: "lessons", requirement: JSON.stringify({ lessons: 1 }) },
        { code: "lessons_3", name: "Começando Bem", description: "Complete 3 lições", icon: "book", xpReward: 40, category: "lessons", requirement: JSON.stringify({ lessons: 3 }) },
        { code: "lessons_5", name: "Estudante Dedicado", description: "Complete 5 lições", icon: "book-open", xpReward: 75, category: "lessons", requirement: JSON.stringify({ lessons: 5 }) },
        { code: "lessons_10", name: "Discípulo Fiel", description: "Complete 10 lições", icon: "book-marked", xpReward: 150, category: "lessons", requirement: JSON.stringify({ lessons: 10 }) },
        { code: "lessons_15", name: "Estudioso", description: "Complete 15 lições", icon: "bookmark", xpReward: 200, category: "lessons", requirement: JSON.stringify({ lessons: 15 }) },
        { code: "lessons_25", name: "Mestre da Palavra", description: "Complete 25 lições", icon: "graduation-cap", xpReward: 300, category: "lessons", requirement: JSON.stringify({ lessons: 25 }) },
        { code: "lessons_50", name: "Erudito Bíblico", description: "Complete 50 lições", icon: "library", xpReward: 500, category: "lessons", requirement: JSON.stringify({ lessons: 50 }) },
        { code: "lessons_75", name: "Teólogo", description: "Complete 75 lições", icon: "scroll", xpReward: 750, category: "lessons", requirement: JSON.stringify({ lessons: 75 }) },
        { code: "lessons_100", name: "Centurião da Palavra", description: "Complete 100 lições", icon: "shield", xpReward: 1000, category: "lessons", requirement: JSON.stringify({ lessons: 100 }) },
        { code: "lessons_150", name: "Apóstolo do Estudo", description: "Complete 150 lições", icon: "crown", xpReward: 1500, category: "lessons", requirement: JSON.stringify({ lessons: 150 }) },
        { code: "lessons_200", name: "Doutor das Escrituras", description: "Complete 200 lições", icon: "sparkles", xpReward: 2000, category: "lessons", requirement: JSON.stringify({ lessons: 200 }) },
        { code: "lessons_365", name: "Um Ano de Estudos", description: "Complete 365 lições", icon: "calendar", xpReward: 3650, category: "lessons", requirement: JSON.stringify({ lessons: 365 }) },
        
        // OFENSIVA/STREAK (15 conquistas)
        { code: "streak_3", name: "Constante", description: "Mantenha uma sequência de 3 dias", icon: "flame", xpReward: 30, category: "streak", requirement: JSON.stringify({ streak: 3 }) },
        { code: "streak_5", name: "Comprometido", description: "Mantenha uma sequência de 5 dias", icon: "flame", xpReward: 50, category: "streak", requirement: JSON.stringify({ streak: 5 }) },
        { code: "streak_7", name: "Dedicado", description: "Mantenha uma sequência de 7 dias", icon: "flame", xpReward: 100, category: "streak", requirement: JSON.stringify({ streak: 7 }) },
        { code: "streak_14", name: "Perseverante", description: "Mantenha uma sequência de 14 dias", icon: "flame", xpReward: 200, category: "streak", requirement: JSON.stringify({ streak: 14 }) },
        { code: "streak_21", name: "Formador de Hábito", description: "Mantenha uma sequência de 21 dias", icon: "flame", xpReward: 300, category: "streak", requirement: JSON.stringify({ streak: 21 }) },
        { code: "streak_30", name: "Imbatível", description: "Mantenha uma sequência de 30 dias", icon: "flame", xpReward: 500, category: "streak", requirement: JSON.stringify({ streak: 30 }) },
        { code: "streak_45", name: "Quarentena Espiritual", description: "Mantenha uma sequência de 45 dias", icon: "flame", xpReward: 700, category: "streak", requirement: JSON.stringify({ streak: 45 }) },
        { code: "streak_60", name: "Lenda Viva", description: "Mantenha uma sequência de 60 dias", icon: "crown", xpReward: 1000, category: "streak", requirement: JSON.stringify({ streak: 60 }) },
        { code: "streak_90", name: "Trimestre de Fé", description: "Mantenha uma sequência de 90 dias", icon: "crown", xpReward: 1500, category: "streak", requirement: JSON.stringify({ streak: 90 }) },
        { code: "streak_120", name: "Fidelidade Inabalável", description: "Mantenha uma sequência de 120 dias", icon: "crown", xpReward: 2000, category: "streak", requirement: JSON.stringify({ streak: 120 }) },
        { code: "streak_150", name: "Semestre de Dedicação", description: "Mantenha uma sequência de 150 dias", icon: "crown", xpReward: 2500, category: "streak", requirement: JSON.stringify({ streak: 150 }) },
        { code: "streak_180", name: "Meio Ano Invicto", description: "Mantenha uma sequência de 180 dias", icon: "crown", xpReward: 3000, category: "streak", requirement: JSON.stringify({ streak: 180 }) },
        { code: "streak_270", name: "Três Quartos do Ano", description: "Mantenha uma sequência de 270 dias", icon: "crown", xpReward: 4000, category: "streak", requirement: JSON.stringify({ streak: 270 }) },
        { code: "streak_365", name: "Um Ano Perfeito", description: "Mantenha uma sequência de 365 dias", icon: "crown", xpReward: 5000, category: "streak", requirement: JSON.stringify({ streak: 365 }) },
        { code: "streak_500", name: "Guerreiro da Fé", description: "Mantenha uma sequência de 500 dias", icon: "sword", xpReward: 7500, category: "streak", requirement: JSON.stringify({ streak: 500 }) },
        
        // XP (10 conquistas)
        { code: "xp_100", name: "Iniciante", description: "Alcance 100 XP", icon: "zap", xpReward: 25, category: "xp", requirement: JSON.stringify({ xp: 100 }) },
        { code: "xp_250", name: "Em Crescimento", description: "Alcance 250 XP", icon: "zap", xpReward: 35, category: "xp", requirement: JSON.stringify({ xp: 250 }) },
        { code: "xp_500", name: "Intermediário", description: "Alcance 500 XP", icon: "zap", xpReward: 50, category: "xp", requirement: JSON.stringify({ xp: 500 }) },
        { code: "xp_1000", name: "Avançado", description: "Alcance 1000 XP", icon: "trending-up", xpReward: 100, category: "xp", requirement: JSON.stringify({ xp: 1000 }) },
        { code: "xp_2500", name: "Experiente", description: "Alcance 2500 XP", icon: "trending-up", xpReward: 150, category: "xp", requirement: JSON.stringify({ xp: 2500 }) },
        { code: "xp_5000", name: "Expert", description: "Alcance 5000 XP", icon: "star", xpReward: 250, category: "xp", requirement: JSON.stringify({ xp: 5000 }) },
        { code: "xp_10000", name: "Mestre XP", description: "Alcance 10000 XP", icon: "star", xpReward: 500, category: "xp", requirement: JSON.stringify({ xp: 10000 }) },
        { code: "xp_25000", name: "Grande Mestre", description: "Alcance 25000 XP", icon: "crown", xpReward: 1000, category: "xp", requirement: JSON.stringify({ xp: 25000 }) },
        { code: "xp_50000", name: "Lendário", description: "Alcance 50000 XP", icon: "crown", xpReward: 2000, category: "xp", requirement: JSON.stringify({ xp: 50000 }) },
        { code: "xp_100000", name: "Mítico", description: "Alcance 100000 XP", icon: "sparkles", xpReward: 5000, category: "xp", requirement: JSON.stringify({ xp: 100000 }) },
        
        // NÍVEIS (8 conquistas)
        { code: "level_3", name: "Noviço", description: "Alcance o nível 3", icon: "award", xpReward: 50, category: "level", requirement: JSON.stringify({ level: 3 }) },
        { code: "level_5", name: "Aprendiz", description: "Alcance o nível 5", icon: "award", xpReward: 100, category: "level", requirement: JSON.stringify({ level: 5 }) },
        { code: "level_10", name: "Estudante", description: "Alcance o nível 10", icon: "award", xpReward: 200, category: "level", requirement: JSON.stringify({ level: 10 }) },
        { code: "level_15", name: "Discípulo", description: "Alcance o nível 15", icon: "award", xpReward: 300, category: "level", requirement: JSON.stringify({ level: 15 }) },
        { code: "level_20", name: "Pregador", description: "Alcance o nível 20", icon: "award", xpReward: 400, category: "level", requirement: JSON.stringify({ level: 20 }) },
        { code: "level_25", name: "Mestre", description: "Alcance o nível 25", icon: "crown", xpReward: 500, category: "level", requirement: JSON.stringify({ level: 25 }) },
        { code: "level_50", name: "Sábio", description: "Alcance o nível 50", icon: "crown", xpReward: 1000, category: "level", requirement: JSON.stringify({ level: 50 }) },
        { code: "level_100", name: "Patriarca", description: "Alcance o nível 100", icon: "sparkles", xpReward: 2500, category: "level", requirement: JSON.stringify({ level: 100 }) },
        
        // ESPECIAIS (5 conquistas)
        { code: "perfect_lesson", name: "Perfeito!", description: "Complete uma lição sem erros", icon: "star", xpReward: 25, category: "special", isSecret: false },
        { code: "early_bird", name: "Madrugador", description: "Estude antes das 7h da manhã", icon: "sunrise", xpReward: 30, category: "special", isSecret: false },
        { code: "night_owl", name: "Coruja Noturna", description: "Estude após as 22h", icon: "moon", xpReward: 30, category: "special", isSecret: false },
        { code: "bookworm", name: "Leitor Voraz", description: "Leia 10 versículos bíblicos", icon: "book-heart", xpReward: 50, category: "special", isSecret: false },
        { code: "comeback_kid", name: "Nunca Desisto", description: "Recupere todas as vidas usando versículos", icon: "heart", xpReward: 30, category: "special", isSecret: false }
      ];

      for (const achievement of achievements) {
        await storage.createAchievement(achievement);
      }
      console.log(`[Seed] ${achievements.length} conquistas criadas com sucesso!`);
    }

    // Inicializar missões diárias
    const existingMissions = await storage.getDailyMissions();
    if (existingMissions.length === 0) {
      console.log("[Seed] Criando missões diárias iniciais...");
      await storage.initializeDailyMissions();
      console.log("[Seed] Missões diárias criadas com sucesso!");
    }
  } catch (error: any) {
    console.error("[Seed] Erro ao inicializar conquistas e versículos:", error.message);
  }
}

const app = express();

app.set('trust proxy', 1);

app.use(cors());

// HTTP compression (gzip/brotli) - reduces JSON payload size significantly
app.use(compression({
  level: 6, // Balanced compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Compress JSON and text responses
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));
app.use('/temp-stories', express.static(path.resolve(process.cwd(), 'public', 'temp-stories')));

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '50mb', extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Initialize WebSocket server
  initializeWebSocket(server);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // START SERVER FIRST - Critical for Render port detection
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Initialize database and seeders AFTER server starts
    // Server will shut down if initialization fails
    try {
      await initializeDatabase();
      await seedShopCategories();
      await seedAchievementsAndVerses();
      
      // Migrate existing Base64 images to R2 (runs once per deploy)
      runImageMigration().catch(err => console.error("[Migration] Background migration error:", err));
      
      initBirthdayScheduler();
      initDeoGlorySchedulers();
      initDailyVerseScheduler();
      initRecoveryVersesScheduler();
      initInstagramScheduler();
      initDailyMissionsScheduler();
      initWeeklyGoalScheduler();
      initEventScheduler();
      initEventDeadlineScheduler();
      initMarketingReminderScheduler();
      initTreasurySchedulers();
      initInstagramStoriesSchedulers();
      log("Database and schedulers initialized successfully");
    } catch (error: any) {
      console.error("[FATAL] Failed to initialize:", error.message);
      console.error("[FATAL] Shutting down server");
      process.exit(1);
    }
  });
})();
