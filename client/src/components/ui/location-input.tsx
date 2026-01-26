import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Link as LinkIcon, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationInputProps {
  locationName: string;
  locationUrl: string;
  onLocationNameChange: (name: string) => void;
  onLocationUrlChange: (url: string) => void;
  disabled?: boolean;
  namePlaceholder?: string;
  urlPlaceholder?: string;
  nameLabel?: string;
  urlLabel?: string;
}

export function LocationInput({
  locationName,
  locationUrl,
  onLocationNameChange,
  onLocationUrlChange,
  disabled = false,
  namePlaceholder = "Ex: Igreja Presbiteriana Emaus",
  urlPlaceholder = "https://maps.google.com/...",
  nameLabel = "Nome do Local",
  urlLabel = "Link do Google Maps",
}: LocationInputProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="location-name" className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {nameLabel}
        </Label>
        <Input
          id="location-name"
          value={locationName}
          onChange={(e) => onLocationNameChange(e.target.value)}
          placeholder={namePlaceholder}
          disabled={disabled}
          data-testid="input-location-name"
        />
        <p className="text-xs text-muted-foreground">
          Este nome aparecera como texto clicavel para o usuario
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location-url" className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4" />
          {urlLabel}
        </Label>
        <div className="flex gap-2">
          <Input
            id="location-url"
            value={locationUrl}
            onChange={(e) => onLocationUrlChange(e.target.value)}
            placeholder={urlPlaceholder}
            disabled={disabled}
            className="flex-1"
            data-testid="input-location-url"
          />
          {locationUrl && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              asChild
              data-testid="button-preview-location"
            >
              <a href={locationUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Cole o link do Google Maps aqui. Quando clicado, abrira em nova aba.
        </p>
      </div>

      {locationName && (
        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-xs text-muted-foreground mb-2">Preview:</p>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span className={locationUrl ? "underline" : ""}>{locationName}</span>
            {locationUrl && <ExternalLink className="h-3 w-3 opacity-60" />}
          </div>
        </div>
      )}
    </div>
  );
}
