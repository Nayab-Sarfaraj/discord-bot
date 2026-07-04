import mongoose from 'mongoose';

const { Schema } = mongoose;

const serverConfigSchema = new Schema(
  {
    guildId: { type: String, required: true, unique: true },
    commandToggles: { type: Map, of: Boolean, default: {} },
    mirrorEnabled: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'server-configs' },
);

export default mongoose.model('ServerConfig', serverConfigSchema);
