import axios from 'axios';
import env from '../config/env.js';

const DISCORD_API = 'https://discord.com/api/v10';
const GUILD_TEXT_CHANNEL_TYPE = 0;

// Real validation gate, unlike getChannelName below — throws on failure so
// the caller can tell the admin the bot isn't actually in that server yet,
// rather than silently accepting an unverified guild ID.
export async function getGuildTextChannels(guildId) {
  const res = await axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${env.discordBotToken}` },
  });

  return res.data
    .filter((channel) => channel.type === GUILD_TEXT_CHANNEL_TYPE)
    .map((channel) => ({ id: channel.id, name: channel.name }));
}

// Channel/guild names rarely change; cache to avoid re-hitting Discord's API
// (and its rate limits) for every command from the same channel/server.
// Worker process is long-lived, so this persists across jobs.
const channelNameCache = new Map();
const guildNameCache = new Map();

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

export async function getGuildName(guildId) {
  if (!guildId) return null;
  if (guildNameCache.has(guildId)) return guildNameCache.get(guildId);

  try {
    const res = await axios.get(`${DISCORD_API}/guilds/${guildId}`, {
      headers: { Authorization: `Bot ${env.discordBotToken}` },
    });
    const name = res.data.name ?? guildId;
    guildNameCache.set(guildId, name);
    return name;
  } catch {
    // Cosmetic lookup only — never fail the mirror job over it.
    return guildId;
  }
}
