import Admin from '../models/admin.model.js';

export async function findByEmail(email) {
  return Admin.findOne({ email: email.toLowerCase() });
}

export async function upsertAdmin(email, passwordHash) {
  return Admin.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), passwordHash },
    { upsert: true, new: true },
  );
}
