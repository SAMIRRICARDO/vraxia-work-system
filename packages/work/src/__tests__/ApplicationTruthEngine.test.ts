// packages/work/src/__tests__/ApplicationTruthEngine.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ApplicationTruthEngine } from '../application/ApplicationTruthEngine.js';
import type { ValidationResult, NetworkRequest } from '../application/types.js';

const engine = new ApplicationTruthEngine();

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'truth-test-'));
}

function writeJson(dir: string, file: string, data: unknown): void {
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data), 'utf-8');
}

describe('ApplicationTruthEngine', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('returns VERIFIED when network submit 200 proof exists', () => {
    const network: NetworkRequest[] = [{
      url: 'https://www.linkedin.com/voyager/api/jobs/1234/easyApplyApplications',
      method: 'POST',
      status: 200,
      timestamp: new Date().toISOString(),
      isApplicationRelated: true,
    }];
    writeJson(tmpDir, 'network.json', network);

    const result = engine.evaluate({
      jobId: 'job_abc',
      traceId: 'trc_test',
      evidenceDir: tmpDir,
      finalState: 'confirmed',
    });

    expect(result.confidence).toBe('VERIFIED');
    expect(result.validationScore).toBeGreaterThanOrEqual(50);
    expect(result.proofs.some(p => p.type === 'network_submit_200')).toBe(true);
    expect(result.primaryProof?.type).toBe('network_submit_200');
  });

  it('returns VERIFIED when ValidationResult has network_response method', () => {
    const validation: ValidationResult = {
      confirmed: true,
      method: 'network_response',
      confidence: 'high',
      details: 'POST /easyApplyApplications → 200',
      evidence: { url: 'https://linkedin.com/api/apply', status: 200 },
    };

    const result = engine.evaluate({
      jobId: 'job_net',
      traceId: 'trc_net',
      evidenceDir: tmpDir,
      finalState: 'confirmed',
      validationResult: validation,
    });

    expect(result.confidence).toBe('VERIFIED');
    expect(result.proofs.some(p => p.type === 'network_submit_200')).toBe(true);
  });

  it('returns PROBABLE when only confirmation_text proof exists', () => {
    const validation: ValidationResult = {
      confirmed: true,
      method: 'confirmation_text',
      confidence: 'medium',
      details: 'Application confirmed text detected',
    };

    const result = engine.evaluate({
      jobId: 'job_text',
      traceId: 'trc_text',
      evidenceDir: tmpDir,
      finalState: 'confirmed',
      validationResult: validation,
    });

    expect(result.confidence).toBe('PROBABLE');
    expect(result.validationScore).toBeGreaterThanOrEqual(25);
  });

  it('returns REJECTED when finalState is failed and no proofs', () => {
    const result = engine.evaluate({
      jobId: 'job_fail',
      traceId: 'trc_fail',
      evidenceDir: tmpDir,
      finalState: 'failed',
    });

    expect(result.confidence).toBe('REJECTED');
    expect(result.validationScore).toBe(0);
    expect(result.proofs).toHaveLength(0);
  });

  it('returns REJECTED when finalState is cancelled and no proofs', () => {
    const result = engine.evaluate({
      jobId: 'job_cancel',
      traceId: 'trc_cancel',
      evidenceDir: tmpDir,
      finalState: 'cancelled',
    });

    expect(result.confidence).toBe('REJECTED');
    expect(result.validationScore).toBe(0);
  });

  it('accumulates multiple proofs and returns VERIFIED', () => {
    // Network proof (hard proof → VERIFIED)
    const network: NetworkRequest[] = [{
      url: 'https://www.linkedin.com/jobs/easyApply',
      method: 'POST',
      status: 201,
      timestamp: new Date().toISOString(),
      isApplicationRelated: true,
    }];
    writeJson(tmpDir, 'network.json', network);

    // Screenshot
    fs.writeFileSync(path.join(tmpDir, 'step_submit.png'), 'fake-png');

    // Manifest
    writeJson(tmpDir, 'manifest.json', {
      screenshots: ['step_submit.png'],
      htmlCaptures: [],
      finalState: 'confirmed',
    });

    // Health
    writeJson(tmpDir, 'health-report.json', { score: 85 });

    const result = engine.evaluate({
      jobId: 'job_multi',
      traceId: 'trc_multi',
      evidenceDir: tmpDir,
      finalState: 'confirmed',
    });

    expect(result.proofs.length).toBeGreaterThanOrEqual(3);
    expect(result.confidence).toBe('VERIFIED');
  });

  it('writes truth-record.json to evidence directory', () => {
    const result = engine.evaluate({
      jobId: 'job_write',
      traceId: 'trc_write',
      evidenceDir: tmpDir,
      finalState: 'confirmed',
      validationResult: {
        confirmed: true,
        method: 'my_jobs_applied',
        confidence: 'high',
        details: 'Found in My Jobs',
      },
    });

    const recordPath = path.join(tmpDir, 'truth-record.json');
    expect(fs.existsSync(recordPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));
    expect(written.confidence).toBe(result.confidence);
  });

  it('evaluateFromDir works without ValidationResult', () => {
    writeJson(tmpDir, 'health-report.json', { score: 90 });

    const result = engine.evaluateFromDir('job_posthoc', tmpDir, 'confirmed');
    expect(result.jobId).toBe('job_posthoc');
    expect(['VERIFIED', 'PROBABLE', 'UNKNOWN']).toContain(result.confidence);
  });

  it('has correct summary text for VERIFIED and REJECTED status', () => {
    const verified = engine.evaluate({
      jobId: 'j',
      traceId: 't',
      evidenceDir: tmpDir,
      finalState: 'confirmed',
      validationResult: {
        confirmed: true,
        method: 'network_response',
        confidence: 'high',
        details: 'ok',
      },
    });
    expect(verified.summary).toContain('VERIFIED');

    const rejected = engine.evaluate({
      jobId: 'j2',
      traceId: 't2',
      evidenceDir: tmpDir,
      finalState: 'failed',
    });
    expect(rejected.summary).toContain('REJECTED');
  });

  // ApplicationState.confirmed (workflow complete) does NOT imply TruthStatus.VERIFIED.
  // Workflow state and evidence verdict are independent columns in the dashboard.
  it('returns PROBABLE (not VERIFIED) for confirmed workflow with only partial evidence', () => {
    const validation: ValidationResult = {
      confirmed: true,
      method: 'page_transition',
      confidence: 'medium',
      details: 'redirect to /my-items',
    };

    const result = engine.evaluate({
      jobId: 'job_partial',
      traceId: 'trc_partial',
      evidenceDir: tmpDir,
      finalState: 'confirmed',
      validationResult: validation,
    });

    // No hard proof → not VERIFIED. Confirmed workflow + redirect evidence → PROBABLE.
    expect(result.confidence).toBe('PROBABLE');
    expect(result.confidence).not.toBe('VERIFIED');
  });

  it('health score alone (without hard proof) returns PROBABLE not VERIFIED', () => {
    writeJson(tmpDir, 'health-report.json', { score: 95 });

    const result = engine.evaluate({
      jobId: 'job_health',
      traceId: 'trc_health',
      evidenceDir: tmpDir,
      finalState: 'confirmed',
    });

    // health_check_passed weight (20) < PROBABLE_THRESHOLD (40), but confirmed
    // workflow + any positive evidence → PROBABLE.
    expect(['PROBABLE', 'UNKNOWN']).toContain(result.confidence);
    expect(result.confidence).not.toBe('VERIFIED');
    expect(result.confidence).not.toBe('REJECTED');
  });
});
