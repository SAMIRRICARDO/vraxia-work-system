// packages/work/src/engine/decision-engine.ts
// Decision Engine — Career Decision Score (CDS) composite.
//
// CDS replaces raw interviewProbability as the sole decision signal.
// It layers: IP + Company Intelligence + Timing + Recruiter Signal + Outcome Learning.
//
// Decision Bands:
//   95-100  IMMEDIATE  Auto Apply + Cover Letter + Custom CV + Find Recruiter + Prep Interview + Monitor
//   90-94   HIGH       Auto Apply + Cover Letter + Networking
//   80-89   MEDIUM     Auto Apply
//   70-79   REVIEW     Human Review
//   <70     SKIP       Only with objective evidence

import type { HireScore } from '../types/hire-intelligence.js';
import type { LearningPattern } from '../types/hire-intelligence.js';

// ── Company Intelligence ──────────────────────────────────────────────────────

export type CompanyTier = 'BIG_TECH' | 'PREMIUM' | 'FORTUNE' | 'UNICORN' | 'FUNDED_STARTUP' | 'UNKNOWN';

const BIG_TECH = new Set([
  'google', 'meta', 'amazon', 'apple', 'microsoft', 'netflix', 'nvidia',
  'alphabet', 'openai', 'anthropic', 'deepmind', 'salesforce', 'oracle',
  'ibm', 'intel', 'amd', 'qualcomm', 'adobe', 'spotify', 'airbnb', 'uber',
  'linkedin', 'twitter', 'x corp', 'stripe', 'palantir', 'databricks',
]);

const PREMIUM_CONSULTANCIES = new Set([
  'thoughtworks', 'accenture', 'mckinsey', 'bcg', 'deloitte', 'kpmg', 'pwc',
  'ey', 'capgemini', 'infosys', 'wipro', 'tcs', 'ntt', 'cognizant',
]);

const UNICORNS_BR = new Set([
  'nubank', 'totvs', 'ifood', 'stone', 'pagseguro', 'pagbank', 'inter',
  'creditas', 'gympass', 'dock', 'neon', 'cloudwalk', 'maitha', 'olist',
  'madeira', 'vtex', 'enjoei', 'meli', 'mercadolivre', 'rappi', 'loft',
  'quintoandar', 'ebanx', 'hash', 'hubla', 'pismo', 'woovi',
  'ci&t', 'ci and t', 'avenue', 'conveste', 'btg', 'xp investimentos', 'xp inc',
  'upbi', 'outly', 'caju', 'contabilizei', 'conta simples',
]);

export interface CompanyScore {
  tier: CompanyTier;
  score: number;          // 0-100
  reasoning: string;
}

export function scoreCompany(company: string): CompanyScore {
  const normalized = company.toLowerCase().replace(/[^a-z0-9&]/g, ' ').trim();

  if ([...BIG_TECH].some(c => normalized.includes(c))) {
    return { tier: 'BIG_TECH', score: 95, reasoning: 'Big Tech — máxima prioridade' };
  }
  if ([...PREMIUM_CONSULTANCIES].some(c => normalized.includes(c))) {
    return { tier: 'PREMIUM', score: 85, reasoning: 'Consultoria premium — alta prioridade' };
  }
  if ([...UNICORNS_BR].some(c => normalized.includes(c))) {
    return { tier: 'UNICORN', score: 88, reasoning: 'Unicórnio / scaleup BR — alta prioridade' };
  }

  // Fortune/enterprise heuristics (>1k employees usually listed)
  const fortuneHints = ['s.a.', 's/a', 'ltda', 'sa ', ' inc', ' corp', ' group', ' holding', ' bank'];
  if (fortuneHints.some(h => normalized.includes(h))) {
    return { tier: 'FORTUNE', score: 72, reasoning: 'Empresa estabelecida' };
  }

  return { tier: 'UNKNOWN', score: 55, reasoning: 'Empresa sem tier mapeado' };
}

// ── Timing Score ──────────────────────────────────────────────────────────────

export function timingScore(publicationAgeDays: number): number {
  if (publicationAgeDays < 1)  return 100;
  if (publicationAgeDays <= 1) return 95;
  if (publicationAgeDays <= 2) return 88;
  if (publicationAgeDays <= 3) return 80;
  if (publicationAgeDays <= 5) return 65;
  if (publicationAgeDays <= 7) return 50;
  if (publicationAgeDays <= 14) return 30;
  return 10;
}

// ── Recruiter Intelligence Score ──────────────────────────────────────────────

export interface RecruiterSignals {
  isEasyApply: boolean;
  hasActiveRecruiter: boolean;
  isConnected: boolean;
  hasReferral: boolean;
  messagesOpen: boolean;
}

export function recruiterScore(signals: Partial<RecruiterSignals>): number {
  let score = 50; // baseline
  if (signals.hasReferral)        score += 30;
  if (signals.isConnected)        score += 15;
  if (signals.hasActiveRecruiter) score += 20;
  if (signals.messagesOpen)       score += 10;
  if (!signals.isEasyApply)       score += 5;  // direct apply = less competition
  return Math.min(100, score);
}

// ── Outcome Learning Adjustment ───────────────────────────────────────────────

export function outcomeAdjustment(patterns: LearningPattern[], twinId: string): number {
  if (!patterns.length) return 0;

  const twinPattern = patterns.find(p => p.patternType === 'twin' && p.patternKey === twinId);
  if (!twinPattern || twinPattern.totalApplications < 3) return 0;

  const ir = twinPattern.interviewRate; // 0-1
  // Scale: 0% IR = -15 adjustment, 50% IR = +25, 100% IR = +40
  return Math.round(ir * 55 - 15);
}

// ── Decision Score Weights ────────────────────────────────────────────────────

export const DECISION_WEIGHTS = {
  interviewProbability: 0.50,
  companyScore:         0.15,
  timingScore:          0.10,
  recruiterScore:       0.10,
  outcomeAdjustment:    0.15,
} as const;

// ── Priority Bands ────────────────────────────────────────────────────────────

export type PriorityLevel = 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'REVIEW' | 'SKIP';

const PRIORITY_ACTIONS: Record<PriorityLevel, string[]> = {
  IMMEDIATE: [
    'Auto Apply agora',
    'Escrever Cover Letter personalizada',
    'Selecionar CV específico para o cargo',
    'Buscar recrutador no LinkedIn',
    'Preparar respostas de entrevista',
    'Monitorar candidatura ativamente',
  ],
  HIGH: [
    'Auto Apply',
    'Cover Letter',
    'Fazer networking com conexões da empresa',
  ],
  MEDIUM: [
    'Auto Apply',
  ],
  REVIEW: [
    'Revisar manualmente antes de aplicar',
  ],
  SKIP: [
    'Skip — considere somente com evidência objetiva de fit',
  ],
};

export interface DecisionScore {
  score: number;               // 0-100 composite
  priority: PriorityLevel;
  actions: string[];

  breakdown: {
    interviewProbability: number;
    companyScore:         number;
    timingScore:          number;
    recruiterScore:       number;
    outcomeAdjustment:    number;
  };

  companyTier: CompanyTier;
  reasoning:   string;
}

// ── Main: computeDecisionScore ────────────────────────────────────────────────

export function computeDecisionScore(
  hire: Pick<HireScore, 'interviewProbability' | 'marketContext'>,
  company: string,
  patterns: LearningPattern[] = [],
  twinId = '',
  recruiterSignals: Partial<RecruiterSignals> = {},
): DecisionScore {
  const ip          = hire.interviewProbability;
  const age         = hire.marketContext.publicationAgeDays;
  const company_    = scoreCompany(company);
  const timing      = timingScore(age);
  const recruiter   = recruiterScore(recruiterSignals);
  const outAdj      = outcomeAdjustment(patterns, twinId);

  const raw =
    ip          * DECISION_WEIGHTS.interviewProbability +
    company_.score  * DECISION_WEIGHTS.companyScore +
    timing      * DECISION_WEIGHTS.timingScore +
    recruiter   * DECISION_WEIGHTS.recruiterScore +
    (50 + outAdj) * DECISION_WEIGHTS.outcomeAdjustment; // base 50 + adjustment

  const score = Math.min(100, Math.max(0, Math.round(raw)));

  const priority: PriorityLevel =
    score >= 95 ? 'IMMEDIATE' :
    score >= 90 ? 'HIGH'      :
    score >= 80 ? 'MEDIUM'    :
    score >= 70 ? 'REVIEW'    :
    'SKIP';

  const reasoning =
    `CDS ${score} = IP(${ip}×0.5) + Co(${company_.score}×0.15) + T(${timing}×0.1) + R(${recruiter}×0.1) + L(${50 + outAdj}×0.15). ` +
    `Tier: ${company_.tier}. ${company_.reasoning}.`;

  return {
    score,
    priority,
    actions: PRIORITY_ACTIONS[priority],
    breakdown: {
      interviewProbability: ip,
      companyScore: company_.score,
      timingScore: timing,
      recruiterScore: recruiter,
      outcomeAdjustment: outAdj,
    },
    companyTier: company_.tier,
    reasoning,
  };
}

// ── Prediction Accuracy ───────────────────────────────────────────────────────

export type PredictionClass = 'TRUE_POSITIVE' | 'FALSE_POSITIVE' | 'TRUE_NEGATIVE' | 'FALSE_NEGATIVE';

export function classifyPrediction(
  interviewProbability: number,
  gotInterview: boolean,
  threshold = 75,
): PredictionClass {
  const predicted = interviewProbability >= threshold;
  if (predicted && gotInterview)  return 'TRUE_POSITIVE';
  if (predicted && !gotInterview) return 'FALSE_POSITIVE';
  if (!predicted && gotInterview) return 'FALSE_NEGATIVE';
  return 'TRUE_NEGATIVE';
}

// ── D.I.A. — Outcome State Machine ────────────────────────────────────────────
// Every state change feeds back into LearningEngine for continuous improvement.

export type OutcomeState =
  | 'applied'
  | 'viewed'
  | 'recruiter_contact'
  | 'questionnaire'
  | 'english_test'
  | 'rh_interview'
  | 'technical_interview'
  | 'manager_interview'
  | 'offer'
  | 'rejected'
  | 'ghost'
  | 'hired';

export const OUTCOME_STATE_LABELS: Record<OutcomeState, string> = {
  applied:              'Aplicado',
  viewed:               'Visualizado',
  recruiter_contact:    'Contato do Recrutador',
  questionnaire:        'Questionário',
  english_test:         'Teste de Inglês',
  rh_interview:         'Entrevista RH',
  technical_interview:  'Entrevista Técnica',
  manager_interview:    'Entrevista com Gestor',
  offer:                'Oferta Recebida',
  rejected:             'Rejeitado',
  ghost:                'Ghost (sem resposta)',
  hired:                'Contratado!',
};

// Maps OutcomeState to InterviewOutcomeType for LearningEngine
export function toInterviewOutcomeType(state: OutcomeState): string {
  switch (state) {
    case 'rh_interview':
    case 'technical_interview':
    case 'manager_interview':  return 'interview';
    case 'offer':              return 'offer';
    case 'hired':              return 'hired';
    case 'rejected':           return 'rejection';
    case 'ghost':              return 'ghosted';
    default:                   return 'no_response';
  }
}

// States that should trigger LearningEngine update
export const LEARNING_TRIGGER_STATES: OutcomeState[] = [
  'rh_interview', 'technical_interview', 'manager_interview',
  'offer', 'hired', 'rejected', 'ghost',
];

// States that represent active positive progression
export const POSITIVE_STATES: OutcomeState[] = [
  'viewed', 'recruiter_contact', 'questionnaire', 'english_test',
  'rh_interview', 'technical_interview', 'manager_interview', 'offer', 'hired',
];
