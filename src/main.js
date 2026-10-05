import { createClient } from "@supabase/supabase-js";
import { categories, quizzes, relatedReadings } from "./content.js";
import "./style.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const root = document.querySelector("#app");
const state = { user: null, groupId: null, view: "library", category: "All essays", query: "", currentQuiz: null, questionIndex: 0, answers: {}, startedAt: null, authMode: "sign-in", busy: false };
const localKey = "margin-cat-preview-attempts";
const inviteKey = "margin-pending-invite";
const themeKey = "margin-theme";

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeKey, theme);
}

const savedTheme = localStorage.getItem(themeKey);
applyTheme(savedTheme || (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function attemptsFromLocal() {
  try { return JSON.parse(localStorage.getItem(localKey) || "[]"); } catch { return []; }
}

async function loadAttempts() {
  if (!supabase || !state.user) return attemptsFromLocal();
  const { data, error } = await supabase.from("quiz_attempts").select("id, quiz_slug, score, question_count, duration_seconds, completed_at").order("completed_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function statusPill() {
  if (supabase) return state.user ? `<span class="account-pill"><span class="status-dot"></span>${escapeHtml(state.user.email)}</span>` : `<button class="button button-dark button-small" data-action="auth">Sign in</button>`;
  return `<span class="preview-pill"><span class="status-dot"></span>Preview mode</span>`;
}

function header() {
  const dark = document.documentElement.dataset.theme === "dark";
  return `<header class="topbar"><a class="brand" href="#" data-action="home" aria-label="Margin home"><span class="brand-mark">m</span><span>margin<span class="brand-dot">.</span></span></a><nav class="topnav"><button class="nav-link ${state.view === "library" ? "active" : ""}" data-action="home">Library <span class="nav-count">${quizzes.length}</span></button><button class="nav-link ${state.view === "history" ? "active" : ""}" data-action="history">My attempts</button></nav><div class="account"><button class="theme-toggle" data-action="toggle-theme" aria-label="Switch to ${dark ? "light" : "dark"} theme" title="Switch to ${dark ? "light" : "dark"} theme">${dark ? "☼" : "☾"}</button>${statusPill()}${supabase && state.user ? `<button class="icon-button" data-action="sign-out" aria-label="Sign out" title="Sign out">↗</button>` : ""}</div></header>`;
}

function visibleQuizzes() {
  const q = state.query.trim().toLowerCase();
  return quizzes.filter((quiz) => (state.category === "All essays" || quiz.category === state.category) && (!q || `${quiz.title} ${quiz.author} ${quiz.category}`.toLowerCase().includes(q)));
}

function homeView() {
  const list = visibleQuizzes();
  const readingQuery = state.query.trim().toLowerCase();
  const readingList = relatedReadings.filter((item) => !readingQuery || `${item.title} ${item.author} ${item.publisher}`.toLowerCase().includes(readingQuery));
  return `<main>
    <section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="eyebrow-line"></span> THE DAILY READING ROOM</div><h1>Read closely.<br><em>Think harder.</em></h1><p class="hero-text">A private CAT RC practice room for curious people. Read at the original publisher, then test how carefully you followed the argument.</p><div class="hero-meta"><span><strong>${quizzes.length}</strong> CAT quizzes</span><span class="meta-separator">·</span><span><strong>126</strong> hard questions</span><span class="meta-separator">·</span><span><strong>${relatedReadings.length}</strong> more reading links</span><span class="meta-separator">·</span><span>private attempts</span></div></div><div class="hero-art" aria-hidden="true"><div class="art-sun"></div><div class="art-book"><span></span><span></span><span></span></div><div class="art-caption">A good question<br>changes the reading.</div><div class="art-number">01<br>— ${quizzes.length}</div></div></section>
    ${!supabase ? `<aside class="preview-note"><span class="note-icon">i</span><div><strong>Preview mode</strong><p>Try the quizzes here. To share the library and keep each friend’s attempts private across devices, connect the Supabase project described in the setup guide.</p></div></aside>` : !state.user ? `<aside class="preview-note"><span class="note-icon">i</span><div><strong>Sign in to keep your work private</strong><p>Create an account to save your attempts. Each member can read every quiz; only you can see your answers and scores.</p></div><button class="button button-dark button-small" data-action="auth">Sign in / join</button></aside>` : ""}
    <section class="library-section"><div class="section-heading"><div><div class="eyebrow">THE COLLECTION</div><h2>Choose an essay</h2></div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Find an essay or author" value="${escapeHtml(state.query)}" /><kbd>⌘ K</kbd></label></div><div class="filter-row"><div class="filters"><button class="filter ${state.category === "All essays" ? "selected" : ""}" data-category="All essays">All essays <span>${quizzes.length}</span></button>${categories.map((category) => `<button class="filter ${state.category === category ? "selected" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join("")}</div><div class="sort-label">ORDERED FOR YOUR NEXT READ <span>↘</span></div></div><div class="quiz-grid">${list.map((quiz, index) => quizCard(quiz, index)).join("") || `<div class="empty-state">No essays match that search. Try another title or author.</div>`}</div></section>
    <section class="library-section related-section"><div class="section-heading"><div><div class="eyebrow">MORE READING · 10 SOURCE LINKS ADDED</div><h2>Further reading</h2></div></div><p class="related-note">These link to Scientific American and Nautilus. They’re listed as reading resources, not quizzes: article lengths and permission for quiz generation and sharing still need confirmation.</p><div class="quiz-grid">${readingList.map((item, index) => readingCard(item, index)).join("") || `<div class="empty-state">No related readings match that search.</div>`}</div></section>
    <footer class="site-footer"><span>Read the essay at its source. Practice stays yours.</span><span>Built for the long argument <span class="brand-dot">✳</span></span></footer>
  </main>`;
}

function quizCard(quiz, index) {
  const number = String(quizzes.indexOf(quiz) + 1).padStart(2, "0");
  const wash = ["wash-rose", "wash-blue", "wash-yellow", "wash-lilac", "wash-green"][index % 5];
  return `<article class="quiz-card"><div class="card-top"><span class="card-number">${number} <span>/ 21</span></span><span class="difficulty">VERY HARD</span></div><a class="source-art ${wash}" href="${quiz.url}" target="_blank" rel="noreferrer" aria-label="Read ${escapeHtml(quiz.title)} on Aeon"><span class="source-open">READ ARTICLE ↗</span><span class="source-glyph">${categoryGlyph(quiz.category)}</span><span class="source-category">${escapeHtml(quiz.category)}</span></a><div class="card-body"><h3>${escapeHtml(quiz.title)}</h3><p class="byline">${escapeHtml(quiz.author)} <span>·</span> Aeon Essay</p><div class="card-detail"><span>6 questions</span><span class="card-detail-dot">·</span><span>Inference + CR</span></div><div class="card-actions"><a class="text-link" href="${quiz.url}" target="_blank" rel="noreferrer">Read article <span>↗</span></a><button class="button button-outline" data-quiz="${quiz.slug}">Take quiz <span>→</span></button></div></div></article>`;
}

function readingCard(item, index) {
  const wash = ["wash-blue", "wash-lilac", "wash-green", "wash-yellow", "wash-rose"][index % 5];
  return `<article class="quiz-card reading-card"><div class="card-top"><span class="card-number">READ <span>/ SOURCE</span></span><span class="difficulty reading-status">QUIZ PENDING</span></div><a class="source-art ${wash}" href="${item.url}" target="_blank" rel="noreferrer" aria-label="Read ${escapeHtml(item.title)} at ${escapeHtml(item.publisher)}"><span class="source-open">READ ARTICLE ↗</span><span class="source-glyph">${item.publisher === "Nautilus" ? "N" : "S"}</span><span class="source-category">${escapeHtml(item.publisher)}</span></a><div class="card-body"><h3>${escapeHtml(item.title)}</h3><p class="byline">${escapeHtml(item.author)} <span>·</span> ${escapeHtml(item.publisher)}</p><p class="reading-note">${escapeHtml(item.note)}</p><div class="card-actions"><a class="text-link" href="${item.url}" target="_blank" rel="noreferrer">Open at publisher <span>↗</span></a></div></div></article>`;
}

function categoryGlyph(category) {
  return ({ Philosophy: "§", "AI & reason": "∴", "AI & language": "¶", "Mind & perception": "◉", "History & society": "⌘", "Language & culture": "Aa", "Culture & wellbeing": "✳", "History & culture": "↗" })[category] || "∴";
}

function quizIntro(quiz) {
  return `<main class="quiz-shell"><button class="back-link" data-action="home">← Back to library</button><div class="quiz-heading"><div class="eyebrow">CAT RC · VERY HARD</div><h1>${escapeHtml(quiz.title)}</h1><p class="quiz-byline">${escapeHtml(quiz.author)} <span>·</span> Aeon Essay</p><div class="read-first"><div class="read-icon">↗</div><div><span class="eyebrow">READ THIS ARTICLE FIRST</span><p>Open the original essay, then return here when you’re ready. The quiz contains questions only—no passage text.</p></div><a class="button button-dark" href="${quiz.url}" target="_blank" rel="noreferrer">Read on Aeon <span>↗</span></a></div><div class="quiz-instructions"><span>06 QUESTIONS</span><span>·</span><span>NO TIMER</span><span>·</span><span>YOUR RESULT IS PRIVATE</span></div><button class="button button-accent start-button" data-action="begin" data-quiz="${quiz.slug}">I’ve read the essay <span>→</span></button></div></main>`;
}

function activeQuizView() {
  const quiz = state.currentQuiz;
  if (state.view === "intro") return quizIntro(quiz);
  const question = quiz.questions[state.questionIndex];
  const selected = state.answers[question.id];
  const optionLetters = ["A", "B", "C", "D"];
  const progress = Math.round(((state.questionIndex + 1) / quiz.questions.length) * 100);
  return `<main class="quiz-shell attempt-shell"><div class="attempt-top"><button class="back-link" data-action="quit">← Leave quiz</button><div class="attempt-source"><span>READING</span><strong>${escapeHtml(quiz.title)}</strong><a href="${quiz.url}" target="_blank" rel="noreferrer">Article ↗</a></div><span class="question-counter">${String(state.questionIndex + 1).padStart(2, "0")} <span>/ ${quiz.questions.length}</span></span></div><div class="progress-track"><span style="width:${progress}%"></span></div><section class="question-card"><div class="question-meta"><span>QUESTION ${String(state.questionIndex + 1).padStart(2, "0")}</span><span class="skill-label">${escapeHtml(question.skill)}</span></div><h1>${escapeHtml(question.prompt)}</h1><div class="option-list">${question.options.map((option, i) => `<button class="option ${selected === i ? "chosen" : ""}" data-option="${i}"><span class="option-letter">${optionLetters[i]}</span><span>${escapeHtml(option.text)}</span><span class="option-check">${selected === i ? "✓" : ""}</span></button>`).join("")}</div><div class="question-nav"><button class="button button-outline" data-action="previous" ${state.questionIndex === 0 ? "disabled" : ""}>← Previous</button><span>${selected === undefined ? "Choose the best-supported option" : "Answer saved for this attempt"}</span>${state.questionIndex < quiz.questions.length - 1 ? `<button class="button button-dark" data-action="next" ${selected === undefined ? "disabled" : ""}>Next question <span>→</span></button>` : `<button class="button button-accent" data-action="submit" ${Object.keys(state.answers).length !== quiz.questions.length ? "disabled" : ""}>Submit answers <span>→</span></button>`}</div></section></main>`;
}

async function historyView() {
  let attempts = [];
  let error = "";
  try { attempts = await loadAttempts(); } catch (e) { error = e.message; }
  const rows = attempts.map((attempt) => {
    const quiz = quizzes.find((item) => item.slug === attempt.quiz_slug);
    return quiz ? `<article class="history-row"><div><div class="eyebrow">${escapeHtml(quiz.category)}</div><h3>${escapeHtml(quiz.title)}</h3><p>${new Date(attempt.completed_at || Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · ${Math.floor((attempt.duration_seconds || 0) / 60)} min</p></div><div class="history-score"><strong>${attempt.score}/${attempt.question_count}</strong><span>private score</span></div></article>` : "";
  }).join("");
  return `<main class="history-shell"><button class="back-link" data-action="home">← Back to library</button><div class="eyebrow">ONLY YOU CAN SEE THIS</div><h1>Your reading record</h1><p class="history-lede">A quiet record of the arguments you’ve worked through. Scores and answers are never shown to other members.</p>${error ? `<div class="inline-error">Could not load attempts: ${escapeHtml(error)}</div>` : ""}<section class="history-list">${rows || `<div class="empty-state">No completed quizzes yet. Your first result will live here.</div>`}</section></main>`;
}

function resultsView() {
  const quiz = state.currentQuiz;
  const right = quiz.questions.filter((question) => question.options[state.answers[question.id]]?.correct).length;
  const percent = Math.round((right / quiz.questions.length) * 100);
  const resultLabel = percent >= 75 ? "Excellent close reading" : percent >= 50 ? "Good start—review the traps" : "A useful first pass";
  return `<main class="results-shell"><div class="results-head"><div class="eyebrow">ATTEMPT COMPLETE · PRIVATE TO YOU</div><div class="score-line"><div><span class="score-number">${right}<span>/${quiz.questions.length}</span></span><span class="score-caption">${resultLabel}</span></div><div class="score-ring" style="--score:${percent}%"><span>${percent}<small>%</small></span></div></div><h1>${escapeHtml(quiz.title)}</h1><p class="quiz-byline">${escapeHtml(quiz.author)} · <a href="${quiz.url}" target="_blank" rel="noreferrer">Read the article ↗</a></p></div><section class="solutions"><div class="solutions-heading"><div><div class="eyebrow">ANSWER REVIEW</div><h2>Work through the reasoning</h2></div><span>YOUR ANSWERS STAY PRIVATE</span></div>${quiz.questions.map((question, idx) => solutionCard(question, idx, state.answers[question.id])).join("")}</section><div class="results-actions"><button class="button button-outline" data-action="history">View my attempts</button><button class="button button-dark" data-action="home">Back to the library <span>→</span></button></div></main>`;
}

function solutionCard(question, index, selected) {
  const correctIndex = question.options.findIndex((option) => option.correct);
  return `<article class="solution-card"><div class="solution-head"><span>Q${String(index + 1).padStart(2, "0")}</span><span class="skill-label">${escapeHtml(question.skill)}</span><span class="answer-state ${selected === correctIndex ? "right" : "wrong"}">${selected === correctIndex ? "CORRECT" : "REVIEW"}</span></div><h3>${escapeHtml(question.prompt)}</h3><p class="solution-explanation">${escapeHtml(question.options[correctIndex].note)}</p><div class="solution-options">${question.options.map((option, i) => `<div class="solution-option ${option.correct ? "correct-answer" : ""} ${i === selected ? "your-answer" : ""}"><span class="solution-letter">${String.fromCharCode(65 + i)}</span><span class="solution-text">${escapeHtml(option.text)}${option.correct ? `<small>Answer reasoning: ${escapeHtml(question.options[correctIndex].note)}</small>` : `<small class="trap-note">${i === selected ? "Your answer · " : "Trap · "}${escapeHtml(option.trap || "Distractor")}: ${escapeHtml(option.note || "This option does not follow from the passage’s reasoning.")}</small>`}</span>${option.correct ? `<span class="correct-mark">✓</span>` : ""}</div>`).join("")}</div></article>`;
}

function authModal() {
  if (!supabase || state.user) return "";
  return `<div class="modal-backdrop"><section class="auth-modal"><button class="modal-close" data-action="close-auth" aria-label="Close">×</button><div class="brand modal-brand"><span class="brand-mark">m</span><span>margin<span class="brand-dot">.</span></span></div><div class="eyebrow">YOUR OWN READING RECORD</div><h2>${state.authMode === "sign-up" ? "Join the room" : "Welcome back"}</h2><p>Every quiz is shared. Your attempts and scores are yours alone.</p><form id="auth-form"><label>Email address<input type="email" name="email" required autocomplete="email" placeholder="you@example.com" /></label><label>Password<input type="password" name="password" required minlength="8" autocomplete="${state.authMode === "sign-up" ? "new-password" : "current-password"}" placeholder="At least 8 characters" /></label><label>Study-group invite code <span class="optional-label">(if you have not joined yet)</span><input type="text" name="invite_code" autocomplete="off" placeholder="Ask the group owner" /></label><button class="button button-dark auth-submit" type="submit">${state.authMode === "sign-up" ? "Create account" : "Sign in"} <span>→</span></button><div id="auth-error" class="inline-error" hidden></div></form><button class="switch-auth" data-action="switch-auth">${state.authMode === "sign-up" ? "Already a member? Sign in" : "New here? Create an account"}</button></section></div>`;
}

function joinModal() {
  if (!supabase || !state.user || state.groupId) return "";
  return `<div class="modal-backdrop"><section class="auth-modal"><div class="brand modal-brand"><span class="brand-mark">m</span><span>margin<span class="brand-dot">.</span></span></div><div class="eyebrow">ONE PRIVATE STUDY GROUP</div><h2>Join your reading room</h2><p>Enter the invite code from the person who set up your group. Your scores stay visible only to you.</p><form id="join-form"><label>Study-group invite code<input type="text" name="invite_code" required autocomplete="off" placeholder="10-character code" /></label><button class="button button-dark auth-submit" type="submit">Join group <span>→</span></button><div id="join-error" class="inline-error" hidden></div></form></section></div>`;
}

function render() {
  if (state.view === "library") root.innerHTML = `${header()}${homeView()}${authModal()}${joinModal()}`;
  else if (state.view === "history") root.innerHTML = `${header()}<div id="history-view"></div>${authModal()}${joinModal()}`;
  else if (["intro", "attempt"].includes(state.view)) root.innerHTML = `${header()}${activeQuizView()}${authModal()}${joinModal()}`;
  else if (state.view === "results") root.innerHTML = `${header()}${resultsView()}${authModal()}${joinModal()}`;
  if (state.view === "history") historyView().then((html) => { const target = document.querySelector("#history-view"); if (target) target.innerHTML = html; });
  const search = document.querySelector("#search");
  if (search) search.addEventListener("input", (event) => { state.query = event.target.value; const cursor = event.target.selectionStart; render(); document.querySelector("#search")?.focus(); document.querySelector("#search")?.setSelectionRange(cursor, cursor); });
}

function beginQuiz(slug) {
  if (supabase && !state.user) { state.authMode = "sign-in"; render(); return; }
  if (supabase && !state.groupId) { render(); return; }
  state.currentQuiz = quizzes.find((quiz) => quiz.slug === slug);
  state.answers = {};
  state.questionIndex = 0;
  state.startedAt = Date.now();
  state.view = "intro";
  render();
  window.scrollTo(0, 0);
}

async function saveAttempt() {
  const quiz = state.currentQuiz;
  const score = quiz.questions.filter((question) => question.options[state.answers[question.id]]?.correct).length;
  const payload = { quiz_slug: quiz.slug, score, question_count: quiz.questions.length, duration_seconds: Math.max(0, Math.round((Date.now() - state.startedAt) / 1000)), answers: state.answers, completed_at: new Date().toISOString() };
  if (supabase && state.user) {
    const { error } = await supabase.from("quiz_attempts").insert({ ...payload, user_id: state.user.id, group_id: state.groupId });
    if (error) throw error;
  } else {
    const history = attemptsFromLocal();
    history.unshift({ ...payload, id: crypto.randomUUID() });
    localStorage.setItem(localKey, JSON.stringify(history));
  }
}

root.addEventListener("click", async (event) => {
  const category = event.target.closest("[data-category]");
  if (category) { state.category = category.dataset.category; render(); return; }
  const quizButton = event.target.closest("[data-quiz]");
  if (quizButton && quizButton.dataset.quiz) { beginQuiz(quizButton.dataset.quiz); return; }
  const optionButton = event.target.closest("[data-option]");
  if (optionButton) {
    const question = state.currentQuiz.questions[state.questionIndex];
    state.answers[question.id] = Number(optionButton.dataset.option);
    render();
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "home") { state.view = "library"; state.currentQuiz = null; render(); window.scrollTo(0, 0); }
  if (action === "toggle-theme") { applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"); render(); }
  if (action === "history") { state.view = "history"; render(); window.scrollTo(0, 0); }
  if (action === "auth") { state.authMode = "sign-in"; render(); }
  if (action === "close-auth") render();
  if (action === "switch-auth") { state.authMode = state.authMode === "sign-up" ? "sign-in" : "sign-up"; render(); }
  if (action === "sign-out") { await supabase.auth.signOut(); state.user = null; render(); }
  if (action === "begin") { state.view = "attempt"; state.startedAt = Date.now(); render(); window.scrollTo(0, 0); }
  if (action === "quit") { state.view = "intro"; render(); }
  if (action === "previous") { state.questionIndex = Math.max(0, state.questionIndex - 1); render(); }
  if (action === "next") { state.questionIndex = Math.min(state.currentQuiz.questions.length - 1, state.questionIndex + 1); render(); }
  if (action === "submit") {
    state.busy = true; render();
    try { await saveAttempt(); state.view = "results"; }
    catch (error) { state.view = "attempt"; state.questionIndex = state.currentQuiz.questions.length - 1; window.alert(`Could not save this attempt: ${error.message}`); }
    finally { state.busy = false; render(); window.scrollTo(0, 0); }
  }
});

root.addEventListener("submit", async (event) => {
  if (event.target.id === "join-form") {
    event.preventDefault();
    const code = String(new FormData(event.target).get("invite_code") || "").trim();
    const button = event.target.querySelector("button[type=submit]");
    const errorBox = event.target.querySelector("#join-error");
    button.disabled = true;
    try {
      const { data, error } = await supabase.rpc("join_group", { p_invite_code: code });
      if (error) throw error;
      state.groupId = data;
      localStorage.removeItem(inviteKey);
      render();
    } catch (error) { errorBox.hidden = false; errorBox.textContent = error.message; }
    finally { button.disabled = false; }
    return;
  }
  if (event.target.id !== "auth-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const email = String(form.get("email"));
  const password = String(form.get("password"));
  const enteredCode = String(form.get("invite_code") || "").trim();
  const button = event.target.querySelector("button[type=submit]");
  const errorBox = event.target.querySelector("#auth-error");
  button.disabled = true;
  try {
    const result = state.authMode === "sign-up"
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (state.authMode === "sign-up" && !result.data.session) {
      if (enteredCode) localStorage.setItem(inviteKey, enteredCode);
      errorBox.hidden = false;
      errorBox.textContent = "Check your email to confirm the account, then sign in. Your invite code has been saved on this device.";
    } else {
      state.user = result.data.user;
      const pendingCode = enteredCode || localStorage.getItem(inviteKey) || "";
      const { data: currentGroup, error: groupError } = await supabase.rpc("get_my_group");
      if (groupError) throw groupError;
      state.groupId = currentGroup;
      if (!state.groupId && pendingCode) {
        const { data: joinedGroup, error: joinError } = await supabase.rpc("join_group", { p_invite_code: pendingCode });
        if (joinError) throw joinError;
        state.groupId = joinedGroup;
        localStorage.removeItem(inviteKey);
      }
      render();
    }
  } catch (error) {
    errorBox.hidden = false;
    errorBox.textContent = error.message;
  } finally { button.disabled = false; }
});

if (supabase) {
  supabase.auth.getSession().then(async ({ data }) => {
    state.user = data.session?.user || null;
    if (state.user) {
      const { data: groupId } = await supabase.rpc("get_my_group");
      state.groupId = groupId;
      const pendingCode = localStorage.getItem(inviteKey);
      if (!state.groupId && pendingCode) {
        const { data: joinedGroup } = await supabase.rpc("join_group", { p_invite_code: pendingCode });
        state.groupId = joinedGroup;
        if (joinedGroup) localStorage.removeItem(inviteKey);
      }
    }
    render();
  });
  supabase.auth.onAuthStateChange((_event, session) => { state.user = session?.user || null; if (!state.user) state.groupId = null; render(); });
} else render();

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.querySelector("#search")?.focus(); }
});
