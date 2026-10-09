# Monitoramento & alertas

## O que existe

- **Logs estruturados** (`apps/api/src/plugins/request-logger.ts`): uma linha JSON por request
  (`{ts, level, msg, method, path, status, ms}`). `docker service logs flowcare_api -f`.
- **`/api/health`** (§12 do contrato): status da API + versão + probe do WAHA.
- **`infra/monitoring/check-health.sh`** (cron `*/5 * * * *` no VPS):
  - health da API + status real da sessão WhatsApp (`WAHA /api/sessions` = `WORKING`?);
  - alerta **só na mudança de estado** (não spam) via `HEALTH_ALERT_WEBHOOK`;
  - estado anterior em `/root/flowcare/.health-state`.

## Webhook de alerta

Defina em `/root/flowcare/.env`:

```bash
HEALTH_ALERT_WEBHOOK=<url>
```

O script posta `{"content": "[flowcare] PROBLEMA: {estado}"}` — formato Discord/Slack.
Para Telegram, troque o payload em `check-health.sh` (`{"chat_id": "...", "text": "..."}`).

## Alertas que chegam hoje

| Evento | Gatilho |
|---|---|
| API fora do ar | `/api/health` não responde |
| Sessão WhatsApp caiu | status ≠ `WORKING` (QR, desconectado) |
| Recuperação | estado volta a `{"api":"ok","waha":"ok"}` |

## Crontab instalada no VPS

```cron
*/5 * * * * /root/flowcare/infra/monitoring/check-health.sh >> /root/flowcare/health.log 2>&1
0 3 * * *   /root/flowcare/infra/backup/backup-postgres.sh  >> /root/flowcare/backup.log 2>&1
*/5 * * * * /root/flowcare/infra/backup/sync-wal.sh >> /root/flowcare/backup.log 2>&1
*/5 * * * * /root/flowcare/infra/backup/check-backup.sh >> /root/flowcare/backup-health.log 2>&1
```

## Evolução (pós-MVP)

Healthcheck do Docker já reinicia tasks travadas (healthcheck do stack file). Nível "dashboard com gráficos" (Prometheus/Grafana) é explícitamente fora de escopo do MVP — reavaliar quando houver mais clientes que o time operando.
