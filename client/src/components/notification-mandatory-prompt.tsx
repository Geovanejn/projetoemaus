import { useState, useEffect, useCallback } from 'react';
import { Bell, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuth } from '@/lib/auth';

const NOTIFICATION_PROMPT_DISMISSED_KEY = 'notification_prompt_permanently_dismissed';
const NOTIFICATION_PROMPT_DISMISSED_COUNT_KEY = 'notification_prompt_dismissed_count';
const MAX_DISMISSALS = 3;

export function NotificationMandatoryPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const [isPermanentlyDismissed, setIsPermanentlyDismissed] = useState(false);
  const { user } = useAuth();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
  } = usePushNotifications();

  useEffect(() => {
    const checkAndShowPrompt = () => {
      if (!user) {
        setIsOpen(false);
        return;
      }

      if (!isSupported) {
        setIsOpen(false);
        return;
      }

      if (isSubscribed) {
        setIsOpen(false);
        return;
      }

      if (permission === 'denied') {
        setIsOpen(false);
        return;
      }

      const permanentlyDismissed = localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_KEY) === 'true';
      if (permanentlyDismissed) {
        setIsPermanentlyDismissed(true);
        setIsOpen(false);
        return;
      }

      const storedDismissCount = parseInt(
        localStorage.getItem(NOTIFICATION_PROMPT_DISMISSED_COUNT_KEY) || '0'
      );
      setDismissCount(storedDismissCount);

      if (storedDismissCount >= MAX_DISMISSALS) {
        setIsOpen(false);
        return;
      }

      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);

      return () => clearTimeout(timer);
    };

    checkAndShowPrompt();
  }, [user, isSupported, isSubscribed, permission]);

  const handleSubscribe = useCallback(async () => {
    try {
      const success = await subscribe();
      if (success) {
        setIsOpen(false);
        localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_COUNT_KEY);
        localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  }, [subscribe]);

  const handleDismiss = useCallback(() => {
    const newCount = dismissCount + 1;
    setDismissCount(newCount);
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_COUNT_KEY, newCount.toString());
    setIsOpen(false);
  }, [dismissCount]);

  const handlePermanentDismiss = useCallback(() => {
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_KEY, 'true');
    localStorage.setItem(NOTIFICATION_PROMPT_DISMISSED_COUNT_KEY, MAX_DISMISSALS.toString());
    setIsPermanentlyDismissed(true);
    setIsOpen(false);
  }, []);

  const canDismiss = dismissCount < MAX_DISMISSALS - 1;
  const isLastChance = dismissCount === MAX_DISMISSALS - 1;

  if (!isOpen || !user || isPermanentlyDismissed) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Ative as Notificacoes</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3">
            <p>
              Para uma experiencia completa na UMP Emaus, e <strong>essencial</strong> ativar as notificacoes.
            </p>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-medium">Voce recebera:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Lembretes de eventos</li>
                    <li>Avisos de pagamentos pendentes</li>
                    <li>Novos devocionais</li>
                    <li>Conquistas e missoes</li>
                  </ul>
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full"
            data-testid="button-enable-mandatory-notifications"
          >
            {isLoading ? (
              'Ativando...'
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Ativar Notificacoes
              </>
            )}
          </Button>
          
          {canDismiss && (
            <Button
              variant="ghost"
              onClick={handleDismiss}
              disabled={isLoading}
              className="text-muted-foreground"
              data-testid="button-dismiss-mandatory-notifications"
            >
              Lembrar depois ({MAX_DISMISSALS - dismissCount - 1} tentativa{MAX_DISMISSALS - dismissCount - 1 !== 1 ? 's' : ''} restante{MAX_DISMISSALS - dismissCount - 1 !== 1 ? 's' : ''})
            </Button>
          )}
          
          {isLastChance && (
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">
                Esta e sua ultima chance de ativar as notificacoes.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePermanentDismiss}
                disabled={isLoading}
                className="text-xs text-muted-foreground"
                data-testid="button-permanent-dismiss-notifications"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Nao quero receber notificacoes
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
