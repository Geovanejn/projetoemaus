import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSounds } from "@/hooks/use-sounds";

export function SoundSettings() {
  const { toggleSounds, isSoundEnabled, sounds } = useSounds();
  const [enabled, setEnabled] = useState(true);
  
  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, [isSoundEnabled]);
  
  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    toggleSounds(checked);
    if (checked) {
      setTimeout(() => sounds.success(), 100);
    }
  };
  
  return (
    <Card className="p-4" data-testid="sound-settings-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {enabled ? (
            <Volume2 className="h-5 w-5 text-primary" />
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium">Sons de feedback</p>
            <p className="text-sm text-muted-foreground">
              Tocar sons ao completar ações
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          data-testid="switch-sound-toggle"
        />
      </div>
    </Card>
  );
}
