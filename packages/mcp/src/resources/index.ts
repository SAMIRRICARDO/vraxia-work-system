// packages/mcp/src/resources/index.ts
// MCP Resources — vault Obsidian, candidaturas recentes e KPIs do dashboard.

import fs from 'fs';
import path from 'path';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VAULT_PATH, withDb, dbQuery, readJsonl, QUESTIONNAIRE_LOG } from '../config.js';

export function registerResources(server: McpServer): void {
  // ── vraxia://vault/{filename} ───────────────────────────────────────────────
  server.registerResource(
    'vault-file',
    new ResourceTemplate('vraxia://vault/{filename}', {
      list: async () => {
        const files: string[] = [];
        const walk = (dir: string): void => {
          if (!fs.existsSync(dir)) return;
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.md')) files.push(path.relative(VAULT_PATH, full));
          }
        };
        walk(VAULT_PATH);
        return {
          resources: files.slice(0, 200).map(f => ({
            uri: `vraxia://vault/${encodeURIComponent(f.replace(/\\/g, '/'))}`,
            name: f.replace(/\\/g, '/'),
            mimeType: 'text/markdown',
          })),
        };
      },
    }),
    {
      title: 'Vault Obsidian',
      description: 'Arquivos markdown do vault Obsidian (memória de longo prazo VRAXIA).',
    },
    async (uri, variables) => {
      const filename = decodeURIComponent(String(variables['filename'] ?? ''));
      // Bloqueia path traversal
      const resolved = path.resolve(VAULT_PATH, filename);
      if (!resolved.startsWith(path.resolve(VAULT_PATH))) {
        return { contents: [{ uri: uri.href, text: 'Erro: caminho inválido.' }] };
      }
      if (!fs.existsSync(resolved)) {
        return { contents: [{ uri: uri.href, text: `Erro: arquivo não encontrado: ${filename}` }] };
      }
      return {
        contents: [{ uri: uri.href, mimeType: 'text/markdown', text: fs.readFileSync(resolved, 'utf-8') }],
      };
    }
  );

  // ── vraxia://applications/recent ────────────────────────────────────────────
  server.registerResource(
    'recent-applications',
    'vraxia://applications/recent',
    {
      title: 'Candidaturas recentes',
      description: 'Últimas 10 candidaturas do VRAXIA WORK (SQLite).',
      mimeType: 'application/json',
    },
    async uri => {
      const rows = await withDb(db =>
        dbQuery(
          db,
          `SELECT id, job_title, company, location, status, platform, score_total, updated_at
           FROM job_applications ORDER BY updated_at DESC LIMIT 10`
        )
      );
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(rows ?? { warning: 'work.db não encontrado' }, null, 2),
          },
        ],
      };
    }
  );

  // ── vraxia://stats/dashboard ────────────────────────────────────────────────
  server.registerResource(
    'dashboard-stats',
    'vraxia://stats/dashboard',
    {
      title: 'KPIs do dashboard',
      description: 'Estatísticas agregadas do VRAXIA WORK: totais por status, custo estimado, última execução.',
      mimeType: 'application/json',
    },
    async uri => {
      const stats = await withDb(db => {
        const byStatus = dbQuery(db, `SELECT status, COUNT(*) as cnt FROM job_applications GROUP BY status`);
        const lastRun = dbQuery(db, `SELECT MAX(updated_at) as lr FROM job_applications`);
        const topCompanies = dbQuery(
          db,
          `SELECT company, COUNT(*) as cnt FROM job_applications WHERE status = 'applied'
           GROUP BY company ORDER BY cnt DESC LIMIT 5`
        );
        return {
          byStatus: Object.fromEntries(byStatus.map(r => [r['status'], r['cnt']])),
          lastRun: lastRun[0]?.['lr'] ?? null,
          topCompanies,
        };
      });

      const entries = readJsonl(QUESTIONNAIRE_LOG);
      const fastTypes = new Set(['FAST_YESNO', 'FAST_NUMERIC', 'FAST_SALARY']);
      const llmCalls = entries.filter(e => !fastTypes.has(e['tipo_detectado'] as string)).length;

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                ...(stats ?? { warning: 'work.db não encontrado' }),
                questionnaireEntries: entries.length,
                estimatedCostUsd: (llmCalls * (500 * 0.8 + 150 * 4.0)) / 1_000_000,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
