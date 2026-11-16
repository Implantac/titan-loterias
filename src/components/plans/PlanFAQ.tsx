import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail } from "lucide-react";
import { motion } from "framer-motion";

const faqs = [
  { q: "Existe plano gratuito?", a: "Consulte os planos disponíveis e eventuais períodos de teste na página de contratação. O preço e as condições finais aparecem antes de confirmar o checkout." },
  { q: "O plano anual renova automaticamente?", a: "Sim. O plano anual é uma assinatura com renovação automática a cada 12 meses. Confira o valor, a data da próxima cobrança e as condições de cancelamento no checkout e nos Termos de Uso." },
  { q: "O acesso vitalício tem renovação?", a: "Não. O plano vitalício é pagamento único, sem renovação automática; o acesso depende da continuidade do serviço e das condições dos Termos de Uso." },
  { q: "Como cancelo a assinatura anual?", a: "Solicite o cancelamento pelos canais de suporte ou pelo portal de cobrança, se disponível na sua conta. Verifique a data da próxima cobrança antes de contratar." },
  { q: "O vitalício inclui todas as atualizações futuras?", a: "Consulte os recursos e limites descritos nos Termos de Uso. Não prometemos disponibilidade indefinida de serviços de terceiros nem recursos ainda não lançados." },
  { q: "Quais formas de pagamento são aceitas?", a: "Os métodos disponíveis e o valor final são informados no checkout antes de você confirmar o pagamento." },
  { q: "Posso solicitar reembolso?", a: "Há direito de arrependimento em até 7 dias, conforme os Termos de Uso. Solicite pelos canais de suporte; prazo e meio do estorno dependem do método de pagamento." },
  { q: "Quais loterias são suportadas?", a: "As modalidades e recursos variam por ferramenta. Confira a modalidade específica antes de contratar; o Titan não registra apostas nos canais da Caixa." },
];

export function PlanFAQ() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="mt-16 max-w-3xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Perguntas Frequentes</h2>
          <p className="text-xs text-muted-foreground">Tire suas dúvidas antes de comprar</p>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
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

      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-muted/50 border border-border/30">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Ainda tem dúvidas?{" "}
            <a href="mailto:suporte@titanloterias.com" className="text-primary hover:underline font-medium">
              Fale com nosso suporte
            </a>
          </span>
        </div>
      </div>
    </motion.div>
  );
}
