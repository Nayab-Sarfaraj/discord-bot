import axios from 'axios';
import env from '../config/env.js';
import { getChannelName, getGuildName } from '../utils/discord-channel.util.js';

const COMMAND_META = {
  report: { emoji: '📋', color: '#ECB22E' }, // Slack "warning" amber — needs a look
  status: { emoji: '📡', color: '#2EB67D' }, // Slack "good" green — informational
};
const DEFAULT_META = { emoji: '🔔', color: '#616061' };

function buildBlocks({ commandName, commandText, username, guildName, channelName }) {
  const { emoji } = COMMAND_META[commandName] ?? DEFAULT_META;
  const nowEpoch = Math.floor(Date.now() / 1000);

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} /${commandName}`, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Server*\n${guildName}` },
        { type: 'mrkdwn', text: `*Channel*\n#${channelName}` },
        { type: 'mrkdwn', text: `*User*\n${username ?? 'unknown'}` },
      ],
    },
    commandText
      ? { type: 'divider' }
      : null,
    commandText
      ? {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Report*\n>${commandText}` },
        }
      : null,
    {
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `<!date^${nowEpoch}^{date_short_pretty} at {time}|just now>` },
      ],
    },
  ].filter(Boolean);
}

export async function processSlackNotify(job) {
  const { commandName, commandText, username, guildId, channelId } = job.data;

  if (!env.slackWebhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL not configured');
  }

  const [guildName, channelName] = await Promise.all([getGuildName(guildId), getChannelName(channelId)]);
  const { color } = COMMAND_META[commandName] ?? DEFAULT_META;

  await axios.post(env.slackWebhookUrl, {
    username: 'Command Bot',
    icon_emoji: ':robot_face:',
    // No top-level `text` — with attachments present it would render as its
    // own redundant line above the styled blocks. `fallback` below covers
    // mobile push/notification previews without showing up in the channel.
    attachments: [
      {
        color,
        fallback: `/${commandName} run by ${username ?? 'unknown'} in ${guildName} #${channelName}`,
        blocks: buildBlocks({ commandName, commandText, username, guildName, channelName }),
      },
    ],
  });
}
