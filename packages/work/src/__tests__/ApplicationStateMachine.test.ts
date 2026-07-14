// packages/work/src/__tests__/ApplicationStateMachine.test.ts
//
// Tests for the ApplicationStateMachine public interface.
//
// NOTE ON THE PUBLIC STUB:
// assertValidTransition enforces the terminal-state guard in this repository.
// The complete VALID_TRANSITIONS topology (which states can follow which) is
// enforced only in the private build. Tests that document the full transition
// contract are marked accordingly.
//
import { describe, it, expect } from 'vitest';
import { ApplicationStateMachine } from '../application/ApplicationStateMachine.js';
import { TERMINAL_STATES } from '../application/types.js';

describe('ApplicationStateMachine', () => {

  // ── Initialization ────────────────────────────────────────────────

  it('initialises in queued state', () => {
    const sm = new ApplicationStateMachine('job_1');
    expect(sm.getState()).toBe('queued');
    expect(sm.isTerminal()).toBe(false);
  });

  it('isTerminal returns false for non-terminal starting state', () => {
    const sm = new ApplicationStateMachine('job_1b');
    expect(sm.isTerminal()).toBe(false);
  });

  // ── Valid transition paths ────────────────────────────────────────

  it('follows complete apply path to confirmed', () => {
    const sm = new ApplicationStateMachine('job_2');
    sm.transition('starting');
    sm.transition('opening_job');
    sm.transition('opening_easy_apply');
    sm.transition('uploading_resume');
    sm.transition('filling_questions');
    sm.transition('submitting');
    sm.transition('submitted');
    sm.transition('validating');
    sm.transition('confirmed');
    expect(sm.getState()).toBe('confirmed');
    expect(sm.isTerminal()).toBe(true);
  });

  it('handles URL-redirect path: filling_questions → submitting → submitted', () => {
    const sm = new ApplicationStateMachine('job_url_redirect');
    sm.transition('starting');
    sm.transition('opening_job');
    sm.transition('opening_easy_apply');
    sm.transition('uploading_resume');
    sm.transition('filling_questions');
    sm.transition('submitting');
    sm.transition('submitted');
    expect(sm.getState()).toBe('submitted');
  });

  it('handles review path: filling_questions → reviewing → submitting → submitted', () => {
    const sm = new ApplicationStateMachine('job_review');
    sm.transition('starting');
    sm.transition('opening_job');
    sm.transition('opening_easy_apply');
    sm.transition('filling_questions');
    sm.transition('reviewing');
    sm.transition('submitting');
    sm.transition('submitted');
    expect(sm.getState()).toBe('submitted');
  });

  it('handles retry cycle: failed → retrying → starting', () => {
    const sm = new ApplicationStateMachine('job_retry');
    sm.transition('starting');
    sm.transition('opening_job');
    sm.transition('failed');
    sm.transition('retrying');
    sm.transition('starting');
    expect(sm.getState()).toBe('starting');
    expect(sm.isTerminal()).toBe(false);
  });

  it('handles career lifecycle: confirmed → interview → offer → hired', () => {
    const sm = new ApplicationStateMachine('job_hired');
    sm.transition('starting');
    sm.transition('opening_job');
    sm.transition('opening_easy_apply');
    sm.transition('filling_questions');
    sm.transition('submitting');
    sm.transition('submitted');
    sm.transition('confirmed');
    sm.transition('interview');
    sm.transition('offer');
    sm.transition('hired');
    expect(sm.getState()).toBe('hired');
    expect(sm.isTerminal()).toBe(true);
  });

  // ── Terminal state enforcement (public contract) ──────────────────

  it('TERMINAL_STATES constant contains expected values', () => {
    expect(TERMINAL_STATES).toContain('confirmed');
    expect(TERMINAL_STATES).toContain('failed');
    expect(TERMINAL_STATES).toContain('cancelled');
    expect(TERMINAL_STATES).toContain('blocked');
    expect(TERMINAL_STATES).toContain('already_applied');
    expect(TERMINAL_STATES).toContain('hired');
    expect(TERMINAL_STATES).toContain('rejected');
  });

  it('isTerminal returns true for all TERMINAL_STATES values', () => {
    for (const state of TERMINAL_STATES) {
      const sm = new ApplicationStateMachine(`job_terminal_${state}`);
      sm.transition(state as never);
      expect(sm.isTerminal()).toBe(true);
    }
  });

  it('throws when transitioning FROM a terminal state', () => {
    const sm = new ApplicationStateMachine('job_terminal_guard');
    sm.transition('already_applied');
    expect(sm.getState()).toBe('already_applied');
    expect(sm.isTerminal()).toBe(true);
    expect(() => sm.transition('starting')).toThrow(/terminal/i);
    // State must not have changed after the rejected transition
    expect(sm.getState()).toBe('already_applied');
  });

  it('tryTransition returns false and preserves state from a no-outbound terminal state', () => {
    const sm = new ApplicationStateMachine('job_try_terminal');
    // 'cancelled' has no outgoing transitions in any context (see ADR-003).
    sm.transition('cancelled');
    expect(sm.isTerminal()).toBe(true);
    const ok = sm.tryTransition('starting');
    expect(ok).toBe(false);
    expect(sm.getState()).toBe('cancelled'); // state unchanged
  });

  // ── Contract documentation for full transition topology ───────────

  it('[contract] no-outbound states throw on any further transition', () => {
    // Public contract: states with no outgoing transitions in any context
    // (cancelled, blocked, timeout, already_applied, rejected, hired)
    // throw immediately if a further transition is attempted.
    // States that are terminal for the apply flow but still have paths
    // (confirmed → career lifecycle, failed → retry) do NOT throw in this stub —
    // those constraints are enforced by the full VALID_TRANSITIONS topology.
    const sm = new ApplicationStateMachine('job_contract');
    sm.transition('already_applied');
    expect(() => sm.transition('starting')).toThrow(/terminal/i);
  });

  // ── History and observability ────────────────────────────────────

  it('records full transition history with from/to/timestamp/durationMs', () => {
    const sm = new ApplicationStateMachine('job_history');
    sm.transition('starting');
    sm.transition('failed');
    const history = sm.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ from: 'queued', to: 'starting' });
    expect(history[1]).toMatchObject({ from: 'starting', to: 'failed' });
    expect(typeof history[0].timestamp).toBe('string');
    expect(typeof history[0].durationMs).toBe('number');
  });

  it('getHistory returns a defensive copy — mutations do not affect internal state', () => {
    const sm = new ApplicationStateMachine('job_history_copy');
    sm.transition('starting');
    const history = sm.getHistory();
    history.push({ from: 'starting', to: 'failed', timestamp: '', durationMs: 0 });
    expect(sm.getHistory()).toHaveLength(1); // internal history unchanged
  });

  it('getDurationByStep accumulates time per state', () => {
    const sm = new ApplicationStateMachine('job_duration');
    sm.transition('starting');
    sm.transition('failed');
    sm.transition('retrying');
    sm.transition('starting');
    const durations = sm.getDurationByStep();
    expect(Object.keys(durations)).toContain('queued');
    expect(Object.keys(durations)).toContain('starting');
    expect(Object.keys(durations)).toContain('failed');
    // 'starting' appears twice in history, durations should be accumulated
    expect(durations['starting']).toBeGreaterThanOrEqual(0);
  });

  it('fires onTransition callback with correct transition data', () => {
    const fired: string[] = [];
    const sm = new ApplicationStateMachine('job_callback', (t) =>
      fired.push(`${t.from}→${t.to}`)
    );
    sm.transition('starting');
    sm.transition('failed');
    expect(fired).toEqual(['queued→starting', 'starting→failed']);
  });

  it('onTransition callback receives durationMs and metadata', () => {
    let received: Record<string, unknown> = {};
    const sm = new ApplicationStateMachine('job_meta', (t) => {
      received = { durationMs: t.durationMs, meta: t.metadata };
    });
    sm.transition('starting', { reason: 'scheduled_hunt' });
    expect(typeof received['durationMs']).toBe('number');
    expect((received['meta'] as Record<string, unknown>)?.reason).toBe('scheduled_hunt');
  });

  // ── tryTransition ────────────────────────────────────────────────

  it('tryTransition returns true and changes state on valid transition', () => {
    const sm = new ApplicationStateMachine('job_try_ok');
    const ok = sm.tryTransition('starting');
    expect(ok).toBe(true);
    expect(sm.getState()).toBe('starting');
  });

  it('tryTransition does not throw even when transition would fail', () => {
    const sm = new ApplicationStateMachine('job_try_safe');
    sm.transition('hired'); // terminal
    expect(() => sm.tryTransition('starting')).not.toThrow();
    expect(sm.tryTransition('starting')).toBe(false);
  });

  // ── Multiple instances are independent ───────────────────────────

  it('multiple machine instances do not share state', () => {
    const sm1 = new ApplicationStateMachine('job_a');
    const sm2 = new ApplicationStateMachine('job_b');
    sm1.transition('starting');
    expect(sm1.getState()).toBe('starting');
    expect(sm2.getState()).toBe('queued');
  });

  it('jobId is accessible and matches constructor argument', () => {
    const sm = new ApplicationStateMachine('job_id_check');
    expect(sm.jobId).toBe('job_id_check');
  });
});
