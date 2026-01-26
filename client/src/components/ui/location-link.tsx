import { MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationLinkProps {
  name: string;
  url?: string | null;
  className?: string;
  showIcon?: boolean;
  variant?: "default" | "card" | "inline";
}

export function LocationLink({
  name,
  url,
  className,
  showIcon = true,
  variant = "default",
}: LocationLinkProps) {
  if (!name) return null;

  const baseClasses = "inline-flex items-center gap-2 text-muted-foreground";
  
  const variantClasses = {
    default: "hover-elevate active-elevate-2 rounded-md px-3 py-2 -mx-3 -my-2",
    card: "p-4 bg-muted/30 rounded-md w-full justify-center",
    inline: "",
  };

  if (!url) {
    return (
      <div className={cn(baseClasses, className)} data-testid="location-display">
        {showIcon && <MapPin className="h-4 w-4 shrink-0" />}
        <span>{name}</span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        baseClasses,
        variantClasses[variant],
        "text-foreground transition-colors",
        className
      )}
      data-testid="link-location"
    >
      {showIcon && <MapPin className="h-4 w-4 shrink-0 text-primary" />}
      <span className="underline-offset-2 hover:underline">{name}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  );
}

interface LocationCardProps {
  name: string;
  url?: string | null;
  address?: string | null;
  className?: string;
}

export function LocationCard({
  name,
  url,
  address,
  className,
}: LocationCardProps) {
  const content = (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <MapPin className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {url && <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />}
        </div>
        {address && (
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">
            {address}
          </p>
        )}
      </div>
    </div>
  );

  if (!url) {
    return (
      <div className={cn("p-4 bg-muted/30 rounded-lg", className)} data-testid="location-card">
        {content}
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block p-4 bg-muted/30 rounded-lg hover-elevate active-elevate-2 transition-colors",
        className
      )}
      data-testid="link-location-card"
    >
      {content}
    </a>
  );
}
