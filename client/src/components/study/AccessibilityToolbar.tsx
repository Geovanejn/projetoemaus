import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Type, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccessibilityToolbarProps {
  textContent: string;
  className?: string;
}

const FONT_SIZE_KEY = "deo_glory_font_size";
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 24;
const FONT_SIZE_STEP = 2;

const isBrowser = typeof window !== "undefined";
const hasSpeechSynthesis = isBrowser && "speechSynthesis" in window;

function getStoredFontSize(): number {
  if (!isBrowser) return DEFAULT_FONT_SIZE;
  try {
    const stored = localStorage.getItem(FONT_SIZE_KEY);
    if (stored) {
      const size = parseInt(stored, 10);
      if (size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE) {
        return size;
      }
    }
  } catch (e) {
    console.error("Error reading font size:", e);
  }
  return DEFAULT_FONT_SIZE;
}

function storeFontSize(size: number): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(FONT_SIZE_KEY, size.toString());
  } catch (e) {
    console.error("Error storing font size:", e);
  }
}

function normalizeTextForSpeech(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "e")
    .replace(/&lt;/g, "menor que")
    .replace(/&gt;/g, "maior que")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function AccessibilityToolbar({ textContent, className }: AccessibilityToolbarProps) {
  const [fontSize, setFontSize] = useState(getStoredFontSize);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (isBrowser) {
      document.documentElement.style.setProperty("--study-font-size", `${fontSize}px`);
      storeFontSize(fontSize);
    }
  }, [fontSize]);

  useEffect(() => {
    if (!hasSpeechSynthesis) return;
    
    const handleEnd = () => setIsSpeaking(false);
    window.speechSynthesis.addEventListener?.("end", handleEnd);
    return () => {
      window.speechSynthesis.removeEventListener?.("end", handleEnd);
      window.speechSynthesis.cancel();
    };
  }, []);

  const cycleFontSize = useCallback(() => {
    setFontSize(prev => {
      const next = prev + FONT_SIZE_STEP;
      return next > MAX_FONT_SIZE ? MIN_FONT_SIZE : next;
    });
  }, []);

  const toggleSpeech = useCallback(() => {
    if (!hasSpeechSynthesis) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const normalizedText = normalizeTextForSpeech(textContent);
      if (normalizedText) {
        const utterance = new SpeechSynthesisUtterance(normalizedText);
        utterance.lang = "pt-BR";
        utterance.rate = 0.9;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  }, [textContent, isSpeaking]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="bg-blue-500/20 dark:bg-blue-600/30 rounded-lg p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleFontSize}
          className="h-8 w-8 text-blue-700 dark:text-blue-300"
          data-testid="button-font-size"
          title={`Tamanho: ${fontSize}px (clique para aumentar)`}
        >
          <Type className="h-4 w-4" />
        </Button>
      </div>

      {hasSpeechSynthesis && (
        <div className="bg-blue-500/20 dark:bg-blue-600/30 rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSpeech}
            className={cn("h-8 w-8 text-blue-700 dark:text-blue-300", isSpeaking && "text-blue-900 dark:text-blue-100")}
            data-testid="button-text-to-speech"
            title={isSpeaking ? "Parar leitura" : "Ler em voz alta"}
          >
            {isSpeaking ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

export function useStudyFontSize() {
  const [fontSize, setFontSize] = useState(getStoredFontSize);

  useEffect(() => {
    if (!isBrowser) return;
    
    const handleStorageChange = () => {
      setFontSize(getStoredFontSize());
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return fontSize;
}
