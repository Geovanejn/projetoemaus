import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, BookOpen, Settings, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Volume2, Type } from "lucide-react";

interface StudySection {
  type: "verse" | "topic" | "conclusion";
  title?: string;
  content: string;
}

interface EstudeScreenProps {
  lessonTitle: string;
  sections: StudySection[];
  onComplete: () => void;
  onClose: () => void;
  initialIndex?: number;
}

export function EstudeScreen({
  lessonTitle,
  sections,
  onComplete,
  onClose,
  initialIndex = 0
}: EstudeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const { fontSize, increaseFontSize, speak, isSpeaking, canSpeak } = useAccessibility();
  
  // Filter out any verse section from the sections passed to slides 1+
  // Slide 0: Verse
  // Slide 1+: Topics (Slide 1 should be Topic 0 from sections, EXCLUDING the verse slide we already have)
  const studySections = sections.filter(s => s.type !== "verse");
  const totalSlides = studySections.length + 1;
  const verseSection = sections.find(s => s.type === "verse") || sections[0];
  const currentSection = currentIndex === 0 ? verseSection : studySections[currentIndex - 1];

  const goNext = () => currentIndex < totalSlides - 1 ? setCurrentIndex(prev => prev + 1) : onComplete();
  const goPrev = () => currentIndex > 0 && setCurrentIndex(prev => prev - 1);

  const handleSpeak = () => {
    if (!currentSection) return;
    const textToSpeak = currentIndex === 0 
      ? `Versículo Base. ${currentSection.content.replace(/<[^>]*>/g, '')}. Referência: ${currentSection.title || ""}`
      : `${currentSection.title || ""}. ${currentSection.content.replace(/<[^>]*>/g, '')}`;
    speak(textToSpeak);
  };

  if (!currentSection) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FC] dark:bg-zinc-950">
      <div className="relative px-6 pt-4 pb-6 rounded-b-[24px] overflow-hidden shadow-sm"
           style={{ background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)' }}>
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-3">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"><ArrowLeft className="h-4 w-4" /></button>
            <div className="text-center">
              <p className="text-white/80 text-[9px] font-bold uppercase tracking-wider">Seção</p>
              <p className="text-white text-xl font-black">{currentIndex + 1} / {totalSlides}</p>
            </div>
            <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"><Settings className="h-4 w-4" /></button>
          </div>
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div animate={{ width: `${((currentIndex + 1) / totalSlides) * 100}%` }} className="h-full bg-white rounded-full" />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto w-full px-4 -mt-3 flex-1 flex flex-col pb-6">
        <Card className="border-0 shadow-sm rounded-[20px] bg-white dark:bg-zinc-900 p-5 mb-10">
          {currentIndex === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center py-6">
              <div className="w-full flex justify-end mb-2">
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => increaseFontSize()} className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="button-font-size-verse">
                    <Type className="h-4 w-4 text-zinc-500" />
                  </Button>
                  {canSpeak && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleSpeak} 
                      className={cn(
                        "h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                        isSpeaking && "bg-blue-100 dark:bg-blue-900/40 text-blue-600 shadow-inner"
                      )}
                      data-testid="button-speak-verse"
                    >
                      <Volume2 className={cn("h-4 w-4 text-zinc-500", isSpeaking && "text-blue-600")} />
                    </Button>
                  )}
                </div>
              </div>
              <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-[20px] border border-blue-100 dark:border-blue-800/30 shadow-sm text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="h-5 w-5" />
                </div>
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Versículo Base</p>
                <p className="italic text-blue-800 dark:text-blue-100 leading-tight font-serif"
                   style={{ fontSize: `${fontSize}px` }}>
                  "{verseSection?.content.replace(/<[^>]*>/g, '') || "Carregando..."}"
                </p>
                {verseSection?.title && (
                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 mt-2">
                    — {verseSection.title}
                  </p>
                )}
              </div>
              <p className="mt-6 text-zinc-400 text-[11px] animate-pulse italic">Toque em Continuar para iniciar o estudo</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white"><BookOpen className="h-4 w-4" /></div>
                  <span className="text-[#2563eb] text-[9px] font-black uppercase tracking-widest">Estude</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => increaseFontSize()} className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="button-font-size">
                    <Type className="h-4 w-4 text-zinc-500" />
                  </Button>
                  {canSpeak && (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleSpeak} 
                      className={cn(
                        "h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                        isSpeaking && "bg-blue-100 dark:bg-blue-900/40 text-blue-600 shadow-inner"
                      )}
                      data-testid="button-speak"
                    >
                      <Volume2 className={cn("h-4 w-4 text-zinc-500", isSpeaking && "text-blue-600")} />
                    </Button>
                  )}
                </div>
              </div>
              <h3 className="text-[17px] font-bold text-[#2D3142] dark:text-zinc-100 mb-3">{currentSection.title || "Tópico de Estudo"}</h3>
              <div className="prose prose-zinc dark:prose-invert max-w-none text-[#4B5563] leading-relaxed"
                   style={{ fontSize: `${fontSize}px` }}
                   dangerouslySetInnerHTML={{ __html: currentSection.content }} />
            </>
          )}
        </Card>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0} className="w-14 h-[52px] rounded-[16px] bg-white border-0 shadow-sm"><ChevronLeft className="h-5 w-5 text-[#2D3142]" /></Button>
          <Button onClick={goNext} className="flex-1 h-[52px] rounded-[16px] bg-[#2563eb] text-white text-base font-bold shadow-md border-0">
            {currentIndex === totalSlides - 1 ? "Finalizar" : "Continuar"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
