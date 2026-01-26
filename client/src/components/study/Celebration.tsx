import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  delay: number;
  rotation: number;
  scale: number;
}

interface CelebrationProps {
  show: boolean;
  onComplete?: () => void;
  type?: "confetti" | "stars" | "xp";
}

const colors = [
  "#FFA500", // UMP Orange
  "#FFD700", // Gold
  "#58CC02", // Green
  "#1CB0F6", // Blue
  "#FF4B4B", // Red
  "#FF9600", // Streak Orange
  "#FFE55C", // Light Gold
];

function generateConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.5,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.5,
  }));
}

function ConfettiPieceComponent({ piece }: { piece: ConfettiPiece }) {
  const shapes = ["circle", "square", "triangle"];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];

  return (
    <motion.div
      initial={{
        y: -20,
        x: `${piece.x}vw`,
        rotate: 0,
        opacity: 1,
        scale: piece.scale,
      }}
      animate={{
        y: "110vh",
        rotate: piece.rotation + 720,
        opacity: [1, 1, 0],
      }}
      transition={{
        duration: 2.5 + Math.random(),
        delay: piece.delay,
        ease: "easeOut",
      }}
      className="fixed top-0 z-[100] pointer-events-none"
      style={{ left: 0 }}
    >
      {shape === "circle" && (
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: piece.color }}
        />
      )}
      {shape === "square" && (
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: piece.color }}
        />
      )}
      {shape === "triangle" && (
        <div
          className="w-0 h-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: `12px solid ${piece.color}`,
          }}
        />
      )}
    </motion.div>
  );
}

function StarBurst() {
  return (
    <motion.div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [1, 1, 0],
            x: Math.cos((i * Math.PI) / 4) * 150,
            y: Math.sin((i * Math.PI) / 4) * 150,
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
          className="absolute"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-8 h-8"
            fill={colors[i % colors.length]}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </motion.div>
      ))}
    </motion.div>
  );
}

function XPBurst({ amount = 15 }: { amount?: number }) {
  return (
    <motion.div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 1] }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, ease: "backOut" }}
        className="bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white font-bold text-4xl px-8 py-4 rounded-2xl shadow-2xl border-4 border-[#FFE55C]"
      >
        <motion.span
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          +{amount} XP
        </motion.span>
      </motion.div>
    </motion.div>
  );
}

export function Celebration({ show, onComplete, type = "confetti" }: CelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (show && type === "confetti") {
      setConfetti(generateConfetti(25));
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (show && (type === "stars" || type === "xp")) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [show, type, onComplete]);

  return (
    <AnimatePresence>
      {show && type === "confetti" && (
        <>
          {confetti.map((piece) => (
            <ConfettiPieceComponent key={piece.id} piece={piece} />
          ))}
        </>
      )}
      {show && type === "stars" && <StarBurst />}
      {show && type === "xp" && <XPBurst />}
    </AnimatePresence>
  );
}

export function useCelebration() {
  const [celebrating, setCelebrating] = useState(false);
  const [celebrationType, setCelebrationType] = useState<"confetti" | "stars" | "xp">("confetti");

  const celebrate = (type: "confetti" | "stars" | "xp" = "confetti") => {
    setCelebrationType(type);
    setCelebrating(true);
  };

  const stopCelebration = () => {
    setCelebrating(false);
  };

  return {
    celebrating,
    celebrationType,
    celebrate,
    stopCelebration,
    CelebrationComponent: () => (
      <Celebration 
        show={celebrating} 
        type={celebrationType}
        onComplete={stopCelebration} 
      />
    ),
  };
}
