# English Adventure V3 — Dify 知識庫＋Gemini API 測試

在 **V2 已經能運作** 的 HTML + Vercel Function + Gemini API 之上，新增一個 Dify Classic Knowledge Base 檢索，其他英文字卡、選擇題、答題成績功能保留。

## 直接測試的結果應該是什麼？

1. Vercel 新網站 `/api/knowledge` GET 顯示 `difyReady: true`（只代表設定了環境變數，不代表 Dify 金鑰已驗證）。
2. 網頁「Dify 知識庫檢索測試」輸入「藍鳥口訣是什麼？」→ 實際呼叫 Dify，顯示 `02-simple-present.txt` 的段落。
3. 在 Unit 2 下方的 Gemini AI 提問「藍鳥口訣是什麼？」→ 由 Vercel 先檢索 Dify，再把段落送給 Gemini 生成答案，畫面顯示「本次已檢索 Dify 知識庫」及來源名稱。
4. 若 Dify 尚未設定，原本 Gemini + 本地題庫仍可正常使用；若 Dify 已設定但檢索報錯，會直接顯示錯誤，不會偽稱知識庫已正常工作。

## Step 1｜建立 Dify Classic Knowledge Base

1. 前往 https://cloud.dify.ai 登入（免費 Sandbox 方案可以先做小量測試，額度請以官方方案與目前帳號為準）。
2. 進入 **Knowledge → Create → Create a ready-to-use knowledge base**，若看到 Agent/Classic 兩種，選 **Classic Knowledge Base**。
3. 上傳 `dify-sample-documents/01-be-verbs.txt` 和 `dify-sample-documents/02-simple-present.txt`。這是此專案附的練習教材，內容包含獨特的「藍鳥口訣」。
4. 依照畫面選擇預設 chunking 與索引方式；若免費帳號沒有設定 Embedding 模型的額度，可先嘗試 Economical indexing。等待文件的索引狀態為 Completed/Available。
5. 在知識庫的 **Retrieval Testing / Test Retrieval** 頁面輸入「藍鳥口訣是什麼？」，確認搜尋會找到 `02-simple-present.txt`。若這裡都找不到，先在 Dify 調整索引/搜尋，不要急著修改 Vercel 程式。

## Step 2｜拿到 Dify Knowledge Service API Key 和 Dataset ID

1. 進入 Dify 的 **Knowledge** 主頁，右上角 **Service API** → **API Key**。**不要使用 Dify 聊天應用的 App Key**。
2. 建立金鑰時，建議只授權本次建立的英文知識庫。若介面限制只有管理員可操作，請找工作區 Owner/Admin。金鑰只複製到 Vercel Environment Variables，勿貼到公開網頁或 GitHub。
3. 打開你建立的知識庫，從網址 `/datasets/<UUID>` 之後的 UUID 複製 **Dataset ID**。它不是文件 ID。

## Step 3｜Vercel 設定變數

在 **Settings → Environment Variables** 加入：

| 名稱 | 值 |
| --- | --- |
| `GEMINI_API_KEY` | V2 已有，保留即可 |
| `DIFY_API_KEY` | Dify Knowledge Service API Key |
| `DIFY_DATASET_ID` | Dify Classic Knowledge Base UUID |
| `DIFY_API_BASE_URL`（可不填） | Dify Cloud 預設 `https://api.dify.ai/v1` |

環境選 Production，儲存後 **Redeploy**。新環境變數不會自動套用到舊的部署。

## Step 4｜部署

建議沿用目前既有 **GitHub + Vercel** 專案：把 V3 根目錄的檔案提交 GitHub，讓 Vercel 部署同一個 Project。若尚未使用 GitHub，可以先用 https://vercel.com/drop 把 ZIP 當作新的測試 Project；Drop 不會更新原本已存在的 Project。

> 若原本 `english-ai-platform-tan.vercel.app` 很穩定，為安全起見先建立新的 V3 專案，測試完成再更新原專案。

## 如何判斷 Dify API 確實串通

- `/api/knowledge` GET：`difyReady:true` → **只代表環境變數存在**。
- 點擊「搜尋 Dify 教材」出現 `02-simple-present.txt` / 藍鳥口訣 → **代表實際檢索到 Dify 知識庫**。
- 點擊 Gemini AI 問「藍鳥口訣是什麼」，回覆包含口訣，底下顯示已檢索 Dify → **代表 Dify RAG + Gemini 串接流程正常**。
- 若顯示 `Dify 未找到匹配`，並不代表 API 失敗，但本次回答**不能算成功使用到知識庫內容**。

## 程式結構

- `index.html`、`style.css`、`app.js`：原本的網站加上 Dify 搜尋 UI 和 AI 來源標示。
- `data/lessons.json`：保留原本 2 個課程、6 道選擇題。
- `api/knowledge.js`：Vercel API，可以查狀態及檢索 Dify 文本分段。
- `lib/dify.js`：只在後端執行，呼叫 `POST /datasets/{dataset_id}/retrieve`，回傳最多 3 個教材片段。
- `api/coach.js`：原本 Gemini API 之前先呼叫 Dify，提供檢索片段給 Gemini。
- `dify-sample-documents/`：兩份可上傳 Dify 的英文測試教材。
- `tests/*.test.js`：以模擬 HTTP 回覆測試，不需要真金鑰。

## 重要安全限制

- 不要將 `GEMINI_API_KEY`、`DIFY_API_KEY` 寫在前端檔案。`.env.local` 等應被 Git 忽略。
- 這是公開可呼叫 API 的**專題測試版**，沒有真正的使用者登入、伺服器端持久化限流、額度管理，因此先只放**可公開的測試教材**，不要上傳私有教材或個人資訊；正式公開大量使用前一定要加上權限與限流。
- Dify 的檢索有 API 配額；Google Gemini 則另有各自的模型額度與可能費用，請以兩平台實際帳號資訊為準。

## 官方參考

- Dify Knowledge: https://docs.dify.ai/en/cloud/use-dify/knowledge/overview
- Dify Classic Knowledge Base: https://docs.dify.ai/en/cloud/use-dify/knowledge/readme
- Dify Classic API: https://docs.dify.ai/en/api-reference/guides/knowledge
- Dify 免費方案：https://dify.ai/dify-cloud
- Vercel 環境變數：https://vercel.com/docs/environment-variables
