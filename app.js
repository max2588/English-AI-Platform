"use strict";
const $ = (selector) => document.querySelector(selector);
let lessons = [];
let selectedLesson = null;
let current = 0;
let score = 0;
let answered = false;
let asking = false;

function elem(name, className = "", text = "") {
  const item = document.createElement(name);
  if (className) item.className = className;
  item.textContent = text;
  return item;
}
function showError(message) {
  const out = $("#ai-answer");
  out.hidden = false;
  out.className = "ai-answer error";
  out.textContent = message;
}
async function checkApi() {
  try {
    const response = await fetch("/api/coach", {cache: "no-store"});
    if (!response.ok) throw new Error("無法連到後端");
    const data = await response.json();
    $("#api-status").textContent = data.aiReady ? "● AI API 已設定" : "○ 尚未設定 API 金鑰";
  } catch {
    $("#api-status").textContent = "○ API 尚未連線";
  }
}
async function initialize() {
  try {
    const res = await fetch("/data/lessons.json", { cache: "no-store" });
    if (!res.ok) throw new Error("教材讀取失敗（HTTP " + res.status + "）");
    const data = await res.json();
    if (!Array.isArray(data.lessons) || !data.lessons.length) throw new Error("題庫格式不正確");
    lessons = data.lessons;
    drawLessonButtons();
    chooseLesson(lessons[0].id);
  } catch (err) {
    $("#lesson-buttons").textContent = "無法載入教材：" + err.message + "。請確認已部署完整資料夾（不要只開啟本機 HTML 檔）。";
    $("#question").textContent = "教材載入失敗";
  }
  checkApi();
}
function drawLessonButtons() {
  const area = $("#lesson-buttons"); area.replaceChildren();
  for (const lesson of lessons) {
    const button = elem("button", "lesson-button");
    button.type = "button";
    button.dataset.lessonId = lesson.id;
    button.append(elem("span", "lesson-unit", lesson.unit), elem("span", "lesson-name", lesson.title), elem("span", "lesson-summary", lesson.summary));
    button.addEventListener("click", () => chooseLesson(lesson.id));
    area.append(button);
  }
}
function chooseLesson(id) {
  selectedLesson = lessons.find(l => l.id === id);
  current = 0; score = 0; answered = false;
  for (const button of document.querySelectorAll(".lesson-button")) {
    const active = button.dataset.lessonId === id;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  const knowledge = selectedLesson.knowledge;
  $("#knowledge-title").textContent = knowledge.title;
  $("#knowledge-description").textContent = knowledge.description;
  $("#lesson-level").textContent = selectedLesson.level;
  $("#knowledge-rules").replaceChildren(...knowledge.rules.map(rule => elem("li", "", rule)));
  $("#finish-panel").hidden = true;
  $("#quiz-area").hidden = false;
  $("#ai-answer").hidden = true;
  $("#ask-text").value = "";
  showQuestion();
}
function showQuestion() {
  const q = selectedLesson.questions[current];
  answered = false;
  $("#question").textContent = q.question;
  $("#progress-label").textContent = `${current + 1} / ${selectedLesson.questions.length}`;
  $("#progress-fill").style.width = `${(current / selectedLesson.questions.length) * 100}%`;
  $("#feedback").hidden = true;
  $("#next-btn").hidden = true;
  const area = $("#options"); area.replaceChildren();
  q.options.forEach((option, index) => {
    const btn = elem("button", "option", option);
    btn.type = "button";
    btn.addEventListener("click", () => checkAnswer(index));
    area.append(btn);
  });
}
function checkAnswer(choice) {
  if (answered) return;
  answered = true;
  const q = selectedLesson.questions[current];
  const correct = choice === q.answer;
  if (correct) score++;
  $("#options").querySelectorAll("button").forEach((button, index) => {
    button.disabled = true;
    if (index === q.answer) button.classList.add("correct");
    else if (index === choice) button.classList.add("wrong");
  });
  const feedback = $("#feedback");
  feedback.hidden = false;
  feedback.className = "feedback " + (correct ? "good" : "bad");
  feedback.textContent = (correct ? "✅ 答對了！Excellent!" : `❌ 答錯了！正確答案：${q.options[q.answer]}`) + "\n" + q.explanation;
  $("#next-btn").hidden = false;
  $("#next-btn").textContent = current === selectedLesson.questions.length - 1 ? "完成單元 →" : "下一題 →";
}
function nextQuestion() {
  if (!answered) return;
  current++;
  if (current < selectedLesson.questions.length) return showQuestion();
  $("#quiz-area").hidden = true;
  $("#finish-panel").hidden = false;
  $("#progress-fill").style.width = "100%";
  $("#progress-label").textContent = `${selectedLesson.questions.length} / ${selectedLesson.questions.length}`;
  const total = selectedLesson.questions.length;
  $("#score-summary").textContent = `答對 ${score} / ${total} 題，正確率 ${Math.round((score / total) * 100)}%。`;
}
async function askAi(defaultExplain = false) {
  if (!selectedLesson || asking) return;
  const q = selectedLesson.questions[Math.min(current, selectedLesson.questions.length - 1)];
  const text = defaultExplain ? "請用繁體中文解釋這一題的文法規則，再提供一個簡單例句。" : $("#ask-text").value.trim();
  if (!text) return showError("請先輸入想問 AI 的英文問題，或按『解釋目前這一題』。");
  if (text.length > 240) return showError("問題不能超過 240 個字。");
  asking = true;
  $("#explain-btn").disabled = true;
  $("#ask-btn").disabled = true;
  const out = $("#ai-answer");
  out.hidden = false;
  out.className = "ai-answer";
  out.textContent = "AI 老師正在思考，請稍候…";
  try {
    const resp = await fetch("/api/coach", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({lessonId: selectedLesson.id, questionId: q.id, question: text})});
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `API 呼叫失敗（HTTP ${resp.status}）`);
    out.textContent = data.answer || "AI 沒有回傳文字，請再試一次。";
  } catch (e) {
    showError("❗ " + e.message);
  } finally {
    asking = false;
    $("#explain-btn").disabled = false;
    $("#ask-btn").disabled = false;
  }
}
$("#next-btn").addEventListener("click", nextQuestion);
$("#restart-btn").addEventListener("click", () => chooseLesson(selectedLesson.id));
$("#ask-btn").addEventListener("click", () => askAi(false));
$("#explain-btn").addEventListener("click", () => askAi(true));
initialize();
