const test = require('node:test');
const assert = require('node:assert/strict');
const dify = require('../lib/dify');
const knowledge = require('../api/knowledge');
const coach = require('../api/coach');
const envKeys = ['DIFY_API_KEY','DIFY_DATASET_ID','DIFY_API_BASE_URL','GEMINI_API_KEY'];
const datasetId = '12345678-1234-1234-1234-123456789abc';
function createRes(){return { code:200,body:null,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(b){this.body=b;return this;} };}
async function withEnv(env,run){
  const saved=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
  const fetchBefore=global.fetch;
  for (const k of envKeys) delete process.env[k];
  Object.assign(process.env,env);
  try{return await run();}
  finally {global.fetch=fetchBefore;for(const k of envKeys){if(saved[k]===undefined) delete process.env[k];else process.env[k]=saved[k];}}
}
test('Dify endpoint is optional; GET does not disclose keys',async()=>{
  await withEnv({},async()=>{
    const res=createRes();await knowledge({method:'GET'},res);
    assert.equal(res.code,200);assert.equal(res.body.difyReady,false);
    assert.equal(JSON.stringify(res.body).includes('secret'),false);
    const bad=createRes();await knowledge({method:'POST',body:{query:'hi'}},bad);assert.equal(bad.code,503);
  });
});
test('Dify retrieves a real response schema and trims to three snippets',async()=>{
  await withEnv({DIFY_API_KEY:'secret-dify-test',DIFY_DATASET_ID:datasetId},async()=>{
    global.fetch=async (url,opts)=>{
      assert.equal(url,`https://api.dify.ai/v1/datasets/${datasetId}/retrieve`);
      assert.equal(opts.headers.Authorization,'Bearer secret-dify-test');
      assert.equal(JSON.parse(opts.body).query,'藍鳥口訣是什麼？');
      return {ok:true,json:async()=>({records:[{score:0.931,segment:{content:'藍鳥口訣：單數三人稱動詞加 s。',document:{name:'02-simple-present.txt'}}}]})};
    };
    const res=createRes();await knowledge({method:'POST',body:{query:'藍鳥口訣是什麼？'}},res);
    assert.equal(res.code,200);assert.equal(res.body.count,1);
    assert.match(res.body.records[0].text,/藍鳥口訣/);
    assert.equal(res.body.records[0].title,'02-simple-present.txt');
    assert.equal(JSON.stringify(res.body).includes('secret-dify-test'),false);
  });
});
test('Gemini prompt includes Dify passages and marks sources',async()=>{
  await withEnv({DIFY_API_KEY:'dify-demo',DIFY_DATASET_ID:datasetId,GEMINI_API_KEY:'gemini-demo'},async()=>{
    const calls=[];
    global.fetch=async(url,opts)=>{
      calls.push(String(url));
      if(String(url).includes('api.dify.ai')) return {ok:true,json:async()=>({records:[{score:0.91,segment:{content:'藍鳥口訣是：單數三人稱動詞加 s。',document:{name:'02-simple-present.txt'}}}]})};
      const body=JSON.parse(opts.body);
      assert.match(body.contents[0].parts[0].text,/藍鳥口訣是：單數三人稱/);
      return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'知識庫提到藍鳥口訣。'}]}}]})};
    };
    const res=createRes();await coach({method:'POST',body:{lessonId:'simple-present',questionId:'s1',question:'藍鳥口訣是什麼？'}},res);
    assert.equal(res.code,200);
    assert.equal(res.body.knowledgeMode,'dify');
    assert.equal(res.body.sources[0].title,'02-simple-present.txt');
    assert.equal(calls.length,2);
  });
});
test('Dify configured but failing never silently claims retrieval success',async()=>{
  await withEnv({DIFY_API_KEY:'dify-demo',DIFY_DATASET_ID:datasetId,GEMINI_API_KEY:'gemini-demo'},async()=>{
    global.fetch=async()=>({ok:false,status:403});
    const res=createRes();await coach({method:'POST',body:{lessonId:'simple-present',questionId:'s1',question:'藍鳥口訣是什麼？'}},res);
    assert.equal(res.code,502);
    assert.match(res.body.error,/Dify 知識庫查詢失敗/);
    assert.equal(res.body.knowledgeMode,undefined);
  });
});
