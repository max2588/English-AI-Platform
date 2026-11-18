// Dify Classic Knowledge Base Service API helper (server-side only).
const DEFAULT_BASE = 'https://api.dify.ai/v1';
function configured() {
  return Boolean(process.env.DIFY_API_KEY && process.env.DIFY_DATASET_ID);
}
function cleanBase() {
  const raw = (process.env.DIFY_API_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('DIFY_API_BASE_URL 必須是 HTTPS 網址。');
  if (url.username || url.password || url.search || url.hash) throw new Error('DIFY_API_BASE_URL 格式不正確。');
  return raw;
}
function simplifyRecord(record) {
  const segment = record?.segment || {};
  const content = (typeof segment.content === 'string' ? segment.content : '').trim();
  if (!content) return null;
  return {
    title: String(segment.document?.name || 'Dify 知識庫文件').slice(0, 120),
    text: content.slice(0, 1100),
    score: Number.isFinite(record.score) ? Number(record.score.toFixed(3)) : null
  };
}
async function retrieve(query) {
  if (!configured()) throw Object.assign(new Error('Dify 尚未設定。請先設定 DIFY_API_KEY 和 DIFY_DATASET_ID。'), { status:503 });
  if (typeof query !== 'string' || !query.trim() || query.length > 240) throw Object.assign(new Error('檢索問題需要 1～240 字。'), {status:400});
  const id = process.env.DIFY_DATASET_ID;
  // Validate the ID before adding it to a URL.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw Object.assign(new Error('DIFY_DATASET_ID 格式不正確，請檢查知識庫 ID。'), {status:503});
  const base = cleanBase();
  let response;
  try {
    response = await fetch(`${base}/datasets/${encodeURIComponent(id)}/retrieve`, {
      method: 'POST',
      headers: {'Authorization': `Bearer ${process.env.DIFY_API_KEY}`, 'Content-Type':'application/json'},
      body: JSON.stringify({query:query.trim()}),
      signal: AbortSignal.timeout(14000)
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw Object.assign(new Error('Dify 檢索逾時，請稍後再試。'), {status:504});
    throw Object.assign(new Error('連不到 Dify，請檢查 API 網址與服務狀態。'), {status:502});
  }
  if (!response.ok) {
    let message;
    if (response.status === 401) message = 'Dify API Key 無效，請確認使用知識庫 Service API Key。';
    else if (response.status === 403) message = 'Dify 拒絕檢索，請檢查金鑰範圍、API 存取權限或免費方案額度。';
    else if (response.status === 404) message = '找不到 Dify 知識庫，請檢查 DIFY_DATASET_ID 和 API 網址。';
    else if (response.status === 429) message = 'Dify 使用頻率過高，請稍後再試。';
    else message = `Dify 檢索失敗（HTTP ${response.status}）。`;
    throw Object.assign(new Error(message), {status: response.status === 429 ? 429 : 502});
  }
  let data;
  try { data = await response.json(); }
  catch { throw Object.assign(new Error('Dify 回傳格式不是有效 JSON。'), {status:502}); }
  if (!Array.isArray(data.records)) throw Object.assign(new Error('Dify 回傳資料缺少 records。'), {status:502});
  const records = data.records.slice(0, 6).map(simplifyRecord).filter(Boolean).slice(0,3);
  return records;
}
module.exports = {configured, retrieve};
