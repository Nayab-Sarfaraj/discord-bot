import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import { upsertAdmin } from '../src/repositories/admin.repository.js';
import { redactSecrets } from '../src/utils/redact.util.js';

const SALT_ROUNDS = 10;

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running this script');
  }

  await connectDB();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const admin = await upsertAdmin(email, passwordHash);

  console.log(`Seeded admin: ${admin.email}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Failed to seed admin:', redactSecrets(err.message));
  process.exit(1);
});
