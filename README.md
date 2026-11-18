# English Adventure V2 — AI 英文學習整合測試

這是一個**免 Next.js** 的簡單完整範例：靜態 HTML/CSS/JavaScript + JSON 教材題庫 + Vercel Node.js Function + Gemini API。

## 內容

- **Unit 1：be 動詞**（3 題，附文法知識點及解析）
- **Unit 2：現在簡單式**（3 題，附文法知識點及解析）
- **AI 教師**：針對當前題目解釋，或輸入 1～240 字的英文學習問題。
- 不含資料庫、不儲存學生紀錄、不需要 BBB 或 Tailscale。

## 專案結構

```text
english-adventure-v2/
├── index.html               網站頁面
├── style.css                網站外觀
├── app.js                   作答、教材載入、向 /api/coach 發送請求
├── data/
│   └── lessons.json         2 單元、6 題、知識點與解釋
├── api/
│   └── coach.js             Vercel 後端；安全呼叫 Gemini API
├── .env.example             API 金鑰設定名稱範例（非真實金鑰）
├── .gitignore               避免上傳秘密金鑰
├── package.json
└── tests/
    └── coach.test.js        不需真金鑰即可執行的後端測試
```

## 最推薦：保持原本 Vercel 網址，連接 GitHub 更新

1. 在 GitHub 新建一個 Repository，例如 `english-adventure-v2`，可設為 Private。
2. 將**本資料夾內所有檔案和資料夾**上傳到 Repository 根目錄（`index.html` 必須在根目錄）。
3. 登入 Vercel，開啟**現有**網站 `english-ai-platform-tan` 的 Project → Settings → Git（實際 UI 文字可能因版本而不同）。
4. 找到 Connect Git Repository / Connect Git，連接剛才的 Repository。若找不到這個選項，可在 Vercel 新建 Project → Import Git Repository，但新專案會有另一個網址；舊網址不會自行指向新專案。
5. 在 Vercel 該專案 Settings → Environment Variables 新增：
   - Name：`GEMINI_API_KEY`
   - Value：你從 Google AI Studio 取得的**真正金鑰**。
   - Environment：先勾選 Production（測試 Preview 也可另外勾選）。
   - 選填 `GEMINI_MODEL`：`gemini-3.5-flash-lite`。
6. 觸發新的 Production Deployment（例如重新部署或推送一筆 Git commit）。環境變數不會追溯套用到已完成部署。
7. 開啟 `https://你的網址/api/coach`，預期：`{"ok":true,"aiReady":true,...}`（只代表後端存在、金鑰已設定，不代表 Google 端驗證一定成功）。
8. 回到網站，先選答題庫，再按「解釋目前這一題」。如果出現 AI 產生的繁體中文文法解析，才算 API 串接完成。

Google AI Studio 取得金鑰：https://aistudio.google.com/api-keys
Vercel Dashboard：https://vercel.com/dashboard
GitHub 建立 Repository：https://github.com/new

## 另一種：Vercel Drop 快速部署（會新建 Project）

可將整包 ZIP 拖曳到 https://vercel.com/drop，等待專案建立後再到 Settings → Environment Variables 加上 `GEMINI_API_KEY` 並重新部署。注意每次 Drop 會建立新專案，而不是自動更新原網址。因此想**繼續使用原來的網址**，建議採用上面的 GitHub 方案。

## 本機測試

- 可用 VS Code Live Server 或在此資料夾執行 `python -m http.server 8000`，瀏覽 http://localhost:8000 測試**靜態題庫及知識點**。
- `/api/coach` 只有在 Vercel 部署環境（或使用 `vercel dev`）才會正常執行。**直接雙擊 HTML（file://）時，JSON fetch 可能因安全限制失敗。**
- 本機若要測 API：安裝 Node.js 後，在此資料夾用 `npx vercel dev`，並先完成 Vercel 專案連接及本機環境變數設定。
- 執行 `npm test` 可以測試 API 函式的基本邏輯（使用假回覆，不會真的呼叫 Gemini）。

## API 安全注意

- **不要**把真實 Gemini API Key 寫進 `index.html`、`app.js`、`data/lessons.json`，或傳到 GitHub。
- `.env.local`、`.env` 等秘密檔會被 `.gitignore` 排除；仍應先檢查 Git 提交內容。
- 此專案是最小功能測試，**尚未具備使用者登入、持久化的 API 限流或防濫用**。即使金鑰藏在後端，公開網址的 `/api/coach` 仍可能被其他人呼叫。請先控制分享範圍、檢查 AI Studio 使用額度，正式公開前要增加驗證與限流。
- 本範例會將學生的提問送交 Gemini API；不要輸入個人機密資料。
- 若發生 404/429/403，查看頁面錯誤提示及 Vercel Functions Logs；可到 AI Studio 檢查該金鑰允許的模型及額度。

## 如何自行增加題庫

編輯 `data/lessons.json`：每個單元有 `id`、`knowledge` 和 `questions`；每題包括 `id`、`question`、`options`、從 0 開始的 `answer` 索引，以及 `explanation`。前端與後端都會讀取這份資料；不要任意修改欄位名稱。

## 使用技術與官方文件

- Vercel Node.js Functions：https://vercel.com/docs/functions/runtimes/node-js
- Vercel Environment Variables：https://vercel.com/docs/environment-variables
- Gemini API：https://ai.google.dev/gemini-api/docs
- Gemini Models：https://ai.google.dev/gemini-api/docs/models
