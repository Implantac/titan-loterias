import { useTranslation } from "react-i18next";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function FAQSection() {
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 relative bg-card/20 border-y border-border/40">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-primary/10 text-primary border border-primary/20">
            <HelpCircle className="w-3.5 h-3.5" />
            Tire Suas Dúvidas
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Perguntas <span className="gradient-brand-text">Frequentes</span>
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg font-normal leading-relaxed">
            Respostas transparentes sobre o funcionamento, metodologia e escopo da plataforma.
          </p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <AccordionItem 
              key={i} 
              value={`item-${i}`} 
              className="border border-border/40 bg-card/40 hover:border-primary/30 transition-colors rounded-xl px-5 sm:px-6 overflow-hidden"
            >
              <AccordionTrigger className="text-left font-semibold text-base sm:text-lg text-foreground hover:text-primary transition-colors py-4 sm:py-5 no-underline hover:no-underline">
                {t(`landing.faq.q${i}` as any)}
              </AccordionTrigger>
              <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pb-5 pt-1">
                {t(`landing.faq.a${i}` as any)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
