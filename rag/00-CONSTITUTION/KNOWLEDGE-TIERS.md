---
title: VRAXIA Knowledge Tiers — Sistema de Hierarquia de Conhecimento
tier: 0
status: RATIFIED
version: "1.0"
authority: VRAXIA Core Team
created: 2026-07-16
immutable: true
tags:
  - constitution
  - tier-0
  - knowledge-tiers
  - hierarchy
  - governance
---

# VRAXIA Knowledge Tiers
## Sistema Hierárquico de Conhecimento

> **Regra de Ouro:** Tier menor = autoridade maior.
> Em conflito, sempre prevalece o documento de menor Tier.

---

## Definição dos Tiers

### TIER 0 — CONSTITUIÇÃO
```
════════════════════════════════════
         CONSTITUIÇÃO DO VRAXIA
════════════════════════════════════
Documentos:
  - VRAXIA-CONSTITUTION.md         ← Esta hierarquia
  - CORE-PRINCIPLES.md             ← Princípios imutáveis
  - KNOWLEDGE-TIERS.md             ← Este documento
  - AGENT-RETRIEVAL-RULES.md       ← Regras para agentes

Características:
  - Imutáveis sem aprovação explícita do Core Team
  - Autoridade máxima sobre todo o sistema
  - Precedem qualquer outro documento
  - Não podem ser contraditos por agentes

Localização: rag/00-CONSTITUTION/
════════════════════════════════════
```

### TIER 1 — ESPECIFICAÇÕES OFICIAIS
```
════════════════════════════════════
      ESPECIFICAÇÕES OFICIAIS
════════════════════════════════════
Documentos:
  - VRAXIA Guardian Security Framework
  - Runtime Architecture Specification
  - AI Provider Strategy
  - Multi-Agent Orchestration Spec

Características:
  - Ratificadas pelo Core Team
  - Definem comportamento obrigatório
  - Podem evoluir via processo formal
  - Referência para toda implementação

Localização: rag/01-OFFICIAL-SPECS/
════════════════════════════════════
```

### TIER 2 — ADR (Architecture Decision Records)
```
════════════════════════════════════
     ARCHITECTURE DECISION RECORDS
════════════════════════════════════
Documentos:
  - ADR-001: Guardian is final authority
  - ADR-002: LLMs never execute directly
  - ADR-003: All executions need manifest
  - ADR-004: Production never modified directly
  - ADR-005: Pluggable Executor architecture
  - ADR-006: TF-IDF as primary RAG layer
  - [futuras decisões...]

Características:
  - Imutáveis após Accepted
  - Novos ADRs podem deprecar os anteriores
  - Devem conter: Decisão, Justificativa, Consequências
  - Rastreabilidade histórica de decisões

Localização: rag/02-ADR/
════════════════════════════════════
```

### TIER 3 — DOCUMENTAÇÃO TÉCNICA
```
════════════════════════════════════
       DOCUMENTAÇÃO TÉCNICA
════════════════════════════════════
Documentos:
  - Documentação de domínios
  - Referência de API
  - Schemas de banco de dados
  - Documentação de backend/frontend
  - Documentação de infraestrutura
  - Especificações de deploy
  - Testes e cobertura

Características:
  - Atualizada com o sistema
  - Deve refletir o estado atual do código
  - Versionada junto com o código

Localização: rag/03-DOMAINS/ ... rag/11-TESTING/
════════════════════════════════════
```

### TIER 4 — GUIAS E RUNBOOKS
```
════════════════════════════════════
          GUIAS E RUNBOOKS
════════════════════════════════════
Documentos:
  - Runbooks operacionais
  - Guias de onboarding
  - Procedimentos de incidente
  - Checklists
  - FAQs operacionais

Características:
  - Orientativos, não prescritivos
  - Podem ser atualizados por qualquer operador
  - Não definem arquitetura, apenas como operar

Localização: rag/12-OPERATIONS/
════════════════════════════════════
```

### TIER 5 — EXEMPLOS E DEMONSTRAÇÕES
```
════════════════════════════════════
     EXEMPLOS E DEMONSTRAÇÕES
════════════════════════════════════
Documentos:
  - Exemplos de código
  - Demos e proof-of-concepts
  - Tutoriais
  - Case studies
  - Estratégia de produto

Características:
  - Ilustrativos, não autoritativos
  - Podem estar desatualizados
  - Sempre verificar contra docs Tier 1-3

Localização: rag/13-BUSINESS/, rag/14-PRODUCT/
════════════════════════════════════
```

### TIER 6 — NOTAS TEMPORÁRIAS
```
════════════════════════════════════
        NOTAS TEMPORÁRIAS
════════════════════════════════════
Documentos:
  - Rascunhos
  - Notas de sessão
  - Trabalho em progresso (WIP)
  - Idéias não ratificadas
  - Cópias de backup

Características:
  - Validade limitada (máximo 90 dias)
  - NUNCA usar como referência definitiva
  - Devem evoluir para Tier 1-5 ou serem arquivados

Localização: rag/15-ARCHIVE/ ou rag/REVIEW/
════════════════════════════════════
```

---

## Regras de Conflito

| Situação | Resolução |
|----------|-----------|
| Tier 0 vs Tier 1 | Tier 0 prevalece sempre |
| Tier 1 vs Tier 2 | Tier 1 prevalece, criar ADR para reconciliar |
| Tier 2 vs Tier 3 | Tier 2 prevalece, atualizar Tier 3 |
| Tier 3 vs Tier 4 | Tier 3 prevalece |
| Tier N vs REVIEW | Tier N prevalece, REVIEW aguarda resolução |
| Mesmo Tier | Mais recente prevalece, mover mais antigo para REVIEW |

---

## Processo de Promoção de Tier

```
TIER 6 (Rascunho)
  ↓ Revisão de qualidade
TIER 5 (Demo/Exemplo)
  ↓ Aprovação técnica
TIER 4 (Guia operacional)
  ↓ Revisão de arquitetura
TIER 3 (Documentação técnica)
  ↓ Aprovação do time
TIER 2 (ADR)
  ↓ Ratificação Core Team
TIER 1 (Especificação oficial)
  ↓ Ratificação Core Team + revisão constitucional
TIER 0 (Constituição)
```

---

## Tags Obrigatórias por Tier

| Tier | Tags obrigatórias no frontmatter |
|------|----------------------------------|
| 0 | `tier: 0`, `immutable: true`, `status: RATIFIED` |
| 1 | `tier: 1`, `status: RATIFIED\|PROPOSED` |
| 2 | `tier: 2`, `status: Accepted\|Proposed\|Deprecated` |
| 3 | `tier: 3`, `status: current\|outdated` |
| 4 | `tier: 4` |
| 5 | `tier: 5` |
| 6 | `tier: 6`, `expires: YYYY-MM-DD` |

---

*Parte integrante da [[VRAXIA-CONSTITUTION]] — Tier 0 — Imutável*
*Versão 1.0 — Ratificada em 2026-07-16*
