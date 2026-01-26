import { Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface ConnectionStatusProps {
  showLabel?: boolean;
  className?: string;
}

export function ConnectionStatus({ showLabel = false, className = "" }: ConnectionStatusProps) {
  const { isConnected, isConnecting } = useWebSocket({ autoConnect: true });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isConnected ? "connected" : isConnecting ? "connecting" : "disconnected"}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className={`flex items-center gap-2 ${className}`}
      >
        {isConnected ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Wifi className="h-4 w-4 text-green-500" />
            </motion.div>
            {showLabel && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                Conectado
              </Badge>
            )}
          </>
        ) : isConnecting ? (
          <>
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Wifi className="h-4 w-4 text-yellow-500" />
            </motion.div>
            {showLabel && (
              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                Conectando...
              </Badge>
            )}
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-muted-foreground" />
            {showLabel && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Offline
              </Badge>
            )}
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function ConnectionBadge() {
  const { isConnected } = useWebSocket({ autoConnect: true });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5"
    >
      <motion.div
        className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-muted-foreground"}`}
        animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="text-xs text-muted-foreground">
        {isConnected ? "Tempo real" : "Polling"}
      </span>
    </motion.div>
  );
}
