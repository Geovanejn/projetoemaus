import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground mb-8">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>

        <div className="prose dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
            <p className="text-muted-foreground leading-relaxed">
              A UMP Emaús ("nós", "nosso" ou "Emaús") opera o aplicativo e site Emaús. 
              Esta página informa sobre nossas políticas relativas à coleta, uso e divulgação 
              de informações pessoais quando você usa nosso Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Informações que Coletamos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Coletamos vários tipos de informações para fornecer e melhorar nosso Serviço:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Dados Pessoais:</strong> Nome, endereço de e-mail, número de telefone e data de nascimento quando você se cadastra como membro.</li>
              <li><strong>Dados de Uso:</strong> Informações sobre como você acessa e usa o Serviço, incluindo páginas visitadas e recursos utilizados.</li>
              <li><strong>Dados do Instagram:</strong> Quando integramos com o Instagram, acessamos apenas o conteúdo público da conta vinculada para exibir posts no site.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Como Usamos Suas Informações</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Usamos as informações coletadas para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Fornecer e manter nosso Serviço</li>
              <li>Notificar sobre mudanças em nosso Serviço</li>
              <li>Permitir participação em recursos interativos</li>
              <li>Fornecer suporte ao cliente</li>
              <li>Enviar notificações sobre eventos, devocionais e atualizações</li>
              <li>Monitorar o uso do Serviço</li>
              <li>Detectar e prevenir problemas técnicos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Compartilhamento de Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              Não vendemos, comercializamos ou transferimos suas informações pessoais para terceiros. 
              Suas informações são usadas exclusivamente para os fins descritos nesta política e 
              para o funcionamento do Serviço da UMP Emaús.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Segurança dos Dados</h2>
            <p className="text-muted-foreground leading-relaxed">
              A segurança dos seus dados é importante para nós. Utilizamos medidas de segurança 
              apropriadas para proteger suas informações pessoais contra acesso não autorizado, 
              alteração, divulgação ou destruição. No entanto, nenhum método de transmissão pela 
              Internet ou armazenamento eletrônico é 100% seguro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Integração com Instagram</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Nosso aplicativo utiliza a API do Instagram para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Exibir publicações públicas da conta oficial da UMP Emaús</li>
              <li>Sincronizar conteúdo de mídia (fotos e vídeos) para o site</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Não coletamos ou armazenamos dados pessoais de seguidores ou usuários do Instagram 
              além do conteúdo público da nossa própria conta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Seus Direitos</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Você tem o direito de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Acessar as informações pessoais que temos sobre você</li>
              <li>Solicitar a correção de informações incorretas</li>
              <li>Solicitar a exclusão de suas informações pessoais</li>
              <li>Retirar seu consentimento a qualquer momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies e Tecnologias Similares</h2>
            <p className="text-muted-foreground leading-relaxed">
              Utilizamos cookies e tecnologias similares para manter sua sessão ativa, 
              lembrar suas preferências e melhorar sua experiência no Serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar nossa Política de Privacidade periodicamente. Notificaremos 
              sobre quaisquer alterações publicando a nova Política de Privacidade nesta página 
              e atualizando a data de "Última atualização".
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se você tiver alguma dúvida sobre esta Política de Privacidade, entre em contato conosco:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-3">
              <li><strong>E-mail:</strong> marketingumpemaus@gmail.com</li>
              <li><strong>Instagram:</strong> @umpemaus</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            UMP Emaús - União de Mocidade Presbiteriana
          </p>
        </div>
      </main>
    </div>
  );
}
