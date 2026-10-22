import { Schema, model } from 'mongoose';
import {
  NICKNAME_MAX,
  NICKNAME_MIN,
  NICKNAME_REGEX,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_REGEX,
} from '../validators/user';

export const USER_ROLES = ['admin', 'partner', 'guest', 'pending_approval'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser {
  username: string;
  nickname: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters`],
      maxlength: [USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters`],
      match: [USERNAME_REGEX, 'Username may only contain letters, numbers, and underscores'],
    },
    nickname: {
      type: String,
      required: [true, 'Nickname is required'],
      trim: true,
      minlength: [NICKNAME_MIN, 'Nickname is required'],
      maxlength: [NICKNAME_MAX, `Nickname must be at most ${NICKNAME_MAX} characters`],
      match: [NICKNAME_REGEX, 'Nickname contains invalid characters'],
    },
    // bcrypt hash. Never returned by queries unless you explicitly .select('+passwordHash').
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: [...USER_ROLES],
      required: true,
      default: 'pending_approval', // every new account starts here until an admin approves it
    },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);

export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
  role: UserRole;
}

// The only shape of a user that should ever leave the server. Works for hydrated and lean docs.
export function toPublicUser(user: {
  _id: { toString(): string };
  username: string;
  nickname: string;
  role: UserRole;
}): PublicUser {
  return {
    id: user._id.toString(),
    username: user.username,
    nickname: user.nickname,
    role: user.role,
  };
}
