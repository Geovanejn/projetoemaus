import { cn } from "@/lib/utils";

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
  showText?: boolean;
  height?: "sm" | "md" | "lg";
  color?: "default" | "success" | "warning" | "danger";
}

export function ProgressBar({ 
  current, 
  total, 
  className,
  showText = false,
  height = "md",
  color = "default"
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.floor((current / total) * 100)) : 0;
  
  const heightClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3"
  };

  const colorClasses = {
    default: "bg-primary",
    success: "bg-green-500",
    warning: "bg-amber-500",
    danger: "bg-red-500"
  };

  return (
    <div className={cn("flex items-center gap-2", className)} data-testid="progress-bar">
      <div className={cn("flex-1 bg-secondary rounded-full overflow-hidden", heightClasses[height])}>
        <div 
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            colorClasses[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <span className="text-xs text-muted-foreground font-medium min-w-[3rem] text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}
