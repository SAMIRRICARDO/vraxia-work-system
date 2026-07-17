---
title: VRAXIA Document Relationships — Grafo de Relacionamentos entre Documentos
tier: 1
status: current
version: "1.0"
created: 2026-07-16
tags:
  - relationships
  - tier-1
  - knowledge-graph
  - cross-references
---

# VRAXIA Document Relationships
## Grafo de Relacionamentos entre Documentos

> Cada documento não existe isolado. Este grafo mapeia como o conhecimento
> flui entre documentos e quais são as dependências críticas.

---

## Grafo de Autoridade (Tier 0 → Tier 1 → Tier 2)

```
VRAXIA-CONSTITUTION (CON-001) — LEI SUPREMA
│
├── CORE-PRINCIPLES (CON-002)
│   ├── → VRAXIA-GUARDIAN-SECURITY-FRAMEWORK (SPEC-001) [Princípio 3: Secure by Default]
│   ├── → RAG-ARCHITECTURE (SPEC-005) [Princípio 1: Tool-First + Princípio 2: Memory-First]
│   └── → AI-PROVIDER-STRATEGY (docs/) [Princípio 4: Cost-Aware Intelligence]
│
├── KNOWLEDGE-TIERS (CON-003)
│   ├── → TAXONOMY (GOV-005)
│   ├── → MASTER-INDEX (GOV-006)
│   └── → CONFLICTS-REPORT (GOV-009) [para documentos em Review]
│
└── AGENT-RETRIEVAL-RULES (CON-004)
    ├── → VRAXIA-GUARDIAN (SPEC-001) [Regra 4: Proibições absolutas]
    ├── → RAG-ARCHITECTURE (SPEC-005) [Regra 2: Hierarquia de retrieval]
    └── → CANDIDATE-PROFILE-LOADER (código) [Regra 7: Perguntas binárias]
```

---

## Grafo de Segurança

```
VRAXIA-GUARDIAN (SPEC-001) — AUTORIDADE DE SEGURANÇA
│
├── supersede: ADR-SEC-001 (Guardian is Final Authority)
│   └── implementa: packages/work/src/remote-dev/
│
├── fundamenta: ADR-SEC-002 (LLMs Never Execute Directly)
│   └── implementa: claude-code-executor.ts
│
├── requer: ADR-SEC-003 (All Executions Must Generate Manifest)
│   └── implementa: rda-router.ts (jobs endpoint)
│
└── determina: ADR-SEC-004 (Production Never Modified Directly)
    └── implementa: vercel --prod (manual trigger only)
```

---

## Grafo do Sistema RAG

```
RAG-ARCHITECTURE (SPEC-005) — ESPECIFICAÇÃO RAG
│
├── implementado por:
│   ├── packages/work/src/rag/retriever.ts (TF-IDF engine)
│   ├── packages/work/src/rag/candidate-kb-loader.ts (corpus loader)
│   ├── packages/work/src/rag/candidate-kb-retriever.ts (5-layer hierarchy)
│   └── packages/work/src/agents/cache.ts (QACache with versioning)
│
├── alimentado por:
│   ├── candidate-os/knowledge/**/*.md (42 arquivos CKOS)
│   ├── candidate-os/knowledge/01_profile/master_profile.md (SSoT candidato)
│   └── packages/work/src/rag/candidate-profile-loader.ts (SSoT técnico)
│
└── governado por:
    ├── AGENT-RETRIEVAL-RULES (CON-004)
    └── VRAXIA-GUARDIAN (SPEC-001)
```

---

## Grafo do Candidato (Career OS)

```
master_profile.md (DOM-001) — SSoT DO CANDIDATO
│
├── detalha experiência:
│   ├── timeline.md (DOM-006)
│   ├── vraxia_vrashows.md (DOM-007)
│   ├── elite_tecnologia.md (DOM-008)
│   ├── infinitycorp.md (DOM-009)
│   ├── nstech.md (DOM-010)
│   ├── freela.md (DOM-011)
│   └── pre_2022.md (DOM-012)
│
├── detalha projetos:
│   ├── vraxia_platform.md (DOM-020)
│   ├── vrashows.md (DOM-021)
│   ├── human_rag_framework.md (DOM-022)
│   └── vraxia_work.md (DOM-023)
│
├── complementado por:
│   ├── elevator_pitch.md (DOM-002)
│   ├── positioning.md (DOM-003)
│   └── perfil_comportamental.md (DOM-005)
│
└── usado em:
    ├── perguntas_comportamentais.md (GDE-003) [respostas STAR]
    ├── perguntas_tecnicas.md (GDE-004)
    └── system_design_questions.md (GDE-005)
```

---

## Grafo de Entrevistas

```
system_design_questions.md (GDE-005)
│
├── referencia técnico:
│   ├── api_design.md (REF-001)
│   ├── sistema_ia_multiagente.md (REF-012)
│   ├── plataforma_saas.md (REF-011)
│   └── api_enterprise.md (REF-010)
│
├── evidenciado por:
│   ├── vraxia_platform.md (DOM-020) [case real]
│   ├── human_rag_framework.md (DOM-022) [case RAG]
│   └── star_library.md (GDE-006) [exemplos STAR]
│
└── suportado por:
    ├── backend_expertise.md (REF-002)
    ├── rag_architecture.md (SPEC-005)
    └── multi_agent_systems.md (SPEC-006)
```

---

## Grafo de Implementação (Código → Docs)

```
packages/work/src/rag/
│
├── candidate-profile-loader.ts
│   ├── documenta: master_profile.md (DOM-001)
│   ├── valida via: candidate-profile-validator.ts
│   └── usa: skill-normalizer.ts, profile-metrics.ts
│
├── candidate-kb-loader.ts
│   ├── carrega: candidate-os/knowledge/**/*.md (42 arquivos)
│   └── carrega: packages/work/kb/*.md (hard rules, FAQ)
│
├── candidate-kb-retriever.ts
│   ├── implementa: 5 camadas de retrieval
│   └── usa: retriever.ts (TF-IDF)
│
└── retriever.ts (VaultRetriever)
    ├── algoritmo: TF-IDF com tag boost (+0.5)
    └── documenta: rag_architecture.md (SPEC-005)
```

---

## Dependências Críticas

Documentos que, se corrompidos, afetam todo o sistema:

| Documento | Depende deles | Impacto se perdido |
|-----------|---------------|-------------------|
| `master_profile.md` | 30+ arquivos | Total — identidade do candidato perdida |
| `VRAXIA-GUARDIAN.md` | 4 ADRs + implementação | Crítico — política de segurança perdida |
| `rag_architecture.md` | Toda implementação RAG | Alto — referência de implementação perdida |
| `candidate-profile-loader.ts` | Todo o sistema RAG | Total — SSoT técnico falha |
| `VRAXIA-CONSTITUTION.md` | Toda governança | Crítico — autoridade máxima perdida |

---

## Documentos Orphãos (sem referências)

Documentos que não são referenciados por nenhum outro:

| Documento | Status | Recomendação |
|-----------|--------|--------------|
| `docs/VRAXIA_LANDING.md` | Ativo | Adicionar ao catálogo de produto |
| `docs/GITHUB_PROFILE_README.md` | Ativo | Mover para Tier 5 (Business) |
| `docs/github-profile-readme-updated.md` | ⚠️ Duplicata? | Verificar vs anterior |
| `obsidian-vault/skills/api-design.md` | Ativo | Referenciar de REF-001 |
| `prompts/agents/Plano de lançamento.md` | Ativo | Mover para Tier 5 (Product) |
| `prompts/agents/templates_email_fase2.md` | Ativo | Mover para 13-BUSINESS |

---

*Gerado pelo Knowledge Architect VRAXIA — 2026-07-16*
*Versão 1.0 — Tier 1*
