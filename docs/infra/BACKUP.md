# Backup e recuperação do PostgreSQL (#203)

## Arquitetura

- O PostgreSQL 16 arquiva segmentos WAL concluídos em `/root/flowcare/wal-spool`. `archive_timeout=300s` força segmentos mesmo com pouco tráfego.
- `backup-postgres.sh` cria diariamente um `pg_basebackup` físico com WAL, confere `pg_verifybackup` e envia o arquivo e seu SHA-256 ao Cloudflare R2.
- `sync-wal.sh` envia os WAL a cada cinco minutos, confirma tamanho e SHA-256 no R2 e só então pode remover cópias locais com mais de sete dias.
- `check-backup.sh` alerta por webhook se o último backup tiver mais de 26 horas ou o envio de WAL mais de 15 minutos.
- `restore-drill.sh` baixa a cópia do R2 e inicia um PostgreSQL isolado (`--network none`) para conferir tabelas, contagens e referências. Pode receber um horário UTC como alvo de PITR.

RPO esperado enquanto o host e o R2 estão disponíveis: até dez minutos (cinco para fechar WAL, cinco para enviar). **O RTO só pode ser estabelecido após um restore drill medido no servidor com o volume real de dados.** Falha de R2 mantém o WAL no spool; monitore espaço livre para evitar que o disco encha.

## Preparação no servidor

1. Use o bucket R2 privado `flowcare`, sem domínio público nem `r2.dev`. Reserve o prefixo `flowcare/postgres/` para backups do banco. O R2 [criptografa os objetos em repouso e usa TLS em trânsito](https://developers.cloudflare.com/r2/reference/data-security/).
2. Configure no prefixo `flowcare/postgres/` uma [Bucket Lock](https://developers.cloudflare.com/r2/buckets/bucket-locks/) de **35 dias** e uma [regra de lifecycle](https://developers.cloudflare.com/r2/buckets/object-lifecycles/) de expiração em **40 dias**. A regra de lock impede exclusão ou sobrescrita antes do prazo. Verifique as regras no painel ou com `wrangler r2 bucket lock list` e `wrangler r2 bucket lifecycle list`. Guarde a evidência operacional fora do repositório.
3. Crie uma credencial R2 limitada somente a esse bucket. Ela fica **apenas no host de backup**, em `/root/flowcare/backup.env` (`chmod 600`); não a passe à stack/API/web. O R2 S3 API usa permissão Object Read & Write, portanto a Bucket Lock é necessária para impedir exclusão prematura.
4. Instale AWS CLI v2, Docker, `flock`, `tar`, `sha256sum`, Python 3 e `curl` no host. O AWS CLI acessa a [API S3 compatível do R2](https://developers.cloudflare.com/r2/examples/aws/aws-cli/), com região `auto`. Não use opções SSE-KMS: o R2 não as aceita.
5. Crie o spool antes do deploy, com permissão de escrita para o usuário `postgres` da imagem `postgres:16-alpine` (UID 70). O bind mount da stack falha se o arquivo do `archive_command` ou o spool não existir.

```bash
install -d -m 700 /root/flowcare/backups
install -d -m 700 -o 70 -g 70 /root/flowcare/wal-spool
install -m 600 /dev/null /root/flowcare/backup.env
```

Conteúdo de `/root/flowcare/backup.env` (substitua valores no servidor; nunca faça commit):

```bash
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=flowcare
AWS_ACCESS_KEY_ID=<id>
AWS_SECRET_ACCESS_KEY=<segredo>
R2_PREFIX=flowcare/postgres
BACKUP_ALERT_WEBHOOK=<webhook-operacional>
```

O URL de alerta é opcional para a execução, mas obrigatório na operação. Os scripts não imprimem credenciais. Execute `chmod +x infra/backup/*.sh` após copiar um checkout que não preserve permissões.

## Agendamento

Instale no crontab de root; `check-backup.sh` tem estado próprio e só alerta em mudança de estado. A janela de 26 horas cobre um backup às 03:00 que atrasa até duas horas.

```cron
0 3 * * * /root/flowcare-monorepo/infra/backup/backup-postgres.sh >> /root/flowcare/backup.log 2>&1
*/5 * * * * /root/flowcare-monorepo/infra/backup/sync-wal.sh >> /root/flowcare/backup.log 2>&1
*/5 * * * * /root/flowcare-monorepo/infra/backup/check-backup.sh >> /root/flowcare/backup-health.log 2>&1
```

Após ativar o arquivamento no deploy, confira `SELECT archived_count, failed_count, last_archived_wal FROM pg_stat_archiver;` e faça o primeiro backup manual. Confirme a presença de `base/<timestamp>/base.tar.gz`, `base.sha256` e objetos `wal/` no R2. **Não trate o cron como instalado só porque aparece neste documento.**

## Restore drill isolado

Em um host com Docker e credencial **somente de leitura** para o bucket, use o timestamp UTC do backup escolhido. O script baixa o backup e os WAL para um diretório temporário, verifica SHA-256 e `pg_verifybackup`, recupera até o último WAL disponível (ou até o horário UTC informado), consulta contagens das tabelas `User`, `Organization`, `Membership` e `Session` e verifica vínculos órfãos. Não publica porta nem conecta o container à rede de produção.

```bash
BACKUP_ENV_FILE=/root/flowcare/backup-restore.env \
  bash infra/backup/restore-drill.sh 20261006T030000Z

# PITR até um horário após o fim do backup:
BACKUP_ENV_FILE=/root/flowcare/backup-restore.env \
  bash infra/backup/restore-drill.sh 20261006T030000Z '2026-10-06 10:15:00+00'
```

Meça o tempo total, guarde as contagens e compare com um snapshot de referência de um banco de teste sem gravações concorrentes. Em produção, contagens obtidas durante um backup online podem diferir do ponto recuperado; não use igualdade cega com contagens do banco ativo. Execute o drill mensalmente e depois de mudanças de configuração, registrando data, backup, alvo, duração e resultado fora do repositório.

## Recuperação emergencial

1. Pare escritores e identifique o último ponto válido; preserve a instância e o volume originais.
2. Execute o restore drill em instância isolada e confira o estado esperado, incluindo dados clínicos que não são cobertos pelas quatro contagens automáticas.
3. Provisione um novo volume/instância PostgreSQL. Restaure a cópia física e os WAL usando o mesmo procedimento, escolhendo `recovery_target_time` quando necessário.
4. Aponte a aplicação para a instância recuperada apenas após validação e autorização operacional. Não execute `DROP DATABASE` na instância original como primeiro passo.

A rotina só está validada após um backup remoto e um restore drill bem-sucedido. O R2 aplica criptografia gerenciada pela Cloudflare; a credencial de backup não deve ter acesso pela aplicação.
