// Single source of truth for slash-command definitions — used by both the
// one-time global/dev-guild registration script and the per-guild
// auto-registration that runs when an admin connects a new server.
export const SLASH_COMMANDS = [
  {
    name: 'report',
    description: 'Log a report with a short message',
    options: [
      {
        name: 'text',
        description: 'What are you reporting?',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'status',
    description: 'Check bot status',
  },
];
