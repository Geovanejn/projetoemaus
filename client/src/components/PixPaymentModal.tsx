import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, Clock, QrCode, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PixPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId: number;
  amount: number;
  description: string;
  onPaymentComplete?: () => void;
}

export function PixPaymentModal({
  open,
  onOpenChange,
  entryId,
  amount,
  description,
  onPaymentComplete,
}: PixPaymentModalProps) {
  const { toast } = useToast();
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    expiresAt: string;
    paymentId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"loading" | "pending" | "approved" | "expired" | "error">("loading");
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const generatePixMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/pix/generate/${entryId}`);
      return res.json();
    },
    onSuccess: (data) => {
      setPixData({
        qrCode: data.qrCode,
        qrCodeBase64: data.qrCodeBase64,
        expiresAt: data.expiresAt,
        paymentId: data.paymentId,
      });
      setStatus("pending");
    },
    onError: (error: Error) => {
      setStatus("error");
      toast({
        title: "Erro ao gerar PIX",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkStatusMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/pix/check/${entryId}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.approved || data.status === "completed") {
        setStatus("approved");
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pagamento foi aprovado com sucesso.",
        });
        onPaymentComplete?.();
      } else if (data.status === "expired") {
        setStatus("expired");
      }
    },
  });

  useEffect(() => {
    if (open && entryId) {
      generatePixMutation.mutate();
    }
    return () => {
      setPixData(null);
      setStatus("loading");
    };
  }, [open, entryId]);

  useEffect(() => {
    if (!pixData?.expiresAt) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expires = new Date(pixData.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        setStatus("expired");
      }
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [pixData?.expiresAt]);

  useEffect(() => {
    if (status !== "pending" || !open) return;

    const interval = setInterval(() => {
      checkStatusMutation.mutate();
    }, 5000);

    return () => clearInterval(interval);
  }, [status, open]);

  const handleCopy = async () => {
    if (pixData?.qrCode) {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast({
        title: "Copiado!",
        description: "Codigo PIX copiado para a area de transferencia.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagamento PIX
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-2 py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
            </div>
          )}

          {status === "pending" && pixData && (
            <>
              <div className="text-center mb-2">
                <p className="text-2xl font-bold">{formatAmount(amount)}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Expira em {formatTime(timeLeft)}
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg">
                {pixData.qrCodeBase64 && (
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                    data-testid="img-pix-qrcode"
                  />
                )}
              </div>

              <div className="w-full space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Ou copie o codigo PIX:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData.qrCode?.slice(0, 40) + "..."}
                    className="flex-1 px-3 py-2 text-xs bg-muted rounded-md border"
                    data-testid="input-pix-code"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    data-testid="button-copy-pix"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Aguardando pagamento
              </Badge>
            </>
          )}

          {status === "approved" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Pagamento Confirmado!</p>
                <p className="text-sm text-muted-foreground">{formatAmount(amount)}</p>
              </div>
              <Button onClick={() => onOpenChange(false)} data-testid="button-close-pix">
                Fechar
              </Button>
            </div>
          )}

          {status === "expired" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-orange-100 dark:bg-orange-900 p-4">
                <Clock className="h-12 w-12 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">QR Code Expirado</p>
                <p className="text-sm text-muted-foreground">Gere um novo codigo para pagar</p>
              </div>
              <Button
                onClick={() => {
                  setStatus("loading");
                  generatePixMutation.mutate();
                }}
                data-testid="button-regenerate-pix"
              >
                Gerar Novo PIX
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="rounded-full bg-red-100 dark:bg-red-900 p-4">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Erro ao gerar PIX</p>
                <p className="text-sm text-muted-foreground">Tente novamente mais tarde</p>
              </div>
              <Button
                onClick={() => {
                  setStatus("loading");
                  generatePixMutation.mutate();
                }}
                variant="outline"
                data-testid="button-retry-pix"
              >
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
