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
