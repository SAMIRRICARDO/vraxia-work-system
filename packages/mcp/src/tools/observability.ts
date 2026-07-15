// packages/mcp/src/tools/observability.ts
// Tools de observabilidade — custos de tokens e logs de execução dos agentes.

import { z } from 'zod';
import fs from 'fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  METRICS_JSON,
  QUESTIONNAIRE_LOG,
  SCHEDULER_HISTORY,
  NOITE_LOG,
  readJsonl,
  textResult,
  safe,
  periodCutoff,
} from '../config.js';

export function registerObservabilityTools(server: McpServer): void {
  // ── vraxia_get_costs ────────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_get_costs',
    {
      description:
        'Retorna custos acumulados de tokens/IA do ecossistema VRAXIA: ' +
        'custos por provider (logs/metrics.json) e custo estimado do questionário do WORK. ' +
        'Filtra o log do questionário por período.',
      inputSchema: {
        period: z.enum(['today', 'week', 'month', 'all']).default('all').describe('Período de análise'),
        agent: z
          .enum(['work', 'core', 'all'])
          .default('all')
          .describe('Escopo: work = VRAXIA WORK, core = runtime raiz, all = ambos'),
      },
    },
    safe(async ({ period, agent }) => {
      const result: Record<string, unknown> = { period, agent };

      if (agent === 'core' || agent === 'all') {
        try {
          const metrics = JSON.parse(fs.readFileSync(METRICS_JSON, 'utf-8')) as Record<string, unknown>;
          result['core'] = {
            aiCosts: metrics['aiCosts'],
            tokensUsed: metrics['tokensUsed'],
            cheapModeSavings: metrics['cheapModeSavings'],
            generatedAt: metrics['generatedAt'],
          };
        } catch {
          result['core'] = { warning: 'logs/metrics.json não disponível' };
        }
      }

      if (agent === 'work' || agent === 'all') {
        const cutoff = periodCutoff(period);
        let entries = readJsonl(QUESTIONNAIRE_LOG);
        if (cutoff) {
          entries = entries.filter(e => {
            const ts = (e['timestamp'] as string) ?? (e['ts'] as string) ?? '';
            return ts >= cutoff;
          });
        }
        const fastTypes = new Set(['FAST_YESNO', 'FAST_NUMERIC', 'FAST_SALARY']);
        const llmCalls = entries.filter(e => !fastTypes.has(e['tipo_detectado'] as string)).length;
        result['work'] = {
          questionnaireEntries: entries.length,
          llmCalls,
          fastPathCalls: entries.length - llmCalls,
          estimatedCostUsd: (llmCalls * (500 * 0.8 + 150 * 4.0)) / 1_000_000,
          model: 'claude-haiku-4-5 (cheap mode)',
        };
      }

      return textResult(result);
    })
  );

  // ── vraxia_get_logs ─────────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_get_logs',
    {
      description:
        'Retorna logs de execução dos agentes VRAXIA: histórico do scheduler (rodadas do hunt), ' +
        'log do modo noturno e log do questionário. Mais recentes primeiro.',
      inputSchema: {
        agent: z
          .enum(['scheduler', 'noite', 'questionnaire'])
          .default('scheduler')
          .describe('Fonte de log: scheduler = histórico de rodadas, noite = modo noturno, questionnaire = perguntas respondidas'),
        limit: z.number().int().min(1).max(100).default(20).describe('Máximo de entradas/linhas'),
      },
    },
    safe(async ({ agent, limit }) => {
      switch (agent) {
        case 'scheduler': {
          const entries = readJsonl(SCHEDULER_HISTORY).reverse().slice(0, limit);
          return textResult({ source: SCHEDULER_HISTORY, count: entries.length, entries });
        }
        case 'noite': {
          if (!fs.existsSync(NOITE_LOG)) return textResult({ warning: `Log não encontrado: ${NOITE_LOG}` });
          const lines = fs.readFileSync(NOITE_LOG, 'utf-8').split('\n').filter(l => l.trim());
          return textResult({ source: NOITE_LOG, lines: lines.slice(-limit) });
        }
        case 'questionnaire': {
          const entries = readJsonl(QUESTIONNAIRE_LOG).reverse().slice(0, limit);
          return textResult({ source: QUESTIONNAIRE_LOG, count: entries.length, entries });
        }
      }
    })
  );
}
