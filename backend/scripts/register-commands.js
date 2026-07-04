import axios from 'axios';
import env from '../src/config/env.js';
import { redactSecrets } from '../src/utils/redact.util.js';

const DISCORD_API = 'https://discord.com/api/v10';

const commands = [
  {
    name: 'report',
    description: 'Log a report with a short message',
    options: [
      {
        name: 'text',
        description: 'What are you reporting?',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'status',
    description: 'Check bot status',
  },
];

async function registerCommands() {
  const headers = {
    Authorization: `Bot ${env.discordBotToken}`,
    'Content-Type': 'application/json',
  };

  if (env.discordGuildId) {
    const guildUrl = `${DISCORD_API}/applications/${env.discordApplicationId}/guilds/${env.discordGuildId}/commands`;
    await axios.put(guildUrl, commands, { headers });
    console.log(`Registered ${commands.length} guild-scoped commands (instant) for guild ${env.discordGuildId}`);
  } else {
    console.log('Skipping guild-scoped registration: DISCORD_GUILD_ID not set');
  }

  const globalUrl = `${DISCORD_API}/applications/${env.discordApplicationId}/commands`;
  await axios.put(globalUrl, commands, { headers });
  console.log('Registered global commands — allow up to 1hr to propagate to all servers');
}

registerCommands().catch((err) => {
  const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
  console.error('Failed to register commands:', redactSecrets(detail));
  process.exit(1);
});
