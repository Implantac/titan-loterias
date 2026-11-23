# Revisão ponta a ponta — visão de um apostador criterioso

**Data de referência:** 13/11/2026 · **Código analisado:** `3e131067bc5b9559c19ada318faf08a22cea980e` (main confirmada antes desta revisão). **Escopo:** inspeção estática das jornadas e leitura pública de `/` e `/planos` em `https://titanloterias.lovable.app/`; `/como-funciona` não foi renderizada pelo leitor de página (retornou apenas o carregamento). Não fiz cadastro, compra, PIX, aposta, teste bancário, login autenticado, inspeção responsiva em navegador nem consulta administrativa ao Stripe/Supabase. A versão implantada no Lovable **não foi associada a um SHA**, portanto observações públicas e do repositório não provam que a mesma versão está em produção. Última suíte informada no código antes da revisão: typecheck e 287 testes/70 arquivos; build de produção segue não homologado por timeout anterior.

## Veredito de compra

**Eu testaria gratuitamente para estudar jogos, mas não pagaria agora sem evidência de checkout e correção das alegações abaixo.** O produto melhorou sua honestidade central: informa que não registra aposta, não vende cotas e que fechamento não prevê prêmio. Contudo, a área de jogos salvos ainda contabiliza “premiações” apenas por coincidência de dezenas em sorteios passados; e a oferta pública promete velocidade/forma de pagamento e prova de cobertura sem demonstração operacional. Além disso, não se sabe se migrações e Edge Functions corrigidas foram aplicadas. Este é um veredito de confiança e compra, não afirmação de fraude ou de falha efetiva de dados.

## Jornada percorrida

| Passo | O que vejo como apostador | Situação |
|---|---|---|
| Descoberta na landing | Hero traz limite “apostas e prêmios dependem da Caixa”, exemplo hipotético e CTA Mega da Virada apontando Mega-Sena. Também há “Lote Fundador Liberado”, “Recibo WhatsApp” e blocos de marketing com “Garantia Exaustiva / Menor acerto provado”, “Pix Imediato / Acesso em 30 segundos”. | **Mista**: utilidade clara; algumas promessas excedem evidência disponível. |
| Comparação de planos | Anual R$ 69,90/ano com renovação automática; vitalício R$ 99,90 pagamento único enquanto serviço operar. FAQ e termos de reembolso existem. | **Melhorou**, mas valores, renovação, meios e reembolso não foram confrontados com Stripe test/contrato. |
| Cadastro e login | O destino `next` é preservado; signup exige telefone e consulta guard por IP, com mensagem para “mudar conexão” em caso de bloqueio. | **Inconclusivo** sem duas contas comuns; risco de atrito/negação a famílias e redes compartilhadas. |
| Gerar e salvar jogos | Há proteção para formatos simples em bolão e planejadores separados para Super Sete/+Milionária. | **Parcial**: jogos planejados não são comprovantes. A análise de “premiações” dos salvos precisa correção urgente. |
| Bolão | Rateio exato em centavos, preço manual com fonte, checklist externo, avisos de que PIX/PDF/hash não comprovam aposta. Modalidades especiais têm colunas/trevos e export interno. | **Bom fluxo de planejamento**, não Bolão Caixa oficial; precisa E2E autenticado/mobile e conferência presencial dos recibos. |
| Checkout e retorno | URL de retorno deixou de afirmar pagamento por si só; check-subscription usa vínculo Stripe no código preparado. | **Não homologado**: migrações, vínculos antigos, Stripe sandbox, webhook, cancelamento e implantação das funções não verificados. |
| Resultados e ROI | ROI financeiro automático foi suspenso e histórico não comprovado fica oculto dos totais; notificações genéricas especiais foram restringidas. | **Inconsistente**: `/jogos-salvos` ainda mostra “Premiações Recentes” para jogos apenas salvos e compara com últimos sorteios sem filtrar concurso anterior ao salvamento. |
| Pós-venda | `/suporte` oferece WhatsApp/e-mail e evita SLA garantido; `/como-funciona` está no código. | **Parcial**: funcionamento do atendimento e rota pública em navegador real não verificados. |

## Achados priorizados

### P0 — Corrigir antes de convidar alguém a pagar

1. **Premiações fictícias em Jogos Salvos.** Em `src/pages/JogosSalvosPage.tsx:43–62`, `computePerformance` compara cada jogo com os últimos sorteios, usa `getPrizeTiers` para marcar `isPrize` e soma `totalPrizes`. Não exige bilhete oficial; nem filtra sorteios anteriores a `bet.created_at`. Em `:74–86`, esses números viram coluna “Premiações Recentes” no CSV/Excel; em `:157–190`, viram cartão e contagem destacada. Um jogo salvo hoje pode parecer “premiado” por resultado antigo. **Correção:** suspender o rótulo/prêmio real nesse fluxo; se mantiver comparação retrospectiva, chamá-la simulação de coincidências, validar modalidade e período, não inferir dinheiro recebido. Testar salvamento posterior ao sorteio e modalidades com campos extras.
2. **Promessas de pagamento e prova não comprovadas no marketing público.** Em `src/components/common/PricingSection.tsx:208–235`, os selos afirmam “Dados Caixa auditados”, “Garantia Exaustiva / Menor acerto provado” e “Pix Imediato / Acesso em 30 segundos”. Não há evidência de que todo fechamento seja exaustivo, que Pix esteja habilitado no checkout nem de tempo de ativação; pagamentos assíncronos podem demorar. O site público exibiu esses selos. `src/components/landing/HeroSection.tsx:71,148` ainda traz escassez “Lote Fundador Liberado” sem limite verificável e “Recibo WhatsApp”, facilmente confundido com comprovante oficial. **Correção:** remover/condicionar promessas, trocar “recibo” por “resumo interno” e explicitar que cobertura depende de matriz/hipóteses; só reinstalar alegações quando sustentadas.
3. **Compra e segurança não testadas em ambiente real.** Código de billing, proteção de `stripe_customer_id` e cache IA estão preparados, mas implantação não verificada; `docs/STAGING-BILLING-RLS-CHECKLIST.md` descreve backup, reconciliação, duas contas comuns e Stripe test. **Critério:** não declarar “compra confiável/homologada” até testes de duas contas, webhook assinado, renovação anual, vitalício, cancelamento, estorno e rollback; evitar deploy parcial de funções.

### P1 — Jornada e precisão antes de escalar campanha

4. **Oferta sujeita a confirmação comercial.** `/planos` e landing exibem R$ 69,90 anual e R$ 99,90 vitalício no código e na leitura pública, com 7 dias de arrependimento. Os Price IDs configurados não comprovam valor, moeda, forma de pagamento, próxima cobrança nem execução do estorno. Validar capturas do Stripe test e Termos vigentes sem dados pessoais. Não chamar o preço atual de “lote” sem regra de elegibilidade/limite.
5. **Exportações podem gerar interpretação errada.** `src/components/lottery/ExportCaixaDialog.tsx:91–113` chama aba “Loterias Caixa” e outra “TXT / Cologa”; o diálogo explica que não registra apostas e compatibilidade externa não foi verificada, o que é positivo. Em `/planos`, “Exportação de bilhetes” pode soar oficial; preferir “fichas/arquivos de planejamento”. Confirmar no mobile como o usuário encontra o aviso antes de baixar e como compara dezenas no canal oficial.
6. **Cadastro em rede compartilhada.** `src/pages/SignupPage.tsx:63–90` bloqueia contas por IP e sugere mudar conexão; isso pode atingir famílias, lotéricas, operadoras móveis e redes corporativas sem indicar recurso de revisão. Testar dois usuários legítimos no mesmo IP em staging, explicar política e oferecer suporte efetivo. Não tratar IP como prova de fraude.
7. **Cobertura de modalidades irregular.** Há 10 modalidades exibidas na landing, mas ferramentas variam; Super Sete/+Milionária têm planejadores privados, enquanto alertas/resultados especiais estão corretamente restritos. Uma tabela pública **por modalidade e recurso** evitaria a impressão de que cada ícone implica fechamento, análise de prêmio e exportação equivalente. Conferir regras/volantes oficiais antes de ampliar.

### P2 — Acabamento com impacto na confiança

8. **Acessibilidade e mobile sem aceite de uso real.** Validar 320/375 px e desktop: landing → plano → login → bolão → preço/participantes → PDF/TXT → confirmação Caixa externa; foco teclado, contraste, textos longos, leitores de tela e áudio/vídeo. Testes unitários não substituem essa sessão.
9. **Páginas públicas e versão.** A leitura pública retornou landing e `/planos`, mas `/como-funciona` apenas “Carregando motor estatístico...”; não é prova de rota quebrada, apenas limitação do leitor/CSR. Fazer teste real em navegador e verificar qual commit foi publicado no Lovable. Build de produção permanece inconclusivo.
10. **Métricas não são vantagem de aposta.** Comparações retrospectivas, scores, “quentes/frias” e coberturas condicionais precisam exibir concurso/fonte/frescura, hipótese, amostra e baseline; não inferir aumento de chance em sorteios independentes ou prêmio garantido.

## Plano de aceitação sugerido

1. **Imediato (código):** remover “premiações” de jogos salvos ou reclassificar como coincidência retrospectiva; retirar selos não comprovados e trocar “recibo/bilhete” por linguagem de planejamento. Acrescentar testes de data e modalidade.
2. **Antes de cobrança em staging:** operador confirma preços e condições Stripe test; concilia `stripe_customer_id` legado; aplica migrations em staging com backup/rollback; publica as quatro funções de billing juntas; executa matriz do checklist e auditoria RLS com duas contas comuns.
3. **Aceite como apostador:** uma pessoa que nunca viu o Titan consegue explicar (a) o que compra, quando renova e como cancela; (b) que Titan não aposta/não vende cotas; (c) que jogo salvo e PDF não são bilhete; (d) onde conferir resultado e recibo Caixa; (e) que não existe prêmio sem aposta comprovada. Testar checkout pendente, falha, cancelado, sucesso e reembolso sem dinheiro real.
4. **Publicação controlada:** registrar SHA frontend/Edge/migrations, smoke test mobile e relatório de resultados sem tokens/IDs pessoais. Só então divulgar campanha ampla.

**Limite desta revisão:** não pude homologar comportamento autenticado, checkout, RLS, PIX bancário, suporte efetivo ou versão publicada; ausência de evidência não é prova de falha operacional. Nenhuma alteração de código, banco ou compra foi realizada nesta revisão.

## Implementação após a revisão (código, não homologação operacional)

- P0 jogos salvos: removida contagem de “Premiações Recentes”; comparação agora é retrospectiva e numérica, limitada a jogos simples válidos de Mega-Sena, Lotofácil e Quina. Nada é tratado como bilhete ou prêmio recebido. Exportações trazem “comparações retrospectivas”, não premiações.
- P0 marketing: removidas promessas de PIX imediato, acesso em 30 segundos, prova exaustiva indiscriminada, “recibo WhatsApp” e escassez de lote sem regra demonstrada; linguagem de fichas internas no plano.
- P1 exportação: CSV com aspas/células escapadas e proteção de fórmulas em campos de usuário; Excel passa a ser arquivo `.xlsx` real em vez de HTML com extensão `.xls`.
- P1 cadastro: texto de bloqueio por IP orienta suporte/revisão de pessoas legítimas em redes compartilhadas; a política técnica de IP **não foi homologada nem alterada**.
- Ainda pendente: prova de valores/renovação/estorno no Stripe sandbox; reconciliação de clientes Stripe antigos; RLS com duas contas comuns, aplicação coordenada das migrations/funções; build, dispositivo mobile, suporte real e SHA publicado. Não confundir suite local com aceite de compra.
