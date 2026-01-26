import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shuffles an array deterministically based on a seed value.
 * The same seed will always produce the same shuffle order.
 * This is useful for randomizing question order per lesson while keeping it consistent.
 * @param array The array to shuffle
 * @param seed A number to use as the random seed (e.g., lessonId)
 * @returns A new shuffled array (does not mutate the original)
 */
export function shuffleArrayWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  
  // Simple seeded random number generator (mulberry32)
  const seededRandom = (s: number) => {
    return () => {
      s |= 0;
      s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  
  const random = seededRandom(seed);
  
  // Fisher-Yates shuffle using seeded random
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

export function parseTipTapContent(content: string | undefined | null): string {
  if (!content) return '';
  
  if (!content.trim().startsWith('{')) {
    return content;
  }
  
  try {
    const parsed = JSON.parse(content);
    
    if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
      return extractTextFromTipTap(parsed.content);
    }
    
    return content;
  } catch {
    return content;
  }
}

function extractTextFromTipTap(nodes: any[]): string {
  const texts: string[] = [];
  
  for (const node of nodes) {
    if (node.type === 'text' && node.text) {
      texts.push(node.text);
    } else if (node.type === 'paragraph' && Array.isArray(node.content)) {
      const paragraphText = extractTextFromTipTap(node.content);
      if (paragraphText) texts.push(paragraphText);
    } else if (node.type === 'heading' && Array.isArray(node.content)) {
      const headingText = extractTextFromTipTap(node.content);
      if (headingText) texts.push(headingText);
    } else if (Array.isArray(node.content)) {
      const nestedText = extractTextFromTipTap(node.content);
      if (nestedText) texts.push(nestedText);
    }
  }
  
  return texts.join('\n\n');
}
