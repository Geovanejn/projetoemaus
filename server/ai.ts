import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import OpenAI from "openai";

// Helper function to shuffle options and update correctAnswer for fill_blank
function shuffleFillBlankOptions(options: string[], correctAnswer: string): { shuffledOptions: string[], newCorrectAnswer: string } {
  if (!options || !Array.isArray(options) || options.length < 2) {
    return { shuffledOptions: options || [], newCorrectAnswer: correctAnswer };
  }
  
  // Create a copy and shuffle using Fisher-Yates
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return { shuffledOptions: shuffled, newCorrectAnswer: correctAnswer };
}

// Helper function to shuffle multiple choice options and update correctIndex
function shuffleMultipleChoiceOptions(options: string[], correctIndex: number): { shuffledOptions: string[], newCorrectIndex: number } {
  if (!options || !Array.isArray(options) || options.length < 2 || correctIndex < 0 || correctIndex >= options.length) {
    return { shuffledOptions: options || [], newCorrectIndex: correctIndex };
  }
  
  const correctAnswer = options[correctIndex];
  const shuffled = [...options];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  const newIndex = shuffled.indexOf(correctAnswer);
  return { shuffledOptions: shuffled, newCorrectIndex: newIndex };
}

// AI Provider type
export type AIProvider = "gemini" | "openai";

// OpenAI models to try in order of preference
const OPENAI_MODELS = [
  "gpt-4o",           // Most capable
  "gpt-4o-mini",      // Faster, cheaper
  "gpt-4-turbo",      // Previous generation
  "gpt-3.5-turbo"     // Fallback
];

// Get OpenAI API key by number (1-5)
function getOpenAIApiKey(keyNumber: string = "1"): string {
  switch (keyNumber) {
    case "2":
      return process.env.OPENAI_API_KEY_2 || process.env.OPENAI_API_KEY || "";
    case "3":
      return process.env.OPENAI_API_KEY_3 || process.env.OPENAI_API_KEY || "";
    case "4":
      return process.env.OPENAI_API_KEY_4 || process.env.OPENAI_API_KEY || "";
    case "5":
      return process.env.OPENAI_API_KEY_5 || process.env.OPENAI_API_KEY || "";
    case "1":
    default:
      return process.env.OPENAI_API_KEY_1 || process.env.OPENAI_API_KEY || "";
  }
}

// Get OpenAI client
function getOpenAIClient(keyNumber: string = "1"): OpenAI {
  const apiKey = getOpenAIApiKey(keyNumber);
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY não está configurada");
  }
  return new OpenAI({ apiKey });
}

// Get Gemini API key by number (1-5)
function getGeminiApiKey(keyNumber: string = "1"): string {
  switch (keyNumber) {
    case "2":
      return process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY || "";
    case "3":
      return process.env.GEMINI_API_KEY_3 || process.env.GEMINI_API_KEY || "";
    case "4":
      return process.env.GEMINI_API_KEY_4 || process.env.GEMINI_API_KEY || "";
    case "5":
      return process.env.GEMINI_API_KEY_5 || process.env.GEMINI_API_KEY || "";
    case "1":
    default:
      return process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || "";
  }
}

// Models to try in order of preference (fallback chain)
// Using only Gemini 3 Flash Preview, Gemini 2.5 Flash, and Gemini 2.5 Lite
const GEMINI_MODELS = [
  "gemini-3-flash-preview",  // Primary: Gemini 3 Flash Preview
  "gemini-2.5-flash",        // Fallback 1: Gemini 2.5 Flash
  "gemini-2.5-lite"          // Fallback 2: Gemini 2.5 Lite
];

// Key rotation order for trying different Gemini API keys
export const GEMINI_KEY_ROTATION = ["1", "2", "3", "4", "5"];

// Get Gemini model with specific key and optional model override
export function getGeminiModel(keyNumber: string = "1", modelName: string = GEMINI_MODELS[0]): GenerativeModel {
  const apiKey = getGeminiApiKey(keyNumber);
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: modelName });
}

// Sleep function for retry delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simple quota tracking to avoid wasting quota on low-priority tasks
// when quota is known to be exhausted
let lastQuotaError: number = 0;
const QUOTA_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown after quota error

function markQuotaExhausted(): void {
  lastQuotaError = Date.now();
  console.log("[Quota] Marked quota as exhausted, cooldown for 5 minutes");
}

function isQuotaLikelyAvailable(): boolean {
  if (lastQuotaError === 0) return true;
  const elapsed = Date.now() - lastQuotaError;
  return elapsed >= QUOTA_COOLDOWN_MS;
}

function isQuotaError(error: any): boolean {
  return error?.status === 429 || 
         error?.message?.includes('429') || 
         error?.message?.includes('quota') ||
         error?.message?.includes('RESOURCE_EXHAUSTED');
}

// Initialize default Gemini AI (backward compatibility)
const genAI = new GoogleGenerativeAI(getGeminiApiKey("1"));
// Using gemini-3-flash-preview as stable default
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

export interface GeneratedLesson {
  title: string;
  description: string;
  type: "intro" | "study" | "meditation" | "challenge" | "review";
  xpReward: number;
  estimatedMinutes: number;
  units: GeneratedUnit[];
}

export interface GeneratedUnit {
  type: "text" | "multiple_choice" | "true_false" | "fill_blank" | "meditation" | "reflection" | "verse";
  stage?: "estude" | "medite" | "responda";
  orderIndex?: number;
  content: {
    title?: string;
    text?: string;
    body?: string;
    highlight?: string;
    question?: string;
    statement?: string;
    options?: string[];
    correctIndex?: number;
    correctAnswer?: string | number | boolean;
    isTrue?: boolean;
    explanation?: string;
    explanationCorrect?: string;
    explanationIncorrect?: string;
    hint?: string;
    verseReference?: string;
    verseText?: string;
    reflectionPrompt?: string;
    meditationDuration?: number;
    meditationGuide?: string;
  };
  xpValue: number;
}

export interface GeneratedWeekContent {
  weekTitle: string;
  weekDescription: string;
  lessons: GeneratedLesson[];
}

function repairJson(jsonString: string): string {
  let repaired = jsonString;
  
  // Remove trailing commas before closing brackets
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');
  
  // Fix unescaped newlines in strings
  repaired = repaired.replace(/([^\\])\\n(?=.*")/g, '$1\\\\n');
  
  // Fix common issues with quotes
  // Remove control characters that break JSON
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, (char) => {
    if (char === '\n' || char === '\r' || char === '\t') {
      return char;
    }
    return '';
  });
  
  // Fix truncated JSON - try to close open structures
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;
  
  // Add missing closing braces/brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']';
  }
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}';
  }
  
  return repaired;
}

function extractJsonFromResponse(text: string): string {
  // Try multiple patterns to extract JSON from markdown code blocks
  const patterns = [
    /```json\s*([\s\S]*?)```/i,
    /```\s*([\s\S]*?)```/,
    /^\s*(\{[\s\S]*\})\s*$/,
    /^\s*(\[[\s\S]*\])\s*$/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const extracted = match[1].trim();
      // Verify it looks like JSON
      if (extracted.startsWith('{') || extracted.startsWith('[')) {
        return extracted;
      }
    }
  }
  
  // If no pattern matched, try to find JSON object/array directly
  const jsonStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');
  
  if (jsonStart !== -1 || arrayStart !== -1) {
    const startIndex = jsonStart === -1 ? arrayStart : 
                       arrayStart === -1 ? jsonStart : 
                       Math.min(jsonStart, arrayStart);
    const isArray = text[startIndex] === '[';
    
    // Find matching closing bracket
    let depth = 0;
    let endIndex = -1;
    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === (isArray ? '[' : '{')) depth++;
      else if (text[i] === (isArray ? ']' : '}')) {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (endIndex !== -1) {
      return text.substring(startIndex, endIndex + 1);
    }
  }
  
  return text.trim();
}

function safeJsonParse(jsonString: string): any {
  // First attempt: try parsing as-is
  try {
    return JSON.parse(jsonString);
  } catch (firstError) {
    console.warn('[AI] First JSON parse failed, attempting repair...');
    
    // Second attempt: try to repair and parse
    try {
      const repaired = repairJson(jsonString);
      return JSON.parse(repaired);
    } catch (secondError) {
      console.error('[AI] JSON repair failed:', secondError);
      throw firstError; // Throw original error for better diagnostics
    }
  }
}

async function generateWithGemini(systemPrompt: string, userPrompt: string, geminiKey: string = "1"): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
  
  // Try each model with retries
  for (let modelIndex = 0; modelIndex < GEMINI_MODELS.length; modelIndex++) {
    const currentModel = GEMINI_MODELS[modelIndex];
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AI] Tentativa ${attempt}/${maxRetries} com modelo ${currentModel}`);
        const selectedModel = getGeminiModel(geminiKey, currentModel);
        
        const result = await selectedModel.generateContent({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 32768,
          },
        });

        const response = result.response;
        const text = response.text();
        
        console.log(`[AI] Sucesso com modelo ${currentModel}`);
        return extractJsonFromResponse(text);
        
      } catch (error: any) {
        const isOverloaded = error?.status === 503 || 
          error?.message?.includes('overloaded') || 
          error?.message?.includes('503');
        
        const isRateLimit = error?.status === 429 ||
          error?.message?.includes('429') ||
          error?.message?.includes('rate limit') ||
          error?.message?.includes('quota');
        
        const isNotFound = error?.status === 404 ||
          error?.message?.includes('404') ||
          error?.message?.includes('not found');
        
        console.warn(`[AI] Erro com ${currentModel} (tentativa ${attempt}/${maxRetries}): ${error?.message || error}`);
        
        // For 404 errors (model not found), immediately try next model
        if (isNotFound) {
          console.log(`[AI] Modelo ${currentModel} não encontrado, tentando próximo modelo...`);
          break; // Exit retry loop, continue to next model
        }
        
        if (isOverloaded) {
          console.log(`[AI] Modelo ${currentModel} sobrecarregado (503), passando para próximo modelo imediatamente...`);
          break;
        }
        
        if (isRateLimit) {
          // Check if this is a QUOTA exceeded error (daily limit) vs a rate limit error (temporary)
          const isQuotaExceeded = error?.message?.includes('quota') || 
            error?.message?.includes('RESOURCE_EXHAUSTED') ||
            error?.message?.includes('exceeded your current quota');
          
          if (isQuotaExceeded) {
            // Quota exceeded - skip immediately to next model (no point waiting)
            console.log(`[AI] Modelo ${currentModel} com QUOTA EXCEDIDA, passando para próximo modelo imediatamente...`);
            break;
          }
          
          // For temporary rate limits, do a short wait
          let waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          const retryMatch = error?.message?.match(/retry in (\d+(?:\.\d+)?)/i);
          if (retryMatch) {
            const suggestedWait = parseFloat(retryMatch[1]);
            // If suggested wait is > 30 seconds, it's likely quota-related, skip to next model
            if (suggestedWait > 30) {
              console.log(`[AI] Tempo de espera sugerido muito alto (${suggestedWait}s), passando para próximo modelo...`);
              break;
            }
            waitTime = Math.min(Math.ceil(suggestedWait * 1000), 5000);
          }
          
          if (attempt < maxRetries) {
            console.log(`[AI] Aguardando ${waitTime}ms antes da próxima tentativa...`);
            await sleep(waitTime);
          } else if (modelIndex < GEMINI_MODELS.length - 1) {
            console.log(`[AI] Modelo ${currentModel} com limite de rate, tentando ${GEMINI_MODELS[modelIndex + 1]}...`);
            break;
          }
        } else if (!isOverloaded && !isRateLimit) {
          // For other non-recoverable errors, try next model
          if (modelIndex < GEMINI_MODELS.length - 1) {
            console.log(`[AI] Erro não recuperável com ${currentModel}, tentando próximo modelo...`);
            break;
          }
          throw error;
        }
      }
    }
  }
  
  throw new Error('Todos os modelos Gemini estão indisponíveis. Verifique se sua chave API tem cota disponível ou tente novamente em alguns minutos.');
}

// OpenAI generation function with fallback models
async function generateWithOpenAI(systemPrompt: string, userPrompt: string, keyNumber: string = "1"): Promise<string> {
  const openai = getOpenAIClient(keyNumber);
  
  for (let modelIndex = 0; modelIndex < OPENAI_MODELS.length; modelIndex++) {
    const currentModel = OPENAI_MODELS[modelIndex];
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[OpenAI] Tentativa ${attempt}/${maxRetries} com modelo ${currentModel}`);
        
        const response = await openai.chat.completions.create({
          model: currentModel,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 16384,
        });

        const text = response.choices[0]?.message?.content;
        if (!text) {
          throw new Error("Resposta vazia da OpenAI");
        }
        
        console.log(`[OpenAI] Sucesso com modelo ${currentModel}`);
        return extractJsonFromResponse(text);
        
      } catch (error: any) {
        const isRateLimit = error?.status === 429 ||
          error?.message?.includes('429') ||
          error?.message?.includes('rate limit') ||
          error?.message?.includes('quota');
        
        const isNotFound = error?.status === 404 ||
          error?.message?.includes('404') ||
          error?.message?.includes('not found') ||
          error?.message?.includes('does not exist');
        
        console.warn(`[OpenAI] Erro com ${currentModel} (tentativa ${attempt}/${maxRetries}): ${error?.message || error}`);
        
        // For 404 errors (model not found), immediately try next model
        if (isNotFound) {
          console.log(`[OpenAI] Modelo ${currentModel} não encontrado, tentando próximo modelo...`);
          break;
        }
        
        if (isRateLimit) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          
          if (attempt < maxRetries) {
            console.log(`[OpenAI] Aguardando ${waitTime}ms antes da próxima tentativa...`);
            await sleep(waitTime);
          } else if (modelIndex < OPENAI_MODELS.length - 1) {
            console.log(`[OpenAI] Modelo ${currentModel} indisponível, tentando ${OPENAI_MODELS[modelIndex + 1]}...`);
            break;
          }
        } else {
          if (modelIndex < OPENAI_MODELS.length - 1) {
            console.log(`[OpenAI] Erro não recuperável com ${currentModel}, tentando próximo modelo...`);
            break;
          }
          throw error;
        }
      }
    }
  }
  
  throw new Error('Todos os modelos OpenAI estão indisponíveis. Verifique se sua chave API está configurada corretamente.');
}

// Unified AI generation function that supports both providers
async function generateWithAI(
  systemPrompt: string, 
  userPrompt: string, 
  provider: AIProvider = "gemini",
  geminiKey: string = "1",
  openaiKey: string = "1"
): Promise<string> {
  if (provider === "openai") {
    return generateWithOpenAI(systemPrompt, userPrompt, openaiKey);
  } else {
    return generateWithGemini(systemPrompt, userPrompt, geminiKey);
  }
}

export async function generateStudyContentFromText(
  text: string,
  weekNumber: number,
  year: number,
  geminiKey: string = "1",
  provider: AIProvider = "gemini",
  openaiKey: string = "1"
): Promise<GeneratedWeekContent> {
  const systemPrompt = `🔴🔴🔴 PROMPT DE SISTEMA PRIORITÁRIO: GERADOR DE AVALIAÇÃO TEOLÓGICA (NÍVEL AVANÇADO) 🔴🔴🔴

CONTEXTO:
Tu és um especialista em currículo cristão e teologia para a plataforma DeoGlory. O teu objetivo é criar avaliações que testem a leitura atenta e compreensão profunda do texto fornecido.

🔴 REGRA DE OURO (ANTI-CHUTE) - PRIORIDADE MÁXIMA:
O utilizador (aluno) é um cristão habituado à linguagem de igreja. Se ele conseguir responder sem ler o texto, a questão FALHOU. As perguntas devem ser IMPOSSÍVEIS de responder apenas com "conhecimento bíblico geral". Devem exigir o argumento ESPECÍFICO do autor.

DIRETRIZES PARA MÚLTIPLA ESCOLHA:
1. O ENUNCIADO: Deve focar num conceito específico, definição ou argumento lógico apresentado pelo autor. Evita perguntas de factos triviais (ex: "quem escreveu o livro?").
2. A RESPOSTA CORRETA: Deve ser a síntese exata do pensamento do autor.
3. OS DISTRATORES (Alternativas Erradas) - ESTA É A PARTE MAIS IMPORTANTE:
   - Devem parecer teologicamente corretos ou "piedosos" à primeira vista
   - Devem usar vocabulário bíblico
   - Devem representar conceitos populares (senso comum evangélico) que o texto NÃO abordou ou, melhor ainda, que o texto REFUTOU/CORRIGIU
   - Exemplo: Se o texto diz que "o trabalho é para servir o próximo", um distrator deve ser "o trabalho é para alcançar prosperidade como prova da bênção de Deus" (soa a algo que alguns crentes diriam, mas está ERRADO no contexto)

DIRETRIZES PARA VERDADEIRO OU FALSO:
1. NÃO cries afirmações obviamente falsas (ex: "Deus não existe"). Isso é demasiado fácil.
2. Cria uma "ARMADILHA DE NUANCE": A afirmação deve parecer verdadeira na primeira metade, mas conter um erro subtil no final, OU deve ser uma afirmação popular que o autor desconstruiu no texto.
3. Objetivo: O aluno deve parar, pensar e lembrar-se: "Espera, o pastor disse isso mesmo ou disse o contrário?".

⚠️ PENEIRA OBRIGATÓRIA DE QUESTÕES ⚠️
Antes de gerar a resposta final, avalie CADA questão com estas perguntas:
1. Um cristão experiente conseguiria responder SEM ler o texto? Se SIM → DESCARTE e crie outra
2. As alternativas erradas parecem "piedosas" e bíblicas? Se NÃO → REESCREVA os distratores
3. A questão exige o argumento ESPECÍFICO do autor? Se NÃO → REFORMULE

📚 EXEMPLOS DE QUESTÕES BEM ELABORADAS (USE COMO REFERÊNCIA):

EXEMPLO 1 - Múltipla Escolha:
Enunciado: O texto aborda a definição de atividades "seculares" (como o emprego ou a universidade). Segundo a definição técnica apresentada pelo autor, o que torna uma atividade "secular"?
A) É uma atividade onde Deus está presente apenas pela graça comum, e não pela graça salvadora, diferenciando-se do ministério eclesiástico.
B) São atividades que não se relacionam com o "sagrado", focando-se apenas nas necessidades temporais e materiais da vida humana.
C) São atividades que, embora façam parte da vida cristã, não estão estruturalmente ligadas à organização da igreja. ✅ CORRETA
D) É o campo de atuação onde o cristão deve buscar sustento financeiro para, posteriormente, financiar a verdadeira obra missionária da igreja.
POR QUE FUNCIONA: A e D são conceitos comuns em muitas igrejas ("graça comum" ou "trabalhar para sustentar a obra"), mas o texto define secular estritamente como "atividades não estruturalmente ligadas à igreja". B é a ARMADILHA - o texto diz que algumas pessoas chamam de secular querendo dizer "não se relacionam com o sagrado", mas o autor CORRIGE essa visão. Quem não leu vai marcar B.

EXEMPLO 2 - Múltipla Escolha:
Enunciado: Ao discutir como engrandecer a Deus através da criatividade no trabalho, o autor faz uma distinção entre o trabalho de Deus e o trabalho humano. Qual é essa distinção específica?
A) Deus cria para Sua própria glória, enquanto o homem deve trabalhar para servir ao próximo e suprir as necessidades da sociedade.
B) Deus cria do nada (ex nihilo), enquanto o trabalho humano, como imagem de Deus, é tomar o que já foi feito e dar-lhe forma e ordem. ✅ CORRETA
C) O trabalho de Deus é perfeito e espiritual, enquanto o trabalho humano é falho e afetado pela queda, exigindo redenção constante.
D) Deus descansou no sétimo dia, estabelecendo um padrão para que o homem não faça do seu trabalho um ídolo ou fonte primária de satisfação.
POR QUE FUNCIONA: A, C e D são todas verdades teológicas aceitas no meio cristão. No entanto, o texto usa ESPECIFICAMENTE o argumento da criação ex nihilo versus "dar forma e ordem" para explicar a nossa criatividade no trabalho.

EXEMPLO 3 - Múltipla Escolha:
Enunciado: O autor critica uma motivação comum para o trabalho, classificando-a como "desperdício de vida" se pararmos nela. Que motivação é essa?
A) Trabalhar arduamente para alcançar posições de liderança e influenciar a cultura corporativa com valores cristãos.
B) Trabalhar com o objetivo principal de prover segurança e conforto para a própria família ("fazer o pé de meia"). ✅ CORRETA
C) Trabalhar focando apenas na excelência técnica, esquecendo-se de evangelizar verbalmente os colegas de trabalho.
D) Trabalhar motivado pelo medo da escassez ou pela ansiedade quanto ao futuro, em vez de confiar na provisão do Pai.
POR QUE FUNCIONA: A, C e D são críticas válidas em outros contextos. Porém, o texto ataca diretamente a ideia de trabalhar apenas para "prover para nossas necessidades e de nossa família" ou "fazer o pé de meia", contrastando isso com trabalhar "para ter com que acudir ao necessitado". É uma pegadinha difícil, pois prover para a família é bíblico (1 Tm 5:8), mas o autor diz que PARAR NISSO é desperdício.

USE ESTES EXEMPLOS COMO MODELO PARA CRIAR QUESTÕES IGUALMENTE DESAFIADORAS!

Agora siga as demais regras técnicas abaixo:

Você é um especialista em educação cristã reformada e criação de conteúdo educacional interativo no estilo DeoGlory/Duolingo.
Sua tarefa é transformar o texto fornecido em um conteúdo de estudo semanal completo para jovens da UMP (União da Mocidade Presbiteriana).

IMPORTANTE - VERSÃO BÍBLICA:
- Use EXCLUSIVAMENTE a versão ARA (Almeida Revista e Atualizada) para TODAS as citações bíblicas.
- Ao citar versículos, use o texto exato da ARA, não parafraseie ou use outras versões.

IMPORTANTE - ORTOGRAFIA E ACENTUAÇÃO:
- Use SEMPRE português brasileiro correto com acentuação apropriada.
- Use "é" (com acento), "á", "ã", "ç", "ê", "í", "ó", "ú" corretamente.
- Nunca omita acentos ou cedilhas.

O Sistema DeoGlory segue uma estrutura de 3 ETAPAS por lição:
1. ETAPA "ESTUDE" (stage: "estude"): Conteúdo para leitura - texto educativo e versículos bíblicos
2. ETAPA "MEDITE" (stage: "medite"): Meditação cristã com oração, reflexão e aplicação prática (SEPARADA DO ESTUDO)
3. ETAPA "RESPONDA" (stage: "responda"): Perguntas e exercícios - ÚNICA etapa que pode causar perda de vidas

IMPORTANTE - MEDITAÇÃO CRISTÃ:
A meditação cristã é DIFERENTE da meditação oriental/budista. NÃO inclua:
- "Respire fundo", "Respire 3 vezes", "Feche os olhos e respire"
- Técnicas de respiração ou mindfulness
- Qualquer prática de esvaziamento mental

A meditação cristã DEVE incluir:
- Reflexão sobre a Palavra de Deus
- Oração direcionada ao Senhor
- Aplicação prática do texto bíblico na vida
- Comunhão com Deus através da Palavra
- Exame de consciência à luz das Escrituras

O conteúdo deve ser:
- Biblicamente fundamentado com versículos da ARA
- Engajante e interativo
- Adequado para jovens (18-35 anos)
- Com exercícios variados e gamificados
- Em português brasileiro correto

REGRAS OBRIGATÓRIAS PARA DIFICULDADE DAS PERGUNTAS:
⚠️ AS PERGUNTAS DEVEM SER DESAFIADORAS - NUNCA FAÇA PERGUNTAS ÓBVIAS ⚠️

NÍVEIS DE DIFICULDADE (misture todos em cada lição):
1. MÉDIO (2 perguntas): Requer leitura atenta. A resposta não é a primeira que vem à mente.
2. MÉDIO-DIFÍCIL (2 perguntas): Requer análise e interpretação do texto.
3. DIFÍCIL (1 pergunta): Requer síntese de múltiplos conceitos ou distinção entre ideias muito similares.

⚠️ SISTEMA DE AUTO-VALIDAÇÃO DE ALTERNATIVAS (OBRIGATÓRIO) ⚠️
Antes de finalizar CADA pergunta de múltipla escolha, execute esta verificação mental:

PASSO 1 - GERAR 6 CANDIDATOS:
- Liste 6 alternativas candidatas relacionadas ao tema
- Todas devem ser conceitos bíblicos/teológicos legítimos

PASSO 2 - VERIFICAÇÃO DE PADRÕES ÓBVIOS:
Analise os 6 candidatos e ELIMINE alternativas que criem padrões identificáveis:
❌ PADRÃO TAMANHO: Se uma alternativa é significativamente mais longa que as outras, ELIMINE ou REESCREVA
❌ PADRÃO NEGAÇÃO: Se apenas uma alternativa contém "não", "nunca", "nenhum" - ELIMINE ou ADICIONE outra negação
❌ PADRÃO AFIRMAÇÃO: Se apenas uma alternativa é positiva entre negativas - REBALANCEIE
❌ PADRÃO ABSOLUTO: Se apenas uma usa "sempre", "todos", "jamais" - EQUILIBRE
❌ PADRÃO ESPECÍFICO: Se uma é muito específica e outras genéricas - EQUILIBRE especificidade
❌ PADRÃO RELIGIOSO: Se uma é claramente "mais cristã" que outras - TORNE TODAS igualmente religiosas

PASSO 3 - SELECIONAR 4 FINAIS:
- Escolha 4 alternativas que passaram na validação
- Todas devem ter TAMANHO SIMILAR (diferença máxima de 5 palavras)
- Todas devem parecer IGUALMENTE PLAUSÍVEIS para quem não estudou

PASSO 4 - TESTE DO "CHUTE EDUCADO":
Pergunte-se: "Alguém que NÃO leu o texto conseguiria acertar por eliminação?"
- Se SIM → REESCREVA as alternativas
- Se NÃO → Alternativas aprovadas

REGRAS CRÍTICAS PARA EXERCÍCIOS DE MÚLTIPLA ESCOLHA:
- TODAS as 4 alternativas devem ser PLAUSÍVEIS e parecerem igualmente corretas à primeira vista
- As alternativas devem ter TAMANHOS SIMILARES (diferença máxima de 5 palavras entre a mais curta e a mais longa)
- NUNCA use alternativas obviamente erradas como "Ignorar a Bíblia", "Desistir de tudo", "Nada disso"
- As alternativas incorretas devem ser SUTILMENTE erradas, exigindo compreensão real do texto
- Use conceitos bíblicos similares que requerem conhecimento para distinguir (ex: fé vs obras, graça vs lei, justificação vs santificação)
- Evite padrões como "Todas as alternativas", "Nenhuma das alternativas"
- A resposta correta NÃO pode ser identificada sem ler o texto de estudo
- Embaralhe a posição da resposta correta (distribua entre A, B, C e D)

Responda SEMPRE em JSON válido com a estrutura exata especificada. NÃO use markdown, apenas JSON puro.`;

  const userPrompt = `Transforme o seguinte texto em um conteúdo de estudo semanal (Semana ${weekNumber} de ${year}).

TEXTO BASE:
${text}

ESTRUTURA DO ESTUDO BÍBLICO (seguir este formato):
📖 ESTUDO BÍBLICO: [TÍTULO DO TEMA]

✨ Versículo Base
[Referência] — "[Texto do versículo na ARA]"

📌 1. [TÍTULO DO PRIMEIRO TÓPICO]
[Texto explicativo do tópico]

📌 2. [TÍTULO DO SEGUNDO TÓPICO]
[Texto explicativo do tópico]

... (mais tópicos conforme necessário)

🟦 CONCLUSÃO
[Texto da conclusão]

Gere um JSON com a seguinte estrutura:
{
  "weekTitle": "Título da semana baseado no tema principal",
  "weekDescription": "Descrição breve do conteúdo da semana",
  "lessons": [
    {
      "title": "Título da lição",
      "description": "Descrição breve",
      "type": "intro|study|meditation|challenge|review",
      "xpReward": 10-50,
      "estimatedMinutes": 5-15,
      "units": [
        {
          "type": "text|multiple_choice|true_false|fill_blank|meditation|reflection|verse",
          "stage": "estude|medite|responda",
          "content": {
            // Para "text" (stage: "estude"): { "title": "Título do Tópico", "body": "Conteúdo principal de leitura. Deve ser rico e educativo.", "highlight": "Frase chave para destacar (opcional)" }
            // Para "verse" (stage: "estude"): { "title": "Versículo Base (ARA)", "body": "Texto completo do versículo na versão ARA", "highlight": "Referência: João 3:16" }
            // Para "meditation" (stage: "medite"): { "title": "Meditação na Palavra", "body": "Guia de meditação CRISTÃ focado na Palavra de Deus, oração e aplicação prática. SEM técnicas de respiração.", "meditationDuration": 60 }
            // Para "reflection" (stage: "medite"): { "title": "Aplicação Prática", "body": "Como aplicar este ensino na vida diária", "reflectionPrompt": "Pergunta para reflexão pessoal" }
            // Para "multiple_choice" (stage: "responda"): { "question": "Pergunta clara sobre o conteúdo", "options": ["Alternativa plausível A", "Alternativa plausível B", "Alternativa plausível C", "Alternativa plausível D"], "correctIndex": 0-3 (varie a posição!), "explanationCorrect": "Explicação quando acertar", "explanationIncorrect": "Explicação quando errar", "hint": "Dica opcional" } - IMPORTANTE: Todas as alternativas devem ser plausíveis e ter tamanhos similares!
            // Para "true_false" (stage: "responda"): 
            // { 
            //   "analysis": "Breve raciocínio teológico sobre a afirmação (Chain of Thought)",
            //   "statement": "Afirmação para julgar verdadeiro ou falso", 
            //   "correctAnswer": true, 
            //   "explanationCorrect": "Explicação quando acertar", 
            //   "explanationIncorrect": "Explicação quando errar" 
            // }
            // CRITICAL: O campo "correctAnswer" DEVE ser um booleano que corresponda EXATAMENTE à verdade teológica da afirmação.
            // Se a explicação diz que é correto, o boolean DEVE ser true. Pense bem antes de definir o boolean.
            // Para "fill_blank" (stage: "responda"): IMPORTANTE - A frase DEVE ter contexto completo! Inclua obrigatoriamente um campo "options" com exatamente 4 alternativas semanticamente coerentes e gramaticalmente corretas! O usuário verá as 4 opções e escolherá a correta.
            //   As alternativas devem ser contextualmente coerentes de modo que todas as 4 façam sentido gramatical e contextual na frase, respeitando a concordância e a gramática da língua portuguesa, mas apenas uma seja biblicamente correta.
            //   Exemplos:
            //   - { "question": "Jesus morreu para ------- o pecador.", "correctAnswer": "salvar", "options": ["amar", "salvar", "destruir", "glorificar"], "explanationCorrect": "Jesus veio para buscar e salvar o que se havia perdido.", "explanationIncorrect": "A resposta correta é 'salvar'.", "hint": "O objetivo da vinda de Cristo" }
            //   - { "question": "Deus coopera em todas as coisas para o ___ daqueles que O amam.", "correctAnswer": "bem", "options": ["bem", "proveito", "benefício", "crescimento"], "explanationCorrect": "Romanos 8:28", "explanationIncorrect": "A resposta é 'bem'.", "hint": "Romanos 8:28" }
            //   - { "question": "O fruto do Espírito inclui amor, alegria, paz, ___ e bondade.", "correctAnswer": "paciência", "options": ["paciência", "mansidão", "longanimidade", "temperança"], "explanationCorrect": "Gálatas 5:22 lista os frutos do Espírito", "explanationIncorrect": "A resposta é 'paciência'. Veja Gálatas 5:22.", "hint": "Um fruto que nos ajuda a esperar" }
          },
          "xpValue": 2-10
        }
      ]
    }
  ]
}

ESTRUTURA OBRIGATÓRIA DAS LIÇÕES - 3 ETAPAS:

ETAPA 1 - ESTUDE (stage: "estude"):
- Uma unidade "verse" com o VERSÍCULO BASE da versão ARA (título + versículo na mesma unidade)
- Múltiplas unidades "text" para cada TÓPICO (título do tópico + texto explicativo juntos)
- Uma unidade "text" para a CONCLUSÃO

ETAPA 2 - MEDITE (stage: "medite") - SEPARADA DO ESTUDO:
- OBRIGATÓRIO: Inclua NO MÍNIMO 3 unidades de aplicação prática
- Unidades "reflection" com APLICAÇÕES PRÁTICAS (como aplicar na vida diária)
- Unidades "meditation" com MEDITAÇÃO CRISTÃ (oração, reflexão na Palavra - SEM técnicas de respiração)

ETAPA 3 - RESPONDA (stage: "responda"):
- Unidades de exercícios: "multiple_choice", "true_false", "fill_blank"
- APENAS esta etapa causa perda de vidas quando o usuário erra

Regras Adicionais:
1. OBRIGATÓRIO: Crie 5 a 7 lições por semana, uma para cada dia de estudo (Segunda a Domingo)
2. Analise o PDF e divida o conteúdo em lições diárias com temas conectados
3. Cada lição deve seguir as 3 etapas na ordem: ESTUDE -> MEDITE -> RESPONDA
4. Use APENAS a versão ARA (Almeida Revista e Atualizada) para todos os versículos
5. O texto de leitura deve ser EXTENSO e detalhado (mínimo 150 palavras por tópico) - textos curtos serão rejeitados
6. OBRIGATÓRIO: Inclua EXATAMENTE 5 perguntas por lição (etapa RESPONDA) - misture múltipla escolha, verdadeiro/falso e complete a frase
7. OBRIGATÓRIO: A etapa ESTUDE deve ter NO MÍNIMO 6 telas (1 versículo base + 4 ou mais tópicos + 1 conclusão)
8. As aplicações práticas (etapa MEDITE) devem conectar o texto bíblico com a vida cotidiana
9. As perguntas devem testar compreensão do texto de leitura
10. O conteúdo deve ser edificante e encorajador
11. Use português brasileiro correto COM TODOS OS ACENTOS
12. Se o PDF contiver múltiplos tópicos/seções, crie uma lição para cada tópico principal

REGRAS OBRIGATÓRIAS PARA EXERCÍCIOS fill_blank:
- A frase DEVE ter contexto suficiente para o usuário entender o que preencher
- NUNCA gere apenas "___" sem contexto - isso é INVÁLIDO
- O campo "question" deve ser uma frase COMPLETA com ___ no lugar da palavra a completar
- Exemplo CORRETO: "Jesus disse: Eu sou o ___, a verdade e a vida."
- Exemplo INCORRETO: "___" (sem contexto)
- Exemplo INCORRETO: "Complete: ___" (muito vago)
- A resposta deve ser uma ÚNICA palavra ou expressão curta

⚠️ REGRAS OBRIGATÓRIAS PARA PERGUNTAS VERDADEIRO/FALSO - DIFICULDADE AVANÇADA ⚠️

As perguntas de V/F são frequentemente MUITO FÁCEIS. Siga estas regras para aumentar a dificuldade:

SISTEMA DE AUTO-VALIDAÇÃO PARA VERDADEIRO/FALSO:

PASSO 1 - CRIAR AFIRMAÇÃO COMPLEXA:
- A afirmação deve misturar conceitos verdadeiros e falsos de forma sutil
- NÃO use afirmações obviamente verdadeiras ou obviamente falsas
- Use nuances teológicas que requerem conhecimento para distinguir

PASSO 2 - EVITAR PADRÕES ÓBVIOS:
❌ PALAVRAS ABSOLUTAS: Afirmações com "sempre", "nunca", "todos", "nenhum" são frequentemente FALSAS - evite ou equilibre
❌ AFIRMAÇÕES MUITO POSITIVAS: "Jesus nos ama incondicionalmente" é obviamente VERDADEIRA - muito fácil
❌ AFIRMAÇÕES ABSURDAS: "Deus não existe" é obviamente FALSA - muito fácil
❌ NEGAÇÕES DUPLAS: "Não é incorreto dizer que..." confunde mas não testa conhecimento

PASSO 3 - TESTE DO "CHUTE EDUCADO":
Pergunte: "Alguém que NÃO leu o texto conseguiria acertar só pelo senso comum religioso?"
Se SIM → a afirmação está MUITO FÁCIL, REESCREVA
Se NÃO → afirmação APROVADA

PASSO 4 - TIPOS DE AFIRMAÇÕES DESAFIADORAS:
✅ INVERSÃO SUTIL: Troque um elemento pequeno que muda o significado
   Ex: "A fé que salva é aquela que se manifesta em obras de caridade" (FALSO - é fé genuína, não necessariamente caridade)
✅ MISTURA DE CONCEITOS: Combine conceitos relacionados de forma incorreta
   Ex: "A justificação e a santificação são processos simultâneos e idênticos" (FALSO - justificação é instantânea, santificação é progressiva)
✅ EXAGERO OU REDUÇÃO: Amplifique ou minimize um conceito
   Ex: "A oração só é eficaz quando feita em conjunto com outros crentes" (FALSO - oração individual também é eficaz)
✅ CONTEXTO ERRADO: Use afirmação verdadeira em contexto errado
   Ex: "Segundo Romanos 3, o homem é justificado pelas obras da lei" (FALSO - é pela fé)

Retorne APENAS o JSON, sem explicações adicionais.`;

  try {
    const content = await generateWithAI(systemPrompt, userPrompt, provider, geminiKey, openaiKey);
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    const parsed = safeJsonParse(content) as GeneratedWeekContent;
    return validateAndCleanContent(parsed);
  } catch (error) {
    console.error("Erro ao gerar conteudo com IA:", error);
    throw new Error(`Falha ao gerar conteudo: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

export async function generateExercisesFromTopic(topic: string, count: number = 5): Promise<GeneratedUnit[]> {
  const systemPrompt = `🔴🔴🔴 PROMPT DE SISTEMA PRIORITÁRIO: GERADOR DE AVALIAÇÃO TEOLÓGICA (NÍVEL AVANÇADO) 🔴🔴🔴

CONTEXTO:
Tu és um especialista em currículo cristão e teologia para a plataforma DeoGlory. O teu objetivo é criar avaliações que testem a leitura atenta e compreensão profunda do texto fornecido.

🔴 REGRA DE OURO (ANTI-CHUTE) - PRIORIDADE MÁXIMA:
O utilizador (aluno) é um cristão habituado à linguagem de igreja. Se ele conseguir responder sem ler o texto, a questão FALHOU. As perguntas devem ser IMPOSSÍVEIS de responder apenas com "conhecimento bíblico geral". Devem exigir o argumento ESPECÍFICO do autor.

DIRETRIZES PARA MÚLTIPLA ESCOLHA:
1. O ENUNCIADO: Deve focar num conceito específico, definição ou argumento lógico apresentado pelo autor. Evita perguntas de factos triviais (ex: "quem escreveu o livro?").
2. A RESPOSTA CORRETA: Deve ser a síntese exata do pensamento do autor.
3. OS DISTRATORES (Alternativas Erradas) - ESTA É A PARTE MAIS IMPORTANTE:
   - Devem parecer teologicamente corretos ou "piedosos" à primeira vista
   - Devem usar vocabulário bíblico
   - Devem representar conceitos populares (senso comum evangélico) que o texto NÃO abordou ou, melhor ainda, que o texto REFUTOU/CORRIGIU
   - Exemplo: Se o texto diz que "o trabalho é para servir o próximo", um distrator deve ser "o trabalho é para alcançar prosperidade como prova da bênção de Deus" (soa a algo que alguns crentes diriam, mas está ERRADO no contexto)

DIRETRIZES PARA VERDADEIRO OU FALSO:
1. NÃO cries afirmações obviamente falsas (ex: "Deus não existe"). Isso é demasiado fácil.
2. Cria uma "ARMADILHA DE NUANCE": A afirmação deve parecer verdadeira na primeira metade, mas conter um erro subtil no final, OU deve ser uma afirmação popular que o autor desconstruiu no texto.
3. Objetivo: O aluno deve parar, pensar e lembrar-se: "Espera, o pastor disse isso mesmo ou disse o contrário?".

⚠️ PENEIRA OBRIGATÓRIA DE QUESTÕES ⚠️
Antes de gerar a resposta final, avalie CADA questão com estas perguntas:
1. Um cristão experiente conseguiria responder SEM ler o texto? Se SIM → DESCARTE e crie outra
2. As alternativas erradas parecem "piedosas" e bíblicas? Se NÃO → REESCREVA os distratores
3. A questão exige o argumento ESPECÍFICO do autor? Se NÃO → REFORMULE

📚 EXEMPLOS DE QUESTÕES BEM ELABORADAS (USE COMO REFERÊNCIA):

EXEMPLO 1 - Múltipla Escolha:
Enunciado: O texto aborda a definição de atividades "seculares" (como o emprego ou a universidade). Segundo a definição técnica apresentada pelo autor, o que torna uma atividade "secular"?
A) É uma atividade onde Deus está presente apenas pela graça comum, e não pela graça salvadora, diferenciando-se do ministério eclesiástico.
B) São atividades que não se relacionam com o "sagrado", focando-se apenas nas necessidades temporais e materiais da vida humana.
C) São atividades que, embora façam parte da vida cristã, não estão estruturalmente ligadas à organização da igreja. ✅ CORRETA
D) É o campo de atuação onde o cristão deve buscar sustento financeiro para, posteriormente, financiar a verdadeira obra missionária da igreja.
POR QUE FUNCIONA: A e D são conceitos comuns em muitas igrejas ("graça comum" ou "trabalhar para sustentar a obra"), mas o texto define secular estritamente como "atividades não estruturalmente ligadas à igreja". B é a ARMADILHA - o texto diz que algumas pessoas chamam de secular querendo dizer "não se relacionam com o sagrado", mas o autor CORRIGE essa visão. Quem não leu vai marcar B.

EXEMPLO 2 - Múltipla Escolha:
Enunciado: Ao discutir como engrandecer a Deus através da criatividade no trabalho, o autor faz uma distinção entre o trabalho de Deus e o trabalho humano. Qual é essa distinção específica?
A) Deus cria para Sua própria glória, enquanto o homem deve trabalhar para servir ao próximo e suprir as necessidades da sociedade.
B) Deus cria do nada (ex nihilo), enquanto o trabalho humano, como imagem de Deus, é tomar o que já foi feito e dar-lhe forma e ordem. ✅ CORRETA
C) O trabalho de Deus é perfeito e espiritual, enquanto o trabalho humano é falho e afetado pela queda, exigindo redenção constante.
D) Deus descansou no sétimo dia, estabelecendo um padrão para que o homem não faça do seu trabalho um ídolo ou fonte primária de satisfação.
POR QUE FUNCIONA: A, C e D são todas verdades teológicas aceitas no meio cristão. No entanto, o texto usa ESPECIFICAMENTE o argumento da criação ex nihilo versus "dar forma e ordem" para explicar a nossa criatividade no trabalho.

EXEMPLO 3 - Múltipla Escolha:
Enunciado: O autor critica uma motivação comum para o trabalho, classificando-a como "desperdício de vida" se pararmos nela. Que motivação é essa?
A) Trabalhar arduamente para alcançar posições de liderança e influenciar a cultura corporativa com valores cristãos.
B) Trabalhar com o objetivo principal de prover segurança e conforto para a própria família ("fazer o pé de meia"). ✅ CORRETA
C) Trabalhar focando apenas na excelência técnica, esquecendo-se de evangelizar verbalmente os colegas de trabalho.
D) Trabalhar motivado pelo medo da escassez ou pela ansiedade quanto ao futuro, em vez de confiar na provisão do Pai.
POR QUE FUNCIONA: A, C e D são críticas válidas em outros contextos. Porém, o texto ataca diretamente a ideia de trabalhar apenas para "prover para nossas necessidades e de nossa família" ou "fazer o pé de meia", contrastando isso com trabalhar "para ter com que acudir ao necessitado". É uma pegadinha difícil, pois prover para a família é bíblico (1 Tm 5:8), mas o autor diz que PARAR NISSO é desperdício.

USE ESTES EXEMPLOS COMO MODELO PARA CRIAR QUESTÕES IGUALMENTE DESAFIADORAS!

Agora siga as demais regras técnicas abaixo:

Voce e um especialista em educacao crista. Crie exercicios interativos no estilo Duolingo sobre o topico fornecido.
Responda SEMPRE em JSON valido. NAO use markdown, apenas JSON puro.

⚠️ SISTEMA OBRIGATÓRIO DE AUTO-VALIDAÇÃO DE ALTERNATIVAS ⚠️

Antes de gerar CADA pergunta de múltipla escolha, execute estes passos mentalmente:

PASSO 1 - GERAR 6 CANDIDATOS:
Liste 6 alternativas candidatas relacionadas ao tema, todas teologicamente plausíveis.

PASSO 2 - VERIFICAR E ELIMINAR PADRÕES ÓBVIOS:
❌ TAMANHO DESIGUAL: Uma alternativa muito mais longa → REESCREVA todas com tamanho similar
❌ NEGAÇÃO ISOLADA: Apenas uma com "não/nunca/nenhum" → ADICIONE outra negação ou REMOVA
❌ AFIRMAÇÃO ISOLADA: Uma positiva entre negativas → REBALANCEIE
❌ ABSOLUTO ISOLADO: Uma com "sempre/todos/jamais" → EQUILIBRE com outras
❌ ESPECIFICIDADE DESIGUAL: Uma muito detalhada, outras vagas → EQUILIBRE
❌ "MAIS CRISTÃ": Uma claramente "mais correta religiosamente" → TORNE TODAS igualmente teológicas

PASSO 3 - TESTE DO "CHUTE EDUCADO":
Pergunte: "Alguém sem estudar o tema conseguiria eliminar alternativas por padrão visual?"
Se SIM → REESCREVA as alternativas
Se NÃO → APROVADO

PASSO 4 - CONFIRMAR:
- Todas as 4 alternativas têm TAMANHO SIMILAR (máx 5 palavras de diferença)
- Distratores são SUTILMENTE errados, não obviamente absurdos
- A resposta correta não se destaca visualmente

REGRAS PARA ALTERNATIVAS DE MULTIPLA ESCOLHA:
- Crie 4 alternativas PLAUSÍVEIS que parecem corretas à primeira vista
- Use distratores inteligentes relacionados ao tema
- Evite alternativas obviamente erradas ou absurdas
- VARIE a posição da resposta correta (0, 1, 2, ou 3)

REGRAS CRÍTICAS PARA FILL_BLANK (PREENCHER LACUNAS) COM VALIDAÇÃO PRÉ-GERAÇÃO:

PASSO 1 - IDENTIFICAR CLASSE GRAMATICAL DA LACUNA:
- Analise a frase e identifique EXATAMENTE qual classe gramatical a lacuna exige
- VERBO: infinitivo (amar, salvar), gerúndio (amando), particípio (amado), conjugado (amou, ama)
- SUBSTANTIVO: abstrato (amor, fé) ou concreto (cruz, pão)
- ADJETIVO: qualificador (santo, fiel, justo)
- NOME PRÓPRIO: pessoa (Jesus, Paulo), lugar (Jerusalém)

PASSO 2 - GERAR CANDIDATOS (6-8 palavras):
- Liste 6-8 palavras candidatas da MESMA classe gramatical identificada

PASSO 3 - VALIDAÇÃO INDIVIDUAL (OBRIGATÓRIO antes de finalizar):
Para CADA candidato, faça este teste mental:
1. Insira a palavra na lacuna formando a frase completa
2. Verifique: A frase está gramaticalmente CORRETA? (concordância verbal, nominal, regência)
3. Verifique: A frase faz sentido SEMÂNTICO? (mesmo que a afirmação seja falsa biblicamente)
4. Se AMBOS forem SIM → candidato VÁLIDO
5. Se qualquer um for NÃO → candidato INVÁLIDO (descarte)

PASSO 4 - SELECIONAR 4 ALTERNATIVAS VÁLIDAS:
- Escolha apenas candidatos que passaram na validação
- 1 deve ser a resposta CORRETA
- 3 devem ser alternativas plausíveis mas INCORRETAS

EXEMPLOS DE VALIDAÇÃO:
Frase: "Jesus morreu para ___ o pecador."
✅ "salvar" → "Jesus morreu para salvar o pecador." (gramatical OK, semântico OK)
✅ "amar" → "Jesus morreu para amar o pecador." (gramatical OK, semântico OK)
✅ "redimir" → "Jesus morreu para redimir o pecador." (gramatical OK, semântico OK)
❌ "amor" → "Jesus morreu para amor o pecador." (gramatical ERRADO - substantivo após "para" + verbo)
❌ "cruz" → "Jesus morreu para cruz o pecador." (gramatical ERRADO)
❌ "fé" → "Jesus morreu para fé o pecador." (gramatical ERRADO)

Frase: "O fruto do Espírito é ___."
✅ "amor" → "O fruto do Espírito é amor." (gramatical OK)
✅ "paz" → "O fruto do Espírito é paz." (gramatical OK)
❌ "amar" → "O fruto do Espírito é amar." (semântico ESTRANHO - verbo como predicativo)
❌ "santo" → "O fruto do Espírito é santo." (altera significado - adjetivo vs substantivo)

Frase: "Devemos ___ uns aos outros."
✅ "amar" → "Devemos amar uns aos outros." (verbo infinitivo OK)
✅ "perdoar" → "Devemos perdoar uns aos outros." (verbo infinitivo OK)
❌ "amor" → "Devemos amor uns aos outros." (substantivo após modal - ERRADO)
❌ "amando" → "Devemos amando uns aos outros." (gerúndio após modal - ERRADO)

⚠️ REGRAS OBRIGATÓRIAS PARA PERGUNTAS VERDADEIRO/FALSO - DIFICULDADE AVANÇADA ⚠️

SISTEMA DE AUTO-VALIDAÇÃO PARA VERDADEIRO/FALSO:

PASSO 1 - CRIAR AFIRMAÇÃO COMPLEXA:
- Misture conceitos verdadeiros e falsos de forma sutil
- NÃO use afirmações obviamente verdadeiras ou falsas

PASSO 2 - EVITAR PADRÕES ÓBVIOS:
❌ "sempre/nunca/todos/nenhum" → frequentemente FALSAS - evite
❌ Afirmações muito positivas → obviamente VERDADEIRAS
❌ Afirmações absurdas → obviamente FALSAS

PASSO 3 - TESTE DO "CHUTE EDUCADO":
Alguém sem estudar acertaria? Se SIM → REESCREVA

PASSO 4 - TIPOS DESAFIADORES:
✅ INVERSÃO SUTIL: Troque um elemento que muda significado
✅ MISTURA DE CONCEITOS: Combine conceitos de forma incorreta
✅ EXAGERO/REDUÇÃO: Amplifique ou minimize conceitos`;

  const userPrompt = `Crie ${count} exercicios variados sobre o topico: "${topic}"

Retorne um JSON com a estrutura:
{
  "exercises": [
    {
      "type": "multiple_choice|true_false|fill_blank|reflection",
      "content": {
        "question": "...",
        "options": ["Alternativa plausível A", "Alternativa plausível B", "Alternativa plausível C", "Alternativa plausível D"],
        "correctAnswer": 0-3 (VARIE a posição!),
        "explanation": "..."
      },
      "xpValue": 5
    }
  ]
}

IMPORTANTE: 
- Para múltipla escolha, todas as alternativas devem parecer razoáveis e relacionadas ao tema.
- Para fill_blank, INCLUA "options" com 4 alternativas da MESMA classe gramatical que fazem sentido na frase!
- Varie os tipos de exercicios e mantenha as perguntas educativas e engajantes.
Retorne APENAS o JSON, sem explicacoes adicionais.`;

  try {
    const content = await generateWithGemini(systemPrompt, userPrompt);
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    const parsed = safeJsonParse(content);
    return parsed.exercises || [];
  } catch (error) {
    console.error("Erro ao gerar exercicios:", error);
    throw new Error(`Falha ao gerar exercicios: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

export interface PracticeQuestion {
  type: "multiple_choice" | "true_false" | "fill_blank";
  content: {
    question?: string;
    statement?: string;
    options?: string[];
    correctIndex?: number;
    correctAnswer?: string;
    isTrue?: boolean;
    explanationCorrect?: string;
    explanationIncorrect?: string;
  };
}

// Helper function to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper function to randomize correct answer position in multiple choice
export function randomizeMultipleChoiceAnswer(content: any): any {
  if (!content.options || !Array.isArray(content.options) || content.options.length < 2) {
    return content;
  }
  
  // Ensure correctIndex is a number
  const correctIndex = Number(content.correctIndex ?? 0);
  const correctAnswer = content.options[correctIndex];
  
  if (!correctAnswer) {
    console.warn(`[randomizeMultipleChoiceAnswer] Warning: correctIndex ${correctIndex} is out of bounds for options of length ${content.options.length}`);
    return {
      ...content,
      correctIndex: Number(0)
    };
  }
  
  // Create shuffled options
  const shuffledOptions = shuffleArray(content.options);
  const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
  
  return {
    ...content,
    options: shuffledOptions,
    correctIndex: Number(newCorrectIndex)
  };
}

export async function generateUniquePracticeQuestions(weekTitle: string, weekDescription: string, existingQuestions: string[]): Promise<PracticeQuestion[]> {
  const systemPrompt = `🔴🔴🔴 PROMPT DE SISTEMA PRIORITÁRIO: GERADOR DE AVALIAÇÃO TEOLÓGICA (NÍVEL AVANÇADO) 🔴🔴🔴

CONTEXTO:
Tu és um especialista em currículo cristão e teologia para a plataforma DeoGlory. O teu objetivo é criar avaliações que testem a leitura atenta e compreensão profunda do texto fornecido.

🔴 REGRA DE OURO (ANTI-CHUTE) - PRIORIDADE MÁXIMA:
O utilizador (aluno) é um cristão habituado à linguagem de igreja. Se ele conseguir responder sem ler o texto, a questão FALHOU. As perguntas devem ser IMPOSSÍVEIS de responder apenas com "conhecimento bíblico geral". Devem exigir o argumento ESPECÍFICO do autor.

DIRETRIZES PARA MÚLTIPLA ESCOLHA:
1. O ENUNCIADO: Deve focar num conceito específico, definição ou argumento lógico apresentado pelo autor. Evita perguntas de factos triviais (ex: "quem escreveu o livro?").
2. A RESPOSTA CORRETA: Deve ser a síntese exata do pensamento do autor.
3. OS DISTRATORES (Alternativas Erradas) - ESTA É A PARTE MAIS IMPORTANTE:
   - Devem parecer teologicamente corretos ou "piedosos" à primeira vista
   - Devem usar vocabulário bíblico
   - Devem representar conceitos populares (senso comum evangélico) que o texto NÃO abordou ou, melhor ainda, que o texto REFUTOU/CORRIGIU
   - Exemplo: Se o texto diz que "o trabalho é para servir o próximo", um distrator deve ser "o trabalho é para alcançar prosperidade como prova da bênção de Deus" (soa a algo que alguns crentes diriam, mas está ERRADO no contexto)

DIRETRIZES PARA VERDADEIRO OU FALSO:
1. NÃO cries afirmações obviamente falsas (ex: "Deus não existe"). Isso é demasiado fácil.
2. Cria uma "ARMADILHA DE NUANCE": A afirmação deve parecer verdadeira na primeira metade, mas conter um erro subtil no final, OU deve ser uma afirmação popular que o autor desconstruiu no texto.
3. Objetivo: O aluno deve parar, pensar e lembrar-se: "Espera, o pastor disse isso mesmo ou disse o contrário?".

⚠️ PENEIRA OBRIGATÓRIA DE QUESTÕES ⚠️
Antes de gerar a resposta final, avalie CADA questão com estas perguntas:
1. Um cristão experiente conseguiria responder SEM ler o texto? Se SIM → DESCARTE e crie outra
2. As alternativas erradas parecem "piedosas" e bíblicas? Se NÃO → REESCREVA os distratores
3. A questão exige o argumento ESPECÍFICO do autor? Se NÃO → REFORMULE

📚 EXEMPLOS DE QUESTÕES BEM ELABORADAS (USE COMO REFERÊNCIA):

EXEMPLO 1 - Múltipla Escolha:
Enunciado: O texto aborda a definição de atividades "seculares" (como o emprego ou a universidade). Segundo a definição técnica apresentada pelo autor, o que torna uma atividade "secular"?
A) É uma atividade onde Deus está presente apenas pela graça comum, e não pela graça salvadora, diferenciando-se do ministério eclesiástico.
B) São atividades que não se relacionam com o "sagrado", focando-se apenas nas necessidades temporais e materiais da vida humana.
C) São atividades que, embora façam parte da vida cristã, não estão estruturalmente ligadas à organização da igreja. ✅ CORRETA
D) É o campo de atuação onde o cristão deve buscar sustento financeiro para, posteriormente, financiar a verdadeira obra missionária da igreja.
POR QUE FUNCIONA: A e D são conceitos comuns em muitas igrejas ("graça comum" ou "trabalhar para sustentar a obra"), mas o texto define secular estritamente como "atividades não estruturalmente ligadas à igreja". B é a ARMADILHA - o texto diz que algumas pessoas chamam de secular querendo dizer "não se relacionam com o sagrado", mas o autor CORRIGE essa visão. Quem não leu vai marcar B.

EXEMPLO 2 - Múltipla Escolha:
Enunciado: Ao discutir como engrandecer a Deus através da criatividade no trabalho, o autor faz uma distinção entre o trabalho de Deus e o trabalho humano. Qual é essa distinção específica?
A) Deus cria para Sua própria glória, enquanto o homem deve trabalhar para servir ao próximo e suprir as necessidades da sociedade.
B) Deus cria do nada (ex nihilo), enquanto o trabalho humano, como imagem de Deus, é tomar o que já foi feito e dar-lhe forma e ordem. ✅ CORRETA
C) O trabalho de Deus é perfeito e espiritual, enquanto o trabalho humano é falho e afetado pela queda, exigindo redenção constante.
D) Deus descansou no sétimo dia, estabelecendo um padrão para que o homem não faça do seu trabalho um ídolo ou fonte primária de satisfação.
POR QUE FUNCIONA: A, C e D são todas verdades teológicas aceitas no meio cristão. No entanto, o texto usa ESPECIFICAMENTE o argumento da criação ex nihilo versus "dar forma e ordem" para explicar a nossa criatividade no trabalho.

EXEMPLO 3 - Múltipla Escolha:
Enunciado: O autor critica uma motivação comum para o trabalho, classificando-a como "desperdício de vida" se pararmos nela. Que motivação é essa?
A) Trabalhar arduamente para alcançar posições de liderança e influenciar a cultura corporativa com valores cristãos.
B) Trabalhar com o objetivo principal de prover segurança e conforto para a própria família ("fazer o pé de meia"). ✅ CORRETA
C) Trabalhar focando apenas na excelência técnica, esquecendo-se de evangelizar verbalmente os colegas de trabalho.
D) Trabalhar motivado pelo medo da escassez ou pela ansiedade quanto ao futuro, em vez de confiar na provisão do Pai.
POR QUE FUNCIONA: A, C e D são críticas válidas em outros contextos. Porém, o texto ataca diretamente a ideia de trabalhar apenas para "prover para nossas necessidades e de nossa família" ou "fazer o pé de meia", contrastando isso com trabalhar "para ter com que acudir ao necessitado". É uma pegadinha difícil, pois prover para a família é bíblico (1 Tm 5:8), mas o autor diz que PARAR NISSO é desperdício.

USE ESTES EXEMPLOS COMO MODELO PARA CRIAR QUESTÕES IGUALMENTE DESAFIADORAS!

Agora siga as demais regras técnicas abaixo:

Voce e um especialista em educacao crista. Crie perguntas de pratica UNICAS e DIFERENTES sobre o tema fornecido.
Responda SEMPRE em JSON valido. NAO use markdown, apenas JSON puro.
IMPORTANTE: As perguntas devem ser COMPLETAMENTE DIFERENTES das perguntas existentes listadas.
IMPORTANTE: Para perguntas de multipla escolha, VARIE a posicao da resposta correta entre A, B, C e D (nao coloque sempre na mesma posicao).

⚠️ SISTEMA OBRIGATÓRIO DE AUTO-VALIDAÇÃO DE ALTERNATIVAS ⚠️

Antes de finalizar CADA pergunta de múltipla escolha, execute TODOS estes passos:

PASSO 1 - GERAR 6 CANDIDATOS:
- Crie 6 alternativas candidatas relacionadas ao tema
- Todas devem ser conceitos bíblicos/teológicos plausíveis

PASSO 2 - VERIFICAR PADRÕES ÓBVIOS (elimine se encontrar):
❌ TAMANHO: Uma alternativa muito mais longa que outras → REESCREVA para igualar
❌ NEGAÇÃO ÚNICA: Apenas uma com "não/nunca/nenhum" → ADICIONE outra negação ou REMOVA
❌ AFIRMAÇÃO ÚNICA: Apenas uma positiva entre negativas → REBALANCEIE
❌ ABSOLUTO ÚNICO: Apenas uma com "sempre/todos/jamais" → EQUILIBRE
❌ ESPECIFICIDADE: Uma muito específica, outras genéricas → EQUILIBRE detalhamento
❌ "MAIS CRISTÃ": Uma claramente "mais religiosa" → TORNE TODAS igualmente teológicas

PASSO 3 - TESTE DO "CHUTE EDUCADO":
Pergunte: "Alguém SEM conhecimento do tema conseguiria eliminar alternativas?"
- Se SIM → as alternativas estão RUINS, REESCREVA
- Se NÃO → alternativas APROVADAS

PASSO 4 - VALIDAÇÃO FINAL:
- Confirme: todas as 4 alternativas têm TAMANHO SIMILAR (máx 5 palavras de diferença)
- Confirme: a resposta correta NÃO se destaca visualmente
- Confirme: distratores são SUTILMENTE errados, não obviamente errados

REGRAS ADICIONAIS:
- Use distratores inteligentes: respostas que poderiam parecer certas mas têm uma diferença sutil teológica
- Evite alternativas obviamente erradas ou absurdas
- As alternativas incorretas devem estar relacionadas ao tema e parecer razoáveis

REGRAS CRÍTICAS PARA FILL_BLANK COM VALIDAÇÃO PRÉ-GERAÇÃO OBRIGATÓRIA:

⚠️ PROCESSO DE 4 PASSOS - EXECUTE TODOS ANTES DE GERAR O JSON ⚠️

PASSO 1 - IDENTIFICAR CLASSE GRAMATICAL:
Analise a estrutura sintática da frase e identifique:
- VERBO INFINITIVO: após "para", "deve", "precisa", "quer" (ex: amar, salvar)
- VERBO CONJUGADO: como núcleo do predicado (ex: amou, salvou)
- SUBSTANTIVO: como sujeito, objeto ou predicativo (ex: amor, fé, graça)
- ADJETIVO: modificando substantivo (ex: santo, fiel)
- NOME PRÓPRIO: referindo pessoa ou lugar bíblico

PASSO 2 - LISTAR 6-8 CANDIDATOS:
Gere 6-8 palavras da MESMA classe gramatical identificada

PASSO 3 - VALIDAÇÃO INDIVIDUAL (CRÍTICO):
Para CADA candidato:
1. Substitua ___ pela palavra formando frase completa
2. Pergunte: "Esta frase está gramaticalmente CORRETA em português?"
3. Pergunte: "Esta frase faz sentido como afirmação (verdadeira ou falsa)?"
4. APENAS inclua candidatos onde AMBAS respostas são SIM

PASSO 4 - SELECIONAR 4 FINAIS:
- 1 resposta CORRETA + 3 distratores VÁLIDOS

EXEMPLOS DE VALIDAÇÃO CORRETA:
Frase: "Jesus morreu para ___ o pecador."
Classe identificada: VERBO INFINITIVO (após "para")
✅ salvar → "...para salvar o pecador" (correto)
✅ amar → "...para amar o pecador" (correto)
✅ redimir → "...para redimir o pecador" (correto)
❌ amor → "...para amor o pecador" (INVÁLIDO - substantivo após "para" + verbo)
❌ salvação → "...para salvação o pecador" (INVÁLIDO - falta artigo)

Frase: "O maior mandamento é ___ a Deus."
Classe identificada: VERBO INFINITIVO (predicativo verbal)
✅ amar → "...é amar a Deus" (correto)
✅ servir → "...é servir a Deus" (correto)
❌ amor → "...é amor a Deus" (INVÁLIDO - muda estrutura)
❌ amando → "...é amando a Deus" (INVÁLIDO - gerúndio inadequado)

NUNCA GERE ALTERNATIVAS SEM EXECUTAR ESTA VALIDAÇÃO!

⚠️ REGRAS OBRIGATÓRIAS PARA PERGUNTAS VERDADEIRO/FALSO - DIFICULDADE AVANÇADA ⚠️

As perguntas de V/F são frequentemente MUITO FÁCEIS. Siga estas regras:

SISTEMA DE AUTO-VALIDAÇÃO PARA VERDADEIRO/FALSO:

PASSO 1 - CRIAR AFIRMAÇÃO COMPLEXA:
- A afirmação deve misturar conceitos verdadeiros e falsos de forma sutil
- NÃO use afirmações obviamente verdadeiras ou obviamente falsas
- Use nuances teológicas que requerem conhecimento para distinguir

PASSO 2 - EVITAR PADRÕES ÓBVIOS:
❌ PALAVRAS ABSOLUTAS: "sempre", "nunca", "todos", "nenhum" são frequentemente FALSAS - evite
❌ AFIRMAÇÕES MUITO POSITIVAS: "Jesus nos ama" é obviamente VERDADEIRA - muito fácil
❌ AFIRMAÇÕES ABSURDAS: "Deus é mau" é obviamente FALSA - muito fácil

PASSO 3 - TESTE DO "CHUTE EDUCADO":
Pergunte: "Alguém que NÃO estudou conseguiria acertar só pelo senso comum?"
Se SIM → REESCREVA a afirmação
Se NÃO → APROVADA

PASSO 4 - TIPOS DE AFIRMAÇÕES DESAFIADORAS:
✅ INVERSÃO SUTIL: Troque um elemento que muda o significado
✅ MISTURA DE CONCEITOS: Combine conceitos de forma incorreta
✅ EXAGERO/REDUÇÃO: Amplifique ou minimize um conceito
✅ CONTEXTO ERRADO: Use afirmação verdadeira em contexto errado

EXEMPLOS:
❌ MUITO FÁCIL: "Jesus morreu para nos salvar" (obviamente VERDADEIRA)
✅ ADEQUADO: "A regeneração espiritual depende do esforço humano combinado com a graça" (FALSO)
✅ ADEQUADO: "O arrependimento deve preceder a fé para haver salvação" (FALSO - são simultâneos)`;

  const existingQuestionsText = existingQuestions.length > 0 
    ? `\n\nPERGUNTAS JA EXISTENTES (NAO repita estas, crie perguntas NOVAS e DIFERENTES):\n${existingQuestions.join('\n')}`
    : '';

  const userPrompt = `Crie 10 perguntas de pratica UNICAS sobre o tema: "${weekTitle}"
Descricao do tema: ${weekDescription}
${existingQuestionsText}

Retorne um JSON com a estrutura:
{
  "questions": [
    {
      "type": "multiple_choice",
      "content": {
        "question": "Pergunta diferente das existentes",
        "options": ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
        "correctIndex": 0-3 (VARIE a posicao! Nao coloque sempre em 1),
        "explanationCorrect": "Explicacao quando acertar",
        "explanationIncorrect": "Explicacao quando errar"
      }
    },
    {
      "type": "true_false",
      "content": {
        "statement": "Afirmacao para julgar",
        "isTrue": true ou false,
        "explanationCorrect": "Explicacao",
        "explanationIncorrect": "Explicacao"
      }
    },
    {
      "type": "fill_blank",
      "content": {
        "question": "Jesus morreu para ___ o pecador.",
        "correctAnswer": "salvar",
        "options": ["salvar", "amar", "libertar", "redimir"],
        "explanationCorrect": "Explicacao",
        "explanationIncorrect": "Explicacao"
      }
    }
  ]
}

REGRAS:
1. Crie exatamente 10 perguntas
2. Varie os tipos: 5 multiple_choice, 3 true_false, 2 fill_blank
3. Para multiple_choice: DISTRIBUA as respostas corretas entre A, B, C e D (nao coloque todas como B!)
4. As perguntas devem ser DIFERENTES das ja existentes
5. Foque no conteudo do tema: ${weekTitle}
6. Para fill_blank: INCLUA campo "options" com 4 alternativas da mesma classe gramatical que fazem sentido na frase!

Retorne APENAS o JSON, sem explicacoes adicionais.`;

  try {
    const content = await generateWithGemini(systemPrompt, userPrompt);
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    const parsed = safeJsonParse(content);
    const questions = parsed.questions || [];
    
    // Validate and clean each question, randomizing answer positions
    return questions.map((q: any) => {
      if (q.type === 'multiple_choice') {
        q.content = randomizeMultipleChoiceAnswer(q.content);
      }
      return validateAndCleanUnit({ ...q, xpValue: 5 }, q.type);
    }).slice(0, 10);
  } catch (error) {
    console.error("Erro ao gerar perguntas de pratica:", error);
    throw new Error(`Falha ao gerar perguntas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

export async function generateReflectionQuestions(text: string, count: number = 3): Promise<string[]> {
  const systemPrompt = `Voce e um lider de jovens cristao. Crie perguntas de reflexao profundas baseadas no texto.
Responda SEMPRE em JSON valido. NAO use markdown, apenas JSON puro.`;

  const userPrompt = `Baseado no seguinte texto, crie ${count} perguntas de reflexao para discussao em grupo:

${text}

Retorne um JSON: { "questions": ["pergunta1", "pergunta2", ...] }

As perguntas devem:
1. Promover autoavaliacao espiritual
2. Conectar o texto com a vida pratica
3. Ser abertas (sem resposta certa/errada)
4. Encorajar compartilhamento de experiencias

Retorne APENAS o JSON, sem explicacoes adicionais.`;

  try {
    const content = await generateWithGemini(systemPrompt, userPrompt);
    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    const parsed = safeJsonParse(content);
    return parsed.questions || [];
  } catch (error) {
    console.error("Erro ao gerar perguntas:", error);
    throw new Error(`Falha ao gerar perguntas: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

export async function summarizeText(text: string): Promise<string> {
  try {
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ 
          text: `Voce e um resumidor de textos cristao. Crie resumos claros e edificantes em portugues brasileiro.

Resuma o seguinte texto em 2-3 paragrafos, mantendo os pontos principais e a mensagem espiritual:

${text}` 
        }] 
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    return result.response.text() || "";
  } catch (error) {
    console.error("Erro ao resumir texto:", error);
    throw new Error(`Falha ao resumir: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
  }
}

export async function extractTextFromPDFContent(pdfText: string): Promise<string> {
  // Clean up the extracted PDF text
  return pdfText
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function generateStudyContentFromPDF(
  pdfText: string,
  weekNumber: number,
  year: number,
  geminiKey: string = "1",
  provider: AIProvider = "gemini",
  openaiKey: string = "1"
): Promise<GeneratedWeekContent> {
  // Clean the PDF text first
  const cleanedText = await extractTextFromPDFContent(pdfText);
  
  // Use the same generation function with selected provider and key
  return generateStudyContentFromText(cleanedText, weekNumber, year, geminiKey, provider, openaiKey);
}

function validateAndCleanUnit(unit: GeneratedUnit, type: GeneratedUnit["type"]): GeneratedUnit {
  return normalizeUnitContent({ ...unit, type });
}

function normalizeUnitContent(unit: GeneratedUnit): GeneratedUnit {
  const content = unit.content || {};
  
  switch (unit.type) {
    case "text":
      if (!content.body && content.text) {
        content.body = content.text;
      }
      if (!content.body) {
        content.body = "Conteudo nao disponivel";
      }
      if (!content.title) {
        content.title = "";
      }
      delete content.text;
      break;
      
    case "verse":
      if (!content.body && content.verseText) {
        content.body = content.verseText;
      }
      if (!content.body && content.text) {
        content.body = content.text;
      }
      if (!content.body) {
        content.body = "Versiculo nao disponivel";
      }
      if (!content.highlight && content.verseReference) {
        content.highlight = content.verseReference;
      }
      if (!content.title) {
        content.title = "Versiculo";
      }
      delete content.text;
      delete content.verseText;
      break;
      
    case "multiple_choice":
      if (!Array.isArray(content.options) || content.options.length === 0) {
        content.options = ["Opcao A", "Opcao B", "Opcao C", "Opcao D"];
      }
      content.options = content.options
        .map((opt: any) => String(opt || "").trim())
        .filter((opt: string) => opt !== "");
      if (content.options.length < 2) {
        content.options = ["Opcao A", "Opcao B", "Opcao C", "Opcao D"];
      }
      const optionCount = content.options.length;
      
      if (content.correctAnswer !== undefined && content.correctIndex === undefined) {
        let parsedIndex = 0;
        const answerValue = String(content.correctAnswer).trim().toUpperCase();
        if (/^[A-D]$/.test(answerValue)) {
          parsedIndex = answerValue.charCodeAt(0) - 'A'.charCodeAt(0);
        } else if (/^\d+$/.test(answerValue)) {
          const numValue = parseInt(answerValue, 10);
          parsedIndex = numValue >= 1 ? numValue - 1 : numValue;
        } else if (typeof content.correctAnswer === 'number') {
          const numValue = content.correctAnswer;
          parsedIndex = numValue >= 1 ? numValue - 1 : numValue;
        }
        if (isNaN(parsedIndex) || parsedIndex < 0) {
          parsedIndex = 0;
        }
        content.correctIndex = Math.min(parsedIndex, optionCount - 1);
      }
      if (content.correctIndex === undefined) {
        content.correctIndex = 0;
      }
      content.correctIndex = Math.max(0, Math.min(content.correctIndex, optionCount - 1));
      if (!content.question) {
        content.question = "Pergunta nao disponivel";
      }
      if (!content.explanationCorrect && content.explanation) {
        content.explanationCorrect = content.explanation;
        content.explanationIncorrect = content.explanation;
      }
      if (!content.explanationCorrect) {
        content.explanationCorrect = "Correto!";
      }
      if (!content.explanationIncorrect) {
        content.explanationIncorrect = "Incorreto. Tente novamente.";
      }
      delete content.correctAnswer;
      delete content.explanation;
      
      // Randomize the correct answer position for better variety
      const randomizedContent = randomizeMultipleChoiceAnswer(content);
      Object.assign(content, randomizedContent);
      break;
      
    case "true_false":
      if (content.question && !content.statement) {
        content.statement = content.question;
      }
      if (!content.statement) {
        content.statement = "Afirmacao nao disponivel";
      }
      if (content.isTrue === undefined) {
        if (content.correctAnswer !== undefined) {
          content.isTrue = content.correctAnswer === true || content.correctAnswer === "true";
        } else {
          content.isTrue = true;
        }
      }
      if (!content.explanationCorrect && content.explanation) {
        content.explanationCorrect = content.explanation;
        content.explanationIncorrect = content.explanation;
      }
      if (!content.explanationCorrect) {
        content.explanationCorrect = "Correto!";
      }
      if (!content.explanationIncorrect) {
        content.explanationIncorrect = "Incorreto. Tente novamente.";
      }
      delete content.question;
      delete content.correctAnswer;
      delete content.explanation;
      break;
      
    case "fill_blank":
      // Ensure we have a valid answer string
      const answerStr = content.correctAnswer ? String(content.correctAnswer).trim() : "";
      if (!answerStr) {
        content.correctAnswer = "palavra";
        console.warn("[AI Validation] fill_blank missing correctAnswer, using default");
      } else {
        content.correctAnswer = answerStr;
      }
      
      if (!content.question) {
        content.question = "";
      }
      
      // Remove common prefixes and check for meaningful context
      const cleanedQuestion = content.question
        .replace(/^complete:?\s*/gi, '')
        .replace(/^preencha:?\s*/gi, '')
        .replace(/^a resposta e:?\s*/gi, '')
        .trim();
      
      // Check if question has proper context:
      // - Must have more than just "___"
      // - Must have at least 15 characters of content (excluding blanks)
      // - Must contain at least one space (multiple words)
      const questionWithoutBlanks = cleanedQuestion.replace(/___/g, '').trim();
      const hasProperContext = 
        questionWithoutBlanks.length >= 15 && 
        questionWithoutBlanks.includes(' ') &&
        cleanedQuestion !== "___" &&
        cleanedQuestion !== "";
      
      if (!hasProperContext) {
        // Create a contextual fallback question with the answer hint
        const firstLetter = answerStr.charAt(0).toUpperCase();
        const answerLen = answerStr.length;
        const hint = answerLen > 3 ? `${firstLetter}${'_'.repeat(answerLen - 1)}` : `${firstLetter}...`;
        
        content.question = `Complete a frase com a palavra correta (${hint}): ___`;
        console.warn(`[AI Validation] fill_blank had insufficient context, created fallback question`);
      } else {
        content.question = cleanedQuestion;
      }
      
      // Ensure exactly one blank
      if (!content.question.includes("___")) {
        content.question = content.question.replace(/\s*$/, " ___");
      }
      const blankMatches = content.question.match(/___/g) || [];
      if (blankMatches.length > 1) {
        const firstBlankIndex = content.question.indexOf("___");
        const beforeBlank = content.question.substring(0, firstBlankIndex + 3);
        let afterBlank = content.question.substring(firstBlankIndex + 3);
        afterBlank = afterBlank.replace(/___/g, "...");
        content.question = beforeBlank + afterBlank;
      }
      
      // Set up explanations
      if (!content.explanationCorrect && content.explanation) {
        content.explanationCorrect = content.explanation;
        content.explanationIncorrect = content.explanation;
      }
      if (!content.explanationCorrect) {
        content.explanationCorrect = "Correto! Muito bem!";
      }
      if (!content.explanationIncorrect) {
        content.explanationIncorrect = `Incorreto. A resposta correta e: "${content.correctAnswer}".`;
      }
      delete content.explanation;
      
      // SHUFFLE OPTIONS: Randomize option positions so correct answer isn't always first
      if (content.options && Array.isArray(content.options) && content.options.length >= 2) {
        const { shuffledOptions } = shuffleFillBlankOptions(content.options, content.correctAnswer);
        content.options = shuffledOptions;
      }
      break;
      
    case "meditation":
      if (!content.body && content.meditationGuide) {
        content.body = content.meditationGuide;
      }
      if (!content.body && content.text) {
        content.body = content.text;
      }
      if (!content.body) {
        content.body = "Guia de meditacao nao disponivel";
      }
      if (!content.meditationDuration) {
        content.meditationDuration = 60;
      }
      if (!content.title) {
        content.title = "Meditacao";
      }
      delete content.text;
      delete content.meditationGuide;
      break;
      
    case "reflection":
      if (!content.body && content.reflectionPrompt) {
        content.body = content.reflectionPrompt;
      }
      if (!content.body && content.text) {
        content.body = content.text;
      }
      if (!content.body) {
        content.body = "Reflexao nao disponivel";
      }
      if (!content.title) {
        content.title = "Reflexao";
      }
      delete content.text;
      break;
  }
  
  unit.content = content;
  return unit;
}

function validateAndCleanContent(content: GeneratedWeekContent): GeneratedWeekContent {
  if (!content.weekTitle) {
    content.weekTitle = "Semana de Estudos";
  }
  if (!content.weekDescription) {
    content.weekDescription = "Conteudo semanal de estudos biblicos";
  }
  if (!content.lessons || !Array.isArray(content.lessons)) {
    content.lessons = [];
  }

  content.lessons = content.lessons.map((lesson, index) => {
    const validTypes = ["intro", "study", "meditation", "challenge", "review"];
    if (!validTypes.includes(lesson.type)) {
      lesson.type = "study";
    }
    if (!lesson.title) {
      lesson.title = `Licao ${index + 1}`;
    }
    if (!lesson.xpReward || lesson.xpReward < 1) {
      lesson.xpReward = 10;
    }
    if (!lesson.estimatedMinutes || lesson.estimatedMinutes < 1) {
      lesson.estimatedMinutes = 5;
    }
    if (!lesson.units || !Array.isArray(lesson.units)) {
      lesson.units = [];
    }

    lesson.units = lesson.units
      .map(unit => {
        const validUnitTypes = ["text", "multiple_choice", "true_false", "fill_blank", "meditation", "reflection", "verse"];
        if (!validUnitTypes.includes(unit.type)) {
          unit.type = "text";
        }
        if (!unit.content) {
          unit.content = { body: "Conteudo nao disponivel" };
        }
        if (!unit.xpValue || unit.xpValue < 1) {
          unit.xpValue = 2;
        }
        
        // Assign stage based on unit type if not already set
        if (!unit.stage) {
          if (unit.type === "text" || unit.type === "verse") {
            unit.stage = "estude";
          } else if (unit.type === "meditation" || unit.type === "reflection") {
            unit.stage = "medite";
          } else {
            unit.stage = "responda";
          }
        }
        
        return normalizeUnitContent(unit);
      })
      // FIRST: Filter out questions with invalid options BEFORE enforcing minimum
      .filter(unit => {
        if (unit.type === "multiple_choice" || unit.type === "fill_blank") {
          const content = unit.content || {};
          const options = content.options;
          
          // Check for valid options array with exactly 4 unique items
          if (!options || !Array.isArray(options) || options.length !== 4) {
            console.error(`[AI Validation] Removing ${unit.type} question without 4 options: "${content.question || 'no question'}"`);
            return false;
          }
          
          // Check for duplicates (case-insensitive)
          const uniqueOptions = new Set(options.map((o: string) => String(o).toLowerCase().trim()));
          if (uniqueOptions.size !== 4) {
            console.error(`[AI Validation] Removing ${unit.type} question with duplicate options: ${JSON.stringify(options)}`);
            return false;
          }
          
          // For multiple_choice, validate correctIndex is 0-3
          if (unit.type === "multiple_choice") {
            const correctIdx = content.correctIndex;
            if (typeof correctIdx !== 'number' || correctIdx < 0 || correctIdx > 3) {
              console.error(`[AI Validation] Removing multiple_choice question with invalid correctIndex: ${correctIdx}`);
              return false;
            }
          }
          
          // For fill_blank, validate correctAnswer is in options and has context
          if (unit.type === "fill_blank") {
            const correctStr = String(content.correctAnswer || "").toLowerCase().trim();
            const optionLower = options.map((o: string) => String(o).toLowerCase().trim());
            if (!optionLower.includes(correctStr)) {
              console.error(`[AI Validation] Removing fill_blank - correctAnswer "${content.correctAnswer}" not in options`);
              return false;
            }
            const question = content.question || "";
            const contentWithoutBlanks = question.replace(/___/g, '').trim();
            if (contentWithoutBlanks.length < 20) {
              console.warn(`[AI Validation] Removing contextless fill_blank: "${question}"`);
              return false;
            }
          }
        }
        return true;
      });
    
    // Validate minimum content requirements (AFTER filtering invalid questions)
    let estudeUnits = lesson.units.filter(u => u.stage === "estude");
    let mediteUnits = lesson.units.filter(u => u.stage === "medite" && 
      (u.type === "meditation" || u.type === "reflection"));
    let respondaUnits = lesson.units.filter(u => u.stage === "responda" && 
      (u.type === "multiple_choice" || u.type === "true_false" || u.type === "fill_blank"));
    
    // Enforce minimum 3 applications in medite section
    if (mediteUnits.length < 3) {
      console.warn(`[AI Validation] Lesson "${lesson.title}" has only ${mediteUnits.length} applications. Adding ${3 - mediteUnits.length} more.`);
      const applicationTemplates = [
        { title: "Aplicacao na Vida Diaria", body: "Como posso aplicar esse ensinamento hoje em minhas decisoes e relacionamentos?", reflectionPrompt: "Pense em uma situacao recente onde esse principio poderia ter guiado suas acoes." },
        { title: "Oracao de Compromisso", body: "Faca uma oracao pedindo a Deus sabedoria para viver esse ensinamento no seu cotidiano.", reflectionPrompt: "Dedique um momento para orar e se comprometer com essa verdade." },
        { title: "Pratica Semanal", body: "Escolha uma acao concreta para praticar esse ensinamento durante esta semana.", reflectionPrompt: "Qual sera sua acao pratica para viver esse principio?" }
      ];
      
      const maxOrderIndex = Math.max(...lesson.units.map(u => u.orderIndex || 0), 0);
      for (let i = mediteUnits.length; i < 3; i++) {
        const template = applicationTemplates[i % applicationTemplates.length];
        lesson.units.push({
          type: "reflection",
          stage: "medite",
          orderIndex: maxOrderIndex + i + 1,
          content: template,
          xpValue: 3
        });
      }
    }
    
    // Enforce minimum 5 questions in responda section
    if (respondaUnits.length < 5) {
      console.warn(`[AI Validation] Lesson "${lesson.title}" has only ${respondaUnits.length} questions. Adding ${5 - respondaUnits.length} more.`);
      
      // Function to create multiple choice with random correct index
      const createMultipleChoice = (question: string, options: string[], correctOptionIndex: number, explanationCorrect: string, explanationIncorrect: string) => {
        // Shuffle the options and track the new correct index
        const shuffledOptions = [...options];
        const correctAnswer = options[correctOptionIndex];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        const newCorrectIndex = shuffledOptions.indexOf(correctAnswer);
        
        return {
          question,
          options: shuffledOptions,
          correctIndex: newCorrectIndex,
          explanationCorrect,
          explanationIncorrect
        };
      };
      
      const questionTemplates: Array<{ type: GeneratedUnit["type"]; content: any }> = [
        { type: "true_false", content: { statement: "Este ensinamento nos ajuda a viver de forma mais alinhada com a vontade de Deus.", isTrue: true, explanationCorrect: "Correto! Os ensinamentos biblicos sempre nos guiam para a vontade de Deus.", explanationIncorrect: "A resposta correta e Verdadeiro. Os ensinamentos biblicos nos direcionam a Deus." } },
        { type: "true_false", content: { statement: "Os principios biblicos se aplicam somente a vida espiritual, nao afetando decisoes praticas do dia a dia.", isTrue: false, explanationCorrect: "Correto! Os principios biblicos se aplicam a toda nossa vida, incluindo decisoes praticas.", explanationIncorrect: "A resposta correta e Falso. A Biblia orienta todas as areas da nossa vida." } },
        { type: "multiple_choice", content: createMultipleChoice("Qual atitude reflete melhor a aplicacao deste ensinamento?", ["Refletir sobre o texto e buscar aplicacao pratica", "Compartilhar o texto com outros antes de aplicar", "Memorizar o texto para usar no futuro", "Estudar comentarios sobre o texto primeiro"], 0, "Isso mesmo! A reflexao e aplicacao pratica sao fundamentais.", "A resposta correta e refletir e aplicar. Embora outras opcoes sejam boas, a aplicacao pratica e essencial.") },
        { type: "true_false", content: { statement: "A meditacao na Palavra de Deus requer um ambiente perfeito e silencioso para ser eficaz.", isTrue: false, explanationCorrect: "Correto! Podemos meditar na Palavra em qualquer lugar, mesmo em ambientes imperfeitos.", explanationIncorrect: "A resposta correta e Falso. A meditacao biblica nao depende de condicoes perfeitas." } },
        { type: "multiple_choice", content: createMultipleChoice("Como a fe biblica se relaciona com os desafios diarios?", ["A fe nos fortalece para enfrentar dificuldades com esperanca", "A fe nos livra de todos os problemas automaticamente", "A fe e apenas para momentos de culto e oracao", "A fe substitui a necessidade de agir praticamente"], 0, "Correto! A fe nos fortalece, mas nao nos isenta dos desafios.", "A resposta correta e que a fe nos fortalece para enfrentar dificuldades com esperanca.") }
      ];
      
      const maxOrderIndex = Math.max(...lesson.units.map(u => u.orderIndex || 0), 0);
      for (let i = respondaUnits.length; i < 5; i++) {
        const template = questionTemplates[i % questionTemplates.length];
        // Create a fresh copy of the template to ensure each question has randomized options
        let content = template.content;
        if (template.type === "multiple_choice") {
          // Re-randomize for each added question
          const mc = template.content as any;
          content = createMultipleChoice(mc.question, mc.options, mc.correctIndex, mc.explanationCorrect, mc.explanationIncorrect);
        }
        lesson.units.push({
          type: template.type,
          stage: "responda",
          orderIndex: maxOrderIndex + 10 + i,
          content,
          xpValue: 5
        });
      }
    }
    
    // Log final validation status
    if (estudeUnits.length < 6) {
      console.warn(`[AI Validation] Lesson "${lesson.title}" has only ${estudeUnits.length} study screens (minimum 6 required)`);
    }

    return lesson;
  });

  return content;
}

export function isAIConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function generateDailyVerseWithAI(): Promise<{ verse: string; reference: string } | null> {
  const { getDailyVerse } = await import("./bible-api.js");
  
  try {
    const bibleApiResult = await getDailyVerse();
    if (bibleApiResult) {
      console.log("[BibleAPI] Daily verse fetched successfully from ABíbliaDigital");
      return bibleApiResult;
    }
  } catch (error) {
    console.warn("[BibleAPI] Failed to fetch daily verse, falling back to Gemini:", error);
  }

  if (!isAIConfigured()) {
    console.log("[AI] Gemini not configured and Bible API failed");
    return null;
  }

  try {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    
    const prompt = `Você é um pastor experiente. Selecione um versículo bíblico inspirador e edificante para o dia de hoje (dia ${dayOfYear} do ano).

Critérios:
- Deve ser um versículo real da Bíblia na versão ARA (Almeida Revista e Atualizada)
- Deve trazer esperança, encorajamento ou sabedoria
- Pode ser do Antigo ou Novo Testamento
- Varie entre diferentes livros da Bíblia
- Use APENAS texto da versão ARA

Responda APENAS em formato JSON:
{
  "verse": "Texto completo do versículo na versão ARA",
  "reference": "Livro Capítulo:Versículo (ARA)"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI] Could not extract JSON from daily verse response");
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      verse: parsed.verse,
      reference: parsed.reference
    };
  } catch (error) {
    console.error("[AI] Error generating daily verse:", error);
    return null;
  }
}

// Local fallback recovery verses to avoid API calls when quota is low
const LOCAL_RECOVERY_VERSES = [
  { verse: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.", reference: "Isaías 41:10 (ARA)", reflection: "Deus está sempre conosco, mesmo nos momentos mais difíceis." },
  { verse: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", reference: "Mateus 11:28 (ARA)", reflection: "Jesus oferece descanso para nossa alma cansada." },
  { verse: "Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.", reference: "1 Pedro 5:7 (ARA)", reflection: "Podemos entregar nossas preocupações a Deus, pois Ele cuida de nós." },
  { verse: "Mas os que esperam no Senhor renovarão as suas forças; subirão com asas como águias; correrão e não se cansarão; caminharão e não se fatigarão.", reference: "Isaías 40:31 (ARA)", reflection: "A espera em Deus renova nossas forças espirituais." },
  { verse: "O Senhor é o meu pastor; nada me faltará.", reference: "Salmos 23:1 (ARA)", reflection: "Com Deus como nosso guia, nada nos faltará." },
];

export async function generateRecoveryVersesWithAI(count: number = 5): Promise<Array<{ verse: string; reference: string; reflection: string }> | null> {
  const { getRecoveryVerses } = await import("./bible-api.js");
  
  // First try Bible API (no AI cost)
  try {
    const bibleApiResult = await getRecoveryVerses(count);
    if (bibleApiResult && bibleApiResult.length > 0) {
      console.log(`[BibleAPI] ${bibleApiResult.length} recovery verses fetched successfully from ABíbliaDigital`);
      return bibleApiResult;
    }
  } catch (error) {
    console.warn("[BibleAPI] Failed to fetch recovery verses from API");
  }

  // Try AI generation if configured and quota likely available
  // This is a LOW-PRIORITY task, so we skip AI if quota was recently exhausted
  if (isAIConfigured() && isQuotaLikelyAvailable()) {
    try {
      const prompt = `Gere ${count} versículos bíblicos de conforto (versão ARA) com reflexões breves. JSON: {"verses":[{"verse":"texto","reference":"Livro X:Y (ARA)","reflection":"reflexão"}]}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.verses && parsed.verses.length > 0) {
          console.log("[Recovery Verses] Successfully generated with AI");
          return parsed.verses;
        }
      }
    } catch (error: any) {
      if (isQuotaError(error)) {
        markQuotaExhausted();
        console.log("[Recovery Verses] AI quota exceeded, using local fallback");
      } else {
        console.error("[Recovery Verses] AI error:", error?.message);
      }
    }
  } else if (!isQuotaLikelyAvailable()) {
    console.log("[Recovery Verses] Skipping AI (quota cooldown), using local fallback");
  }

  // Fallback to local verses
  const shuffled = [...LOCAL_RECOVERY_VERSES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// ==================== LARGE FALLBACK DATABASE FOR DAILY MISSIONS ====================

// 100+ Bible quiz questions for fallback
const FALLBACK_QUIZ_QUESTIONS = [
  { question: "Quantos livros tem a Bíblia?", options: ["66", "72", "39", "27"], correctIndex: 0 },
  { question: "Quem escreveu Provérbios?", options: ["Moisés", "Salomão", "Davi", "Paulo"], correctIndex: 1 },
  { question: "Quem foi lançado na cova dos leões?", options: ["José", "Daniel", "Jonas", "Elias"], correctIndex: 1 },
  { question: "Qual livro vem depois de Gênesis?", options: ["Números", "Êxodo", "Levítico", "Deuteronômio"], correctIndex: 1 },
  { question: "Quantos discípulos Jesus tinha?", options: ["10", "11", "12", "13"], correctIndex: 2 },
  { question: "Quem batizou Jesus?", options: ["Pedro", "João Batista", "Tiago", "André"], correctIndex: 1 },
  { question: "Qual foi o primeiro milagre de Jesus?", options: ["Ressuscitar Lázaro", "Multiplicar pães", "Transformar água em vinho", "Curar um cego"], correctIndex: 2 },
  { question: "Quantos dias durou o dilúvio?", options: ["7 dias", "40 dias", "100 dias", "1 ano"], correctIndex: 1 },
  { question: "Quem construiu a arca?", options: ["Abraão", "Noé", "Moisés", "Jacó"], correctIndex: 1 },
  { question: "Qual o nome do gigante derrotado por Davi?", options: ["Sansão", "Golias", "Saul", "Absalão"], correctIndex: 1 },
  { question: "Quem negou Jesus três vezes?", options: ["Judas", "Tomé", "Pedro", "João"], correctIndex: 2 },
  { question: "Em que cidade Jesus nasceu?", options: ["Nazaré", "Jerusalém", "Belém", "Cafarnaum"], correctIndex: 2 },
  { question: "Quantos livros tem o Novo Testamento?", options: ["27", "39", "22", "31"], correctIndex: 0 },
  { question: "Quem foi o primeiro rei de Israel?", options: ["Davi", "Salomão", "Saul", "Samuel"], correctIndex: 2 },
  { question: "Qual profeta foi engolido por um peixe?", options: ["Elias", "Eliseu", "Jonas", "Amós"], correctIndex: 2 },
  { question: "Quantos mandamentos Deus deu a Moisés?", options: ["5", "7", "10", "12"], correctIndex: 2 },
  { question: "Quem foi vendido como escravo pelos irmãos?", options: ["Benjamim", "José", "Judá", "Rúben"], correctIndex: 1 },
  { question: "Qual era a profissão de Jesus?", options: ["Pescador", "Carpinteiro", "Pastor", "Agricultor"], correctIndex: 1 },
  { question: "Quem escreveu a maior parte das cartas do NT?", options: ["Pedro", "João", "Paulo", "Tiago"], correctIndex: 2 },
  { question: "Qual o último livro da Bíblia?", options: ["Judas", "Apocalipse", "3 João", "Malaquias"], correctIndex: 1 },
  { question: "Quem foi o pai de Salomão?", options: ["Saul", "Davi", "Samuel", "Abraão"], correctIndex: 1 },
  { question: "Qual o menor livro da Bíblia?", options: ["Obadias", "Filemom", "2 João", "3 João"], correctIndex: 2 },
  { question: "Quem foi levado ao céu num redemoinho?", options: ["Moisés", "Elias", "Enoque", "Eliseu"], correctIndex: 1 },
  { question: "Quantas pragas Deus enviou ao Egito?", options: ["7", "10", "12", "15"], correctIndex: 1 },
  { question: "Quem foi a esposa de Abraão?", options: ["Rebeca", "Raquel", "Sara", "Lia"], correctIndex: 2 },
  { question: "Qual apóstolo era cobrador de impostos?", options: ["Pedro", "Mateus", "Judas", "Simão"], correctIndex: 1 },
  { question: "Quem interpretou os sonhos de Faraó?", options: ["Moisés", "José", "Daniel", "Elias"], correctIndex: 1 },
  { question: "Qual livro contém os Salmos?", options: ["Provérbios", "Eclesiastes", "Salmos", "Cantares"], correctIndex: 2 },
  { question: "Quem escreveu o Apocalipse?", options: ["Paulo", "Pedro", "João", "Tiago"], correctIndex: 2 },
  { question: "Quantos anos Jesus viveu na terra?", options: ["30", "33", "35", "40"], correctIndex: 1 },
  { question: "Qual o monte onde Moisés recebeu os mandamentos?", options: ["Carmelo", "Sinai", "Horebe", "Sião"], correctIndex: 1 },
  { question: "Quem foi o sucessor de Moisés?", options: ["Calebe", "Josué", "Arão", "Eleazar"], correctIndex: 1 },
  { question: "Qual cidade Josué conquistou primeiro?", options: ["Ai", "Jericó", "Jerusalém", "Hebrom"], correctIndex: 1 },
  { question: "Quem foi o juiz mais forte de Israel?", options: ["Gideão", "Sansão", "Jefté", "Samuel"], correctIndex: 1 },
  { question: "Quantos filhos Jacó teve?", options: ["10", "12", "14", "7"], correctIndex: 1 },
  { question: "Qual o nome do filho prometido de Abraão?", options: ["Ismael", "Isaque", "Jacó", "Esaú"], correctIndex: 1 },
  { question: "Quem foi o profeta do fogo do céu no Carmelo?", options: ["Eliseu", "Elias", "Isaías", "Jeremias"], correctIndex: 1 },
  { question: "Qual mulher foi juíza em Israel?", options: ["Rute", "Débora", "Ester", "Raabe"], correctIndex: 1 },
  { question: "Quem foi o discípulo que duvidou da ressurreição?", options: ["Pedro", "João", "Tomé", "Filipe"], correctIndex: 2 },
  { question: "Qual era o nome hebraico de Paulo?", options: ["Silas", "Saulo", "Barnabé", "Timóteo"], correctIndex: 1 },
  { question: "Em que rio Jesus foi batizado?", options: ["Nilo", "Eufrates", "Jordão", "Tigre"], correctIndex: 2 },
  { question: "Quem foi o primeiro mártir cristão?", options: ["Tiago", "Estêvão", "Pedro", "Paulo"], correctIndex: 1 },
  { question: "Quantos pães Jesus multiplicou?", options: ["3", "5", "7", "12"], correctIndex: 1 },
  { question: "Qual animal falou com Balaão?", options: ["Camelo", "Jumento", "Cavalo", "Boi"], correctIndex: 1 },
  { question: "Quem foi o pai de João Batista?", options: ["José", "Zacarias", "Simeão", "Zebedeu"], correctIndex: 1 },
  { question: "Qual rei construiu o primeiro templo?", options: ["Davi", "Salomão", "Ezequias", "Josias"], correctIndex: 1 },
  { question: "Quantos anos os israelitas vagaram no deserto?", options: ["20", "30", "40", "50"], correctIndex: 2 },
  { question: "Quem foi a mãe de Samuel?", options: ["Ana", "Penina", "Rute", "Noemi"], correctIndex: 0 },
  { question: "Qual profeta foi chamado ainda criança?", options: ["Jeremias", "Samuel", "Isaías", "Eliseu"], correctIndex: 1 },
  { question: "Quem foi transformada em estátua de sal?", options: ["Mulher de Ló", "Sara", "Rebeca", "Raquel"], correctIndex: 0 },
];

// 50+ Bible curiosities for fallback
const FALLBACK_BIBLE_FACTS = [
  { fact: "A Bíblia foi escrita por aproximadamente 40 autores diferentes ao longo de 1.500 anos.", category: "história" },
  { fact: "O livro de Ester é o único livro da Bíblia que não menciona o nome de Deus.", category: "curiosidade" },
  { fact: "O versículo mais curto da Bíblia em português é 'Jesus chorou' (João 11:35).", category: "curiosidade" },
  { fact: "O Salmo 119 é o capítulo mais longo da Bíblia, com 176 versículos.", category: "números" },
  { fact: "A palavra 'Bíblia' vem do grego 'biblion' que significa 'livros'.", category: "etimologia" },
  { fact: "Matusalém é a pessoa mais velha mencionada na Bíblia, vivendo 969 anos.", category: "personagens" },
  { fact: "O livro de Jó é considerado o mais antigo da Bíblia.", category: "história" },
  { fact: "A Bíblia foi o primeiro livro impresso por Gutenberg em 1455.", category: "história" },
  { fact: "O Antigo Testamento foi escrito principalmente em hebraico e o Novo em grego.", category: "idiomas" },
  { fact: "Jesus citou o livro de Deuteronômio mais do que qualquer outro livro.", category: "Jesus" },
  { fact: "O apóstolo Paulo escreveu 13 das 27 cartas do Novo Testamento.", category: "autores" },
  { fact: "A palavra 'amor' aparece mais de 300 vezes na Bíblia.", category: "palavras" },
  { fact: "O Monte das Oliveiras é mencionado mais de 12 vezes na Bíblia.", category: "lugares" },
  { fact: "Noé tinha 600 anos quando começou o dilúvio.", category: "personagens" },
  { fact: "A arca de Noé tinha aproximadamente 137 metros de comprimento.", category: "números" },
  { fact: "O nome 'Jesus' significa 'o Senhor salva' em hebraico.", category: "etimologia" },
  { fact: "O livro de Apocalipse contém 404 versículos e 22 capítulos.", category: "números" },
  { fact: "Davi foi ungido rei três vezes diferentes.", category: "personagens" },
  { fact: "A rainha de Sabá viajou mais de 1.500 km para ver Salomão.", category: "viagens" },
  { fact: "O profeta Isaías é citado mais de 60 vezes no Novo Testamento.", category: "profetas" },
  { fact: "Pedro é mencionado mais vezes que qualquer outro apóstolo nos Evangelhos.", category: "personagens" },
  { fact: "Jesus jejuou 40 dias no deserto antes de iniciar seu ministério.", category: "Jesus" },
  { fact: "O templo de Salomão levou 7 anos para ser construído.", category: "construções" },
  { fact: "A palavra 'aleluia' aparece 24 vezes na Bíblia.", category: "palavras" },
  { fact: "Abraão tinha 100 anos quando Isaque nasceu.", category: "personagens" },
  { fact: "O livro de Provérbios contém 31 capítulos, um para cada dia do mês.", category: "números" },
  { fact: "Moisés liderou aproximadamente 2 milhões de israelitas no êxodo.", category: "números" },
  { fact: "O Jordão é o rio mais mencionado na Bíblia, aparecendo 175 vezes.", category: "lugares" },
  { fact: "Daniel sobreviveu na cova dos leões quando tinha aproximadamente 80 anos.", category: "personagens" },
  { fact: "A última palavra de Jesus na cruz foi 'Está consumado' (João 19:30).", category: "Jesus" },
];

// Large fallback mission templates
const FALLBACK_MISSION_TEMPLATES = [
  { title: "Leitura Matinal", description: "Leia um capítulo do livro de Provérbios", xpReward: 10, type: "easy" },
  { title: "Oração Intercessória", description: "Ore por 5 pessoas diferentes da sua comunidade", xpReward: 25, type: "medium" },
  { title: "Estudo Bíblico", description: "Faça um estudo aprofundado sobre um versículo", xpReward: 50, type: "hard" },
  { title: "Versículo do Dia", description: "Memorize um versículo bíblico e medite nele", xpReward: 10, type: "easy" },
  { title: "Ato de Bondade", description: "Pratique um ato de bondade com alguém hoje", xpReward: 25, type: "medium" },
  { title: "Jejum e Oração", description: "Faça um jejum parcial e dedique o tempo à oração", xpReward: 50, type: "hard" },
  { title: "Gratidão", description: "Escreva 3 coisas pelas quais você é grato hoje", xpReward: 10, type: "easy" },
  { title: "Compartilhar a Fé", description: "Compartilhe uma mensagem de encorajamento", xpReward: 25, type: "medium" },
  { title: "Servir ao Próximo", description: "Ajude alguém necessitado de forma prática", xpReward: 50, type: "hard" },
  { title: "Louvor Matinal", description: "Comece o dia ouvindo ou cantando um hino", xpReward: 10, type: "easy" },
  { title: "Leitura dos Salmos", description: "Leia 3 Salmos e reflita sobre eles", xpReward: 25, type: "medium" },
  { title: "Ensino Bíblico", description: "Ensine um princípio bíblico a alguém", xpReward: 50, type: "hard" },
  { title: "Oração em Família", description: "Faça uma oração com sua família", xpReward: 10, type: "easy" },
  { title: "Visitação", description: "Visite ou ligue para alguém que precisa de apoio", xpReward: 25, type: "medium" },
  { title: "Evangelismo", description: "Compartilhe o evangelho com uma pessoa", xpReward: 50, type: "hard" },
  { title: "Momento de Silêncio", description: "Dedique 10 minutos em silêncio com Deus", xpReward: 10, type: "easy" },
  { title: "Perdão", description: "Perdoe alguém que te magoou e ore por essa pessoa", xpReward: 25, type: "medium" },
  { title: "Confissão", description: "Faça uma reflexão honesta sobre seus pecados e confesse a Deus", xpReward: 50, type: "hard" },
];

export interface DailyMissionContent {
  missions: Array<{ title: string; description: string; xpReward: number; type: string }>;
  quizQuestions: Array<{ question: string; options: string[]; correctIndex: number }>;
  bibleFact: { fact: string; category: string };
  verseOfDay: { verse: string; reference: string };
}

export async function generateDailyMissionsWithAI(): Promise<Array<{ title: string; description: string; xpReward: number; type: string }> | null> {
  if (isAIConfigured() && isQuotaLikelyAvailable()) {
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayName = dayNames[new Date().getDay()];
    const dateStr = new Date().toISOString().split('T')[0];
    
    const systemPrompt = "Você é um educador cristão criativo especializado em missões espirituais.";
    const userPrompt = `Crie 3 missões espirituais ÚNICAS e VARIADAS para ${dayName} (${dateStr}).

REGRAS IMPORTANTES:
- As missões devem ser DIFERENTES a cada dia
- Use temas variados: oração, leitura bíblica, serviço, evangelismo, gratidão, louvor, jejum, meditação, comunhão
- Seja específico e criativo nos títulos e descrições
- Adapte ao dia da semana (domingo = culto, sábado = família, etc)

Formato JSON obrigatório:
{
  "missions": [
    {"title": "título curto", "description": "descrição detalhada da missão", "xpReward": 10, "type": "easy"},
    {"title": "título curto", "description": "descrição detalhada da missão", "xpReward": 25, "type": "medium"},
    {"title": "título curto", "description": "descrição detalhada da missão", "xpReward": 50, "type": "hard"}
  ]
}`;
    
    // Try each Gemini key (1-5) with model fallback
    for (let keyNum = 1; keyNum <= 5; keyNum++) {
      try {
        const text = await generateWithGemini(systemPrompt, userPrompt, keyNum.toString());
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.missions && parsed.missions.length >= 3) {
            console.log(`[Daily Missions] Successfully generated with AI (key ${keyNum})`);
            return parsed.missions;
          }
        }
      } catch (error: any) {
        if (isQuotaError(error)) {
          console.log(`[Daily Missions] Key ${keyNum} quota exceeded, trying next...`);
          continue;
        } else {
          console.error(`[Daily Missions] Key ${keyNum} error:`, error?.message);
        }
      }
    }
    
    markQuotaExhausted();
    console.log("[Daily Missions] All keys exhausted, using local fallback");
  } else if (!isQuotaLikelyAvailable()) {
    console.log("[Daily Missions] Skipping AI (quota cooldown), using local fallback");
  }

  // Fallback: select 3 random missions (easy, medium, hard)
  const shuffled = [...FALLBACK_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
  const easy = shuffled.find(m => m.type === "easy") || FALLBACK_MISSION_TEMPLATES[0];
  const medium = shuffled.find(m => m.type === "medium") || FALLBACK_MISSION_TEMPLATES[1];
  const hard = shuffled.find(m => m.type === "hard") || FALLBACK_MISSION_TEMPLATES[2];
  return [easy, medium, hard];
}

export async function generateQuizQuestionsWithAI(count: number = 5): Promise<Array<{ question: string; options: string[]; correctIndex: number }> | null> {
  if (!isAIConfigured()) {
    console.log("[Quiz Questions] AI not configured, cannot generate");
    return null;
  }
  
  const dateStr = new Date().toISOString().split('T')[0];
  const randomSeed = Math.floor(Math.random() * 1000);
  
  const systemPrompt = "Você é um especialista em estudos bíblicos e criador de quizzes.";
  const userPrompt = `Gere ${count} perguntas de quiz ÚNICAS e VARIADAS sobre a Bíblia.

REGRAS IMPORTANTES:
- Data atual: ${dateStr} - as perguntas devem ser ÚNICAS para esta data
- Use o seed ${randomSeed} para garantir máxima variedade
- As perguntas devem cobrir diferentes livros, personagens, eventos e temas bíblicos
- Varie entre Antigo e Novo Testamento equilibradamente
- Inclua perguntas sobre: personagens, lugares, números, eventos, profecias, parábolas, genealogias
- Evite perguntas muito fáceis ou repetitivas (não apenas "quem construiu a arca")
- Cada pergunta deve ter exatamente 4 opções
- A resposta correta NÃO deve ser sempre a opção 0 - varie o correctIndex

Formato JSON (OBRIGATÓRIO):
{
  "questions": [
    {"question": "pergunta completa?", "options": ["opção1", "opção2", "opção3", "opção4"], "correctIndex": 0}
  ]
}`;
  
  // Try each key (1-5) - generateWithGemini handles model fallback internally (gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-lite)
  for (let keyNum = 1; keyNum <= 5; keyNum++) {
    try {
      console.log(`[Quiz Questions] Trying key ${keyNum} (all models: gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-lite)...`);
      const text = await generateWithGemini(systemPrompt, userPrompt, keyNum.toString());
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && parsed.questions.length >= count) {
          console.log(`[Quiz Questions] Successfully generated ${parsed.questions.length} questions (key ${keyNum})`);
          return parsed.questions.slice(0, count);
        }
      }
      console.log(`[Quiz Questions] Key ${keyNum} returned invalid format, trying next key...`);
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.log(`[Quiz Questions] Key ${keyNum} quota exceeded, trying next key...`);
        continue;
      } else {
        console.error(`[Quiz Questions] Key ${keyNum} error:`, error?.message);
        // For non-quota errors, try next key
        continue;
      }
    }
  }
  
  console.error("[Quiz Questions] FAILED - All keys exhausted, returning null (NO FALLBACK)");
  return null;
}

export async function generateBibleFactWithAI(): Promise<{ fact: string; category: string }> {
  if (isAIConfigured() && isQuotaLikelyAvailable()) {
    const dateStr = new Date().toISOString().split('T')[0];
    const randomSeed = Math.floor(Math.random() * 1000);
    
    const systemPrompt = "Você é um historiador bíblico especializado.";
    const userPrompt = `Gere UMA curiosidade bíblica interessante e educativa.

REGRAS:
- A curiosidade deve ser ÚNICA e pouco conhecida
- Pode ser sobre: arqueologia, história, cultura, linguagem, geografia, personagens
- Deve ser precisa e baseada em fatos
- Use seed ${randomSeed} para variedade (data: ${dateStr})

Formato JSON:
{
  "fact": "curiosidade interessante sobre a Bíblia",
  "category": "categoria (história/arqueologia/cultura/personagens/lugares/números)"
}`;
    
    // Try each Gemini key (1-5) with model fallback
    for (let keyNum = 1; keyNum <= 5; keyNum++) {
      try {
        const text = await generateWithGemini(systemPrompt, userPrompt, keyNum.toString());
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.fact) {
            console.log(`[Bible Fact] Successfully generated with AI (key ${keyNum})`);
            return parsed;
          }
        }
      } catch (error: any) {
        if (isQuotaError(error)) {
          console.log(`[Bible Fact] Key ${keyNum} quota exceeded, trying next...`);
          continue;
        } else {
          console.error(`[Bible Fact] Key ${keyNum} error:`, error?.message);
        }
      }
    }
    
    markQuotaExhausted();
    console.log("[Bible Fact] All keys exhausted, using local fallback");
  }

  // Fallback: select random fact from pool
  const randomIndex = Math.floor(Math.random() * FALLBACK_BIBLE_FACTS.length);
  return FALLBACK_BIBLE_FACTS[randomIndex];
}

export { FALLBACK_QUIZ_QUESTIONS, FALLBACK_BIBLE_FACTS };

export interface ExtractedLessonFromPDF {
  title: string;
  baseVerse: string;
  baseVerseReference: string;
  topics: Array<{
    title: string;
    summary: string;
    originalContent: string;
  }>;
  studyContent: GeneratedUnit[];
  meditationContent: GeneratedUnit[];
  questions: GeneratedUnit[];
}

export async function generateLessonFromPDFExact(
  pdfText: string,
  _geminiKey: string = "1", // Ignored - automatic key rotation is used
  provider: AIProvider = "gemini",
  openaiKey: string = "1"
): Promise<ExtractedLessonFromPDF> {
  const systemPrompt = `🔴🔴🔴 PROMPT DE SISTEMA PRIORITÁRIO: GERADOR DE AVALIAÇÃO TEOLÓGICA (NÍVEL AVANÇADO) 🔴🔴🔴

CONTEXTO:
Tu és um especialista em currículo cristão e teologia para a plataforma DeoGlory. O teu objetivo é criar avaliações que testem a leitura atenta e compreensão profunda do texto fornecido.

🔴 REGRA DE OURO (ANTI-CHUTE) - PRIORIDADE MÁXIMA:
O utilizador (aluno) é um cristão habituado à linguagem de igreja. Se ele conseguir responder sem ler o texto, a questão FALHOU. As perguntas devem ser IMPOSSÍVEIS de responder apenas com "conhecimento bíblico geral". Devem exigir o argumento ESPECÍFICO do autor.

DIRETRIZES PARA MÚLTIPLA ESCOLHA:
1. O ENUNCIADO: Deve focar num conceito específico, definição ou argumento lógico apresentado pelo autor. Evita perguntas de factos triviais (ex: "quem escreveu o livro?").
2. A RESPOSTA CORRETA: Deve ser a síntese exata do pensamento do autor.
3. OS DISTRATORES (Alternativas Erradas) - ESTA É A PARTE MAIS IMPORTANTE:
   - Devem parecer teologicamente corretos ou "piedosos" à primeira vista
   - Devem usar vocabulário bíblico
   - Devem representar conceitos populares (senso comum evangélico) que o texto NÃO abordou ou, melhor ainda, que o texto REFUTOU/CORRIGIU
   - Exemplo: Se o texto diz que "o trabalho é para servir o próximo", um distrator deve ser "o trabalho é para alcançar prosperidade como prova da bênção de Deus" (soa a algo que alguns crentes diriam, mas está ERRADO no contexto)

DIRETRIZES PARA VERDADEIRO OU FALSO:
1. NÃO cries afirmações obviamente falsas (ex: "Deus não existe"). Isso é demasiado fácil.
2. Cria uma "ARMADILHA DE NUANCE": A afirmação deve parecer verdadeira na primeira metade, mas conter um erro subtil no final, OU deve ser uma afirmação popular que o autor desconstruiu no texto.
3. Objetivo: O aluno deve parar, pensar e lembrar-se: "Espera, o pastor disse isso mesmo ou disse o contrário?".

⚠️ PENEIRA OBRIGATÓRIA DE QUESTÕES ⚠️
Antes de gerar a resposta final, avalie CADA questão com estas perguntas:
1. Um cristão experiente conseguiria responder SEM ler o texto? Se SIM → DESCARTE e crie outra
2. As alternativas erradas parecem "piedosas" e bíblicas? Se NÃO → REESCREVA os distratores
3. A questão exige o argumento ESPECÍFICO do autor? Se NÃO → REFORMULE

📚 EXEMPLOS DE QUESTÕES BEM ELABORADAS (USE COMO REFERÊNCIA):

EXEMPLO 1 - Múltipla Escolha:
Enunciado: O texto aborda a definição de atividades "seculares" (como o emprego ou a universidade). Segundo a definição técnica apresentada pelo autor, o que torna uma atividade "secular"?
A) É uma atividade onde Deus está presente apenas pela graça comum, e não pela graça salvadora, diferenciando-se do ministério eclesiástico.
B) São atividades que não se relacionam com o "sagrado", focando-se apenas nas necessidades temporais e materiais da vida humana.
C) São atividades que, embora façam parte da vida cristã, não estão estruturalmente ligadas à organização da igreja. ✅ CORRETA
D) É o campo de atuação onde o cristão deve buscar sustento financeiro para, posteriormente, financiar a verdadeira obra missionária da igreja.
POR QUE FUNCIONA: A e D são conceitos comuns em muitas igrejas ("graça comum" ou "trabalhar para sustentar a obra"), mas o texto define secular estritamente como "atividades não estruturalmente ligadas à igreja". B é a ARMADILHA - o texto diz que algumas pessoas chamam de secular querendo dizer "não se relacionam com o sagrado", mas o autor CORRIGE essa visão. Quem não leu vai marcar B.

EXEMPLO 2 - Múltipla Escolha:
Enunciado: Ao discutir como engrandecer a Deus através da criatividade no trabalho, o autor faz uma distinção entre o trabalho de Deus e o trabalho humano. Qual é essa distinção específica?
A) Deus cria para Sua própria glória, enquanto o homem deve trabalhar para servir ao próximo e suprir as necessidades da sociedade.
B) Deus cria do nada (ex nihilo), enquanto o trabalho humano, como imagem de Deus, é tomar o que já foi feito e dar-lhe forma e ordem. ✅ CORRETA
C) O trabalho de Deus é perfeito e espiritual, enquanto o trabalho humano é falho e afetado pela queda, exigindo redenção constante.
D) Deus descansou no sétimo dia, estabelecendo um padrão para que o homem não faça do seu trabalho um ídolo ou fonte primária de satisfação.
POR QUE FUNCIONA: A, C e D são todas verdades teológicas aceitas no meio cristão. No entanto, o texto usa ESPECIFICAMENTE o argumento da criação ex nihilo versus "dar forma e ordem" para explicar a nossa criatividade no trabalho.

EXEMPLO 3 - Múltipla Escolha:
Enunciado: O autor critica uma motivação comum para o trabalho, classificando-a como "desperdício de vida" se pararmos nela. Que motivação é essa?
A) Trabalhar arduamente para alcançar posições de liderança e influenciar a cultura corporativa com valores cristãos.
B) Trabalhar com o objetivo principal de prover segurança e conforto para a própria família ("fazer o pé de meia"). ✅ CORRETA
C) Trabalhar focando apenas na excelência técnica, esquecendo-se de evangelizar verbalmente os colegas de trabalho.
D) Trabalhar motivado pelo medo da escassez ou pela ansiedade quanto ao futuro, em vez de confiar na provisão do Pai.
POR QUE FUNCIONA: A, C e D são críticas válidas em outros contextos. Porém, o texto ataca diretamente a ideia de trabalhar apenas para "prover para nossas necessidades e de nossa família" ou "fazer o pé de meia", contrastando isso com trabalhar "para ter com que acudir ao necessitado". É uma pegadinha difícil, pois prover para a família é bíblico (1 Tm 5:8), mas o autor diz que PARAR NISSO é desperdício.

USE ESTES EXEMPLOS COMO MODELO PARA CRIAR QUESTÕES IGUALMENTE DESAFIADORAS!

Agora siga as demais regras técnicas abaixo:

Você é um especialista em educação cristã reformada. Sua tarefa é extrair e processar o conteúdo de uma lição bíblica de um PDF.

REGRAS CRÍTICAS - LEIA COM ATENÇÃO:
1. O NOME DA LIÇÃO deve ser EXATAMENTE igual ao do PDF. NÃO altere, NÃO parafraseie, NÃO traduza.
2. Os TÍTULOS DOS TÓPICOS devem ser EXATAMENTE iguais ao do PDF. NÃO altere, NÃO parafraseie.
3. O VERSÍCULO BASE deve ser extraído exatamente como está no PDF.
4. Use EXCLUSIVAMENTE a versão ARA (Almeida Revista e Atualizada) para citações bíblicas.

ESTRUTURA DE EXTRAÇÃO:
1. Identifique e extraia o nome/título principal da lição EXATAMENTE como aparece
2. Identifique o versículo base com sua referência
3. Identifique TODOS os tópicos/seções da lição com seus títulos EXATOS
4. Para cada tópico, faça um resumo do conteúdo para a seção "Estude"
5. Extraia aplicações práticas e meditações para a seção "Medite"
6. Gere EXATAMENTE 5 perguntas para a seção "Responda"

IMPORTANTE - CORREÇÃO OBRIGATÓRIA DE ERROS DE OCR E ORTOGRAFIA:
A extração de PDF frequentemente produz ERROS DE OCR. Você DEVE corrigir TODOS os erros automaticamente:

CORREÇÕES DE CARACTERES TROCADOS (muito comum em OCR):
- Números no lugar de letras: "0" → "o", "1" → "l" ou "i", "3" → "e", "5" → "s", "8" → "B"
- Exemplo: "Mis0o3s" → "Missões", "crist0" → "Cristo", "1greja" → "Igreja", "5enhor" → "Senhor"
- Exemplo: "f3" → "fé", "oraça0" → "oração", "D3us" → "Deus"
- Letras trocadas ou faltando: "fcazer" → "fazer", "igrja" → "igreja", "palvra" → "palavra"
- Caracteres estranhos ou símbolos: remova caracteres como "§", "¶", "€" que não fazem sentido no contexto

CORREÇÕES DE ACENTUAÇÃO (OCR frequentemente perde acentos):
- "oracao" → "oração", "fe" → "fé", "coracao" → "coração", "bencao" → "bênção"
- "missao" → "missão", "salvacao" → "salvação", "comunhao" → "comunhão"
- "espirito" → "espírito", "misericordia" → "misericórdia", "proposito" → "propósito"

CORREÇÕES BASEADAS NO CONTEXTO:
- Se uma palavra não existe mas é similar a uma palavra real, corrija para a palavra correta
- Analise o contexto da frase para deduzir a palavra correta
- Exemplo: "O Senhor é meu pastor, nada me faltarg" → "faltará"
- Exemplo: "Vai e nao peques majs" → "mais"

CORREÇÕES DE FORMATAÇÃO:
- Espaços extras ou faltando entre palavras
- Pontuação correta: vírgulas, pontos, dois-pontos
- Maiúsculas no início de frases e em nomes próprios
- Nomes bíblicos SEMPRE com maiúscula: Deus, Jesus, Cristo, Senhor, Espírito Santo, etc.

REGRA DE OURO: Quando em dúvida sobre uma palavra estranha, SEMPRE corrija para a palavra mais provável baseado no contexto religioso/bíblico do texto.

IMPORTANTE - MEDITAÇÃO CRISTÃ:
A meditação cristã é DIFERENTE da meditação oriental. NÃO inclua:
- "Respire fundo", técnicas de respiração, mindfulness
A meditação cristã DEVE incluir:
- Reflexão sobre a Palavra de Deus
- Oração direcionada ao Senhor
- Aplicação prática do texto bíblico

⚠️⚠️⚠️ ALTA PRIORIDADE - SEÇÕES OBRIGATÓRIAS ⚠️⚠️⚠️
AS SEGUINTES SEÇÕES SÃO FREQUENTEMENTE IGNORADAS - VOCÊ DEVE INCLUÍ-LAS:
1. INTRODUÇÃO - Geralmente aparece no início antes dos tópicos numerados. DEVE ser incluída como primeiro tópico.
2. CONCLUSÃO - Geralmente aparece no final após os tópicos numerados. DEVE ser incluída como último tópico.
3. APLICAÇÕES / APLICAÇÃO PRÁTICA - Pode aparecer como seção separada ou dentro da conclusão. DEVE ser extraída.
4. CONSIDERAÇÕES FINAIS - Se existir, DEVE ser incluída.

❌ ERRO GRAVE: Ignorar Introdução, Conclusão ou Aplicações é INACEITÁVEL.
✅ CORRETO: Incluir TODAS as seções, mesmo que não tenham numeração.

REGRAS CRÍTICAS PARA EXTRAÇÃO DE TÓPICOS - LEIA COM MÁXIMA ATENÇÃO:
- ANALISE TODO O TEXTO DO PDF LINHA POR LINHA, do início ao fim
- É OBRIGATÓRIO extrair TODOS os tópicos/seções do PDF sem exceção
- ERRO COMUM: Ignorar tópicos no meio ou final do documento - NÃO FAÇA ISSO
- INCLUA: INTRODUÇÃO (início), tópicos numerados (meio), CONCLUSÃO/APLICAÇÕES (final)
- Procure por padrões como: números romanos (I, II, III), números (1., 2., 3.), letras (a), b), c))
- Procure por títulos em MAIÚSCULAS ou em negrito/destaque
- Procure por palavras-chave como: "Primeiro", "Segundo", "Terceiro", "Em seguida", "Por fim", "Finalmente"
- Procure por: "Introdução", "Conclusão", "Aplicação", "Considerações", "Encerramento", "Resumo"
- Procure por seções separadas por linhas em branco ou quebras de página
- INCLUA TODOS OS TÓPICOS encontrados, mesmo que pareçam pequenos ou secundários
- LISTE os tópicos NA ORDEM em que aparecem no documento
- Cada tópico deve ter um resumo COMPLETO e EXTENSO do conteúdo (mínimo 200 palavras)
- VALIDAÇÃO FINAL: Antes de responder:
  1. Verifique se a INTRODUÇÃO está incluída
  2. Verifique se a CONCLUSÃO está incluída
  3. Verifique se as APLICAÇÕES estão incluídas
  4. Confirme que TODOS os tópicos foram incluídos
- Se o PDF tiver 4 tópicos, você DEVE retornar 4 tópicos. Se tiver 6, DEVE retornar 6.

REGRAS OBRIGATÓRIAS PARA DIFICULDADE DAS PERGUNTAS:
⚠️ AS PERGUNTAS DEVEM SER DESAFIADORAS - NÃO FAÇA PERGUNTAS ÓBVIAS ⚠️

NÍVEIS DE DIFICULDADE (misture todos em cada lição):
1. MÉDIO (2 perguntas): Requer leitura atenta do texto. A resposta não é a primeira que vem à mente.
2. MÉDIO-DIFÍCIL (2 perguntas): Requer análise e interpretação. O aluno precisa pensar sobre o significado.
3. DIFÍCIL (1 pergunta): Requer síntese de múltiplos conceitos ou distinção entre conceitos muito similares.

CARACTERÍSTICAS DE PERGUNTAS BEM FEITAS:
- A resposta correta NÃO pode ser identificada sem ler o texto de estudo
- Alternativas erradas devem parecer igualmente corretas à primeira vista
- Use termos bíblicos relacionados que requerem conhecimento para distinguir
- Explore nuances teológicas (ex: justificação vs santificação, fé vs obras)
- Pergunte sobre aplicações práticas, não apenas fatos

REGRAS PARA PERGUNTAS DE MÚLTIPLA ESCOLHA:
- TODAS as 4 alternativas devem ser MUITO PLAUSÍVEIS e parecerem igualmente corretas
- As alternativas devem ter TAMANHOS SIMILARES (a resposta correta NÃO pode ser a mais longa)
- NUNCA use alternativas obviamente erradas como "Nenhuma das anteriores" ou respostas absurdas
- Use alternativas que requerem conhecimento profundo e leitura do texto para distinguir a correta
- VARIE a posição da resposta correta (distribua entre A, B, C e D - não sempre A ou B)
- Crie alternativas que usem conceitos teológicos relacionados mas com nuances diferentes
- Exemplo: se a resposta é "justificação", alternativas podem ser "santificação", "regeneração", "glorificação"

⚠️ SISTEMA OBRIGATÓRIO DE AUTO-VALIDAÇÃO DE ALTERNATIVAS ⚠️

Antes de finalizar CADA pergunta de múltipla escolha, execute estes 4 passos:

PASSO 1 - GERAR 6 CANDIDATOS:
Liste 6 alternativas candidatas relacionadas ao tema, todas teologicamente plausíveis.

PASSO 2 - VERIFICAR E ELIMINAR PADRÕES ÓBVIOS:
❌ TAMANHO DESIGUAL: Uma alternativa muito mais longa → REESCREVA todas com tamanho similar (máx 5 palavras de diferença)
❌ NEGAÇÃO ISOLADA: Apenas uma com "não/nunca/nenhum" → ADICIONE outra negação ou REMOVA
❌ AFIRMAÇÃO ISOLADA: Uma positiva entre negativas → REBALANCEIE
❌ ABSOLUTO ISOLADO: Uma com "sempre/todos/jamais" → EQUILIBRE com outras
❌ ESPECIFICIDADE DESIGUAL: Uma muito detalhada, outras vagas → EQUILIBRE detalhamento
❌ "MAIS CRISTÃ": Uma claramente "mais correta religiosamente" → TORNE TODAS igualmente teológicas

PASSO 3 - TESTE DO "CHUTE EDUCADO":
Pergunte: "Alguém que NÃO estudou o texto conseguiria eliminar alternativas por padrão visual ou lógico?"
Se SIM → as alternativas estão RUINS, REESCREVA
Se NÃO → alternativas APROVADAS

PASSO 4 - VALIDAÇÃO FINAL:
- Confirme: todas as 4 alternativas têm TAMANHO SIMILAR
- Confirme: distratores são SUTILMENTE errados, não obviamente absurdos
- Confirme: a resposta correta NÃO se destaca visualmente

REGRAS PARA DICAS (HINTS):
- Cada pergunta DEVE ter uma dica (hint) associada
- A dica NÃO pode ser óbvia ou entregar a resposta diretamente
- A dica deve dar uma PISTA SUTIL que requer raciocínio para entender
- Exemplo RUIM de dica: "A resposta começa com G" ou "É a palavra graça"
- Exemplo BOM de dica: "Pense no que nos é dado sem merecermos" ou "Considere o conceito central de Efésios 2:8"
- A dica deve manter o grau de dificuldade da pergunta
- O usuário perde XP ao usar a dica, então ela deve valer a pena mas não ser fácil demais

REGRAS CRÍTICAS PARA FILL_BLANK COM VALIDAÇÃO PRÉ-GERAÇÃO (4 PASSOS OBRIGATÓRIOS):

A frase DEVE ter contexto completo para o usuário entender o que preencher.
OBRIGATÓRIO: Inclua campo "options" com EXATAMENTE 4 alternativas VALIDADAS.

⚠️ EXECUTE ESTES 4 PASSOS PARA CADA QUESTÃO FILL_BLANK ANTES DE GERAR O JSON ⚠️

PASSO 1 - ANÁLISE SINTÁTICA DA LACUNA:
Identifique a função sintática e classe gramatical exata que a lacuna exige:
- VERBO INFINITIVO: aparece após "para", "deve", "precisa", "quer", "é" (como predicativo)
- VERBO CONJUGADO: funciona como núcleo do predicado com sujeito definido
- SUBSTANTIVO ABSTRATO: conceitos (amor, fé, graça, salvação)
- SUBSTANTIVO CONCRETO: coisas físicas (cruz, pão, água, pedra)
- ADJETIVO: modifica um substantivo na frase
- NOME PRÓPRIO: pessoas (Jesus, Paulo) ou lugares (Jerusalém)

PASSO 2 - GERAÇÃO DE CANDIDATOS (6-8):
Liste 6-8 palavras da MESMA classe gramatical identificada no Passo 1

PASSO 3 - VALIDAÇÃO RIGOROSA (CRÍTICO - NÃO PULE):
Para CADA candidato, execute este teste:
1. Forme a frase completa inserindo o candidato na lacuna
2. TESTE GRAMATICAL: A frase está correta gramaticalmente? (concordância, regência, sintaxe)
3. TESTE SEMÂNTICO: A frase faz sentido como afirmação, mesmo que biblicamente incorreta?
4. APENAS candidatos que passam em AMBOS os testes são VÁLIDOS
5. Descarte imediatamente qualquer candidato que falhe em qualquer teste

PASSO 4 - SELEÇÃO FINAL:
- Escolha 1 resposta CORRETA entre os candidatos válidos
- Escolha 3 distratores entre os candidatos válidos (que formam frases corretas mas são respostas erradas)

EXEMPLOS DETALHADOS DE VALIDAÇÃO:

Frase: "Nós devemos viver para ___ a Deus."
Análise: lacuna após "para" exige VERBO INFINITIVO
Candidatos: glorificar, amar, servir, honrar, amor, glória, fé
Validação:
✅ glorificar → "...para glorificar a Deus" (gramatical OK, semântico OK)
✅ amar → "...para amar a Deus" (gramatical OK, semântico OK)
✅ servir → "...para servir a Deus" (gramatical OK, semântico OK)
✅ honrar → "...para honrar a Deus" (gramatical OK, semântico OK)
❌ amor → "...para amor a Deus" (INVÁLIDO - substantivo após "para" + verbo requer infinitivo)
❌ glória → "...para glória a Deus" (INVÁLIDO - estrutura incorreta)
❌ fé → "...para fé a Deus" (INVÁLIDO - estrutura incorreta)
Seleção final: ["glorificar", "amar", "servir", "honrar"] ✓

Frase: "Foi ___ que morreu na Cruz."
Análise: lacuna como sujeito, estrutura de clivagem exige NOME PRÓPRIO DE PESSOA
Candidatos: Jesus, Pedro, Paulo, João, amor, fé, salvação
Validação:
✅ Jesus → "Foi Jesus que morreu na Cruz." (gramatical OK, semântico OK)
✅ Pedro → "Foi Pedro que morreu na Cruz." (gramatical OK, semântico OK - falso mas faz sentido)
✅ Paulo → "Foi Paulo que morreu na Cruz." (gramatical OK, semântico OK)
✅ João → "Foi João que morreu na Cruz." (gramatical OK, semântico OK)
❌ amor → "Foi amor que morreu na Cruz." (INVÁLIDO - substantivo abstrato requer artigo "o amor")
❌ fé → "Foi fé que morreu na Cruz." (INVÁLIDO - substantivo abstrato requer artigo)
❌ salvação → "Foi salvação que morreu na Cruz." (INVÁLIDO - não pode "morrer")
Seleção final: ["Jesus", "Pedro", "Paulo", "João"] ✓

Frase: "A ___ de Deus nos salva."
Análise: lacuna como núcleo do sujeito exige SUBSTANTIVO FEMININO
Candidatos: graça, fé, misericórdia, bondade, amor, Salvador
Validação:
✅ graça → "A graça de Deus nos salva." (gramatical OK)
✅ fé → "A fé de Deus nos salva." (gramatical OK)
✅ misericórdia → "A misericórdia de Deus nos salva." (gramatical OK)
✅ bondade → "A bondade de Deus nos salva." (gramatical OK)
❌ amor → "A amor de Deus nos salva." (INVÁLIDO - masculino com artigo feminino)
❌ Salvador → "A Salvador de Deus nos salva." (INVÁLIDO - masculino com artigo feminino)
Seleção final: ["graça", "fé", "misericórdia", "bondade"] ✓

NUNCA GERE ALTERNATIVAS SEM EXECUTAR TODOS OS 4 PASSOS DE VALIDAÇÃO!

⚠️ REGRAS OBRIGATÓRIAS PARA PERGUNTAS VERDADEIRO/FALSO - DIFICULDADE AVANÇADA ⚠️

As perguntas de V/F são frequentemente MUITO FÁCEIS. Siga estas regras para aumentar a dificuldade:

SISTEMA DE AUTO-VALIDAÇÃO PARA VERDADEIRO/FALSO:

PASSO 1 - CRIAR AFIRMAÇÃO COMPLEXA:
- A afirmação deve misturar conceitos verdadeiros e falsos de forma sutil
- NÃO use afirmações obviamente verdadeiras ou obviamente falsas
- Use nuances teológicas que requerem conhecimento do texto para distinguir

PASSO 2 - EVITAR PADRÕES ÓBVIOS:
❌ PALAVRAS ABSOLUTAS: Afirmações com "sempre", "nunca", "todos", "nenhum" são frequentemente FALSAS - evite ou equilibre
❌ AFIRMAÇÕES MUITO POSITIVAS: "Jesus nos ama incondicionalmente" é obviamente VERDADEIRA - muito fácil
❌ AFIRMAÇÕES ABSURDAS: "Deus não existe" é obviamente FALSA - muito fácil
❌ NEGAÇÕES DUPLAS: "Não é incorreto dizer que..." confunde mas não testa conhecimento

PASSO 3 - TESTE DO "CHUTE EDUCADO":
Pergunte: "Alguém que NÃO leu o texto conseguiria acertar só pelo senso comum religioso?"
Se SIM → a afirmação está MUITO FÁCIL, REESCREVA
Se NÃO → afirmação APROVADA

PASSO 4 - TIPOS DE AFIRMAÇÕES DESAFIADORAS:
✅ INVERSÃO SUTIL: Troque um elemento pequeno que muda o significado
✅ MISTURA DE CONCEITOS: Combine conceitos relacionados de forma incorreta
✅ EXAGERO OU REDUÇÃO: Amplifique ou minimize um conceito
✅ CONTEXTO ERRADO: Use afirmação verdadeira em contexto errado

Responda SEMPRE em JSON válido. NÃO use markdown, apenas JSON puro.`;

  const userPrompt = `Analise o seguinte texto de uma lição bíblica extraído de um PDF e gere o conteúdo estruturado:

TEXTO DO PDF:
${pdfText}

Retorne um JSON com a seguinte estrutura:
{
  "title": "TÍTULO EXATO DA LIÇÃO (como está no PDF, não altere)",
  "baseVerse": "Texto completo do versículo base na versão ARA",
  "baseVerseReference": "Referência do versículo (ex: João 3:16)",
  "topics": [
    {
      "title": "TÍTULO EXATO DO TÓPICO (como está no PDF, não altere)",
      "summary": "Resumo EXTENSO e detalhado do conteúdo do tópico para estudo (mínimo 150 palavras)",
      "originalContent": "Conteúdo original extraído do PDF para referência"
    }
  ],
  "studyContent": [
    {
      "type": "verse",
      "stage": "estude",
      "content": {
        "title": "Versículo Base",
        "body": "Texto do versículo na ARA",
        "highlight": "Referência bíblica"
      },
      "xpValue": 5
    },
    {
      "type": "text",
      "stage": "estude",
      "content": {
        "title": "TÍTULO EXATO DO TÓPICO",
        "body": "Resumo EXTENSO e detalhado do tópico com explicações profundas (mínimo 150 palavras)",
        "highlight": "Frase-chave para destacar (opcional)"
      },
      "xpValue": 5
    }
  ],
  "meditationContent": [
    {
      "type": "reflection",
      "stage": "medite",
      "content": {
        "title": "Aplicação Prática",
        "body": "Como aplicar este ensino na vida diária",
        "reflectionPrompt": "Pergunta para reflexão pessoal"
      },
      "xpValue": 5
    },
    {
      "type": "meditation",
      "stage": "medite",
      "content": {
        "title": "Meditação na Palavra",
        "body": "Guia de meditação CRISTÃ focado na Palavra de Deus, oração e aplicação prática. SEM técnicas de respiração.",
        "meditationDuration": 60
      },
      "xpValue": 5
    }
  ],
  "questions": [
    {
      "type": "multiple_choice",
      "stage": "responda",
      "content": {
        "question": "Pergunta sobre o conteúdo (que requer análise, não apenas memorização)",
        "options": ["Alternativa muito plausível A", "Alternativa muito plausível B", "Alternativa muito plausível C", "Alternativa muito plausível D"],
        "correctIndex": 0,
        "explanationCorrect": "Explicação detalhada de por que esta é a resposta correta",
        "explanationIncorrect": "Explicação educativa sobre por que a resposta estava errada",
        "hint": "Dica sutil que requer raciocínio para entender (NÃO entregue a resposta)"
      },
      "xpValue": 10
    },
    {
      "type": "true_false",
      "stage": "responda",
      "content": {
        "statement": "Afirmação para julgar (deve ser sutil, não óbvia)",
        "isTrue": true,
        "explanationCorrect": "Explicação detalhada",
        "explanationIncorrect": "Explicação educativa",
        "hint": "Dica sutil que ajuda a refletir sobre a afirmação"
      },
      "xpValue": 10
    },
    {
      "type": "fill_blank",
      "stage": "responda",
      "content": {
        "question": "Frase completa com ___ para completar",
        "correctAnswer": "palavra",
        "options": ["palavra", "alternativa1", "alternativa2", "alternativa3"],
        "explanationCorrect": "Explicação detalhada",
        "explanationIncorrect": "Explicação educativa",
        "hint": "Dica sutil sobre o contexto da palavra"
      },
      "xpValue": 10
    }
  ]
}

ESTRUTURA OBRIGATÓRIA:
1. ESTUDE: 1 versículo base + 1 unidade "text" para CADA tópico do PDF
2. MEDITE: NO MÍNIMO 3 unidades (reflexões e aplicações práticas)
3. RESPONDA: EXATAMENTE 5 perguntas (misture múltipla escolha, verdadeiro/falso, complete a frase)

LEMBRE-SE:
- O título da lição e os títulos dos tópicos devem ser IDÊNTICOS ao PDF
- Não altere, não parafraseie, não corrija erros do título original
- Se o PDF tiver "A Forca da Oracao", mantenha exatamente assim

Retorne APENAS o JSON, sem explicações adicionais.`;

  // Helper function to process and validate the parsed content
  const processContent = (content: string): ExtractedLessonFromPDF => {
    const parsed = safeJsonParse(content) as ExtractedLessonFromPDF;
    
    if (parsed.studyContent) {
      parsed.studyContent = parsed.studyContent.map(unit => validateAndCleanUnit(unit, unit.type));
    }
    if (parsed.meditationContent) {
      parsed.meditationContent = parsed.meditationContent.map(unit => validateAndCleanUnit(unit, unit.type));
    }
    if (parsed.questions) {
      parsed.questions = parsed.questions
        .map(unit => {
          if (unit.type === 'multiple_choice') {
            unit.content = randomizeMultipleChoiceAnswer(unit.content);
          }
          // Shuffle fill_blank options so correct answer isn't always first
          if (unit.type === 'fill_blank' && unit.content?.options && Array.isArray(unit.content.options) && unit.content.correctAnswer) {
            const { shuffledOptions } = shuffleFillBlankOptions(unit.content.options, String(unit.content.correctAnswer));
            unit.content.options = shuffledOptions;
          }
          return validateAndCleanUnit(unit, unit.type);
        })
        // Filter out questions with invalid options
        .filter(unit => {
          if (unit.type === 'multiple_choice' || unit.type === 'fill_blank') {
            const unitContent = unit.content || {};
            const options = unitContent.options;
            
            // Check for valid options array with exactly 4 unique items
            if (!options || !Array.isArray(options) || options.length !== 4) {
              console.error(`[PDF Lesson] Removing ${unit.type} question without 4 options: "${unitContent.question || 'no question'}"`);
              return false;
            }
            
            // Check for duplicates (case-insensitive)
            const uniqueOptions = new Set(options.map((o: string) => String(o).toLowerCase().trim()));
            if (uniqueOptions.size !== 4) {
              console.error(`[PDF Lesson] Removing ${unit.type} question with duplicate options`);
              return false;
            }
            
            // For multiple_choice, validate correctIndex is 0-3
            if (unit.type === 'multiple_choice') {
              const correctIdx = unitContent.correctIndex;
              if (typeof correctIdx !== 'number' || correctIdx < 0 || correctIdx > 3) {
                console.error(`[PDF Lesson] Removing multiple_choice question with invalid correctIndex: ${correctIdx}`);
                return false;
              }
            }
            
            // For fill_blank, validate correctAnswer is in options
            if (unit.type === 'fill_blank') {
              const correctStr = String(unitContent.correctAnswer || "").toLowerCase().trim();
              const optionLower = options.map((o: string) => String(o).toLowerCase().trim());
              if (!optionLower.includes(correctStr)) {
                console.error(`[PDF Lesson] Removing fill_blank - correctAnswer not in options`);
                return false;
              }
            }
          }
          return true;
        });
    }
    
    return parsed;
  };

  // For OpenAI provider, use the passed key directly
  if (provider === "openai") {
    try {
      const content = await generateWithOpenAI(systemPrompt, userPrompt, openaiKey);
      if (!content) {
        throw new Error("Resposta vazia da IA");
      }
      return processContent(content);
    } catch (error) {
      console.error("Erro ao gerar lição do PDF com OpenAI:", error);
      throw new Error(`Falha ao processar PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  }

  // For Gemini provider, try all 5 keys automatically
  let lastError: Error | null = null;
  for (let keyNum = 1; keyNum <= 5; keyNum++) {
    try {
      console.log(`[PDF Lesson] Tentando gerar com Gemini chave ${keyNum}...`);
      const content = await generateWithGemini(systemPrompt, userPrompt, keyNum.toString());
      if (!content) {
        throw new Error("Resposta vazia da IA");
      }
      console.log(`[PDF Lesson] Sucesso com Gemini chave ${keyNum}`);
      return processContent(content);
    } catch (error: any) {
      lastError = error;
      const isQuota = isQuotaError(error);
      
      if (isQuota) {
        console.log(`[PDF Lesson] Chave ${keyNum} com limite excedido, tentando próxima...`);
        continue;
      } else {
        console.error(`[PDF Lesson] Erro com chave ${keyNum}:`, error?.message);
        // For non-quota errors, still try next key but log the error
        continue;
      }
    }
  }
  
  // All keys exhausted
  markQuotaExhausted();
  console.error("Erro ao gerar lição do PDF: todas as chaves Gemini esgotadas");
  throw new Error(`Falha ao processar PDF: ${lastError?.message || "Todas as chaves de API atingiram o limite de uso. Tente novamente em alguns minutos."}`);
}

// ==================== FUNÇÕES DE GERAÇÃO PARA MISSÕES DIÁRIAS ====================

// Fallback data for Bible Characters
const FALLBACK_BIBLE_CHARACTERS = [
  { name: "Moisés", description: "Líder que guiou Israel para fora do Egito", verse: "Êxodo 3:10", fact: "Moisés passou 40 anos no deserto antes de ser chamado por Deus" },
  { name: "Davi", description: "Pastor que se tornou o maior rei de Israel", verse: "1 Samuel 16:13", fact: "Davi escreveu aproximadamente 73 dos 150 Salmos" },
  { name: "Abraão", description: "Pai da fé e ancestral do povo de Israel", verse: "Gênesis 12:1-3", fact: "Abraão tinha 75 anos quando Deus o chamou para deixar sua terra" },
  { name: "José", description: "Jovem vendido como escravo que se tornou governador do Egito", verse: "Gênesis 50:20", fact: "José interpretou os sonhos do Faraó sobre 7 anos de fartura e 7 de fome" },
  { name: "Rute", description: "Moabita fiel que se tornou ancestral de Jesus", verse: "Rute 1:16", fact: "Rute é uma das quatro mulheres mencionadas na genealogia de Jesus" },
  { name: "Daniel", description: "Profeta fiel que foi lançado na cova dos leões", verse: "Daniel 6:10", fact: "Daniel orava três vezes ao dia mesmo quando isso foi proibido" },
  { name: "Ester", description: "Rainha corajosa que salvou seu povo", verse: "Ester 4:14", fact: "Ester jejuou por três dias antes de se apresentar ao rei" },
  { name: "Pedro", description: "Pescador que se tornou líder dos apóstolos", verse: "Mateus 16:18", fact: "Pedro negou Jesus três vezes, mas foi restaurado após a ressurreição" },
  { name: "Paulo", description: "Perseguidor que se tornou o maior missionário cristão", verse: "Filipenses 3:14", fact: "Paulo escreveu 13 das 27 cartas do Novo Testamento" },
  { name: "Maria Madalena", description: "Discípula fiel e primeira testemunha da ressurreição", verse: "João 20:16-18", fact: "Maria Madalena foi a primeira pessoa a ver Jesus ressuscitado" },
];

// Fallback data for Verse Memory
const FALLBACK_VERSE_MEMORY = [
  { reference: "João 3:16", fullVerse: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", blanks: ["Deus", "Filho", "crê", "vida"] },
  { reference: "Salmos 23:1", fullVerse: "O Senhor é o meu pastor; nada me faltará.", blanks: ["Senhor", "pastor", "nada", "faltará"] },
  { reference: "Filipenses 4:13", fullVerse: "Posso todas as coisas naquele que me fortalece.", blanks: ["todas", "coisas", "fortalece"] },
  { reference: "Provérbios 3:5", fullVerse: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.", blanks: ["Confia", "Senhor", "coração", "entendimento"] },
  { reference: "Romanos 8:28", fullVerse: "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.", blanks: ["todas", "cooperam", "bem", "amam"] },
  { reference: "Isaías 41:10", fullVerse: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.", blanks: ["temas", "contigo", "assombres", "Deus"] },
  { reference: "Mateus 6:33", fullVerse: "Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.", blanks: ["Buscai", "Reino", "justiça", "acrescentadas"] },
  { reference: "Jeremias 29:11", fullVerse: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais.", blanks: ["pensamentos", "paz", "mal", "esperais"] },
];

// Fallback data for Timed Quiz
const FALLBACK_TIMED_QUIZ = [
  { question: "Quantos livros tem a Bíblia?", options: ["66", "73", "39", "27"], correctIndex: 0 },
  { question: "Quem construiu a arca?", options: ["Noé", "Moisés", "Abraão", "Davi"], correctIndex: 0 },
  { question: "Em qual cidade Jesus nasceu?", options: ["Belém", "Nazaré", "Jerusalém", "Cafarnaum"], correctIndex: 0 },
  { question: "Quantos apóstolos Jesus escolheu?", options: ["12", "7", "10", "14"], correctIndex: 0 },
  { question: "Quem batizou Jesus?", options: ["João Batista", "Pedro", "Paulo", "Tiago"], correctIndex: 0 },
  { question: "Qual é o maior mandamento?", options: ["Amar a Deus", "Não matar", "Honrar pai e mãe", "Não roubar"], correctIndex: 0 },
  { question: "Quantos dias Deus usou para criar o mundo?", options: ["6", "7", "5", "3"], correctIndex: 0 },
  { question: "Quem foi o primeiro rei de Israel?", options: ["Saul", "Davi", "Salomão", "Samuel"], correctIndex: 0 },
  { question: "Qual era a profissão de Pedro?", options: ["Pescador", "Carpinteiro", "Cobrador de impostos", "Pastor"], correctIndex: 0 },
  { question: "Quem escreveu a maioria dos Salmos?", options: ["Davi", "Salomão", "Moisés", "Asafe"], correctIndex: 0 },
];

export async function generateBibleCharacterWithAI(): Promise<{ name: string; description: string; verse: string; fact: string } | null> {
  if (!isAIConfigured()) {
    console.log("[Bible Character] AI not configured, cannot generate");
    return null;
  }
  
  const dateStr = new Date().toISOString().split('T')[0];
  const randomSeed = Math.floor(Math.random() * 1000);
  
  const systemPrompt = "Você é um estudioso bíblico especializado em personagens da Bíblia.";
  const userPrompt = `Gere informações sobre UM personagem bíblico para estudo diário.

REGRAS IMPORTANTES:
- Data atual: ${dateStr} - escolha um personagem ÚNICO para esta data
- Use o seed ${randomSeed} para garantir variedade
- Escolha entre TODOS os personagens bíblicos (Antigo e Novo Testamento)
- Inclua personagens menos conhecidos (não apenas Moisés, Davi, Abraão)
- Pode incluir: juízes, profetas menores, mulheres bíblicas, apóstolos, reis, etc.
- A descrição deve ser breve (1-2 frases)
- O versículo deve ser a referência mais importante sobre esse personagem
- O fato curioso deve ser algo interessante e educativo

Formato JSON (OBRIGATÓRIO):
{
  "name": "Nome do personagem",
  "description": "Breve descrição do personagem e sua importância",
  "verse": "Referência bíblica (ex: Gênesis 12:1)",
  "fact": "Um fato curioso ou interessante sobre o personagem"
}`;
  
  // Try each key (1-5) - generateWithGemini handles model fallback internally (gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-lite)
  for (let keyNum = 1; keyNum <= 5; keyNum++) {
    try {
      console.log(`[Bible Character] Trying key ${keyNum} (all models: gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-lite)...`);
      const text = await generateWithGemini(systemPrompt, userPrompt, keyNum.toString());
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.name && parsed.description && parsed.verse && parsed.fact) {
          console.log(`[Bible Character] Successfully generated: ${parsed.name} (key ${keyNum})`);
          return parsed;
        }
      }
      console.log(`[Bible Character] Key ${keyNum} returned invalid format, trying next key...`);
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.log(`[Bible Character] Key ${keyNum} quota exceeded, trying next key...`);
        continue;
      } else {
        console.error(`[Bible Character] Key ${keyNum} error:`, error?.message);
        // For non-quota errors, try next key
        continue;
      }
    }
  }
  
  console.error("[Bible Character] FAILED - All keys exhausted, returning null (NO FALLBACK)");
  return null;
}

export async function generateVerseMemoryWithAI(): Promise<{ reference: string; fullVerse: string; blanks: string[] }> {
  if (isAIConfigured() && isQuotaLikelyAvailable()) {
    const dateStr = new Date().toISOString().split('T')[0];
    const randomSeed = Math.floor(Math.random() * 1000);
    
    const systemPrompt = "Você é um educador cristão especializado em memorização bíblica.";
    const userPrompt = `Gere um versículo para memorização com palavras para preencher.

REGRAS:
- Escolha um versículo DIFERENTE a cada dia (use seed ${randomSeed}, data: ${dateStr})
- Use versículos conhecidos e inspiradores
- Selecione 3-5 palavras-chave importantes para serem as lacunas
- As palavras devem ser significativas (substantivos, verbos, adjetivos importantes)
- Use a versão ARA (Almeida Revista e Atualizada)

Formato JSON:
{
  "reference": "Livro capítulo:versículo (ex: João 3:16)",
  "fullVerse": "O versículo completo sem lacunas",
  "blanks": ["palavra1", "palavra2", "palavra3", "palavra4"]
}`;
    
    for (let keyNum = 1; keyNum <= 5; keyNum++) {
      try {
        const text = await generateWithGemini(systemPrompt, userPrompt, keyNum.toString());
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.reference && parsed.fullVerse && parsed.blanks && parsed.blanks.length >= 3) {
            console.log(`[Verse Memory] Successfully generated with AI (key ${keyNum})`);
            return parsed;
          }
        }
      } catch (error: any) {
        if (isQuotaError(error)) {
          console.log(`[Verse Memory] Key ${keyNum} quota exceeded, trying next...`);
          continue;
        } else {
          console.error(`[Verse Memory] Key ${keyNum} error:`, error?.message);
        }
      }
    }
    
    markQuotaExhausted();
    console.log("[Verse Memory] All keys exhausted, using local fallback");
  }

  // Fallback: select random verse
  const randomIndex = Math.floor(Math.random() * FALLBACK_VERSE_MEMORY.length);
  return FALLBACK_VERSE_MEMORY[randomIndex];
}

export interface GeneratedEventLesson {
  dayNumber: number;
  title: string;
  content: string;
  verseReference: string;
  verseText: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
  xpReward: number;
}

export interface GeneratedEventContent {
  title: string;
  description: string;
  lessons: GeneratedEventLesson[];
}

export async function generateEventContentFromText(
  text: string,
  theme: string,
  month: string,
  keyNumber?: string
): Promise<GeneratedEventContent> {
  if (!isAIConfigured()) {
    throw new Error("IA não configurada. Configure GEMINI_API_KEY ou OPENAI_API_KEY.");
  }

  if (!isQuotaLikelyAvailable()) {
    throw new Error("Quota de IA temporariamente esgotada. Tente novamente em alguns minutos.");
  }

  const systemPrompt = `🔴🔴🔴 PROMPT DE SISTEMA PRIORITÁRIO: GERADOR DE AVALIAÇÃO TEOLÓGICA (NÍVEL AVANÇADO) 🔴🔴🔴

CONTEXTO:
Tu és um especialista em currículo cristão e teologia para a plataforma DeoGlory. O teu objetivo é criar avaliações que testem a leitura atenta e compreensão profunda do texto fornecido.

🔴 REGRA DE OURO (ANTI-CHUTE) - PRIORIDADE MÁXIMA:
O utilizador (aluno) é um cristão habituado à linguagem de igreja. Se ele conseguir responder sem ler o texto, a questão FALHOU. As perguntas devem ser IMPOSSÍVEIS de responder apenas com "conhecimento bíblico geral". Devem exigir o argumento ESPECÍFICO do autor.

DIRETRIZES PARA MÚLTIPLA ESCOLHA:
1. O ENUNCIADO: Deve focar num conceito específico, definição ou argumento lógico apresentado pelo autor. Evita perguntas de factos triviais (ex: "quem escreveu o livro?").
2. A RESPOSTA CORRETA: Deve ser a síntese exata do pensamento do autor.
3. OS DISTRATORES (Alternativas Erradas) - ESTA É A PARTE MAIS IMPORTANTE:
   - Devem parecer teologicamente corretos ou "piedosos" à primeira vista
   - Devem usar vocabulário bíblico
   - Devem representar conceitos populares (senso comum evangélico) que o texto NÃO abordou ou, melhor ainda, que o texto REFUTOU/CORRIGIU
   - Exemplo: Se o texto diz que "o trabalho é para servir o próximo", um distrator deve ser "o trabalho é para alcançar prosperidade como prova da bênção de Deus" (soa a algo que alguns crentes diriam, mas está ERRADO no contexto)

DIRETRIZES PARA VERDADEIRO OU FALSO:
1. NÃO cries afirmações obviamente falsas (ex: "Deus não existe"). Isso é demasiado fácil.
2. Cria uma "ARMADILHA DE NUANCE": A afirmação deve parecer verdadeira na primeira metade, mas conter um erro subtil no final, OU deve ser uma afirmação popular que o autor desconstruiu no texto.
3. Objetivo: O aluno deve parar, pensar e lembrar-se: "Espera, o pastor disse isso mesmo ou disse o contrário?".

⚠️ PENEIRA OBRIGATÓRIA DE QUESTÕES ⚠️
Antes de gerar a resposta final, avalie CADA questão com estas perguntas:
1. Um cristão experiente conseguiria responder SEM ler o texto? Se SIM → DESCARTE e crie outra
2. As alternativas erradas parecem "piedosas" e bíblicas? Se NÃO → REESCREVA os distratores
3. A questão exige o argumento ESPECÍFICO do autor? Se NÃO → REFORMULE

📚 EXEMPLOS DE QUESTÕES BEM ELABORADAS (USE COMO REFERÊNCIA):

EXEMPLO 1 - Múltipla Escolha:
Enunciado: O texto aborda a definição de atividades "seculares" (como o emprego ou a universidade). Segundo a definição técnica apresentada pelo autor, o que torna uma atividade "secular"?
A) É uma atividade onde Deus está presente apenas pela graça comum, e não pela graça salvadora, diferenciando-se do ministério eclesiástico.
B) São atividades que não se relacionam com o "sagrado", focando-se apenas nas necessidades temporais e materiais da vida humana.
C) São atividades que, embora façam parte da vida cristã, não estão estruturalmente ligadas à organização da igreja. ✅ CORRETA
D) É o campo de atuação onde o cristão deve buscar sustento financeiro para, posteriormente, financiar a verdadeira obra missionária da igreja.
POR QUE FUNCIONA: A e D são conceitos comuns em muitas igrejas ("graça comum" ou "trabalhar para sustentar a obra"), mas o texto define secular estritamente como "atividades não estruturalmente ligadas à igreja". B é a ARMADILHA - o texto diz que algumas pessoas chamam de secular querendo dizer "não se relacionam com o sagrado", mas o autor CORRIGE essa visão. Quem não leu vai marcar B.

EXEMPLO 2 - Múltipla Escolha:
Enunciado: Ao discutir como engrandecer a Deus através da criatividade no trabalho, o autor faz uma distinção entre o trabalho de Deus e o trabalho humano. Qual é essa distinção específica?
A) Deus cria para Sua própria glória, enquanto o homem deve trabalhar para servir ao próximo e suprir as necessidades da sociedade.
B) Deus cria do nada (ex nihilo), enquanto o trabalho humano, como imagem de Deus, é tomar o que já foi feito e dar-lhe forma e ordem. ✅ CORRETA
C) O trabalho de Deus é perfeito e espiritual, enquanto o trabalho humano é falho e afetado pela queda, exigindo redenção constante.
D) Deus descansou no sétimo dia, estabelecendo um padrão para que o homem não faça do seu trabalho um ídolo ou fonte primária de satisfação.
POR QUE FUNCIONA: A, C e D são todas verdades teológicas aceitas no meio cristão. No entanto, o texto usa ESPECIFICAMENTE o argumento da criação ex nihilo versus "dar forma e ordem" para explicar a nossa criatividade no trabalho.

EXEMPLO 3 - Múltipla Escolha:
Enunciado: O autor critica uma motivação comum para o trabalho, classificando-a como "desperdício de vida" se pararmos nela. Que motivação é essa?
A) Trabalhar arduamente para alcançar posições de liderança e influenciar a cultura corporativa com valores cristãos.
B) Trabalhar com o objetivo principal de prover segurança e conforto para a própria família ("fazer o pé de meia"). ✅ CORRETA
C) Trabalhar focando apenas na excelência técnica, esquecendo-se de evangelizar verbalmente os colegas de trabalho.
D) Trabalhar motivado pelo medo da escassez ou pela ansiedade quanto ao futuro, em vez de confiar na provisão do Pai.
POR QUE FUNCIONA: A, C e D são críticas válidas em outros contextos. Porém, o texto ataca diretamente a ideia de trabalhar apenas para "prover para nossas necessidades e de nossa família" ou "fazer o pé de meia", contrastando isso com trabalhar "para ter com que acudir ao necessitado". É uma pegadinha difícil, pois prover para a família é bíblico (1 Tm 5:8), mas o autor diz que PARAR NISSO é desperdício.

USE ESTES EXEMPLOS COMO MODELO PARA CRIAR QUESTÕES IGUALMENTE DESAFIADORAS!

Agora siga as demais regras técnicas abaixo:

Você é um educador cristão especializado em criar conteúdo de estudo bíblico para jovens presbiterianos.
Crie conteúdo envolvente, profundo teologicamente mas acessível para jovens.

IMPORTANTE: Cada lição DEVE ter EXATAMENTE 3 seções principais:
1. ESTUDE - Conteúdo teórico com 2 TÓPICOS ESPECÍFICOS + 1 CONCLUSÃO
   - Tópico 1: Primeiro tema principal
   - Tópico 2: Segundo tema principal complementar
   - Conclusão: Síntese dos aprendizados dos 2 tópicos
2. MEDITE - Exatamente 2 PARTES: 1 MEDITAÇÃO + 1 APLICAÇÃO (nessa ordem)
   - Meditação: Reflexão profunda sobre o versículo e o tema
   - Aplicação: Como o aprendizado se aplica na vida diária do jovem
3. RESPONDA - 5 questões de quiz (múltipla escolha, verdadeiro/falso, completar)`;

  const userPrompt = `Com base no texto/tema fornecido, crie um evento de estudo especial com EXATAMENTE 5 lições.

TEMA: ${theme}
MÊS DO EVENTO: ${month}
CONTEÚDO BASE: ${text}

REGRAS MUITO IMPORTANTES - LEIA COM ATENÇÃO:
1. Gere EXATAMENTE 5 lições, cada uma para um dia diferente
2. Cada lição DEVE ter as 3 seções: ESTUDE, MEDITE, RESPONDA

ESTRUTURA DA SEÇÃO ESTUDE (3 TELAS):
- TÓPICO 1: Primeiro ponto de aprendizado com pelo menos 2 parágrafos
- TÓPICO 2: Segundo ponto de aprendizado complementar com pelo menos 2 parágrafos
- CONCLUSÃO: Uma síntese conectando os 2 tópicos com reflexão final
* Separe claramente cada tópico com <h3> tags para que cada tela mostre uma parte

ESTRUTURA DA SEÇÃO MEDITE (2 TELAS):
- MEDITAÇÃO: Uma reflexão profunda sobre o versículo estudado. Inclua questões contemplativas.
- APLICAÇÃO: Como o jovem presbitério pode aplicar esse ensinamento na vida diária, em suas relações e fé.
* Separe com <hr /> entre Meditação e Aplicação

ESTRUTURA DA SEÇÃO RESPONDA:
- EXATAMENTE 5 questões variadas: 3 múltipla escolha, 1 verdadeiro/falso, 1 completar lacuna
- Cada questão com explicação clara

REGRAS CRÍTICAS PARA AS QUESTÕES - LEIA COM MÁXIMA ATENÇÃO:

REGRA UNIVERSAL: TODAS as questões (exceto verdadeiro/falso) DEVEM ter campo "options" com EXATAMENTE 4 alternativas!

1. MÚLTIPLA ESCOLHA (type: "multiple_choice"):
   - OBRIGATÓRIO: campo "options" com EXATAMENTE 4 alternativas plausíveis
   - OBRIGATÓRIO: campo "correctAnswer" com o ÍNDICE (0, 1, 2 ou 3) da resposta correta
   - VARIE a posição da resposta correta entre as questões (não sempre 0 ou sempre 1)
   - TODAS as 4 alternativas devem ser PLAUSÍVEIS e GRAMATICALMENTE CORRETAS
   - Use distratores inteligentes: respostas que poderiam parecer certas mas têm diferença sutil
   - NUNCA use "Não sei", "Nenhuma das anteriores" ou alternativas absurdas
   - COERÊNCIA: Se a pergunta pede um VERBO, todas as 4 opções devem ser VERBOS
   - COERÊNCIA: Se a pergunta pede um SUBSTANTIVO, todas as 4 opções devem ser SUBSTANTIVOS
   - COERÊNCIA: Se a pergunta pede uma FRASE, todas as 4 opções devem ser FRASES do mesmo tamanho

2. VERDADEIRO/FALSO (type: "true_false"):
   - NÃO precisa de campo "options"
   - Campo "correctAnswer" deve ser true ou false (booleano)
   - A afirmação deve ser clara e baseada no conteúdo da lição
   - Varie entre afirmações verdadeiras e falsas nas diferentes lições

3. COMPLETAR LACUNA (type: "fill_blank"):
   - OBRIGATÓRIO: campo "options" com EXATAMENTE 4 alternativas
   - OBRIGATÓRIO: campo "correctAnswer" com a STRING da resposta correta (deve estar nas options)
   - COERÊNCIA GRAMATICAL: Todas as 4 alternativas DEVEM fazer sentido na frase
   - Se a lacuna requer VERBO CONJUGADO (abstenhais, santificai), TODAS as opções devem ser VERBOS CONJUGADOS na mesma forma
   - Se a lacuna requer VERBO INFINITIVO (salvar, amar), TODAS as opções devem ser VERBOS INFINITIVOS
   - Se a lacuna requer SUBSTANTIVO (amor, fé), TODAS as opções devem ser SUBSTANTIVOS do mesmo gênero
   - Se a lacuna requer ADJETIVO (santo, justo), TODAS as opções devem ser ADJETIVOS do mesmo gênero/número
   
   EXEMPLOS CORRETOS:
   - "Jesus veio para ___ o pecador." → options: ["salvar", "redimir", "libertar", "justificar"]
   - "A ___ é fruto do Espírito." → options: ["paz", "fé", "graça", "esperança"]
   - "Deus é ___." → options: ["amor", "luz", "verdade", "justiça"]
   
   EXEMPLOS INCORRETOS (NUNCA FAÇA ISSO):
   - options: ["salvar", "amor", "cruz", "vida"] (mistura verbo com substantivos)
   - options: ["paz", "amou", "santo", "salvação"] (mistura classes gramaticais)

3. Use versículos bíblicos relevantes ao tema
4. O título do evento deve ser criativo e refletir o tema
5. As lições devem formar uma progressão lógica do tema

Formato JSON OBRIGATÓRIO (SIGA EXATAMENTE):
{
  "title": "Título criativo do evento",
  "description": "Descrição em 2-3 frases do que os participantes vão aprender",
  "lessons": [
    {
      "dayNumber": 1,
      "title": "Título da Lição 1",
      "content": "<h2>Estude</h2><h3>Tópico 1: [Nome do Primeiro Ponto]</h3><p>Primeiro parágrafo explicando o tópico 1...</p><p>Segundo parágrafo complementando o tópico 1...</p><h3>Tópico 2: [Nome do Segundo Ponto]</h3><p>Primeiro parágrafo explicando o tópico 2...</p><p>Segundo parágrafo complementando o tópico 2...</p><h3>Conclusão</h3><p>Síntese conectando os dois tópicos e reflexão final...</p><h2>Medite</h2><p>Reflexão profunda sobre o versículo e tema. O que você sente ao ler essas palavras? Como o Espírito Santo fala ao seu coração?</p><hr /><p>APLICAÇÃO: Como você pode viver esse ensinamento hoje? Que mudança prática você fará em sua vida a partir do que aprendeu?</p>",
      "verseReference": "João 3:16",
      "verseText": "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.",
      "questions": [
        {
          "id": "q1",
          "type": "multiple_choice",
          "question": "Qual foi o propósito de Deus ao enviar seu Filho?",
          "options": ["Julgar os pecadores", "Salvar a humanidade", "Punir os ímpios", "Criar novas leis"],
          "correctAnswer": 1,
          "explanation": "João 3:16 ensina que Deus enviou seu Filho para salvar, não para condenar."
        },
        {
          "id": "q2",
          "type": "multiple_choice",
          "question": "O que é necessário para não perecer, segundo o versículo?",
          "options": ["Fazer boas obras", "Seguir rituais religiosos", "Crer em Jesus", "Guardar a lei"],
          "correctAnswer": 2,
          "explanation": "O texto afirma que 'todo aquele que nele crê' terá vida eterna."
        },
        {
          "id": "q3",
          "type": "multiple_choice",
          "question": "A vida eterna é prometida para quem?",
          "options": ["Todo aquele que crê", "Apenas os judeus", "Somente os religiosos", "Os que nunca pecam"],
          "correctAnswer": 0,
          "explanation": "A promessa é universal: 'todo aquele que nele crê'."
        },
        {
          "id": "q4",
          "type": "true_false",
          "question": "Segundo João 3:16, Deus enviou seu Filho para condenar o mundo.",
          "correctAnswer": false,
          "explanation": "O texto diz que Deus enviou seu Filho para SALVAR, não para condenar."
        },
        {
          "id": "q5",
          "type": "fill_blank",
          "question": "Porque Deus ___ o mundo de tal maneira que deu o seu Filho unigênito.",
          "correctAnswer": "amou",
          "options": ["amou", "criou", "salvou", "redimiu"],
          "explanation": "O verbo correto é 'amou' - demonstrando o amor de Deus pela humanidade."
        }
      ],
      "xpReward": 50
    }
  ]
}

ESTRUTURA RESUMIDA DE CADA LIÇÃO:
- ESTUDE: 3 telas (2 tópicos + 1 conclusão) separadas por <h3> tags
- MEDITE: 2 telas (Meditação + Aplicação) separadas por <hr />
- RESPONDA: 5 questões com explicações

Gere TODAS as 5 lições completas com ESSA ESTRUTURA EXATA.`;

  // If specific key is provided, try only that key first
  const keysToTry = keyNumber ? [parseInt(keyNumber)] : [1, 2, 3, 4, 5];
  
  for (const keyNum of keysToTry) {
    try {
      const responseText = await generateWithGemini(systemPrompt, userPrompt, keyNum.toString());
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as GeneratedEventContent;
        
        if (parsed.title && parsed.description && parsed.lessons && parsed.lessons.length === 5) {
          console.log(`[Event Generation] Successfully generated with AI (key ${keyNum})`);
          
          // Validate all questions have proper options before accepting
          let hasInvalidQuestions = false;
          
          parsed.lessons = parsed.lessons.map((lesson, idx) => ({
            ...lesson,
            dayNumber: idx + 1,
            xpReward: lesson.xpReward || 50,
            questions: (lesson.questions || []).map((q: any, qIdx: number) => {
              const questionType = q.type || 'multiple_choice';
              
              // Strict validation for multiple_choice and fill_blank - must have exactly 4 options
              if (questionType !== 'true_false') {
                if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
                  console.error(`[Event Generation] INVALID: Question ${qIdx + 1} in lesson ${idx + 1} must have exactly 4 options. Type: ${questionType}, Options: ${JSON.stringify(q.options)}`);
                  hasInvalidQuestions = true;
                } else {
                  // Check for duplicate options
                  const uniqueOptions = new Set(q.options.map((o: string) => String(o).toLowerCase().trim()));
                  if (uniqueOptions.size !== 4) {
                    console.error(`[Event Generation] INVALID: Question ${qIdx + 1} in lesson ${idx + 1} has duplicate options: ${JSON.stringify(q.options)}`);
                    hasInvalidQuestions = true;
                  }
                }
                
                // For multiple_choice, verify correctAnswer is a valid index (0-3)
                if (questionType === 'multiple_choice') {
                  const correctIdx = q.correctAnswer;
                  if (typeof correctIdx !== 'number' || correctIdx < 0 || correctIdx > 3) {
                    console.error(`[Event Generation] INVALID: multiple_choice question ${qIdx + 1} in lesson ${idx + 1} - correctAnswer must be 0-3, got: ${correctIdx}`);
                    hasInvalidQuestions = true;
                  }
                }
                
                // For fill_blank, verify correctAnswer is in options
                if (questionType === 'fill_blank' && q.options && Array.isArray(q.options)) {
                  const correctStr = String(q.correctAnswer);
                  if (!q.options.some((opt: string) => String(opt).toLowerCase() === correctStr.toLowerCase())) {
                    console.error(`[Event Generation] INVALID: fill_blank question ${qIdx + 1} in lesson ${idx + 1} - correctAnswer "${correctStr}" not found in options`);
                    hasInvalidQuestions = true;
                  }
                }
              }
              
              // Shuffle options for fill_blank and multiple_choice
              let processedOptions = q.options;
              let processedCorrectAnswer = q.correctAnswer;
              
              if (questionType === 'fill_blank' && q.options && Array.isArray(q.options) && q.options.length >= 2) {
                const { shuffledOptions } = shuffleFillBlankOptions(q.options, String(q.correctAnswer || ''));
                processedOptions = shuffledOptions;
              } else if (questionType === 'multiple_choice' && q.options && Array.isArray(q.options) && q.options.length >= 2) {
                const correctIdx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
                const { shuffledOptions, newCorrectIndex } = shuffleMultipleChoiceOptions(q.options, correctIdx);
                processedOptions = shuffledOptions;
                processedCorrectAnswer = newCorrectIndex;
              }
              
              return {
                ...q,
                id: q.id || `q${qIdx + 1}`,
                type: questionType,
                correctAnswer: processedCorrectAnswer !== undefined ? processedCorrectAnswer : 0,
                explanation: q.explanation || "Resposta correta!",
                options: questionType !== 'true_false' ? (processedOptions || []) : undefined
              };
            })
          }));
          
          // If any questions are invalid, try the next key
          if (hasInvalidQuestions) {
            console.warn(`[Event Generation] Key ${keyNum} returned questions with missing/invalid options, trying next key...`);
            continue;
          }
          
          return parsed;
        }
      }
      
      console.warn(`[Event Generation] Key ${keyNum} returned invalid format, trying next...`);
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.log(`[Event Generation] Key ${keyNum} quota exceeded, trying next...`);
        continue;
      } else {
        console.error(`[Event Generation] Key ${keyNum} error:`, error?.message);
      }
    }
  }
  
  markQuotaExhausted();
  throw new Error("Não foi possível gerar o conteúdo. Todas as chaves de IA estão esgotadas.");
}

export async function generateTimedQuizWithAI(count: number = 5): Promise<Array<{ question: string; options: string[]; correctIndex: number }> | null> {
  if (!isAIConfigured()) {
    console.log("[Timed Quiz] AI not configured, cannot generate");
    return null;
  }
  
  const dateStr = new Date().toISOString().split('T')[0];
  const randomSeed = Math.floor(Math.random() * 1000);
  
  const systemPrompt = "Você é um especialista em quizzes bíblicos rápidos e cronometrados.";
  const userPrompt = `Gere ${count} perguntas RÁPIDAS e OBJETIVAS para um quiz cronometrado.

REGRAS IMPORTANTES:
- Data atual: ${dateStr} - as perguntas devem ser ÚNICAS para esta data
- Use o seed ${randomSeed} para garantir máxima variedade
- As perguntas devem ser SIMPLES e ter respostas DIRETAS
- Foque em fatos básicos: números, nomes, lugares, eventos, livros da Bíblia
- Cada pergunta deve poder ser respondida em menos de 5 segundos
- Cada pergunta deve ter exatamente 4 opções curtas
- A resposta correta NÃO deve ser sempre a opção 0 - varie o correctIndex
- Inclua perguntas variadas (não apenas as óbvias como "quem construiu a arca")

Formato JSON (OBRIGATÓRIO):
{
  "questions": [
    {"question": "Pergunta curta e direta?", "options": ["opção1", "opção2", "opção3", "opção4"], "correctIndex": 0}
  ]
}`;
  
  // Try each key (1-5) - generateWithGemini handles model fallback internally (gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-lite)
  for (let keyNum = 1; keyNum <= 5; keyNum++) {
    try {
      console.log(`[Timed Quiz] Trying key ${keyNum} (all models: gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-lite)...`);
      const text = await generateWithGemini(systemPrompt, userPrompt, keyNum.toString());
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.questions && parsed.questions.length >= count) {
          console.log(`[Timed Quiz] Successfully generated ${parsed.questions.length} questions (key ${keyNum})`);
          return parsed.questions.slice(0, count);
        }
      }
      console.log(`[Timed Quiz] Key ${keyNum} returned invalid format, trying next key...`);
    } catch (error: any) {
      if (isQuotaError(error)) {
        console.log(`[Timed Quiz] Key ${keyNum} quota exceeded, trying next key...`);
        continue;
      } else {
        console.error(`[Timed Quiz] Key ${keyNum} error:`, error?.message);
        // For non-quota errors, try next key
        continue;
      }
    }
  }
  
  console.error("[Timed Quiz] FAILED - All keys exhausted, returning null (NO FALLBACK)");
  return null;
}
