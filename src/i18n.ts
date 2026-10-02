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
          "description": "Analise mais de 24 mil concursos oficiais, revele padrões que passam despercebidos e monte apostas com base em estatística, probabilidade e IA — não em achismo.",
          "cta_primary": "Testar Gratuitamente",
          "cta_secondary": "Conhecer os Recursos"
        },
        "features": {
          "title": "CENTRO DE INTELIGÊNCIA TITAN",
          "subtitle": "Muito além de um gerador de números: uma plataforma completa de inteligência estatística aplicada às loterias brasileiras.",
          "items": {
            "xray": {
              "title": "Análise Histórica Avançada",
              "description": "Processamos o histórico oficial completo para revelar frequência, atraso, ciclos e distribuição de cada dezena em múltiplas dimensões."
            },
            "ia": {
              "title": "Titan AI Core",
              "description": "Redes neurais avançadas e modelos preditivos aplicados aos sorteios brasileiros para identificar padrões que escapam da análise humana."
            },
            "optimizer": {
              "title": "Motor de Probabilidade",
              "description": "Apostas geradas com Monte Carlo, Cadeias de Markov e distribuições balanceadas — foco em consistência estatística, não em sorte."
            },
            "backtest": {
              "title": "Simulador de Performance",
              "description": "Coloque sua estratégia contra centenas de concursos passados e descubra o ROI teórico antes de gastar um real com apostas."
            },
            "simulation": {
              "title": "Laboratório de Estratégias",
              "description": "Fechamentos matemáticos, matrizes de cobertura, filtros avançados e estratégias proprietárias com pontuação Titan Score."
            },
            "sync": {
              "title": "Sincronização Oficial",
              "description": "Resultados oficiais atualizados em tempo real direto da fonte, garantindo 100% de precisão para cada análise."
            }
          }
        },
        "how_it_works": {
          "title": "Arquitetura de Inteligência",
          "step1": {
            "title": "Coleta de Históricos",
            "desc": "Consolidamos todos os concursos oficiais em uma base de dados única, pronta para análise temporal profunda."
          },
          "step2": {
            "title": "Processamento com IA",
            "desc": "O Titan AI Core cruza milhões de combinações em busca de padrões estatísticos e anomalias de frequência."
          },
          "step3": {
            "title": "Detecção de Padrões",
            "desc": "Redes neurais especializadas identificam dezenas quentes, frias, ciclos de retorno e tendências emergentes."
          },
          "step4": {
            "title": "Estratégia Matemática",
            "desc": "Aplicamos filtros de dispersão, equilíbrio estrutural e fechamentos matemáticos para maximizar sua cobertura."
          },
          "step5": {
            "title": "Apostas Estratégicas",
            "desc": "Você recebe combinações prontas com o Titan Score — decisões baseadas em dados, não em palpite."
          }
        },
        "faq": {
          "q1": "O Titan Loterias garante que eu vou ganhar na loteria?",
          "a1": "Não. Nenhuma ferramenta, sistema ou pessoa pode garantir prêmios em jogos de sorte. O Titan Loterias é uma plataforma de análise estatística e inteligência artificial que ajuda você a tomar decisões mais informadas — mas o resultado final continua sendo probabilístico.",
          "q2": "Como funciona a análise por IA?",
          "a2": "Nosso Titan AI Core processa o histórico completo de cada loteria oficial, aplicando modelos matemáticos como Cadeias de Markov, simulação de Monte Carlo e redes neurais. O objetivo é identificar padrões de frequência, atraso e distribuição que passariam despercebidos em uma análise manual.",
          "q3": "Preciso entender de matemática ou estatística para usar?",
          "a3": "Não. A plataforma foi desenhada para ser intuitiva: você escolhe a loteria, define seus parâmetros e recebe apostas com pontuação estratégica pronta. Todo o rigor matemático fica nos bastidores.",
          "q4": "Quais loterias são suportadas?",
          "a4": "Suportamos as principais loterias da Caixa Econômica Federal: Mega-Sena, Lotofácil, Quina, Lotomania, Dupla Sena, Timemania, Dia de Sorte, Super Sete e +Milionária.",
          "q5": "Meus dados e apostas ficam seguros?",
          "a5": "Sim. Utilizamos criptografia de ponta a ponta, autenticação segura e infraestrutura em conformidade com a LGPD. Seus dados pessoais e histórico de apostas nunca são compartilhados.",
          "q6": "Como funciona o pagamento?",
          "a6": "O Acesso Vitalício é um pagamento único de R$ 99,90 — sem mensalidade, sem renovação automática, sem cobrança recorrente. Você paga uma vez e usa para sempre, com todas as atualizações futuras incluídas."
        },
        "disclaimer": "As análises são baseadas em dados históricos, estatística, probabilidade e inteligência artificial. O sistema não garante ganhos e deve ser utilizado como ferramenta de suporte à decisão.",
        "testimonials": {
          "title": "O que dizem, nossos usuários",
          "subtitle": "Junte-se a milhares de apostadores brasileiros que trocaram o achismo por decisões guiadas por estatística e inteligência artificial.",
          "items": {
            "t1": {
              "name": "Ricardo Silva",
              "role": "Analista de Dados • SP",
              "content": "O Titan Loterias mudou completamente a forma como eu enxergo os sorteios. A profundidade das análises e a precisão da IA impressionam — é o nível de rigor que eu esperava encontrar em uma ferramenta profissional."
            },
            "t2": {
              "name": "Ana Oliveira",
              "role": "Apostadora Recorrente • RJ",
              "content": "As simulações e o backtest me pouparam centenas de reais em apostas sem critério. Hoje eu só jogo com estratégia validada — e minha consistência de acertos secundários subiu de forma clara."
            },
            "t3": {
              "name": "Marcos Santos",
              "role": "Entusiasta de Estatística • MG",
              "content": "Melhor plataforma de loterias do Brasil. Os fechamentos matemáticos e o Titan Score entregam cobertura real, com critério — nada de gerador aleatório disfarçado de inteligência."
            }
          }
        }
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
