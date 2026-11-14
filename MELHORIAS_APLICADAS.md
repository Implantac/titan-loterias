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
