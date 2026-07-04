import { verifyKey } from 'discord-interactions';
import env from '../config/env.js';

// Raw res.status().send() here instead of the app's ErrorResponse envelope —
// same intentional exception as the interactions controller: Discord doesn't
// read our response body on a rejected request, only the status code.
export async function verifyDiscordSignature(req, res, next) {
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');

  if (!signature || !timestamp) {
    return res.status(401).send('Missing signature headers');
  }

  const isValid = await verifyKey(req.body, signature, timestamp, env.discordPublicKey);

  if (!isValid) {
    return res.status(401).send('Invalid request signature');
  }

  return next();
}
