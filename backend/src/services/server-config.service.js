import { findByGuildId, upsertConfig } from '../repositories/server-config.repository.js';

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

export async function updateConfig(guildId, patch) {
  const doc = await upsertConfig(guildId, patch);
  return doc.toObject({ flattenMaps: true });
}
