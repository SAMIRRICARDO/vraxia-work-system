---
status: Accepted
date: 2026-07-17
---

# ADR-002: LLMs Nunca Executam Diretamente

## Decisão

Nenhum Large Language Model possui poder de execução direta sobre qualquer ambiente.

## Justificativa

LLMs podem ser manipulados via Prompt Injection, Jailbreak ou Engenharia Social.
Execução direta criaria um vetor de ataque sem controle.

## Consequências

- LLMs produzem apenas Execution Plans (JSON estruturado)
- O Execution Firewall intercepta toda tentativa de execução direta
- O Prompt Validator bloqueia tentativas de bypass antes de chegar ao executor
