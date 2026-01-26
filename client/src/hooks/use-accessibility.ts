import { useState, useRef, useMemo } from "react";

const hasSpeechSynthesis = typeof window !== "undefined" && "speechSynthesis" in window;

export function useAccessibility() {
  const [fontSize, setFontSize] = useState(16);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  const canSpeak = useMemo(() => hasSpeechSynthesis, []);

  const increaseFontSize = () => {
    setFontSize((prev) => (prev >= 24 ? 16 : prev + 2));
  };

  const speak = (text: string) => {
    if (hasSpeechSynthesis) {
      if (window.speechSynthesis.speaking && isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utteranceRef.current = utterance;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  return {
    fontSize,
    increaseFontSize,
    speak,
    isSpeaking,
    canSpeak,
  };
}
