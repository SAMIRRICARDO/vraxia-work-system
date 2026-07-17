---
title: VRAXIA Knowledge Taxonomy — Taxonomia Oficial da Base de Conhecimento
tier: 1
status: RATIFIED
version: "1.0"
authority: VRAXIA Core Team
created: 2026-07-16
tags:
  - taxonomy
  - tier-1
  - classification
  - governance
  - knowledge-architecture
---

# VRAXIA Knowledge Taxonomy
## Taxonomia Oficial — Classificação de Toda a Base de Conhecimento

> Esta taxonomia define como todo documento VRAXIA deve ser classificado,
> organizado e recuperado. É a linguagem comum de toda a base de conhecimento.

---

## Estrutura de Diretórios Canônica

```
rag/
│
├── 00-CONSTITUTION/              Tier 0 — Documentos constitucionais
│   ├── VRAXIA-CONSTITUTION.md   → Lei suprema
│   ├── CORE-PRINCIPLES.md       → Princípios imutáveis
│   ├── KNOWLEDGE-TIERS.md       → Hierarquia de conhecimento
│   └── AGENT-RETRIEVAL-RULES.md → Regras para agentes
│
├── 01-OFFICIAL-SPECS/            Tier 1 — Especificações oficiais
│   ├── security/
│   │   └── VRAXIA-GUARDIAN.md   → Guardian Security Framework
│   ├── architecture/
│   │   └── RUNTIME-ARCH.md      → Arquitetura de runtime
│   ├── ai/
│   │   └── AI-PROVIDER.md       → Estratégia de modelos de IA
│   └── remote-dev/
│       └── RDA-SPEC.md          → Remote Dev Agent spec
│
├── 02-ADR/                       Tier 2 — Architecture Decision Records
│   ├── ADR-001-guardian-is-final-authority.md
│   ├── ADR-002-llms-never-execute-directly.md
│   ├── ADR-003-all-executions-must-generate-manifest.md
│   ├── ADR-004-production-never-modified-directly.md
│   └── ADR-005-pluggable-executor-architecture.md
│
├── 03-DOMAINS/                   Tier 3 — Domínios de negócio
│   ├── career-os/               → Career OS, HIE, CKOS
│   ├── truth-engine/            → Decision Engine, Score
│   ├── ai-agents/               → Agentes especializados
│   ├── mcp/                     → Multi-agent coordination
│   └── analytics/               → Métricas e relatórios
│
├── 04-API/                       Tier 3 — Referência de API
├── 05-DATABASE/                  Tier 3 — Schemas e queries
├── 06-FRONTEND/                  Tier 3 — Dashboard, UI
├── 07-BACKEND/                   Tier 3 — Servidores, middleware
├── 08-INFRASTRUCTURE/            Tier 3 — Docker, Redis, Postgres
├── 09-SECURITY/                  Tier 1-2 — Regras e controles
├── 10-DEPLOY/                    Tier 3 — Deploy e CI/CD
├── 11-TESTING/                   Tier 3-4 — Testes e validação
├── 12-OPERATIONS/                Tier 4 — Runbooks e guias
├── 13-BUSINESS/                  Tier 5 — Estratégia e outbound
├── 14-PRODUCT/                   Tier 5 — Roadmap e produto
├── 15-ARCHIVE/                   Tier 5-6 — Documentos legados
│
├── REVIEW/                       ⚠️ Conflitos aguardando resolução
│   └── CONFLICTS-REPORT.md      → Análise de conflitos detectados
│
├── TAXONOMY.md                   → Este documento
├── MASTER-INDEX.md               → Índice mestre de todos os documentos
├── KNOWLEDGE-CATALOG.md          → Catálogo com metadados completos
├── DOCUMENT-RELATIONSHIPS.md     → Grafo de relacionamentos
└── RAG-ARCHITECTURE-REPORT.md   → Relatório completo da arquitetura
```

---

## Taxonomia por Tipo de Documento

### Tipo: CONSTITUTION (CON)
- Tier: 0
- Imutável
- Localização: `rag/00-CONSTITUTION/`
- Exemplo: `VRAXIA-CONSTITUTION.md`

### Tipo: SPECIFICATION (SPEC)
- Tier: 1
- Ratificada pelo Core Team
- Localização: `rag/01-OFFICIAL-SPECS/`
- Exemplo: `VRAXIA-GUARDIAN.md`

### Tipo: ADR (ADR)
- Tier: 2
- Status obrigatório: Proposed/Accepted/Deprecated
- Localização: `rag/02-ADR/`
- Formato: `ADR-NNN-kebab-case-title.md`
- Exemplo: `ADR-001-guardian-is-final-authority.md`

### Tipo: DOMAIN (DOM)
- Tier: 3
- Documentação de domínio de negócio
- Localização: `rag/03-DOMAINS/<domain>/`
- Exemplo: `career-os/CAREER-OS-SPEC.md`

### Tipo: REFERENCE (REF)
- Tier: 3
- Documentação técnica de referência (API, DB, etc.)
- Localização: `rag/04-API/` a `rag/11-TESTING/`
- Exemplo: `04-API/REST-API.md`

### Tipo: GUIDE (GDE)
- Tier: 4
- Runbooks e guias operacionais
- Localização: `rag/12-OPERATIONS/`
- Exemplo: `12-OPERATIONS/INCIDENT-RESPONSE.md`

### Tipo: BUSINESS (BIZ)
- Tier: 5
- Estratégia, produto, outbound
- Localização: `rag/13-BUSINESS/`, `rag/14-PRODUCT/`
- Exemplo: `13-BUSINESS/OUTBOUND-STRATEGY.md`

### Tipo: ARCHIVE (ARC)
- Tier: 5-6
- Documentos legados, cópias históricas
- Localização: `rag/15-ARCHIVE/`
- Exemplo: `15-ARCHIVE/coordinator-v1.md`

### Tipo: REVIEW (REV)
- Tier: N/A
- Conflitos e documentos pendentes de resolução
- Localização: `rag/REVIEW/`
- Exemplo: `REVIEW/coordinator-copy-conflict.md`

---

## Taxonomia do CKOS (Candidate Knowledge OS)

O CKOS usa sua própria numeração (01-40) que mapeia para a taxonomia VRAXIA:

| CKOS | Pasta CKOS | Tipo RAG | Tier RAG |
|------|-----------|----------|---------|
| 01 | profile | DOM | 3 |
| 02 | hr | GDE | 4 |
| 03 | behavior | DOM | 3 |
| 04 | experience | DOM | 3 |
| 05 | projects | DOM | 3 |
| 06 | architecture | SPEC | 1 |
| 07-08 | backend/frontend | REF | 3 |
| 09-15 | database/cloud/infra | REF | 3 |
| 16-19 | ai/rag/multi-agent/llm | SPEC | 1 |
| 20 | security | SPEC | 1 |
| 21 | system_design | DOM | 3 |
| 22-24 | sre/observability/incidents | GDE | 4 |
| 25-26 | problem_solving/real_cases | GDE | 4 |
| 27-28 | keywords/glossary | REF | 3 |
| 29-30 | certifications/education | DOM | 3 |
| 31 | salary | DOM | 3 |
| 32 | company_research | DOM | 3 |
| 33-37 | interview/* | GDE | 4 |
| 38-40 | patterns/architecture/softskills | DOM | 3 |

---

## Padrão de Frontmatter por Tipo

### Tier 0 (Constitution)
```yaml
---
title: [Nome completo]
tier: 0
status: RATIFIED
version: "1.0"
authority: VRAXIA Core Team
created: YYYY-MM-DD
immutable: true
tags: [constitution, tier-0, ...]
---
```

### Tier 1 (Official Spec)
```yaml
---
title: [Nome completo]
tier: 1
status: RATIFIED | PROPOSED | DEPRECATED
version: "1.0"
owner: [Time responsável]
created: YYYY-MM-DD
updated: YYYY-MM-DD
criticality: Critical | High | Medium | Low
tags: [spec, tier-1, domain, ...]
---
```

### Tier 2 (ADR)
```yaml
---
title: ADR-NNN: [Decisão em uma linha]
tier: 2
status: Accepted | Proposed | Deprecated
created: YYYY-MM-DD
supersedes: ADR-NNN (se aplicável)
superseded-by: ADR-NNN (se aplicável)
tags: [adr, tier-2, domain, ...]
---
```

### Tier 3+ (Technical docs, Guides, etc.)
```yaml
---
title: [Título descritivo]
tier: 3 | 4 | 5 | 6
category: [Categoria da taxonomia]
version: "1.0"
updated: YYYY-MM-DD
tags: [tags, relevantes, ...]
---
```

---

## Regras de Nomeação

| Tipo | Convenção | Exemplo |
|------|-----------|---------|
| Constitution | UPPER-KEBAB.md | `VRAXIA-CONSTITUTION.md` |
| Official Spec | UPPER-KEBAB.md | `VRAXIA-GUARDIAN.md` |
| ADR | ADR-NNN-kebab.md | `ADR-001-guardian-is-final-authority.md` |
| Domain doc | kebab-case.md | `career-os-spec.md` |
| Runbook | UPPER-KEBAB.md | `INCIDENT-RESPONSE.md` |
| Archive | prefix com data | `2026-06-coordinator-v1.md` |

---

*Versão 1.0 — Tier 1 — Parte do sistema de governança VRAXIA*
*Criada em 2026-07-16*
