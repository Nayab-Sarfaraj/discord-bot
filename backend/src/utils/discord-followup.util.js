import axios from 'axios';
import env from '../config/env.js';

const DISCORD_API = 'https://discord.com/api/v10';

// Interaction tokens are valid ~15 min for editing the original response —
// comfortably enough for a worker-processed AI triage job to land within.
export async function editOriginalInteractionResponse(interactionToken, content) {
  const url = `${DISCORD_API}/webhooks/${env.discordApplicationId}/${interactionToken}/messages/@original`;
  await axios.patch(url, { content });
}
