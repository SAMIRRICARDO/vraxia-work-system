// packages/work/src/application/ApplicationTruthEngine.ts
// Evidence-based verification: reads artifacts from the evidence directory
// and produces a TruthRecord with TruthStatus and ranked proofs.
// Can be called inline (post-ValidationEngine) or post-hoc from any evidence dir.
//
// TruthStatus is independent of ApplicationState:
//   ApplicationState.confirmed — the workflow completed successfully.
//   TruthStatus.VERIFIED       — physical evidence confirms submission.
// These two values can diverge; the dashboard surfaces both as separate columns.

import fs from 'fs';
import path from 'path';
import {
  TruthStatus,
  ProofType,
  ApplicationProof,
  TruthRecord,
  ValidationResult,
  ApplicationState,
  EvidenceManifest,
  NetworkRequest,
} from './types.js';

// Evidence weights (0-100 scale). network_submit_200 alone reaches VERIFIED_THRESHOLD.
const PROOF_WEIGHTS: Record<ProofType, number> = {
  network_submit_200:  80,  // POST 2xx to submit endpoint — strongest signal
  ats_confirmation:    75,  // external ATS confirmed receipt
  my_jobs_applied:     70,  // job found under My Jobs > Applied
  confirmation_text:   45,  // confirmation text detected on page
  url_redirect:        35,  // redirect to post-apply URL
  health_check_passed: 20,  // browser health check passed
  screenshot_exists:   10,  // visual evidence captured
  trace_complete:      10,  // trace.json contains submit event
};

// score ≥ VERIFIED_THRESHOLD + hard proof → VERIFIED
// score ≥ PROBABLE_THRESHOLD              → PROBABLE
// confirmed workflow + any proof           → PROBABLE (workflow corroborates)
const VERIFIED_THRESHOLD = 80;
const PROBABLE_THRESHOLD  = 40;

// Hard proofs: any single one is sufficient to reach VERIFIED (given score ≥ 80)
const HARD_PROOFS: ProofType[] = ['network_submit_200', 'my_jobs_applied', 'ats_confirmation'];

// LinkedIn submit endpoint patterns
const SUBMIT_ENDPOINT_PATTERNS = [
  /\/voyager\/api\/jobs\/.*\/easyApplyApplications/i,
  /\/jobs\/applyWithUnifiedProcess/i,
  /\/jobs\/easyApply/i,
  /applyApplication/i,
];

export class ApplicationTruthEngine {
  /**
   * Evaluates evidence for a single application. Called by ApplicationService
   * after ValidationEngine, or post-hoc from any evidence directory.
   */
  evaluate(opts: {
    jobId: string;
    traceId: string;
    evidenceDir: string;
    finalState: ApplicationState;
    validationResult?: ValidationResult;
    healthScore?: number;
  }): TruthRecord {
    const proofs: ApplicationProof[] = [];
    const now = new Date().toISOString();

    // ── Proof 1: existing ValidationResult ────────────────────────────────
    if (opts.validationResult?.confirmed) {
      const method = opts.validationResult.method;
      const proofType = this.mapValidationMethod(method);
      if (proofType) {
        proofs.push({
          type: proofType,
          weight: PROOF_WEIGHTS[proofType],
          description: opts.validationResult.details,
          evidence: opts.validationResult.evidence ?? {},
          timestamp: now,
        });
      }
    }

    // ── Proof 2: network.json analysis ────────────────────────────────────
    const networkFile = path.join(opts.evidenceDir, 'network.json');
    if (fs.existsSync(networkFile)) {
      try {
        const net = JSON.parse(fs.readFileSync(networkFile, 'utf-8')) as NetworkRequest[];
        const hit = net.find(r =>
          r.isApplicationRelated &&
          r.method === 'POST' &&
          r.status >= 200 && r.status < 300 &&
          SUBMIT_ENDPOINT_PATTERNS.some(p => p.test(r.url))
        );
        if (hit && !proofs.some(p => p.type === 'network_submit_200')) {
          proofs.push({
            type: 'network_submit_200',
            weight: PROOF_WEIGHTS['network_submit_200'],
            description: `POST ${hit.url.slice(0, 80)} → HTTP ${hit.status}`,
            evidence: { url: hit.url, status: hit.status, timestamp: hit.timestamp },
            timestamp: hit.timestamp ?? now,
          });
        }
      } catch { /* corrupt network.json — skip */ }
    }

    // ── Proof 3: manifest (screenshot evidence) ────────────────────────────
    const manifestFile = path.join(opts.evidenceDir, 'manifest.json');
    if (fs.existsSync(manifestFile)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8')) as EvidenceManifest;
        if (manifest.screenshots.length > 0) {
          proofs.push({
            type: 'screenshot_exists',
            weight: PROOF_WEIGHTS['screenshot_exists'],
            description: `${manifest.screenshots.length} screenshot(s) captured`,
            evidence: { count: manifest.screenshots.length, files: manifest.screenshots.slice(0, 5) },
            timestamp: manifest.finishedAt ?? now,
          });
        }
      } catch { /* corrupt manifest — skip */ }
    }

    // ── Proof 4: trace.json with submit event ─────────────────────────────
    const traceFile = path.join(opts.evidenceDir, 'trace.json');
    if (fs.existsSync(traceFile)) {
      try {
        const trace = JSON.parse(fs.readFileSync(traceFile, 'utf-8')) as {
          events?: Array<{ step: string; result: string }>;
        };
        const hasSubmit = (trace.events ?? []).some(e =>
          (e.step.includes('submit') || e.step.includes('submitted')) && e.result !== 'error'
        );
        if (hasSubmit) {
          proofs.push({
            type: 'trace_complete',
            weight: PROOF_WEIGHTS['trace_complete'],
            description: 'trace.json contains successful submit event',
            evidence: { traceFile: 'trace.json' },
            timestamp: now,
          });
        }
      } catch { /* corrupt trace — skip */ }
    }

    // ── Proof 5: health check score ───────────────────────────────────────
    const healthFile = path.join(opts.evidenceDir, 'health-report.json');
    if (fs.existsSync(healthFile)) {
      try {
        const health = JSON.parse(fs.readFileSync(healthFile, 'utf-8')) as { score?: number };
        if ((health.score ?? 0) >= 80) {
          proofs.push({
            type: 'health_check_passed',
            weight: PROOF_WEIGHTS['health_check_passed'],
            description: `Health check score: ${health.score}/100`,
            evidence: { score: health.score },
            timestamp: now,
          });
        }
      } catch { /* corrupt health report — skip */ }
    } else if (opts.healthScore !== undefined && opts.healthScore >= 80) {
      proofs.push({
        type: 'health_check_passed',
        weight: PROOF_WEIGHTS['health_check_passed'],
        description: `Health check score: ${opts.healthScore}/100`,
        evidence: { score: opts.healthScore },
        timestamp: now,
      });
    }

    // ── Score and TruthStatus ─────────────────────────────────────────────
    const rawScore = proofs.reduce((sum, p) => sum + p.weight, 0);
    const validationScore = Math.min(100, rawScore);

    const hasHardProof = proofs.some(p => HARD_PROOFS.includes(p.type));
    const confidence = this.classifyTruthStatus(
      validationScore, hasHardProof, opts.finalState
    );

    const primaryProof = proofs
      .slice()
      .sort((a, b) => b.weight - a.weight)[0];

    const record: TruthRecord = {
      jobId:          opts.jobId,
      traceId:        opts.traceId,
      evaluatedAt:    now,
      confidence,
      validationScore,
      proofs,
      primaryProof,
      evidenceDir:    opts.evidenceDir,
      summary:        this.buildSummary(confidence, proofs, opts.finalState),
    };

    // Write truth-record.json into the evidence directory for post-hoc access
    try {
      if (fs.existsSync(opts.evidenceDir)) {
        fs.writeFileSync(
          path.join(opts.evidenceDir, 'truth-record.json'),
          JSON.stringify(record, null, 2),
          'utf-8',
        );
      }
    } catch { /* não bloquear o caller */ }

    return record;
  }

  /** Reads evidence from an existing directory (post-hoc, no ValidationResult). */
  evaluateFromDir(jobId: string, evidenceDir: string, finalState: ApplicationState = 'failed'): TruthRecord {
    return this.evaluate({
      jobId,
      traceId: `posthoc_${Date.now()}`,
      evidenceDir,
      finalState,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private mapValidationMethod(method: string): ProofType | null {
    switch (method) {
      case 'network_response':  return 'network_submit_200';
      case 'my_jobs_applied':   return 'my_jobs_applied';
      case 'page_transition':   return 'url_redirect';
      case 'confirmation_text': return 'confirmation_text';
      default:                  return null;
    }
  }

  private classifyTruthStatus(
    score: number,
    hasHardProof: boolean,
    finalState: ApplicationState,
  ): TruthStatus {
    // Hard proof + score ≥ 80 → VERIFIED
    if (hasHardProof && score >= VERIFIED_THRESHOLD) return 'VERIFIED';

    // Score ≥ 40 → PROBABLE (includes hard proofs that don't reach 80 alone)
    if (score >= PROBABLE_THRESHOLD) return 'PROBABLE';

    // Confirmed workflow + any positive evidence: workflow corroborates the evidence
    if (finalState === 'confirmed' && score > 0) return 'PROBABLE';

    // Explicit workflow failure states → REJECTED
    if (['failed', 'cancelled', 'blocked', 'timeout'].includes(finalState)) return 'REJECTED';

    // No evidence and no failure signal → UNKNOWN
    return 'UNKNOWN';
  }

  private buildSummary(
    confidence: TruthStatus,
    proofs: ApplicationProof[],
    finalState: ApplicationState,
  ): string {
    const proofNames = proofs.map(p => p.type).join(' + ');
    switch (confidence) {
      case 'VERIFIED':
        return `VERIFIED — objective evidence confirms submission. Proofs: [${proofNames}]`;
      case 'PROBABLE':
        return `PROBABLE — partial evidence. Proofs: [${proofNames}]. Final state: ${finalState}`;
      case 'REJECTED':
        return `REJECTED — no submission evidence found. Final state: ${finalState}`;
      case 'EXPIRED':
        return `EXPIRED — evidence no longer accessible. Final state: ${finalState}`;
      default:
        return `UNKNOWN — insufficient evidence. Final state: ${finalState}`;
    }
  }
}
