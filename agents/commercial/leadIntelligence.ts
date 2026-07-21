import Anthropic from '@anthropic-ai/sdk';
import {
  BEHAVIORAL_ANALYSIS_PROMPT,
  STRATEGIC_ANALYSIS_PROMPT,
  INTELLIGENCE_SYNTHESIS_PROMPT
} from '../../prompts/commercial/leadIntelligencePrompt.js';
import type { Lead, AgentOutput } from '../../types/commercial.js';
import type { SessionMemory } from '../../memory/sessionMemory.js';
import { getClaudeModel, getMaxTokens } from '../../config/models.js';
import { recordClaudeMessageUsage } from '../../config/claude-analytics.js';

const client = new Anthropic();

const CHEAP_INTELLIGENCE_PROMPT = `
Voce e o Lead Intelligence 360 da VRASHOWS em cheap mode.
Retorne SOMENTE JSON puro, sem markdown e sem raciocinio.
Analise fit comercial para eventos corporativos B2B.

Schema:
{
  "behavioral": {"decision_power": "high|medium|low", "channel": "linkedin|email|whatsapp|telefone"},
  "strategic": {"event_fit": "high|medium|low", "budget_signal": "enterprise|high|medium|low"},
  "composite_score": 0,
  "tier": "A|B|C|D",
  "win_probability": 0,
  "estimated_deal_size": "string curta",
  "opening_hook": "max 18 palavras",
  "key_pain_to_address": "max 10 palavras",
  "social_proof_to_use": "string ou null",
  "red_flags": ["max 3 itens"],
  "green_flags": ["max 3 itens"],
  "recommended_action": "discard|nurture|outreach",
  "best_approach": "linkedin|email|whatsapp|telefone"
}
`.trim();

export interface LeadIntelligence {
  lead: Lead;
  behavioral: Record<string, unknown>;
  strategic: Record<string, unknown>;
  composite_score: number;
  tier: 'A' | 'B' | 'C' | 'D';
  win_probability: number;
  estimated_deal_size: string;
  opening_hook: string;
  key_pain_to_address: string;
  social_proof_to_use: string | null;
  red_flags: string[];
  green_flags: string[];
  recommended_action: string;
  best_approach: string;
}

function stripMarkdown(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

function safeJsonParse(response: Anthropic.Message): Record<string, unknown> {
  const raw = response.content[0].type === 'text' ? stripMarkdown(response.content[0].text) : '{}';
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

export async function runLeadIntelligence360(
  input: { lead: Lead },
  memory: SessionMemory
): Promise<AgentOutput> {
  const lead = input.lead;
  if (!lead) {
    return { success: false, data: {}, error: 'Lead não fornecido para Lead Intelligence 360°' };
  }

  const leadContext = JSON.stringify(lead);
  const model = getClaudeModel('claude-haiku-4-5-20251001');
  const synthesisRes = await client.messages.create({
    model,
    max_tokens: getMaxTokens(300),
    system: CHEAP_INTELLIGENCE_PROMPT,
    messages: [{ role: 'user', content: leadContext }]
  });
  recordClaudeMessageUsage('commercial-lead-intelligence', model, synthesisRes);

  const rawSynthesis = synthesisRes.content[0].type === 'text' ? synthesisRes.content[0].text : '{}';
  console.log('[Intelligence360] Synthesis raw:', rawSynthesis.slice(0, 200));
  const synthesis = safeJsonParse(synthesisRes);
  const behavioral = (synthesis['behavioral'] as Record<string, unknown>) ?? {};
  const strategic = (synthesis['strategic'] as Record<string, unknown>) ?? {};

  const compositeScore = typeof synthesis['composite_score'] === 'number'
    ? synthesis['composite_score'] as number
    : 50;

  const tier = (synthesis['tier'] as string) ?? 'C';
  const shouldDiscard = tier === 'D';

  const intelligence: LeadIntelligence = {
    lead,
    behavioral,
    strategic,
    composite_score: compositeScore,
    tier: tier as 'A' | 'B' | 'C' | 'D',
    win_probability: (synthesis['win_probability'] as number) ?? 0,
    estimated_deal_size: (synthesis['estimated_deal_size'] as string) ?? '',
    opening_hook: (synthesis['opening_hook'] as string) ?? '',
    key_pain_to_address: (synthesis['key_pain_to_address'] as string) ?? '',
    social_proof_to_use: (synthesis['social_proof_to_use'] as string) ?? null,
    red_flags: (synthesis['red_flags'] as string[]) ?? [],
    green_flags: (synthesis['green_flags'] as string[]) ?? [],
    recommended_action: (synthesis['recommended_action'] as string) ?? '',
    best_approach: (synthesis['best_approach'] as string) ?? 'linkedin'
  };

  console.log(`[Intelligence360] ${lead.name} — Score: ${compositeScore} | Tier: ${tier} | Win: ${intelligence.win_probability}%`);

  return {
    success: true,
    data: {
      intelligence,
      lead: { ...lead, score: compositeScore, fit: compositeScore >= 70 ? 'high' : compositeScore >= 50 ? 'medium' : 'low' },
      score: compositeScore,
      tier
    },
    next_action: shouldDiscard ? 'discard_lead' : 'generate_outreach'
  };
}
