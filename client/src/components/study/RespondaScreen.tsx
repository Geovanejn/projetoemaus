import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Settings, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useSoundEffects } from "@/hooks/use-sound-effects";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Volume2, Type } from "lucide-react";

interface QuizQuestion {
  type: "multiple_choice" | "true_false" | "fill_blank";
  question: string;
  options?: string[];
  correctIndex?: number;
  correctAnswer?: string | boolean;
  hint?: string;
  explanation?: string;
  category?: string;
  unitId?: number;
}

interface RespondaScreenProps {
  lessonTitle: string;
  questions: QuizQuestion[];
  streak: number;
  hearts?: number;
  maxHearts?: number;
  initialQuestionIndex?: number;
  initialCorrectCount?: number;
  onAnswer: (questionIndex: number, answer: any, isCorrect: boolean, unitId?: number) => void;
  onComplete: (correctCount: number, totalQuestions: number) => void;
  onClose: () => void;
  onQuestionChange?: (currentIndex: number) => void;
  showHearts?: boolean;
}

export function RespondaScreen({
  questions,
  hearts = 5,
  maxHearts = 5,
  initialQuestionIndex = 0,
  initialCorrectCount = 0,
  onAnswer,
  onComplete,
  onClose,
  onQuestionChange,
  showHearts = true
}: RespondaScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(initialQuestionIndex);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(initialCorrectCount);
  // Use a ref to track the most up-to-date correct count (avoids stale closure issues)
  const correctCountRef = useRef(initialCorrectCount);
  
  // Sync ref with initialCorrectCount on mount
  useEffect(() => {
    correctCountRef.current = initialCorrectCount;
    setCorrectCount(initialCorrectCount);
  }, [initialCorrectCount]);
  // Track the timeout ID and whether handleNext has already been called for this question
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAdvancedRef = useRef(false);
  const { fontSize, increaseFontSize, speak, isSpeaking } = useAccessibility();

  const { playCorrect, playWrong } = useSoundEffects();
  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  const currentOptions = currentQuestion?.options && currentQuestion.options.length > 0 
    ? currentQuestion.options 
    : (currentQuestion?.type === "true_false" 
        ? ["Falso", "Verdadeiro"] 
        : (currentQuestion?.type === "fill_blank" && currentQuestion.correctAnswer 
            ? [
                String(currentQuestion.correctAnswer),
                "Renovar",
                "Seguir",
                "Praticar"
              ] 
            : []));

  // Store onQuestionChange in a ref to avoid re-triggering the effect
  const onQuestionChangeRef = useRef(onQuestionChange);
  onQuestionChangeRef.current = onQuestionChange;
  
  useEffect(() => {
    // Only reset state when question index actually changes
    onQuestionChangeRef.current?.(currentIndex);
    setSelectedAnswer(null);
    setShowResult(false);
    // Reset the advance guard when moving to a new question
    hasAdvancedRef.current = false;
    // Clear any pending timeout when question changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [currentIndex]); // Only depend on currentIndex, not the callback

  useEffect(() => {
    if (!currentQuestion) return;
    
    if (currentQuestion.type === "true_false" && (!currentQuestion.options || currentQuestion.options.length === 0)) {
      currentQuestion.options = ["Falso", "Verdadeiro"];
    }
  }, [currentQuestion, currentIndex]);

  const checkAnswer = () => {
    let isCorrect: boolean;
    
    if (currentQuestion.type === "multiple_choice") {
      if (currentQuestion.correctIndex !== undefined && currentQuestion.correctIndex !== null) {
        isCorrect = selectedAnswer === currentQuestion.correctIndex;
      } else if (currentQuestion.correctAnswer !== undefined && selectedAnswer !== null) {
        const selectedText = String(currentOptions[selectedAnswer]).trim().toLowerCase();
        const correctText = String(currentQuestion.correctAnswer).trim().toLowerCase();
        isCorrect = selectedText === correctText;
      } else {
        isCorrect = false;
      }
    } else if (currentQuestion.type === "true_false") {
      isCorrect = currentQuestion.correctIndex !== undefined
        ? selectedAnswer === currentQuestion.correctIndex
        : (selectedAnswer === 1) === (String(currentQuestion.correctAnswer).toLowerCase() === "true" || currentQuestion.correctAnswer === true);
    } else if (currentQuestion.type === "fill_blank") {
      isCorrect = currentQuestion.correctIndex !== undefined
        ? selectedAnswer === currentQuestion.correctIndex
        : String(currentOptions[selectedAnswer as number]).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase();
    } else {
      isCorrect = false;
    }
    
    // For fill_blank, send the text of the selected option instead of the index
    // This allows the server to compare text properly
    const answerToSend = currentQuestion.type === 'fill_blank' && selectedAnswer !== null
      ? currentOptions[selectedAnswer]
      : selectedAnswer;
    
    onAnswer(currentIndex, answerToSend, isCorrect, currentQuestion.unitId);
    
    const nextIndex = currentIndex + 1;
    const isLastQuestion = currentIndex >= totalQuestions - 1;
    
    let newCorrectCount = correctCountRef.current;
    if (isCorrect) {
      newCorrectCount = correctCountRef.current + 1;
      correctCountRef.current = newCorrectCount;
    }
    
    flushSync(() => {
      setShowResult(true);
      if (isCorrect) {
        setCorrectCount(newCorrectCount);
      }
    });
    
    if (isCorrect) {
      try { playCorrect(); } catch (e) { /* silent */ }
    } else {
      try { playWrong(); } catch (e) { /* silent */ }
    }
    
    window.setTimeout(() => {
      if (isLastQuestion) {
        onComplete(correctCountRef.current, totalQuestions);
      } else {
        setCurrentIndex(nextIndex);
      }
    }, 1000);
  };

  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FC] dark:bg-zinc-950">
      <div 
        className="relative px-6 pt-4 pb-6 rounded-b-[24px] overflow-hidden shadow-sm"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #f472b6 100%)' }}
      >
        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-3">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-white/80 text-[9px] font-bold uppercase tracking-wider">Questão</p>
              <p className="text-white text-xl font-black">{currentIndex + 1} / {totalQuestions}</p>
            </div>
            <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <Settings className="h-4 w-4" />
            </button>
          </div>

          {showHearts && (
            <div className="flex gap-1 mb-3">
              {Array.from({ length: maxHearts }).map((_, i) => (
                <Heart key={i} className={cn("h-4 w-4", i < hearts ? "text-[#FF4B4B] fill-[#FF4B4B]" : "text-white/30")} />
              ))}
            </div>
          )}

          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
              className="h-full bg-white rounded-full"
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto w-full px-4 -mt-3 flex-1 flex flex-col pb-6">
        <motion.div 
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="flex-1 flex flex-col"
        >
          <Card className="border-0 shadow-sm rounded-[20px] bg-white dark:bg-zinc-900 p-5 mb-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center text-white font-bold text-xs">?</div>
              <span className="text-[#7c3aed] text-[9px] font-black uppercase tracking-widest">Responda</span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={() => increaseFontSize()} className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Type className="h-4 w-4 text-zinc-500" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => speak(currentQuestion.question)} 
                className={cn(
                  "h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                  isSpeaking && "bg-purple-100 dark:bg-purple-900/40 text-purple-600 shadow-inner"
                )}
              >
                <Volume2 className={cn("h-4 w-4 text-zinc-500", isSpeaking && "text-purple-600")} />
              </Button>
            </div>
          </div>
          <h3 className="font-bold text-[#2D3142] dark:text-zinc-100 leading-snug"
              style={{ fontSize: `${fontSize}px` }}>
            {currentQuestion.type === "fill_blank" ? (
              <span className="inline">
                {(currentQuestion.question || "").split(/_{2,}|\[\.{3}\]/).map((part, i, arr) => (
                  <span key={`${currentIndex}-part-${i}`} className="inline">
                    {part}
                    {i < arr.length - 1 && (
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[36px] h-[22px] px-2 border-2 rounded-md transition-all text-[10px] font-bold mx-1 align-middle",
                        selectedAnswer !== null 
                          ? "border-[#7c3aed] bg-[#7c3aed]/10 text-[#7c3aed] shadow-sm" 
                          : "border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      )}>
                        {selectedAnswer !== null ? currentOptions[selectedAnswer] : ""}
                      </span>
                    )}
                  </span>
                ))}
              </span>
            ) : (
              currentQuestion.question
            )}
          </h3>
        </Card>

        <div className={cn(
          "mb-8",
          currentQuestion.type === "true_false" ? "grid grid-cols-2 gap-4" : "space-y-2"
        )}>
          {currentOptions.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            // Fix: Check correctIndex first, then fallback to correctAnswer comparison
            let isThisOptionCorrect: boolean;
            if (currentQuestion.type === "multiple_choice") {
              // For multiple_choice: use correctIndex if defined, otherwise try correctAnswer string match
              if (currentQuestion.correctIndex !== undefined && currentQuestion.correctIndex !== null) {
                isThisOptionCorrect = idx === currentQuestion.correctIndex;
              } else if (currentQuestion.correctAnswer !== undefined) {
                // Fallback: compare option text with correctAnswer
                isThisOptionCorrect = String(option).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase();
              } else {
                isThisOptionCorrect = false;
              }
            } else if (currentQuestion.type === "true_false") {
              isThisOptionCorrect = currentQuestion.correctIndex !== undefined 
                ? idx === currentQuestion.correctIndex
                : (idx === 1) === (String(currentQuestion.correctAnswer).toLowerCase() === "true" || currentQuestion.correctAnswer === true);
            } else if (currentQuestion.type === "fill_blank") {
              // For fill_blank: use correctIndex if available, otherwise string comparison
              isThisOptionCorrect = currentQuestion.correctIndex !== undefined
                ? idx === currentQuestion.correctIndex
                : String(option).trim().toLowerCase() === String(currentQuestion.correctAnswer).trim().toLowerCase();
            } else {
              isThisOptionCorrect = false;
            }
            
            const showCorrect = showResult && isThisOptionCorrect;
            const showIncorrect = showResult && isSelected && !isThisOptionCorrect;
            
            // Feedback classes for correct/incorrect states
            const feedbackClasses = showCorrect 
              ? "border-[#22C55E] bg-[#F0FDF4] dark:bg-[#064E3B]/20 text-[#166534] dark:text-[#4ADE80]" 
              : showIncorrect 
                ? "border-[#EF4444] bg-[#FEF2F2] dark:bg-[#7F1D1D]/20 text-[#991B1B] dark:text-[#FCA5A5]"
                : (!showResult && isSelected) 
                  ? "border-[#7c3aed] bg-[#7c3aed]/5 text-[#7c3aed]" 
                  : "border-white dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-[#4B5563] dark:text-zinc-300";

            return (
              <button
                key={`${currentIndex}-${idx}`}
                onClick={() => !showResult && setSelectedAnswer(idx)}
                disabled={showResult}
                className={cn(
                  "p-3 rounded-[16px] text-left transition-all border-2 flex items-center gap-3 min-h-[52px]",
                  currentQuestion.type === "true_false" ? "flex-col justify-center text-center py-6" : "w-full",
                  feedbackClasses
                )}
              >
                {(currentQuestion.type === "multiple_choice" || currentQuestion.type === "fill_blank") && (
                  <div className={cn(
                    "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs border-2",
                    showCorrect
                      ? "bg-[#22C55E] text-white border-[#22C55E]"
                      : showIncorrect
                        ? "bg-[#EF4444] text-white border-[#EF4444]"
                        : (!showResult && isSelected)
                          ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                          : "bg-[#F8F9FC] dark:bg-zinc-800 text-[#2D3142] dark:text-zinc-100 border-[#F0F2F5] dark:border-zinc-700"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                )}
                <span className={cn(
                  "font-bold text-[14px] leading-tight",
                  currentQuestion.type === "true_false" ? "text-lg" : "text-[#4B5563]"
                )}>
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {!showResult && (
            <Button
              onClick={checkAnswer}
              disabled={selectedAnswer === null}
              className="w-full h-[52px] rounded-[16px] bg-gradient-to-r from-[#7c3aed] to-[#f472b6] text-white text-base font-bold shadow-md border-0"
            >
              Confirmar Resposta
            </Button>
          )}
        </div>
        </motion.div>
      </div>
    </div>
  );
}
