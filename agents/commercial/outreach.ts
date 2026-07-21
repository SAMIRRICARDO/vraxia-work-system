import Anthropic from '@anthropic-ai/sdk';
import { OUTREACH_PROMPT } from '../../prompts/commercial/outreachPrompt.js';
import type { Lead, AgentOutput } from '../../types/commercial.js';
import type { SessionMemory } from '../../memory/sessionMemory.js';
import { getClaudeModel, getMaxTokens } from '../../config/models.js';
import { recordClaudeMessageUsage } from '../../config/claude-analytics.js';

const client = new Anthropic();

const CHEAP_OUTREACH_PROMPT = `
Voce gera outreach comercial VRASHOWS em cheap mode.
Retorne SOMENTE JSON puro, sem markdown e sem raciocinio.

Schema:
{
  "channel": "linkedin|email|whatsapp",
  "subject": "max 8 palavras",
  "message": "max 85 palavras",
  "cta": "max 12 palavras",
  "follow_up": "max 45 palavras"
}
`.trim();

export async function runOutreach(
  input: { lead: Lead },
  memory: SessionMemory
): Promise<AgentOutput> {
  if (!input.lead) {
    return { success: false, data: {}, error: 'Lead não fornecido para outreach' };
  }

  if (input.lead.score !== undefined && input.lead.score < 60) {
    return {
      success: true,
      data: { skipped: true, reason: 'Score abaixo do threshold (60)' },
      next_action: 'skip_low_score'
    };
  }

  const model = getClaudeModel('claude-sonnet-4-6');
  const response = await client.messages.create({
    model,
    max_tokens: getMaxTokens(300),
    system: CHEAP_OUTREACH_PROMPT,
    messages: [{
      role: 'user',
      content: `Lead para abordar: ${JSON.stringify(input.lead)}`
    }]
  });
  recordClaudeMessageUsage('commercial-outreach', model, response);

  const rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
  const raw = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      success: true,
      data: { lead: input.lead, outreach: parsed, outreach_generated: true },
      next_action: 'create_crm_opportunity'
    };
  } catch {
    return { success: false, data: {}, error: 'Erro na geração de outreach' };
  }
}
