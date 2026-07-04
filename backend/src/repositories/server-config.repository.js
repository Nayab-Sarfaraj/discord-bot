import ServerConfig from '../models/server-config.model.js';

export async function findByGuildId(guildId) {
  return ServerConfig.findOne({ guildId });
}

// Goes through the document instance API rather than a raw
// findOneAndUpdate replacement document — Mongoose's Map schema type
// doesn't cast correctly when a plain object is passed as a top-level
// field in a non-operator (replacement-style) update. Also merges
// individual toggle keys rather than replacing the whole map, so
// updating one command's toggle doesn't wipe out others.
export async function upsertConfig(guildId, patch) {
  let doc = await ServerConfig.findOne({ guildId });
  if (!doc) {
    doc = new ServerConfig({ guildId });
  }

  if (patch.channelId) {
    doc.channelId = patch.channelId;
  }

  if (patch.commandToggles) {
    for (const [name, enabled] of Object.entries(patch.commandToggles)) {
      doc.commandToggles.set(name, enabled);
    }
  }

  if (typeof patch.mirrorEnabled === 'boolean') {
    doc.mirrorEnabled = patch.mirrorEnabled;
  }

  if (typeof patch.commandsRegistered === 'boolean') {
    doc.commandsRegistered = patch.commandsRegistered;
  }

  return doc.save();
}
