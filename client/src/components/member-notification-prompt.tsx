import { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/use-push-notifications';

const SESSION_PROMPT_KEY = 'member_notification_prompt_shown_session';

interface MemberNotificationPromptProps {
  className?: string;
}

export function MemberNotificationPrompt({ className }: MemberNotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
  } = usePushNotifications();

  useEffect(() => {
    const checkVisibility = () => {
      const sessionPromptShown = sessionStorage.getItem(SESSION_PROMPT_KEY) === 'true';
      
      if (sessionPromptShown) {
        setIsVisible(false);
        return;
      }
      
      if (!isSupported) {
        setIsVisible(false);
        return;
      }
      
      if (isSubscribed) {
        setIsVisible(false);
        return;
      }
      
      if (permission === 'denied') {
        setIsVisible(false);
        return;
      }
      
      setIsVisible(true);
    };
    
    const timer = setTimeout(checkVisibility, 1500);
    return () => clearTimeout(timer);
  }, [isSupported, isSubscribed, permission]);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(SESSION_PROMPT_KEY, 'true');
    setIsVisible(false);
  }, []);

  const handleSubscribe = useCallback(async () => {
    const success = await subscribe();
    if (success) {
      setIsVisible(false);
    } else {
      sessionStorage.setItem(SESSION_PROMPT_KEY, 'true');
      setIsVisible(false);
    }
  }, [subscribe]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm ${className || ''}`}>
      <Card className="p-4 shadow-lg border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-full bg-purple-500/20">
            <Bell className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium">Ative as notificacoes</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Receba lembretes de estudo, conquistas e novidades da comunidade diretamente no seu celular.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button
                size="sm"
                onClick={handleSubscribe}
                disabled={isLoading}
                className="bg-purple-500 hover:bg-purple-600"
                data-testid="button-enable-member-notifications"
              >
                {isLoading ? 'Ativando...' : 'Ativar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                disabled={isLoading}
                data-testid="button-dismiss-member-notifications"
              >
                Depois
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 -mt-1 -mr-1"
            onClick={handleDismiss}
            disabled={isLoading}
            data-testid="button-close-member-notification-prompt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
