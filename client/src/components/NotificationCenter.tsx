import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, X, Award, BookOpen, Flame, Trophy, Star, Heart, Zap, Calendar, Settings, MessageCircleHeart, BookMarked, CalendarDays, Users, HandHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  data: any;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
}

const notificationIcons: Record<string, any> = {
  achievement: Award,
  achievement_liked: Trophy,
  lesson_complete: BookOpen,
  lesson_available: BookOpen,
  streak: Flame,
  streak_reminder: Flame,
  level_up: Trophy,
  xp: Star,
  hearts: Heart,
  challenge: Zap,
  daily_mission: Calendar,
  daily_verse: BookMarked,
  new_devotional: BookMarked,
  new_event: CalendarDays,
  new_prayer_request: HandHeart,
  prayer_approved: HandHeart,
  season_published: Users,
  season_ended: Users,
  inactivity_reminder: Bell,
  system: Settings,
  encouragement: MessageCircleHeart,
  default: Bell,
};

const notificationColors: Record<string, string> = {
  achievement: 'text-yellow-500',
  achievement_liked: 'text-amber-500',
  lesson_complete: 'text-green-500',
  lesson_available: 'text-emerald-500',
  streak: 'text-orange-500',
  streak_reminder: 'text-orange-400',
  level_up: 'text-purple-500',
  xp: 'text-blue-500',
  hearts: 'text-red-500',
  challenge: 'text-cyan-500',
  daily_mission: 'text-indigo-500',
  daily_verse: 'text-sky-500',
  new_devotional: 'text-violet-500',
  new_event: 'text-teal-500',
  new_prayer_request: 'text-rose-500',
  prayer_approved: 'text-rose-400',
  season_published: 'text-lime-500',
  season_ended: 'text-amber-600',
  inactivity_reminder: 'text-gray-500',
  system: 'text-muted-foreground',
  encouragement: 'text-pink-500',
  default: 'text-muted-foreground',
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery<NotificationsResponse>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000,
  });

  const { data: unreadData, refetch: refetchUnread } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      refetch();
      refetchUnread();
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/notifications/mark-all-read');
    },
    onSuccess: () => {
      refetch();
      refetchUnread();
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      await apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      refetch();
      refetchUnread();
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = unreadData?.count || data?.unreadCount || 0;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
  };

  const getIcon = (type: string) => {
    const IconComponent = notificationIcons[type] || notificationIcons.default;
    const colorClass = notificationColors[type] || notificationColors.default;
    return <IconComponent className={`w-5 h-5 ${colorClass}`} />;
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return '';
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notification-center"
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  variant="destructive"
                  className="min-w-[18px] h-[18px] p-0 flex items-center justify-center text-xs"
                  data-testid="badge-unread-count"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 p-0" 
        align="end"
        data-testid="notification-center-popover"
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Bell className="w-10 h-10 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`group relative p-3 cursor-pointer hover-elevate ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium line-clamp-1 ${
                            !notification.read ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex gap-1 invisible group-hover:visible">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              markReadMutation.mutate(notification.id);
                            }}
                            data-testid={`button-mark-read-${notification.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(notification.id);
                          }}
                          data-testid={`button-delete-notification-${notification.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
