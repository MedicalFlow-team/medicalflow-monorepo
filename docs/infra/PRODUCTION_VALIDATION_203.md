# Issue #203 — evidência de validação de produção

Este relatório acompanha a rotina de backup PostgreSQL e registra as evidências operacionais de validação em produção, sem copiar credenciais, payloads ou dados clínicos para o Git.

## Evidência operacional

- Checkout de produção: `/root/flowcare`.
- Stack: `flowcare_api`, `flowcare_postgres` e `flowcare_web` em `1/1`.
- O backup físico diário é enviado ao bucket privado `flowcare` sob `flowcare/postgres/`.
- O PostgreSQL está com `archive_mode=on`; o `archive_command` copia segmentos para o spool e a sincronização os envia ao R2.
- Bucket Lock de 35 dias e lifecycle de 40 dias foram configurados para o prefixo de backup.
- Os agendamentos de backup, sincronização WAL e checagem de saúde estão instalados no crontab de root.

## Validação e evidência final obtida em 2026-10-09

Em 2026-10-09, após a aplicação das migrações do Prisma e publicação em produção, a rotina de validação operacional foi executada em ambiente isolado (restore drill):

1. **Restore drill pós-migrations**:
   - Backup restaurado: snapshot `20261009T121548Z`.
   - `pg_verifybackup` validou integridade e manifesto com sucesso (`backup successfully verified`).
   - Cluster PostgreSQL iniciado em container isolado (`--network none`).
   - Base recuperada e promovida (`flowcare`, `pg_is_in_recovery = f`).
   - Tabelas `User`, `Organization`, `Membership` e `Session` validadas com sucesso.
   - Verificação de integridade referencial executada sem violações ou vínculos órfãos.
   - Status da operação: `restore drill OK: 20261009T121548Z`.

2. **Alerta operacional**:
   - Disparo do teste de alerta via `backup_alert "issue-203 validation alert test"`.
   - Webhook operacional (`BACKUP_ALERT_WEBHOOK`) aceitou o alerta (`backup_alert_webhook=accepted`).

3. **Escopo de credencial**:
   - Confirmado que a credencial de backup está restrita ao bucket `flowcare` (`backup_scope=flowcare-only`).

Com essas evidências confirmadas em produção, todos os critérios de aceite da issue #203 foram atendidos.
