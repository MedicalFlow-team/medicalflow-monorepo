---
name: prod-access
description: Acessar, inspecionar, operar e validar o ambiente de produção do Flowcare via SSH (VPS 209.126.11.124). Permite verificar serviços Docker Swarm, logs, métricas de health, migrações de banco, backups e rotinas de restauração.
---

# Flowcare — Operações e Acesso à Produção (VPS)

Guia e comandos padronizados para acesso, diagnóstico, inspeção e manutenção do servidor de produção do Flowcare.

## 1. Dados de Conexão e Acesso

- **Host IP**: `209.126.11.124`
- **Usuário**: `root`
- **Autenticação**: Chave SSH pública (`id_ed25519`) instalada em `/root/.ssh/authorized_keys`. Conexão direta sem senha.
- **Comando base**:
  ```bash
  ssh root@209.126.11.124 "<comando>"
  ```

> [!IMPORTANT]
> **Regra de Ouro**: NUNCA crie workflows descartáveis do GitHub Actions para rodar comandos na VPS. Use sempre o SSH direto a partir do seu terminal.

---

## 2. Estrutura de Diretórios na VPS

- **Repositório e Código**: `/root/flowcare`
- **Configurações e Env**: `/root/flowcare/.env`
- **Scripts de Infraestrutura e Automação**: `/root/flowcare/infra/`
- **Estado de Monitoramento**: `/root/flowcare/.health-state`

---

## 3. Comandos Essenciais

### 3.1. Sincronização de Código
Para atualizar a branch `main` na VPS após merges:
```bash
ssh root@209.126.11.124 "cd /root/flowcare && git pull origin main"
```

### 3.2. Gerenciamento de Serviços (Docker Swarm / Containers)
O ambiente de produção opera sob Docker Swarm:
```bash
# Listar todos os serviços e réplicas ativas
ssh root@209.126.11.124 "docker service ls"

# Listar stacks ativas
ssh root@209.126.11.124 "docker stack ls"

# Ver containers em execução
ssh root@209.126.11.124 "docker ps"

# Inspecionar tarefas e status de um serviço específico
ssh root@209.126.11.124 "docker service ps flowcare_api"
ssh root@209.126.11.124 "docker service ps flowcare_web"
```

### 3.3. Logs de Serviços em Tempo Real
```bash
# Logs da API (últimas 100 linhas)
ssh root@209.126.11.124 "docker service logs --tail 100 flowcare_api"

# Logs do Frontend Web
ssh root@209.126.11.124 "docker service logs --tail 100 flowcare_web"

# Logs do PostgreSQL
ssh root@209.126.11.124 "docker service logs --tail 100 flowcare_postgres"

# Logs da integração WhatsApp (WAHA)
ssh root@209.126.11.124 "docker service logs --tail 100 flowcare_waha"
```

---

## 4. Monitoramento e Healthcheck

Para verificar o health operacional completo (API + WhatsApp WAHA):
```bash
# Executar script de checagem interna
ssh root@209.126.11.124 "bash /root/flowcare/infra/monitoring/check-health.sh"

# Testar endpoint /api/health diretamente no container da API
ssh root@209.126.11.124 "docker exec \$(docker ps -qf name=flowcare_api | head -1) curl -s http://127.0.0.1:3000/api/health"
```

---

## 5. Banco de Dados (PostgreSQL) e Migrações

### 5.1. Status de Migrações do Prisma
```bash
ssh root@209.126.11.124 "docker exec \$(docker ps -qf name=flowcare_api | head -1) bun run prisma migrate status"
```

### 5.2. Execução de Queries no PostgreSQL
```bash
ssh root@209.126.11.124 "docker exec -i \$(docker ps -qf name=flowcare_postgres | head -1) psql -U postgres -d flowcare -c 'SELECT count(*) FROM \"User\";'"
```

---

## 6. Rotinas de Backup e Restore (Disaster Recovery)

Scripts localizados em `/root/flowcare/infra/backup/`:

- **Backup Completo do PostgreSQL**:
  ```bash
  ssh root@209.126.11.124 "bash /root/flowcare/infra/backup/backup-postgres.sh"
  ```
- **Checagem de Integridade dos Backups**:
  ```bash
  ssh root@209.126.11.124 "bash /root/flowcare/infra/backup/check-backup.sh"
  ```
- **Drill Isolado de Restauração (Validação sem afetar produção)**:
  ```bash
  ssh root@209.126.11.124 "bash /root/flowcare/infra/backup/restore-drill.sh"
  ```

---

## 7. Boas Práticas de Segurança
- Nunca exponha senhas, tokens JWT ou segredos em saídas de comandos.
- Não altere o arquivo `/root/flowcare/.env` diretamente sem backup prévio.
- Em caso de falha de serviço, consulte os logs com `docker service logs` e os eventos com `docker service ps` antes de reiniciar o container.
