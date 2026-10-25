import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/services/authService.js';
import { emailSchema, passwordSchema } from '../src/validators/auth.schema.js';

const [emailArg, nameArg, passwordArg] = process.argv.slice(2);
const passwordInput = passwordArg || process.env.ADMIN_PASSWORD || '';

const run = async () => {
  const email = emailSchema.safeParse(emailArg);
  if (!email.success) {
    throw new Error('Usage: node scripts/createAdmin.js <email> "<Full Name>" [password]  (or set ADMIN_PASSWORD)');
  }
  const name = (nameArg || '').trim();
  if (!name) throw new Error('A name is required');

  const password = passwordSchema.safeParse(passwordInput);
  if (!password.success) throw new Error(password.error.issues[0].message);

  await connectDB();
  const passwordHash = await hashPassword(password.data);
  const existing = await User.findOne({ email: email.data });

  if (existing) {
    existing.set({ name, role: 'admin', active: true, approval: 'approved', passwordHash, failedLogins: 0, lockUntil: null });
    existing.tokenVersion += 1;
    await existing.save();
    console.log(`Updated existing user ${email.data}: role admin, approved, password reset, account unlocked`);
  } else {
    await User.create({ email: email.data, name, role: 'admin', approval: 'approved', passwordHash });
    console.log(`Created admin ${email.data}`);
  }

  await disconnectDB();
};

run().catch(async (err) => {
  console.error(err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});