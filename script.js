'use strict';

var SENSES = [
  {
    key: 'taste',
    label: 'Taste',
    question: function(noun) { return 'What does ' + noun.word.toLowerCase() + ' taste like?'; },
    guide: 'Use flavor as metaphor: bitter, metallic, honeyed, stale, smoky, bright, or hard to swallow.'
  },
  {
    key: 'feel',
    label: 'Feel',
    question: function(noun) { return 'What does ' + noun.word.toLowerCase() + ' feel like?'; },
    guide: 'Give it texture, temperature, weight, pressure, or a place in the body.'
  },
  {
    key: 'sound',
    label: 'Sound',
    question: function(noun) { return 'What does ' + noun.word.toLowerCase() + ' sound like?'; },
    guide: 'Listen for rhythm, silence, echo, volume, interruption, or the sound it makes entering a room.'
  },
  {
    key: 'motion',
    label: 'Motion',
    question: function(noun) { return 'How does ' + noun.word.toLowerCase() + ' move?'; },
    guide: 'Let it creep, stumble, soar, knock, curl, wait, reach, drag, or stand its ground.'
  },
  {
    key: 'voice',
    label: 'Voice',
    question: function(noun) { return 'If ' + noun.word.toLowerCase() + ' could speak, what would it say?'; },
    guide: 'Write one line in its voice. Let it reveal what it wants, hides, protects, or cannot admit.'
  }
];

var NOUNS = [
  ['ambition', 'Ambition', 'reaches beyond where it stands'],
  ['anger', 'Anger', 'rises to the surface from something deeper'],
  ['belonging', 'Belonging', 'finds its place within the tapestry of connection'],
  ['boredom', 'Boredom', 'attention circles when nothing catches'],
  ['chaos', 'Chaos', 'moves without direction'],
  ['confidence', 'Confidence', 'stands firm on its inner foundation'],
  ['courage', 'Courage', 'steps forward while fear pulls back'],
  ['creativity', 'Creativity', 'shapes what does not yet exist'],
  ['curiosity', 'Curiosity', 'asks questions the world did not know to answer'],
  ['determination', 'Determination', 'carries effort farther than strength alone'],
  ['empathy', 'Empathy', 'holds the pain of another'],
  ['fairness', 'Fairness', 'seeks balance, even when it is difficult'],
  ['fear', 'Fear', 'protects, but can make the world shrink'],
  ['forgiveness', 'Forgiveness', 'releases resentment, freeing the spirit'],
  ['freedom', 'Freedom', 'opens space, but requires responsibility'],
  ['friendship', 'Friendship', 'shares warmth, a constant in all weather'],
  ['grief', 'Grief', 'stays with what the world has taken'],
  ['honesty', 'Honesty', 'reveals what was kept hidden'],
  ['hope', 'Hope', 'lights the darkest places'],
  ['insecurity', 'Insecurity', 'fractured by self-doubt, cowers in the shadows'],
  ['jealousy', 'Jealousy', 'reaches for what it cannot unlock'],
  ['joy', 'Joy', 'finds its way through the smallest openings'],
  ['kindness', 'Kindness', 'gives without needing to be seen'],
  ['loneliness', 'Loneliness', 'feels big when everything else feels far away'],
  ['love', 'Love', 'holds what it is willing to give away'],
  ['loyalty', 'Loyalty', 'holds fast when leaving would be easier'],
  ['patience', 'Patience', 'waits while holding itself steady for the right time'],
  ['peace', 'Peace', 'settles even when the world is not still'],
  ['pride', 'Pride', 'rises above but cannot see below'],
  ['regret', 'Regret', 'holds on to what was as time carries it away'],
  ['respect', 'Respect', 'makes space so something else can be heard'],
  ['responsibility', 'Responsibility', 'carries more than it shows, even when it feels too heavy'],
  ['sadness', 'Sadness', 'releases what the heart cannot hold'],
  ['trust', 'Trust', 'the quiet hand that holds, never letting go'],
  ['wisdom', 'Wisdom', 'endures until understanding settles']
].map(function(item) {
  return {
    id: item[0],
    word: item[1],
    tagline: item[2],
    img: 'images1/' + item[0] + '.jpeg'
  };
});

var SPARKS = {
  taste: ['salt on a bitten lip', 'honey after smoke', 'cold metal', 'a peel too bitter to finish', 'rainwater in a chipped cup'],
  feel: ['velvet over a bruise', 'stone warmed by sun', 'paper about to tear', 'a thread pulled tight', 'water held in both hands'],
  sound: ['a door closing softly', 'glass humming before it breaks', 'a spoon against an empty bowl', 'footsteps in a hall', 'a match being struck'],
  motion: ['a kite testing the string', 'a river changing its mind', 'a candle leaning toward air', 'a clock losing patience', 'roots moving under soil'],
  voice: ['I am not what you first thought.', 'Hold me lightly.', 'Listen before you name me.', 'I arrived before the words did.', 'I changed shape to get here.']
};

var S = {
  nounIdx: null,
  senseIdx: null,
  hintVisible: false,
  started: false,
  dialogue: [],
  classSession: {
    code: '',
    meta: null,
    responses: [],
    output: ''
  },
  live: {
    enabled: false,
    loading: false,
    client: null,
    channel: null
  }
};

function el(id) { return document.getElementById(id); }

function randIndex(length, exclude) {
  if (length < 2) return 0;
  var i;
  do { i = Math.floor(Math.random() * length); } while (i === exclude);
  return i;
}

function pick(list, salt) {
  return list[salt % list.length];
}

function currentNoun() { return NOUNS[S.nounIdx]; }
function currentSense() { return SENSES[S.senseIdx]; }

function renderImage() {
  var noun = currentNoun();
  var img = document.createElement('img');
  img.alt = 'Personified illustration of ' + noun.word;
  img.onload = function() {
    el('imageWrap').innerHTML = '';
    el('imageWrap').appendChild(img);
  };
  img.onerror = function() {
    el('imageWrap').innerHTML = '<div class="img-ph">Image not found for ' + noun.word + '</div>';
  };
  el('imageWrap').innerHTML = '';
  img.src = noun.img;
}

function renderSenseTabs() {
  el('senseTabs').innerHTML = SENSES.map(function(sense, i) {
    var active = i === S.senseIdx ? ' active' : '';
    return '<button class="sense-btn' + active + '" onclick="selectSense(' + i + ')">' + sense.label + '</button>';
  }).join('');
}

function renderSpark() {
  var noun = currentNoun();
  var sense = currentSense();
  var seed = noun.id.length + sense.key.length;
  var main = pick(SPARKS[sense.key], seed);

  el('sparkMainLine').innerHTML =
    '<span class="sml-c">' + sense.question(noun) + '</span> ' +
    '<span class="sml-e">' + main + '</span>';

  var rows = [
    ['Personify', noun.word + ' has ' + pick(['careful hands', 'muddy shoes', 'bright eyes', 'a tired back', 'a hidden lantern'], seed + 1)],
    ['Stretch', main + ', ' + pick(['but only when no one is watching', 'and it leaves a mark', 'before it changes its mind', 'as if it remembers you'], seed + 2)],
    ['Shift', 'try it as ' + pick(['weather', 'furniture', 'a visitor', 'a secret room', 'a small machine'], seed + 3)],
    ['Voice', '"' + pick(SPARKS.voice, seed + 4) + '"']
  ];

  el('sparkRows').innerHTML = rows.map(function(row) {
    return '<div class="spark-row"><span class="spark-tag">' + row[0] + '</span><span class="spark-val">' + row[1] + '</span></div>';
  }).join('');
}

function render() {
  var noun = currentNoun();
  var sense = currentSense();

  if (!S.started) {
    el('emptyState').style.display = 'none';
    el('contentPanel').classList.add('visible');
    S.started = true;
  }

  renderImage();
  renderSenseTabs();

  el('nounDisplay').textContent = noun.word;
  el('taglineText').textContent = noun.tagline;
  el('promptLabel').textContent = sense.label + ' Prompt';
  el('promptText').textContent = sense.question(noun);
  el('promptGuide').textContent = sense.guide;
  var responseVerb = {
    taste: 'tastes',
    feel: 'feels',
    sound: 'sounds',
    motion: 'moves',
    voice: 'says'
  }[sense.key];
  el('studentResponse').placeholder = noun.word + ' ' + responseVerb + ' like...';
  renderDialogue();
  renderClassSession();

  S.hintVisible = false;
  if (el('sparkCard')) el('sparkCard').classList.remove('visible');
  if (el('btnHint')) {
    el('btnHint').textContent = 'Show Spark Hint';
    el('btnHint').classList.remove('on');
  }

}

function renderDialogue() {
  if (!el('chatLog')) return;
  if (!S.dialogue.length) {
    el('chatLog').innerHTML = '<div class="chat-empty">After the student writes, OpenAI can ask a deeper question here.</div>';
    return;
  }
  el('chatLog').innerHTML = S.dialogue.map(function(msg) {
    var label = msg.role === 'student' ? 'Student' : 'OpenAI';
    return '<div class="chat-msg ' + msg.role + '"><strong>' + label + '</strong>' + escapeHtml(msg.text) + '</div>';
  }).join('');
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setAiNote(text, cls) {
  var note = el('aiNote');
  note.textContent = text;
  note.className = 'ai-note' + (cls ? ' ' + cls : '');
}

function setAiWorking(isWorking) {
  el('btnDig').disabled = isWorking;
  el('btnPoem').disabled = isWorking;
}

function studentWords() {
  return el('studentResponse').value.trim();
}

function callPoetryCoach(mode) {
  if (S.nounIdx === null) { generateBoth(); }
  var writing = studentWords();
  if (!writing) {
    setAiNote('Write a few words first, then OpenAI can respond to them.', 'error');
    el('studentResponse').focus();
    return Promise.reject(new Error('No writing yet'));
  }

  setAiWorking(true);
  setAiNote(mode === 'poem' ? 'Forming a poem from the student words...' : 'Asking OpenAI for one deeper question...', 'working');

  return fetch('/.netlify/functions/poetry-coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: mode,
      noun: currentNoun().word,
      tagline: currentNoun().tagline,
      sense: currentSense().label,
      prompt: currentSense().question(currentNoun()),
      guide: currentSense().guide,
      writing: writing,
      dialogue: S.dialogue.slice(-8)
    })
  })
    .then(function(res) {
      if (!res.ok) {
        return res.json().catch(function() { return {}; }).then(function(body) {
          throw new Error(body.error || 'OpenAI request failed.');
        });
      }
      return res.json();
    })
    .then(function(data) {
      S.dialogue.push({ role: 'student', text: writing });
      S.dialogue.push({ role: 'ai', text: data.text });
      renderDialogue();
      setAiNote(mode === 'poem' ? 'Poem formed from the student writing.' : 'Question added. Let the student answer in the response box, then dig deeper again.', '');
    })
    .catch(function(err) {
      setAiNote(err.message || 'OpenAI request failed.', 'error');
    })
    .finally(function() {
      setAiWorking(false);
    });
}

function digDeeper() {
  callPoetryCoach('deepen');
}

function makePoem() {
  callPoetryCoach('poem');
}

function clearDialogue() {
  S.dialogue = [];
  renderDialogue();
  setAiNote('Dialogue cleared.', '');
}

function normalizeCode(code) {
  return String(code || '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12);
}

function sessionContext() {
  if (S.nounIdx === null) { generateBoth(); }
  var noun = currentNoun();
  var sense = currentSense();
  return {
    noun: noun.word,
    tagline: noun.tagline,
    image: noun.img,
    sense: sense.label,
    prompt: sense.question(noun),
    guide: sense.guide
  };
}

function setSessionNote(text, cls) {
  var note = el('sessionNote');
  if (!note) return;
  note.textContent = text;
  note.className = 'session-note' + (cls ? ' ' + cls : '');
}

function setClassButtonsWorking(isWorking) {
  document.querySelectorAll('.session-actions button, .class-buttons button').forEach(function(btn) {
    btn.disabled = isWorking;
  });
}

function setButtonFlash(id, text) {
  var btn = el(id);
  if (!btn) return;
  var original = btn.textContent;
  btn.textContent = text;
  btn.classList.add('copied');
  setTimeout(function() {
    btn.textContent = original;
    btn.classList.remove('copied');
  }, 1600);
}

function readStudentName() {
  return el('studentName').value.trim().slice(0, 40);
}

function saveSessionPrefs() {
  try {
    localStorage.setItem('abstractThinkingStudentName', readStudentName());
    localStorage.setItem('abstractThinkingSessionCode', S.classSession.code || normalizeCode(el('sessionCode').value));
  } catch (err) {}
}

function loadSessionPrefs() {
  try {
    if (el('studentName')) el('studentName').value = localStorage.getItem('abstractThinkingStudentName') || '';
    if (el('sessionCode')) el('sessionCode').value = localStorage.getItem('abstractThinkingSessionCode') || '';
  } catch (err) {}
}

function renderClassSession() {
  if (!el('sessionStatus')) return;
  var code = S.classSession.code || normalizeCode(el('sessionCode').value);
  var count = S.classSession.responses.length;
  el('sessionStatus').textContent = code ? 'Session ' + code + (S.live.enabled ? ' · Live' : '') : 'No session';
  el('responseCount').textContent = String(count);

  if (S.classSession.output) {
    el('classOutput').innerHTML = escapeHtml(S.classSession.output);
  } else {
    el('classOutput').innerHTML = '';
  }

  if (!count) {
    el('responseList').innerHTML = '<div class="response-empty">No student responses yet.</div>';
    return;
  }

  el('responseList').innerHTML = S.classSession.responses.map(function(item) {
    return '<article class="student-entry">' +
      '<strong>' + escapeHtml(item.name || 'Student') + '</strong>' +
      '<span>' + escapeHtml(item.sense || '') + '</span>' +
      '<p>' + escapeHtml(item.writing || '') + '</p>' +
    '</article>';
  }).join('');
}

function applySessionData(data) {
  S.classSession.code = normalizeCode(data.code || (data.meta && data.meta.code) || '');
  S.classSession.meta = data.meta || null;
  S.classSession.responses = Array.isArray(data.responses) ? data.responses : [];
  if (el('sessionCode')) el('sessionCode').value = S.classSession.code;
  saveSessionPrefs();
  renderClassSession();
  subscribeToLiveSession(S.classSession.code);
}

function callClassSession(action, payload) {
  setClassButtonsWorking(true);
  return fetch('/.netlify/functions/class-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ action: action }, payload || {}))
  })
    .then(function(res) {
      return res.json().catch(function() { return {}; }).then(function(body) {
        if (!res.ok) throw new Error(body.error || 'Class session request failed.');
        return body;
      });
    })
    .finally(function() {
      setClassButtonsWorking(false);
    });
}

function createClassSession() {
  var context = sessionContext();
  S.classSession.output = '';
  setSessionNote('Creating a class session for this prompt...', 'working');
  callClassSession('create', context)
    .then(function(data) {
      applySessionData(data);
      setSessionNote('Share code ' + S.classSession.code + ' with students. Their responses will collect here.', '');
    })
    .catch(function(err) {
      setSessionNote(err.message || 'Could not create the class session.', 'error');
    });
}

function joinClassSession() {
  var code = normalizeCode(el('sessionCode').value);
  if (!code) {
    setSessionNote('Enter the class session code first.', 'error');
    el('sessionCode').focus();
    return;
  }
  S.classSession.output = '';
  setSessionNote('Joining session ' + code + '...', 'working');
  callClassSession('join', { code: code })
    .then(function(data) {
      applySessionData(data);
      setSessionNote('Joined session ' + S.classSession.code + '. Write your response, then submit it.', '');
    })
    .catch(function(err) {
      setSessionNote(err.message || 'Could not join that session.', 'error');
    });
}

function submitClassResponse() {
  var code = normalizeCode(el('sessionCode').value || S.classSession.code);
  var name = readStudentName();
  var writing = studentWords();
  if (!code) {
    setSessionNote('Enter or create a session code before submitting.', 'error');
    el('sessionCode').focus();
    return;
  }
  if (!name) {
    setSessionNote('Add a student name or initials before submitting.', 'error');
    el('studentName').focus();
    return;
  }
  if (!writing) {
    setSessionNote('Write a response before submitting it to the class session.', 'error');
    el('studentResponse').focus();
    return;
  }

  S.classSession.output = '';
  setSessionNote('Submitting ' + name + '\'s response...', 'working');
  callClassSession('submit', Object.assign(sessionContext(), {
    code: code,
    name: name,
    writing: writing
  }))
    .then(function(data) {
      applySessionData(data);
      setSessionNote('Response recorded. The class total is now ' + S.classSession.responses.length + '.', '');
    })
    .catch(function(err) {
      setSessionNote(err.message || 'Could not submit this response.', 'error');
    });
}

function refreshClassResponses() {
  var code = normalizeCode(el('sessionCode').value || S.classSession.code);
  if (!code) {
    setSessionNote('Enter a session code to refresh responses.', 'error');
    el('sessionCode').focus();
    return;
  }
  setSessionNote('Refreshing class responses...', 'working');
  callClassSession('list', { code: code })
    .then(function(data) {
      applySessionData(data);
      setSessionNote('Loaded ' + S.classSession.responses.length + ' recorded response' + (S.classSession.responses.length === 1 ? '.' : 's.'), '');
    })
    .catch(function(err) {
      setSessionNote(err.message || 'Could not refresh responses.', 'error');
    });
}

function loadLiveRoomSupport() {
  if (!window.fetch || S.live.loading || S.live.enabled) return;
  S.live.loading = true;

  fetch('/.netlify/functions/live-config')
    .then(function(res) {
      if (!res.ok) throw new Error('Live config not available.');
      return res.json();
    })
    .then(function(config) {
      if (!config.enabled || !config.supabaseUrl || !config.supabaseAnonKey) {
        setSessionNote('Refresh works now. Live rooms turn on after Supabase is connected in Netlify.', '');
        return null;
      }

      return loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2').then(function() {
        if (!window.supabase || !window.supabase.createClient) {
          throw new Error('Supabase client did not load.');
        }
        S.live.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        S.live.enabled = true;
        renderClassSession();
        subscribeToLiveSession(S.classSession.code || normalizeCode(el('sessionCode').value));
        setSessionNote('Live room updates are on. New responses will appear automatically.', '');
      });
    })
    .catch(function() {
      setSessionNote('Refresh works now. Live rooms will turn on after this app is deployed with Supabase settings.', '');
    })
    .finally(function() {
      S.live.loading = false;
    });
}

function loadScript(src) {
  return new Promise(function(resolve, reject) {
    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      if (window.supabase) resolve();
      return;
    }

    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function subscribeToLiveSession(code) {
  code = normalizeCode(code);
  if (!S.live.enabled || !S.live.client || !code) return;

  if (S.live.channel) {
    S.live.client.removeChannel(S.live.channel);
    S.live.channel = null;
  }

  S.live.channel = S.live.client
    .channel('abstract-thinking-' + code)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'class_responses',
      filter: 'session_code=eq.' + code
    }, function(payload) {
      var response = liveResponseFromRow(payload.new || {});
      if (!response.id) return;
      mergeLiveResponse(response);
      renderClassSession();
      setSessionNote('Live response added. The class total is now ' + S.classSession.responses.length + '.', '');
    })
    .subscribe(function(status) {
      if (status === 'SUBSCRIBED') {
        setSessionNote('Live room connected for session ' + code + '.', '');
      }
    });
}

function liveResponseFromRow(row) {
  return {
    id: row.id,
    name: row.name || '',
    writing: row.writing || '',
    noun: row.noun || '',
    sense: row.sense || '',
    prompt: row.prompt || '',
    createdAt: row.created_at || ''
  };
}

function mergeLiveResponse(response) {
  var exists = S.classSession.responses.some(function(item) {
    return item.id === response.id;
  });
  if (!exists) {
    S.classSession.responses.push(response);
    S.classSession.responses.sort(function(a, b) {
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  }
}

function summarizeClassResponses() {
  buildClassArtifact('summary');
}

function makeClassPoem() {
  buildClassArtifact('poem');
}

function buildClassArtifact(kind) {
  var code = normalizeCode(el('sessionCode').value || S.classSession.code);
  if (!code) {
    setSessionNote('Enter a session code first.', 'error');
    el('sessionCode').focus();
    return;
  }
  S.classSession.output = '';
  renderClassSession();
  setSessionNote(kind === 'poem' ? 'Building a class poem from student language...' : 'Summarizing the class thinking...', 'working');
  callClassSession(kind, { code: code })
    .then(function(data) {
      applySessionData(data);
      S.classSession.output = data.text || '';
      renderClassSession();
      setSessionNote(kind === 'poem' ? 'Class poem created from the group responses.' : 'Class summary created with student shoutouts.', '');
    })
    .catch(function(err) {
      setSessionNote(err.message || 'Could not create the class artifact.', 'error');
    });
}

function generateBoth() {
  S.nounIdx = randIndex(NOUNS.length, S.nounIdx);
  S.senseIdx = Math.floor(Math.random() * SENSES.length);
  el('studentResponse').value = '';
  render();
}

function doNewNoun() {
  if (S.nounIdx === null) { generateBoth(); return; }
  S.nounIdx = randIndex(NOUNS.length, S.nounIdx);
  el('studentResponse').value = '';
  render();
}

function doNewPrompt() {
  if (S.nounIdx === null) { generateBoth(); return; }
  S.senseIdx = randIndex(SENSES.length, S.senseIdx);
  render();
}

function selectSense(idx) {
  S.senseIdx = idx;
  render();
}

function doShowHint() {
  if (!el('sparkCard') || !el('btnHint')) return;
  if (S.nounIdx === null) { generateBoth(); return; }
  S.hintVisible = !S.hintVisible;
  el('sparkCard').classList.toggle('visible', S.hintVisible);
  el('btnHint').classList.toggle('on', S.hintVisible);
  el('btnHint').textContent = S.hintVisible ? 'Hide Spark Hint' : 'Show Spark Hint';
}

function classResponsesText() {
  var code = S.classSession.code || normalizeCode(el('sessionCode').value);
  var meta = S.classSession.meta || sessionContext();
  var lines = [
    'Abstract Thinking Lab Class Session',
    code ? 'Session: ' + code : '',
    meta && meta.noun ? 'Noun: ' + meta.noun : '',
    meta && meta.prompt ? 'Prompt: ' + meta.prompt : '',
    '',
    'Recorded Responses'
  ].filter(function(line, index) { return line || index === 4; });

  if (!S.classSession.responses.length) {
    lines.push('No responses recorded yet.');
  } else {
    S.classSession.responses.forEach(function(item, index) {
      lines.push('');
      lines.push((index + 1) + '. ' + (item.name || 'Student') + (item.sense ? ' - ' + item.sense : ''));
      lines.push(item.writing || '');
    });
  }

  return lines.join('\n');
}

function copyText(text, buttonId, emptyMessage) {
  if (!text || !text.trim()) {
    setSessionNote(emptyMessage, 'error');
    return;
  }

  function done() {
    setButtonFlash(buttonId, 'Copied');
    setSessionNote('Copied to clipboard.', '');
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(done).catch(done);
  } else {
    done();
  }
}

function copyClassResponses() {
  if (!S.classSession.responses.length) {
    setSessionNote('No class responses to copy yet.', 'error');
    return;
  }
  copyText(classResponsesText(), 'btnCopyClass', 'No class responses to copy yet.');
}

function copyClassOutput() {
  copyText(S.classSession.output || '', 'btnCopyOutput', 'Create a class summary or poem before copying it.');
}

function printClassReport() {
  if (!S.classSession.responses.length && !S.classSession.output) {
    setSessionNote('Record responses or create a class summary before printing a class report.', 'error');
    return;
  }
  document.body.classList.add('print-class-report');
  window.print();
  setTimeout(function() {
    document.body.classList.remove('print-class-report');
  }, 500);
}

var PRINT_CLASSES = ['print-hint-show', 'print-hint-hide', 'print-resp-lines', 'print-resp-typed', 'print-resp-none', 'print-class-report'];

function openPrintModal() {
  if (S.nounIdx === null) { alert('Generate a noun first.'); return; }
  document.querySelector('input[name="printHint"][value="' + (S.hintVisible ? 'show' : 'hide') + '"]').checked = true;
  document.querySelector('input[name="printResp"][value="' + (el('studentResponse').value.trim() ? 'typed' : 'lines') + '"]').checked = true;
  el('printModal').classList.add('open');
}

function closePrintModal() {
  el('printModal').classList.remove('open');
}

function doPrintNow() {
  closePrintModal();
  var hintOpt = document.querySelector('input[name="printHint"]:checked').value;
  var respOpt = document.querySelector('input[name="printResp"]:checked').value;
  el('printTyped').textContent = el('studentResponse').value.trim();
  PRINT_CLASSES.forEach(function(c) { document.body.classList.remove(c); });
  document.body.classList.add('print-hint-' + hintOpt);
  document.body.classList.add('print-resp-' + respOpt);
  window.print();
  setTimeout(function() {
    PRINT_CLASSES.forEach(function(c) { document.body.classList.remove(c); });
  }, 500);
}

loadSessionPrefs();
renderClassSession();
loadLiveRoomSupport();
