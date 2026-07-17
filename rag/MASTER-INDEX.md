---
title: VRAXIA Knowledge Master Index — Índice Mestre de Toda a Base de Conhecimento
tier: 1
status: current
version: "1.0"
created: 2026-07-16
updated: 2026-07-16
tags:
  - master-index
  - tier-1
  - governance
  - knowledge-architecture
  - single-source-of-truth
---

# VRAXIA Knowledge Master Index
## Índice Mestre — Fonte Única da Verdade para Localização de Documentos

> Todo documento VRAXIA está registrado aqui.
> Se um documento não está neste índice, não é oficial.
> Atualizar este índice é obrigatório ao criar ou remover qualquer documento.

---

## Seção 0 — CONSTITUIÇÃO (Tier 0)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| CON-001 | VRAXIA Constitution | `rag/00-CONSTITUTION/VRAXIA-CONSTITUTION.md` | RATIFIED | 0 |
| CON-002 | Core Principles | `rag/00-CONSTITUTION/CORE-PRINCIPLES.md` | RATIFIED | 0 |
| CON-003 | Knowledge Tiers | `rag/00-CONSTITUTION/KNOWLEDGE-TIERS.md` | RATIFIED | 0 |
| CON-004 | Agent Retrieval Rules | `rag/00-CONSTITUTION/AGENT-RETRIEVAL-RULES.md` | RATIFIED | 0 |

---

## Seção 1 — ESPECIFICAÇÕES OFICIAIS (Tier 1)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| SPEC-001 | VRAXIA Guardian Security Framework | `candidate-os/knowledge/20_security/001-vraxia-guardian.md` | RATIFIED | 1 |
| SPEC-002 | VRAXIA Guardian (cópia docs) | `docs/architecture/security/001-vraxia-guardian.md` | RATIFIED | 1 |
| SPEC-003 | AI Runtime Architecture | `docs/architecture/VRASHOWS_AI_Runtime_Architecture.md` | current | 1 |
| SPEC-004 | AI Runtime Enterprise Manual | `docs/AI_RUNTIME_ENTERPRISE_MANUAL.md` | current | 1 |
| SPEC-005 | RAG Architecture Spec | `candidate-os/knowledge/17_rag/rag_architecture.md` | current | 1 |
| SPEC-006 | Multi-Agent Systems | `candidate-os/knowledge/18_multi_agents/multi_agent_systems.md` | current | 1 |
| SPEC-007 | AI Expertise | `candidate-os/knowledge/16_ai/ai_expertise.md` | current | 1 |
| SPEC-008 | LLM Expertise | `candidate-os/knowledge/19_llms/llm_expertise.md` | current | 1 |
| SPEC-009 | Architecture Principles | `candidate-os/knowledge/06_architecture/principios.md` | current | 1 |
| SPEC-010 | Remote Dev Agent Spec | `packages/work/src/remote-dev/` (código) | implemented | 1 |

---

## Seção 2 — ADR (Tier 2)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| ADR-001 | Architecture Overview | `docs/ADR-001-architecture.md` | Accepted | 2 |
| ADR-002 | Truth Engine | `docs/ADR-002-truth-engine.md` | Accepted | 2 |
| ADR-003a | State Machine | `docs/ADR-003-state-machine.md` | Accepted | 2 |
| ADR-003b | Decision Engine Calibration | `docs/ADR-003-decision-engine-calibration.md` | ⚠️ CONFLICT | 2 |
| ADR-SEC-001 | Guardian is Final Authority | `docs/architecture/security/ADR-001-guardian-is-final-authority.md` | Accepted | 2 |
| ADR-SEC-002 | LLMs Never Execute Directly | `docs/architecture/security/ADR-002-llms-never-execute-directly.md` | Accepted | 2 |
| ADR-SEC-003 | All Executions Must Generate Manifest | `docs/architecture/security/ADR-003-all-executions-must-generate-manifest.md` | Accepted | 2 |
| ADR-SEC-004 | Production Never Modified Directly | `docs/architecture/security/ADR-004-production-never-modified-directly.md` | Accepted | 2 |

---

## Seção 3 — DOMÍNIOS (Tier 3)

### 3.1 — Career OS / Candidato

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| DOM-001 | Master Profile (SSoT) | `candidate-os/knowledge/01_profile/master_profile.md` | current | 3 |
| DOM-002 | Elevator Pitch | `candidate-os/knowledge/01_profile/elevator_pitch.md` | current | 3 |
| DOM-003 | Positioning | `candidate-os/knowledge/01_profile/positioning.md` | current | 3 |
| DOM-004 | HR FAQ | `candidate-os/knowledge/02_hr/faq_rh.md` | current | 4 |
| DOM-005 | Behavioral Profile | `candidate-os/knowledge/03_behavior/perfil_comportamental.md` | current | 3 |
| DOM-006 | Experience Timeline | `candidate-os/knowledge/04_experience/timeline.md` | current | 3 |
| DOM-007 | VRAXIA/VRASHOWS Experience | `candidate-os/knowledge/04_experience/vraxia_vrashows.md` | current | 3 |
| DOM-008 | Elite Tecnologia | `candidate-os/knowledge/04_experience/elite_tecnologia.md` | current | 3 |
| DOM-009 | InfinityCorp | `candidate-os/knowledge/04_experience/infinitycorp.md` | current | 3 |
| DOM-010 | NSTech | `candidate-os/knowledge/04_experience/nstech.md` | current | 3 |
| DOM-011 | Freelance | `candidate-os/knowledge/04_experience/freela.md` | current | 3 |
| DOM-012 | Experiência Pré-2022 | `candidate-os/knowledge/04_experience/pre_2022.md` | current | 3 |

### 3.2 — Projetos

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| DOM-020 | VRAXIA Platform | `candidate-os/knowledge/05_projects/vraxia_platform.md` | current | 3 |
| DOM-021 | VRASHOWS | `candidate-os/knowledge/05_projects/vrashows.md` | current | 3 |
| DOM-022 | Human RAG Framework | `candidate-os/knowledge/05_projects/human_rag_framework.md` | current | 3 |
| DOM-023 | VRAXIA Work | `candidate-os/knowledge/05_projects/vraxia_work.md` | current | 3 |

### 3.3 — Técnico: Backend, Database, Cloud, Infra

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| REF-001 | API Design | `candidate-os/knowledge/07_backend/api_design.md` | current | 3 |
| REF-002 | Backend Expertise | `candidate-os/knowledge/07_backend/backend_expertise.md` | current | 3 |
| REF-003 | PostgreSQL + pgvector | `candidate-os/knowledge/09_database/postgresql_pgvector.md` | current | 3 |
| REF-004 | Redis | `candidate-os/knowledge/09_database/redis.md` | current | 3 |
| REF-005 | Cloud Expertise | `candidate-os/knowledge/11_cloud/cloud_expertise.md` | current | 3 |
| REF-006 | Azure | `candidate-os/knowledge/12_azure/azure.md` | current | 3 |
| REF-007 | Docker | `candidate-os/knowledge/14_docker/docker.md` | current | 3 |

### 3.4 — System Design

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| REF-010 | API Enterprise | `candidate-os/knowledge/21_system_design/api_enterprise.md` | current | 3 |
| REF-011 | Plataforma SaaS | `candidate-os/knowledge/21_system_design/plataforma_saas.md` | current | 3 |
| REF-012 | Sistema IA Multi-Agente | `candidate-os/knowledge/21_system_design/sistema_ia_multiagente.md` | current | 3 |

---

## Seção 4 — GUIAS E RUNBOOKS (Tier 4)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| GDE-001 | Observabilidade | `candidate-os/knowledge/23_observability/observabilidade.md` | current | 4 |
| GDE-002 | Incidentes e Cenários | `candidate-os/knowledge/24_incidents/cenarios.md` | current | 4 |
| GDE-003 | Perguntas Comportamentais | `candidate-os/knowledge/33_interview/perguntas_comportamentais.md` | current | 4 |
| GDE-004 | Perguntas Técnicas | `candidate-os/knowledge/33_interview/perguntas_tecnicas.md` | current | 4 |
| GDE-005 | System Design Questions | `candidate-os/knowledge/33_interview/system_design_questions.md` | current | 4 |
| GDE-006 | STAR Library | `candidate-os/knowledge/34_star/star_library.md` | current | 4 |
| GDE-007 | Truth Engine Spec | `packages/work/docs/TruthEngine.md` | current | 3 |
| GDE-008 | Architecture (packages/work) | `packages/work/docs/Architecture.md` | current | 3 |
| GDE-009 | Runbook (packages/work) | `packages/work/docs/Runbook.md` | current | 4 |
| GDE-010 | Observability (packages/work) | `packages/work/docs/Observability.md` | current | 4 |

---

## Seção 5 — REFERÊNCIAS (Tier 3)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| REF-020 | ATS Keywords | `candidate-os/knowledge/27_keywords/ats_keywords.md` | current | 3 |
| REF-021 | Glossário Técnico | `candidate-os/knowledge/28_glossary/glossario_tecnico.md` | current | 3 |
| REF-022 | Soft Skills | `candidate-os/knowledge/40_soft_skills/soft_skills.md` | current | 3 |
| REF-023 | Pretensão Salarial | `candidate-os/knowledge/31_salary/pretensao.md` | current | 3 |

---

## Seção 6 — DOCUMENTAÇÃO OPERACIONAL (Tier 3-4)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| OPS-001 | System Guardrails | `docs/SYSTEM_GUARDRAILS.md` | current | 3 |
| OPS-002 | Failsafe Systems | `docs/FAILSAFE_SYSTEMS.md` | current | 3 |
| OPS-003 | Disaster Recovery | `docs/DISASTER_RECOVERY.md` | current | 4 |
| OPS-004 | Production Roadmap | `docs/PRODUCTION_ROADMAP.md` | current | 3 |
| OPS-005 | Scaling Strategy | `docs/SCALING_STRATEGY.md` | current | 3 |
| OPS-006 | Outbound Metrics | `docs/OUTBOUND_METRICS.md` | current | 4 |
| OPS-007 | Current Limitations | `docs/CURRENT_LIMITATIONS.md` | current | 4 |
| OPS-008 | Cost Governance | `docs/COST_GOVERNANCE.md` | current | 3 |
| OPS-009 | Memory Flow | `docs/architecture/memory-flow.md` | current | 3 |
| OPS-010 | Queue Flow | `docs/architecture/queue-flow.md` | current | 3 |
| OPS-011 | Delivery Flow | `docs/architecture/delivery-flow.md` | current | 3 |

---

## Seção 7 — PROMPTS DE AGENTES (Tier 3)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| PRM-001 | Coder Agent | `prompts/agents/coder.md` | current | 3 |
| PRM-002 | Coordinator | `prompts/agents/coordinator.md` | ⚠️ CONFLICT | 3 |
| PRM-003 | Coordinator (cópia maior) | `prompts/agents/coordinator copy.md` | ⚠️ CONFLICT | 6 |
| PRM-004 | Evaluator | `prompts/agents/evaluator.md` | current | 3 |
| PRM-005 | Memory Manager | `prompts/agents/memory-manager.md` | current | 3 |
| PRM-006 | Researcher | `prompts/agents/researcher.md` | current | 3 |
| PRM-007 | Vault | `prompts/agents/vault.md` | current | 3 |
| PRM-008 | Lead Scorer | `prompts/agents/lead-scorer.md` | current | 3 |
| PRM-009 | FutureCom Researcher | `prompts/agents/futurecom-researcher.md` | current | 3 |
| PRM-010 | Lead Enrichment | `prompts/agents/lead-enrichment-agent.md` | current | 3 |
| PRM-011 | Outreach Agent | `prompts/agents/outreach-agent.md` | current | 3 |
| PRM-012 | Lead Classifier | `prompts/agents/lead-classifier.md` | current | 3 |
| PRM-013 | Email Sender | `prompts/agents/email-sender-agent.md` | ⚠️ CONFLICT | 3 |
| PRM-014 | Email Sender (cópia maior) | `prompts/agents/email-sender-agent copy.md` | ⚠️ CONFLICT | 6 |

---

## Seção 8 — OBSIDIAN VAULT (Tier 3-5)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| OBS-001 | Agent Patterns | `obsidian-vault/architecture/agent-patterns.md` | current | 3 |
| OBS-002 | System Architecture | `obsidian-vault/architecture/system.md` | current | 3 |
| OBS-003 | API Design Skills | `obsidian-vault/skills/api-design.md` | current | 5 |

---

## Seção 9 — GOVERNANÇA RAG (Este sistema)

| ID | Título | Arquivo | Status | Tier |
|----|--------|---------|--------|------|
| GOV-001 | Constitution | `rag/00-CONSTITUTION/VRAXIA-CONSTITUTION.md` | RATIFIED | 0 |
| GOV-002 | Core Principles | `rag/00-CONSTITUTION/CORE-PRINCIPLES.md` | RATIFIED | 0 |
| GOV-003 | Knowledge Tiers | `rag/00-CONSTITUTION/KNOWLEDGE-TIERS.md` | RATIFIED | 0 |
| GOV-004 | Agent Retrieval Rules | `rag/00-CONSTITUTION/AGENT-RETRIEVAL-RULES.md` | RATIFIED | 0 |
| GOV-005 | Taxonomy | `rag/TAXONOMY.md` | current | 1 |
| GOV-006 | Master Index | `rag/MASTER-INDEX.md` | current | 1 |
| GOV-007 | Knowledge Catalog | `rag/KNOWLEDGE-CATALOG.md` | current | 1 |
| GOV-008 | Document Relationships | `rag/DOCUMENT-RELATIONSHIPS.md` | current | 1 |
| GOV-009 | Conflicts Report | `rag/REVIEW/CONFLICTS-REPORT.md` | OPEN | 6 |
| GOV-010 | RAG Architecture Report | `rag/RAG-ARCHITECTURE-REPORT.md` | current | 1 |

---

## Estatísticas do Índice

| Categoria | Total | Com Conteúdo | Vazios/Pendentes |
|-----------|-------|-------------|------------------|
| Constituição (Tier 0) | 4 | 4 | 0 |
| Especificações Oficiais (Tier 1) | 10 | 10 | 0 |
| ADRs (Tier 2) | 8 | 8 | 1 (conflito número) |
| Domínios Career/Candidato | 23 | 23 | 0 |
| Guias e Runbooks | 10 | 10 | 0 |
| Referências | 6 | 6 | 0 |
| Operacional | 11 | 11 | 0 |
| Prompts de Agentes | 14 | 14 | 2 (conflito) |
| Obsidian | 3 | 3 | 0 |
| Governança RAG | 10 | 10 | 0 |
| **TOTAL** | **99** | **99** | **3 em conflito** |

### CKOS: 16 pastas vazias — Gap de Cobertura

| Pasta Vazia | Impacto | Prioridade de Preenchimento |
|-------------|---------|----------------------------|
| 08_frontend | Médio — Perguntas sobre React/Vue sem resposta | Alta |
| 10_devops | Médio — CI/CD sem documentação | Alta |
| 13_aws | Baixo — Azure é o foco | Baixa |
| 15_kubernetes | Baixo — Docker Swarm foco | Baixa |
| 22_sre | Médio — Incidentes cobertos em 24 | Média |
| 25_problem_solving | Alta — Demonstra raciocínio | Alta |
| 26_real_cases | Alta — Diferencial competitivo | Alta |
| 29_certifications | Média — Gap em CV | Média |
| 30_education | Média — Graduação TI USP/Univesp 2025 não documentada | Alta |
| 32_company_research | Alta — Entrevistas sem pesquisa de empresa | Alta |
| 35_mock_interviews | Alta — Preparação de entrevista | Alta |
| 36_live_coding | Alta — Coding challenges | Alta |
| 37_debugging | Média | Média |
| 38_design_patterns | Alta — Perguntas frequentes em entrevista | Alta |
| 39_clean_architecture | Média | Média |
| 40_soft_skills | ✅ Preenchido | — |

---

*Gerado pelo Knowledge Architect VRAXIA — 2026-07-16*
*Próxima atualização obrigatória ao criar/remover qualquer documento*
