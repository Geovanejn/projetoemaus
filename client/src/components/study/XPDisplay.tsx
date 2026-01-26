import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface XPDisplayProps {
  amount: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function XPDisplay({ 
  amount, 
  className,
  showLabel = false,
  size = "md"
}: XPDisplayProps) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const iconClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <div className={cn("flex items-center gap-1", className)} data-testid="xp-display">
      <Zap className={cn(iconClasses[size], "fill-amber-400 text-amber-500")} />
      <span className={cn("font-semibold text-amber-600 dark:text-amber-400", sizeClasses[size])}>
        {amount.toLocaleString()}
      </span>
      {showLabel && <span className={cn("text-muted-foreground", sizeClasses[size])}>XP</span>}
    </div>
  );
}
