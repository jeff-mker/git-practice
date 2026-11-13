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

const circumference = 2 * Math.PI * 137;
let duration = 25 * 60;
let remaining = duration;
let intervalId = null;
let endTime = null;
let toastTimeoutId = null;

progressRing.style.strokeDasharray = `${circumference}`;
progressRing.style.strokeDashoffset = "0";

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function render() {
  const time = formatTime(remaining);
  timeDisplay.textContent = time;
  timeDisplay.setAttribute(
    "aria-label",
    `${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds`,
  );
  progressRing.style.strokeDashoffset = `${circumference * (1 - remaining / duration)}`;
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
  stopTimer();
  remaining = duration;
  timerLabel.textContent = "READY WHEN YOU ARE";
  timerSubtitle.textContent = "A little space, just for you.";
  document.title = "Still — Focus Timer";
  render();
}

function selectDuration(minutes) {
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

render();
