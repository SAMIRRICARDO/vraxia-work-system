---
title: VRAXIA Constitution — Lei Suprema da Base de Conhecimento
tier: 0
status: RATIFIED
version: "1.0"
authority: VRAXIA Core Team
created: 2026-07-16
immutable: true
tags:
  - constitution
  - tier-0
  - governance
  - supreme-law
  - single-source-of-truth
---

# VRAXIA CONSTITUTION
## Lei Suprema da Base de Conhecimento

> **Esta é a autoridade máxima do sistema de conhecimento VRAXIA.**
> Todo agente, executor, LLM ou operador está subordinado a esta constituição.
> Em caso de conflito entre documentos, prevalece sempre o de maior Tier.

---

## Artigo I — Hierarquia de Autoridade

```
TIER 0 — CONSTITUIÇÃO
  └── Esta Constituição é a lei máxima.
      Nenhum agente pode ignorá-la ou contorná-la.

TIER 1 — ESPECIFICAÇÕES OFICIAIS
  └── Especificações de arquitetura ratificadas.
      Definem o comportamento obrigatório do sistema.

TIER 2 — ADR (Architecture Decision Records)
  └── Decisões arquiteturais registradas e aprovadas.
      Imutáveis após ratificação.

TIER 3 — DOCUMENTAÇÃO TÉCNICA
  └── Documentação de implementação e referência.
      Atualizada conforme o sistema evolui.

TIER 4 — GUIAS E RUNBOOKS
  └── Guias operacionais e de uso.
      Orientativos, não prescritivos.

TIER 5 — EXEMPLOS E DEMONSTRAÇÕES
  └── Exemplos de código, demos, provas de conceito.
      Não autoritativos.

TIER 6 — NOTAS TEMPORÁRIAS
  └── Rascunhos, notas, trabalho em progresso.
      Validade limitada. Nunca usar como referência.
```

**Regra Constitucional de Conflito:**
> Se dois documentos divergem, o de menor número de Tier (mais alto na hierarquia) prevalece.
> Tier 0 prevalece sobre Tier 1. Tier 1 prevalece sobre Tier 2. E assim por diante.

---

## Artigo II — Princípios Invioláveis

**II.1 — Fonte Única da Verdade (Single Source of Truth)**
Para cada conceito, domínio ou entidade do sistema, existe exatamente **um** documento canônico.
Todos os outros documentos que mencionam o mesmo conceito são referências, nunca cópias autoritativas.

**II.2 — Zero Duplicação**
Duplicar conteúdo é proibido. Quando dois documentos cobrem o mesmo tema, um deve referenciar o outro,
ou ambos devem ser consolidados em um único documento canônico.

**II.3 — Alta Recuperabilidade**
Todo documento deve ser recuperável via TF-IDF com pelo menos uma query óbvia.
Documentos irrecuperáveis são inúteis e devem ser reindexados ou removidos.

**II.4 — Alta Coesão**
Cada documento cobre um único tema ou domínio com clareza.
Documentos que cobrem múltiplos temas não relacionados devem ser divididos.

**II.5 — Baixo Acoplamento**
Documentos referenciam outros por identificador (`[[doc-name]]`), nunca por cópia de conteúdo.

**II.6 — Modularidade**
O conhecimento é organizado em módulos independentes. Cada módulo pode evoluir sem afetar outros.

**II.7 — Escalabilidade**
A estrutura suporta crescimento ilimitado de documentos sem perda de recuperabilidade ou coesão.

---

## Artigo III — Regras Obrigatórias para Agentes

Todo agente VRAXIA DEVE:

**III.1** — Consultar documentos Tier 0 e Tier 1 ANTES de responder, implementar código ou propor alteração arquitetural.

**III.2** — Em caso de conflito entre documentos, reportar o conflito ao usuário antes de prosseguir.

**III.3** — Nunca contradizer um ADR (Tier 2) sem criar um novo ADR que o substitua explicitamente.

**III.4** — Nunca implementar algo que contradiga uma Especificação Oficial (Tier 1).

**III.5** — Nunca modificar produção diretamente. Ver: [[ADR-004-production-never-modified-directly]].

**III.6** — Nunca executar comandos proibidos. Ver: [[VRAXIA-GUARDIAN-SECURITY-FRAMEWORK]].

**III.7** — Registrar todo Execution Manifest antes de qualquer ação. Ver: [[ADR-003-all-executions-must-generate-manifest]].

---

## Artigo IV — Governança da Base de Conhecimento

**IV.1 — Quem pode ratificar Tier 0 e Tier 1**
Apenas o VRAXIA Core Team pode ratificar ou revogar documentos Tier 0 e Tier 1.
Agentes podem propor, nunca ratificar.

**IV.2 — Processo de criação de ADR (Tier 2)**
Todo ADR deve conter: Decisão, Justificativa, Consequências, Status (Proposed/Accepted/Deprecated).

**IV.3 — Área de Revisão**
Documentos conflitantes são movidos para `rag/REVIEW/` e jamais deletados.
O Knowledge Architect analisa e resolve conflitos.

**IV.4 — Versionamento**
Todo documento deve declarar `version` em seu frontmatter.
Quando atualizado, a versão deve ser incrementada e a data de atualização registrada.

**IV.5 — Validação periódica**
A cada 30 dias (ou após mudança estrutural), o Knowledge Architect deve:
1. Validar que todos os documentos são recuperáveis
2. Detectar novos conflitos
3. Atualizar o MASTER-INDEX
4. Reportar gaps de cobertura

---

## Artigo V — Taxonomia Oficial

Ver documento completo: [[TAXONOMY]]

As categorias oficiais do sistema de conhecimento são:

| Código | Categoria | Tier Primário |
|--------|-----------|---------------|
| CONST | Constitution & Core Principles | 0 |
| SPEC | Official Specifications | 1 |
| ADR | Architecture Decision Records | 2 |
| DOMAIN | Domain Documentation | 3 |
| API | API Reference | 3 |
| DB | Database Schemas | 3 |
| FE | Frontend | 3 |
| BE | Backend | 3 |
| INFRA | Infrastructure | 3 |
| SEC | Security | 1-2 |
| DEPLOY | Deployment | 3 |
| TEST | Testing | 3-4 |
| OPS | Operations | 4 |
| BIZ | Business | 3 |
| PROD | Product | 3 |
| ARCH | Archive | 5-6 |

---

## Artigo VI — Proteção Constitucional

Esta constituição não pode ser alterada por:
- Nenhum LLM ou agente autônomo
- Nenhum executor sem aprovação explícita
- Nenhum script automatizado

Alterações requerem decisão explícita do VRAXIA Core Team e devem ser documentadas em um ADR específico sobre a alteração constitucional.

---

*Ratificada pelo VRAXIA Core Team — 2026-07-16*
*Versão 1.0 — Status: RATIFIED — Tier: 0 — Imutável*
