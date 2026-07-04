import { verifyKey } from 'discord-interactions';
import env from '../config/env.js';

export function verifyDiscordSignature(req, res, next) {
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');

  if (!signature || !timestamp) {
    return res.status(401).send('Missing signature headers');
  }

  const isValid = verifyKey(req.body, signature, timestamp, env.discordPublicKey);

  if (!isValid) {
    return res.status(401).send('Invalid request signature');
  }

  return next();
}
