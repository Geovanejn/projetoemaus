import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

interface CrystalDisplayProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showBalance?: boolean;
}

function CrystalIcon({ size }: { size: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  return (
    <svg 
      viewBox="0 0 24 24" 
      className={cn(sizeClasses[size], "transition-all duration-300")}
    >
      <defs>
        <linearGradient id="crystalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <filter id="crystalGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="glow"/>
          <feMerge>
            <feMergeNode in="glow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <polygon
        points="12,2 22,8 22,16 12,22 2,16 2,8"
        fill="url(#crystalGradient)"
        filter="url(#crystalGlow)"
        stroke="#8B5CF6"
        strokeWidth="0.5"
      />
      <polygon
        points="12,2 17,5 17,11 12,14 7,11 7,5"
        fill="rgba(255,255,255,0.3)"
      />
      <line 
        x1="12" y1="2" 
        x2="12" y2="22" 
        stroke="rgba(255,255,255,0.2)" 
        strokeWidth="0.5"
      />
      <line 
        x1="2" y1="8" 
        x2="22" y2="16" 
        stroke="rgba(255,255,255,0.1)" 
        strokeWidth="0.5"
      />
    </svg>
  );
}

interface CrystalsData {
  balance: number;
  freezesAvailable: number;
  currentStreak: number;
  longestStreak: number;
  nextFreezeCost: number;
}

export function CrystalDisplay({ 
  className,
  size = "md",
  showBalance = true
}: CrystalDisplayProps) {
  const { isAuthenticated } = useAuth();
  
  const { data: crystalsData } = useQuery<CrystalsData>({
    queryKey: ['/api/study/crystals'],
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const balance = crystalsData?.balance ?? 0;

  return (
    <motion.div 
      className={cn("flex items-center gap-1", className)} 
      data-testid="crystal-display"
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        animate={{ 
          rotate: [0, 5, -5, 0],
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          repeatDelay: 3
        }}
      >
        <CrystalIcon size={size} />
      </motion.div>
      {showBalance && (
        <span 
          className={cn("font-bold text-purple-600 dark:text-purple-400", textClasses[size])}
          data-testid="text-crystal-balance"
        >
          {balance}
        </span>
      )}
    </motion.div>
  );
}

export function CrystalBalanceCard({ className }: { className?: string }) {
  const { isAuthenticated } = useAuth();
  
  const { data: crystalsData, isLoading } = useQuery<CrystalsData>({
    queryKey: ['/api/study/crystals'],
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  if (isLoading || !crystalsData) {
    return null;
  }

  return (
    <div className={cn("flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800", className)}>
      <div className="flex items-center gap-2">
        <CrystalIcon size="lg" />
        <div>
          <p className="font-bold text-purple-700 dark:text-purple-300">
            {crystalsData.balance} Cristais
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400">
            {crystalsData.freezesAvailable} congelamentos disponíveis
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Próximo congelamento</p>
        <p className="font-bold text-purple-600 dark:text-purple-400">
          {crystalsData.nextFreezeCost} cristais
        </p>
      </div>
    </div>
  );
}
