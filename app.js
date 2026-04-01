const QUIZ_MS = 30 * 60 * 1000;

const els = {
  stageLanding: document.getElementById("stageLanding"),
  appShell: document.getElementById("appShell"),
  btnEnterApp: document.getElementById("btnEnterApp"),
  stagePick: document.getElementById("stagePick"),
  stageStart: document.getElementById("stageStart"),
  stageQuiz: document.getElementById("stageQuiz"),
  stageResult: document.getElementById("stageResult"),
  stageComingSoon: document.getElementById("stageComingSoon"),
  stageError: document.getElementById("stageError"),
  quizList: document.getElementById("quizList"),
  btnStart: document.getElementById("btnStart"),
  btnNext: document.getElementById("btnNext"),
  btnRetry: document.getElementById("btnRetry"),
  btnBackToPart1: document.getElementById("btnBackToPart1"),
  btnTryLoadPart: document.getElementById("btnTryLoadPart"),
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
  scoreDenom: document.getElementById("scoreDenom"),
  errorText: document.getElementById("errorText"),
  timerDisplay: document.getElementById("timerDisplay"),
  startQuestionCount: document.getElementById("startQuestionCount"),
  currentQuizName: document.getElementById("currentQuizName"),
  currentQuizTag: document.getElementById("currentQuizTag"),
  sidebarSubtitle: document.getElementById("sidebarSubtitle"),
  comingSoonText: document.getElementById("comingSoonText"),
  quitQuizModal: document.getElementById("quitQuizModal"),
  quitModalBackdrop: document.getElementById("quitModalBackdrop"),
  quitModalCancel: document.getElementById("quitModalCancel"),
  quitModalConfirm: document.getElementById("quitModalConfirm"),
  reloadConfirmModal: document.getElementById("reloadConfirmModal"),
  reloadModalBackdrop: document.getElementById("reloadModalBackdrop"),
  reloadModalStay: document.getElementById("reloadModalStay"),
  reloadModalReload: document.getElementById("reloadModalReload"),
};

let questions = [];
let index = 0;
let score = 0;
let answered = false;
let quizTimerId = null;
let quizEndTime = 0;
let timedOut = false;
let total = 0;

const quizzes = [
  {
    id: "part1",
    title: "Part 1",
    file: "./questions1.json",
    questionCount: 50,
  },
  {
    id: "part2",
    title: "Part 2",
    file: "./questions2.json",
    questionCount: 50,
  },
  {
    id: "part3",
    title: "Part 3",
    file: "./questions3.json",
    questionCount: 50,
  },
];

let selectedQuizId = null;
let availableQuizIds = new Set([quizzes[0].id]);
let pendingQuizId = null;
let appInitialized = false;

const keys = ["A", "B", "C", "D"];

let quitModalPendingPartId = null;
/** When true, the next beforeunload is allowed (user confirmed reload in our dialog). */
let allowUnload = false;
/** Resolves when user dismisses an intercepted reload (Stay); set only by Navigation API handler. */
let reloadInterceptResolve = null;

function isQuizActive() {
  return !els.stageQuiz.hidden;
}

function exitQuizToWelcome() {
  clearQuizTimer();
  timedOut = false;
  index = 0;
  score = 0;
  answered = false;
  showStage("start");
}

function closeReloadConfirmModal() {
  if (!els.reloadConfirmModal) return;
  els.reloadConfirmModal.hidden = true;
  const resolve = reloadInterceptResolve;
  reloadInterceptResolve = null;
  if (resolve) resolve();
}

function openReloadConfirmModal() {
  if (!els.reloadConfirmModal) return;
  closeQuitQuizModal();
  els.reloadConfirmModal.hidden = false;
  requestAnimationFrame(() => els.reloadModalStay?.focus());
}

function confirmReloadPage() {
  const resolve = reloadInterceptResolve;
  reloadInterceptResolve = null;
  if (els.reloadConfirmModal) els.reloadConfirmModal.hidden = true;
  allowUnload = true;
  if (resolve) resolve();
  window.location.reload();
}

function isReloadShortcut(e) {
  if (e.key === "F5") return true;
  if ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R")) return true;
  return false;
}

function openQuitQuizModal(pendingPartId) {
  if (!els.quitQuizModal) return;
  closeReloadConfirmModal();
  quitModalPendingPartId = pendingPartId;
  els.quitQuizModal.hidden = false;
  requestAnimationFrame(() => els.quitModalConfirm?.focus());
}

function closeQuitQuizModal() {
  if (!els.quitQuizModal) return;
  els.quitQuizModal.hidden = true;
  quitModalPendingPartId = null;
}

function confirmQuitQuiz() {
  const partId = quitModalPendingPartId;
  closeQuitQuizModal();
  exitQuizToWelcome();
  if (partId && partId !== selectedQuizId) {
    selectQuiz(partId);
  }
}

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
  if (els.stagePick) els.stagePick.hidden = name !== "pick";
  els.stageStart.hidden = name !== "start";
  els.stageQuiz.hidden = name !== "quiz";
  els.stageResult.hidden = name !== "result";
  if (els.stageComingSoon) els.stageComingSoon.hidden = name !== "comingSoon";
  els.stageError.hidden = name !== "error";
}

function showComingSoon(quiz) {
  pendingQuizId = quiz.id;
  const fileName = quiz.file.replace(/^\.\//, "");
  if (els.comingSoonText) {
    els.comingSoonText.textContent =
      `“${quiz.title}” isn’t available yet. Add ${fileName} to the project root to enable it.`;
  }
  showStage("comingSoon");
}

function setProgress() {
  const n = index + 1;
  const completed = index;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  els.qLabel.textContent = `Question ${n} of ${total}`;
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
  const pct = total ? (score / total) * 100 : 0;
  let summary;
  if (pct >= 90) summary = "Outstanding work — strong command of the material.";
  else if (pct >= 70) summary = "Solid performance — review any missed topics to tighten gaps.";
  else if (pct >= 50) summary = "Good foundation — consider revisiting sections where answers were unclear.";
  else summary = "Keep studying — repeat the quiz after reviewing the key rules.";
  if (timedOut) summary = `Time's up — the quiz ended with your score so far. ${summary}`;
  els.resultSummary.textContent = summary;

  const circumference = 2 * Math.PI * 52;
  const offset = circumference * (1 - (total ? score / total : 0));
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

function syncAccordionPanels() {
  if (!els.quizList) return;
  els.quizList.querySelectorAll(".quiz-accordion-item").forEach((item) => {
    const id = item.dataset.quizId;
    const open = selectedQuizId != null && id === selectedQuizId;
    const trigger = item.querySelector(".quiz-accordion-trigger");
    const panel = item.querySelector(".quiz-accordion-panel");
    trigger?.setAttribute("aria-expanded", open ? "true" : "false");
    if (panel) panel.hidden = !open;
    item.classList.toggle("is-expanded", open);
    item.classList.toggle("active", open);
  });
}

function setPlaceholderPageHead() {
  if (els.currentQuizName) els.currentQuizName.textContent = "Select a quiz";
  if (els.currentQuizTag) els.currentQuizTag.textContent = "Choose from sidebar";
  document.title = "Taxi License Quiz";
}

function setSelectedQuizUI() {
  if (!selectedQuizId) {
    setPlaceholderPageHead();
    if (els.sidebarSubtitle) els.sidebarSubtitle.textContent = "Choose a quiz";
    syncAccordionPanels();
    return;
  }
  const q = quizzes.find((x) => x.id === selectedQuizId) ?? quizzes[0];
  if (els.currentQuizName) els.currentQuizName.textContent = q.title;
  if (els.currentQuizTag) els.currentQuizTag.textContent = `${q.questionCount} questions`;
  if (els.sidebarSubtitle) els.sidebarSubtitle.textContent = `Selected: ${q.title}`;
  document.title = `${q.title} | Taxi License Quiz`;
  syncAccordionPanels();
}

function setTotalsUI() {
  els.qLabel.textContent = `Question 1 of ${total}`;
  els.qPct.textContent = "0%";
  els.progressBar.setAttribute("aria-valuenow", "0");
  els.progressFill.style.width = "0%";
  if (els.scoreDenom) els.scoreDenom.textContent = `/ ${total}`;
  if (els.startQuestionCount) els.startQuestionCount.textContent = String(total);
}

function buildQuizList(readyIds = new Set([quizzes[0].id])) {
  if (!els.quizList) return;

  els.quizList.innerHTML = "";
  quizzes.forEach((q) => {
    const item = document.createElement("div");
    item.className = "quiz-accordion-item";
    item.dataset.quizId = q.id;
    const isReady = readyIds.has(q.id);
    const panelId = `quiz-panel-${q.id}`;
    const triggerId = `quiz-trigger-${q.id}`;
    item.innerHTML = `
      <button type="button" class="quiz-accordion-trigger" id="${triggerId}" aria-expanded="false" aria-controls="${panelId}">
        <span class="quiz-accordion-trigger-main">
          <span class="quiz-accordion-title"></span>
          <span class="quiz-accordion-badge">${isReady ? "Ready" : "Soon"}</span>
        </span>
        <span class="quiz-accordion-chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
      <div class="quiz-accordion-panel" id="${panelId}" role="region" aria-labelledby="${triggerId}" hidden>
        <p class="quiz-accordion-count"></p>
        <p class="quiz-accordion-hint"></p>
      </div>
    `;
    item.querySelector(".quiz-accordion-title").textContent = q.title;
    item.querySelector(".quiz-accordion-count").textContent = `${q.questionCount} Questions`;
    item.querySelector(".quiz-accordion-hint").textContent = isReady
      ? "Details load in the main workspace. Use Start quiz when you are ready."
      : "This part will open when its questions file is deployed.";

    item.querySelector(".quiz-accordion-trigger").addEventListener("click", () => {
      void selectQuiz(q.id);
    });
    els.quizList.appendChild(item);
  });

  setSelectedQuizUI();
}

/** Mark sidebar “Ready” for parts whose question file exists (HEAD, no response body). */
async function refreshReadyQuizBadges() {
  const ready = new Set([quizzes[0].id]);
  for (const q of quizzes.slice(1)) {
    try {
      const res = await fetch(q.file, { method: "HEAD", cache: "no-store" });
      if (res.ok) ready.add(q.id);
    } catch {
      // ignore
    }
  }
  availableQuizIds = ready;
  buildQuizList(availableQuizIds);
}

function updateWelcomeTitleForPart() {
  const q = quizzes.find((x) => x.id === selectedQuizId);
  if (!q || !els.startTitle) return;
  els.startTitle.textContent = q.title;
}

async function loadQuestionsFor(file) {
  try {
    const res = await fetch(file, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!Array.isArray(data) || data.length < 1) {
      throw new Error("Expected a non-empty questions array");
    }
    questions = data;
    total = questions.length;
    setTotalsUI();
    updateWelcomeTitleForPart();
    showStage("start");
  } catch (e) {
    throw e;
  }
}

async function selectQuiz(quizId) {
  const q = quizzes.find((x) => x.id === quizId);
  if (!q) return;

  clearQuizTimer();
  selectedQuizId = quizId;
  setSelectedQuizUI();

  // Reset state so users always start fresh when switching parts
  questions = [];
  total = 0;
  index = 0;
  score = 0;
  answered = false;
  timedOut = false;

  try {
    await loadQuestionsFor(q.file);
    availableQuizIds.add(q.id);
    buildQuizList(availableQuizIds);
  } catch (e) {
    const is404 = String(e?.message) === "404";
    if (is404 && q.id !== quizzes[0].id) showComingSoon(q);
    else showStage("error");
    console.error(e);
  }
}

els.btnStart.addEventListener("click", startQuiz);
els.btnNext.addEventListener("click", goNext);
els.btnRetry.addEventListener("click", () => {
  startQuiz();
});

injectScoreGradient();

async function bootstrapApp() {
  availableQuizIds = new Set([quizzes[0].id]);
  buildQuizList(availableQuizIds);
  await refreshReadyQuizBadges();
  selectedQuizId = null;
  questions = [];
  total = 0;
  showStage("pick");
  setSelectedQuizUI();
}

if (els.btnEnterApp && els.stageLanding && els.appShell) {
  els.btnEnterApp.addEventListener("click", async () => {
    els.stageLanding.hidden = true;
    els.appShell.hidden = false;
    document.body.classList.remove("landing-visible");
    if (!appInitialized) {
      appInitialized = true;
      await bootstrapApp();
    }
  });
}

if (els.btnBackToPart1) {
  els.btnBackToPart1.addEventListener("click", () => selectQuiz(quizzes[0].id));
}

if (els.btnTryLoadPart) {
  els.btnTryLoadPart.addEventListener("click", () => {
    if (pendingQuizId) selectQuiz(pendingQuizId);
  });
}

document.addEventListener(
  "click",
  (e) => {
    if (!isQuizActive()) return;
    if (!els.reloadConfirmModal.hidden) {
      if (!els.reloadConfirmModal.contains(e.target)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      return;
    }
    if (!els.quitQuizModal.hidden) {
      if (!els.quitQuizModal.contains(e.target)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      return;
    }
    if (els.stageQuiz.contains(e.target)) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const accItem = e.target.closest?.(".quiz-accordion-item");
    const pendingPartId = accItem?.dataset?.quizId ?? null;
    openQuitQuizModal(pendingPartId);
  },
  true
);

window.addEventListener(
  "keydown",
  (e) => {
    if (!isQuizActive()) return;
    if (!isReloadShortcut(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openReloadConfirmModal();
  },
  true
);

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!els.reloadConfirmModal?.hidden) {
    e.preventDefault();
    closeReloadConfirmModal();
    return;
  }
  if (!els.quitQuizModal || els.quitQuizModal.hidden) return;
  e.preventDefault();
  closeQuitQuizModal();
});

if (els.quitModalBackdrop) {
  els.quitModalBackdrop.addEventListener("click", closeQuitQuizModal);
}
if (els.quitModalCancel) {
  els.quitModalCancel.addEventListener("click", closeQuitQuizModal);
}
if (els.quitModalConfirm) {
  els.quitModalConfirm.addEventListener("click", confirmQuitQuiz);
}

if (els.reloadModalBackdrop) {
  els.reloadModalBackdrop.addEventListener("click", closeReloadConfirmModal);
}
if (els.reloadModalStay) {
  els.reloadModalStay.addEventListener("click", closeReloadConfirmModal);
}
if (els.reloadModalReload) {
  els.reloadModalReload.addEventListener("click", confirmReloadPage);
}

window.addEventListener("beforeunload", (e) => {
  if (!isQuizActive() || allowUnload) return;
  e.preventDefault();
  e.returnValue = "";
});

/**
 * Toolbar / menu “Reload” uses the Navigation API in Chromium-based browsers.
 * Intercept the reload, show our modal, then either resolve (stay) or location.reload() (confirm).
 */
function setupNavigationReloadGuard() {
  if (typeof navigation === "undefined" || typeof navigation.addEventListener !== "function") return;

  navigation.addEventListener("navigate", (event) => {
    if (event.navigationType !== "reload") return;
    if (!isQuizActive() || allowUnload) return;
    if (!event.canIntercept) return;

    try {
      event.intercept({
        focusReset: "manual",
        scroll: "manual",
        async handler() {
          await new Promise((resolve) => {
            reloadInterceptResolve = resolve;
            openReloadConfirmModal();
          });
        },
      });
    } catch {
      // No intercept (e.g. unsupported); beforeunload remains the fallback.
    }
  });
}

setupNavigationReloadGuard();
