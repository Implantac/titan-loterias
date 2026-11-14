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

## Pendente antes de publicar
- Validar permissões com duas contas comuns de teste, sem privilégios administrativos; testar todas as tabelas sensíveis.
- Auditar verificação de matrizes, valores reais dos prêmios e ROI em cada modalidade; outros módulos ainda podem conter estimativas hipotéticas.
- Confirmar condições comerciais, preço e renovação com o checkout real.
- Revisar eventuais textos promocionais restantes e medir integridade real da base antes de mostrar um percentual.
- Executar build em máquina com memória suficiente: neste ambiente o Vite foi encerrado durante a etapa de geração de chunks (código 137).
- Não foi feito deploy nem alteração do banco de produção.

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
