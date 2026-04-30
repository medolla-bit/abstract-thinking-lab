'use strict';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Use POST.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return json(500, { error: 'Missing OPENAI_API_KEY in Netlify environment variables.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const mode = body.mode === 'poem' ? 'poem' : 'deepen';
  const model = process.env.OPENAI_MODEL || 'gpt-5';

  const instructions = [
    'You are a warm, precise poetry coach for students.',
    'The activity personifies abstract nouns and explores what they taste like, feel like, sound like, how they move, and what they would say.',
    'Respond directly to the student writing. Do not use generic praise.',
    'Keep language classroom-safe, vivid, and concise.',
    mode === 'poem'
      ? 'Transform the student writing into a short free-verse poem of 6 to 10 lines. Preserve the student imagery and wording when possible. Do not explain the poem.'
      : 'Ask exactly one deeper question that helps the student add sensory detail, personification, or a surprising metaphor. Include one brief observation about a strong word or image from their writing.'
  ].join('\n');

  const dialogue = Array.isArray(body.dialogue) ? body.dialogue.slice(-8) : [];
  const dialogueText = dialogue.map((msg) => {
    const role = msg && msg.role === 'ai' ? 'OpenAI' : 'Student';
    return `${role}: ${String((msg && msg.text) || '').slice(0, 1000)}`;
  }).join('\n');

  const input = [
    `Noun: ${body.noun || 'abstract noun'}`,
    `Noun tagline: ${body.tagline || ''}`,
    `Sensory lens: ${body.sense || ''}`,
    `Prompt: ${body.prompt || ''}`,
    `Guide: ${body.guide || ''}`,
    dialogueText ? `Recent dialogue:\n${dialogueText}` : '',
    `Current student writing:\n${String(body.writing || '').slice(0, 4000)}`
  ].filter(Boolean).join('\n\n');

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        instructions,
        input
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const message = data && data.error && data.error.message ? data.error.message : 'OpenAI request failed.';
      return json(response.status, { error: message });
    }

    return json(200, { text: data.output_text || extractOutputText(data) || '' });
  } catch (err) {
    return json(500, { error: err.message || 'OpenAI request failed.' });
  }
};

function extractOutputText(data) {
  if (!data || !Array.isArray(data.output)) return '';
  return data.output
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((part) => part.type === 'output_text' && part.text)
    .map((part) => part.text)
    .join('\n');
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}
