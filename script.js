const timeDisplay = document.querySelector("#time");
const timerLabel = document.querySelector("#timer-label");
const timerSubtitle = document.querySelector("#timer-subtitle");
const startButton = document.querySelector("#start-button");
const startButtonLabel = document.querySelector("#start-button-label");
const resetButton = document.querySelector("#reset-button");
const skipButton = document.querySelector("#skip-button");
const progressRing = document.querySelector(".progress-value");
const presetButtons = document.querySelectorAll(".preset-button[data-minutes]");
const customButton = document.querySelector("#custom-button");
const customDialog = document.querySelector("#custom-dialog");
const customForm = document.querySelector("#custom-form");
const customMinutesInput = document.querySelector("#custom-minutes");
const closeDialogButton = document.querySelector("#close-dialog");
const toast = document.querySelector("#toast");
const todayCount = document.querySelector("#today-count");
const clearHistoryButton = document.querySelector("#clear-history");
const historyList = document.querySelector("#history-list");
const historyEmpty = document.querySelector("#history-empty");
const statSessions = document.querySelector("#stat-sessions");
const statMinutes = document.querySelector("#stat-minutes");
const statStreak = document.querySelector("#stat-streak");
const themeToggle = document.querySelector("#theme-toggle");
const themeMeta = document.querySelector('meta[name="theme-color"]');

const circumference = 2 * Math.PI * 137;
const historyKey = "still.focus-history.v1";
const themeKey = "still.theme";
const themeColors = { dark: "#101114", light: "#f4f3ee" };
const historyLimit = 60;
let duration = 25 * 60;
let remaining = duration;
let intervalId = null;
let endTime = null;
let toastTimeoutId = null;
let history = loadHistory();
let sessionLogged = false;

progressRing.style.strokeDasharray = `${circumference}`;
progressRing.style.strokeDashoffset = "0";

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function dayKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDateTime(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (dayKey(date) === dayKey(today)) return `Today, ${time}`;
  if (dayKey(date) === dayKey(yesterday)) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

function computeStreak(entries) {
  const activeDays = new Set(entries.map((entry) => dayKey(new Date(entry.finishedAt))));
  const cursor = new Date();
  if (!activeDays.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (activeDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function loadHistory() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(historyKey));
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (entry) =>
        entry &&
        Number.isFinite(entry.minutes) &&
        Number.isFinite(entry.elapsedSeconds) &&
        Number.isFinite(new Date(entry.finishedAt).getTime()),
    );
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    window.localStorage.setItem(historyKey, JSON.stringify(history));
  } catch {
    /* storage unavailable — history stays in memory for this session */
  }
}

function createHistoryItem(entry) {
  const item = document.createElement("li");
  item.className = `history-item${entry.completed ? " is-complete" : ""}`;

  const marker = document.createElement("span");
  marker.className = "history-marker";
  marker.setAttribute("aria-hidden", "true");

  const details = document.createElement("div");
  details.className = "history-details";

  const title = document.createElement("span");
  title.className = "history-title";
  title.textContent = `${entry.minutes} min focus`;

  const meta = document.createElement("span");
  meta.className = "history-meta";
  const minutesFocused = Math.max(1, Math.round(entry.elapsedSeconds / 60));
  meta.textContent = `${formatDateTime(new Date(entry.finishedAt))} · ${minutesFocused} min focused`;

  details.append(title, meta);

  const badge = document.createElement("span");
  badge.className = "history-badge";
  badge.textContent = entry.completed ? "DONE" : "STOPPED";

  item.append(marker, details, badge);
  return item;
}

function renderHistory() {
  const today = dayKey(new Date());
  const sorted = [...history].sort(
    (a, b) => new Date(b.finishedAt) - new Date(a.finishedAt),
  );

  historyList.replaceChildren(...sorted.slice(0, historyLimit).map(createHistoryItem));
  historyEmpty.hidden = history.length > 0;
  clearHistoryButton.disabled = history.length === 0;

  const focusedSeconds = history.reduce((sum, entry) => sum + entry.elapsedSeconds, 0);
  const completedToday = history.filter(
    (entry) => entry.completed && dayKey(new Date(entry.finishedAt)) === today,
  ).length;

  statSessions.textContent = String(history.length);
  statMinutes.textContent = String(Math.round(focusedSeconds / 60));
  statStreak.textContent = String(computeStreak(history));
  todayCount.textContent = String(completedToday).padStart(2, "0");
}

function addHistoryEntry(completed) {
  const elapsedSeconds = Math.min(duration, Math.max(0, duration - remaining));
  if (!completed && elapsedSeconds < 60) return;

  history = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      minutes: Math.round(duration / 60),
      elapsedSeconds,
      completed,
      finishedAt: new Date().toISOString(),
    },
    ...history,
  ].slice(0, historyLimit);

  saveHistory();
  renderHistory();
}

function beginSession() {
  sessionLogged = false;
}

function applyTheme(theme) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  themeMeta.setAttribute("content", themeColors[next]);
  themeToggle.setAttribute(
    "aria-label",
    next === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
  themeToggle.setAttribute("title", next === "dark" ? "Light mode" : "Dark mode");
}

function saveTheme(theme) {
  try {
    window.localStorage.setItem(themeKey, theme);
  } catch {
    /* storage unavailable — theme applies to this session only */
  }
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(next);
  saveTheme(next);
  showToast(next === "light" ? "Light mode on." : "Dark mode on.");
}
function endSession(completed) {
  if (sessionLogged) return;
  sessionLogged = true;
  addHistoryEntry(completed);
}

function render() {
  const time = formatTime(remaining);
  timeDisplay.textContent = time;
  timeDisplay.setAttribute(
    "aria-label",
    `${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds`,
  );
  progressRing.style.strokeDashoffset = `${circumference * (1 - remaining / duration)}`;
  if (intervalId !== null) document.title = `${time} — Still`;
}

function setRunning(running) {
  startButton.classList.toggle("is-running", running);
  startButtonLabel.textContent = running ? "Pause focus" : "Start focus";
  startButton.setAttribute("aria-label", running ? "Pause focus timer" : "Start focus timer");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeoutId);
  toastTimeoutId = window.setTimeout(() => toast.classList.remove("visible"), 3000);
}

function stopTimer() {
  window.clearInterval(intervalId);
  intervalId = null;
  endTime = null;
  setRunning(false);
}

function finishTimer() {
  stopTimer();
  remaining = 0;
  endSession(true);
  render();
  timerLabel.textContent = "SESSION COMPLETE";
  timerSubtitle.textContent = "Beautifully done. Take a little pause.";
  showToast("Focus session complete. Nice work!");
  document.title = "Session complete — Still";
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Still", { body: "Your focus session is complete. Take a little pause." });
  }
}

function tick() {
  remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  render();
  if (remaining === 0) finishTimer();
}

function startTimer() {
  if (remaining <= 0) {
    remaining = duration;
    render();
  }

  beginSession();
  timerLabel.textContent = "YOU'RE IN THE FLOW";
  timerSubtitle.textContent = "One thing at a time.";
  endTime = Date.now() + remaining * 1000;
  setRunning(true);
  tick();
  intervalId = window.setInterval(tick, 250);
  document.title = `${formatTime(remaining)} — Still`;
}

function pauseTimer() {
  tick();
  if (intervalId === null) return;
  stopTimer();
  timerLabel.textContent = "TAKE YOUR TIME";
  timerSubtitle.textContent = "Paused. Pick it up when you're ready.";
  document.title = `${formatTime(remaining)} — Paused`;
}

function resetTimer() {
  endSession(false);
  stopTimer();
  remaining = duration;
  timerLabel.textContent = "READY WHEN YOU ARE";
  timerSubtitle.textContent = "A little space, just for you.";
  document.title = "Still — Focus Timer";
  render();
}

function selectDuration(minutes) {
  endSession(false);
  duration = minutes * 60;
  remaining = duration;
  stopTimer();
  timerLabel.textContent = "READY WHEN YOU ARE";
  timerSubtitle.textContent = "A little space, just for you.";
  document.title = "Still — Focus Timer";
  render();
}

startButton.addEventListener("click", () => {
  if (intervalId === null) {
    startTimer();
  } else {
    pauseTimer();
  }
});

resetButton.addEventListener("click", resetTimer);

skipButton.addEventListener("click", () => {
  resetTimer();
  timerLabel.textContent = "READY FOR WHAT'S NEXT";
  timerSubtitle.textContent = "Choose a duration and begin again.";
  showToast("Timer reset. You're all set for the next one.");
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    customButton.classList.remove("selected");
    customButton.setAttribute("aria-pressed", "false");
    presetButtons.forEach((preset) => {
      const selected = preset === button;
      preset.classList.toggle("selected", selected);
      preset.setAttribute("aria-pressed", String(selected));
    });
    selectDuration(Number(button.dataset.minutes));
  });
});

customButton.addEventListener("click", () => {
  if (intervalId !== null) pauseTimer();
  customDialog.showModal();
  customMinutesInput.focus();
});

closeDialogButton.addEventListener("click", () => customDialog.close());

customDialog.addEventListener("click", (event) => {
  if (event.target === customDialog) customDialog.close();
});

customForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!customForm.reportValidity()) return;

  const minutes = Number(customMinutesInput.value);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
    customMinutesInput.setCustomValidity("Choose a whole number between 1 and 180.");
    customMinutesInput.reportValidity();
    return;
  }

  customMinutesInput.setCustomValidity("");
  presetButtons.forEach((button) => {
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
  });
  customButton.classList.add("selected");
  customButton.setAttribute("aria-pressed", "true");
  selectDuration(minutes);
  customDialog.close();
  showToast(`Your ${minutes}-minute timer is ready.`);
});

customMinutesInput.addEventListener("input", () => customMinutesInput.setCustomValidity(""));

clearHistoryButton.addEventListener("click", () => {
  if (history.length === 0) return;
  history = [];
  saveHistory();
  renderHistory();
  showToast("History cleared.");
});

themeToggle.addEventListener("click", toggleTheme);

document.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.repeat || customDialog.open) return;
  const target = event.target;
  if (target instanceof Element && target.closest("button, a, input, textarea, select, dialog")) return;
  event.preventDefault();
  startButton.click();
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (event) => {
  let stored = null;
  try {
    stored = window.localStorage.getItem(themeKey);
  } catch {
    /* storage unavailable */
  }
  if (stored !== "light" && stored !== "dark") applyTheme(event.matches ? "light" : "dark");
});

renderHistory();
applyTheme(document.documentElement.dataset.theme);
render();
