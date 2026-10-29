// Creates (or resets) an admin account. Admins are never created through the public sign-up route.
//
//   ADMIN_USERNAME=alice ADMIN_PASSWORD='a long passphrase' MONGODB_URI=... npm run create-admin
//
// Optional: ADMIN_NICKNAME (defaults to the username).
// Re-running with an existing username resets that account's password and makes it an approved admin.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/user';
import { signUpSchema } from '../validators/user';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('Missing required environment variable: MONGODB_URI');

  // Same rules as the public sign-up route.
  const parsed = signUpSchema.safeParse({
    username: process.env.ADMIN_USERNAME,
    nickname: process.env.ADMIN_NICKNAME ?? process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      console.error(`${issue.path.map(String).join('.')}: ${issue.message}`);
    }
    process.exit(1);
  }

  const { username, nickname, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  await mongoose.connect(mongoUri);

  const admin = await User.findOneAndUpdate(
    { username },
    { $set: { nickname, passwordHash, role: 'admin' } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  );

  console.log(`Admin "${admin.username}" is ready.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
