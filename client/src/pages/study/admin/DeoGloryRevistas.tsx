import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DeoGloryAdminLayout } from "@/components/deoglory/DeoGloryAdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  CheckCircle,
  FileEdit,
  Download,
  Plus,
  Eye,
  Edit,
  MoreVertical,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Season } from "@shared/schema";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconBgColor: string;
  iconColor: string;
}

function StatCard({ title, value, icon: Icon, iconBgColor, iconColor }: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-xl ${iconBgColor}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MagazineCard({ season }: { season: Season }) {
  const [, navigate] = useLocation();
  const isPublished = season.status === "published";
  const isProcessing = season.status === "processing";
  const isDraft = season.status === "draft";

  const statusLabel = isPublished ? "Publicado" : isProcessing ? "Processando" : "Rascunho";
  const statusBadgeClass = isPublished
    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    : isProcessing
    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";

  const formattedDate = season.createdAt
    ? format(new Date(season.createdAt), "MMM yyyy", { locale: ptBR })
    : "";

  const defaultCover = "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=300&h=400&fit=crop";

  return (
    <Card className="bg-white dark:bg-gray-800 border-0 shadow-sm overflow-visible">
      <div className="relative bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden" style={{ aspectRatio: '3/4' }}>
        <img
          src={season.coverImageUrl || defaultCover}
          alt={season.title}
          className="w-full h-full object-cover"
        />
      </div>
      <CardContent className="p-2 md:p-4">
        <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
          <Badge className={`border-0 font-medium text-xs ${statusBadgeClass}`} size="sm">
            {statusLabel}
          </Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{formattedDate}</span>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1 text-xs md:text-sm">
          {season.aiExtractedTitle || season.title}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1 md:line-clamp-2 hidden md:block">
          {season.description || "Estudo bíblico"}
        </p>
        {isPublished ? (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span className="hidden sm:inline">{season.totalLessons} lições</span>
              <span className="sm:hidden">{season.totalLessons}</span>
            </div>
          </div>
        ) : isProcessing ? (
          <div className="mb-2">
            <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="hidden sm:inline">Processando...</span>
            </div>
          </div>
        ) : (
          <div className="mb-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Aguardando</span>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1 text-xs border-blue-200 text-blue-600 dark:border-blue-800 dark:text-blue-400"
          data-testid={`button-view-magazine-${season.id}`}
          onClick={() => navigate(`/study/admin/estudos?revista=${season.id}`)}
        >
          <Eye className="h-3 w-3" />
          <span>{isPublished ? "Ver" : "Gerenciar"}</span>
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateMagazineCard() {
  const [, navigate] = useLocation();
  
  return (
    <Card className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-sm overflow-visible flex flex-col items-center justify-center" style={{ minHeight: 'calc(100% - 1px)' }}>
      <CardContent className="p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
          <Plus className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Criar Nova Revista</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Comece um novo estudo bíblico
        </p>
        <Button 
          className="bg-blue-600 hover:bg-blue-700" 
          data-testid="button-create-magazine"
          onClick={() => navigate("/study/admin/estudos")}
        >
          Começar Agora
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-white dark:bg-gray-800 border-0 shadow-sm overflow-hidden animate-pulse">
          <div className="h-40 bg-gray-200 dark:bg-gray-700" />
          <CardContent className="p-4">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
            <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function DeoGloryRevistas() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: seasons = [], isLoading } = useQuery<Season[]>({
    queryKey: ["/api/study/admin/seasons"],
  });

  const filteredSeasons = seasons.filter((season) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "published" && season.status === "published") ||
      (statusFilter === "draft" && (season.status === "draft" || season.status === "processing"));
    
    const matchesSearch =
      !searchTerm ||
      season.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (season.aiExtractedTitle && season.aiExtractedTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: seasons.length,
    published: seasons.filter((s) => s.status === "published").length,
    drafts: seasons.filter((s) => s.status === "draft" || s.status === "processing").length,
    totalLessons: seasons.reduce((acc, s) => acc + (s.totalLessons || 0), 0),
  };

  return (
    <DeoGloryAdminLayout
      title="Gestao de Revistas"
      subtitle="Gerencie as revistas publicadas e crie novas edicoes"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-xl min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar revistas..."
              className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              data-testid="input-search-magazines"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-white dark:bg-gray-800" data-testid="select-status">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="published">Publicado</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total de Revistas"
            value={stats.total}
            icon={BookOpen}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Publicadas"
            value={stats.published}
            icon={CheckCircle}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
            iconColor="text-green-600 dark:text-green-400"
          />
          <StatCard
            title="Rascunhos"
            value={stats.drafts}
            icon={FileEdit}
            iconBgColor="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <StatCard
            title="Total de Licoes"
            value={stats.totalLessons}
            icon={BookOpen}
            iconBgColor="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
          />
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredSeasons.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            {filteredSeasons.map((season) => (
              <MagazineCard key={season.id} season={season} />
            ))}
            {statusFilter === "all" && !searchTerm && <CreateMagazineCard />}
          </div>
        ) : seasons.length > 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Nenhuma revista encontrada com os filtros selecionados.
            </p>
            <Button variant="outline" onClick={() => { setStatusFilter("all"); setSearchTerm(""); }}>
              Limpar Filtros
            </Button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Nenhuma revista criada ainda.
            </p>
            <CreateMagazineCard />
          </div>
        )}
      </div>
    </DeoGloryAdminLayout>
  );
}
