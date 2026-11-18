const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/coach.js');
function makeRes() {
  return {
    code: 200, body: null, headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    json(obj) { this.body = obj; return this; }
  };
}
test('GET shows API health without key content', async () => {
  const res = makeRes();
  await handler({ method: 'GET' }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  assert.equal(typeof res.body.aiReady, 'boolean');
  assert.equal(res.body.message, 'Vercel Function 運作中');
});
test('POST without key returns helpful error', async () => {
  const original = process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY;
  const res = makeRes();
  await handler({ method: 'POST', body: {} }, res);
  assert.equal(res.code, 503);
  if (original) process.env.GEMINI_API_KEY = original;
});
test('POST validates inputs and calls Gemini with trusted knowledge', async () => {
  const priorKey = process.env.GEMINI_API_KEY;
  const priorFetch = global.fetch;
  process.env.GEMINI_API_KEY = 'fake-test-key';
  try {
    const resBad = makeRes();
    await handler({ method: 'POST', body: {lessonId: 'be-verbs', questionId: 'b1', question: ''} }, resBad);
    assert.equal(resBad.code, 400);
    global.fetch = async (url, opts) => {
      assert.match(String(url), /gemini-3.5-flash-lite:generateContent$/);
      assert.equal(opts.headers['x-goog-api-key'], 'fake-test-key');
      const payload = JSON.parse(opts.body);
      assert.match(payload.contents[0].parts[0].text, /I am a student/);
      return {ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'I 要搭配 am。' }] } }] })};
    };
    const res = makeRes();
    await handler({ method:'POST', body: {lessonId:'be-verbs', questionId:'b1', question:'為什麼？'} }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.answer, 'I 要搭配 am。');
  } finally {
    global.fetch = priorFetch;
    if (priorKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = priorKey;
  }
});
