import { useState, useEffect, useCallback } from 'react';
import { Bell, X, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/lib/auth';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const NOTIFICATION_DISMISSED_KEY = 'unified_notification_dismissed';
const NOTIFICATION_SUBSCRIBED_KEY = 'unified_notification_subscribed';
const ANONYMOUS_SUB_ID_KEY = 'anonymous_push_subscription_id';

// Browser detection utilities
function detectBrowser(): { name: string; isBrave: boolean; isIOS: boolean; isSafari: boolean; isFirefox: boolean; isChrome: boolean; isEdge: boolean } {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
  
  // Brave detection - check for brave object
  const isBrave = !!(navigator as any).brave?.isBrave;
  
  let name = 'navegador';
  if (isBrave) name = 'Brave';
  else if (isEdge) name = 'Edge';
  else if (isChrome) name = 'Chrome';
  else if (isFirefox) name = 'Firefox';
  else if (isSafari) name = 'Safari';
  
  return { name, isBrave, isIOS, isSafari, isFirefox, isChrome, isEdge };
}

interface BrowserInstructions {
  title: string;
  steps: string[];
  link?: string;
}

function getBrowserSpecificInstructions(browser: ReturnType<typeof detectBrowser>): BrowserInstructions | null {
  if (browser.isBrave) {
    return {
      title: 'Configuração do Brave',
      steps: [
        '1. Acesse brave://settings/privacy',
        '2. Ative "Usar serviços do Google para mensagens push"',
        '3. Reinicie o navegador',
        '4. Volte e clique em "Ativar notificações"'
      ],
      link: 'brave://settings/privacy'
    };
  }
  
  if (browser.isIOS && browser.isSafari) {
    return {
      title: 'Configuração do Safari (iOS)',
      steps: [
        '1. Abra Ajustes do iPhone/iPad',
        '2. Vá em Safari > Notificações',
        '3. Permita notificações para este site',
        '4. Adicione o site à tela inicial para melhor experiência'
      ]
    };
  }
  
  if (browser.isFirefox) {
    return {
      title: 'Configuração do Firefox',
      steps: [
        '1. Clique no ícone de cadeado na barra de endereço',
        '2. Em "Permissões", encontre "Notificações"',
        '3. Altere para "Permitir"',
        '4. Recarregue a página'
      ]
    };
  }
  
  return null;
}

function getErrorMessage(error: any, browser: ReturnType<typeof detectBrowser>): string {
  const errorStr = error?.message || error?.toString() || '';
  
  // Brave-specific errors
  if (browser.isBrave) {
    if (errorStr.includes('Registration failed') || 
        errorStr.includes('AbortError') ||
        errorStr.includes('InvalidStateError') ||
        errorStr.includes('push service')) {
      return 'O Brave requer configuração extra para notificações push. Veja as instruções abaixo.';
    }
  }
  
  // iOS Safari limitations
  if (browser.isIOS && browser.isSafari) {
    return 'No iOS, adicione o site à tela inicial para receber notificações.';
  }
  
  // Permission denied
  if (errorStr.includes('denied') || errorStr.includes('NotAllowedError')) {
    return 'Permissão negada. Clique no ícone de cadeado na barra de endereço para permitir notificações.';
  }
  
  // Service Worker errors
  if (errorStr.includes('service worker') || errorStr.includes('ServiceWorker')) {
    return 'Erro no serviço de notificações. Recarregue a página e tente novamente.';
  }
  
  // Network errors
  if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('Failed to fetch')) {
    return 'Erro de conexão. Verifique sua internet e tente novamente.';
  }
  
  // Registration failed (generic)
  if (errorStr.includes('Registration failed') || errorStr.includes('subscription')) {
    return `Seu ${browser.name} pode precisar de configuração adicional. Veja as instruções abaixo.`;
  }
  
  return 'Erro ao ativar. Tente novamente ou verifique as configurações do navegador.';
}

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

export function UnifiedNotificationPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<ReturnType<typeof detectBrowser> | null>(null);
  const { user, token } = useAuth();

  useEffect(() => {
    const checkAndShowPrompt = async () => {
      console.log('[UnifiedNotification] Checking visibility...');
      
      // Detect browser first
      const browser = detectBrowser();
      setBrowserInfo(browser);
      console.log('[UnifiedNotification] Detected browser:', browser.name, browser);
      
      const supported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window &&
        VAPID_PUBLIC_KEY;
      
      setIsSupported(!!supported);
      
      if (!supported) {
        console.log('[UnifiedNotification] Push notifications not supported');
        // Show instructions for unsupported browsers
        if (browser.isIOS) {
          console.log('[UnifiedNotification] iOS detected - limited push support');
        }
        return;
      }
      
      const permission = Notification.permission;
      console.log('[UnifiedNotification] Permission:', permission);
      
      if (permission === 'denied') {
        console.log('[UnifiedNotification] Permission denied, not showing prompt');
        return;
      }
      
      const isDismissed = localStorage.getItem(NOTIFICATION_DISMISSED_KEY) === 'true';
      const isSubscribed = localStorage.getItem(NOTIFICATION_SUBSCRIBED_KEY) === 'true';
      
      console.log('[UnifiedNotification] isDismissed:', isDismissed, 'isSubscribed:', isSubscribed);
      
      if (isDismissed || isSubscribed) {
        return;
      }
      
      console.log('[UnifiedNotification] Showing prompt immediately');
      setIsOpen(true);
    };

    const timer = setTimeout(checkAndShowPrompt, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    
    const syncAnonymousSubscription = async () => {
      const anonSubId = localStorage.getItem(ANONYMOUS_SUB_ID_KEY);
      
      if (!anonSubId) {
        console.log('[UnifiedNotification] Token changed but no anonymous subscription to sync');
        return;
      }
      
      console.log('[UnifiedNotification] Token detected, syncing anonymous subscription ID:', anonSubId);
      
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[UnifiedNotification] Push not supported, cannot sync');
        return;
      }
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          console.log('[UnifiedNotification] No push subscription found to sync');
          return;
        }
        
        const subscriptionJson = subscription.toJSON();
        
        console.log('[UnifiedNotification] Syncing anonymous subscription to user account...');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-anonymous-subscription-id': anonSubId,
        };
        
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: subscriptionJson.keys?.p256dh || '',
            auth: subscriptionJson.keys?.auth || '',
          })
        });
        
        if (response.ok) {
          localStorage.removeItem(ANONYMOUS_SUB_ID_KEY);
          console.log('[UnifiedNotification] Successfully synced anonymous subscription to user, ID removed from localStorage');
        } else {
          console.error('[UnifiedNotification] Failed to sync subscription, status:', response.status);
        }
      } catch (e) {
        console.error('[UnifiedNotification] Error syncing subscription on login:', e);
      }
    };
    
    syncAnonymousSubscription();
  }, [token]);

  const handleDismiss = useCallback(() => {
    console.log('[UnifiedNotification] User dismissed notification prompt');
    localStorage.setItem(NOTIFICATION_DISMISSED_KEY, 'true');
    setIsOpen(false);
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!isSupported) return;
    
    setIsLoading(true);
    setErrorMessage(null);
    console.log('[UnifiedNotification] User clicked subscribe, token present:', !!token);
    
    try {
      const permission = await Notification.requestPermission();
      console.log('[UnifiedNotification] Permission result:', permission);
      
      if (permission !== 'granted') {
        setErrorMessage('Permissão negada. Habilite nas configurações do navegador.');
        setTimeout(() => {
          handleDismiss();
        }, 2000);
        return;
      }
      
      const registration = await navigator.serviceWorker.ready;
      console.log('[UnifiedNotification] Service worker ready');
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        console.log('[UnifiedNotification] Creating new subscription...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        console.log('[UnifiedNotification] New subscription created');
      }
      
      const subscriptionJson = subscription.toJSON();
      const anonSubId = localStorage.getItem(ANONYMOUS_SUB_ID_KEY);
      
      if (token) {
        console.log('[UnifiedNotification] Subscribing as logged user, anonSubId:', anonSubId);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        if (anonSubId) {
          headers['x-anonymous-subscription-id'] = anonSubId;
        }
        
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: subscriptionJson.keys?.p256dh || '',
            auth: subscriptionJson.keys?.auth || '',
          })
        });
        
        if (anonSubId) {
          localStorage.removeItem(ANONYMOUS_SUB_ID_KEY);
          console.log('[UnifiedNotification] Removed anonymous subscription ID after member subscription');
        }
      } else {
        console.log('[UnifiedNotification] Subscribing as anonymous visitor');
        const response = await apiRequest('POST', '/api/notifications/subscribe-anonymous', {
          endpoint: subscription.endpoint,
          p256dh: subscriptionJson.keys?.p256dh || '',
          auth: subscriptionJson.keys?.auth || '',
        });
        
        const data = await response.json();
        console.log('[UnifiedNotification] Anonymous subscription response:', data);
        
        if (data.id) {
          localStorage.setItem(ANONYMOUS_SUB_ID_KEY, data.id.toString());
          console.log('[UnifiedNotification] Saved anonymous subscription ID:', data.id);
        }
      }
      
      localStorage.setItem(NOTIFICATION_SUBSCRIBED_KEY, 'true');
      console.log('[UnifiedNotification] Subscription complete');
      setIsOpen(false);
    } catch (error: any) {
      console.error('[UnifiedNotification] Error subscribing:', error);
      const browser = browserInfo || detectBrowser();
      const message = getErrorMessage(error, browser);
      setErrorMessage(message);
      
      // Show instructions if browser-specific help is available
      const instructions = getBrowserSpecificInstructions(browser);
      if (instructions) {
        setShowInstructions(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, token, handleDismiss, browserInfo]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-notification-prompt">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">Ative as notificações</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Receba avisos sobre novos devocionais, eventos, estudos e muito mais diretamente no seu dispositivo.
          </DialogDescription>
        </DialogHeader>
        
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        {showInstructions && browserInfo && (() => {
          const instructions = getBrowserSpecificInstructions(browserInfo);
          if (!instructions) return null;
          
          return (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm p-4 rounded-md space-y-2">
              <div className="font-medium text-amber-800 dark:text-amber-300">
                {instructions.title}
              </div>
              <ul className="space-y-1 text-amber-700 dark:text-amber-400">
                {instructions.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
              {instructions.link && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/50"
                    onClick={() => {
                      // Copy the link to clipboard since browser protocols can't be opened directly
                      navigator.clipboard.writeText(instructions.link!);
                      setErrorMessage('Link copiado! Cole na barra de endereço do navegador.');
                    }}
                    data-testid="button-copy-browser-settings"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Copiar link de configurações
                  </Button>
                </div>
              )}
            </div>
          );
        })()}
        
        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full"
            data-testid="button-activate-notifications"
          >
            {isLoading ? 'Ativando...' : showInstructions ? 'Tentar novamente' : 'Ativar notificações'}
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            disabled={isLoading}
            className="w-full"
            data-testid="button-dismiss-notifications"
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
