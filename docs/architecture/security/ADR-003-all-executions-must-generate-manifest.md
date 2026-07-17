---
status: Accepted
date: 2026-07-17
---

# ADR-003: Toda Execução Deve Gerar um Execution Manifest

## Decisão

Todo Executor deve produzir um Execution Manifest antes de qualquer ação.

## Justificativa

O Execution Manifest permite que o Guardian valide, aprove ou rejeite cada ação
individualmente antes da execução, garantindo controle granular e auditabilidade.

## Consequências

- Executores implementam `plan()` antes de `execute()`
- O Guardian revisa o manifest via Policy Engine + Risk Analyzer
- Ações não declaradas no manifest são bloqueadas automaticamente
