import { InteractionType, InteractionResponseType } from 'discord-interactions';

export function buildInteractionResponse(interaction) {
  if (interaction.type === InteractionType.PING) {
    return { type: InteractionResponseType.PONG };
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    return { type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE };
  }

  return null;
}
