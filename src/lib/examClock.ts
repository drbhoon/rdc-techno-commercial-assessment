/**
 * The exam clock, which counts only while the candidate is actually sitting
 * the paper.
 *
 * Anchoring the clock to the start time is simple but wrong for the thing this
 * has to survive: a power cut at minute 20 took 25 minutes off a 55-minute
 * paper while nobody was even looking at it. So time is ACCRUED instead. The
 * attempt carries how much has been used, and a marker for when the current
 * sitting began; closing the page ends that sitting and reopening the link
 * starts another. The balance is what is left of the 55 minutes.
 *
 * Two things stop this becoming an open-ended exam:
 *
 *   - Unobserved time is capped. The page reports in every half minute; when
 *     those reports stop — the tab closed, the laptop died — at most
 *     UNOBSERVED_GRACE_MS of the silence is counted as time spent. That is
 *     enough to cover a missed report or two without charging somebody for an
 *     hour of being disconnected.
 *   - The attempt still expires two hours after it began, however little of
 *     the 55 minutes has been used. Otherwise a candidate could pause on
 *     question one and come back tomorrow having thought about it.
 */
export const EXAM_DURATION_MS = 55 * 60 * 1000;
export const SESSION_WINDOW_MS = 2 * 60 * 60 * 1000;
/**
 * How much silence counts as time spent.
 *
 * Reports arrive every 30 seconds, so when they stop the candidate was sitting
 * the paper for somewhere between nothing and one missed report. 45 seconds
 * covers that without charging anybody minutes for a disconnection: a power
 * cut costs at most three quarters of a minute of exam time.
 */
export const UNOBSERVED_GRACE_MS = 45 * 1000;

export interface ClockState {
  startedAt: string;
  /** Exam time used in earlier sittings, in milliseconds. */
  timeSpentMs?: number;
  /** When the current sitting began; null or absent when the candidate is away. */
  activeSince?: string | null;
}

function parse(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/** Exam time used so far, including the sitting in progress. */
export function usedMs(clock: ClockState, now = Date.now()): number {
  const banked = Math.max(0, clock.timeSpentMs ?? 0);
  const since = parse(clock.activeSince ?? null);
  if (since === null) return banked;
  return banked + Math.min(Math.max(0, now - since), UNOBSERVED_GRACE_MS);
}

/** What the candidate has left, in milliseconds. Never negative. */
export function remainingMs(clock: ClockState, now = Date.now()): number {
  return Math.max(0, EXAM_DURATION_MS - usedMs(clock, now));
}

/** True once the attempt is over: the exam time is gone, or the two hours are. */
export function isSpent(clock: ClockState, now = Date.now()): boolean {
  if (remainingMs(clock, now) <= 0) return true;
  const startedAt = parse(clock.startedAt);
  if (startedAt === null) return true;
  return now - startedAt > SESSION_WINDOW_MS;
}

/**
 * Bank the sitting that is running and say whether one is still open.
 *
 * `active` decides what happens next: true keeps the clock running (the
 * candidate is here, and this is a report or a saved answer), false pauses it
 * (they have gone, or the paper is submitted).
 */
export function accrue<T extends ClockState>(clock: T, active: boolean, now = Date.now()): T {
  const since = parse(clock.activeSince ?? null);
  let banked = Math.max(0, clock.timeSpentMs ?? 0);
  if (since !== null) {
    // Only the observed part of the gap is charged; the rest is time the
    // candidate spent disconnected, which is exactly what must not cost them.
    banked += Math.min(Math.max(0, now - since), UNOBSERVED_GRACE_MS);
  }
  return {
    ...clock,
    timeSpentMs: Math.min(banked, EXAM_DURATION_MS),
    activeSince: active ? new Date(now).toISOString() : null,
  };
}
