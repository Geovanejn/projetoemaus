import { useState, useEffect, useCallback } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const DISMISSED_KEY = 'visitor_notification_dismissed';
const SUBSCRIBED_KEY = 'visitor_notification_subscribed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

interface VisitorNotificationPromptProps {
  className?: string;
}

export function VisitorNotificationPrompt({ className }: VisitorNotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkVisibility = () => {
      const isLoggedIn = !!localStorage.getItem('token');
      if (isLoggedIn) {
        setIsVisible(false);
        return;
      }
      
      const isDismissed = localStorage.getItem(DISMISSED_KEY) === 'true';
      const isSubscribed = localStorage.getItem(SUBSCRIBED_KEY) === 'true';
      
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window &&
        VAPID_PUBLIC_KEY;
      
      setIsSupported(!!supported);
      
      if (isDismissed || isSubscribed || !supported) {
        setIsVisible(false);
        return;
      }
      
      const permission = Notification.permission;
      if (permission === 'denied') {
        setIsVisible(false);
        return;
      }
      
      setIsVisible(true);
    };
    
    const timer = setTimeout(checkVisibility, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setIsVisible(false);
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!isSupported) return;
    
    setIsLoading(true);
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        handleDismiss();
        return;
      }
      
      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      
      const subscriptionJson = subscription.toJSON();
      
      const response = await apiRequest('POST', '/api/notifications/subscribe-anonymous', {
        endpoint: subscription.endpoint,
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
      });
      
      const data = await response.json();
      if (data.id) {
        localStorage.setItem('anonymous_push_subscription_id', data.id.toString());
      }
      
      localStorage.setItem(SUBSCRIBED_KEY, 'true');
      setIsVisible(false);
    } catch (error) {
      console.error('[VisitorNotification] Error subscribing:', error);
      handleDismiss();
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, handleDismiss]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm ${className || ''}`}>
      <Card className="p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium">Receba novidades da Emaus</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Ative as notificacoes para saber sobre novos devocionais e eventos.
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button
                size="sm"
                onClick={handleSubscribe}
                disabled={isLoading}
                data-testid="button-enable-notifications"
              >
                {isLoading ? 'Ativando...' : 'Ativar notificacoes'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                disabled={isLoading}
                data-testid="button-dismiss-notifications"
              >
                Agora nao
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 -mt-1 -mr-1"
            onClick={handleDismiss}
            disabled={isLoading}
            data-testid="button-close-notification-prompt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
