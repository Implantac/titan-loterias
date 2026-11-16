# Melhorias aplicadas nesta cópia — 13/11/2026

## Feito
- Corrigidas divergências entre a contagem de modalidades na landing page e a oferta dos planos (o catálogo inclui Federal, cuja mecânica é diferente de apostas combinatórias).
- Retiradas da página pública afirmações não demonstradas de integridade de 100%, atualização em tempo real e preferência de 94% dos usuários.
- Painel ilustrativo deixa de simular logs de auditoria, conexão e integridade como se fossem medições reais.
- Textos de fechamentos distinguem verificação exaustiva da amostral e deixam explícito que cobertura não garante prêmio.
- Corrigido preço estruturado no HTML e texto social que sugeria aumento de chance.
- Corrigidas duas incompatibilidades de tipos preexistentes no conferidor de bilhetes (`numbers` e assinatura de `saveBet`).
- Incluídos testes de regressão das alegações públicas.
- Conferidor de bilhetes deixou de inventar faixas, prêmios e valores líquidos; apenas compara dezenas para Mega-Sena, Lotofácil e Quina. Outras modalidades exigem conferência oficial e são sinalizadas como não disponíveis neste módulo.

## Correção do diagnóstico anterior
A conta fornecida é designada `super_admin` nas migrações. A leitura de outros perfis por ela **não demonstra** violação de isolamento. A política de perfis permite leitura administrativa. É necessário testar com contas comuns separadas antes de concluir que há exposição indevida. Nenhuma migração de RLS foi aplicada com base nessa inferência.

## Pendências e histórico (ver atualização ao final)
- Validar permissões com duas contas comuns de teste, sem privilégios administrativos; testar todas as tabelas sensíveis.
- Auditar verificação de matrizes, valores reais dos prêmios e ROI em cada modalidade; outros módulos ainda podem conter estimativas hipotéticas.
- Confirmar condições comerciais, preço e renovação com o checkout real.
- Revisar eventuais textos promocionais restantes e medir integridade real da base antes de mostrar um percentual.
- Histórico: uma tentativa anterior de build foi encerrada durante a geração de chunks (código 137); a validação posterior consta ao final deste arquivo.
- Não foi feito deploy de edge function nem alteração do banco de produção por este agente; publicação do frontend no Lovable foi confirmada pelo usuário.

## Etapa seguinte: validação de fechamentos
- `meetsGuarantee` somente é verdadeiro após verificação exaustiva; uma amostra com 100% de acertos não prova garantia.
- Hipóteses impossíveis, índices inválidos e jogos duplicados deixam de ser aceitos como validação matemática.
- Pipeline adaptativo só remove jogos dominados se a garantia permanecer comprovada.
- Interface e exportações principais distinguem **pior caso provado** de **menor acerto na amostra** e mostram a hipótese condicional.
- Testes de regressão para garantia amostral, validação exaustiva e entradas inválidas.

Pendente: auditar os demais relatórios/telas de matrizes, garantir reprodutibilidade da amostragem com semente e confirmar preço de bilhete na fonte oficial antes de calcular custo.

## Etapa seguinte: amostragem reproduzível
- As duas rotinas de amostragem combinatória aceitam uma semente opcional. Sem semente informada, usam uma semente determinística derivada do tamanho da base, acertos na base e limite de cenários.
- O validador de fechamentos e o validador de matrizes aceitam semente opcional e devolvem resultados repetíveis para os mesmos parâmetros. Estratégias diferentes podem ser comparadas sob a mesma amostra.
- Testes cobrem repetição com mesma semente e mudança de amostra com sementes diferentes.
- **Limitação:** geração de jogos por alguns algoritmos continua estocástica; repetição da *validação* não garante repetição da matriz gerada. A amostra não substitui prova exaustiva.

## Etapa seguinte: geração estocástica e limites matemáticos
- Algoritmos hill climbing, simulated annealing, genético e covering design aceitam uma semente opcional; a geração padrão também é determinística para os mesmos parâmetros. Testes verificam igualdade de jogos/validação com a mesma semente.
- Corrigida a interpretação da cota de Schönheim: ela se aplica à cobertura de **todos os M-subconjuntos**, não necessariamente ao problema mais fraco "M acertos se K > M dezenas estiverem na base". Para K > M, o resultado não afirma atingir mínimo teórico ou ótimo.
- Os relatórios principais deixam explícito quando a cota de Schönheim não se aplica à hipótese selecionada.
- Limitação: nota dependente do tempo de execução e preços fornecidos pelo cliente não constituem evidência reproduzível de desempenho ou custo oficial.

## Etapa seguinte: retorno monetário sem tabela fictícia
- Retiradas as tabelas de "prêmios médios" arbitrários do simulador de ROI dos fechamentos.
- Retrospectiva monetária disponível apenas para Mega-Sena, Lotofácil e Quina quando TODOS os concursos selecionados têm rateio por faixa carregado. Na falta de dados, o retorno fica indisponível em vez de assumir prêmio zero ou inventar valor.
- A tela informa que o custo é calculado com o preço informado pelo usuário (não preço histórico), e que jogos escolhidos após os sorteios não demonstram poder preditivo. A comparação deixa de destacar uma estratégia como vencedora com orçamentos diferentes.
- Testes verificam rateio por concurso, pagamento por aposta e ausência de cálculo quando faltam dados.

Pendente: reconciliação de preços históricos, premiações de apostas múltiplas e modalidades com mecânicas especiais, e comparação justa com apostas aleatórias de mesmo orçamento em amostra fora da seleção.

## Etapa seguinte: roteiro de teste RLS entre contas comuns
- Adicionado `scripts/audit-rls-readonly.mjs`, um teste de integração apenas de leitura que exige duas contas comuns e uma chave anon de homologação. Interrompe se detectar papel privilegiado; não imprime IDs/dados pessoais.
- Cobertura: leitura do próprio perfil, tentativas cruzadas em perfis, apostas salvas, histórico de geração e fechamentos, além de listagem anônima de perfis.
- Instruções e limites em `docs/rls-audit.md`. **Não foi executado contra o banco**, pois não recebemos duas contas comuns de teste. Não houve mudança de políticas RLS nem criação de usuários.

## Etapa seguinte: segurança do cálculo de ROI
- Retrospectiva monetária aceita apenas jogos simples e resultados válidos de Mega-Sena, Lotofácil e Quina. Apostas múltiplas e dezenas repetidas não recebem custo/premiação incorretos.
- Se um jogo hipotético acerta faixa que originalmente não teve ganhadores (valor divulgado zero/acumulado), a simulação fica indisponível: não se usa o rateio zero como se fosse o valor do cenário contrafactual.
- Interface deixa explícito que adicionar hipoteticamente um ganhador também pode reduzir o pagamento por aposta nas faixas que tiveram vencedores. Os números apresentados são cenário com o rateio publicado, **não prêmio exato que a aposta teria recebido**.
- Testes de regressão para ausência de vencedores e jogos/resultados inválidos.

## Etapa seguinte: filtros, regras das modalidades e custo configurável
- Corrigida falha crítica: filtros pós-geração removiam bilhetes, mas mantinham garantia, cobertura e score calculados antes da remoção. `filterClosingResult` recalcula todos os indicadores e custo dos jogos efetivamente restantes; se todos forem excluídos, não restaura silenciosamente a matriz original.
- Comparação de estratégias é reordenada após o recálculo; testes provam que excluir bilhetes pode destruir uma garantia antes válida.
- O motor combinatório da página fica restrito a Mega-Sena, Lotofácil e Quina. Para outras modalidades informa indisponibilidade em vez de aplicar indevidamente sorteio de `pick` dezenas (ou montar grade de 99.999 bilhetes para Federal).
- Preço por jogo simples é editável e a interface deixa claro que o valor inicial está configurado no aplicativo, sem atualização automática nem confirmação oficial. Mudança de modalidade limpa base, filtros e resultados antigos.

Pendente: conferir preços vigentes com fonte oficial e implementar motores específicos para outras modalidades; verificar filtros em outros fluxos do aplicativo.

## Etapa seguinte: Monte Carlo e histórico de acertos
- Simulação Monte Carlo de fechamentos usa semente opcional e padrão determinístico; chunks do Web Worker recebem sementes diferentes e reprodutíveis, evitando repetir os mesmos sorteios em cada bloco.
- Entradas inválidas (zero testes, jogos com dezenas repetidas, metas impossíveis) falham explicitamente em vez de produzir NaN ou métricas enganosas.
- Removidos prêmios fictícios e o "ROI real" de outro painel de backtest dos fechamentos. Essa aba mostra somente acertos retrospectivos; não confunde jogos montados posteriormente com previsão nem apresenta retorno monetário sem rateios.
- Falhas dos workers são exibidas ao usuário; adicionados testes para determinismo e entradas inválidas.

Pendente: revisão de outros simuladores fora do módulo de fechamentos e comparação justa contra apostas aleatórias fora da amostra.

## Etapa seguinte: landing sincronizada e demonstrações honestas
- Consulta pública mostrou que o Lovable já exibia parte das mudanças da landing (por exemplo, "PAINEL: DEMONSTRATIVO"); isso não valida automaticamente os módulos internos nem o último commit.
- Retirados de maquetes promocionais totais fixos de concursos, "100% cobertura", preços por cota e afirmações de auditoria como se fossem dados medidos; galeria rotulada como demonstração ilustrativa.
- Seção de modalidades inclui Federal e informa que recursos variam; fechamentos combinatórios da página aplicam-se apenas a Mega-Sena, Lotofácil e Quina.
- Concursos especiais não anunciam jackpots fixos desatualizáveis; usuário é orientado a conferir estimativa na Caixa.

## Etapa seguinte: simuladores históricos ativos
- Retro-teste rápido agora exige que a aposta pertença à modalidade cujo histórico está carregado. Antes podia comparar apostas de outra loteria com concursos da modalidade ativa. Também rejeita dezenas repetidas/fora do universo e deixa de chamar a média histórica de acertos de "Titan Score" ou confirmação de prêmio.
- Simulador histórico de jogos deixa de mostrar valores monetários estáticos por faixa como "prêmio estimado"; indica somente faixa potencial. Limita-se a Mega-Sena, Lotofácil e Quina até que regras das demais modalidades sejam implementadas.
- Adicionadas faixas de acerto explícitas da Quina ao serviço de perfis de premiação (sem valor monetário fixo). Teste de regressão impede reintroduzir prêmio monetário fictício nesse simulador.

## Etapa seguinte: benchmark com orçamento igual e dados separados
- O antigo painel "Benchmark vs Baseline Histórica" comparava só paridade, soma e cobertura de dezenas; semelhança descritiva não é teste de desempenho. Mantida essa leitura com rótulo explícito.
- Adicionada comparação de **acertos** entre jogos gerados e o mesmo número de jogos aleatórios simples (mesmo custo por concurso), em janela de concursos recentes reservada para teste. As estatísticas e concursos fornecidos ao gerador vêm somente do histórico anterior à janela; semente fixa derivada de modalidade, concurso, tamanho e perfil.
- A comparação aceita apenas Mega-Sena, Lotofácil e Quina, exige 20 concursos anteriores ao período de teste, rejeita concursos duplicados e jogos com tamanhos inválidos. Mostra quantidade de concursos com meta de acerto e não declara ROI, lucratividade ou vantagem persistente.
- Testes verificam divisão temporal, igualdade da quantidade de jogos e acertos comparados.

Limitação: uma única janela/sorteio de sementes não substitui avaliação repetida em várias janelas, valores de prêmios e preços históricos. A escolha posterior do perfil/parametrização ainda pode produzir viés de seleção humana.

### Auditoria de matrizes e exportação de fechamentos (2026-11-13)
- Bloqueada a aplicação de matrizes com índices inválidos, jogos malformados ou base com tamanho, unicidade ou faixa incorretos; eliminado fallback que fabricava dezenas. Planos legados incompatíveis deixam de aparecer na seleção de fechamentos Lotofácil até terem definição válida.
- A meta somente é marcada comprovada quando a verificação é exaustiva e atinge a meta; PDF distingue meta condicional, prova, falha e observação amostral. Cobertura condicional não promete premiação ou resultado do sorteio.
- Testes novos cobrem base excedente/duplicada, plano incompatível e geração válida. Typecheck e suíte anterior (189 testes) passaram; teste novo (3 testes) passou isoladamente.

### Planilha de matrizes: acertos sem lucro fictício (2026-11-13)
- Removidos valores fixos atribuídos a rateios variáveis de 14/15 pontos e totalizações retrospectivas de “lucro líquido”/“retorno estimado”. A tela apresenta contagem de acertos e custo ilustrativo, distingue conferência retrospectiva de backtest fora da amostra e informa que rateios históricos são necessários para calcular retorno líquido.
- Typecheck e suíte completa: 193 testes aprovados; teste de regressão comercial adicionado.

### Painel executivo de fechamentos (2026-11-13)
- Selo de meta comprovada exige simultaneamente verificação exaustiva, cenários testados e meta atingida. Falha exaustiva e observação amostral agora têm estados distintos; menor acerto observado não é vendido como garantia.
- Texto do pipeline adaptativo explica que a redução requer revalidação da cobertura, sem prometer preservação automática.
- Typecheck e suíte completa: 194 testes aprovados, incluindo nova regressão de linguagem do painel.

### Fichas internas de fechamento (2026-11-13)
- Documento imprimível deixa de se apresentar como bilhete/aposta registrada: QR é interno, sequência não é hash, custo é ilustrativo e ficha não comprova aposta, pagamento, registro nem prêmio.
- Meta de acertos no impresso explicita hipótese condicional e status de verificação (comprovada, não atingida ou amostral).
- Typecheck e suíte completa: 195 testes aprovados, incluindo regressão de alegações do impresso.

### Revalidação dos jogos reais no PDF (2026-11-13)
- Corrigido o PDF de fechamento: a função combinatória espera índices na base, mas recebia dezenas reais. Agora os jogos efetivamente exportados são convertidos para índices antes da verificação; dezenas fora da base ou base duplicada invalidam a prova.
- A verificação exaustiva no PDF também explicita se a meta foi atingida ou falhou.
- Typecheck e suíte completa: 197 testes aprovados; novos testes cobrem prova com dezenas reais não sequenciais e rejeição de dezena externa.

### Seleção de matrizes no bolão (2026-11-13)
- Corrigidas opções de fechamento que usavam IDs inexistentes e prometiam garantias na lista. O seletor agora usa IDs reais, somente matrizes estruturalmente válidas para a modalidade ativa e informa a meta condicional. Ao trocar de modalidade, a seleção efetiva recai em uma opção compatível; sem opções, geração desabilitada.
- Teste de elegibilidade de matrizes adicionado. Typecheck e suíte completa: 198 testes aprovados.

### Comparativo de matrizes (2026-11-13)
- Comparativo passa a excluir matrizes estruturalmente inválidas, usando a mesma regra da geração; seleção de fechamentos usa o mesmo predicado.
- Meta declarada não é apresentada como garantia: status distingue prova exaustiva atingida, falha exaustiva e amostra. “Melhor” virou “Maior índice” e os indicadores de cobertura/custo são apresentados como descritivos, não ROI.
- Typecheck e suíte completa: 199 testes aprovados, incluindo regressão de alegações do comparativo.

### Exportação profissional de fechamentos (2026-11-13)
- PDF e Excel agora revalidam os jogos efetivamente exportados, convertendo dezenas reais em índices da base, em vez de confiar em validação armazenada possivelmente desatualizada. Meta comprovada exige prova exaustiva e meta atingida; falha exaustiva e amostra são explicitadas.
- Distribuição e cobertura passam a usar a mesma revalidação; removido índice de eficiência não recalculado. Meta declarada inclui hipótese de acertos na base.
- Typecheck e suíte completa: 200 testes aprovados, incluindo regressão da exportação profissional.

### Biblioteca de presets de fechamento (2026-11-13)
- A antiga biblioteca “clássica” só guardava parâmetros, não matrizes ou provas. Retirados percentuais de cobertura e origens históricas sem fonte, descrições que prometiam garantias e o preset de Lotomania fora do escopo do motor validado.
- Tela passa a indicar que são presets sem prova prévia; meta é solicitação ao motor e precisa de validação após a geração. Presets de outra modalidade ficam visíveis na busca geral, mas não podem ser aplicados à modalidade atual.
- Typecheck e suíte completa: 201 testes aprovados, com teste de regressão de alegações da biblioteca.

### Metas no fluxo universal (2026-11-13)
- Mensagens ao aplicar presets e recomendações agora tratam acertos e jogos como meta/limite, não como garantia pré-validada. Após filtros, a tela informa revalidação da cobertura.
- Estado visual de sucesso exige meta comprovada; enumeração exaustiva com meta falha é identificada como falha, e amostra não comprova meta. Comparativo troca “Garantia” por “Menor acerto”.
- Typecheck e suíte completa: 202 testes aprovados, incluindo regressão de mensagens da tela universal.

### Recomendador de fechamentos: sem ROI inventado (2026-11-13)
- Removidos “ROI esperado” e “cobertura esperada” calculados de fórmula sem validação ou prêmios. Recomendações passam a mostrar apenas estratégia, meta a validar, limite de jogos e orçamento; custo insuficiente para um jogo impede aplicar.
- Resposta remota da IA só pode fornecer justificativas; estratégia, meta e limite permanecem definidos pelo cálculo local, impedindo que um retorno da IA ultrapasse orçamento ou parâmetros. Prompt da edge function atualizado para não solicitar promessas de cobertura/ROI.
- **Implantação:** a edge function precisa de deploy próprio; com a versão antiga no servidor, a nova chamada pode cair na heurística local até que a função seja publicada. Envio ao GitHub/Lovable não prova deploy da função.
- Typecheck e suíte completa: 204 testes aprovados, incluindo regressão de orçamento e alegações comerciais.

### Sugestão de bases candidatas (2026-11-13)
- Tela e motor deixam de chamar uma base de “ideal” ou prometer garantia/custo mínimo antes da geração. Quantidade e custo são referências teóricas; orçamento acima do teto não permite aplicar candidato.
- Corrigida seleção balanceada para completar a base com dezenas distintas mesmo quando a faixa intermediária é curta; histórico com dezenas fora do universo é ignorado e entradas inválidas retornam sem sugestões.
- Typecheck e suíte completa: 207 testes aprovados, com três novos testes de base válida e limites.
- Histórico: os commits foram posteriormente enviados à main; o usuário confirmou publicação do frontend no Lovable.

### Recomendação para o próximo concurso (2026-11-13)
- Removida “cobertura esperada” fixa de 75/85/92% por perfil, sem cálculo sobre jogos. Quentes, frias, atrasadas e balanço são identificados como descrições do histórico, sem poder preditivo comprovado; meta condicional requer validação após gerar.
- Base-alvo é limitada à modalidade, dezenas inválidas/repetidas no histórico são ignoradas, orçamento inferior ao preço de um jogo impede aplicar plano de zero jogos.
- Typecheck e suíte completa: 210 testes aprovados; três novos testes para base, histórico e orçamento.
- Histórico: o envio pendente foi posteriormente concluído e a publicação do frontend foi confirmada pelo usuário.

### Sensibilidade combinatória da base (2026-11-13)
- Retiradas projeções de quantidade de jogos, custo e “economia mantendo a garantia” feitas por extrapolação de uma base diferente sem geração ou prova. Tabela agora apresenta apenas tamanho da base, universo de cenários e quantidade de jogos candidatos, sem atribuir vantagem financeira.
- Typecheck e suíte completa: 211 testes aprovados, incluindo regressão de alegações da tela.
- Histórico: os quatro commits foram enviados à main até `2afaf976`; o usuário confirmou publicação no Lovable.

### Validação do build e frontend publicado (2026-11-13)
- `npm ci` concluiu; `npm run build` registrou `✓ built in 4m 13s`, gerou `dist/index.html` e assets, e o processo encerrou. O comando que aguardava terminou por timeout da ferramenta antes da captura do código de saída, portanto a evidência é o log de conclusão, não um exit code registrado.
- O asset `index-DiQTWr41.js` e o módulo `FechamentoUniversalPage-DSQ8jRa-.js` gerados localmente correspondem aos nomes servidos pelo domínio publicado; marcadores das quatro melhorias recentes estão no módulo servido. Isso não demonstra deploy da edge function.
- Permanecem auditoria RLS com duas contas comuns e verificação separada da edge function.

### Verificação pública da edge function (2026-11-13)
- POST anônimo com corpo vazio em `/functions/v1/ai-closing-recommendation` retornou `401` (`UNAUTHORIZED_NO_AUTH_HEADER`). Isso demonstra bloqueio da sonda sem cabeçalho, mas não prova versão da função, autorização por plano ou funcionamento da IA.
- `docs/DEPLOY-RUNBOOK.md` atualizado para exigir confirmação de deployment e testes em homologação autorizada, sem chamadas pagas repetidas em produção.

### Auditoria RLS somente leitura: evitar falso positivo (2026-11-13)
- O roteiro agora exige papel `user` verificável e ao menos uma fixture própria por conta em cada tabela auditada. Sem fixture, reporta INCONCLUSIVO e código 2; não confunde tabela vazia com isolamento aprovado.
- Nenhuma credencial, tabela ou política de produção foi alterada; auditoria real ainda depende de duas contas comuns com fixtures em homologação.
- `node --check`, typecheck e suíte completa: 213 testes aprovados, incluindo teste de pré-condições sem conexão.

### Restrição preparada do cache de IA (2026-11-13)
- Auditoria estática encontrou política `Anyone can read AI cache` e políticas chamadas “Service role” sem escopo `TO service_role`. Sonda de leitura apenas de `id` com chave pública retornou HTTP 200 e zero linhas: não prova exposição de registros, mas também não representa negação.
- Migration `20261113000000_restrict_ai_analysis_cache.sql` preparada para revogar privilégios públicos e escopar a política ao serviço, **sem aplicação no banco**. Exige revisão de dependências, backup e teste em homologação antes de produção; `docs/DEPLOY-RUNBOOK.md` atualizado.
- Typecheck e suíte completa: 215 testes aprovados, com dois testes estáticos da migration. Esses testes não substituem validação em PostgreSQL/Supabase.

### Sonda de verificação do cache de IA (2026-11-13)
- Adicionado `scripts/audit-ai-cache-readonly.mjs`: consulta somente `id` com `limit=1` em homologação, sem imprimir dados. HTTP 200 com lista vazia é falha de isolamento, não aprovação; 401/403 aprova apenas negação pública. Não verifica escrita das Edge Functions.
- `node --check`, typecheck e suíte completa: 217 testes aprovados. Migração ainda NÃO aplicada.

### Planejador de orçamento (2026-11-13)
- O antigo simulador “Premium” inventava retorno com multiplicadores de 0,9/1,15/1,45, preço fixo de Lotofácil e garantia padrão sem matriz validada. Substituído por planejamento de teto de gastos com preço configurado por modalidade, máximo de jogos simples e apenas matrizes estruturalmente válidas que cabem no orçamento.
- Ao salvar, `estimated_return` fica nulo e o registro identifica `budget_plan`; o botão sem ação “Executar Estratégia” foi removido. Cobertura condicional da matriz é rotulada conforme a prova; nenhum ganho financeiro é previsto.
- Typecheck e suíte completa: 221 testes aprovados, incluindo três testes de planejamento e regressão comercial. Nenhum registro real foi criado durante os testes.

### Campanha sazonal Mega da Virada 2026 na landing (2026-11-13)
- Faixa posicionada logo após o hero: “Prêmio inicialmente estimado em mais de R$ 1 bilhão”, com link para notícia oficial da Caixa publicada em 03/11/2026, CTA para recursos/bolão e aviso explícito de que Titan não registra apostas nem vende cotas.
- Janela sazonal calculada em `America/Sao_Paulo`: exibe de 03/11/2026 até antes das 22h de 31/12/2026 (encerramento das apostas segundo Caixa). O componente reavalia a janela a cada minuto e desaparece após o limite; não consulta valor em tempo real, portanto o texto identifica a estimativa como inicial e sujeita a atualização.
- Hero teve alegação geral de “garantia comprovada” substituída por cobertura condicional verificável. Typecheck e suíte completa: 224 testes aprovados, incluindo três testes de calendário/fonte. Build de produção não reexecutado nesta etapa.

### Vídeo premium da Mega da Virada na landing (2026-11-13)
- Motion graphics original de 12 segundos (H.264, 960×540, 24 fps, sem áudio) com estética esmeralda/dourada, pôster estático e mensagem de estimativa inicial da Caixa; vídeo ilustrativo sem marcas oficiais indevidas, nem promessa de acertos. Assets locais leves em `public/media/` e script de renderização reproduzível em `scripts/render-mega-virada-video.py`.
- Vídeo integrado ao banner sazonal, silencioso, em loop, com controles de pausa/reprodução e respeito a `prefers-reduced-motion`. O texto e a fonte oficial permanecem acessíveis fora do vídeo; ao fim da janela sazonal o banner inteiro desaparece.
- Typecheck e suíte completa: 225 testes aprovados. Codec verificado: H.264 yuv420p, 12 segundos. Build de produção não reexecutado nesta etapa.

### Clareza comercial e jornada Mega da Virada (2026-11-13)
- Decisão explícita do proprietário: anual renova automaticamente; desconto de R$ 397,00/75% e parcelamento não têm comprovação e foram removidos da comunicação. Planos, landing, FAQ e Termos passaram a diferenciar assinatura anual recorrente de pagamento único vitalício; meios e preço final dependem do checkout. Nenhum checkout/compra real foi acionado.
- CTA sazonal direciona ao bolão com `lottery=megasena`; o login preserva caminho e query, e o bolão só restaura rascunho válido da modalidade escolhida. Teste E2E autenticado ainda pendente.
- Typecheck e suíte completa: 229 testes aprovados. Auditoria de Stripe, RLS e deploy da edge function ainda depende de homologação/autorização.
