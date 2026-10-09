---
name: github-cli
description: Consultar, inspecionar e operar tarefas, issues, pull requests, comentários, commits, workflows e status de CI no repositório Flowcare utilizando o GitHub CLI (gh).
---

# Flowcare — GitHub CLI (`gh`) Operations & Conventions

Guia para leitura, inspeção e gerenciamento de issues, PRs, comentários, commits e workflows via `gh` CLI no repositório `flow-care/flowcare`.

---

## 1. Verificação de Autenticação e Contexto

Antes de executar operações:
```bash
gh auth status
```
Para confirmar o repositório padrão:
```bash
gh repo set-default flow-care/flowcare
```

---

## 2. Leitura e Gerenciamento de Issues / Tasks

### 2.1. Visualizar Detalhes de uma Issue
```bash
# Ver título, estado, autor, labels, projeto e corpo
gh issue view <issue_number>

# Ver issue com todos os comentários
gh issue view <issue_number> --comments

# Obter campos específicos em formato JSON
gh issue view <issue_number> --json number,title,state,body,labels,assignees
```

### 2.2. Listar e Filtrar Issues
```bash
# Listar issues abertas recentes
gh issue list --state open --limit 20

# Filtrar por label
gh issue list --label "frontend" --state open
gh issue list --label "backend" --state open

# Buscar issues por palavra-chave
gh issue list --search "onboarding clinic"
```

### 2.3. Comentar e Atualizar Issues
```bash
# Adicionar comentário em uma issue
gh issue comment <issue_number> --body "Comentário aqui"

# Fechar ou reabrir issue
gh issue close <issue_number> --reason "completed"
gh issue reopen <issue_number>
```

---

## 3. Leitura e Gerenciamento de Pull Requests (PRs)

### 3.1. Visualizar Detalhes e Comentários de um PR
```bash
# Resumo do PR (título, descrição, branch de origem e destino, revisões)
gh pr view <pr_number>

# Ver todos os comentários e revisões do PR
gh pr view <pr_number> --comments

# Inspecionar diff de código de um PR
gh pr diff <pr_number>
```

### 3.2. Listar PRs
```bash
# Listar PRs abertos
gh pr list --state open

# Listar PRs criados pelo usuário atual
gh pr list --author "@me"
```

### 3.3. Acompanhamento de CI (Checks e Workflows)
```bash
# Ver o status de todos os checks de um PR
gh pr checks <pr_number>

# Assistir os checks até concluírem
gh pr checks <pr_number> --watch
```

### 3.4. Criação e Merge de Pull Requests
```bash
# Criar PR com título e corpo
gh pr create --title "<type>(<scope>): <description> (#<issue>)" --body "..."
```

> [!CAUTION]
> **Aprovação Obrigatória do Usuário**:
> NUNCA execute `gh pr merge` automaticamente. Após abrir o PR e o CI passar, informe o link do PR e o resumo das alterações ao usuário. Aguarde a análise e a solicitação explícita do usuário antes de realizar o merge.

```bash
# Fazer merge via squash e deletar branch remota (APENAS após autorização explícita do usuário)
# (Usar --admin caso haja restrição de branch protection no repositório)
gh pr merge <pr_number> --squash --delete-branch --admin
```

---

## 4. Inspeção de Commits e Histórico

### 4.1. Ver Commits de um PR
```bash
gh pr view <pr_number> --json commits --jq '.commits[].messageHeadline'
```

### 4.2. Inspecionar Commit Específico
```bash
# Ver detalhes de um commit via API
gh api repos/flow-care/flowcare/commits/<commit_sha> --jq '{sha: .sha, author: .commit.author.name, message: .commit.message}'

# Ou diretamente via git local
git show --stat <commit_sha>
```

---

## 5. Convenções de Idioma e Padrão de Commits

> [!IMPORTANT]
> **Convenção de Idioma Obrigatória**:
> - Mensagens de commit e títulos de PR DEVEM ser escritos em **inglês**.
> - Respostas para o usuário no chat continuam em português, mas **commits, PRs e branches usam inglês técnico**.

### Padrão de Formato (Conventional Commits):
```text
<type>(<scope>): <action in imperative mood> (#<issue_number>)
```

#### Exemplos Corretos:
- `feat(onboarding): allow creating first clinic (#221)`
- `feat(invites): allow accepting clinic invitation (#213)`
- `fix(auth): revoke other sessions on password change (#357)`
- `docs(infra): record issue 203 production validation evidence (#383)`
- `fix(deploy): wait for postgres before migrations (#380)`

#### Tipos Utilizados:
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `chore`: tarefas de manutenção, build, dependências
- `docs`: alterações em documentação
- `refactor`: refatoração de código sem alteração funcional
- `test`: adição ou modificação de testes
