import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, HelpCircle, Shield, CreditCard, Zap, Users, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import { useNavigate } from "react-router-dom";

const WHATSAPP_NUMBER = "5543998581400";
const WHATSAPP_MESSAGE = encodeURIComponent("Olá! Preciso de ajuda com o Titan Loterias.");
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`;

const faqCategories = [
  {
    title: "Conta e Acesso",
    icon: Users,
    faqs: [
      { q: "Como criar minha conta?", a: "Acesse o cadastro e confira os dados solicitados. Os recursos disponíveis dependem do plano contratado e das condições exibidas antes do pagamento." },
      { q: "Esqueci minha senha, como recuperar?", a: "Use 'Esqueci minha senha' na página de login e siga as instruções enviadas ao e-mail cadastrado." },
      { q: "Existe plano gratuito ou período de teste?", a: "Consulte os planos e eventuais períodos de teste na página de contratação; não presuma que o acesso vitalício seja obrigatório." },
      { q: "Posso usar a mesma conta em vários dispositivos?", a: "Acesse com suas credenciais em dispositivos compatíveis. Confira dados disponíveis após entrar; atualizações podem depender da conexão." },
    ],
  },
  {
    title: "Planos e Pagamento",
    icon: CreditCard,
    faqs: [
      { q: "Quais formas de pagamento são aceitas?", a: "Confira métodos e valor final no checkout antes de confirmar o pagamento; disponibilidade pode variar." },
      { q: "O plano anual renova automaticamente?", a: "Sim. É uma assinatura que renova automaticamente a cada 12 meses. Confira valor, próxima cobrança e condições nos Termos e no checkout." },
      { q: "O acesso vitalício tem mensalidade?", a: "Não. É pagamento único, sem renovação automática, sujeito à continuidade do serviço e aos Termos de Uso." },
      { q: "Como cancelo a assinatura anual?", a: "Solicite pelos canais de suporte ou pelo portal de cobrança, se disponível na sua conta. Confirme o prazo e a data da próxima cobrança." },
      { q: "Posso solicitar reembolso?", a: "Há direito de arrependimento em até 7 dias, conforme os Termos de Uso. Contate o suporte; prazo e meio do estorno dependem da forma de pagamento." },
      { q: "O vitalício inclui todas as atualizações futuras?", a: "Consulte recursos e limites dos Termos de Uso. Não prometemos recursos ainda não lançados nem disponibilidade indefinida de serviços de terceiros." },
    ],
  },
  {
    title: "Funcionalidades",
    icon: Zap,
    faqs: [
      { q: "As análises da IA garantem acertos?", a: "Não. Filtros e análises organizam jogos, mas não preveem os números sorteados nem garantem prêmio." },
      { q: "Quais loterias são suportadas?", a: "Modalidades e recursos variam por ferramenta; confira a modalidade específica antes de contratar. Algumas exigem regras adicionais para exportação." },
      { q: "O que são fechamentos?", a: "São matrizes de jogos com metas condicionadas à base escolhida. Uma cobertura só é demonstrada quando verificada exaustivamente; não garante prêmio financeiro." },
      { q: "O Titan registra minhas apostas?", a: "Não. Jogos salvos, fichas, PDF e hash são registros internos. Somente os canais oficiais da Caixa podem registrar a aposta e emitir o comprovante correspondente." },
    ],
  },
  {
    title: "Segurança e Privacidade",
    icon: Shield,
    faqs: [
      { q: "Como meus dados são tratados?", a: "Consulte a Política de Privacidade. Evite compartilhar senhas; dados de pagamentos e apostas oficiais devem ser conferidos nos canais responsáveis." },
      { q: "O Titan vende cotas de Bolão Caixa?", a: "Não. O módulo serve para planejamento privado; não vende cotas, confirma PIX nem substitui o recibo oficial da Caixa." },
    ],
  },
];

export default function SuportePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Central de Suporte</h1>
          </div>
          <Button asChild className="gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Falar no WhatsApp</span>
            </a>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-12">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Como podemos ajudar?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Encontre respostas para as dúvidas mais comuns ou entre em contato com nossa equipe.</p>
        </motion.div>

        {/* Contact Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid sm:grid-cols-2 gap-4">
          <Card className="p-6 border-border/30 bg-card/50 backdrop-blur-sm hover:border-[hsl(142,70%,45%)]/40 transition-colors group">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[hsl(142,70%,45%)]/10 border border-[hsl(142,70%,45%)]/20 flex items-center justify-center shrink-0 group-hover:bg-[hsl(142,70%,45%)]/20 transition-colors">
                <MessageCircle className="w-6 h-6 text-[hsl(142,70%,45%)]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">WhatsApp</h3>
                <p className="text-sm text-muted-foreground mt-1">(43) 99858-1400</p>
                <p className="text-xs text-muted-foreground mt-2">Confira a disponibilidade do atendimento ao enviar sua mensagem.</p>
              </div>
            </a>
          </Card>

          <Card className="p-6 border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-colors group">
            <a href="mailto:suporte@titanloterias.com" className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">E-mail</h3>
                <p className="text-sm text-muted-foreground mt-1">suporte@titanloterias.com</p>
                <p className="text-xs text-muted-foreground mt-2">Prazo de resposta não garantido; informe sua dúvida e um contato para retorno.</p>
              </div>
            </a>
          </Card>
        </motion.div>

        {/* FAQ Categories */}
        {faqCategories.map((category, ci) => (
          <motion.div key={ci} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + ci * 0.1 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <category.icon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{category.title}</h3>
            </div>
            <Accordion type="single" collapsible className="space-y-2">
              {category.faqs.map((faq, fi) => (
                <AccordionItem
                  key={fi}
                  value={`cat-${ci}-faq-${fi}`}
                  className="border border-border/30 rounded-lg px-4 bg-card/50 backdrop-blur-sm data-[state=open]:border-primary/30 transition-colors"
                >
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        ))}

        {/* Bottom CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-center py-8">
          <Card className="p-8 border-border/30 bg-card/50 backdrop-blur-sm inline-block">
            <p className="text-foreground font-semibold mb-2">Não encontrou o que procurava?</p>
            <p className="text-sm text-muted-foreground mb-5">Nossa equipe está pronta para ajudar você.</p>
            <Button asChild size="lg" className="gap-2 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-5 h-5" />
                Falar com o Suporte
              </a>
            </Button>
          </Card>
        </motion.div>
      </main>

      <WhatsAppButton />
    </div>
  );
}
