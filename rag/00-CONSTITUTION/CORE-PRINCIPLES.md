---
title: VRAXIA Core Principles — Princípios Fundamentais Imutáveis
tier: 0
status: RATIFIED
version: "1.0"
authority: VRAXIA Core Team
created: 2026-07-16
immutable: true
tags:
  - constitution
  - tier-0
  - principles
  - governance
---

# VRAXIA Core Principles
## Princípios Fundamentais — Imutáveis

> Estes princípios definem a identidade técnica e filosófica do VRAXIA.
> São invioláveis. Qualquer decisão técnica deve ser validada contra eles.

---

## Princípio 1 — Tool-First Execution

A execução deve sempre priorizar, nesta ordem:

```
1. Cache         → Resposta já computada? Use.
2. Retrieval     → Está na base de conhecimento? Recupere.
3. Database      → Dado estruturado? Consulte.
4. Tools         → Ferramenta específica disponível? Execute.
5. APIs          → Serviço externo? Chame.
6. Reasoning     → Nenhum dos anteriores? Razocine.
```

**Reasoning é o último recurso, nunca o primeiro.**

---

## Princípio 2 — Memory-First Agents

Todo agente VRAXIA deve:

- Recuperar memória semântica ANTES de raciocinar
- Evitar contextos gigantes — comprimir histórico
- Reutilizar conhecimento computado anteriormente
- Operar com memória episódica (lembrar sesões anteriores)
- Nunca duplicar computação que já foi cacheada

---

## Princípio 3 — Secure by Default

Todo componente nasce com máxima restrição. Permissões são concedidas explicitamente.

- LLMs nunca executam diretamente
- Todo comando é um Plano de Execução
- Nenhum executor possui privilégios administrativos
- Toda ação é auditável
- Produção nunca é alterada diretamente

Ver [[VRAXIA-GUARDIAN-SECURITY-FRAMEWORK]] para especificação completa.

---

## Princípio 4 — Cost-Aware Intelligence

O custo é uma dimensão de qualidade, não um detalhe.

```
Haiku   → Tarefas leves, classificação, triagem
Sonnet  → Orquestração, codificação, análise
Opus    → Planejamento, reflexão, decisões críticas
```

- Nunca usar modelo mais caro quando um mais barato resolve
- Cache é gratuito — use sempre
- TF-IDF local é gratuito — prefira sobre embeddings pagos quando suficiente
- Medir e reportar custo por operação

---

## Princípio 5 — Pluggable by Design

Nenhum componente é acoplado a uma implementação específica.

- Executores são plugáveis (Claude Code, Codex, Gemini, custom)
- Modelos são configuráveis via `config/models.ts`
- Storage é abstraído (Redis, pgvector, file system)
- RAG é multicamada (Hard Rules → FAQ → TF-IDF → pgvector → LLM)

---

## Princípio 6 — Observable Everything

Todo agente, executor e componente deve expor:

- Token usage (input + output + cache)
- Latência por operação
- Custo estimado
- Métricas de retrieval (layer hit rate, score distribuição)
- Tool calls (contagem, erros)
- Workflow tracing (ID de execução)

**Execuções invisíveis são execuções não confiáveis.**

---

## Princípio 7 — Single Source of Truth

Para cada conceito, existe exatamente um documento canônico.

- O candidato tem um único perfil: `candidate-profile.json`
- A arquitetura de segurança tem uma única especificação: [[VRAXIA-GUARDIAN-SECURITY-FRAMEWORK]]
- A RAG tem uma única especificação de implementação: [[RAG-ARCHITECTURE]]
- Este índice tem uma única fonte: [[MASTER-INDEX]]

---

## Princípio 8 — Cognitive OS Philosophy

O VRAXIA é uma plataforma de runtime cognitivo, não apenas um chatbot.

Funciona como:
- **Sistema Operacional Semântico** — processa conhecimento como um OS processa processos
- **Runtime de Agentes** — executa agentes como um OS executa programas
- **Memória Distribuída** — organiza conhecimento em camadas (L1 cache, L2 Redis, L3 pgvector)
- **Governança Técnica** — a RAG funciona como constituição, não apenas como repositório

---

*Parte integrante da [[VRAXIA-CONSTITUTION]] — Tier 0 — Imutável*
*Versão 1.0 — Ratificada em 2026-07-16*
