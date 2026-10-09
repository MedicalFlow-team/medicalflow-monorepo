# Migração da infraestrutura para Flowcare

O merge do rebranding não executa deploy. O workflow de produção está temporariamente restrito a `workflow_dispatch`, pois os nomes da stack, volume, diretórios e secrets mudaram. O CI continua automático. Não acione o deploy manual antes de concluir a preparação abaixo.

## Preparação no servidor

1. Identifique a stack e o volume PostgreSQL atualmente em uso. Faça backup e valide a restauração em um banco isolado. Preserve o volume original até validar a migração.
2. Planeje uma janela de manutenção: interrompa as gravações antes do backup final. A nova stack não deve iniciar com um banco vazio nem competir com a antiga pelos mesmos hosts do Traefik.
3. Prepare o checkout em `/root/flowcare` com remote `flow-care/flowcare` e o ambiente em `/root/flowcare/.env`. Preserve os valores reais de credenciais. Ajuste os hosts internos e URLs de banco à nova stack.
4. Prepare e restaure o banco no volume da nova stack (`flowcare_flowcare_postgres_data`, para a stack `flowcare`). Confirme dados, permissões e extensões. Não remova a stack/volume anterior antes de ter um plano de retorno validado.
5. Cadastre `FLOWCARE_VPS_HOST` e `FLOWCARE_VPS_SSH_KEY` no GitHub. Os secrets antigos não são renomeados automaticamente e seus valores não podem ser recuperados pela API do GitHub.
6. Confirme acesso aos pacotes `ghcr.io/flow-care/flowcare-api` e `ghcr.io/flow-care/flowcare-web`, rede externa do Traefik e variáveis obrigatórias documentadas em `SECRETS.md`. Mantenha `MAIL_PROVIDER=disabled` enquanto SES estiver pendente.

## Publicação e validação

Acione o workflow manualmente na `main` somente após a preparação. Valide migrations, saúde da API, login, dados existentes e roteamento. A migração da PR #352 adiciona `Session.lastActiveAt`; ela também precisa ser aplicada.

Se a validação falhar, mantenha a nova aplicação sem tráfego e restaure o roteamento para a stack anterior usando o banco preservado, considerando qualquer escrita ocorrida após a migração.

Reative o gatilho `push` do workflow apenas depois de registrar a validação operacional. Este documento descreve a preparação necessária; não é evidência de migração já executada.
