import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';

type PermissionState = 'default' | 'granted' | 'denied';

interface PushNotificationState {
  isSupported: boolean;
  permission: PermissionState;
  isSubscribed: boolean;
  isSubscribedOnServer: boolean;
  isLoading: boolean;
  error: string | null;
  browserInfo: { name: string; isBrave: boolean; requiresSetup: boolean } | null;
}

// Detect browser for better error messages
function detectBrowserInfo(): { name: string; isBrave: boolean; requiresSetup: boolean } {
  const ua = navigator.userAgent;
  const isBrave = !!(navigator as any).brave?.isBrave;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  
  let name = 'navegador';
  if (isBrave) name = 'Brave';
  else if (isEdge) name = 'Edge';
  else if (isChrome) name = 'Chrome';
  else if (isFirefox) name = 'Firefox';
  else if (isSafari) name = 'Safari';
  
  // Brave requires special setup for push notifications
  const requiresSetup = isBrave || isIOS;
  
  return { name, isBrave, requiresSetup };
}

function getSubscriptionError(error: any, browserInfo: ReturnType<typeof detectBrowserInfo>): string {
  const errorStr = error?.message || error?.toString() || '';
  
  if (browserInfo.isBrave) {
    if (errorStr.includes('Registration failed') || 
        errorStr.includes('AbortError') ||
        errorStr.includes('InvalidStateError')) {
      return 'O Brave requer configuração: Acesse brave://settings/privacy e ative "Usar serviços do Google para mensagens push"';
    }
  }
  
  if (errorStr.includes('denied') || errorStr.includes('NotAllowedError')) {
    return 'Permissão negada. Habilite nas configurações do navegador.';
  }
  
  if (errorStr.includes('network') || errorStr.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet.';
  }
  
  return `Erro ao ativar notificações no ${browserInfo.name}. Verifique as permissões do navegador.`;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const VISITOR_SUBSCRIBED_KEY = 'visitor_notification_subscribed';
const VISITOR_DISMISSED_KEY = 'visitor_notification_dismissed';

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

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isSubscribedOnServer: false,
    isLoading: false,
    error: null,
    browserInfo: null,
  });

  useEffect(() => {
    const checkSupportAndSync = async () => {
      const browserInfo = detectBrowserInfo();
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      
      if (!isSupported) {
        setState(prev => ({ ...prev, isSupported: false, browserInfo }));
        return;
      }

      const permission = Notification.permission as PermissionState;
      const token = localStorage.getItem('token');
      
      if (token) {
        localStorage.removeItem(VISITOR_SUBSCRIBED_KEY);
        localStorage.removeItem(VISITOR_DISMISSED_KEY);
      }
      
      let isSubscribed = false;
      let isSubscribedOnServer = false;
      
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        isSubscribed = subscription !== null;
        
        console.log('[Push] Subscription status:', isSubscribed ? 'Subscribed' : 'Not subscribed');

        if (subscription && permission === 'granted' && token) {
          const subscriptionJson = subscription.toJSON();
          
          if (subscriptionJson.keys?.p256dh && subscriptionJson.keys?.auth) {
            try {
              console.log('[Push] Syncing subscription with server...');
              const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                  endpoint: subscription.endpoint,
                  p256dh: subscriptionJson.keys.p256dh,
                  auth: subscriptionJson.keys.auth,
                }),
              });
              
              if (response.ok) {
                isSubscribedOnServer = true;
                console.log('[Push] Subscription synced with server successfully');
              } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('[Push] Server sync failed:', response.status, errorData);
              }
            } catch (syncError) {
              console.error('[Push] Error syncing subscription:', syncError);
            }
          } else {
            console.warn('[Push] Subscription keys missing from JSON');
          }
        }
      } catch (error) {
        console.error('[Push] Error checking subscription:', error);
      }

      setState(prev => ({
        ...prev,
        isSupported: true,
        permission,
        isSubscribed: isSubscribedOnServer || (isSubscribed && !token),
        isSubscribedOnServer,
        browserInfo,
      }));
    };

    // Always sync on app load (user accessing the system)
    checkSupportAndSync();
    
    // Revalidate when tab becomes visible (user returns to app after being away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Push] Tab visible, revalidating subscription');
        checkSupportAndSync();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for service worker updates to re-sync
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[Push] Service worker updated, re-syncing subscription');
        checkSupportAndSync();
      });
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission: permission as PermissionState }));
      
      if (permission !== 'granted') {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          error: 'Permission denied' 
        }));
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Push] Error requesting permission:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Error requesting permission' 
      }));
      return false;
    }
  }, [state.isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      setState(prev => ({ ...prev, error: 'Push notifications not supported' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const permissionGranted = state.permission === 'granted' || await requestPermission();
      if (!permissionGranted) {
        console.error('[Push] Permission not granted for subscription');
        setState(prev => ({ ...prev, isLoading: false, error: 'Permission not granted' }));
        return false;
      }

      console.log('[Push] Requesting Service Worker ready...');
      const registration = await navigator.serviceWorker.ready;
      
      console.log('[Push] Checking existing subscription...');
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        if (!VAPID_PUBLIC_KEY) {
          console.error('[Push] VAPID public key not configured in environment');
          setState(prev => ({ 
            ...prev, 
            isLoading: false,
            error: 'Push notifications not configured on server' 
          }));
          return false;
        }

        console.log('[Push] Creating new subscription with key:', VAPID_PUBLIC_KEY.substring(0, 10) + '...');
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      console.log('[Push] Subscription obtained, sending to server...');
      const subscriptionJson = subscription.toJSON();
      
      const response = await apiRequest('POST', '/api/notifications/subscribe', {
        endpoint: subscription.endpoint,
        p256dh: subscriptionJson.keys?.p256dh || '',
        auth: subscriptionJson.keys?.auth || '',
      });

      console.log('[Push] Server response received');
      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        isSubscribedOnServer: true,
        isLoading: false,
        error: null 
      }));
      
      return true;
    } catch (error: any) {
      console.error('[Push] Error subscribing:', error);
      const browserInfo = state.browserInfo || detectBrowserInfo();
      const errorMessage = getSubscriptionError(error, browserInfo);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: errorMessage 
      }));
      return false;
    }
  }, [state.isSupported, state.permission, state.browserInfo, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !state.isSubscribed) {
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        await apiRequest('POST', '/api/notifications/unsubscribe', {
          endpoint: subscription.endpoint,
        });
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: false, 
        isSubscribedOnServer: false,
        isLoading: false,
        error: null 
      }));
      
      return true;
    } catch (error) {
      console.error('[Push] Error unsubscribing:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: 'Error unsubscribing from notifications' 
      }));
      return false;
    }
  }, [state.isSupported, state.isSubscribed]);

  const showLocalNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (!state.isSupported || state.permission !== 'granted') {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/logo.png',
        badge: '/favicon.png',
        ...options,
      });
      return true;
    } catch (error) {
      console.error('[Push] Error showing notification:', error);
      return false;
    }
  }, [state.isSupported, state.permission]);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification,
  };
}
