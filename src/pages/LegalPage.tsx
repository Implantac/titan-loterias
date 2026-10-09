import { motion } from "framer-motion";
import { ArrowLeft, Shield, FileText, Lock, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";

/**
 * Páginas legais (Termos, Privacidade, Segurança) e institucional (Sobre).
 *
 * O conteúdo descreve o que o sistema FAZ DE FATO, verificado no código:
 * dados coletados na tabela `profiles`, pagamento via Stripe, hospedagem
 * Supabase e processamento de IA por gateway de terceiro. Não invente
 * informações aqui sem conferir no repositório.
 *
 * ⚠️ PREENCHER ANTES DE PUBLICAR: razão social e CNPJ do titular.
 */

const CONTATO_EMAIL = "etcsuporte889@gmail.com";
const ATUALIZACAO = "09 de outubro de 2026";

type DocKey = "termos" | "privacidade" | "seguranca" | "sobre";

interface Section {
  title: string;
  body: string[];
}

const DOCS: Record<DocKey, { icon: typeof FileText; title: string; subtitle: string; sections: Section[] }> = {
  termos: {
    icon: Scale,
    title: "Termos de Uso",
    subtitle: "Condições que regem o uso da plataforma Titan Loterias",
    sections: [
      {
        title: "1. O que é a plataforma",
        body: [
          "O Titan Loterias é uma ferramenta de análise estatística aplicada às loterias oficiais brasileiras. A plataforma gera, analisa e organiza combinações numéricas a partir de dados históricos de sorteios públicos.",
          "A plataforma NÃO realiza apostas, NÃO intermedia jogos, NÃO recebe valores de apostas e NÃO possui qualquer vínculo com a Caixa Econômica Federal ou com as loterias oficiais. As apostas são feitas exclusivamente pelo usuário, nos canais oficiais.",
        ],
      },
      {
        title: "2. Ausência de garantia de resultado",
        body: [
          "Loterias são jogos de azar. Os sorteios são independentes e aleatórios, e nenhuma análise estatística altera a probabilidade de um resultado.",
          "Fechamentos e desdobramentos ampliam a cobertura de combinações jogadas e podem garantir faixas de premiação menores quando os números sorteados estão dentro do conjunto escolhido. Eles NÃO aumentam a chance do prêmio principal e NÃO constituem método de lucro.",
          "Nenhuma funcionalidade da plataforma — incluindo as análises geradas por inteligência artificial — promete, sugere ou garante premiação. Toda decisão de apostar é exclusiva do usuário.",
        ],
      },
      {
        title: "3. Conta e responsabilidade do usuário",
        body: [
          "O usuário é responsável pela veracidade dos dados informados no cadastro e pela guarda de sua senha. Atividades realizadas sob uma conta são de responsabilidade de seu titular.",
          "A conta é pessoal e intransferível. O compartilhamento de credenciais pode resultar em suspensão de acesso.",
        ],
      },
      {
        title: "4. Condições comerciais",
        body: [
          "O acesso é liberado mediante pagamento único, sem mensalidade e sem renovação automática. Os valores e as condições vigentes estão descritos na página de planos no momento da compra.",
          "O pagamento é processado pelo Stripe. Os dados de cartão não transitam nem são armazenados nos servidores da plataforma.",
          "Reembolso integral em até 7 (sete) dias corridos da compra, mediante solicitação pelos canais de atendimento, conforme o direito de arrependimento do art. 49 do Código de Defesa do Consumidor.",
        ],
      },
      {
        title: "5. Uso proibido",
        body: [
          "É vedado: tentar acessar dados de outros usuários; fazer engenharia reversa, extração automatizada em massa ou revenda do conteúdo da plataforma; usar a plataforma para qualquer finalidade ilícita.",
        ],
      },
      {
        title: "6. Disponibilidade",
        body: [
          "A plataforma depende de fontes externas de dados e de serviços de terceiros. Esforços são feitos para manter a disponibilidade, mas não há garantia de operação ininterrupta ou de que a base de resultados estará sempre atualizada no instante do acesso.",
        ],
      },
      {
        title: "7. Jogo responsável",
        body: [
          "Apostas envolvem risco financeiro real. Estabeleça um orçamento que não comprometa suas despesas essenciais e não tente recuperar perdas apostando mais.",
          "Se o jogo deixou de ser entretenimento, procure ajuda. No Brasil, o CVV atende pelo telefone 188, 24 horas, gratuitamente.",
        ],
      },
      {
        title: "8. Alterações e contato",
        body: [
          `Estes termos podem ser atualizados. A versão vigente é sempre a publicada nesta página. Última atualização: ${ATUALIZACAO}.`,
          `Dúvidas: ${CONTATO_EMAIL} ou pelo WhatsApp disponível no rodapé.`,
        ],
      },
    ],
  },

  privacidade: {
    icon: FileText,
    title: "Política de Privacidade",
    subtitle: "Quais dados coletamos, por quê, e quais são os seus direitos (LGPD — Lei 13.709/2018)",
    sections: [
      {
        title: "1. Dados que coletamos",
        body: [
          "No cadastro: nome, e-mail e telefone. Opcionalmente, foto de perfil.",
          "Da sua atividade na plataforma: jogos gerados e salvos, fechamentos criados, apostas registradas, histórico de resultados e indicadores de desempenho que você mesmo acompanha.",
          "Da sua compra: identificador de cliente do Stripe e plano adquirido. Números de cartão, validade e código de segurança NUNCA passam pelos nossos servidores — o processamento é integralmente do Stripe.",
          "Dados técnicos: registros de acesso e erros necessários para segurança e diagnóstico.",
        ],
      },
      {
        title: "2. Por que coletamos (base legal)",
        body: [
          "Execução de contrato: manter sua conta, liberar o acesso pago e exibir seu histórico.",
          "Obrigação legal: registros de transações comerciais.",
          "Legítimo interesse: segurança da plataforma, prevenção a fraude e diagnóstico de falhas.",
          "Não usamos seus dados para definir perfis de consumo de terceiros nem para decisões automatizadas que produzam efeitos jurídicos sobre você.",
        ],
      },
      {
        title: "3. Com quem compartilhamos",
        body: [
          "Supabase — hospedagem, banco de dados e autenticação.",
          "Stripe — processamento de pagamentos.",
          "Provedor de inteligência artificial — quando você usa explicitamente um recurso de IA, o contexto da sua solicitação (modalidade, quantidade de dezenas, orçamento e parâmetros escolhidos) é enviado a um provedor externo para gerar a resposta. Não enviamos seu nome, e-mail ou telefone nessa requisição.",
          "Não vendemos dados pessoais. Não compartilhamos com anunciantes.",
        ],
      },
      {
        title: "4. Retenção e exclusão",
        body: [
          "Seus dados permanecem enquanto sua conta existir. Você pode excluir jogos, fechamentos e registros individuais a qualquer momento dentro da plataforma.",
          "Para excluir a conta e os dados pessoais associados, basta solicitar pelos canais de atendimento. Registros que a lei obriga a manter (fiscais) são preservados pelo prazo legal e depois eliminados.",
        ],
      },
      {
        title: "5. Seus direitos (art. 18 da LGPD)",
        body: [
          "Você pode, a qualquer momento e sem custo: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou desatualizados; solicitar anonimização ou eliminação de dados desnecessários; portar seus dados a outro fornecedor; revogar consentimentos; e se opor a tratamentos indevidos.",
          `Para exercer qualquer desses direitos, escreva para ${CONTATO_EMAIL}. Respondemos em até 15 dias.`,
        ],
      },
      {
        title: "6. Segurança",
        body: [
          "Aplicamos controle de acesso por usuário no banco de dados: cada conta enxerga apenas os próprios dados. Senhas são gerenciadas pelo provedor de autenticação e não são armazenadas por nós em texto puro. As comunicações usam HTTPS.",
        ],
      },
      {
        title: "7. Menores",
        body: [
          "A plataforma é destinada a maiores de 18 anos. Não coletamos intencionalmente dados de crianças ou adolescentes.",
        ],
      },
      {
        title: "8. Alterações",
        body: [
          `Esta política pode ser atualizada. Última atualização: ${ATUALIZACAO}.`,
        ],
      },
    ],
  },

  seguranca: {
    icon: Lock,
    title: "Segurança",
    subtitle: "Como protegemos a plataforma e os seus dados",
    sections: [
      {
        title: "Isolamento entre usuários",
        body: [
          "O banco de dados opera com Row Level Security habilitado. Cada usuário autenticado consegue ler e gravar apenas os próprios registros — a restrição é aplicada no banco, não apenas na interface. Requisições sem autenticação válida não retornam dados de nenhuma conta.",
        ],
      },
      {
        title: "Pagamentos",
        body: [
          "Todo o fluxo de cartão é conduzido pelo Stripe, que é certificado PCI-DSS. A plataforma recebe apenas o resultado da transação e um identificador de cliente. Dados sensíveis de cartão nunca chegam aos nossos servidores.",
        ],
      },
      {
        title: "Transporte e armazenamento",
        body: [
          "Todas as comunicações ocorrem sob HTTPS/TLS. A autenticação usa tokens de curta duração emitidos pelo provedor de identidade, com renovação automática.",
        ],
      },
      {
        title: "Integridade dos dados",
        body: [
          "A base de resultados possui restrição de unicidade por concurso, o que impede registros duplicados. A sincronização é incremental e idempotente: repetir uma sincronização não corrompe nem duplica o histórico.",
        ],
      },
      {
        title: "Reportar uma vulnerabilidade",
        body: [
          `Se você encontrou uma falha de segurança, escreva para ${CONTATO_EMAIL} com o máximo de detalhes. Pedimos que não a divulgue publicamente antes de termos prazo razoável para corrigir.`,
        ],
      },
    ],
  },

  sobre: {
    icon: Shield,
    title: "Sobre o Titan Loterias",
    subtitle: "O que a plataforma é — e o que ela não é",
    sections: [
      {
        title: "O que fazemos",
        body: [
          "O Titan Loterias organiza e analisa o histórico público das loterias oficiais brasileiras para que você decida com informação, não com achismo.",
          "A plataforma gera combinações, monta fechamentos com garantia de cobertura verificável, simula estratégias contra sorteios passados e acompanha o desempenho das suas apostas ao longo do tempo.",
        ],
      },
      {
        title: "O que não fazemos",
        body: [
          "Não vendemos apostas, não intermediamos jogos e não temos vínculo com a Caixa Econômica Federal.",
          "Não prometemos premiação. Nenhuma análise estatística muda a aleatoriedade de um sorteio — e qualquer produto que prometa isso está mentindo.",
        ],
      },
      {
        title: "Transparência sobre a inteligência artificial",
        body: [
          "Os recursos marcados como IA geram explicações e leituras em linguagem natural a partir dos cálculos estatísticos da plataforma. A base do produto é matemática verificável: probabilidade, cobertura e frequência.",
          "Quando o serviço de IA está indisponível, a plataforma apresenta o resultado do cálculo estatístico, que é a parte verificável do processo.",
        ],
      },
      {
        title: "Contato",
        body: [
          `E-mail: ${CONTATO_EMAIL}. WhatsApp: disponível no botão flutuante das páginas de atendimento.`,
        ],
      },
    ],
  },
};

export default function LegalPage({ doc }: { doc: DocKey }) {
  const navigate = useNavigate();
  const content = DOCS[doc];
  const Icon = content.icon;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-start gap-4 mb-12"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight italic">
              {content.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {content.subtitle}
            </p>
          </div>
        </motion.div>

        <div className="space-y-10">
          {content.sections.map((section, i) => (
            <motion.section
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="px-5 sm:px-6 py-5 rounded-2xl glass-card"
            >
              <h2 className="text-xs font-black uppercase tracking-[0.2em] italic text-primary mb-4">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.body.map((paragraph, j) => (
                  <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        <div className="mt-12 px-5 sm:px-6 py-5 rounded-2xl glass-card border-amber-500/20">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-amber-500 mb-2">
            Aviso
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Apostas envolvem risco financeiro. Esta plataforma é uma ferramenta de
            análise estatística e não garante premiação. Jogue com responsabilidade.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <WhatsAppButton />
        </div>
      </div>
    </div>
  );
}
