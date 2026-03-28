const TOTAL = 50;
const QUIZ_MS = 30 * 60 * 1000;

const els = {
  stageStart: document.getElementById("stageStart"),
  stageQuiz: document.getElementById("stageQuiz"),
  stageResult: document.getElementById("stageResult"),
  stageError: document.getElementById("stageError"),
  btnStart: document.getElementById("btnStart"),
  btnNext: document.getElementById("btnNext"),
  btnRetry: document.getElementById("btnRetry"),
  qLabel: document.getElementById("qLabel"),
  qPct: document.getElementById("qPct"),
  progressBar: document.getElementById("progressBar"),
  progressFill: document.getElementById("progressFill"),
  qIndex: document.getElementById("qIndex"),
  questionText: document.getElementById("questionText"),
  options: document.getElementById("options"),
  feedback: document.getElementById("feedback"),
  finalScore: document.getElementById("finalScore"),
  resultSummary: document.getElementById("resultSummary"),
  scoreBar: document.getElementById("scoreBar"),
  errorText: document.getElementById("errorText"),
  timerDisplay: document.getElementById("timerDisplay"),
};

let questions = [];
let index = 0;
let score = 0;
let answered = false;
let quizTimerId = null;
let quizEndTime = 0;
let timedOut = false;

const keys = ["A", "B", "C", "D"];

function formatRemaining(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clearQuizTimer() {
  if (quizTimerId !== null) {
    clearInterval(quizTimerId);
    quizTimerId = null;
  }
}

function updateQuizTimer() {
  const left = quizEndTime - Date.now();
  if (left <= 0) {
    els.timerDisplay.textContent = "00:00";
    els.timerDisplay.classList.add("timer-warn");
    timedOut = true;
    clearQuizTimer();
    if (!els.stageQuiz.hidden) showResults();
    return;
  }
  els.timerDisplay.textContent = formatRemaining(left);
  if (left <= 60_000) els.timerDisplay.classList.add("timer-warn");
  else els.timerDisplay.classList.remove("timer-warn");
}

function startQuizTimer() {
  clearQuizTimer();
  quizEndTime = Date.now() + QUIZ_MS;
  els.timerDisplay.classList.remove("timer-warn");
  updateQuizTimer();
  quizTimerId = window.setInterval(updateQuizTimer, 1000);
}

function showStage(name) {
  els.stageStart.hidden = name !== "start";
  els.stageQuiz.hidden = name !== "quiz";
  els.stageResult.hidden = name !== "result";
  els.stageError.hidden = name !== "error";
}

function setProgress() {
  const n = index + 1;
  const completed = index;
  const pct = Math.round((completed / TOTAL) * 100);
  els.qLabel.textContent = `Question ${n} of ${TOTAL}`;
  els.qPct.textContent = `${pct}%`;
  els.progressBar.setAttribute("aria-valuenow", String(pct));
  els.progressFill.style.width = `${pct}%`;
}

function renderQuestion() {
  const q = questions[index];
  answered = false;
  els.btnNext.disabled = true;
  els.feedback.hidden = true;
  els.feedback.classList.remove("ok", "bad");

  setProgress();
  els.qIndex.textContent = `Q${q.id}`;
  els.questionText.textContent = q.question;

  els.options.innerHTML = "";
  q.options.forEach((text, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.dataset.index = String(i);
    btn.innerHTML = `<span class="option-key">${keys[i]}</span><span class="option-label"></span>`;
    btn.querySelector(".option-label").textContent = text;
    btn.addEventListener("click", () => pickOption(i));
    els.options.appendChild(btn);
  });
}

function pickOption(selectedIndex) {
  if (answered) return;
  answered = true;
  const q = questions[index];
  const correct = selectedIndex === q.correctIndex;
  if (correct) score += 1;

  const buttons = [...els.options.querySelectorAll(".option")];
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.correctIndex) btn.classList.add("correct");
    if (i === selectedIndex && i !== q.correctIndex) btn.classList.add("wrong");
    if (i === selectedIndex) btn.classList.add("selected");
  });

  els.feedback.hidden = false;
  if (correct) {
    els.feedback.classList.add("ok");
    els.feedback.textContent = "Correct — +1 mark";
  } else {
    els.feedback.classList.add("bad");
    els.feedback.textContent = "Incorrect — 0 marks";
  }

  els.btnNext.disabled = false;
  els.btnNext.focus();
}

function goNext() {
  if (index >= questions.length - 1) {
    showResults();
    return;
  }
  index += 1;
  renderQuestion();
}

function showResults() {
  clearQuizTimer();
  showStage("result");

  els.finalScore.textContent = String(score);
  const pct = (score / TOTAL) * 100;
  let summary;
  if (pct >= 90) summary = "Outstanding work — strong command of the material.";
  else if (pct >= 70) summary = "Solid performance — review any missed topics to tighten gaps.";
  else if (pct >= 50) summary = "Good foundation — consider revisiting sections where answers were unclear.";
  else summary = "Keep studying — repeat the quiz after reviewing the key rules.";
  if (timedOut) summary = `Time's up — the quiz ended with your score so far. ${summary}`;
  els.resultSummary.textContent = summary;

  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - score / TOTAL);
  els.scoreBar.style.transition = "none";
  els.scoreBar.style.strokeDashoffset = String(circumference);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      els.scoreBar.style.transition = "stroke-dashoffset 1s ease-out";
      els.scoreBar.style.strokeDashoffset = String(offset);
    });
  });
}

function injectScoreGradient() {
  const svg = els.scoreBar.closest("svg");
  if (svg.querySelector("defs")) return;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5"/>
      <stop offset="100%" style="stop-color:#7c3aed"/>
    </linearGradient>`;
  svg.insertBefore(defs, svg.firstChild);
}

function startQuiz() {
  timedOut = false;
  index = 0;
  score = 0;
  showStage("quiz");
  renderQuestion();
  startQuizTimer();
}

async function loadQuestions() {
  try {
    const res = await fetch("./questions.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!Array.isArray(data) || data.length !== TOTAL) {
      throw new Error(`Expected ${TOTAL} questions`);
    }
    questions = data;
    showStage("start");
  } catch (e) {
    showStage("error");
    console.error(e);
  }
}

els.btnStart.addEventListener("click", startQuiz);
els.btnNext.addEventListener("click", goNext);
els.btnRetry.addEventListener("click", () => {
  startQuiz();
});

injectScoreGradient();
loadQuestions();
