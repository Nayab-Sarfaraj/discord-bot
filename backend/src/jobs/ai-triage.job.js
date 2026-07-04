import axios from 'axios';
import env from '../config/env.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT =
  'You triage short user-submitted reports. Reply with strict JSON only, no prose: ' +
  '{"summary": "<one short sentence>", "category": "<one of: bug, feature, question, other>"}.';

export async function processAiTriage(job) {
  const { commandText } = job.data;

  if (!env.groqApiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }
  if (!commandText) {
    throw new Error('No command text to triage');
  }

  const response = await axios.post(
    GROQ_API_URL,
    {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: commandText },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    },
    { headers: { Authorization: `Bearer ${env.groqApiKey}` } },
  );

  const parsed = JSON.parse(response.data.choices[0].message.content);
  return { summary: parsed.summary, category: parsed.category };
}
