import { z } from 'zod';

// Field rules. The Mongoose schema imports these too, so both layers always agree.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_REGEX = /^[a-z0-9_]+$/; // applied after lowercasing

export const NICKNAME_MIN = 1;
export const NICKNAME_MAX = 32;
export const NICKNAME_REGEX = /^[^\p{Cc}]+$/u; // anything except control characters (unicode and emoji are fine)

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX_BYTES = 72; // bcrypt silently ignores everything past 72 bytes

const withinPasswordByteLimit = (value: string) => Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES;

const PASSWORD_TOO_LONG = `Password is too long (max ${PASSWORD_MAX_BYTES} bytes; non-ASCII characters count for more than one)`;

// Usernames are trimmed and lowercased so "Alice" and "alice" are the same account.
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`)
  .max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`)
  .regex(USERNAME_REGEX, 'Username may only contain letters, numbers, and underscores');

export const nicknameSchema = z
  .string()
  .trim()
  .min(NICKNAME_MIN, 'Nickname is required')
  .max(NICKNAME_MAX, `Nickname must be at most ${NICKNAME_MAX} characters`)
  .regex(NICKNAME_REGEX, 'Nickname contains invalid characters');

// Length matters more than composition rules, so only a minimum length is enforced.
// Passwords are NOT trimmed: leading/trailing spaces are legitimate password characters.
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
  .refine(withinPasswordByteLimit, PASSWORD_TOO_LONG);

// zod strips unknown keys by default, so a client can never smuggle in `role` or `isAdmin`.
export const signUpSchema = z.object({
  username: usernameSchema,
  nickname: nicknameSchema,
  password: passwordSchema,
});

// Login deliberately does not re-apply the strength rules, only sanity checks.
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Username is required').max(USERNAME_MAX),
  password: z.string().min(1, 'Password is required').refine(withinPasswordByteLimit, PASSWORD_TOO_LONG),
});

// Admin: approving a pending user means choosing which role they get.
export const approveUserSchema = z.object({
  role: z.enum(['partner', 'guest']),
});

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user id'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ApproveUserInput = z.infer<typeof approveUserSchema>;
