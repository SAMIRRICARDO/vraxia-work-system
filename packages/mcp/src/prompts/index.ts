// packages/mcp/src/prompts/index.ts
// MCP Prompts — templates prontos para briefing de vagas e campanha de outreach.

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { withDb, dbQuery } from '../config.js';

export function registerPrompts(server: McpServer): void {
  // ── vraxia_hunt_briefing ────────────────────────────────────────────────────
  server.registerPrompt(
    'vraxia_hunt_briefing',
    {
      title: 'Briefing de vagas do dia',
      description:
        'Gera um briefing executivo das vagas encontradas hoje pelo VRAXIA WORK: ' +
        'aplicadas, na fila e marcadas para revisão, com recomendações de próximos passos.',
      argsSchema: {
        period: z.enum(['today', 'week']).optional().describe('Período do briefing (default: today)'),
      },
    },
    async ({ period }) => {
      const days = period === 'week' ? 7 : 1;
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

      const rows = await withDb(db =>
        dbQuery(
          db,
          `SELECT job_title, company, status, platform, score_total, updated_at
           FROM job_applications WHERE updated_at >= ? ORDER BY score_total DESC LIMIT 50`,
          [cutoff]
        )
      );

      const data = JSON.stringify(rows ?? [], null, 2);

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Você é o analista de carreira do VRAXIA WORK. Gere um briefing executivo em português
das vagas processadas no período (${period ?? 'today'}).

DADOS (SQLite, mais recentes primeiro):
${data}

Estruture o briefing assim:
1. **Resumo** — total processado, aplicadas, na fila, filtradas
2. **Destaques** — as 3 melhores vagas por score, com por que valem atenção
3. **Fila de revisão** — vagas REVIEW que merecem decisão humana
4. **Próximos passos** — recomendações concretas (ex.: rodar hunt real, revisar vaga X)

Seja direto e acionável. Se não houver dados, diga que nenhum hunt rodou no período.`,
            },
          },
        ],
      };
    }
  );

  // ── vraxia_outreach_campaign ────────────────────────────────────────────────
  server.registerPrompt(
    'vraxia_outreach_campaign',
    {
      title: 'Campanha de outreach',
      description:
        'Gera uma campanha de outreach B2B completa (sequência de 3 emails) para uma lista de leads, ' +
        'no padrão VRASHOWS: parceiro operacional estratégico, hook "Grandes marcas", tom consultivo.',
      argsSchema: {
        campaign: z.string().describe('Nome/objetivo da campanha'),
        leads: z.string().describe('Lista de leads (nome, empresa, cargo — um por linha ou JSON)'),
      },
    },
    async ({ campaign, leads }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Você é o estrategista de outbound da VRASHOWS/VRAXIA (hub premium de experiências e tecnologia).

Crie uma campanha de outreach chamada "${campaign}" para os leads abaixo:

LEADS:
${leads}

Padrão obrigatório VRASHOWS:
- Posicionamento: parceiro operacional estratégico (nunca "fornecedor" ou "agência")
- Hook de abertura: grandes marcas confiam em parceiros operacionais estratégicos
- Tom: consultivo, direto, zero clichê de vendas, português brasileiro
- CTA: conversa de 15 minutos
- Assinatura: Samir Ricardo — VRASHOWS

Entregue:
1. **Email 1 (D+0)** — apresentação com hook, máx 120 palavras
2. **Email 2 (D+3)** — follow-up com caso de uso concreto, máx 90 palavras
3. **Email 3 (D+7)** — breakup email elegante, máx 60 palavras
4. **Personalização** — para cada lead, 1 linha de gancho específico por cargo/empresa`,
          },
        },
      ],
    })
  );
}
