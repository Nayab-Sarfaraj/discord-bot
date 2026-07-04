import { buildInteractionResponse } from '../services/interaction.service.js';
import { asyncHandler } from '../utils/async-handler.util.js';

// Discord requires the exact { type, data } shape here, not the app's
// SuccessResponse/ErrorResponse envelope.
export const handleInteraction = asyncHandler(async (req, res) => {
  const interaction = JSON.parse(req.body.toString('utf8'));
  const response = buildInteractionResponse(interaction);

  if (!response) {
    return res.status(400).json({ error: 'Unhandled interaction type' });
  }

  return res.json(response);
});
