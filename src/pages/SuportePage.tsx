import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Mail, HelpCircle, Clock, Shield, CreditCard, Zap, Users, ArrowLeft } from "lucide-react";
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
      { q: "Como criar minha conta?", a: "Acesse a página de cadastro, preencha seu nome, e-mail, telefone e senha. Após o cadastro, ative o Acesso Vitalício para liberar todas as funcionalidades." },
      { q: "Esqueci minha senha, como recuperar?", a: "Na página de login, clique em \"Esqueci minha senha\". Enviaremos um link de recuperação para o e-mail cadastrado." },
      { q: "Existe plano gratuito ou período de teste?", a: "Não trabalhamos com plano gratuito. O acesso é liberado com o pagamento único do Acesso Vitalício, com reembolso integral em até 7 dias." },
      { q: "Posso usar a mesma conta em vários dispositivos?", a: "Sim! Sua conta pode ser acessada de qualquer dispositivo com navegador. Seus dados ficam sincronizados automaticamente." },
    ],
  },
  {
    title: "Planos e Pagamento",
    icon: CreditCard,
    faqs: [
      { q: "Quais formas de pagamento são aceitas?", a: "Aceitamos cartões de crédito e débito (Visa, Mastercard, Elo, American Express) e Pix, processados de forma segura pelo Stripe." },
      { q: "Posso trocar de plano a qualquer momento?", a: "Sim! Faça upgrade ou downgrade quando quiser. No upgrade, a diferença é cobrada proporcionalmente. No downgrade, o novo valor vale no próximo ciclo." },
      { q: "Como cancelo minha assinatura?", a: "Acesse \"Gerenciar assinatura\" na página de planos. O cancelamento é imediato, mas você mantém acesso até o final do período já pago." },
      { q: "Posso solicitar reembolso?", a: "Sim, oferecemos reembolso integral em até 7 dias após a compra, sem perguntas. Basta entrar em contato pelo WhatsApp ou e-mail." },
      { q: "O plano Vitalício inclui atualizações futuras?", a: "Sim! O plano Vitalício garante acesso permanente a todas as funcionalidades atuais e futuras, sem custo adicional." },
    ],
  },
  {
    title: "Funcionalidades",
    icon: Zap,
    faqs: [
      { q: "Como funcionam as análises da IA?", a: "Nossa IA analisa padrões estatísticos, frequências, atrasos e tendências dos sorteios históricos para gerar combinações otimizadas. Importante: não garantimos resultados." },
      { q: "Quais loterias são suportadas?", a: "Suportamos Mega-Sena, Lotofácil, Quina, Lotomania, Dupla Sena, Timemania, Dia de Sorte e +Milionária, com dados atualizados automaticamente." },
      { q: "O que são fechamentos?", a: "Fechamentos são sistemas matemáticos que garantem uma cobertura mínima de acertos apenas se os números sorteados estiverem dentro do conjunto escolhido. Não aumentam a chance do prêmio principal." },
      { q: "Posso salvar e gerenciar minhas apostas?", a: "Sim! Você pode salvar apostas geradas, adicionar rótulos, conferir resultados e acompanhar seu histórico completo na plataforma." },
    ],
  },
  {
    title: "Segurança e Privacidade",
    icon: Shield,
    faqs: [
      { q: "Meus dados estão seguros?", a: "Sim! Utilizamos criptografia de ponta a ponta, autenticação segura e servidores protegidos. Seus dados nunca são compartilhados com terceiros." },
      { q: "A plataforma é legalizada?", a: "O Titan Loterias é uma ferramenta de análise estatística. Não realizamos apostas nem intermediamos jogos. Você faz suas apostas diretamente nas lotéricas." },
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
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Seg a Sex, 9h às 18h</span>
                </div>
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
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Resposta em até 24h</span>
                </div>
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
