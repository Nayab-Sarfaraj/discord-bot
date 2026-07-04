import { buildInteractionResponse } from '../services/interaction.service.js';
import { interactionSchema } from '../validators/interaction.validator.js';
import { asyncHandler } from '../utils/async-handler.util.js';

function logTiming(req, label) {
  const elapsed = Date.now() - req.requestInAt;
  console.log(`[timing] interaction ${label} request-in=${req.requestInAt} elapsed=${elapsed}ms`);
}

// Discord requires the exact { type, data } shape here, not the app's
// SuccessResponse/ErrorResponse envelope.
export const handleInteraction = asyncHandler(async (req, res) => {
  const raw = JSON.parse(req.body.toString('utf8'));
  const parsed = interactionSchema.safeParse(raw);

  if (!parsed.success) {
    logTiming(req, 'malformed');
    return res.status(400).json({ error: 'Malformed interaction payload' });
  }

  const response = await buildInteractionResponse(parsed.data);

  if (!response) {
    logTiming(req, 'unhandled-type');
    return res.status(400).json({ error: 'Unhandled interaction type' });
  }

  const label = parsed.data.data?.name ? `/${parsed.data.data.name}` : `type-${parsed.data.type}`;
  logTiming(req, label);
  return res.json(response);
});
