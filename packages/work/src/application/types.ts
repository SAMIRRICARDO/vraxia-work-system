// packages/work/src/application/types.ts
// State machine types, evidence structures, and application metrics

import type { QuestionnaireQuestion } from '../types/index.js';

// ── Application State ────────────────────────────────────────────────────────
// Complete lifecycle: discovery → apply flow → validation → career tracking

export type ApplicationState =
  // Pre-apply
  | 'discovered'         // job found by search engine
  | 'queued'             // waiting to apply (already scored)
  | 'already_applied'    // duplicate detected — do not retry
  // Apply flow
  | 'starting'
  | 'opening_job'
  | 'opening_easy_apply'
  | 'uploading_resume'
  | 'filling_questions'
  | 'reviewing'
  | 'submitting'
  | 'submitted'
  | 'validating'         // running post-submit validation
  // Apply terminal states
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'blocked'
  | 'timeout'
  | 'retrying'
  // Post-apply career lifecycle (updated via dashboard or manually)
  | 'rejected'
  | 'interview'
  | 'offer'
  | 'hired';

export const TERMINAL_STATES: readonly ApplicationState[] = [
  'confirmed', 'failed', 'cancelled', 'blocked', 'timeout',
  'already_applied', 'rejected', 'hired',
];

export const CAREER_LIFECYCLE_STATES: readonly ApplicationState[] = [
  'rejected', 'interview', 'offer', 'hired',
];

// VALID_TRANSITIONS — the proprietary state transition topology is defined in the private implementation.

// ── State Transitions ────────────────────────────────────────────────────────

export interface StateTransition {
  from: ApplicationState;
  to: ApplicationState;
  timestamp: string;
  durationMs: number;
  metadata?: Record<string, unknown>;
}

// ── Trace / Telemetry ────────────────────────────────────────────────────────

export interface TraceEvent {
  timestamp: string;
  step: string;
  url: string;
  selector?: string;
  action?: string;
  durationMs: number;
  result: 'ok' | 'error' | 'skip' | 'retry';
  error?: string;
  stack?: string;
  retryNumber?: number;
  screenshotFile?: string;
  metadata?: Record<string, unknown>;
}

// ── Network ──────────────────────────────────────────────────────────────────

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  timestamp: string;
  requestBody?: string;
  responseBody?: string;
  isApplicationRelated: boolean;
}

// ── Evidence ─────────────────────────────────────────────────────────────────

export interface EvidenceManifest {
  jobId: string;
  company: string;
  jobTitle: string;
  platform: string;
  startedAt: string;
  finishedAt?: string;
  finalState: ApplicationState;
  screenshots: string[];
  htmlCaptures: string[];
  traceFile: string;
  timelineFile: string;
  networkFile: string;
  consoleFile: string;
}

// ── Validation ───────────────────────────────────────────────────────────────

export type ValidationMethod =
  | 'my_jobs_applied'
  | 'network_response'
  | 'page_transition'
  | 'confirmation_text'
  | 'none';

export interface ValidationResult {
  confirmed: boolean;
  method: ValidationMethod;
  confidence: 'high' | 'medium' | 'low';
  details: string;
  evidence?: Record<string, unknown>;
}

// ── Attempts (DB) ────────────────────────────────────────────────────────────

export interface ApplicationAttempt {
  id: string;
  applicationId: string;
  attemptNumber: number;
  state: ApplicationState;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  selector?: string;
  url?: string;
  error?: string;
  stack?: string;
  screenshotPath?: string;
  htmlPath?: string;
  traceId: string;
  retryOf?: string;
}

// ── Metrics ───────────────────────────────────────────────────────────────────

export interface ApplicationMetrics {
  jobId: string;
  totalDurationMs: number;
  durationByStep: Record<string, number>;
  screenshotCount: number;
  questionCount: number;
  retryCount: number;
  finalState: ApplicationState;
  validationMethod?: ValidationMethod;
  captchaDetected: boolean;
  blockDetected: boolean;
}

// ── Processing Options ───────────────────────────────────────────────────────

export interface ProcessOptions {
  dryRun: boolean;
  resumePath: string;
  onQuestion: (q: QuestionnaireQuestion) => Promise<string>;
  onFieldFilled?: (label: string, value: string) => void;
  onStateChange?: (state: ApplicationState, metadata?: Record<string, unknown>) => void;
  maxRetries?: number;
  traceId?: string;
}

// ── Application Result ───────────────────────────────────────────────────────

export interface ApplicationResult {
  jobId: string;
  finalState: ApplicationState;
  confirmed: boolean;
  validation?: ValidationResult;
  metrics: ApplicationMetrics;
  evidenceDir: string;
  attempts: number;
  error?: string;
}

// ── Internal Engine Result ───────────────────────────────────────────────────

export interface EngineResult {
  success: boolean;
  attempts: number;
  validation?: ValidationResult;
}

// ── Truth Engine ──────────────────────────────────────────────────────────────

// Distinct from ApplicationState (workflow perspective).
// TruthStatus is the read-only auditor's verdict based on physical evidence.
export type TruthStatus =
  | 'VERIFIED'   // hard proof: network 2xx, My Jobs Applied, ATS confirmation
  | 'PROBABLE'   // partial evidence: confirmation text, redirect, high health score
  | 'REJECTED'   // evidence points to failure, no submission proof found
  | 'UNKNOWN'    // not yet evaluated by the Truth Engine
  | 'EXPIRED';   // evidence no longer accessible for evaluation

/** Internal alias — kept for compatibility with existing Truth Engine output. */
export type ConfidenceLevel = TruthStatus;

export type ProofType =
  | 'network_submit_200'   // POST to submit endpoint → HTTP 2xx
  | 'my_jobs_applied'      // job found under My Jobs > Applied
  | 'confirmation_text'    // confirmation text detected on page
  | 'url_redirect'         // redirect to post-apply URL (my-items, /jobs/?)
  | 'ats_confirmation'     // external ATS (Greenhouse etc.) confirmed receipt
  | 'health_check_passed'  // browser health check passed post-apply
  | 'screenshot_exists'    // at least one screenshot captured
  | 'trace_complete';      // trace.json contains submit event

export interface ApplicationProof {
  type: ProofType;
  weight: number;
  description: string;
  evidence: Record<string, unknown>;
  timestamp: string;
}

export interface TruthRecord {
  jobId: string;
  traceId: string;
  evaluatedAt: string;
  confidence: TruthStatus;
  validationScore: number;   // 0-100
  proofs: ApplicationProof[];
  primaryProof?: ApplicationProof;
  evidenceDir: string;
  summary: string;
}

// ── Error Classification ──────────────────────────────────────────────────────

export type ErrorCategory =
  | 'DOM_ERROR'
  | 'LOGIN_ERROR'
  | 'CAPTCHA_ERROR'
  | 'SESSION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'ATS_ERROR'
  | 'UPLOAD_ERROR'
  | 'SUBMIT_ERROR'
  | 'LLM_ERROR'
  | 'NAVIGATION_ERROR'
  | 'OAUTH_ERROR'
  | 'TOKEN_ERROR'
  | 'DATABASE_ERROR'
  | 'API_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'ANTI_BOT_ERROR'
  | 'UNKNOWN_ERROR';

export interface ApplicationError {
  category: ErrorCategory;
  message: string;
  rca: string;              // Root Cause Analysis — auto-generated
  recommendation: string;
  retryable: boolean;
  state: ApplicationState;
  timestamp: string;
}
