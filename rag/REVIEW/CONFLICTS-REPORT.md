---
title: VRAXIA RAG Conflicts Report — Relatório de Conflitos Detectados
tier: 6
status: OPEN
version: "1.0"
created: 2026-07-16
updated: 2026-07-16
tags:
  - review
  - conflicts
  - governance
  - knowledge-architecture
---

# VRAXIA RAG Conflicts Report
## Conflitos e Duplicatas Detectadas — Aguardando Resolução

> **Regra:** Documentos em REVIEW nunca são deletados automaticamente.
> O Knowledge Architect analisa cada conflito e propõe resolução.
> Usuário deve aprovar ações que envolvem remoção ou merge.

---

## Resumo Executivo

| Tipo | Quantidade | Status |
|------|-----------|--------|
| Duplicatas de nome | 2 | OPEN |
| Conteúdo duplicado (dois locais) | 1 | RESOLVED (by design) |
| Bug de nomenclatura | 1 | OPEN |
| ADR numeração duplicada | 1 | OPEN |
| **Total** | **5** | — |

---

## CONFLITO-001: coordinator copy.md vs coordinator.md

**Status:** OPEN — Aguarda decisão do usuário

**Localização:**
- Original: `prompts/agents/coordinator.md` (2.142 bytes, ~47 linhas)
- Cópia: `prompts/agents/coordinator copy.md` (6.511 bytes, ~144 linhas)

**Análise:**
A versão "copy" é 3x maior que o original. Isso indica que a cópia é uma **evolução não integrada** — o arquivo foi modificado separadamente mas nunca renomeado para substituir o original. O sistema usa qual versão? Isso precisa ser verificado no código.

**Risco:**
- Se o sistema carrega `coordinator.md`, está usando versão incompleta
- Se carrega `coordinator copy.md`, o nome quebra convenções

**Resolução Proposta:**
```
1. Verificar qual arquivo é referenciado no código (grep "coordinator" em agents/)
2. Se "coordinator copy.md" é a versão atual:
   → Renomear para coordinator.md
   → Mover original antigo para rag/15-ARCHIVE/
3. Se "coordinator.md" é o atual:
   → Mover "coordinator copy.md" para rag/15-ARCHIVE/
4. Nunca ter dois arquivos com mesmo propósito
```

**Ação necessária:** Verificar código + aprovação do usuário para merge/remoção

---

## CONFLITO-002: email-sender-agent copy.md vs email-sender-agent.md

**Status:** OPEN — Aguarda decisão do usuário

**Localização:**
- Original: `prompts/agents/email-sender-agent.md`
- Cópia: `prompts/agents/email-sender-agent copy.md` (maior — diferença de tamanho)

**Análise:**
Mesmo padrão do CONFLITO-001. Versão "copy" é evolutiva e não foi integrada.

**Risco:**
- Prompt desatualizado pode causar comportamento incorreto do agente
- Dois prompts para o mesmo agente violam Single Source of Truth

**Resolução Proposta:**
```
1. Ler ambos os arquivos e comparar
2. Determinar qual é a versão mais completa e correta
3. Consolidar em um único email-sender-agent.md
4. Arquivar a versão descartada em rag/15-ARCHIVE/
```

---

## CONFLITO-003: VRAXIA_EXECUTIVE_CONTEXT.md.md — Bug de Nomenclatura

**Status:** OPEN — Bug, não conflito

**Localização:** `docs/VRAXIA_EXECUTIVE_CONTEXT.md.md`

**Análise:**
Dupla extensão `.md.md` é claramente um bug de export ou renomeação. O arquivo provavelmente foi exportado de alguma ferramenta com extensão já no nome, e depois `.md` foi adicionado.

**Risco:**
- Arquivo pode não ser carregado corretamente por parsers que esperam `.md` simples
- Confusão em IDEs e ferramentas de documentação

**Resolução Proposta:**
```bash
# Renomear o arquivo removendo a extensão duplicada
mv "docs/VRAXIA_EXECUTIVE_CONTEXT.md.md" "docs/VRAXIA_EXECUTIVE_CONTEXT.md"
```

**Ação necessária:** Renomear o arquivo (ação simples, sem risco)

---

## CONFLITO-004: ADR numeração duplicada — ADR-003

**Status:** OPEN — Conflito de numeração

**Localização:**
- `docs/ADR-003-state-machine.md` — ADR sobre state machine
- `docs/ADR-003-decision-engine-calibration.md` — ADR sobre decision engine

**Análise:**
Dois ADRs com o mesmo número (003) mas conteúdo diferente. Isso viola o princípio de identificador único por documento.

**Risco:**
- Referências `[[ADR-003]]` são ambíguas
- Quebra rastreabilidade histórica de decisões

**Resolução Proposta:**
```
1. Determinar qual ADR-003 é mais antigo (git log dos arquivos)
2. Renumerar o mais recente para ADR-004 (e renumerar os subsequentes)
3. Ou: Criar um prefixo de domínio (ADR-SM-003, ADR-DE-003)
4. Atualizar todas as referências ao número afetado
```

**Ação necessária:** Verificar git log + renumeração + atualizar referências

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

## Próximas Ações Prioritárias

| # | Ação | Prioridade | Responsável |
|---|------|-----------|-------------|
| 1 | Resolver CONFLITO-003 (renomear .md.md) | Alta | Knowledge Architect |
| 2 | Resolver CONFLITO-004 (renumerar ADR-003 duplicado) | Alta | Knowledge Architect |
| 3 | Investigar CONFLITO-001 (qual coordinator.md está em uso) | Média | Dev + aprovação usuário |
| 4 | Investigar CONFLITO-002 (qual email-sender está em uso) | Média | Dev + aprovação usuário |
| 5 | Adicionar nota de referência no docs/ de security | Baixa | Knowledge Architect |

---

*Gerado pelo Knowledge Architect VRAXIA — 2026-07-16*
*Próxima revisão: 2026-08-16*
