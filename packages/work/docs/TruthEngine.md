# ApplicationTruthEngine — Documentação

## Problema

Um sistema de candidatura automática que apenas verifica "o modal fechou" ou "o clique aconteceu" não prova nada. Redes podem falhar silenciosamente. Formulários podem ser rejeitados sem feedback visual. O estado anterior do sistema aceitava `confirmed: true` baseado em heurísticas frágeis.

## Solução

O `ApplicationTruthEngine` avalia objetivamente se uma candidatura foi aceita, usando múltiplas fontes de evidência e atribuindo um `ConfidenceLevel` estruturado.

## Níveis de Confiança

| Nível | Critério | Score |
|-------|----------|-------|
| `CONFIRMED` | Score ≥ 50 + pelo menos 1 prova hard | ≥50 |
| `PROBABLE` | Score ≥ 25 (evidências parciais) | 25-49 |
| `FAILED` | Estado terminal de falha + score = 0 | 0 |
| `UNKNOWN` | Nenhuma evidência clara | 0 |

## Tipos de Prova e Pesos

| Prova | Peso | Fonte | Confiança |
|-------|------|-------|-----------|
| `network_submit_200` | 50 | network.json (POST 2xx ao endpoint submit) | Máxima |
| `ats_confirmation` | 45 | GreenhouseApplyEngine | Alta |
| `my_jobs_applied` | 40 | LinkedIn My Jobs > Applied | Alta |
| `confirmation_text` | 25 | Texto na página ("candidatura enviada") | Média |
| `url_redirect` | 20 | Redirect para URL pós-apply | Média |
| `health_check_passed` | 10 | Health score ≥ 80 | Baixa |
| `screenshot_exists` | 5 | Screenshots capturados | Evidência |
| `trace_complete` | 5 | trace.json com evento de submit | Evidência |

## Combinações que resultam em CONFIRMED

```
network_submit_200 (50pts) → CONFIRMED sozinha
my_jobs_applied (40pts) + screenshot (5pts) + trace (5pts) = 50pts → CONFIRMED
confirmation_text (25pts) + health (10pts) + screenshot (5pts) + trace (5pts) = 45pts → PROBABLE
```

## Arquivos gerados

Por candidatura (em `.vraxia-work/logs/application_<id>/`):

```
truth-record.json    ← TruthRecord completo
health-report.json   ← HealthCheck (12 checks, 0-100)
trace.json           ← Todos os eventos do fluxo
timeline.json        ← Transições de estado com duração
network.json         ← Requisições de rede capturadas
console.log          ← Console do browser
manifest.json        ← Inventário de todas as evidências
*.png                ← Screenshots em cada etapa crítica
*.html               ← DOM snapshots em falhas
```

## API

```typescript
const engine = new ApplicationTruthEngine();

// Durante o fluxo (ApplicationService chama automaticamente)
const truth = engine.evaluate({
  jobId: 'job_123',
  traceId: 'trc_abc',
  evidenceDir: '/path/to/evidence',
  finalState: 'confirmed',
  validationResult,  // da ValidationEngine
  healthScore: 85,
});

// Post-hoc (qualquer momento)
const truth = engine.evaluateFromDir('job_123', '/path/to/evidence', 'confirmed');
```

## Endpoints REST

```
GET  /api/work/evidence/:jobId/truth          → TruthRecord
GET  /api/work/truth-stats                    → Taxas agregadas
GET  /api/work/applications/:jobId/analytics  → Analytics completo da candidatura
```
