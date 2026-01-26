import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  FileText, 
  Download,
  Calendar,
  TrendingUp,
  Users,
  ShoppingBag,
  Landmark,
  Loader2
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const reportTypes = [
  {
    id: "monthly",
    title: "Relatório Mensal",
    description: "Resumo de entradas e saídas do mês selecionado",
    icon: Calendar,
  },
  {
    id: "annual",
    title: "Relatório Anual",
    description: "Consolidado financeiro do ano completo",
    icon: TrendingUp,
  },
  {
    id: "members",
    title: "Relatório de Membros",
    description: "Status de pagamento de todos os membros",
    icon: Users,
  },
  {
    id: "shop",
    title: "Relatório da Loja",
    description: "Vendas e pedidos da loja virtual",
    icon: ShoppingBag,
  },
  {
    id: "loans",
    title: "Relatório de Empréstimos",
    description: "Situação de todos os empréstimos",
    icon: Landmark,
  },
];

const months = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export default function TesourariaRelatorios() {
  const { hasTreasuryPanel } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  if (!hasTreasuryPanel) {
    setLocation("/admin");
    return null;
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const handleGenerateReport = async (reportId: string) => {
    setGeneratingReport(reportId);
    const token = localStorage.getItem("token");
    
    try {
      let url = "";
      let filename = "";
      
      switch (reportId) {
        case "monthly":
          url = `/api/treasury/reports/excel?year=${selectedYear}&month=${selectedMonth}`;
          filename = `relatorio-mensal-${selectedYear}-${selectedMonth.padStart(2, "0")}.xlsx`;
          break;
        case "annual":
          url = `/api/treasury/reports/excel?year=${selectedYear}`;
          filename = `relatorio-anual-${selectedYear}.xlsx`;
          break;
        case "members":
          url = `/api/treasury/reports/member-payments?year=${selectedYear}`;
          filename = `relatorio-membros-${selectedYear}.xlsx`;
          break;
        case "shop":
          url = `/api/treasury/reports/excel?year=${selectedYear}&category=loja`;
          filename = `relatorio-loja-${selectedYear}.xlsx`;
          break;
        case "loans":
          url = `/api/treasury/reports/excel?year=${selectedYear}&category=emprestimos`;
          filename = `relatorio-emprestimos-${selectedYear}.xlsx`;
          break;
        default:
          throw new Error("Tipo de relatorio desconhecido");
      }
      
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const response = await fetch(url, {
        headers,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Erro ao gerar relatorio");
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Relatorio gerado",
        description: `O arquivo ${filename} foi baixado.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Nao foi possivel gerar o relatorio.",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-amber-600 via-orange-600 to-orange-700 text-white py-8">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Link href="/admin/tesouraria">
              <Button 
                variant="ghost" 
                className="mb-4 text-white/80 gap-2"
                data-testid="button-back-treasury"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-reports-title">
                  Relatórios
                </h1>
                <p className="text-white/80">
                  Gerar e exportar relatórios financeiros
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-6 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Período</CardTitle>
                <CardDescription>
                  Selecione o período para os relatórios mensais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-40" data-testid="select-month">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32" data-testid="select-year">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <report.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{report.title}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {report.description}
                    </p>
                    <Button 
                      className="w-full gap-2"
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={generatingReport !== null}
                      data-testid={`button-generate-${report.id}`}
                    >
                      {generatingReport === report.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Baixar Excel
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
