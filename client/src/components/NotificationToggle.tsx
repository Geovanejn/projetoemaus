import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function NotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return;
    }

    if (Notification.permission === "denied") {
      toast({
        title: "Permissão Negada",
        description: "As notificações foram bloqueadas nas configurações do seu navegador. Para ativar, clique no ícone de cadeado na barra de endereços (ao lado da URL) e altere a permissão de Notificações para 'Permitir'.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[Push] Requesting permission via toggle...');
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        console.log('[Push] Permission granted, checking service worker...');
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] Service worker ready, checking subscription...');
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          console.log('[Push] No subscription found, creating new one...');
          const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
          if (!VAPID_PUBLIC_KEY) {
            throw new Error('VAPID public key not configured');
          }
          
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }
        
        console.log('[Push] Sending subscription to server...');
        const subscriptionJson = subscription.toJSON();
        const token = localStorage.getItem('token');
        
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: subscriptionJson.keys?.p256dh,
            auth: subscriptionJson.keys?.auth,
          }),
        });
        
        if (response.ok) {
          toast({
            title: "Sucesso!",
            description: "Notificações ativadas com sucesso.",
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Push] Server subscription failed:', response.status, errorData);
          toast({
            title: "Erro",
            description: "Não foi possível registrar as notificações no servidor.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao ativar as notificações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

  if (permission === "granted") {
    return (
      <Button variant="outline" size="sm" className="w-full gap-2 text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700" disabled>
        <Bell className="h-4 w-4" />
        Notificações Ativas
      </Button>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="w-full gap-2 hover-elevate" 
      onClick={requestPermission}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      Ativar Notificações
    </Button>
  );
}
