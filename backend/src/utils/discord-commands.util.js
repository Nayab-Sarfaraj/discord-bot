import axios from 'axios';
import env from '../config/env.js';
import { SLASH_COMMANDS } from '../constants/discord-commands.js';

const DISCORD_API = 'https://discord.com/api/v10';

// Guild-scoped registration is instant (unlike global, which can take up to
// ~1hr to propagate) — used both by the one-time dev script and whenever an
// admin connects a new server via the dashboard, so commands work
// immediately there rather than waiting on global propagation.
export async function registerGuildCommands(guildId) {
  const url = `${DISCORD_API}/applications/${env.discordApplicationId}/guilds/${guildId}/commands`;
  await axios.put(url, SLASH_COMMANDS, {
    headers: {
      Authorization: `Bot ${env.discordBotToken}`,
      'Content-Type': 'application/json',
    },
  });
}
