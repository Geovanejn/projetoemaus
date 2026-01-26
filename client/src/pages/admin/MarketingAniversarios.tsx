import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Cake, 
  Share2, 
  Download, 
  Loader2,
  Calendar,
  User,
  ArrowLeft,
  Send
} from "lucide-react";
import { SiWhatsapp, SiInstagram } from "react-icons/si";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BirthdayMember {
  id: number;
  fullName: string;
  firstName: string;
  photoUrl: string | null;
  birthdate: string;
  isToday: boolean;
  daysUntil: number;
}

interface BirthdaysResponse {
  today: BirthdayMember[];
  upcoming: BirthdayMember[];
}

export default function MarketingAniversarios() {
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<BirthdayMember | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const { data: birthdays, isLoading } = useQuery<BirthdaysResponse>({
    queryKey: ["/api/admin/birthdays"],
  });

  const publishBirthdayStoryMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await apiRequest("POST", "/api/admin/instagram/publish-birthday-story", { memberId });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Story Publicado",
        description: data.message || "Story de aniversário publicado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao publicar story de aniversário",
        variant: "destructive",
      });
    },
  });

  const openShareDialog = (member: BirthdayMember) => {
    setSelectedMember(member);
    setIsShareDialogOpen(true);
  };

  const generateAndShareImage = useCallback(async (platform: 'whatsapp' | 'instagram' | 'download') => {
    if (!shareCardRef.current || !selectedMember) return;

    setIsGenerating(true);
    try {
      const cardWidth = 2160;
      const cardHeight = 3840;
      const scale = 1;
      const borderRadius = 0;
      
      const offscreenContainer = document.createElement('div');
      offscreenContainer.style.cssText = `
        position: fixed;
        left: -10000px;
        top: 0;
        width: ${cardWidth}px;
        height: ${cardHeight}px;
        background: transparent;
        padding: 0;
        margin: 0;
        overflow: hidden;
      `;
      document.body.appendChild(offscreenContainer);
      
      const clonedCard = shareCardRef.current.cloneNode(true) as HTMLElement;
      clonedCard.style.cssText = `
        width: ${cardWidth}px;
        height: ${cardHeight}px;
        overflow: hidden;
        background: transparent;
        margin: 0;
        padding: 0;
      `;
      
      const scaleFactor = 8;
      
      const textElements = clonedCard.querySelectorAll('p, span');
      textElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const currentSize = parseFloat(htmlEl.style.fontSize);
        if (!isNaN(currentSize) && currentSize > 0) {
          const pxSize = Math.round(currentSize * 16 * scaleFactor);
          htmlEl.style.fontSize = `${pxSize}px`;
        }
      });

      const memberPhoto = clonedCard.querySelector('img[data-member-photo]') as HTMLImageElement;
      if (memberPhoto) {
        memberPhoto.style.width = '1404px';
        memberPhoto.style.height = '1404px';
      }
      
      const placeholderDiv = clonedCard.querySelector('div[style*="backgroundColor"]') as HTMLElement;
      if (placeholderDiv) {
        placeholderDiv.style.width = '1404px';
        placeholderDiv.style.height = '1404px';
      }
      
      const nameElement = clonedCard.querySelector('p') as HTMLElement;
      if (nameElement) {
        nameElement.style.bottom = '29.3%';
      }
      
      offscreenContainer.appendChild(clonedCard);
      
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const sourceCanvas = await html2canvas(clonedCard, {
        scale: scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        imageTimeout: 15000,
        width: cardWidth,
        height: cardHeight,
      });
      
      document.body.removeChild(offscreenContainer);

      const shareText = `Feliz Aniversário, ${selectedMember.firstName}!\n\nNossa UMP te deseja parabéns. Que Deus derrame graça e paz sobre ti.\n\n- UMP Emaús`;

      if (platform === 'download') {
        sourceCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `aniversario-${selectedMember.firstName.toLowerCase()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({ title: "Imagem baixada com sucesso!" });
          setIsGenerating(false);
        }, 'image/png', 1.0);
      } else {
        sourceCanvas.toBlob(async (blob) => {
          if (!blob) {
            toast({ title: "Erro ao gerar imagem", variant: "destructive" });
            setIsGenerating(false);
            return;
          }
          
          try {
            const file = new File([blob], `aniversario-${selectedMember.firstName.toLowerCase()}.png`, { type: 'image/png' });
            
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `Feliz Aniversário ${selectedMember.firstName}`,
                text: shareText,
              });
              toast({ title: "Compartilhado com sucesso!" });
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `aniversario-${selectedMember.firstName.toLowerCase()}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              
              await navigator.clipboard.writeText(shareText);
              toast({ 
                title: "Imagem baixada!", 
                description: "Legenda copiada para a área de transferência"
              });
            }
          } catch (error) {
            console.error('Share error:', error);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aniversario-${selectedMember.firstName.toLowerCase()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            try {
              await navigator.clipboard.writeText(shareText);
              toast({ 
                title: "Imagem baixada!", 
                description: "Legenda copiada para a área de transferência"
              });
            } catch {
              toast({ title: "Imagem baixada!" });
            }
          }
          
          setIsGenerating(false);
        }, 'image/png', 1.0);
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast({ title: "Erro ao gerar imagem", variant: "destructive" });
      setIsGenerating(false);
    }
  }, [selectedMember, toast]);

  const formatBirthdate = (birthdate: string) => {
    if (birthdate.includes('-')) {
      const [year, month, day] = birthdate.split('-');
      return `${day}/${month}`;
    } else if (birthdate.includes('/')) {
      const parts = birthdate.split('/');
      return `${parts[0]}/${parts[1]}`;
    }
    return birthdate;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/marketing">
          <Button variant="ghost" size="icon" data-testid="button-back-marketing">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Arte de Aniversário</h1>
          <p className="text-muted-foreground">Gere artes personalizadas para aniversariantes</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          {birthdays?.today && birthdays.today.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Cake className="h-5 w-5 text-orange-500" />
                Aniversariantes de Hoje
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {birthdays.today.map(member => (
                  <Card key={member.id} className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {member.photoUrl ? (
                            <img 
                              src={member.photoUrl} 
                              alt={member.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{member.fullName}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatBirthdate(member.birthdate)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => openShareDialog(member)}
                            className="bg-orange-500 hover:bg-orange-600"
                            data-testid={`button-share-birthday-${member.id}`}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => publishBirthdayStoryMutation.mutate(member.id)}
                            disabled={publishBirthdayStoryMutation.isPending}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            data-testid={`button-publish-birthday-${member.id}`}
                          >
                            {publishBirthdayStoryMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SiInstagram className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {birthdays?.upcoming && birthdays.upcoming.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximos Aniversários
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {birthdays.upcoming.map(member => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          {member.photoUrl ? (
                            <img 
                              src={member.photoUrl} 
                              alt={member.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{member.fullName}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatBirthdate(member.birthdate)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            em {member.daysUntil} dia{member.daysUntil !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => openShareDialog(member)}
                          data-testid={`button-share-birthday-${member.id}`}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {(!birthdays?.today || birthdays.today.length === 0) && 
           (!birthdays?.upcoming || birthdays.upcoming.length === 0) && (
            <Card>
              <CardContent className="p-8 text-center">
                <Cake className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nenhum aniversariante encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Não há aniversários nos próximos 30 dias ou os membros não têm data de nascimento cadastrada.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="w-[85vw] max-w-xs sm:max-w-sm mx-auto" data-testid="dialog-share-birthday">
          <DialogHeader>
            <DialogTitle>Compartilhar Arte de Aniversário</DialogTitle>
          </DialogHeader>

          <div 
            ref={shareCardRef}
            data-share-card="birthday"
            style={{ 
              width: '100%',
              aspectRatio: '9/16',
              position: 'relative',
              overflow: 'hidden',
              WebkitFontSmoothing: 'antialiased',
              textRendering: 'optimizeLegibility',
            }}
          >
            {selectedMember?.photoUrl && (
              <img 
                src={selectedMember.photoUrl}
                data-member-photo="true"
                crossOrigin="anonymous"
                alt=""
                style={{
                  position: 'absolute',
                  width: '65%',
                  aspectRatio: '1/1',
                  top: '49%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  objectFit: 'cover',
                  zIndex: 1,
                }}
              />
            )}
            {!selectedMember?.photoUrl && (
              <div
                style={{
                  position: 'absolute',
                  width: '65%',
                  aspectRatio: '1/1',
                  top: '49%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <User style={{ width: '50%', height: '50%', color: '#9CA3AF' }} />
              </div>
            )}
            <img 
              src="/birthday-template.png"
              crossOrigin="anonymous"
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 2,
              }}
            />
            <p style={{
              position: 'absolute',
              bottom: '27.5%',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: '#000000',
              textAlign: 'center',
              zIndex: 3,
              whiteSpace: 'nowrap',
              fontFamily: "'Dancing Script', cursive",
              textTransform: 'capitalize',
            }}>
              {selectedMember?.firstName || ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3 mt-4 justify-center">
            <Button
              onClick={() => generateAndShareImage('whatsapp')}
              disabled={isGenerating}
              className="flex-1 min-w-[120px] bg-green-600 hover:bg-green-700"
              data-testid="button-share-whatsapp"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <SiWhatsapp className="mr-2 h-4 w-4" />
                  WhatsApp
                </>
              )}
            </Button>
            <Button
              onClick={() => generateAndShareImage('instagram')}
              disabled={isGenerating}
              className="flex-1 min-w-[120px] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              data-testid="button-share-instagram"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <SiInstagram className="mr-2 h-4 w-4" />
                  Instagram
                </>
              )}
            </Button>
            <Button
              onClick={() => generateAndShareImage('download')}
              disabled={isGenerating}
              variant="outline"
              className="flex-1 min-w-[120px]"
              data-testid="button-download"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
