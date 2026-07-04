import mongoose from 'mongoose';

const { Schema } = mongoose;

const commandSchema = new Schema(
  {
    interactionId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    channelId: { type: String },
    userId: { type: String },
    username: { type: String },
    commandName: { type: String, required: true },
    commandText: { type: String },
    status: {
      type: String,
      enum: ['received', 'processed', 'failed'],
      default: 'received',
    },
    mirrorStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
    },
    aiStatus: {
      type: String,
      enum: ['pending', 'done', 'failed', 'skipped'],
      default: 'skipped',
    },
    aiSummary: { type: String },
    aiCategory: { type: String },
  },
  { timestamps: true, collection: 'commands' },
);

export default mongoose.model('Command', commandSchema);
