import mongoose from 'mongoose';

const { Schema } = mongoose;

const serverConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String },
    commandToggles: { type: Map, of: Boolean, default: {} },
    mirrorEnabled: { type: Boolean, default: true },
    // Set once guild-scoped slash commands have been successfully
    // registered for this guild — gates re-registering on every save.
    commandsRegistered: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'server-configs' },
);

export default mongoose.model('ServerConfig', serverConfigSchema);
