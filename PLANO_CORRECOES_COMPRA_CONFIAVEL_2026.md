# Plano de correções — compra confiável e uso da Mega da Virada

**Data de referência:** 13/11/2026  
**Objetivo:** fazer o Titan ser uma ferramenta que um apostador criterioso compraria pela utilidade e transparência, **não** por promessa de ganho.  
**Escopo:** oferta, checkout, fluxo Mega-Sena/bolão, evidência operacional e segurança. Este documento é planejamento; não altera banco, checkout ou produção.

## Diagnóstico e regra de decisão

- A página `/planos` apresenta o anual como **renovação recorrente** e também como **cobrança única por um ano**; a FAQ afirma que não há assinatura recorrente. Essa contradição é bloqueadora de compra.
- A comunicação do vitalício usa preço riscado de R$ 397,00, desconto de 75%, parcelas e garantia/reembolso de 7 dias. Esses termos precisam corresponder ao checkout real, ao histórico de preço e aos documentos jurídicos; não foram verificados por compra de teste.
- Para a Mega da Virada, o valor de prêmio é **estimativa inicial** da Caixa; o Titan organiza jogos e cotas, mas não registra aposta nem emite comprovante oficial.
- Testes automatizados e checagem de assets publicados existem; ainda faltam validação operacional do checkout, deploy da edge function, auditoria RLS com contas comuns e teste da migração do cache de IA em homologação.

**Critério de compra proposto:** concluir P0 e P1 abaixo, obter evidência de P2 e então reavaliar em uma sessão de uso real sem pagamento/aposta durante a auditoria.

## P0 — Coerência comercial e checkout (bloqueador)

### P0.1 Decidir a verdade contratual do plano anual
1. Confirmar no Stripe e no contrato se o anual é `subscription` com renovação automática ou `payment` por 12 meses sem renovação.
2. Adotar **uma** dessas interpretações em `/planos`, PricingSection, FAQ, e-mails e termos. Se recorrente: informar periodicidade, data da próxima cobrança, cancelamento e preço de renovação. Se não recorrente: remover “renovação anual recorrente”.
3. Explicar que o plano anual e o vitalício têm regras diferentes; a FAQ não deve responder “não existe assinatura” se o anual for recorrente.

**Aceite:** nenhuma contradição textual; plano e modo de cobrança no checkout coincidem com a oferta; testes de regressão para ambas as variantes e revisão humana do checkout em homologação.

### P0.2 Verificar preço, parcelamento, desconto e reembolso
1. Confrontar preços, formas de pagamento, parcelas e imposto/taxas da página com os Price IDs e métodos habilitados no checkout de homologação. Não presumir Pix/12 parcelas com base no texto da landing.
2. Exigir evidência do preço de referência R$ 397,00 antes de manter preço riscado e selo “-75%”; sem evidência, retirar ambos.
3. Definir por escrito o significado de “vitalício” (vida útil do serviço, recursos incluídos, eventuais limites), os canais e o prazo de reembolso. Evitar “garantia incondicional” se as condições não forem exatamente essas.
4. Fazer compra e reembolso **somente em ambiente de teste** e com autorização explícita; verificar webhook, ativação, recibo, acesso, cancelamento e estorno. Não testar com dinheiro ou conta do usuário sem nova autorização.

**Aceite:** captura de evidência do checkout de teste (sem dados pessoais), status de assinatura coerente, acesso ativado/revogado conforme caso, reembolso testado em sandbox, textos e termos sincronizados.

## P1 — Jornada Mega-Sena e bolão (bloqueador para campanha)

### P1.1 Caminho demonstrável da landing
1. Definir CTA claro para visitante sem login e para cliente logado. Se o CTA sazonal levar ao bolão, preservar a intenção “Mega-Sena” após login; hoje um link genérico pode abrir a modalidade previamente selecionada.
2. Criar demonstração curta, sem pagamento ou apostas reais, do caminho: selecionar Mega-Sena → montar jogos → revisar preço → organizar participantes → exportar → registrar fora do Titan pelos canais oficiais.
3. Informar na interface que ficha, PDF, QR e registro interno **não** são comprovante oficial nem compra de cota. Se o fluxo for apenas organização privada, não chamá-lo de “Bolão Caixa”.

**Aceite:** teste end-to-end autenticado em homologação, inclusive visitante redirecionado ao login; modalidade correta após retorno; custos e exports conferidos em desktop e celular; nenhum CTA inerte.

### P1.2 Regras, limites e valor das cotas
1. Separar “bolão organizado no Titan” das regras do Bolão Caixa. Revisar limites de cotas, quantidade de apostas por recibo, dezenas por jogo, tarifa e valor mínimo conforme a modalidade e a fonte oficial vigente.
2. Se não houver integração oficial, não prometer registro, pagamento ou divisão automática de prêmio real. Mostrar custo e participação como **planejamento**, com confirmação manual e recibo oficial externo.
3. Revalidar jogos exportados e a hipótese da cobertura após qualquer filtro/alteração. Preço deve vir da tabela configurada com aviso para confirmar valor vigente.

**Aceite:** testes de fronteira (cotas, jogos, base, preço e exportação), cenários inválidos bloqueados ou avisados, documentação das limitações do recibo interno.

## P2 — Evidência operacional e segurança (antes de divulgar confiança ampla)

### P2.1 Dados, performance e claims
1. Exibir origem, concurso e horário de atualização dos resultados; diferenciar dado oficial, dado faltante e cache. Alertar quando a fonte estiver desatualizada.
2. Documentar cobertura exaustiva versus amostral, hipótese “dezenas sorteadas na base” e impacto de filtros. Nunca transformar acertos históricos em lucro sem rateios e custos históricos completos.
3. Repetir a comparação fora da amostra em múltiplas janelas, com mesmo número de jogos e baseline aleatório, intervalos de incerteza e limitações. Não anunciar vantagem persistente sem evidência reproduzível.

**Aceite:** relatório reproduzível, versão/intervalo de concursos e testes automáticos para linguagem comercial; nenhuma previsão de ROI fictícia.

### P2.2 RLS, cache e Edge Functions
1. Em **homologação**, preparar duas contas comuns distintas com registros próprios nas tabelas auditadas; executar `scripts/audit-rls-readonly.mjs`. `INCONCLUSIVO` não vale como aprovação. Revisar políticas de escrita separadamente.
2. Revisar dependências da tabela `ai_analysis_cache`, fazer backup e testar a migração `20261113000000_restrict_ai_analysis_cache.sql` em homologação. Executar `scripts/audit-ai-cache-readonly.mjs`: espera 401/403 para a chave pública, não 200 com `[]`. Confirmar que service role/Edge Functions ainda operam.
3. Confirmar no painel/CLI o **deployment** de `ai-closing-recommendation` com o novo contrato sem ROI/cobertura prevista. Uma resposta 401 anônima prova somente bloqueio daquela requisição, não a versão implantada.
4. Somente após evidência e aprovação operacional, programar rollout de migrações/edge em produção com backup e plano de reversão. Não usar credenciais, compras ou alterações reais nesta fase de planejamento.

**Aceite:** resultados e data de cada sonda, logs redigidos sem tokens/IDs pessoais, smoke test autenticado em homologação, revisão de rollback.

## P3 — Acabamento de confiança e conversão

- Página pública “Como funciona”: vídeo curto, limitações honestas, captura de telas reais e exemplo de custo de um bolão hipotético sem sugerir retorno.
- Matriz comparativa de planos com recursos verificáveis e limites de uso; preços e condições idênticos aos termos e ao checkout.
- FAQ com respostas específicas para anual, vitalício, cancelamento, reembolso, modalidade, canal de apostas e comprovante oficial.
- Suporte: canal, prazo esperado de resposta e política de resolução verificáveis; não prometer atendimento prioritário sem operação definida.
- Revisão de acessibilidade, mobile, carregamento do vídeo e navegação em login; campanha sazonal removida automaticamente no prazo divulgado.

## Ordem de execução sugerida

1. **Decisões comerciais e jurídicas** de P0.1/P0.2 pelo proprietário do produto; isso desbloqueia edição de textos e testes de checkout.
2. **Correções de interface e testes** de P0/P1 em branch de trabalho; validar em homologação e enviar à `main` somente após aceite.
3. **Verificações P2** com acesso autorizado ao projeto de homologação; nenhuma mudança de produção por inferência.
4. **Acabamento P3**, smoke test de compra fictícia e jornada Mega-Sena/bolão, revisão final da landing e publicação controlada.

**Dependências externas:** decisão sobre anual e preço de referência; acesso ao Stripe de teste; duas contas comuns com fixtures em Supabase de homologação; operador com permissão de deployment de Edge Functions/migrações. Sem isso, não declarar P0/P2 concluídos.

## Progresso de implementação (13/11/2026)

- **P0.1 — textos implementados:** o proprietário confirmou plano anual recorrente; `/planos`, PricingSection, FAQ e Termos foram alinhados a uma renovação automática anual. O checkout no código já usa `mode: "subscription"`. **Ainda não testado** o Price ID efetivo, o valor da renovação e o cancelamento em sandbox Stripe.
- **P0.2 — alegações retiradas:** por decisão do proprietário, removidos preço riscado R$ 397,00, selo de 75% e parcela 12× não comprovados. Checkout real, reembolso e métodos de pagamento ainda exigem evidência em sandbox e revisão jurídica dos Termos.
- **P1.1 — navegação parcial implementada:** CTA do bolão da Mega da Virada carrega `lottery=megasena`; o login preserva destino; o rascunho só é restaurado se pertencer à modalidade e contiver jogos simples válidos. **Ainda falta** teste E2E autenticado e demonstração de ponta a ponta em homologação.
- **P1.2, P2 e P3** permanecem abertos, incluindo regras oficiais de bolão, RLS, edge deployment e smoke test de compra em ambiente de teste.
- **P1.2 — transparência parcial implementada:** PDF e diálogo de bolão apresentados como registros internos, sem promessa de validade jurídica, comprovação de aposta ou pagamento; PIX e status manual explicados. Falta confrontar limites e regras de Bolão Caixa com documentação oficial vigente, testar jornada autenticada e verificar emissão de recibos reais fora do Titan.
- **P1.2 — guarda de divisão parcial:** QR de uma cota bloqueado quando o custo não fecha em centavos por cota; default “pago” removido. Ainda falta definir rateio de centavos por participante e comparar regras, preços e limites com a Caixa vigente antes de anunciar conformidade.
- **P1.2 — avisos informativos Mega-Sena:** fonte oficial vinculada na interface; alertas de mínimo geral, cota mínima e máximo de jogos por recibo sem apresentar o planejamento como Bolão Caixa. Tabela de limites por dezenas, outras modalidades e registro real ainda pendentes.
- **P1.2 — revalidação parcial:** importação, compartilhamento e exportação genérica do bolão exigem jogos simples válidos; modalidades com campos adicionais/posicionais não usam o fluxo genérico. Ainda faltam regras oficiais por modalidade, preço vigente, recibo real e E2E autenticado.
- **P3 — seção pública parcial:** “Como funciona” na landing explica limites e inclui exemplo de custo hipotético sem retorno; página pública dedicada, imagens reais e avaliação mobile seguem pendentes.
- **P3 — página dedicada implementada no código:** `/como-funciona` com exemplo hipotético e limitações operacionais; falta validar visual/mobile, capturas reais e publicação no Lovable.
- **P3 — suporte parcial:** FAQ corrigida para condições comerciais e limites do produto; horário/SLA não comprovados removidos. Verificar operação dos canais e prazo real de resposta antes de publicar qualquer compromisso.
- **P1.2 — rateio e referência funcional:** valores individuais fecham em centavos, PIX individual é gerado localmente, preço manual exige fonte/data e checklist externo não comprova aposta. Falta E2E mobile, validação bancária e modelagem específica de modalidades posicionais/com campos adicionais.
