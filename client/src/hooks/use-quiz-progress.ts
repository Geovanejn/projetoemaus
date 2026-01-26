import { useState, useEffect, useCallback, useRef } from 'react';

interface QuizProgress {
  questionIndex: number;
  correctCount: number;
  totalAnswered: number;
  answers: Record<number, { answer: any; isCorrect: boolean }>;
}

interface UseQuizProgressOptions {
  lessonType: 'weekly' | 'pdf' | 'event';
  lessonId: string | number;
  totalQuestions: number;
}

const STORAGE_KEY_PREFIX = 'quiz_progress_';

function getStorageKey(lessonType: string, lessonId: string | number): string {
  return `${STORAGE_KEY_PREFIX}${lessonType}_${lessonId}`;
}

export function useQuizProgress({ lessonType, lessonId, totalQuestions }: UseQuizProgressOptions) {
  const storageKey = getStorageKey(lessonType, lessonId);
  
  const [progress, setProgress] = useState<QuizProgress>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[QuizProgress] Restored from localStorage:', parsed);
        return parsed;
      }
    } catch (e) {
      console.error('[QuizProgress] Failed to load from localStorage:', e);
    }
    return {
      questionIndex: 0,
      correctCount: 0,
      totalAnswered: 0,
      answers: {}
    };
  });

  const progressRef = useRef(progress);
  progressRef.current = progress;

  const saveToStorage = useCallback((newProgress: QuizProgress) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newProgress));
      console.log('[QuizProgress] Saved to localStorage:', newProgress);
    } catch (e) {
      console.error('[QuizProgress] Failed to save to localStorage:', e);
    }
  }, [storageKey]);

  const recordAnswer = useCallback((questionIndex: number, answer: any, isCorrect: boolean) => {
    setProgress(prev => {
      const alreadyAnswered = prev.answers[questionIndex] !== undefined;
      
      const newProgress: QuizProgress = {
        ...prev,
        answers: {
          ...prev.answers,
          [questionIndex]: { answer, isCorrect }
        },
        correctCount: alreadyAnswered 
          ? prev.correctCount 
          : (isCorrect ? prev.correctCount + 1 : prev.correctCount),
        totalAnswered: alreadyAnswered ? prev.totalAnswered : prev.totalAnswered + 1
      };
      
      saveToStorage(newProgress);
      return newProgress;
    });
  }, [saveToStorage]);

  const updateQuestionIndex = useCallback((index: number) => {
    setProgress(prev => {
      const newProgress = { ...prev, questionIndex: index };
      saveToStorage(newProgress);
      return newProgress;
    });
  }, [saveToStorage]);

  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      console.log('[QuizProgress] Cleared from localStorage');
    } catch (e) {
      console.error('[QuizProgress] Failed to clear from localStorage:', e);
    }
    setProgress({
      questionIndex: 0,
      correctCount: 0,
      totalAnswered: 0,
      answers: {}
    });
  }, [storageKey]);

  const isComplete = progress.totalAnswered >= totalQuestions;

  return {
    questionIndex: progress.questionIndex,
    correctCount: progress.correctCount,
    totalAnswered: progress.totalAnswered,
    answers: progress.answers,
    isComplete,
    recordAnswer,
    updateQuestionIndex,
    clearProgress,
    getProgress: () => progressRef.current
  };
}
