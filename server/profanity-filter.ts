import { Filter } from "bad-words";

const filter = new Filter();

// Lista expandida de palavras improprias em portugues
const palavrasProibidasPT = [
  // Baixo calao
  "merda", "porra", "caralho", "foda", "fodase", "fodasse", "buceta", "pau", "pinto",
  "rola", "bosta", "cagar", "cagada", "cu", "cuzao", "cuzinho", "cacete", "pqp",
  "fodido", "fodida", "puta", "putaria", "bunda",
  
  // Xingamentos
  "idiota", "imbecil", "retardado", "babaca", "otario", "otaria", "fdp", "filhodaputa",
  "vagabundo", "vagabunda", "vadia", "piranha", "arrombado", "arrombada",
  "corno", "escroto", "nojento", "nojenta", "lixo", "verme",
  
  // Discurso de odio
  "viado", "veado", "bicha", "sapatao", "traveco",
  
  // Religiosos ofensivos (contexto inapropriado)
  "desgraca", "desgraçado", "desgraçada", "maldito", "maldita",
  
  // Variacoes comuns
  "merda", "m3rda", "p0rra", "c4ralho", "put4", "fod4",
];

filter.addWords(...palavrasProibidasPT);

export interface ModerationResult {
  hasProfanity: boolean;
  hasHateSpeech: boolean;
  hasSexualContent: boolean;
  cleanedText: string;
  details?: string;
}

const hateSpeechPatterns = [
  /\b(nazi|hitler|ku\s*klux|kkk|supremacist|racis(ta|mo))\b/gi,
  /\b(morte\s+a|matar|exterminar)\b/gi,
  /\b(macaco|negrada|pretinho)\b/gi,
  /\b(viado|bicha|sapatao|traveco)\b/gi,
];

const sexualContentPatterns = [
  /\b(porn[oô]|sexo|transar|gozar|orgasmo)\b/gi,
  /\b(penis|vagina|seios|peito|bunda)\b/gi,
  /\b(nude|pelado|pelada|nu[ao])\b/gi,
];

export function moderateContent(text: string): ModerationResult {
  const hasProfanity = filter.isProfane(text);
  
  let hasHateSpeech = false;
  for (const pattern of hateSpeechPatterns) {
    if (pattern.test(text)) {
      hasHateSpeech = true;
      break;
    }
  }
  
  let hasSexualContent = false;
  for (const pattern of sexualContentPatterns) {
    if (pattern.test(text)) {
      hasSexualContent = true;
      break;
    }
  }
  
  const cleanedText = filter.clean(text);
  
  const issues: string[] = [];
  if (hasProfanity) issues.push("linguagem impropria");
  if (hasHateSpeech) issues.push("discurso de odio");
  if (hasSexualContent) issues.push("conteudo sexual");
  
  return {
    hasProfanity,
    hasHateSpeech,
    hasSexualContent,
    cleanedText,
    details: issues.length > 0 ? `Problemas detectados: ${issues.join(", ")}` : undefined,
  };
}

export function isProfane(text: string): boolean {
  return filter.isProfane(text);
}

export function cleanText(text: string): string {
  return filter.clean(text);
}

export function shouldAutoReject(result: ModerationResult): boolean {
  return result.hasHateSpeech || result.hasSexualContent;
}

export function needsManualReview(result: ModerationResult): boolean {
  return result.hasProfanity && !result.hasHateSpeech && !result.hasSexualContent;
}
