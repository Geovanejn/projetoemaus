import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, BookOpen, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

function FormattedText({ content }: { content: string }) {
  if (!content) return null;
  
  const isHtml = content.includes('<') && content.includes('>');
  const isJson = content.startsWith('{') || content.startsWith('[');
  
  if (isHtml) {
    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    );
  }
  
  if (isJson) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.content) {
        const extractText = (node: any): string => {
          if (typeof node === 'string') return node;
          if (node.text) return node.text;
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join('');
          }
          return '';
        };
        const text = parsed.content.map(extractText).join('\n\n');
        return <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{text}</ReactMarkdown></div>;
      }
    } catch (e) {
      // Not valid JSON, fall through to markdown
    }
  }
  
  return <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{content}</ReactMarkdown></div>;
}

interface StudySection {
  type: "verse" | "topic" | "conclusion";
  title?: string;
  content: string;
  reference?: string;
  topicNumber?: number;
}

interface StudyContentProps {
  lessonTitle: string;
  sections: StudySection[];
  onComplete: () => void;
  onProgress?: (current: number, total: number) => void;
}

function VerseSection({ title, reference, content }: { title?: string; reference?: string; content: string }) {
  return (
    <div className="flex flex-col h-full px-6 py-4 overflow-y-auto">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-4">
          <BookOpen className="h-10 w-10 mx-auto text-primary mb-3" />
          <p className="text-sm font-bold text-primary uppercase tracking-wide">
            {title || "Versiculo Base"}
          </p>
        </div>
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="text-xl text-foreground italic text-center leading-relaxed">
            <FormattedText content={`"${content}"`} />
          </div>
          {reference && (
            <p className="text-sm font-bold text-primary mt-4 text-center">
              - {reference}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

function TopicSection({ title, content, topicNumber }: { title: string; content: string; topicNumber?: number }) {
  return (
    <div className="flex flex-col h-full px-6 py-4 overflow-y-auto">
      <div className="max-w-md mx-auto w-full">
        <div className="mb-4">
          {topicNumber !== undefined && topicNumber > 0 && (
            <p className="text-sm font-bold text-primary uppercase tracking-wide mb-2">
              Topico {topicNumber}
            </p>
          )}
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
        </div>
        <Card className="p-5">
          <div className="text-foreground leading-relaxed">
            <FormattedText content={content} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function ConclusionSection({ title, content }: { title?: string; content: string }) {
  return (
    <div className="flex flex-col h-full px-6 py-4 overflow-y-auto">
      <div className="max-w-md mx-auto w-full">
        <p className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-4 text-center">
          {title || "Conclusao"}
        </p>
        <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="text-foreground leading-relaxed">
            <FormattedText content={content} />
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StudyContent({ lessonTitle, sections: rawSections, onComplete, onProgress }: StudyContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const sections = rawSections.length > 0 ? rawSections : [
    { type: "topic" as const, title: lessonTitle, content: "Conteúdo não disponível." }
  ];
  
  const totalSections = sections.length;
  
  // Report progress to parent whenever currentIndex changes
  useEffect(() => {
    if (onProgress) {
      onProgress(currentIndex + 1, totalSections);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, totalSections]);
  
  const currentSection = sections[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSections - 1;
  
  const goNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const goPrev = () => {
    if (!isFirst) {
      setCurrentIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const renderSection = (section: StudySection) => {
    switch (section.type) {
      case "verse":
        return <VerseSection title={section.title} reference={section.reference} content={section.content} />;
      case "topic":
        return <TopicSection title={section.title || ""} content={section.content} topicNumber={section.topicNumber} />;
      case "conclusion":
        return <ConclusionSection title={section.title} content={section.content} />;
      default:
        return null;
    }
  };
  
  return (
    <div className="flex flex-col h-full" data-testid="study-content">
      <div className="flex items-center justify-center gap-1 py-3 border-b">
        {sections.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              idx === currentIndex ? "bg-primary w-6" : idx < currentIndex ? "bg-primary/60" : "bg-muted"
            )}
          />
        ))}
      </div>
      
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            {renderSection(currentSection)}
          </motion.div>
        </AnimatePresence>
      </div>
      
      <div className="p-4 border-t">
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            onClick={goPrev}
            disabled={isFirst}
            className={cn("h-12 w-12 rounded-full", isFirst && "opacity-30")}
            data-testid="button-prev"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="flex flex-col items-center">
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} de {totalSections}
            </p>
            {isLast && (
              <Button
                onClick={goNext}
                size="sm"
                className="mt-2"
                data-testid="button-complete-study"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Concluir Estudo
              </Button>
            )}
          </div>
          
          <Button
            variant={isLast ? "outline" : "default"}
            size="icon"
            onClick={goNext}
            disabled={isLast}
            className={cn("h-12 w-12 rounded-full", isLast && "opacity-30")}
            data-testid="button-next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export type { StudySection };
