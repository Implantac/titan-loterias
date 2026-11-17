import React from "react";
import { 
  BookOpen, 
  Video, 
  HelpCircle, 
  Target, 
  Layers, 
  Zap, 
  ArrowRight, 
  Brain,
  Info
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const glossaryItems = [
  {
    term: "Entropia de Shannon",
    description: "Mede o grau de 'surpresa' ou imprevisibilidade de um sorteio. Em loterias, jogos com entropia muito baixa (ex: 01-02-03...) ou muito alta são menos frequentes que o 'caos organizado' observado na maioria dos concursos.",
    category: "Probabilidade"
  },
  {
    term: "Cadeia de Markov (2ª Ordem)",
    description: "Modelo estocástico que analisa a probabilidade de um número aparecer com base no que aconteceu nos dois sorteios anteriores. O Titan usa isso para detectar regimes de 'tendência' ou 'correção'.",
    category: "Machine Learning"
  },
  {
    term: "Teste Qui-Quadrado (χ²)",
    description: "Teste estatístico usado para verificar se a distribuição de números em um sorteio segue uma distribuição uniforme (o esperado para um sorteio justo) ou se apresenta anomalias significativas.",
    category: "Estatística"
  },
  {
    term: "Correlação de Pearson",
    description: "Mede o grau de relação linear entre duas variáveis (ex: a dezena 05 costuma sair junto com a 13?). Valores próximos a 1 indicam forte coocorrência.",
    category: "BI / Analytics"
  },
  {
    term: "Algoritmo de Wheeling (Desdobramento)",
    description: "Técnica matemática que permite jogar com mais números do que o mínimo permitido, garantindo prêmios secundários (ex: 14 pontos na Lotofácil) se os números sorteados estiverem dentro do seu conjunto escolhido.",
    category: "Combinatória"
  },
  {
    term: "Critério de Kelly",
    description: "Fórmula matemática usada para determinar o tamanho ideal de uma aposta (stake) em relação ao seu capital total, equilibrando o risco de quebra com o crescimento da banca.",
    category: "Gestão Financeira"
  }
];

const tutorials = [
  {
    title: "Como criar seu primeiro jogo estratégico",
    duration: "3 min",
    icon: Target,
    description: "Aprenda a usar o Gerador Inteligente integrando filtros de moldura, soma e paridade."
  },
  {
    title: "Entendendo o Titan Score",
    duration: "4 min",
    icon: Brain,
    description: "O que significa a nota de 0 a 100 e como as 6 dimensões de análise influenciam sua aposta."
  },
  {
    title: "Dominando Fechamentos Matemáticos",
    duration: "6 min",
    icon: Layers,
    description: "Diferença entre fechamento total e simplificado e como reduzir custos sem perder garantia."
  }
];

const CentralEstudosPage = () => {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-2xl shadow-primary/10">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Central de <span className="gradient-brand-text">Estudos</span></h1>
            <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest">Titan Academy • Onde a sorte encontra a matemática</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="glossary" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary/10 p-1 rounded-xl border border-border/40 backdrop-blur-md">
          <TabsTrigger value="glossary" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] italic">
            <BookOpen className="w-3.5 h-3.5 mr-2" />
            Glossário
          </TabsTrigger>
          <TabsTrigger value="tutorials" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] italic">
            <Video className="w-3.5 h-3.5 mr-2" />
            Tutoriais
          </TabsTrigger>
          <TabsTrigger value="faq" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] italic">
            <HelpCircle className="w-3.5 h-3.5 mr-2" />
            Ajuda & FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="glossary" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {glossaryItems.map((item, index) => (
              <Card key={index} className="glass-card border-border/40 hover:border-primary/40 transition-all duration-300 group overflow-hidden shadow-premium hover:shadow-premium-hover">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20">
                      {item.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-black uppercase italic tracking-tighter group-hover:text-primary transition-colors">{item.term}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Info className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Nota do Arquiteto:</span> O Titan utiliza esses conceitos não para prever o futuro, mas para eliminar combinações matematicamente improváveis e aumentar a eficiência estatística das suas apostas.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutorials" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tutorials.map((video, index) => (
              <Card key={index} className="glass-card border-border/40 hover:border-primary/20 transition-all group cursor-pointer overflow-hidden shadow-premium hover:shadow-premium-hover">
                <div className="aspect-video bg-black/40 flex items-center justify-center relative group-hover:bg-black/20 transition-all">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 group-hover:scale-110 transition-transform shadow-2xl shadow-primary/20">
                    <Zap className="w-8 h-8 text-primary fill-primary/20" />
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/80 text-[10px] font-bold text-white border border-white/10">
                    {video.duration}
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                    {video.title}
                  </CardTitle>
                  <CardDescription className="leading-relaxed">
                    {video.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-end">
                  <Button variant="ghost" size="sm" className="group/btn text-xs font-bold uppercase tracking-widest">
                    Ver Guia <ArrowRight className="ml-2 w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faq" className="mt-6">
          <Card className="glass-card border-border/40 overflow-hidden shadow-premium">
            <CardHeader className="border-b border-border/10 bg-secondary/5">
              <CardTitle className="text-xl font-black uppercase italic tracking-tighter">Dúvidas Frequentes</CardTitle>
              <CardDescription className="font-mono text-[10px] uppercase tracking-widest">Respostas rápidas para as perguntas mais comuns dos nossos usuários.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="px-6 border-border/10">
                  <AccordionTrigger className="hover:no-underline font-black uppercase italic tracking-tighter text-sm">O Titan garante 15 pontos na Lotofácil?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-6">
                    Não. O Titan é uma ferramenta de auxílio à decisão baseada em inteligência estatística. Filtros alteram a composição dos jogos, mas não tornam uma combinação válida mais provável de ser sorteada. Não há garantia de prêmio.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="px-6 border-border/10">
                  <AccordionTrigger className="hover:no-underline font-bold text-sm">Qual a diferença entre o Gerador e o Fechamento?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-6">
                    O Gerador cria jogos individuais baseados em filtros estatísticos. O Fechamento (Wheeling) organiza jogos em uma matriz. Uma meta de acertos só pode ser afirmada quando verificada exaustivamente e condicionada a que as dezenas sorteadas estejam na base escolhida; isso não garante prêmio financeiro.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3" className="px-6 border-border/10">
                  <AccordionTrigger className="hover:no-underline font-bold text-sm">O que é o "Modo Deus" (God Mode)?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-6">
                    É um privilégio administrativo reservado aos gestores do sistema, garantindo acesso vitalício e irrestrito a todos os módulos, ignorando limitações de planos ou faturamento para fins de supervisão técnica.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4" className="px-6 border-border/10">
                  <AccordionTrigger className="hover:no-underline font-bold text-sm">Os dados dos sorteios são atualizados em tempo real?</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-6">
                    Sim. Nossas Edge Functions sincronizam com os resultados oficiais da CEF minutos após o sorteio ser homologado, disparando alertas proativos e atualizando todos os motores de análise instantaneamente.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CentralEstudosPage;
