---
status: Accepted
date: 2026-07-17
---

# ADR-001: O Guardian é a Autoridade Final

## Decisão

O VRAXIA Guardian é a única entidade com autoridade para autorizar execuções.
Nenhum LLM, Executor ou Agente pode contornar o Guardian.

## Justificativa

LLMs são modelos estocásticos. Suas saídas são propostas, não comandos.
O sistema precisa de uma camada de controle determinística e auditável.

## Consequências

- Toda execução passa pelo Guardian Engine
- LLMs produzem Execution Plans, não comandos diretos
- Qualquer tentativa de bypass é bloqueada e auditada
