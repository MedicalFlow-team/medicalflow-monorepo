#!/usr/bin/env bash
# ============================================================
# Flowcare — checagem operacional.
# Crontab: */5 * * * *  (instalado no VPS — docs/infra/MONITORING.md)
#
# Verifica (executando dentro do container da api — independe de DNS):
#   1. /api/health da própria api
#   2. Sessão do WhatsApp: WAHA /api/sessions deve ter status WORKING
#
# Alerta por webhook (HEALTH_ALERT_WEBHOOK) apenas em MUDANÇA de estado,
# para não spammar a cada 5 min. Estado anterior: /root/flowcare/.health-state
# ============================================================
set -euo pipefail

ENV_FILE="/root/flowcare/.env"
STATE_FILE="/root/flowcare/.health-state"
WEBHOOK="$(grep -E '^HEALTH_ALERT_WEBHOOK=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || true)"

alert() {
  local msg="$1"
  if [ -n "$WEBHOOK" ]; then
    # Formato Discord/Slack-compatível: {"content": "..."}. Telegram: adaptar em MONITORING.md.
    curl -fsS -m 10 -X POST -H 'Content-Type: application/json' \
      -d "{\"content\": \"$msg\"}" "$WEBHOOK" >/dev/null 2>&1 || true
  fi
  echo "[$(date -Is)] ALERTA: $msg"
}

# --- Coleta o estado (api health + sessão WAHA) num único JSON ---
# Pega a task MAIS RECENTE: com update_config start-first, duas tasks coexistem
# durante o rollout e a antiga tem env antigo (falso alerta).
NEWEST_CID() {
  for c in $(docker ps -qf 'name='"$1"); do
    echo "$(docker inspect -f '{{.State.StartedAt}}' "$c") $c"
  done | sort -r | head -1 | awk '{print $2}'
}
API_CID="$(NEWEST_CID flowcare_api)"
if [ -z "$API_CID" ]; then
  RESULT='{"api":"sem-container"}'
else
  RESULT="$(docker exec "$API_CID" bun -e '
    const out = { api: "ok", waha: "unknown" };
    try {
      const r = await fetch("http://127.0.0.1:3000/api/health");
      out.api = r.ok ? "ok" : "http_" + r.status;
    } catch { out.api = "down" }
    try {
      const r = await fetch("http://waha:3000/api/sessions", {
        headers: { "x-api-key": process.env.WAHA_API_KEY || "" },
      });
      if (!r.ok) out.waha = "http_" + r.status;
      else {
        const sessions = await r.json();
        const bad = sessions.filter((s) => s.status !== "WORKING");
        out.waha = bad.length === 0
          ? "ok"
          : bad.map((s) => s.name + "=" + s.status).join(",");
      }
    } catch { out.waha = "down" }
    console.log(JSON.stringify(out));
  ' 2>/dev/null)" || RESULT='{"api":"exec-falhou"}'
fi

echo "[$(date -Is)] $RESULT"

# --- Alerta só na mudança de estado ---
PREV="$(cat "$STATE_FILE" 2>/dev/null || echo none)"
if [ "$RESULT" != "$PREV" ]; then
  if [ "$RESULT" = '{"api":"ok","waha":"ok"}' ]; then
    alert "[flowcare] RECUPERADO: $RESULT (antes: $PREV)"
  else
    alert "[flowcare] PROBLEMA: $RESULT (antes: $PREV)"
  fi
  echo "$RESULT" > "$STATE_FILE"
fi
