import { findByGuildId, upsertConfig } from '../repositories/server-config.repository.js';
import { registerGuildCommands } from '../utils/discord-commands.util.js';
import { getGuildTextChannels } from '../utils/discord-channel.util.js';
import { redactSecrets } from '../utils/redact.util.js';
import { AppError } from '../utils/app-error.util.js';

const DEFAULT_CONFIG = { commandToggles: {}, mirrorEnabled: true };

// Sensible default for an unconfigured guild: every command enabled,
// mirroring on. Returns a plain object either way. flattenMaps is required —
// without it, toObject() leaves commandToggles as a real Map instance, which
// JSON.stringify silently serializes to {} over HTTP.
export async function getConfig(guildId) {
  const doc = await findByGuildId(guildId);
  if (!doc) {
    return { guildId, ...DEFAULT_CONFIG };
  }
  return doc.toObject({ flattenMaps: true });
}

// Confirms the bot is actually a member of this guild before the admin can
// pick a channel — a raw Guild ID typed into a text field proves nothing on
// its own.
export async function validateGuildAndFetchChannels(guildId) {
  try {
    return await getGuildTextChannels(guildId);
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`Failed to fetch channels for guild ${guildId}:`, redactSecrets(detail));
    throw new AppError('Bot isn\'t in this server yet — click "Add Bot to Your Server" above first, then try again.', 404);
  }
}

export async function updateConfig(guildId, patch) {
  const existing = await findByGuildId(guildId);

  // Connecting a new guild requires a channel to be picked up front — never
  // save a bare guildId with nothing to actually post to.
  if (!existing && !patch.channelId) {
    throw new AppError('Select a channel before saving.', 400);
  }

  // First time this guild is being configured from the dashboard — register
  // guild-scoped slash commands so they work instantly, instead of relying
  // on global registration's up-to-~1hr propagation. Runs before the config
  // write so a failure here doesn't get silently masked by a "success" save;
  // commandsRegistered stays false, so the next save attempt retries it.
  if (!existing?.commandsRegistered) {
    try {
      await registerGuildCommands(guildId);
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`Failed to register slash commands for guild ${guildId}:`, redactSecrets(detail));
      throw new AppError('Could not register slash commands for this server — settings were not saved. Check the bot is added to this server and try again.', 502);
    }
  }

  const doc = await upsertConfig(guildId, { ...patch, commandsRegistered: true });
  return doc.toObject({ flattenMaps: true });
}
