import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StartButtonProps {
  onClick?: () => void;
  className?: string;
  position?: "left" | "right";
}

export function StartButton({ onClick, className, position = "right" }: StartButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: position === "right" ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "absolute z-20",
        position === "right" ? "left-full ml-4" : "right-full mr-4",
        className
      )}
    >
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "relative flex items-center justify-center",
          "px-5 py-2.5 rounded-2xl",
          "bg-white border-2 border-[#58CC02]",
          "text-[#58CC02] font-black text-sm uppercase tracking-wide",
          "shadow-[0_4px_0_0_#e5e5e5]",
          "hover:shadow-[0_2px_0_0_#e5e5e5] hover:translate-y-[2px]",
          "active:shadow-none active:translate-y-[4px]",
          "transition-all duration-100"
        )}
        data-testid="button-start-lesson"
      >
        <span className="relative flex items-center gap-2">
          Comecar
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {">"}
          </motion.span>
        </span>
      </motion.button>
      
      <svg
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-3 h-3",
          position === "right" ? "-left-3" : "-right-3 rotate-180"
        )}
        viewBox="0 0 12 12"
      >
        <path
          d="M0 6 L12 0 L12 12 Z"
          fill="#58CC02"
        />
      </svg>
    </motion.div>
  );
}
