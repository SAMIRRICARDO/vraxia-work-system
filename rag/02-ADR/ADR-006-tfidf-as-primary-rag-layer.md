---
title: "ADR-006: TF-IDF como Camada Primária de RAG"
tier: 2
status: Accepted
created: 2026-07-16
tags:
  - adr
  - tier-2
  - rag
  - tfidf
  - cost-optimization
---

# ADR-006: TF-IDF como Camada Primária de RAG

## Status
Accepted

## Contexto

O sistema precisa recuperar conhecimento relevante para responder perguntas.
Opções avaliadas:
1. **TF-IDF local** — sem custo, <10ms, sem dependências externas
2. **pgvector + embeddings** — custo por embedding, melhor semântica
3. **OpenAI Retrieval** — custo alto, latência de rede
4. **LLM direto** — custo mais alto, latência >500ms

## Decisão

TF-IDF local (`VaultRetriever`) é a camada primária de RAG.
pgvector com embeddings é o Tier 2 planejado para queries semânticas complexas.
LLM é sempre o último recurso.

## Justificativa

- Custo zero por query (vital para volume de entrevistas)
- Latência <10ms (experiência de usuário em tempo real)
- Sem dependências externas (funciona offline)
- Precisão suficiente: tag boost (+0.5) compensa limitação léxica
- Validado: Guardian recuperado em 9/9 queries

## Consequências

- `VaultRetriever` é o engine padrão
- `topK=4` é o padrão — aumentar apenas quando necessário
- Tags no frontmatter YAML contribuem com +0.5 de score (usar para docs críticos)
- Perguntas ambíguas ainda caem para LLM (~30% das queries)
- pgvector será implementado como Tier 2 para queries semânticas complexas
