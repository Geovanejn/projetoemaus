import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
            <BellOff className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">Notificações Push</p>
            <p className="text-xs text-muted-foreground">Não suportado neste navegador</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 rounded-xl bg-card border border-border"
    >
      <div className="flex items-center gap-3">
        <motion.div 
          className="flex items-center justify-center w-10 h-10 rounded-full"
          style={{ backgroundColor: isSubscribed ? '#58CC0220' : '#FF4B4B20' }}
          animate={{ 
            backgroundColor: isSubscribed ? '#58CC0220' : '#FF4B4B20',
            scale: isLoading ? [1, 1.1, 1] : 1
          }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, rotate: { repeat: Infinity, duration: 1, ease: "linear" } }}
              >
                <Loader2 className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            ) : isSubscribed ? (
              <motion.div
                key="bell"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Bell className="h-5 w-5" style={{ color: '#58CC02' }} />
              </motion.div>
            ) : (
              <motion.div
                key="belloff"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <BellOff className="h-5 w-5" style={{ color: '#FF4B4B' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <div>
          <p className="font-medium text-foreground">Notificações Push</p>
          <p className="text-xs text-muted-foreground">
            {isSubscribed 
              ? 'Você receberá lembretes de estudo' 
              : permission === 'denied'
                ? 'Permissão negada no navegador'
                : 'Receba lembretes para estudar'}
          </p>
        </div>
      </div>
      
      <Switch
        checked={isSubscribed}
        onCheckedChange={handleToggle}
        disabled={isLoading || permission === 'denied'}
        data-testid="switch-notifications"
      />
    </motion.div>
  );
}
