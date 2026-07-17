---
status: Accepted
date: 2026-07-17
---

# ADR-004: Produção Nunca é Modificada Diretamente

## Decisão

Nenhum Executor, Agente ou LLM pode modificar o ambiente de produção diretamente.

## Justificativa

Alterações diretas em produção sem sandbox, testes e aprovação representam
risco crítico de indisponibilidade, perda de dados e falhas de segurança.

## Consequências

- Fluxo obrigatório: Workspace → Build → Testes → Security Scan → Approval → Deploy
- Deploy requer aprovação humana explícita
- Qualquer tentativa de acesso direto à produção é bloqueada e auditada
