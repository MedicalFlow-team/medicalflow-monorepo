# Issue #203 — evidência e pendências de produção

Este relatório acompanha a rotina de backup PostgreSQL e deve ser atualizado no
servidor, sem copiar credenciais, payloads ou dados clínicos para o Git.

## Evidência já obtida

- Checkout de produção: `/root/flowcare`.
- Stack: `flowcare_api`, `flowcare_postgres` e `flowcare_web` em `1/1`.
- O backup físico diário é enviado ao bucket privado `flowcare` sob
  `flowcare/postgres/`.
- O PostgreSQL está com `archive_mode=on`; o `archive_command` copia segmentos
  para o spool e a sincronização os envia ao R2.
- Bucket Lock de 35 dias e lifecycle de 40 dias foram configurados para o
  prefixo de backup.
- Um restore drill foi executado em container isolado, sem rede e sem porta
  publicada. A última execução registrada levou menos de dez segundos e
  validou o manifesto e o SHA-256.
- Os agendamentos de backup, sincronização WAL e checagem de saúde estão
  instalados no crontab de root.

## Pendências que impedem fechar a issue

1. A credencial atualmente usada pelo backup ainda precisa ser substituída por
   uma chave R2 limitada exclusivamente ao bucket `flowcare`. A credencial
   atual não deve ser compartilhada com a aplicação.
2. `BACKUP_ALERT_WEBHOOK` não está configurado. A checagem local retorna o
   estado corretamente, mas nenhum alerta externo pode ser comprovado.
3. O restore drill deve ser repetido após as migrações atuais da aplicação,
   registrando as contagens de `User`, `Organization`, `Membership` e `Session`
   e a verificação de vínculos órfãos.

## Procedimento de aceite

No servidor, preencher os dois itens de configuração sem imprimir os valores e
executar:

```bash
cd /root/flowcare
stat -c '%a %U:%G' /root/flowcare/backup.env
bash infra/backup/backup-postgres.sh
bash infra/backup/sync-wal.sh
bash infra/backup/check-backup.sh
```

Depois de aplicar as migrações, executar o restore drill com uma credencial
somente de leitura e guardar fora do Git o timestamp, duração, contagens,
resultado de integridade e confirmação do webhook. A issue só pode ser fechada
quando os três bloqueios acima tiverem evidência positiva.
