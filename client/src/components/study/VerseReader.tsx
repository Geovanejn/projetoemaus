import { useState } from "react";
import { motion } from "framer-motion";
import { Book, Heart, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface Verse {
  id: number;
  reference: string;
  text: string;
  reflection?: string;
}

interface VerseReaderProps {
  verse: Verse;
  onComplete: (verseId: number) => void;
  className?: string;
}

export function VerseReader({ verse, onComplete, className }: VerseReaderProps) {
  const [isRead, setIsRead] = useState(false);
  const [showReflection, setShowReflection] = useState(false);

  const handleComplete = () => {
    if (!isRead) return;
    onComplete(verse.id);
  };

  return (
    <Card className={cn("overflow-hidden", className)} data-testid={`verse-reader-${verse.id}`}>
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 flex items-center gap-3">
        <Book className="h-6 w-6 text-white" />
        <div>
          <p className="text-white font-bold">{verse.reference}</p>
          <p className="text-white/80 text-sm">Leia para recuperar 1 vida</p>
        </div>
        <Heart className="h-5 w-5 text-red-300 fill-red-300 ml-auto" />
      </div>

      <div className="p-4">
        <p className="text-foreground text-lg leading-relaxed italic mb-4">
          "{verse.text}"
        </p>

        {verse.reflection && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReflection(!showReflection)}
              className="mb-2"
              data-testid="button-toggle-reflection"
            >
              {showReflection ? "Esconder reflexão" : "Ver reflexão"}
            </Button>
            
            {showReflection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-muted rounded-lg p-3 mb-4"
              >
                <p className="text-sm text-muted-foreground">{verse.reflection}</p>
              </motion.div>
            )}
          </>
        )}

        <div className="flex items-center gap-3 pt-4 border-t">
          <Checkbox
            id={`read-${verse.id}`}
            checked={isRead}
            onCheckedChange={(checked) => setIsRead(checked as boolean)}
            data-testid="checkbox-read-verse"
          />
          <label
            htmlFor={`read-${verse.id}`}
            className="text-sm text-foreground cursor-pointer"
          >
            Li e refleti sobre este versículo
          </label>
        </div>

        <Button
          onClick={handleComplete}
          disabled={!isRead}
          className={cn(
            "w-full mt-4 py-5 font-bold",
            isRead ? "bg-green-500 hover:bg-green-600" : ""
          )}
          data-testid="button-complete-verse"
        >
          {isRead ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              RECUPERAR VIDA
            </span>
          ) : (
            "Marque como lido para continuar"
          )}
        </Button>
      </div>
    </Card>
  );
}

interface VerseListProps {
  verses: Verse[];
  currentHearts: number;
  maxHearts: number;
  onVerseComplete: (verseId: number) => void;
}

export function VerseList({ 
  verses, 
  currentHearts, 
  maxHearts, 
  onVerseComplete 
}: VerseListProps) {
  const needsHearts = currentHearts < maxHearts;

  return (
    <div className="space-y-4" data-testid="verse-list">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          {Array.from({ length: maxHearts }).map((_, i) => (
            <Heart
              key={i}
              className={cn(
                "h-6 w-6 transition-colors",
                i < currentHearts 
                  ? "fill-red-500 text-red-500" 
                  : "fill-gray-200 text-gray-300 dark:fill-gray-700"
              )}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {needsHearts 
            ? `Leia versículos para recuperar ${maxHearts - currentHearts} vida${maxHearts - currentHearts > 1 ? 's' : ''}`
            : "Suas vidas estão cheias!"
          }
        </p>
      </div>

      {needsHearts ? (
        <div className="space-y-4">
          {verses.map((verse) => (
            <VerseReader
              key={verse.id}
              verse={verse}
              onComplete={onVerseComplete}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">
            Você está com as vidas cheias!
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Continue estudando para ganhar mais XP
          </p>
        </Card>
      )}
    </div>
  );
}
