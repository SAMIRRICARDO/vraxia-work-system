---
title: VRAXIA Knowledge Catalog — Catálogo Completo com Metadados
tier: 1
status: current
version: "1.0"
created: 2026-07-16
updated: 2026-07-16
tags:
  - catalog
  - tier-1
  - metadata
  - knowledge-architecture
---

# VRAXIA Knowledge Catalog
## Catálogo de Conhecimento — Metadados e Classificação Completa

> O catálogo registra não apenas ONDE está cada documento,
> mas O QUE ele contém, QUÃO RECUPERÁVEL ele é e QUAL SEU VALOR.

---

## Catálogo: Constituição (Tier 0)

### CON-001 — VRAXIA Constitution
```
Arquivo:        rag/00-CONSTITUTION/VRAXIA-CONSTITUTION.md
Tier:           0 (Imutável)
Status:         RATIFIED
Tamanho:        ~120 linhas
Criticidade:    CRÍTICA — Lei máxima do sistema
Recuperável:    SIM — tags: constitution, governance, supreme-law
Queries típicas: "lei do vraxia", "autoridade máxima", "constituição"
Última revisão: 2026-07-16
Depende de:     Nenhum
Referenciado por: TODOS os documentos Tier 1-6
```

### CON-002 — Core Principles
```
Arquivo:        rag/00-CONSTITUTION/CORE-PRINCIPLES.md
Tier:           0 (Imutável)
Status:         RATIFIED
Tamanho:        ~100 linhas
Criticidade:    CRÍTICA — Princípios filosóficos do sistema
Recuperável:    SIM — tags: principles, tool-first, memory-first, secure-by-default
Queries típicas: "princípios vraxia", "tool first", "memory first", "cost aware"
Última revisão: 2026-07-16
```

---

## Catálogo: Especificações Oficiais (Tier 1)

### SPEC-001 — VRAXIA Guardian Security Framework
```
Arquivo:        candidate-os/knowledge/20_security/001-vraxia-guardian.md
Arquivo docs:   docs/architecture/security/001-vraxia-guardian.md
Tier:           1 (Ratificado)
Status:         RATIFIED v1.0
Tamanho:        498 linhas (arquivo RAG)
Criticidade:    CRÍTICA — Framework de segurança oficial
Chunks RAG:     35 chunks
Tags TF-IDF:    22 tags (guardian, security, execution-firewall, etc.)
Score mínimo:   0.20 (validado em 9/9 queries)
Queries típicas: "segurança guardian", "firewall execução", "prompt injection",
                 "least privilege", "rollback", "policy engine", "zero trust",
                 "comandos proibidos", "aprovação humana", "execution manifest"
Última revisão: 2026-07-16
Validação:      9/9 queries PASSED
```

### SPEC-005 — RAG Architecture
```
Arquivo:        candidate-os/knowledge/17_rag/rag_architecture.md
Tier:           1 (Especificação técnica)
Status:         current
Tamanho:        473 linhas
Criticidade:    ALTA — Define como o RAG funciona
Chunks RAG:     ~20 chunks
Tags TF-IDF:    rag, retrieval, tfidf, embeddings, knowledge-base
Queries típicas: "arquitetura rag", "como o retrieval funciona", "tfidf",
                 "camadas de recuperação", "embeddings"
Última revisão: A verificar
```

### SPEC-004 — AI Runtime Enterprise Manual
```
Arquivo:        docs/AI_RUNTIME_ENTERPRISE_MANUAL.md
Tier:           1 (Documentação enterprise)
Status:         current
Tamanho:        2.621 linhas (maior documento do projeto)
Criticidade:    ALTA — Visão completa da plataforma
Chunks RAG:     Não carregado automaticamente no CKOS
Queries típicas: "manual enterprise", "visão geral vraxia", "plataforma completa"
Nota:           Não está no CKOS path — considerar adicionar ou criar chunk summary
```

---

## Catálogo: ADRs (Tier 2)

### ADR-SEC-001 a ADR-SEC-004 — Security ADRs
```
Arquivos:       docs/architecture/security/ADR-00*.md
Tier:           2 (Decisões aceitas)
Status:         Accepted
Total:          4 ADRs
Tamanho:        ~22 linhas cada
Criticidade:    ALTA — Decisões arquiteturais de segurança
Chunks RAG:     Não carregados no CKOS automaticamente
Queries típicas: "por que llm não executa", "por que guardian",
                 "por que manifest obrigatório"
```

### ADR-003a vs ADR-003b — CONFLITO
```
Arquivo A:      docs/ADR-003-state-machine.md
Arquivo B:      docs/ADR-003-decision-engine-calibration.md
Tier:           2 (Conflito)
Status:         ⚠️ CONFLITO — Numeração duplicada
Ação requerida: Renumerar ADR-003b → ADR-004 (ou usar prefixo de domínio)
Ver:            CONFLICTS-REPORT.md
```

---

## Catálogo: Domínio do Candidato (Tier 3)

### DOM-001 — Master Profile (SSoT PRINCIPAL)
```
Arquivo:        candidate-os/knowledge/01_profile/master_profile.md
Tier:           3 (Domínio central)
Status:         current
Tamanho:        333 linhas
Criticidade:    MÁXIMA — SSoT da identidade do candidato
Chunks RAG:     ~15 chunks
Tags TF-IDF:    profile, master, identity, positioning, ckos, 01_profile
Queries típicas: "quem é o candidato", "perfil principal", "identidade",
                 "competências principais", "resumo profissional"
Score esperado: ALTO (documento mais fundamental)
Depende de:     candidate-profile.json (SSoT técnico)
Referenciado por: Todos os documentos de experiência e projetos
```

### DOM-006 — Experience Timeline
```
Arquivo:        candidate-os/knowledge/04_experience/timeline.md
Tier:           3
Status:         current
Criticidade:    ALTA — Trajetória cronológica completa
Queries típicas: "trajetória profissional", "experiência total", "anos de experiência",
                 "histórico de empresas"
```

### DOM-020 — VRAXIA Platform
```
Arquivo:        candidate-os/knowledge/05_projects/vraxia_platform.md
Tier:           3
Status:         current
Tamanho:        392 linhas (maior arquivo de projetos)
Criticidade:    ALTA — Projeto principal do portfólio
Queries típicas: "vraxia platform", "projeto principal", "saas multiagente",
                 "byok", "tenant"
```

---

## Catálogo: Entrevistas e Preparação (Tier 4)

### GDE-005 — System Design Questions
```
Arquivo:        candidate-os/knowledge/33_interview/system_design_questions.md
Tier:           4
Status:         current
Tamanho:        656 linhas (maior arquivo de entrevistas)
Criticidade:    ALTA — Preparação para entrevistas técnicas
Chunks RAG:     ~30 chunks
Queries típicas: "system design", "design de sistemas", "escalabilidade",
                 "arquitetura de microsserviços", "design de api"
```

### GDE-003 — Perguntas Comportamentais
```
Arquivo:        candidate-os/knowledge/33_interview/perguntas_comportamentais.md
Tier:           4
Status:         current
Tamanho:        460 linhas
Criticidade:    ALTA — STAR stories para entrevistas
Queries típicas: "me fale sobre", "situação difícil", "liderança", "trabalho em equipe"
```

---

## Catálogo: Referências Técnicas (Tier 3)

### REF-001 — API Design
```
Arquivo:        candidate-os/knowledge/07_backend/api_design.md
Tier:           3
Status:         current
Tamanho:        446 linhas
Queries típicas: "api rest", "api design", "graphql", "padrões de api"
```

### REF-003 — PostgreSQL + pgvector
```
Arquivo:        candidate-os/knowledge/09_database/postgresql_pgvector.md
Tier:           3
Status:         current
Queries típicas: "postgres", "pgvector", "banco de dados vetorial", "embeddings sql"
```

---

## Catálogo: Prompts de Agentes (Tier 3)

### PRM-001 — Coder Agent
```
Arquivo:        prompts/agents/coder.md
Tier:           3
Status:         current
Carregado em:   agents/coder/ ao iniciar
```

### PRM-002/003 — Coordinator (CONFLITO)
```
Arquivo A:      prompts/agents/coordinator.md (2.142 bytes)
Arquivo B:      prompts/agents/coordinator copy.md (6.511 bytes)
Tier:           A=3 (ativo?), B=6 (cópia)
Status:         ⚠️ CONFLITO — Versão ativa desconhecida
Ver:            CONFLICTS-REPORT.md CONFLITO-001
```

---

## Catálogo: CKOS — Gaps de Cobertura

Pastas sem conteúdo que reduzem a qualidade das respostas:

| Pasta | Impacto em Entrevista | Prioridade | Conteúdo Sugerido |
|-------|----------------------|-----------|-------------------|
| 08_frontend | "Tem experiência com React?" — sem resposta | Alta | React básico, experiência com dashboards |
| 10_devops | "Como você faz CI/CD?" — sem resposta | Alta | GitHub Actions, Railway.app, Vercel |
| 25_problem_solving | "Me dê um exemplo de problema que resolveu" — sem dados | Alta | Cases técnicos resolvidos |
| 26_real_cases | "Case de sucesso" — sem evidência | Alta | VRAXIA em produção, métricas reais |
| 30_education | Formação acadêmica não documentada | Alta | Graduação TI USP/Univesp 2025 |
| 32_company_research | Pesquisa de empresa não existe | Alta | Template de pesquisa pré-entrevista |
| 35_mock_interviews | Simulações de entrevista | Alta | Scripts de role-play |
| 36_live_coding | "Resolva este problema agora" — sem preparação | Alta | Padrões LeetCode, templates TypeScript |
| 38_design_patterns | "Explique o padrão Factory" — sem resposta | Alta | Gang of Four + casos de uso reais |
| 29_certifications | Gap em CV | Média | Certificações planejadas/cursando |
| 13_aws | Não é foco mas pode ser perguntado | Baixa | Comparativo Azure vs AWS |
| 15_kubernetes | Não é foco mas pode surgir | Baixa | Básico K8s vs Docker Swarm |

---

## Score de Saúde do Catálogo

| Dimensão | Score | Observação |
|----------|-------|-----------|
| Cobertura (conteúdo existente) | 60% | 16/40 pastas CKOS vazias |
| Recuperabilidade (TF-IDF funcional) | 95% | Guardian: 9/9 ✅ |
| Conflitos resolvidos | 60% | 3/5 conflitos abertos |
| Documentação de entrevista | 40% | Gaps em live coding, design patterns |
| Documentação de segurança | 95% | Guardian completo e validado |
| Governança RAG | 100% | Constitution + Taxonomy + Index criados |
| **Score Geral** | **75%** | **Bom. Target: 90%** |

---

*Gerado pelo Knowledge Architect VRAXIA — 2026-07-16*
*Próxima atualização: ao criar novos documentos ou preencher gaps*
