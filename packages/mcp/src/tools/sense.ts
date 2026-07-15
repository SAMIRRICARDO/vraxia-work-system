// packages/mcp/src/tools/sense.ts
// Tool do VRAXIA Sense — classificação de eventos/mensagens (percepção proativa).

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { textResult, safe, getAnthropic, CHEAP_MODEL } from '../config.js';

export function registerSenseTools(server: McpServer): void {
  server.registerTool(
    'vraxia_sense_classify',
    {
      description:
        'Classifica um evento ou mensagem via VRAXIA Sense (percepção proativa). ' +
        'Retorna categoria (commercial_opportunity | support | spam | info | urgent), ' +
        'prioridade (1-5), sinais detectados e ação sugerida. Usa Haiku (cheap mode).',
      inputSchema: {
        content: z.string().describe('Conteúdo do evento/mensagem a classificar'),
        context: z.string().default('').describe('Contexto adicional (canal, remetente, histórico)'),
      },
    },
    safe(async ({ content, context }) => {
      const prompt = `Você é o VRAXIA Sense, camada de percepção proativa de um runtime cognitivo.
Classifique o evento abaixo.

EVENTO:
${content.slice(0, 2000)}
${context ? `\nCONTEXTO: ${context.slice(0, 500)}` : ''}

Categorias possíveis:
- commercial_opportunity: potencial de negócio, lead, pedido de orçamento, interesse em parceria
- support: dúvida ou problema de cliente/usuário existente
- urgent: exige ação humana imediata (prazo, incidente, escalação)
- info: informativo, newsletter, atualização sem ação necessária
- spam: irrelevante, promocional não solicitado

Retorne APENAS JSON válido, sem markdown:
{
  "category": "<categoria>",
  "priority": <1-5, 5 = mais urgente>,
  "signals": ["<sinal detectado 1>", "<sinal 2>"],
  "suggestedAction": "<ação sugerida em 1 frase>",
  "confidence": <0.0-1.0>
}`;

      const response = await getAnthropic().messages.create({
        model: CHEAP_MODEL,
        max_tokens: 384,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as Record<string, unknown>;
      return textResult(parsed);
    })
  );
}
