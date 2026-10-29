import bcrypt from 'bcryptjs';
import { User, toPublicUser, type PublicUser } from '../models/user';
import type { LoginInput, SignUpInput } from '../validators/user';

const BCRYPT_COST = 12;

// Compared against when the username doesn't exist, so "unknown user" and "wrong password"
// take about the same time and can't be told apart by timing.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', BCRYPT_COST);

const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === 11000;

export type SignUpResult = { ok: true; user: PublicUser } | { ok: false; reason: 'username_taken' };

export type VerifyCredentialsResult =
  | { ok: true; user: PublicUser }
  | { ok: false; reason: 'invalid_credentials' | 'pending_approval' };

/**
 * Creates the account as "pending_approval". No session is involved; an admin has to approve it first.
 */
export async function signUp({ username, nickname, password }: SignUpInput): Promise<SignUpResult> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    const user = await User.create({ username, nickname, passwordHash, role: 'pending_approval' });
    return { ok: true, user: toPublicUser(user) };
  } catch (err) {
    // The unique index is the source of truth, so two simultaneous signups can't both succeed.
    if (isDuplicateKeyError(err)) return { ok: false, reason: 'username_taken' };
    throw err;
  }
}

/**
 * Checks username + password. Does not touch the session; that's the controller's job.
 */
export async function verifyCredentials({
  username,
  password,
}: LoginInput): Promise<VerifyCredentialsResult> {
  const user = await User.findOne({ username }).select('+passwordHash');
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) return { ok: false, reason: 'invalid_credentials' };

  // Only someone who proved they know the password gets told the account is pending.
  if (user.role === 'pending_approval') return { ok: false, reason: 'pending_approval' };

  return { ok: true, user: toPublicUser(user) };
}
