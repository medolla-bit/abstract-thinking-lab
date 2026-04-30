'use strict';

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Use POST.' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return json(400, { error: 'Invalid JSON body.' });
  }

  const action = String(body.action || '').toLowerCase();

  try {
    if (action === 'create') return await createSession(body);
    if (action === 'join' || action === 'list') return await listSession(body);
    if (action === 'submit') return await submitResponse(body);
    if (action === 'summary') return await createClassWriting(body, 'summary');
    if (action === 'poem') return await createClassWriting(body, 'poem');
    return json(400, { error: 'Unknown class session action.' });
  } catch (err) {
    return json(500, { error: err.message || 'Class session request failed.' });
  }
};

async function createSession(body) {
  if (supabaseEnabled()) return await createSessionSupabase(body);

  const store = await sessionStore();
  let code;
  let meta;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    code = generateCode();
    meta = sessionMeta(code, body);

    const existing = await getJson(store, metaKey(code));
    if (existing) {
      code = '';
      continue;
    }

    await store.setJSON(metaKey(code), meta);
    break;
  }

  if (!code) return json(500, { error: 'Could not create a unique session code.' });
  return json(200, { code, meta, responses: [] });
}

async function listSession(body) {
  const code = normalizeCode(body.code);
  if (!code) return json(400, { error: 'Missing session code.' });

  const data = await readSession(code);
  if (!data.meta) return json(404, { error: 'Session not found.' });
  return json(200, data);
}

async function submitResponse(body) {
  const code = normalizeCode(body.code);
  const name = clean(body.name, 40);
  const writing = clean(body.writing, 5000);
  if (!code) return json(400, { error: 'Missing session code.' });
  if (!name) return json(400, { error: 'Add a student name or initials.' });
  if (!writing) return json(400, { error: 'Write a response before submitting.' });

  if (supabaseEnabled()) return await submitResponseSupabase(body, { code, name, writing });

  const store = await sessionStore();
  const data = await readSession(code);
  if (!data.meta) return json(404, { error: 'Session not found.' });

  const now = new Date().toISOString();
  const response = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name,
    writing,
    noun: clean(body.noun, 80) || data.meta.noun,
    sense: clean(body.sense, 40) || data.meta.sense,
    prompt: clean(body.prompt, 240) || data.meta.prompt,
    createdAt: now
  };

  await store.setJSON(responseKey(code, response.id), response, { onlyIfNew: true });
  const updated = await readSession(code);
  return json(200, updated);
}

async function createClassWriting(body, kind) {
  if (!process.env.OPENAI_API_KEY) {
    return json(500, { error: 'Missing OPENAI_API_KEY in Netlify environment variables.' });
  }

  const code = normalizeCode(body.code);
  if (!code) return json(400, { error: 'Missing session code.' });

  const data = await readSession(code);
  if (!data.meta) return json(404, { error: 'Session not found.' });
  if (!data.responses.length) return json(400, { error: 'No student responses have been recorded yet.' });

  const model = process.env.OPENAI_MODEL || 'gpt-5';
  const students = data.responses.map((item) => item.name).filter(Boolean);
  const responseText = data.responses.map((item, index) => {
    return [
      `Response ${index + 1}`,
      `Student: ${item.name || 'Student'}`,
      `Lens: ${item.sense || data.meta.sense || ''}`,
      `Writing: ${item.writing || ''}`
    ].join('\n');
  }).join('\n\n');

  const instructions = classInstructions(kind);
  const input = [
    `Class session code: ${code}`,
    `Abstract noun: ${data.meta.noun || ''}`,
    `Noun tagline: ${data.meta.tagline || ''}`,
    `Prompt: ${data.meta.prompt || ''}`,
    `Guide: ${data.meta.guide || ''}`,
    `Student names available for shoutouts: ${students.join(', ')}`,
    `Student responses:\n${responseText.slice(0, 18000)}`
  ].join('\n\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, instructions, input })
  });

  const result = await response.json();
  if (!response.ok) {
    const message = result && result.error && result.error.message ? result.error.message : 'OpenAI request failed.';
    return json(response.status, { error: message });
  }

  return json(200, {
    code,
    meta: data.meta,
    responses: data.responses,
    text: result.output_text || extractOutputText(result) || ''
  });
}

function classInstructions(kind) {
  const shared = [
    'You are helping a teacher synthesize a class set of student responses about personified abstract nouns.',
    'Use students as the source of truth. Preserve their concrete sensory images, surprising metaphors, and exact phrases when possible.',
    'Be warm, specific, and classroom-safe.',
    'Do not rank students. Do not invent contributions for students who are not in the response list.'
  ];

  if (kind === 'poem') {
    return shared.concat([
      'Create one class poem in free verse.',
      'Target about 80 percent student language and imagery, with about 20 percent AI polishing for rhythm, compression, transitions, and clarity.',
      'Keep the poem between 10 and 18 lines unless the class responses are very short.',
      'Do not explain the poem.',
      'End with a brief credit line naming students whose phrases or images visibly shaped the poem.'
    ]).join('\n');
  }

  return shared.concat([
    'Write a concise class summary in 2 to 4 short paragraphs.',
    'Name students whose responses added clear value to the collective thinking, and say what image, phrase, contrast, or insight they contributed.',
    'Celebrate the class as a group without generic praise.',
    'End with one sentence that captures the collective understanding the class built together.'
  ]).join('\n');
}

async function readSession(code) {
  if (supabaseEnabled()) return await readSessionSupabase(code);

  const store = await sessionStore();
  const meta = await getJson(store, metaKey(code));
  if (!meta) return { code, meta: null, responses: [] };

  const list = await store.list({ prefix: responsePrefix(code) });
  const responses = [];
  for (const item of list.blobs || []) {
    const response = await getJson(store, item.key);
    if (response) responses.push(response);
  }
  responses.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

  return { code, meta, responses };
}

async function createSessionSupabase(body) {
  const supabase = await supabaseAdmin();
  let code = '';
  let meta = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    code = generateCode();
    meta = sessionMeta(code, body);

    const { error } = await supabase
      .from('class_sessions')
      .insert(dbSession(meta));

    if (!error) return json(200, { code, meta, responses: [] });
    if (error.code === '23505') {
      code = '';
      continue;
    }
    throw new Error(error.message || 'Could not create Supabase session.');
  }

  if (!code) return json(500, { error: 'Could not create a unique session code.' });
  return json(200, { code, meta, responses: [] });
}

async function submitResponseSupabase(body, cleaned) {
  const data = await readSessionSupabase(cleaned.code);
  if (!data.meta) return json(404, { error: 'Session not found.' });

  const supabase = await supabaseAdmin();
  const now = new Date().toISOString();
  const response = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: cleaned.name,
    writing: cleaned.writing,
    noun: clean(body.noun, 80) || data.meta.noun,
    sense: clean(body.sense, 40) || data.meta.sense,
    prompt: clean(body.prompt, 240) || data.meta.prompt,
    createdAt: now
  };

  const { error } = await supabase
    .from('class_responses')
    .insert(dbResponse(cleaned.code, response));

  if (error) throw new Error(error.message || 'Could not record response.');

  const updated = await readSessionSupabase(cleaned.code);
  return json(200, updated);
}

async function readSessionSupabase(code) {
  const supabase = await supabaseAdmin();
  const sessionResult = await supabase
    .from('class_sessions')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (sessionResult.error) throw new Error(sessionResult.error.message || 'Could not load session.');
  if (!sessionResult.data) return { code, meta: null, responses: [] };

  const responsesResult = await supabase
    .from('class_responses')
    .select('*')
    .eq('session_code', code)
    .order('created_at', { ascending: true });

  if (responsesResult.error) throw new Error(responsesResult.error.message || 'Could not load responses.');

  return {
    code,
    meta: sessionFromDb(sessionResult.data),
    responses: (responsesResult.data || []).map(responseFromDb)
  };
}

async function getJson(store, key) {
  return await store.get(key, { type: 'json', consistency: 'strong' });
}

function sessionMeta(code, body) {
  return {
    code,
    createdAt: new Date().toISOString(),
    noun: clean(body.noun, 80) || 'Abstract noun',
    tagline: clean(body.tagline, 180),
    image: clean(body.image, 200),
    sense: clean(body.sense, 40),
    prompt: clean(body.prompt, 240),
    guide: clean(body.guide, 300)
  };
}

function dbSession(meta) {
  return {
    code: meta.code,
    created_at: meta.createdAt,
    noun: meta.noun,
    tagline: meta.tagline,
    image: meta.image,
    sense: meta.sense,
    prompt: meta.prompt,
    guide: meta.guide
  };
}

function dbResponse(code, response) {
  return {
    id: response.id,
    session_code: code,
    created_at: response.createdAt,
    name: response.name,
    writing: response.writing,
    noun: response.noun,
    sense: response.sense,
    prompt: response.prompt
  };
}

function sessionFromDb(row) {
  return {
    code: row.code,
    createdAt: row.created_at,
    noun: row.noun || '',
    tagline: row.tagline || '',
    image: row.image || '',
    sense: row.sense || '',
    prompt: row.prompt || '',
    guide: row.guide || ''
  };
}

function responseFromDb(row) {
  return {
    id: row.id,
    name: row.name || '',
    writing: row.writing || '',
    noun: row.noun || '',
    sense: row.sense || '',
    prompt: row.prompt || '',
    createdAt: row.created_at
  };
}

function supabaseEnabled() {
  return Boolean(process.env.SUPABASE_URL && serviceRoleKey());
}

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
}

let supabasePromise;
async function supabaseAdmin() {
  if (!supabasePromise) {
    supabasePromise = import('@supabase/supabase-js').then(({ createClient }) => {
      return createClient(process.env.SUPABASE_URL, serviceRoleKey(), {
        auth: { persistSession: false }
      });
    });
  }
  return supabasePromise;
}

let storePromise;
async function sessionStore() {
  if (!storePromise) {
    storePromise = import('@netlify/blobs').then(({ getStore }) => getStore('abstract-thinking-class-sessions'));
  }
  return storePromise;
}

function metaKey(code) {
  return `sessions/${code}/meta.json`;
}

function responsePrefix(code) {
  return `sessions/${code}/responses/`;
}

function responseKey(code, id) {
  return `${responsePrefix(code)}${id}.json`;
}

function generateCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  return code;
}

function normalizeCode(code) {
  return clean(code, 12).replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function clean(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

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
