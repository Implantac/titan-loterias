import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const ptBrLocale = 'pt-BR';

const resources = {
  pt: {
    translation: {
      "common": {
        "loading": "Carregando...",
        "error": "Erro",
        "success": "Sucesso",
        "save": "Salvar",
        "cancel": "Cancelar",
        "delete": "Excluir",
        "edit": "Editar",
        "search": "Buscar",
        "filter": "Filtrar",
        "all": "Todos",
        "none": "Nenhum",
        "page": "Página",
        "of": "de",
        "login": "Entrar",
        "signup": "Cadastrar",
        "support": "Suporte",
        "access": "Acesso",
        "network": "Rede",
        "vital_access": "Acesso Vitalício",
        "join_network": "Entrar na Rede",
        "back": "Voltar"
      },
      "landing": {
        "hero": {
          "badge": "TITAN INTEL • INTELIGÊNCIA ESTATÍSTICA APLICADA",
          "title": "CIÊNCIA DE DADOS REAL",
          "subtitle": "Análise Estatística • Acesso de Elite",
          "description": "Consulte os resultados disponíveis e planeje jogos com ferramentas estatísticas. Confira concurso e data na Caixa; resultados passados não predizem o próximo sorteio.",
          "cta_primary": "Testar Gratuitamente",
          "cta_secondary": "Conhecer os Recursos"
        },
        "features": {
          "title": "CENTRO DE INTELIGÊNCIA TITAN",
          "subtitle": "Muito além de um gerador de números: uma plataforma completa de inteligência estatística aplicada às loterias brasileiras.",
          "items": {
            "xray": {
              "title": "Análise Histórica Avançada",
              "description": "Analisamos o histórico disponível para descrever frequência, atraso e distribuição de dezenas; confira a origem e o período exibidos."
            },
            "ia": {
              "title": "Motor Heurístico & Estatístico",
              "description": "Modelos multi-fatoriais e heurísticas aplicadas aos sorteios brasileiros para mapear ciclos estatísticos e otimizar cobertura."
            },
            "optimizer": {
              "title": "Motor de Probabilidade",
              "description": "Apostas geradas com Monte Carlo, Cadeias de Markov e distribuições balanceadas — foco em consistência estatística, não em sorte."
            },
            "backtest": {
              "title": "Simulador de Performance",
              "description": "Compare estratégias com concursos passados. Sem custos e rateios históricos completos, não há retorno financeiro verificável."
            },
            "simulation": {
              "title": "Laboratório de Estratégias",
              "description": "Fechamentos matemáticos, matrizes de cobertura, filtros avançados e estratégias proprietárias com pontuação Titan Score."
            },
            "sync": {
              "title": "Sincronização Oficial",
              "description": "Consulte os concursos disponíveis na base do Titan e confira número, data e resultado nos canais oficiais da Caixa."
            }
          }
        },
        "how_it_works": {
          "title": "Arquitetura de Inteligência",
          "step1": {
            "title": "Coleta de Históricos",
            "desc": "Consulte a base de resultados disponíveis e confirme cada concurso na fonte oficial."
          },
          "step2": {
            "title": "Análise Estatística",
            "desc": "Processamento estatístico de frequência, atraso, paridade e ciclos históricos em bases oficiais consolidadas."
          },
          "step3": {
            "title": "Detecção de Padrões e Cobertura",
            "desc": "Matrizes e heurísticas organizam jogos; cobertura depende de condições explícitas e validação."
          },
          "step4": {
            "title": "Estratégia Quantitativa",
            "desc": "Filtros e fechamentos organizam combinações sem prever sorteios ou garantir premiação."
          },
          "step5": {
            "title": "Apostas Estratégicas & Bolão",
            "desc": "Planeje jogos e cotas; o Titan não registra apostas, vende cotas ou emite recibo oficial."
          }
        },
        "faq": {
          "q1": "O Titan Loterias garante que eu vou ganhar na loteria?",
          "a1": "Não. Nenhuma ferramenta, sistema ou pessoa pode garantir prêmios em jogos de sorte. O Titan Loterias é uma plataforma de análise estatística e inteligência combinatória que ajuda você a tomar decisões mais informadas — mas o resultado final continua sendo probabilístico.",
          "q2": "Como funciona a análise dos modelos?",
          "a2": "As ferramentas resumem dados históricos e organizam combinações. Uma meta de cobertura só pode ser afirmada quando verificada sob condições explícitas; não há garantia de prêmio ou de evitar divisão.",
          "q3": "Preciso entender de matemática ou estatística para usar?",
          "a3": "Não. Escolha uma modalidade, revise os parâmetros e confira os jogos propostos. O registro da aposta ocorre somente nos canais oficiais da Caixa.",
          "q4": "Quais loterias são suportadas?",
          "a4": "Modalidades e recursos variam por ferramenta. Confira a modalidade específica e as limitações de exportação antes de contratar.",
          "q5": "Meus dados e apostas ficam seguros?",
          "a5": "Consulte a Política de Privacidade para entender o tratamento de dados. Não compartilhe sua senha; registros internos de jogos não são comprovantes oficiais.",
          "q6": "Como funciona o pagamento?",
          "a6": "O anual é uma assinatura com renovação automática a cada 12 meses; o vitalício é pagamento único sem renovação. Confira preços, condições e métodos disponíveis no checkout e nos Termos de Uso."
        },
        "disclaimer": "As análises são baseadas em dados históricos, estatística, probabilidade e matemática combinatória. O sistema não garante ganhos e deve ser utilizado como ferramenta de suporte à decisão."

      },


      "matrix": {
        "title": "Ranking Probabilístico",
        "subtitle": "Matriz de Performance Individual",
        "active_found": "{{count}} Ativos Encontrados",
        "filters": {
          "all": "Todas",
          "top": "Top",
          "delayed": "Atrasadas",
          "hot": "Quentes"
        },
        "columns": {
          "rank": "#",
          "number": "Dezena",
          "score": "Score",
          "freqTotal": "Freq. Total",
          "freqRecent30": "Freq. 30",
          "currentDelay": "Atraso",
          "trend": "Tendência",
          "moment": "Momento (30)",
          "status": "Status"
        },
        "trends": {
          "up": "Subindo",
          "down": "Caindo",
          "stable": "Estável"
        },
        "signals": {
          "green": "Alta",
          "yellow": "Neutra",
          "red": "Baixa"
        }
      },
      "affiliate": {
        "title": "Programa de Afiliados",
        "total_referrals": "Total de Indicações",
        "total_earned": "Total Ganho",
        "available_balance": "Saldo Disponível",
        "invite_title": "Convide e Ganhe",
        "invite_desc": "Ganhe 30% de comissão recorrente em cada assinatura ativa indicada.",
        "benefits": {
          "lifetime": "Comissão vitalícia em assinaturas",
          "min_payout": "Pagamento mínimo R$ 100,00",
          "dashboard": "Dashboard de acompanhamento real",
          "material": "Material promocional exclusivo"
        }
      },
      "gamification": {
        "title": "Progresso Titan",
        "level": "Nível {{level}}",
        "ranks": {
          "r1": "Iniciante",
          "r2": "Explorador",
          "r3": "Estrategista",
          "r4": "Especialista",
          "r5": "Mestre",
          "r6": "Lenda Titan"
        },
        "achievements": "Conquistas & Badges",
        "exp": "XP",
        "stats": {
          "generated": "Jogos Gerados",
          "won": "Acertos"
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt',
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

// Formatadores globais para datas, horas e números em PT-BR
i18n.services.formatter?.add('date', (value: any) => {
  return new Intl.DateTimeFormat(ptBrLocale, { dateStyle: 'short' }).format(value);
});

i18n.services.formatter?.add('dateTime', (value: any) => {
  return new Intl.DateTimeFormat(ptBrLocale, { dateStyle: 'short', timeStyle: 'short' }).format(value);
});

i18n.services.formatter?.add('time', (value: any) => {
  return new Intl.DateTimeFormat(ptBrLocale, { timeStyle: 'short' }).format(value);
});

i18n.services.formatter?.add('currency', (value: any) => {
  return new Intl.NumberFormat(ptBrLocale, { style: 'currency', currency: 'BRL' }).format(value);
});

i18n.services.formatter?.add('number', (value: any) => {
  return new Intl.NumberFormat(ptBrLocale).format(value);
});

i18n.services.formatter?.add('percent', (value: any) => {
  return new Intl.NumberFormat(ptBrLocale, { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);
});

export default i18n;
