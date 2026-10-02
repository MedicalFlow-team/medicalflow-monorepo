---
name: medicalflow-workflow
description: Apply MedicalFlow's branch, Conventional Commit, documentation, and validation conventions to every task in this repository.
metadata:
  short-description: MedicalFlow project workflow
---

# MedicalFlow project workflow

Apply these conventions to all work in the MedicalFlow repository, including feature implementation, bug fixes, refactors, documentation, and maintenance.

## Branches

- Do project work on a dedicated branch; do not make task changes directly on `main`.
- Start from the appropriate up-to-date base (`main` by default, or a related feature branch when the user explicitly wants stacked work). Use a short descriptive name with a type prefix, such as `feat/`, `fix/`, `chore/`, or `docs/`.
- Inspect the current branch and worktree first. Preserve unrelated edits and commits; never reset, discard, or move the user's work to make branch setup easier.
- Do not push or open a pull request unless the user asks.

## Commits

- Keep commits small and focused: one coherent change per commit, with unrelated changes separated.
- Use Conventional Commit subjects, for example `feat: add password reset screen`, `fix: redirect unauthenticated users`, or `docs: describe onboarding setup`.
- Do not include generated files, unrelated work, or secrets. Review the staged diff before each commit.
- Run appropriate validation before committing. A build is not a test; report each accurately and never mark tests as passed unless tests were actually run successfully.

## Documentation

- Keep project documentation in sync with behavior, setup, configuration, routes, and developer workflows that the task changes. Update the relevant existing docs rather than adding redundant documents.
- For code changes, provide a concise change description and record validation performed in the commit/PR description or the project's established documentation location. Do not claim evidence or checks that were not performed.
- Add comments only where they explain non-obvious intent or constraints; documentation should help users or maintainers act on the change.

## Project-specific requirements

- Before changing Next.js code, follow the Next.js agent instructions in `AGENTS.md`: consult the relevant documentation shipped in this repository's installed `next/dist/docs/` and heed deprecations.
- Inspect repository guidance and existing conventions before editing. Prefer the smallest complete change and run the checks relevant to the affected area.
