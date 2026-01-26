import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@shared/schema";

interface AuthContextType {
  user: Omit<User, "password"> | null;
  token: string | null;
  login: (user: Omit<User, "password">, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isTreasurer: boolean;
  isLoading: boolean;
  hasEspiritualidadePanel: boolean;
  hasMarketingPanel: boolean;
  hasTreasuryPanel: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_DURATION = 96 * 60 * 60 * 1000; // 96 hours (4 days) - must match JWT expiration in server/auth.ts
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function ensurePushSubscriptionSynced(authToken: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      console.log('[Push Sync] Push notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.log('[Push Sync] Notification permission not granted, skipping sync');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.log('[Push Sync] VAPID key not configured');
      return;
    }

    console.log('[Push Sync] Ensuring push subscription is synced...');
    
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('[Push Sync] No existing subscription, creating new one...');
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      } catch (subError) {
        console.error('[Push Sync] Failed to create subscription:', subError);
        return;
      }
    }
    
    const subscriptionJson = subscription.toJSON();
    if (!subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
      console.warn('[Push Sync] Subscription missing keys');
      return;
    }
    
    const anonSubId = localStorage.getItem('anonymous_push_subscription_id');
    
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        ...(anonSubId ? { 'x-anonymous-subscription-id': anonSubId } : {})
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
      }),
    });
    
    if (response.ok) {
      console.log('[Push Sync] Subscription synced successfully!');
      localStorage.setItem('push_last_sync', Date.now().toString());
      if (anonSubId) {
        localStorage.removeItem('anonymous_push_subscription_id');
        console.log('[Push Sync] Anonymous subscription linked to user');
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Push Sync] Server sync failed:', response.status, errorData);
    }
  } catch (error) {
    console.error('[Push Sync] Error during sync:', error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const loginTimestamp = localStorage.getItem("loginTimestamp");
    
    if (storedToken && storedUser && loginTimestamp) {
      const timeElapsed = Date.now() - parseInt(loginTimestamp);
      
      if (timeElapsed < SESSION_DURATION) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Auto-sync push subscription for existing sessions
        const lastSync = localStorage.getItem('push_last_sync');
        const syncAge = lastSync ? Date.now() - parseInt(lastSync) : Infinity;
        const ONE_HOUR = 60 * 60 * 1000;
        
        if (syncAge > ONE_HOUR) {
          console.log('[Push Sync] Session restored, triggering auto-sync (last sync > 1h ago)');
          setTimeout(() => ensurePushSubscriptionSynced(storedToken), 2000);
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("loginTimestamp");
        localStorage.removeItem("push_last_sync");
      }
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!token) return;

    const loginTimestamp = localStorage.getItem("loginTimestamp");
    if (!loginTimestamp) return;

    const timeElapsed = Date.now() - parseInt(loginTimestamp);
    const timeRemaining = SESSION_DURATION - timeElapsed;

    if (timeRemaining <= 0) {
      handleSessionExpired();
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSessionExpired();
    }, timeRemaining);

    return () => clearTimeout(timeoutId);
  }, [token]);

  // Auto-sync push subscription when tab becomes visible again
  useEffect(() => {
    if (!token) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastSync = localStorage.getItem('push_last_sync');
        const syncAge = lastSync ? Date.now() - parseInt(lastSync) : Infinity;
        const ONE_HOUR = 60 * 60 * 1000;
        
        if (syncAge > ONE_HOUR) {
          console.log('[Push Sync] Tab visible, triggering auto-sync (last sync > 1h ago)');
          ensurePushSubscriptionSynced(token);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token]);

  const handleSessionExpired = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTimestamp");
    localStorage.removeItem("push_last_sync");
    localStorage.setItem("sessionExpired", "true");
    window.location.reload();
  };

  const login = async (userData: Omit<User, "password">, authToken: string) => {
    const timestamp = Date.now().toString();
    
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("loginTimestamp", timestamp);
    localStorage.removeItem("sessionExpired");
    
    // Always sync push subscription after login (handles both anonymous linking and browser subscription)
    console.log('[Push] Login: Triggering push subscription sync...');
    setTimeout(() => ensurePushSubscriptionSynced(authToken), 500);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loginTimestamp");
    window.scrollTo(0, 0);
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.isAdmin ?? false,
    isMember: user?.isMember ?? false,
    isTreasurer: user?.isTreasurer ?? false,
    isLoading,
    hasEspiritualidadePanel: user?.isAdmin || user?.secretaria === "espiritualidade",
    hasMarketingPanel: user?.isAdmin || user?.secretaria === "marketing",
    hasTreasuryPanel: (user?.isAdmin || user?.isTreasurer) ?? false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
