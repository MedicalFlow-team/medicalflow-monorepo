# Guia de Contribuicao e Padroes de Engenharia

Diretrizes tecnicas e operacionais para desenvolvimento no Flowcare.

---

## Modelo de Ramificacao (Branching Model)

- `main`: Branch de producao. Protegida contra push direto. Alteracoes exclusivamente via Pull Request aprovado.
- `feature/<nome-da-tarefa>`: Implementacao de novas funcionalidades.
- `bugfix/<descricao-do-erro>`: Correcoes de bugs identificados.
- `infra/<descricao>`: Alteracoes em Docker, Compose ou pipelines CI/CD.
- `test/<descricao>`: Adicao ou ajuste em testes automatizados.

---

## Padrao de Mensagens de Commit

Adotamos a especificacao Conventional Commits:

- `feat:` Nova funcionalidade
- `fix:` Correcao de defeito
- `refactor:` Refatoracao de codigo sem alteracao de comportamento
- `test:` Inclusao ou ajuste de testes
- `infra:` Ajustes em containers, CI/CD ou configuracoes de deploy
- `docs:` Alteracoes em documentacao tecnica
- `chore:` Atualizacoes de dependencias ou manutencoes gerais

Exemplos:
```bash
git commit -m "feat(backend): implement patient registration endpoint"
git commit -m "fix(frontend): handle null response on appointment list"
```

---

## Fluxo de Integracao de Codigo

1. Atualizar a branch principal:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Criar branch de trabalho a partir da main:
   ```bash
   git checkout -b feature/nome-da-feature
   ```
3. Desenvolver e validar localmente:
   - Validar schema Prisma (`npx prisma validate`)
   - Executar verificacao de tipos e build
4. Submeter branch e abrir Pull Request:
   ```bash
   git push origin feature/nome-da-feature
   ```
5. Revisao de codigo:
   - Todo PR requer aprovacao de no minimo 1 revisor antes do merge.
   - Merges diretos na `main` sao bloqueados por politica.
