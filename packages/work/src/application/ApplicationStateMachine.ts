// packages/work/src/application/ApplicationStateMachine.ts
// Enforces the application lifecycle state machine for a single job application.
// The transition topology (VALID_TRANSITIONS) is defined in the private implementation.

import {
  ApplicationState,
  StateTransition,
  TERMINAL_STATES,
} from './types.js';

export class ApplicationStateMachine {
  private state: ApplicationState = 'queued';
  private history: StateTransition[] = [];
  private stepStart = Date.now();

  constructor(
    readonly jobId: string,
    private onTransition?: (t: StateTransition) => void,
  ) {}

  getState(): ApplicationState { return this.state; }
  getHistory(): StateTransition[] { return [...this.history]; }
  isTerminal(): boolean { return (TERMINAL_STATES as readonly string[]).includes(this.state); }

  transition(to: ApplicationState, metadata?: Record<string, unknown>): void {
    // Transition validation delegates to the private VALID_TRANSITIONS topology.
    // Invalid transitions throw immediately rather than silently corrupting state.
    this.assertValidTransition(this.state, to);

    const now = Date.now();
    const t: StateTransition = {
      from: this.state,
      to,
      timestamp: new Date().toISOString(),
      durationMs: now - this.stepStart,
      metadata,
    };

    this.history.push(t);
    this.state = to;
    this.stepStart = now;
    this.onTransition?.(t);
  }

  tryTransition(to: ApplicationState, metadata?: Record<string, unknown>): boolean {
    try {
      this.transition(to, metadata);
      return true;
    } catch (err) {
      console.warn(String(err));
      return false;
    }
  }

  getDurationByStep(): Record<string, number> {
    return this.history.reduce<Record<string, number>>((acc, t) => {
      acc[t.from] = (acc[t.from] ?? 0) + t.durationMs;
      return acc;
    }, {});
  }

  // States with no outgoing transitions in any context (ADR-003 → [*] arrowheads).
  // TERMINAL_STATES is broader — it marks apply-flow completion, but 'confirmed'
  // and 'failed' still have career-lifecycle and retry paths respectively.
  private static readonly NO_OUTBOUND = new Set<ApplicationState>([
    'cancelled', 'blocked', 'timeout', 'already_applied', 'rejected', 'hired',
  ]);

  // Full transition topology is enforced in the private implementation.
  // This stub enforces the public contract: states with no outgoing transitions throw.
  private assertValidTransition(from: ApplicationState, to: ApplicationState): void {
    if (ApplicationStateMachine.NO_OUTBOUND.has(from)) {
      throw new Error(`Cannot transition from terminal state '${from}' to '${to}'`);
    }
    // Full VALID_TRANSITIONS topology enforced in the private build.
  }
}
