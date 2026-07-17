---
title: "ADR-005: Pluggable Executor Architecture"
tier: 2
status: Accepted
created: 2026-07-16
tags:
  - adr
  - tier-2
  - remote-dev
  - executor
  - architecture
---

# ADR-005: Pluggable Executor Architecture

## Status
Accepted

## Contexto

O VRAXIA Remote Development Agent (RDA) precisa executar código em nome do usuário.
A primeira implementação usa Claude Code como executor. No futuro, outros executores
serão necessários: OpenAI Codex, Gemini CLI, Cursor Agent, Aider, Windsurf, agentes próprios.

## Decisão

Toda execução deve ocorrer através de uma interface `Executor` plugável.
Nenhum código deve ser acoplado a Claude Code ou qualquer executor específico.

```typescript
interface Executor {
  execute(job: JobRequest, onChunk: ChunkCallback): Promise<JobResult>;
  stop(jobId: string): Promise<void>;
  resume(jobId: string): Promise<void>;
  cancel(jobId: string): Promise<void>;
  status(jobId: string): Promise<ExecutorStatus>;
  health(): Promise<HealthStatus>;
}
```

Executores são registrados por nome. O dispatcher seleciona via `executor` field no job request.

## Justificativa

- Evita lock-in com qualquer provider de IA
- Permite comparação de resultados entre executores
- Habilita fallback automático se executor falhar
- Facilita testes com mock executors

## Consequências

- Todo executor implementa a interface `Executor` completa
- `ClaudeCodeExecutor` é apenas o primeiro executor (não o padrão)
- Novos executores podem ser adicionados sem alterar o roteador
- O guardian avalia o risco do job independente do executor escolhido
