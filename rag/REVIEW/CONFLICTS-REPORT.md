---
title: VRAXIA RAG Conflicts Report — Relatório de Conflitos Detectados
tier: 6
status: RESOLVED
version: "1.1"
created: 2026-07-16
updated: 2026-07-16
tags:
  - review
  - conflicts
  - governance
  - knowledge-architecture
---

# VRAXIA RAG Conflicts Report
## Conflitos e Duplicatas — TODOS RESOLVIDOS em 2026-07-16

> **Regra:** Documentos em REVIEW nunca são deletados automaticamente.
> O Knowledge Architect analisa cada conflito e propõe resolução.
> Usuário deve aprovar ações que envolvem remoção ou merge.

---

## Resumo Executivo

| Tipo | Quantidade | Status |
|------|-----------|--------|
| Duplicatas de nome | 2 | ✅ RESOLVED |
| Conteúdo duplicado (dois locais) | 1 | ✅ RESOLVED (by design) |
| Bug de nomenclatura | 1 | ✅ RESOLVED |
| ADR numeração duplicada | 1 | ✅ RESOLVED |
| **Total** | **5** | **5/5 RESOLVED** |

---

## CONFLITO-001: coordinator copy.md vs coordinator.md

**Status:** ✅ RESOLVED em 2026-07-16

**Diagnóstico:**
Após leitura dos dois arquivos, constatou-se que **não eram versões do mesmo documento**:
- `coordinator.md` (54 linhas) = prompt do agente coordenador (define como decompor goals em DAG)
- `coordinator copy.md` (200 linhas) = plano de campanha de lançamento de livro (pipeline completo com 4 tasks específicas)

**Resolução aplicada:**
```
coordinator copy.md → movido para prompts/commercial/campanha-livro-lancamento.md
coordinator.md → mantido no lugar (correto, sem alteração)
```

O arquivo de campanha foi colocado em `prompts/commercial/` que é o local semânticamente correto para pipelines de campanha.

---

## CONFLITO-002: email-sender-agent copy.md vs email-sender-agent.md

**Status:** ✅ RESOLVED em 2026-07-16

**Diagnóstico:**
- `email-sender-agent.md` **não existia** no disco (arquivo original foi perdido)
- `email-sender-agent copy.md` era o único arquivo real e ativo

**Resolução aplicada:**
```
email-sender-agent copy.md → renomeado para email-sender-agent.md
```

O prompt restaurado define o dispatcher de email do VRASHOWS com posicionamento correto,
regras de envio, parâmetros Resend API e instruções de media kit PDF.

---

## CONFLITO-003: VRAXIA_EXECUTIVE_CONTEXT.md.md — Bug de Nomenclatura

**Status:** ✅ RESOLVED em 2026-07-16

**Resolução aplicada:**
```
docs/VRAXIA_EXECUTIVE_CONTEXT.md.md → renomeado para docs/VRAXIA_EXECUTIVE_CONTEXT.md
```

Extensão duplicada removida. Arquivo agora carregado corretamente por todos os parsers .md.

---

## CONFLITO-004: ADR numeração duplicada — ADR-003

**Status:** ✅ RESOLVED em 2026-07-16

**Diagnóstico:**
- `ADR-003-state-machine.md` — criado em 13/07/2026 (mais antigo, original ADR-003)
- `ADR-003-decision-engine-calibration.md` — criado em 15/07/2026 (mais novo, incorretamente numerado)

**Resolução aplicada:**
```
docs/ADR-003-decision-engine-calibration.md → renomeado para docs/ADR-004-decision-engine-calibration.md
```

Sequência agora correta: ADR-001, ADR-002, ADR-003 (state-machine), ADR-004 (decision-engine-calibration).

---

## CONFLITO-005 (RESOLVIDO): docs/security vs knowledge/20_security

**Status:** RESOLVED — Duplicata intencional (por design)

**Localização:**
- `docs/architecture/security/001-vraxia-guardian.md` — Cópia do projeto (documentação)
- `candidate-os/knowledge/20_security/001-vraxia-guardian.md` — Arquivo RAG primário (auto-carregado)

**Análise:**
Não é conflito real. São dois propósitos distintos:
- O arquivo em `knowledge/20_security/` é o **arquivo RAG primário** auto-carregado pelo `CandidateKBLoader`
- O arquivo em `docs/architecture/security/` é a **documentação do projeto** para referência humana

**Decisão:** Manter ambos. O `knowledge/` é o canônico para o RAG. O `docs/` é a referência de projeto.

**Recomendação:** Adicionar uma nota no arquivo `docs/` indicando que o canônico para RAG está em `knowledge/`.

---

## Histórico de Resoluções

| # | Conflito | Resolução | Data |
|---|----------|-----------|------|
| 1 | CONFLITO-003: dupla extensão .md.md | Renomeado para .md | 2026-07-16 |
| 2 | CONFLITO-004: ADR-003 duplicado | Calibration renumerado para ADR-004 | 2026-07-16 |
| 3 | CONFLITO-002: email-sender-agent copy.md | Renomeado para email-sender-agent.md | 2026-07-16 |
| 4 | CONFLITO-001: coordinator copy.md | Movido para prompts/commercial/campanha-livro-lancamento.md | 2026-07-16 |
| 5 | CONFLITO-005: security em dois locais | RESOLVED by design (propósitos distintos) | 2026-07-16 |

**Score final: 5/5 conflitos resolvidos — Base de conhecimento sem duplicatas ou ambiguidades.**

---

*Knowledge Architect VRAXIA — 2026-07-16*
*Próxima auditoria: 2026-08-16*
