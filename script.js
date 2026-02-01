const appState = {
  currentSceneIndex: -1, // -1 is Start Screen
  isTyping: false,
  textToType: "",
  audioEnabled: true, // Start with audio ON
  audioPlaying: false,
};

const scenes = [
  {
    id: "scene-1",
    text: "สวัสดี\nนี่ไม่ใช่โฆษณา\nนี่คือแมว",
    catState: "start",
    hasChoices: false,
  },
  {
    id: "scene-2",
    text: "เอาจริง ๆ\nแมวแค่อยากทักเฉย ๆ",
    catState: "shy",
    hasChoices: false,
  },
  {
    id: "scene-3",
    text: "แล้วก็แอบคิดว่า…\nเรากลับมาคุยกันได้ไหมนะ",
    catState: "shy",
    hasChoices: false,
  },
  {
    id: "scene-4",
    text: "ถ้าไม่สะดวก\nแมวก็จะไปนั่งเลียอุ้งเท้าเงียบ ๆ",
    catState: "deadpan",
    hasChoices: false,
  },
  {
    id: "scene-final",
    text: "เลือกหน่อยน้า...",
    catState: "start",
    hasChoices: true,
  },
];

// Elements
const dialogueText = document.getElementById("dialogue-text");
const tapHint = document.getElementById("tap-hint");
const scenesContainer = document.getElementById("app-container");
const audioBtn = document.getElementById("audio-btn");
const progressDots = document.getElementById("progress-dots");

// Audio (Placeholder frequency synth if no file)
// Audio Logic (Web Audio API)
let audioCtx;
let bgmOscillators = [];
let isMuted = false; // Start with audio ON

function initAudio() {
  if (audioCtx) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  } catch (e) {
    console.warn("AudioContext not supported");
  }
}

// 8-bit Melody: Simple arpeggio
const melody = [
  392.0,
  392.0,
  440.0,
  392.0,
  523.25,
  493.88, // Happy Birthday-ish start to test
  392.0,
  392.0,
  440.0,
  392.0,
  587.33,
  523.25,
];
// Actually let's do a simple cute loop: C E G A G E C
const cuteLoop = [523.25, 659.25, 783.99, 880.0, 783.99, 659.25];
let noteIndex = 0;
let bgmInterval;

function playNote(freq) {
  if (!audioCtx || isMuted) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square"; // 8-bit feel
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

function startBGM() {
  if (bgmInterval) clearInterval(bgmInterval);
  bgmInterval = setInterval(() => {
    if (!isMuted && audioCtx && audioCtx.state === "running") {
      playNote(cuteLoop[noteIndex]);
      noteIndex = (noteIndex + 1) % cuteLoop.length;
    }
  }, 400); // Speed of melody
}

function stopBGM() {
  if (bgmInterval) clearInterval(bgmInterval);
}

function playMeow() {
  if (!audioCtx || isMuted) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "triangle"; // Softer sound for meow
  // Meow pitch envelope: High -> Low
  osc.frequency.setValueAtTime(800, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.2);

  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// Replaces playBeep
function playSoundEffect() {
  playMeow();
}

// Logic
function startApp() {
  // Initialize and start audio on first interaction
  initAudio();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  if (!isMuted) {
    startBGM();
    playMeow();
  }

  document.getElementById("start-screen").classList.remove("active");
  document.getElementById("main-interface").classList.add("active");
  nextScene();
}

function updateCatState(state) {
  document
    .querySelectorAll(".cat-svg")
    .forEach((cat) => cat.classList.remove("active"));
  const activeCat = document.getElementById(`cat-${state}`);
  if (activeCat) activeCat.classList.add("active");
}

function updateProgress(index) {
  const dots = document.querySelectorAll(".dot");
  dots.forEach((dot, i) => {
    if (i <= index) dot.classList.add("active");
    else dot.classList.remove("active");
  });
}

function typeText(text, callback) {
  appState.isTyping = true;
  appState.textToType = text;
  dialogueText.innerHTML = "";
  tapHint.classList.remove("visible");

  let i = 0;
  const speed = 50; // ms

  const interval = setInterval(() => {
    if (!appState.isTyping) {
      clearInterval(interval);
      dialogueText.innerHTML = text.replace(/\n/g, "<br>");
      tapHint.classList.add("visible");
      if (callback) callback();
      return;
    }

    const char = text.charAt(i);
    dialogueText.innerHTML += char === "\n" ? "<br>" : char;
    // playBeep(); // Optional typing sound
    i++;

    if (i >= text.length) {
      clearInterval(interval);
      appState.isTyping = false;
      tapHint.classList.add("visible");
      if (callback) callback();
    }
  }, speed);
}

function nextScene() {
  appState.currentSceneIndex++;
  if (appState.currentSceneIndex >= scenes.length) return;

  const scene = scenes[appState.currentSceneIndex];

  // Update UI
  updateCatState(scene.catState);
  updateProgress(appState.currentSceneIndex);

  // Hide buttons if any
  document.getElementById("choices-container").style.display = "none";

  // Start typing
  typeText(scene.text, () => {
    if (scene.hasChoices) {
      document.getElementById("choices-container").style.display = "flex";
      tapHint.classList.remove("visible"); // No need for tap hint on choice screen
    }
  });

  // Play Meow on scene change (if audio enabled)
  if (!isMuted) playMeow();
}

// Global Click Handlers
document.body.addEventListener("click", (e) => {
  // Ignore clicks on buttons to prevent skipping
  if (e.target.closest("button") || e.target.closest(".choice-btn")) return;

  if (appState.currentSceneIndex === -1) return; // Start screen handled by button

  if (appState.isTyping) {
    // Skip typing
    appState.isTyping = false; // logic handled in typeText
    if (!isMuted) playMeow(); // Play meow when skipping
  } else {
    // Next scene
    const currentScene = scenes[appState.currentSceneIndex];
    if (
      !currentScene.hasChoices &&
      appState.currentSceneIndex < scenes.length - 1
    ) {
      nextScene();
    }
  }
});

// Start Button
document.getElementById("start-btn").addEventListener("click", (e) => {
  e.stopPropagation();
  startApp();
});

// Audio Toggle
// Audio Toggle
audioBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  if (!audioCtx) initAudio();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();

  isMuted = !isMuted; // Toggle local state
  appState.audioEnabled = !isMuted; // Sync app state

  audioBtn.innerText = !isMuted ? "🎵 ON" : "🔇 OFF";

  if (!isMuted) {
    playMeow(); // Feedback
    startBGM(); // Start loop
  } else {
    stopBGM();
  }
});

// Choice Handlers
// Button State needed for logic
let noClickCount = 0;
// เพิ่มข้อความตลกๆ กวนๆ น่ารักๆ
const noTexts = [
  "ไม่จริงอะ 😼",
  "แน่ใจนะ?",
  "มือลั่นป่าว?",
  "ขอกดใหม่ 🥺",
  "ปุ่มนี้พัง เชื่อแมว",
  "อย่าใจร้ายเลย",
  "เดี๋ยวร้องไห้นะ😿",
  "โอเค ยอมก็ได้... ล้อเล่น!",
  "เลี้ยงขนมแมวเลียนะ",
  "กดสีขาวเถอะ พลีสสส",
];

function makeChoice(choice) {
  if (choice === "reject") {
    noClickCount++;

    // 1. Grow Yes Button (Limit Max Scale to avoid layout break)
    // 1. Grow Yes Button (Limit Max Scale to avoid layout break)
    const yesBtn = document.querySelector(".choice-btn:first-child");
    // Cap at scale 2.5 to prevent covering everything
    const currentScale = Math.min(1 + noClickCount * 0.2, 2.5);
    yesBtn.style.transform = `scale(${currentScale})`;
    // Removed: yesBtn.style.zIndex = 100 + noClickCount; (This caused the issue)

    // 2. Button Visual Feedback
    const noBtn = document.querySelector(".choice-btn:last-child");
    noBtn.style.transform = `scale(0.9)`;
    // Ensure "No" button is always clickable/visible above the growing "Yes" button
    noBtn.style.zIndex = 999;
    yesBtn.style.zIndex = 1; // Ensure Yes stays below
    setTimeout(() => (noBtn.style.transform = "scale(1)"), 100);

    // 3. Change Cat Face
    updateCatState("shock");

    // 4. Update Dialogue with Randomness (No repeat if possible)
    // Use random index instead of sequential
    const randomText = noTexts[Math.floor(Math.random() * noTexts.length)];
    dialogueText.innerHTML = randomText;
    dialogueText.classList.add("shake-text");
    setTimeout(() => dialogueText.classList.remove("shake-text"), 500);

    return;
  }

  // Accept Logic (Existing)
  const endContainer = document.getElementById("ending-container");
  const mainInterface = document.getElementById("main-interface");

  mainInterface.style.display = "flex";
  document.getElementById("choices-container").style.display = "none";

  dialogueText.innerHTML = "เย้! 😻<br>ดีใจจังเลย... ทักมานะ!";
  updateCatState("start");
  tapHint.style.display = "none";

  const actionDiv = document.createElement("div");
  actionDiv.className = "end-actions";
  actionDiv.innerHTML = `
        <button class="big-btn" onclick="copyMessage()">📋 Copy "ทักคับ"</button>
        <button class="big-btn" style="background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); color:white; border-color:#bc1888;" onclick="window.open('https://instagram.com/', '_blank')">📸 เปิด IG</button>
        <div style="font-size:0.8rem; margin-top:10px; color:#aaa;">(แมวดีใจมาก)</div>
    `;
  document.querySelector(".dialogue-box").appendChild(actionDiv);
}

function copyMessage() {
  navigator.clipboard.writeText("ทักคับ 🐱");
  alert("คัดลอกข้อความแล้ว!");
}

window.makeChoice = makeChoice; // Expose to global
window.copyMessage = copyMessage;
