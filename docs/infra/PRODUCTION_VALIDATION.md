# Validação operacional de produção

Este documento registra os passos que ainda precisam ser executados no VPS para fechar as tasks de infraestrutura. Os comandos abaixo não imprimem segredos; a evidência deve ser guardada fora do repositório.

## #203 — backup e restore

1. Confirmar que `/root/flowcare/backup.env` é legível somente por root e que `R2_BUCKET=flowcare` aponta para uma credencial criada exclusivamente para esse bucket.
2. Confirmar `BACKUP_ALERT_WEBHOOK` com um endpoint operacional e executar `check-backup.sh` simulando cada estado (`ok`, backup atrasado e WAL atrasado). O resultado esperado é um alerta somente na mudança de estado.
3. Aplicar as migrações da aplicação antes do drill:

```bash
cd /root/flowcare
docker exec "$(docker ps -qf name=flowcare_api | head -1)" bunx prisma migrate deploy
```

4. Executar `restore-drill.sh` com a credencial de leitura, registrar duração, tabelas `User`, `Organization`, `Membership` e `Session`, e conferir vínculos órfãos. Repetir após uma migração nova.
5. Guardar o relatório fora do Git com timestamp, backup usado, alvo PITR, duração, contagens e resultado do webhook.

## #205 — arquivos clínicos privados

Antes de liberar qualquer fluxo clínico, provisionar um bucket R2 privado separado do prefixo de backups, sem domínio público nem `r2.dev`, e aplicar:

- URLs de upload com validade máxima de 10 minutos e download com validade máxima de 15 minutos;
- chaves obrigatórias `organizations/<organizationId>/...`;
- limite de 50 MB para áudio e 25 MB para anexos;
- MIME allowlist validada no backend;
- lifecycle de áudio bruto após transcrição e retenção de PDFs emitidos conforme decisão regulatória.

O aceite exige comprovar HTTP 403 para acesso anônimo, autorização por membership antes da URL e falha de links expirados. A credencial da aplicação deve permitir somente os objetos necessários; não deve conseguir apagar backups.

## #206 — e-mail transacional

1. Verificar no SES da região configurada o domínio/remetente e os três registros DKIM, além de SPF e DMARC.
2. Confirmar que a conta saiu do sandbox antes de testar destinatários externos.
3. Ativar `MAIL_PROVIDER=ses` somente depois de validar a permissão mínima de envio da role e fazer um teste controlado.
4. Registrar o `MessageId` e o evento de entrega sem registrar destinatários, tokens ou conteúdo.
5. Configurar os destinos de bounce e complaint no SES e confirmar que o webhook rejeita assinaturas inválidas.
6. Validar os fluxos de convite das issues #314 e #315; a integração de e-mail não deve ser marcada como completa antes desses fluxos existirem.
