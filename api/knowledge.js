// GET health; POST knowledge retrieval (no key returned to frontend).
const dify = require('../lib/dify');
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method === 'GET') return res.status(200).json({ok:true,difyReady:dify.configured(),message:'Dify 知識庫後端運作中'});
  if (req.method !== 'POST') { res.setHeader('Allow','GET, POST'); return res.status(405).json({error:'只接受 GET 或 POST。'}); }
  try {
    const query = req.body?.query;
    const records = await dify.retrieve(query);
    return res.status(200).json({ok:true,records,count:records.length});
  } catch (e) { return res.status(e.status || 502).json({error:e.message || 'Dify 檢索失敗。'}); }
};
