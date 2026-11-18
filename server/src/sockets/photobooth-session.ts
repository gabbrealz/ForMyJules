import type { PublicUser } from '../models/user';
import type { BoothConfigPatchInput } from '../validators/photobooth';
import {
  BOOTH_DEFAULT_FRAME_COLOR,
  BOOTH_INTERVAL_MS,
  BOOTH_LAYOUT_SHOTS,
  BOOTH_MAX_FINAL_SHARES,
  BOOTH_MAX_MEMBERS,
  BOOTH_MAX_STILL_ATTEMPTS_PER_SHOT,
  BOOTH_START_LEAD_MS,
  BOOTH_STILL_EARLY_TOLERANCE_MS,
  type BoothIntervalId,
  type BoothLayoutId,
} from './photobooth.constants';
import type {
  BoothConfig,
  BoothDeniedReason,
  BoothFinal,
  BoothImageMime,
  BoothRole,
  BoothRound,
  BoothState,
  BoothStep,
} from './photobooth.types';

// The one shared photobooth session. This file is pure state and rules: no sockets, no timers, no
// logging. The socket feature (photobooth.ts) feeds it requests and broadcasts the result.
//
// Rules, from the plan:
// - Members are kept in join order. The leader is the earliest-joined ACTIVE member.
// - Joining while a round is in progress puts you in 'waiting' until the round ends.
// - Everyone present leaving resets the session.

export type Result = { ok: true } | { ok: false; reason: BoothDeniedReason };
export type JoinResult =
  | { ok: true; fresh: boolean }
  | { ok: false; reason: 'full' | 'already_joined' };

const OK: Result = { ok: true };
const deny = (reason: BoothDeniedReason): Result => ({ ok: false, reason });

interface MemberRecord {
  id: number;
  userId: string;
  name: string;
  role: BoothRole;
  status: 'active' | 'waiting';
  ready: boolean;
  /** Stills this member has sent this round (retries included). Capped, so nobody can flood the leader. */
  stillAttempts: number;
}

const defaultConfig = (): BoothConfig => ({
  layoutId: null,
  scene: 'separate-cells',
  intervalId: 'five',
  removeBackground: false,
  filterId: 'none',
  frameColor: BOOTH_DEFAULT_FRAME_COLOR,
});

/** Number of shots whose capture time is at or before `at`, counted from the round's current timeline. */
function elapsedShots(round: BoothRound, at: number): number {
  return Math.max(0, Math.floor((at - round.startAt) / round.intervalMs));
}

export class BoothSession {
  private readonly now: () => number;

  private version = 0;
  private step: BoothStep = 1;
  private members: MemberRecord[] = [];
  private config: BoothConfig = defaultConfig();
  private round: BoothRound | null = null;
  private final: BoothFinal | null = null;
  private finalBytes: Buffer | null = null;
  private finalSeq = 0; // never reset, so a final id is never reused
  private finalShares = 0;

  /** `now` is the server clock in ms (the same clock clients sync to). */
  constructor(now: () => number) {
    this.now = now;
  }

  // --- Queries -----------------------------------------------------------------------------

  get currentVersion(): number {
    return this.version;
  }

  toState(): BoothState {
    return {
      v: this.version,
      step: this.step,
      leaderId: this.leaderId(),
      members: this.members.map(({ id, name, role, status, ready }) => ({
        id,
        name,
        role,
        status,
        ready,
      })),
      config: { ...this.config },
      round: this.round ? { ...this.round, roster: [...this.round.roster] } : null,
      final: this.final ? { ...this.final, save: { ...this.final.save } } : null,
    };
  }

  leaderId(): number | null {
    return this.leader()?.id ?? null;
  }

  isMember(id: number): boolean {
    return this.members.some((m) => m.id === id);
  }

  memberIds(): number[] {
    return this.members.map((m) => m.id);
  }

  isLeader(id: number): boolean {
    return this.leaderId() === id;
  }

  isActiveMember(id: number): boolean {
    return this.members.some((m) => m.id === id && m.status === 'active');
  }

  /** Both ends of a WebRTC connection must be active members. */
  canSignal(from: number, to: number): boolean {
    if (from === to) return false;
    const a = this.members.find((m) => m.id === from);
    const b = this.members.find((m) => m.id === to);
    return a?.status === 'active' && b?.status === 'active';
  }

  /** Active members taking part in the current round, minus `except`. They get the final image. */
  finalRecipientIds(except: number): number[] {
    return this.members
      .filter((m) => m.status === 'active' && m.id !== except)
      .map((m) => m.id);
  }

  canReceiveFinal(id: number): boolean {
    return this.members.some((m) => m.id === id && m.status === 'active');
  }

  finalImage(): { meta: BoothFinal; bytes: Buffer } | null {
    if (!this.final || !this.finalBytes) return null;
    return { meta: this.final, bytes: this.finalBytes };
  }

  /** The unfinished save claim, if any. The feature uses it to time the claim out. */
  saveClaim(): { finalId: number; by: number } | null {
    if (this.final?.save.status !== 'saving' || this.final.save.by === null) return null;
    return { finalId: this.final.id, by: this.final.save.by };
  }

  // --- Membership --------------------------------------------------------------------------

  join(id: number, user: PublicUser): JoinResult {
    // One place per person: a second tab or device is refused rather than double-counted.
    const existing = this.members.find((m) => m.userId === user.id);
    if (existing) {
      return existing.id === id ? { ok: true, fresh: false } : { ok: false, reason: 'already_joined' };
    }
    if (this.members.length >= BOOTH_MAX_MEMBERS) return { ok: false, reason: 'full' };

    this.members.push({
      id,
      userId: user.id,
      name: user.nickname,
      role: user.role === 'admin' || user.role === 'partner' ? user.role : 'guest',
      status: this.round === null ? 'active' : 'waiting',
      ready: false,
      stillAttempts: 0,
    });
    this.bump();
    return { ok: true, fresh: true };
  }

  leave(id: number): void {
    const index = this.members.findIndex((m) => m.id === id);
    if (index === -1) return;

    const wasLeader = this.leaderId() === id;
    const [gone] = this.members.splice(index, 1);

    if (this.members.length === 0) {
      this.reset();
      return;
    }

    // A save that was in progress by the person who left is released, so someone else can do it.
    if (this.final?.save.status === 'saving' && this.final.save.by === id) {
      this.final = { ...this.final, save: { status: 'none', by: null } };
    }

    if (this.round) {
      this.round = { ...this.round, roster: this.round.roster.filter((r) => r !== id) };

      if (wasLeader) {
        // Stills only live in the leader's memory, so a round without a shared final image is lost
        // and gets retaken by the next leader. Once the final image has been shared everyone
        // already has it, so the round carries on and only the leadership changes.
        if (!this.final) this.resetRound();
      } else if (gone.status === 'active' && this.step === 3 && this.round.status === 'running') {
        this.stopRound();
      }
    }

    this.bump();
  }

  setReady(id: number, ready: boolean): Result {
    const member = this.members.find((m) => m.id === id);
    if (!member) return deny('not_member');
    if (member.ready !== ready) {
      member.ready = ready;
      this.bump();
    }
    return OK;
  }

  // --- Leader controls ---------------------------------------------------------------------

  patchConfig(id: number, patch: BoothConfigPatchInput): Result {
    const leader = this.requireLeader(id);
    if (!leader.ok) return leader;

    // Once the countdown has started only the frame colour may change, and only at the frame step.
    if (this.round !== null) {
      const frameColourOnly = Object.keys(patch).every((key) => key === 'frameColor');
      if (!frameColourOnly || this.round.status !== 'complete') return deny('locked');
    }

    const next: BoothConfig = { ...this.config, ...patch };
    if (next.scene === 'one-scene') next.removeBackground = true; // cutouts are required to layer people

    const changed = (Object.keys(next) as (keyof BoothConfig)[]).some(
      (key) => next[key] !== this.config[key],
    );
    if (changed) {
      this.config = next;
      this.bump();
    }
    return OK;
  }

  go(id: number, step: BoothStep): Result {
    const leader = this.requireLeader(id);
    if (!leader.ok) return leader;

    if (this.round !== null) {
      if (step === 4 && this.round.status === 'complete') return OK;
      // The frame step is reachable only once every shot has been taken.
      if (step === 4 && this.shotsTaken() >= this.round.shots) {
        this.round = { ...this.round, status: 'complete', taken: this.round.shots };
        this.step = 4;
        this.bump();
        return OK;
      }
      return deny('locked'); // mid-round the leader uses stop / continue / retake instead
    }

    if (step === 4) return deny('bad_step');
    if (step >= 2 && this.config.layoutId === null) return deny('no_layout');
    if (step !== this.step) {
      this.step = step;
      this.bump();
    }
    return OK;
  }

  start(id: number): Result {
    const leader = this.requireLeader(id);
    if (!leader.ok) return leader;
    if (this.round !== null) return deny('locked');
    if (this.step !== 3) return deny('bad_step');

    const shots = this.config.layoutId
      ? BOOTH_LAYOUT_SHOTS[this.config.layoutId as BoothLayoutId]
      : undefined;
    const intervalMs = BOOTH_INTERVAL_MS[this.config.intervalId as BoothIntervalId];
    if (!shots || !intervalMs) return deny('no_layout');

    const active = this.members.filter((m) => m.status === 'active');
    if (!active.every((m) => m.ready)) return deny('not_ready');

    for (const member of this.members) member.stillAttempts = 0;
    this.finalShares = 0;
    this.round = {
      status: 'running',
      shots,
      intervalMs,
      startAt: this.now() + BOOTH_START_LEAD_MS,
      firstShot: 0,
      stoppedAt: null,
      taken: null,
      roster: active.map((m) => m.id),
    };
    this.bump();
    return OK;
  }

  stop(id: number): Result {
    const leader = this.requireLeader(id);
    if (!leader.ok) return leader;
    if (this.round?.status !== 'running') return deny('no_round');

    this.stopRound();
    this.bump();
    return OK;
  }

  /** After a stop: restart the timeline for the shots that do not exist yet. */
  continue(id: number): Result {
    const leader = this.requireLeader(id);
    if (!leader.ok) return leader;

    const round = this.round;
    if (round?.status !== 'stopped' || round.taken === null) return deny('no_round');
    if (round.taken >= round.shots) return deny('bad_step'); // nothing left to take: go to the frame step

    const active = this.members.filter((m) => m.status === 'active');
    if (!active.every((m) => m.ready)) return deny('not_ready');

    this.round = {
      ...round,
      status: 'running',
      startAt: this.now() + BOOTH_START_LEAD_MS,
      firstShot: round.taken,
      stoppedAt: null,
      taken: null,
      roster: active.map((m) => m.id),
    };
    this.bump();
    return OK;
  }

  /** Throws away the round's shots and final image: back to step 3, ready to start again. */
  retake(id: number): Result {
    const leader = this.requireLeader(id);
    if (!leader.ok) return leader;
    if (this.round === null) return deny('no_round');

    this.resetRound();
    this.bump();
    return OK;
  }

  /** From the frame step, back to step 1 for another round. The settings are kept. */
  newRound(id: number): Result {
    const leader = this.requireLeader(id);
    if (!leader.ok) return leader;
    if (this.round?.status !== 'complete') return deny('bad_step');

    this.resetRound();
    this.step = 1;
    this.bump();
    return OK;
  }

  /** Keeps the leader's final image in memory (never on disk) so members can fetch it again. */
  setFinal(id: number, mime: BoothImageMime, bytes: Buffer): Result {
    const leader = this.requireLeader(id);
    if (!leader.ok) return leader;
    if (this.round?.status !== 'complete') return deny('bad_step');
    if (this.final && this.final.save.status !== 'none') return deny('busy'); // being saved, or saved
    if (this.finalShares >= BOOTH_MAX_FINAL_SHARES) return deny('limit');

    this.finalSeq += 1;
    this.finalShares += 1;
    this.final = { id: this.finalSeq, mime, size: bytes.length, save: { status: 'none', by: null } };
    this.finalBytes = Buffer.from(bytes); // copy: `bytes` is a view into the received frame
    this.bump();
    return OK;
  }

  // --- Saving to the gallery (once) --------------------------------------------------------

  /** Whoever claims first does the save. The actual upload happens over HTTP, outside this class. */
  claimSave(id: number): Result {
    const member = this.members.find((m) => m.id === id);
    if (!member || member.status !== 'active') return deny('not_member');
    if (member.role !== 'admin' && member.role !== 'partner') return deny('cannot_save');
    if (!this.final) return deny('no_final');
    if (this.final.save.status === 'saved') return deny('already_saved');
    if (this.final.save.status === 'saving') return deny('busy');

    this.final = { ...this.final, save: { status: 'saving', by: id } };
    this.bump();
    return OK;
  }

  finishSave(id: number): Result {
    if (this.final?.save.status !== 'saving' || this.final.save.by !== id) return deny('not_found');
    this.final = { ...this.final, save: { status: 'saved', by: id } };
    this.bump();
    return OK;
  }

  failSave(id: number): Result {
    if (this.final?.save.status !== 'saving' || this.final.save.by !== id) return deny('not_found');
    this.final = { ...this.final, save: { status: 'none', by: null } };
    this.bump();
    return OK;
  }

  /** Called when a claim has been open too long. Does nothing if it has moved on since. */
  expireSave(finalId: number, by: number): void {
    const claim = this.saveClaim();
    if (claim?.finalId !== finalId || claim.by !== by) return;
    this.final = { ...this.final!, save: { status: 'none', by: null } };
    this.bump();
  }

  // --- Stills ------------------------------------------------------------------------------

  /**
   * Whether `id` may send a still for `shot` right now, and counts the attempt. The shot must
   * already exist on the server's timeline (or have been scheduled before the stop cut-off), so
   * shots scheduled after a stop are refused here. The leader never sends stills over the socket.
   */
  checkStill(id: number, shot: number): Result {
    const member = this.members.find((m) => m.id === id);
    const round = this.round;
    if (!member) return deny('not_member');
    if (!round || round.status === 'complete') return deny('no_round');
    if (member.status !== 'active' || !round.roster.includes(id)) return deny('not_member');
    if (this.leaderId() === id) return deny('bad_step');
    if (shot >= round.shots) return deny('bad_step');

    const existing =
      round.status === 'running'
        ? Math.min(
            round.shots,
            round.firstShot + elapsedShots(round, this.now() + BOOTH_STILL_EARLY_TOLERANCE_MS),
          )
        : (round.taken ?? 0);
    if (shot >= existing) return deny('bad_step');

    if (member.stillAttempts >= round.shots * BOOTH_MAX_STILL_ATTEMPTS_PER_SHOT) {
      return deny('limit');
    }
    member.stillAttempts += 1;
    return OK;
  }

  // --- Internals ---------------------------------------------------------------------------

  private bump(): void {
    this.version += 1;
  }

  private leader(): MemberRecord | undefined {
    return this.members.find((m) => m.status === 'active') ?? this.members[0];
  }

  private requireLeader(id: number): Result {
    if (!this.members.some((m) => m.id === id)) return deny('not_member');
    return this.leaderId() === id ? OK : deny('not_leader');
  }

  /** How many shots exist right now (indexes 0..n-1). */
  private shotsTaken(): number {
    const round = this.round;
    if (!round) return 0;
    if (round.status === 'running') {
      return Math.min(round.shots, round.firstShot + elapsedShots(round, this.now()));
    }
    return round.taken ?? round.shots;
  }

  /** The server decides the cut-off: shots scheduled after this moment do not exist. */
  private stopRound(): void {
    const round = this.round;
    if (round?.status !== 'running') return;

    const stoppedAt = this.now();
    const taken = Math.min(round.shots, round.firstShot + elapsedShots(round, stoppedAt));
    this.round = { ...round, status: 'stopped', stoppedAt, taken };
  }

  /** Back to "no round": drops the round and final image, promotes waiting members, lands on step 3. */
  private resetRound(): void {
    this.round = null;
    this.final = null;
    this.finalBytes = null;
    this.finalShares = 0;
    this.step = 3;
    for (const member of this.members) {
      member.stillAttempts = 0;
      if (member.status === 'waiting') {
        member.status = 'active';
        member.ready = false;
      }
    }
  }

  /** Everyone has left. */
  private reset(): void {
    this.members = [];
    this.config = defaultConfig();
    this.step = 1;
    this.resetRound();
    this.step = 1;
    this.bump();
  }
}
