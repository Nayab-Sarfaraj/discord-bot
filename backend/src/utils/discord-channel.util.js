import axios from 'axios';
import env from '../config/env.js';

const DISCORD_API = 'https://discord.com/api/v10';

// Channel names rarely change; cache to avoid re-hitting Discord's API (and
// its rate limits) for every command from the same channel. Worker process
// is long-lived, so this persists across jobs.
const channelNameCache = new Map();

export async function getChannelName(channelId) {
  if (!channelId) return null;
  if (channelNameCache.has(channelId)) return channelNameCache.get(channelId);

  try {
    const res = await axios.get(`${DISCORD_API}/channels/${channelId}`, {
      headers: { Authorization: `Bot ${env.discordBotToken}` },
    });
    const name = res.data.name ?? channelId;
    channelNameCache.set(channelId, name);
    return name;
  } catch {
    // Cosmetic lookup only — never fail the mirror job over it.
    return channelId;
  }
}
