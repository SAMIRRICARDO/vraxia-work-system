// packages/mcp/src/tools/leads.ts
// Tools de leads — busca no índice do Codex Lead Engine, enrichment e outreach.

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  LEADS_INDEX,
  readJsonl,
  textResult,
  safe,
  getAnthropic,
  CHEAP_MODEL,
} from '../config.js';

interface LeadMeta {
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  linkedin?: string;
  status?: string;
  score?: number;
  campaign?: string;
}

function loadLeads(): { content: string; tags: string[]; metadata: LeadMeta }[] {
  return readJsonl(LEADS_INDEX).map(e => ({
    content: (e['content'] as string) ?? '',
    tags: (e['tags'] as string[]) ?? [],
    metadata: (e['metadata'] as LeadMeta) ?? {},
  }));
}

export function registerLeadsTools(server: McpServer): void {
  // ── vraxia_search_leads ─────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_search_leads',
    {
      description:
        'Busca leads no índice do Codex Lead Engine (memory/leads/index.jsonl). ' +
        'Filtra por empresa, cargo e localização (match parcial, case-insensitive). ' +
        'Retorna nome, empresa, cargo, email, LinkedIn, status e score de cada lead.',
      inputSchema: {
        company: z.string().default('').describe('Filtro por empresa (parcial)'),
        role: z.string().default('').describe('Filtro por cargo (parcial)'),
        location: z.string().default('').describe('Filtro por localização (parcial)'),
        limit: z.number().int().min(1).max(100).default(20).describe('Máximo de resultados'),
      },
    },
    safe(async ({ company, role, location, limit }) => {
      const leads = loadLeads();
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

      const filtered = leads.filter(l => {
        const meta = l.metadata;
        const haystack = norm(l.content);
        if (company && !norm(meta.company ?? '').includes(norm(company)) && !haystack.includes(norm(company)))
          return false;
        if (role && !norm(meta.role ?? '').includes(norm(role)) && !haystack.includes(norm(role))) return false;
        if (location && !haystack.includes(norm(location))) return false;
        return true;
      });

      return textResult({
        total: filtered.length,
        returned: Math.min(filtered.length, limit),
        leads: filtered.slice(0, limit).map(l => l.metadata),
      });
    })
  );

  // ── vraxia_enrich_lead ──────────────────────────────────────────────────────
  server.registerTool(
    'vraxia_enrich_lead',
    {
      description:
        'Enriquece um lead com padrões prováveis de email corporativo (heurística PT-BR: ' +
        'nome.sobrenome@, primeiro nome@, inicial+sobrenome@) e dados já conhecidos no índice local. ' +
        'Não valida deliverability — retorna candidatos ordenados por probabilidade.',
      inputSchema: {
        name: z.string().describe('Nome completo do lead'),
        company: z.string().describe('Empresa do lead'),
        linkedinUrl: z.string().default('').describe('URL do LinkedIn (opcional)'),
      },
    },
    safe(async ({ name, company, linkedinUrl }) => {
      // 1. Verifica se já existe no índice local
      const norm = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      const existing = loadLeads().find(
        l => norm(l.metadata.name ?? '') === norm(name) && norm(l.metadata.company ?? '').includes(norm(company))
      );
      if (existing?.metadata.email) {
        return textResult({ source: 'index-local', lead: existing.metadata });
      }

      // 2. Gera padrões de email heurísticos
      const parts = norm(name).replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
      const first = parts[0] ?? '';
      const last = parts[parts.length - 1] ?? '';
      const domainBase = norm(company).replace(/[^a-z0-9]/g, '');
      const domains = [`${domainBase}.com.br`, `${domainBase}.com`];

      const patterns: { email: string; confidence: string }[] = [];
      for (const d of domains) {
        if (first && last && first !== last) {
          patterns.push({ email: `${first}.${last}@${d}`, confidence: 'alta' });
          patterns.push({ email: `${first[0]}${last}@${d}`, confidence: 'média' });
        }
        if (first) patterns.push({ email: `${first}@${d}`, confidence: 'baixa' });
      }

      return textResult({
        source: 'heuristica',
        name,
        company,
        linkedinUrl: linkedinUrl || undefined,
        emailCandidates: patterns,
        note: 'Emails não validados — use verificação SMTP/bounce antes de enviar.',
      });
    })
  );

  // ── vraxia_generate_outreach ────────────────────────────────────────────────
  server.registerTool(
    'vraxia_generate_outreach',
    {
      description:
        'Gera mensagem de outreach B2B personalizada no padrão VRASHOWS/VRAXIA ' +
        '(parceiro operacional estratégico, hook "Grandes marcas", tom consultivo PT-BR). ' +
        'Usa Haiku (cheap mode). Retorna assunto + corpo prontos para revisão.',
      inputSchema: {
        leadName: z.string().describe('Nome do lead'),
        company: z.string().describe('Empresa do lead'),
        role: z.string().default('').describe('Cargo do lead'),
        context: z.string().default('').describe('Contexto adicional (evento, dor, gancho específico)'),
      },
    },
    safe(async ({ leadName, company, role, context }) => {
      const prompt = `Você é o redator de outreach da VRAXIA/VRASHOWS, hub premium de experiências e tecnologia.
Escreva um email de outreach B2B em português brasileiro para:

Lead: ${leadName}${role ? ` (${role})` : ''}
Empresa: ${company}
${context ? `Contexto: ${context}` : ''}

Regras:
- Tom: parceiro operacional estratégico, consultivo, direto, zero clichê de vendas
- Hook de abertura mencionando que grandes marcas confiam em parceiros operacionais estratégicos
- Máximo 120 palavras no corpo
- CTA suave: convite para conversa de 15 minutos
- Assinatura: Samir Ricardo — VRASHOWS

Retorne APENAS JSON válido: {"subject": "<assunto>", "body": "<corpo do email>"}`;

      const response = await getAnthropic().messages.create({
        model: CHEAP_MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as Record<string, unknown>;
      return textResult({ leadName, company, ...parsed });
    })
  );
}
