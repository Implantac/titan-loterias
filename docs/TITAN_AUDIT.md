# TITAN AUDIT — Fase 1 (2026-10-02)

## Arquitetura
- React 18 + Vite + Tailwind, PWA. Backend: Lovable Cloud (banco, auth, 20 edge functions, 75 migrações).
- 40 páginas, 241 componentes, 131 módulos de engine (`src/engine`), workers para cálculos pesados.
- Contexto central: `LotteryContext` (isolamento por loteria), `AuthProvider`, `SelectedBetsContext`.
- Definições de loteria em `src/data/lotteries.ts` e `src/features/lottery/constants.ts` (duplicado; consolidar em `LotteryDefinition`).

## Problemas encontrados
| # | Problema | Severidade | Status |
|---|---|---|---|
| 1 | Textos de marketing enganoso ("rede neural", "IA preditiva", "Neural Core") em 12 páginas | Alta | CORRIGIDO (textos visíveis) |
| 2 | Pasta `read-create-play-main/` (6.6 MB): cópia antiga e inteira do projeto | Média | PENDENTE (remoção requer confirmação) |
| 3 | Regras de loteria espalhadas em vários arquivos | Média | PENDENTE (Fase 2) |
| 4 | 53 arquivos usam `Math.random` sem seed (incl. telas de geração) | Média | PENDENTE (Fase 2) |
| 5 | 157 usos de `any` | Baixa | PENDENTE |
| 6 | 12 `console.log` em produção | Baixa | PENDENTE |
| 7 | Health Check de dados (lacunas, duplicidades, fonte, timestamp) incompleto | Alta (P0) | PENDENTE (Fase 2) |
| 8 | Componentes com nomes internos "Neural*" (NeuralHealthGauge, NeuralMissionCenter) | Baixa | PENDENTE (renomear) |
| 9 | Possíveis dados simulados em `StrategyLabPage`, `CentralQuant`, `historical-sim` | Alta | PENDENTE (verificar) |

## Segurança
- Papéis em `user_roles` + `has_role` (OK). Admin cria contas via edge function `admin-users` (OK).
- Verificar: entitlement de planos aplicado no backend em todas as funções premium (Fase 5).

## Integrações
- Sincronização de concursos: `sync-lottery-draws`. Pagamentos: Stripe (checkout, portal, webhook). IA: ai-chat, ai-* functions.

## Próximas fases
Ver `roadmap.md`.
