import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  Users,
  Phone,
  Loader2
} from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StaggerContainer, StaggerItem } from "@/components/AnimatedPage";

interface BoardMember {
  id: number;
  name: string;
  position: string;
  bio?: string;
  photoUrl?: string;
  instagram?: string;
  whatsapp?: string;
  termStart: string;
  termEnd: string;
  orderIndex: number;
  isCurrent: boolean;
}

const defaultBoardMembers: BoardMember[] = [];

const EmptyStateMessage = () => (
  <div className="text-center py-16">
    <p className="text-muted-foreground text-lg">
      A diretoria ainda não foi cadastrada. Em breve você conhecerá nossos líderes.
    </p>
  </div>
);

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function DiretoriaPage() {
  const { data: boardMembersData, isLoading, isError } = useQuery<BoardMember[]>({
    queryKey: ['/api/site/board-members'],
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const boardMembers = isError ? defaultBoardMembers : (boardMembersData && boardMembersData.length > 0 ? boardMembersData : defaultBoardMembers);
  
  const allMembers = boardMembers
    .filter(m => m.isCurrent)
    .sort((a, b) => a.orderIndex - b.orderIndex);
    
  const currentTerm = boardMembers[0]?.termStart && boardMembers[0]?.termEnd 
    ? `${boardMembers[0].termStart}-${boardMembers[0].termEnd}` 
    : "2024-2025";

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
              <Users className="h-8 w-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-orange-400 to-amber-400 bg-clip-text text-transparent">
              Diretoria
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Conheça a diretoria da UMP Emaús
            </p>
            <Badge variant="secondary" className="mt-4">
              Gestão {currentTerm}
            </Badge>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : allMembers.length === 0 ? (
            <EmptyStateMessage />
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {allMembers.map((member) => (
                <StaggerItem key={member.id}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <Card className="h-full flex flex-col hover-elevate">
                      <CardContent className="p-6 flex flex-col items-center text-center flex-1">
                        <Avatar className="w-24 h-24 mb-4 border-4 border-primary/20">
                          <AvatarImage src={member.photoUrl || undefined} alt={member.name} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-amber-500 text-white text-2xl">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <h3 className="font-semibold text-lg" data-testid={`member-name-${member.id}`}>
                          {member.name}
                        </h3>
                        
                        <Badge variant="secondary" className="mt-2">
                          {member.position}
                        </Badge>
                        
                        {member.bio && (
                          <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">
                            {member.bio}
                          </p>
                        )}
                        
                        <div className="flex gap-2 mt-4">
                          {member.whatsapp && (
                            <Button size="icon" variant="ghost" asChild>
                              <a 
                                href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`member-whatsapp-${member.id}`}
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {member.instagram && (
                            <Button size="icon" variant="ghost" asChild>
                              <a 
                                href={`https://instagram.com/${member.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`member-instagram-${member.id}`}
                              >
                                <SiInstagram className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
