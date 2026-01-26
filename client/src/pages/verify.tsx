import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface VerificationResult {
  verified: boolean;
  electionName?: string;
  presidentName?: string;
  createdAt?: string;
  electionId?: number;
  electionCreatedAt?: string;
  electionClosedAt?: string;
}

export default function VerifyPage() {
  const [, params] = useRoute("/verificar/:hash");
  const hash = params?.hash;
  
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hash) {
      setError("Hash de verificação não fornecido");
      setLoading(false);
      return;
    }

    const verifyPdf = async () => {
      try {
        const response = await fetch(`/api/verify/${hash}`);
        
        if (!response.ok) {
          let errorMessage = "Erro ao verificar PDF";
          try {
            const data = await response.json();
            errorMessage = data.message || errorMessage;
          } catch {
            // Response doesn't have JSON body
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        setVerificationResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido ao verificar PDF");
      } finally {
        setLoading(false);
      }
    };

    verifyPdf();
  }, [hash]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4" data-testid="page-verify">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
            <p className="text-lg text-gray-600">Verificando autenticidade do documento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4" data-testid="page-verify">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <CardTitle className="text-red-700">Verificação Falhou</CardTitle>
            </div>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              O documento não pôde ser verificado. Isso pode acontecer se:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
              <li>O código QR foi danificado ou alterado</li>
              <li>O documento não foi gerado pelo sistema oficial</li>
              <li>O link de verificação está incorreto</li>
            </ul>
            <Link href="/">
              <Button 
                variant="outline"
                className="w-full"
                data-testid="button-back-home"
              >
                Voltar para a página inicial
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!verificationResult?.verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4" data-testid="page-verify">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <CardTitle className="text-red-700">Documento Inválido</CardTitle>
            </div>
            <CardDescription className="text-red-600">
              Este documento não foi verificado como autêntico
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              O documento apresentado não corresponde a nenhum relatório oficial de auditoria registrado em nosso sistema.
            </p>
            <Link href="/">
              <Button 
                variant="outline"
                className="w-full"
                data-testid="button-back-home"
              >
                Voltar para a página inicial
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white p-4" data-testid="page-verify">
      <Card className="w-full max-w-md border-green-200">
        <CardHeader>
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <CardTitle className="text-green-700">Documento Autêntico</CardTitle>
          </div>
          <CardDescription className="text-green-600">
            Este documento foi verificado com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Eleição</p>
            <p className="text-lg font-semibold text-gray-900" data-testid="text-election-name">
              {verificationResult.electionName}
            </p>
          </div>
          
          {verificationResult.presidentName && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Assinado por</p>
              <p className="text-lg font-semibold text-gray-900" data-testid="text-president-name">
                {verificationResult.presidentName}
              </p>
              <p className="text-xs text-gray-500">Presidente em Exercício da UMP Emaús</p>
            </div>
          )}
          
          {verificationResult.createdAt && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Data de Emissão</p>
              <p className="text-base text-gray-900" data-testid="text-created-at">
                {new Date(verificationResult.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Sao_Paulo',
                })}
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              Este documento foi gerado e autenticado pelo sistema oficial de votação da União de Mocidade Presbiteriana Emaús
            </p>
          </div>

          <Link href="/">
            <Button 
              variant="outline"
              className="w-full mt-4"
              data-testid="button-back-home"
            >
              Voltar para a página inicial
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
