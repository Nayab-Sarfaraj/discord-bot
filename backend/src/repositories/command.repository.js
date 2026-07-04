import Command from '../models/command.model.js';

export async function createCommand(data) {
  return Command.create(data);
}

export async function findByInteractionId(interactionId) {
  return Command.findOne({ interactionId });
}

export async function updateMirrorStatus(interactionId, mirrorStatus) {
  return Command.findOneAndUpdate({ interactionId }, { mirrorStatus }, { new: true });
}

export async function updateAiTriage(interactionId, patch) {
  return Command.findOneAndUpdate({ interactionId }, patch, { new: true });
}

export async function listCommands({ page = 1, limit = 50 } = {}) {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Command.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Command.countDocuments(),
  ]);

  return { items, total, page, limit };
}
