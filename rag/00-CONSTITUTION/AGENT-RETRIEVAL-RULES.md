---
title: VRAXIA Agent Retrieval Rules — Regras Obrigatórias de Recuperação
tier: 0
status: RATIFIED
version: "1.0"
authority: VRAXIA Core Team
created: 2026-07-16
immutable: true
tags:
  - constitution
  - tier-0
  - agent-rules
  - retrieval
  - governance
---

# VRAXIA Agent Retrieval Rules
## Regras Obrigatórias de Recuperação para Agentes

> **Esta é a regra mais importante da RAG:**
> "Antes de responder, implementar código ou propor uma alteração arquitetural,
> consulte primeiro os documentos de Tier 0 e Tier 1.
> Caso exista conflito entre documentos, prevalece sempre o de maior Tier."

---

## Regra 1 — Consulta Obrigatória Antes de Agir

Antes de qualquer ação, todo agente DEVE:

```
1. Consultar Tier 0 (CONSTITUIÇÃO)
   → Há algum princípio que afete esta ação?
   → Há alguma regra constitucional aplicável?

2. Consultar Tier 1 (ESPECIFICAÇÕES OFICIAIS)
   → Existe especificação oficial que defina como fazer isso?
   → O Guardian proíbe ou restringe alguma ação solicitada?

3. Consultar Tier 2 (ADRs)
   → Existe uma decisão de arquitetura relevante?
   → Esta ação contradiz algum ADR aceito?

4. Consultar Tier 3 (DOCUMENTAÇÃO TÉCNICA)
   → Como isso está implementado atualmente?
   → Quais são as interfaces e contratos disponíveis?

5. Então: Agir
```

---

## Regra 2 — Hierarquia de Recuperação TF-IDF

O sistema RAG executa em camadas. Agentes devem respeitar a ordem:

```
Camada 1: Hard Rules     → Regras não-negociáveis. Resposta imediata.
Camada 2: FAQ Cache      → Resposta já computada. Usar sem LLM.
Camada 3: Interview KB   → Respostas de entrevista pré-respondidas.
Camada 4: TF-IDF Local   → Corpus completo. Latência <10ms, custo $0.
Camada 5: LLM Fallback   → Apenas se camadas 1-4 não cobrirem.
```

**Agentes nunca pulam para LLM se o TF-IDF for suficiente.**

---

## Regra 3 — Conflito entre Documentos

Se dois documentos contradizem sobre o mesmo tema:

```
1. Identificar os Tiers de ambos os documentos
2. Aplicar a regra: menor Tier = maior autoridade
3. Reportar o conflito ao usuário
4. Usar o documento de menor Tier como referência
5. Sugerir que o documento de maior Tier seja atualizado ou movido para REVIEW
```

**Nunca resolver conflitos silenciosamente sem reportar.**

---

## Regra 4 — Proibições Absolutas (sem consulta necessária)

Independentemente de qualquer documento recuperado, agentes NUNCA:

```bash
# Banco de dados
DROP DATABASE, DROP TABLE, TRUNCATE, DELETE *, GRANT ALL, REVOKE ALL

# Sistema de arquivos
rm -rf, mkfs, shutdown, halt, reboot, poweroff

# Git
git push --force, git reset --hard, git clean -fd, git branch -D

# Execução privilegiada
sudo, su, curl | bash, wget | bash, chmod -R 777

# Produção direta
Modificar qualquer arquivo em ambiente de produção sem approval
```

Ver [[VRAXIA-GUARDIAN-SECURITY-FRAMEWORK]] para lista completa.

---

## Regra 5 — Contexto Mínimo Necessário

Agentes devem construir contexto com precisão cirúrgica:

```typescript
// ERRADO — contexto gigante desnecessário
const context = await loadAllDocs();

// CORRETO — recuperar apenas o necessário
const chunks = await retriever.retrieve(query, topK=4);
const context = buildContext(chunks);
```

- `topK=4` é o padrão. Aumentar apenas quando necessário.
- Comprimir contexto histórico após 10 turns
- Nunca incluir documentos Tier 5-6 no contexto de decisão

---

## Regra 6 — Rastreabilidade

Todo resultado de retrieval deve incluir `DecisionTrace`:

```typescript
interface DecisionTrace {
  layer: DecisionLayer;      // qual camada respondeu
  intent: QuestionIntent;    // classificação da pergunta
  factKey?: string;          // qual fact do profile
  trigger?: string;          // qual trigger ativou
  confidence?: number;       // 0-100%
  latencyMs: number;         // tempo de resposta
  cacheHit?: boolean;        // foi cache?
  tier?: number;             // tier do documento fonte
  sourceDoc?: string;        // documento que respondeu
}
```

---

## Regra 7 — Perguntas Binárias

Perguntas binárias (possui/não possui, tem/não tem) NUNCA são cacheadas.
Sempre consultam o SSoT (`candidate-profile.json`).

```typescript
// Exemplos de perguntas binárias:
"tem experiência com RAG?"     → consulta profile.facts
"possui produção em Postgres?" → consulta profile.skills
"tem disponibilidade?"         → consulta profile.availability
```

---

## Regra 8 — Seleção de Modelo

Agentes aplicam a regra de custo mínimo:

```
Pergunta de classificação simples  → Haiku
Pergunta de retrieval aumentado    → Haiku com contexto RAG
Pergunta de codificação/análise    → Sonnet
Decisão arquitetural crítica       → Opus
Planejamento estratégico           → Opus
```

---

*Parte integrante da [[VRAXIA-CONSTITUTION]] — Tier 0 — Imutável*
*Versão 1.0 — Ratificada em 2026-07-16*
