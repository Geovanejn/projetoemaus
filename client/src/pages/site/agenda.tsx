import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { 
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  Loader2,
  X,
  ExternalLink,
  CheckCircle2,
  UserCheck,
  Banknote
} from "lucide-react";
import { SiGooglecalendar } from "react-icons/si";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StaggerContainer, StaggerItem } from "@/components/AnimatedPage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationLink } from "@/components/ui/location-link";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import eventImg1 from "@assets/Eleição_2025_2026_Stories (23)_1762028290367.png";
import eventImg2 from "@assets/Eleição_2025_2026_Stories (3)_1761781308477.png";
import eventImg3 from "@assets/Layout stories_1761779211233.png";
import eventImg4 from "@assets/Layout stories_1761779185102.png";
import eventImg5 from "@assets/image_1762037221993.png";
import defaultEventImg from "@assets/stock_images/christian_youth_conc_2afcb390.jpg";

const fallbackImages = [eventImg1, eventImg2, eventImg3, eventImg4, eventImg5];

interface EventData {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;
  locationUrl?: string;
  isPublished?: boolean;
  organizer?: string;
  category?: string;
  feeAmount?: number | null;
  feeDeadline?: string | null;
}

const categoryColors: Record<string, string> = {
  "culto": "bg-blue-500",
  "retiro": "bg-green-500",
  "confraternizacao": "bg-pink-500",
  "social": "bg-purple-500",
  "estudo": "bg-amber-500",
  "geral": "bg-gray-500",
};

const categoryLabels: Record<string, string> = {
  "culto": "Culto",
  "retiro": "Retiro",
  "confraternizacao": "Confraternizacao",
  "social": "Social",
  "estudo": "Estudo Biblico",
  "geral": "Geral",
};

// Helper to parse date strings without timezone issues
// When parsing "2026-01-10", add T12:00:00 to avoid UTC interpretation
function parseEventDate(dateStr: string): Date {
  // If it's just a date (YYYY-MM-DD), add noon time to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T12:00:00');
  }
  return new Date(dateStr);
}

function getCategoryLabel(category: string | undefined): string {
  if (!category) return "Geral";
  return categoryLabels[category.toLowerCase()] || category;
}

function getCategoryColor(category: string | undefined): string {
  if (!category) return "bg-gray-500";
  return categoryColors[category.toLowerCase()] || "bg-gray-500";
}

function SimpleCalendar({ 
  selectedDate, 
  onSelectDate, 
  eventDates 
}: { 
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
  eventDates: string[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="p-2" />;
          }
          
          const isToday = day.toDateString() === today.toDateString();
          const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
          const hasEvent = eventDates.includes(day.toDateString());
          
          return (
            <button
              key={day.toDateString()}
              onClick={() => onSelectDate(isSelected ? undefined : day)}
              className={`
                p-2 text-center text-sm rounded-md transition-colors
                ${isToday ? "bg-accent text-accent-foreground" : ""}
                ${isSelected ? "bg-primary text-primary-foreground" : ""}
                ${!isToday && !isSelected ? "hover:bg-muted" : ""}
                ${hasEvent && !isSelected ? "font-bold underline decoration-primary" : ""}
              `}
              data-testid={`calendar-day-${day.getDate()}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const params = useParams<{ id?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [pixData, setPixData] = useState<{
    qrCode?: string;
    qrCodeBase64?: string;
    amount?: number;
    expiresAt?: string;
    entryId?: number;
  } | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixPaymentConfirmed, setPixPaymentConfirmed] = useState(false);
  
  // PIX payment polling - check status every 5 seconds while modal is open
  useEffect(() => {
    if (!showPixModal || !pixData?.entryId || pixPaymentConfirmed) return;
    
    const checkPaymentStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(`/api/treasury/entries/${pixData.entryId}/status`, { 
          credentials: 'include',
          headers 
        });
        if (res.ok) {
          const data = await res.json();
          if (data.paymentStatus === 'paid' || data.paymentStatus === 'completed') {
            setPixPaymentConfirmed(true);
            toast({ 
              title: "Pagamento confirmado!", 
              description: "Sua taxa foi paga com sucesso." 
            });
            // Close modal after a brief delay to show confirmation
            setTimeout(() => {
              handleClosePixModal();
            }, 2000);
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };
    
    // Check immediately and then every 5 seconds
    checkPaymentStatus();
    const interval = setInterval(checkPaymentStatus, 5000);
    
    return () => clearInterval(interval);
  }, [showPixModal, pixData?.entryId, pixPaymentConfirmed]);
  
  // Manual payment check function
  const handleManualPaymentCheck = async () => {
    if (!pixData?.entryId) return;
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/treasury/entries/${pixData.entryId}/status`, { 
        credentials: 'include',
        headers 
      });
      if (res.ok) {
        const data = await res.json();
        if (data.paymentStatus === 'paid' || data.paymentStatus === 'completed') {
          setPixPaymentConfirmed(true);
          toast({ 
            title: "Pagamento confirmado!", 
            description: "Sua taxa foi paga com sucesso." 
          });
          setTimeout(() => {
            handleClosePixModal();
          }, 2000);
        } else {
          toast({ 
            title: "Pagamento ainda nao confirmado", 
            description: "Aguarde alguns instantes e tente novamente.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({ 
        title: "Erro ao verificar pagamento", 
        description: "Tente novamente em alguns segundos.",
        variant: "destructive"
      });
    }
  };
  
  // Centralized handler for closing PIX modal
  const handleClosePixModal = () => {
    setShowPixModal(false);
    setPixData(null);
    setPixPaymentConfirmed(false);
    // Force immediate refetch of confirmation status when closing modal
    if (selectedEvent?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEvent.id, 'my-confirmation'] });
      // Also force an immediate refetch
      setTimeout(() => {
        refetchConfirmation();
      }, 100);
    }
  };

  const { data: eventsData, isLoading, isError } = useQuery<EventData[]>({
    queryKey: ['/api/site/events'],
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Query for event confirmation status (user-specific)
  const { data: confirmationData, isLoading: isLoadingConfirmation, refetch: refetchConfirmation } = useQuery<{
    confirmed: boolean;
    paymentStatus?: string;
    fee?: { amount: number; deadline: string } | null;
  }>({
    queryKey: ['/api/events', selectedEvent?.id, 'my-confirmation'],
    queryFn: async () => {
      if (!selectedEvent?.id || !user) return { confirmed: false, fee: null };
      const res = await fetch(`/api/events/${selectedEvent.id}/my-confirmation`, { credentials: 'include' });
      if (!res.ok) return { confirmed: false, fee: null };
      return res.json();
    },
    enabled: !!selectedEvent?.id && !!user,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to get latest status
  });

  // Query for event confirmation count (public)
  const { data: confirmationCount } = useQuery<{
    total: number;
    confirmed: number;
    hasFee: boolean;
    deadline: string | null;
  }>({
    queryKey: ['/api/events', selectedEvent?.id, 'confirmation-count'],
    enabled: !!selectedEvent?.id,
  });

  // Mutation for confirming presence
  const confirmMutation = useMutation({
    mutationFn: async ({ eventId, hasFee }: { eventId: number; hasFee: boolean }) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/confirm`, { visitorCount: 0 });
      return { response: res, hasFee, eventId };
    },
    onSuccess: async ({ hasFee, eventId }) => {
      // Use eventId from response to avoid relying on selectedEvent state during async resolution
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'my-confirmation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'confirmation-count'] });
      
      if (hasFee) {
        // For paid events, immediately generate PIX after confirmation
        toast({ title: "Presenca confirmada", description: "Gerando pagamento PIX..." });
        generatePixMutation.mutate(eventId);
      } else {
        toast({ title: "Presenca confirmada", description: "Sua presenca foi registrada com sucesso." });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao confirmar", 
        description: error.message || "Nao foi possivel confirmar presenca.", 
        variant: "destructive" 
      });
    },
  });

  // Mutation for cancelling confirmation
  const cancelConfirmMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("DELETE", `/api/events/${eventId}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEvent?.id, 'my-confirmation'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEvent?.id, 'confirmation-count'] });
      toast({ title: "Confirmacao cancelada", description: "Sua confirmacao foi removida." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Erro ao cancelar", 
        description: error.message || "Nao foi possivel cancelar a confirmacao.", 
        variant: "destructive" 
      });
    },
  });

  // Mutation for generating PIX payment
  const generatePixMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/generate-pix`);
      return res.json();
    },
    onSuccess: (data) => {
      setPixData(data);
      setShowPixModal(true);
      // Query invalidation happens on modal close via handleClosePixModal
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar PIX",
        description: error.message || "Nao foi possivel gerar o pagamento PIX.",
        variant: "destructive"
      });
    },
  });

  useEffect(() => {
    if (params.id && eventsData && eventsData.length > 0) {
      const eventId = parseInt(params.id, 10);
      const event = eventsData.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
      }
    }
  }, [params.id, eventsData]);

  // Query for all event confirmation counts (batch)
  const eventIds = (eventsData || []).map(e => e.id);
  const { data: allConfirmationCounts } = useQuery<Record<number, { members: number; visitors: number }>>({
    queryKey: ['/api/site/events/confirmation-counts', eventIds.join(',')],
    queryFn: async () => {
      if (eventIds.length === 0) return {};
      const res = await fetch(`/api/site/events/confirmation-counts?ids=${eventIds.join(',')}`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: eventIds.length > 0,
    staleTime: 30000,
  });

  const processedEvents = (eventsData || []).map((event, index) => ({
    ...event,
    date: parseEventDate(event.startDate),
    categoryLabel: getCategoryLabel(event.category),
    categoryColor: getCategoryColor(event.category),
    organizer: 'UMP Emaus',
    image: event.imageUrl && !event.imageUrl.includes('placeholder') 
      ? event.imageUrl 
      : fallbackImages[index % fallbackImages.length],
    confirmationCount: allConfirmationCounts?.[event.id] || { members: 0, visitors: 0 },
  }));

  const eventDates = processedEvents.map(e => e.date.toDateString());

  const filteredEvents = selectedDate
    ? processedEvents.filter(
        (event) => event.date.toDateString() === selectedDate.toDateString()
      )
    : processedEvents;

  const sortedEvents = [...(viewMode === "list" ? processedEvents : filteredEvents)].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const formatDate = (date: Date) => {
    return {
      day: date.getDate().toString().padStart(2, "0"),
      month: date.toLocaleString("pt-BR", { month: "short" }).toUpperCase().replace(".", ""),
      weekday: date.toLocaleString("pt-BR", { weekday: "short" }).toUpperCase().replace(".", ""),
    };
  };

  return (
    <SiteLayout>
      <section className="relative overflow-hidden bg-gray-900 text-white py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-transparent" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-10 w-64 h-64 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 bg-amber-500/30 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-amber-500 mb-6 shadow-lg shadow-primary/30">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-orange-400 to-amber-400 bg-clip-text text-transparent">
              Agenda
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Confira os próximos eventos e atividades da UMP Emaús
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold">Próximos Eventos</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/site/events/google-calendar-subscribe");
                    const data = await response.json();
                    if (data.url) {
                      window.open(data.url, "_blank");
                    }
                  } catch (error) {
                    console.error("Error getting Google Calendar URL:", error);
                    window.open("/api/site/events/calendar.ics", "_blank");
                  }
                }}
                data-testid="button-sync-google-calendar"
              >
                <SiGooglecalendar className="h-4 w-4 mr-1" />
                Sincronizar com Google Agenda
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="h-4 w-4 mr-1" />
                Lista
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                data-testid="button-view-calendar"
              >
                <Grid className="h-4 w-4 mr-1" />
                Calendario
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : isError || processedEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum evento programado</h3>
              <p className="text-muted-foreground">
                Novos eventos serao adicionados em breve.
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className={viewMode === "calendar" ? "lg:col-span-2" : "lg:col-span-3"}>
                {sortedEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum evento encontrado</h3>
                    <p className="text-muted-foreground">
                      {viewMode === "calendar" && selectedDate
                        ? "Não há eventos nesta data"
                        : "Não há eventos programados"}
                    </p>
                  </div>
                ) : (
                  <StaggerContainer className="space-y-4">
                    {sortedEvents.map((event) => {
                      const dateInfo = formatDate(event.date);
                      return (
                        <StaggerItem key={event.id}>
                          <motion.div
                            whileHover={{ x: 4 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card 
                              className="overflow-hidden hover-elevate cursor-pointer"
                              onClick={() => setSelectedEvent(event)}
                              data-testid={`card-event-${event.id}`}
                            >
                              <CardContent className="p-0">
                                <div className="flex flex-col md:flex-row">
                                  <div className="relative md:w-48 md:min-h-[200px] h-32 md:h-auto overflow-hidden">
                                    <div 
                                      className="absolute inset-0 bg-cover bg-center"
                                      style={{ backgroundImage: `url(${event.image})` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-gray-900/90 via-gray-900/70 to-transparent" />
                                    <div className="absolute inset-0 flex items-center justify-center md:justify-start md:pl-4">
                                      <div className="text-center text-white">
                                        <span className="text-xs font-semibold text-primary block">
                                          {dateInfo.month}
                                        </span>
                                        <span className="text-4xl font-bold block">
                                          {dateInfo.day}
                                        </span>
                                        <span className="text-xs text-gray-300 block">
                                          {dateInfo.weekday}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-5 flex-1">
                                    <div className="flex items-start justify-between gap-4 mb-2">
                                      <div>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span 
                                            className={`w-2 h-2 rounded-full ${event.categoryColor}`} 
                                          />
                                          <span className="text-xs text-muted-foreground">
                                            {event.categoryLabel}
                                          </span>
                                        </div>
                                        <h3 className="text-lg font-semibold" data-testid={`event-title-${event.id}`}>
                                          {event.title}
                                        </h3>
                                      </div>
                                    </div>
                                    
                                    <p className="text-sm text-muted-foreground mb-4">
                                      {event.description}
                                    </p>
                                    
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                      {event.time && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-4 w-4 text-primary" />
                                          {event.time}
                                        </span>
                                      )}
                                      {event.location && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-4 w-4 text-primary" />
                                          {event.location}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Users className="h-4 w-4 text-primary" />
                                        {event.organizer}
                                        {event.confirmationCount.members > 0 && (
                                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">
                                            {event.confirmationCount.members + event.confirmationCount.visitors} confirmado(s)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="mt-4">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            const response = await fetch(`/api/site/events/${event.id}/google-calendar-url`);
                                            const data = await response.json();
                                            if (data.url) {
                                              window.open(data.url, "_blank");
                                            }
                                          } catch (error) {
                                            console.error("Error getting Google Calendar URL:", error);
                                          }
                                        }}
                                        data-testid={`button-add-to-calendar-${event.id}`}
                                      >
                                        <SiGooglecalendar className="h-4 w-4 mr-1" />
                                        Adicionar ao Google Agenda
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        </StaggerItem>
                      );
                    })}
                  </StaggerContainer>
                )}
              </div>

              {viewMode === "calendar" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="lg:col-span-1"
                >
                  <Card className="sticky top-20">
                    <CardContent className="p-4">
                      <SimpleCalendar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        eventDates={eventDates}
                      />
                      
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                          * Datas sublinhadas possuem eventos
                        </p>
                        {selectedDate && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => setSelectedDate(undefined)}
                            data-testid="button-clear-date"
                          >
                            Limpar selecao
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {selectedEvent.imageUrl && (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <img 
                      src={selectedEvent.imageUrl} 
                      alt={selectedEvent.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {selectedEvent.description && (
                  <p className="text-muted-foreground">{selectedEvent.description}</p>
                )}

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <span>
                      {parseEventDate(selectedEvent.startDate).toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  
                  {selectedEvent.time && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock className="h-4 w-4 text-primary" />
                      <span>{selectedEvent.time}</span>
                      {selectedEvent.feeAmount && selectedEvent.feeAmount > 0 && (
                        <>
                          <span className="text-muted-foreground mx-2">|</span>
                          <Banknote className="h-4 w-4 text-primary" />
                          <span className="font-medium">
                            R$ {(selectedEvent.feeAmount / 100).toFixed(2).replace('.', ',')}
                          </span>
                        </>
                      )}
                      {/* Confirmation count inline after fee */}
                      {confirmationCount && confirmationCount.confirmed > 0 && (
                        <>
                          <span className="text-muted-foreground mx-2">|</span>
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{confirmationCount.confirmed} confirmado(s)</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Show fee even if no time is set */}
                  {!selectedEvent.time && selectedEvent.feeAmount && selectedEvent.feeAmount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Banknote className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        Taxa: R$ {(selectedEvent.feeAmount / 100).toFixed(2).replace('.', ',')}
                      </span>
                      {/* Confirmation count inline after fee */}
                      {confirmationCount && confirmationCount.confirmed > 0 && (
                        <>
                          <span className="text-muted-foreground mx-2">|</span>
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{confirmationCount.confirmed} confirmado(s)</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Show confirmation count when no time and no fee */}
                  {!selectedEvent.time && !(selectedEvent.feeAmount && selectedEvent.feeAmount > 0) && confirmationCount && confirmationCount.confirmed > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{confirmationCount.confirmed} presenca(s) confirmada(s)</span>
                    </div>
                  )}
                  
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{selectedEvent.location}</span>
                      {selectedEvent.locationUrl && (
                        <Button variant="ghost" size="sm" asChild className="ml-auto">
                          <a href={selectedEvent.locationUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver no Maps
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {selectedEvent.location && (
                  <div className="pt-2">
                    <LocationLink
                      name={selectedEvent.location}
                      url={selectedEvent.locationUrl}
                      variant="card"
                    />
                  </div>
                )}

                {/* Confirmation Section for logged in users */}
                {user && (
                  <div className="pt-3 pb-1 border-t">
                    {/* Show fee info if event has fee */}
                    {confirmationData?.fee && (
                      <div className="text-sm mb-3">
                        <span className="text-muted-foreground">Taxa: </span>
                        <span className="font-semibold">R$ {confirmationData.fee.amount.toFixed(2).replace('.', ',')}</span>
                        <span className="text-muted-foreground ml-2">
                          (ate {new Date(confirmationData.fee.deadline).toLocaleDateString('pt-BR')})
                        </span>
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      {confirmationData?.confirmed ? (
                        <div className="flex flex-col gap-2">
                          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Presenca confirmada
                          </span>
                          {confirmationData.fee && confirmationData.paymentStatus !== 'paid' && (
                            <Button
                              onClick={() => generatePixMutation.mutate(selectedEvent.id)}
                              disabled={generatePixMutation.isPending}
                              variant="default"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              data-testid="button-pay-pix"
                            >
                              {generatePixMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Banknote className="h-4 w-4 mr-2" />
                              )}
                              Pagar Taxa via PIX
                            </Button>
                          )}
                          {confirmationData.fee && confirmationData.paymentStatus === 'paid' && (
                            <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              Pagamento confirmado
                            </span>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            // Confirm presence - for paid events, PIX modal opens automatically after confirmation
                            const hasFee = !!(selectedEvent.feeAmount && selectedEvent.feeAmount > 0);
                            confirmMutation.mutate({ eventId: selectedEvent.id, hasFee });
                          }}
                          disabled={confirmMutation.isPending || generatePixMutation.isPending || !!(confirmationData?.fee && new Date() > new Date(confirmationData.fee.deadline))}
                          variant="secondary"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          data-testid="button-confirm-presence"
                        >
                          {(confirmMutation.isPending || generatePixMutation.isPending) ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <UserCheck className="h-4 w-4 mr-2" />
                          )}
                          Confirmar Presenca
                        </Button>
                      )}
                      
                      {confirmationData?.confirmed && confirmationData.paymentStatus !== 'paid' && !confirmationData.fee && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelConfirmMutation.mutate(selectedEvent.id)}
                          disabled={cancelConfirmMutation.isPending}
                          data-testid="button-cancel-confirmation"
                        >
                          {cancelConfirmMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Cancelar"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Show login prompt for non-logged users */}
                {!user && (
                  <div className="pt-3 pb-1 border-t">
                    <p className="text-sm text-muted-foreground">
                      Faca login para confirmar sua presenca neste evento.
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    variant="default"
                    className="flex-1 sm:flex-none"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/site/events/${selectedEvent.id}/google-calendar-url`);
                        const data = await response.json();
                        if (data.url) {
                          window.open(data.url, "_blank");
                        }
                      } catch (error) {
                        console.error("Error getting Google Calendar URL:", error);
                      }
                    }}
                    data-testid="modal-button-add-to-calendar"
                  >
                    <SiGooglecalendar className="h-4 w-4 mr-2" />
                    Adicionar ao Google Agenda
                  </Button>
                  <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setSelectedEvent(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* PIX Payment Modal */}
      <Dialog open={showPixModal} onOpenChange={(open) => !open && handleClosePixModal()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Pagamento PIX</DialogTitle>
          </DialogHeader>
          
          {pixData && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">
                  R$ {(pixData.amount || 0).toFixed(2).replace('.', ',')}
                </span>
              </div>
              
              {pixData.qrCodeBase64 && (
                <div className="p-4 bg-white rounded-lg">
                  <img 
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              )}
              
              {pixData.qrCode && (
                <div className="w-full">
                  <p className="text-xs text-muted-foreground mb-2 text-center">
                    Ou copie o codigo PIX:
                  </p>
                  <div className="relative">
                    <textarea
                      readOnly
                      value={pixData.qrCode}
                      className="w-full h-20 p-2 text-xs bg-muted rounded border resize-none"
                      data-testid="textarea-pix-code"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.qrCode || '');
                        toast({ title: "Copiado!", description: "Codigo PIX copiado para a area de transferencia." });
                      }}
                      data-testid="button-copy-pix"
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
              
              {pixData.expiresAt && (
                <p className="text-xs text-muted-foreground text-center">
                  Valido ate: {new Date(pixData.expiresAt).toLocaleString('pt-BR')}
                </p>
              )}
              
              <p className="text-sm text-muted-foreground text-center">
                Apos o pagamento, aguarde alguns segundos para a confirmacao automatica.
              </p>
              
              <Button 
                onClick={handleManualPaymentCheck}
                className="w-full"
                data-testid="button-check-payment"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ja Paguei
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleClosePixModal}
                className="w-full"
                data-testid="button-close-pix-modal"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
