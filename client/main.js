// Import the SDK
import { DiscordSDK } from "@discord/embedded-app-sdk";
import "./style.css";

// Will eventually store the authenticated user's access_token
let auth;
let discordSdk;
let currentUserId;

// Wordle game state
let row = 0;
let col = 0;
let currentWord = "";
let gameOver = false;
let guesses = [];
let inputLocked = false;

// DOM elements (will be queried after they're created)
let board;
let keyboardDiv;
let resetBtn;

/* ===== SOUND ENGINE ===== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  let freq = 400;
  let duration = 0.1;

  if (type === "type")    { freq = 600; duration = 0.05; }
  if (type === "delete")  { freq = 300; duration = 0.07; }
  if (type === "flip")    { freq = 500; duration = 0.15; } // Softer, longer sound
  if (type === "win")     { freq = 800; duration = 0.25; }
  if (type === "shake")   { freq = 200; duration = 0.15; }

  osc.frequency.value = freq;
  osc.type = "sine";

  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

/* ===== KEYBOARD ===== */

const KEYS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","DEL"]
];

function initializeBoard() {
  // Query DOM after elements exist
  board = document.getElementById('board');
  
  // Clear existing board
  board.innerHTML = '';
  
  // Build board
  for (let i = 0; i < 6; i++) {
    const r = document.createElement('div');
    r.className = 'row';
    for (let j = 0; j < 5; j++) {
      const c = document.createElement('div');
      c.className = 'cell';
      r.appendChild(c);
    }
    board.appendChild(r);
  }
}

function initializeKeyboard() {
  // Query DOM after elements exist
  keyboardDiv = document.getElementById('keyboard');
  resetBtn = document.getElementById('resetBtn');
  
  // Clear existing keyboard
  keyboardDiv.innerHTML = '';
  
  // Build keyboard
  KEYS.forEach(rowKeys => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'key-row';

    rowKeys.forEach(k => {
      const key = document.createElement('button');
      key.className = 'key';
      key.innerText = k;
      if (k === "ENTER" || k === "DEL") key.classList.add('big');
      key.onclick = () => handleKey(k);
      rowDiv.appendChild(key);
    });

    keyboardDiv.appendChild(rowDiv);
  });
}

// Physical keyboard
document.addEventListener('keydown', e => {
  if (gameOver) return;
  let key = e.key.toUpperCase();
  if (key === "BACKSPACE") key = "DEL";
  if (/^[A-Z]$/.test(key) || key === "ENTER" || key === "DEL") {
    handleKey(key);
  }
});

function handleKey(key) {
  if (gameOver || inputLocked) return;

  if (key === "DEL") {
    if (col > 0) {
      col--;
      currentWord = currentWord.slice(0, -1);
      board.children[row].children[col].innerText = "";
      playSound("delete");
    }
    return;
  }

  if (key === "ENTER") {
    if (currentWord.length < 5) {
      shakeRow();
      playSound("shake");
      return;
    }
    submitGuess();
    return;
  }

  if (col < 5) {
    const cell = board.children[row].children[col];
    cell.innerText = key;
    cell.classList.remove('pop');
    void cell.offsetWidth;
    cell.classList.add('pop');
    currentWord += key;
    col++;
    playSound("type");
  }
}

function shakeRow() {
  const rowDiv = board.children[row];
  rowDiv.classList.remove('shake');
  void rowDiv.offsetWidth;
  rowDiv.classList.add('shake');
}

async function submitGuess() {
  if (inputLocked) return;
  inputLocked = true;
  
  const guessWord = currentWord;
  console.log('submitGuess - sending', guessWord, 'user', currentUserId);
  
  const res = await fetch('/api/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word: guessWord, user: currentUserId })
  });

  const data = await res.json();
  
  if (!res.ok) {
    console.log('submitGuess - invalid word:', data.error);
    shakeRow();
    playSound("shake");
    inputLocked = false;
    return;
  }

  console.log('submitGuess - response', data);
  const rowDiv = board.children[row];

  const isWin = data.result.every(r => r === 'correct');

  guesses.push({ word: guessWord, result: data.result });

  // Sequential flip animation
  for (let i = 0; i < 5; i++) {
    const cell = rowDiv.children[i];
    const letter = guessWord[i];

    setTimeout(() => {
      cell.classList.add(data.result[i]);
      playSound("flip");

      setTimeout(() => {
        colorKeyboard(letter, data.result[i]);
      }, 450);

    }, i * 350);
  }

  // WIN
  if (isWin) {
    gameOver = true;
    if (resetBtn) resetBtn.style.display = 'inline-block';
    const totalFlipTime = (5 * 350) + 900;

    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        const cell = rowDiv.children[i];
        setTimeout(() => {
          cell.style.animation = 'none';
          void cell.offsetHeight;
          cell.classList.add('dance');
        }, i * 150);
      }
      playSound("win");
      launchConfetti();
    }, totalFlipTime);

    fetch(`/api/user/${currentUserId}`)
      .then(res => res.json())
      .then(data => updateStats(data.user));

    saveProgress();
    return;
  }

  // LOSS: 6th attempt without win
  if (row === 5) {
    gameOver = true;
    if (resetBtn) resetBtn.style.display = 'inline-block';
    const totalFlipTime = (5 * 350) + 900;
    setTimeout(() => {
      const lastRow = board.children[row];
      lastRow.classList.remove('shake');
      void lastRow.offsetWidth;
      lastRow.classList.add('shake');

      for (let i = 0; i < 5; i++) {
        const cell = lastRow.children[i];
        setTimeout(() => {
          cell.classList.add('lose');
        }, i * 100);
      }
      saveProgress();
    }, totalFlipTime);
    return;
  }

  // Normal case: advance to next row
  const flipDuration = (5 * 350) + 600;
  setTimeout(() => {
    row++;
    col = 0;
    currentWord = "";
    saveProgress();
    inputLocked = false;
  }, flipDuration);
}

function saveProgress() {
  const progress = { guesses, row, gameOver };
  fetch(`/api/user/${currentUserId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress })
  }).then(() => {
    console.log('saveProgress - saved', progress);
  }).catch(() => {
    console.warn('saveProgress - failed');
  });
}

function updateStats(user) {
  document.getElementById('total-words').innerText = user.TotalWords;
  document.getElementById('total-correct').innerText = user.TotalCorrect;
}

async function loadProgressAndSession() {
  try {
    const res = await fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUserId })
    });

    const data = await res.json();
    const user = data.user;
    if (!user) {
      console.error('failed to load user');
      return;
    }
    console.log('loadProgressAndSession - user:', user);
    updateStats(user);

    // Query resetBtn here too
    resetBtn = document.getElementById('resetBtn');

    if (user.GameProgress) {
      const p = typeof user.GameProgress === 'string' ? JSON.parse(user.GameProgress) : user.GameProgress;
      if (p && p.guesses) {
        guesses = p.guesses;
        row = guesses.length;
        col = 0;
        currentWord = '';
        gameOver = !!p.gameOver;

        if (gameOver && resetBtn) {
          resetBtn.style.display = 'inline-block';
        }

        for (let r = 0; r < guesses.length && r < 6; r++) {
          const g = guesses[r];
          const rowDiv = board.children[r];
          for (let i = 0; i < 5; i++) {
            const cell = rowDiv.children[i];
            cell.innerText = (g.word && g.word[i]) ? g.word[i] : '';
            const status = g.result && g.result[i] ? g.result[i] : null;
            if (status) cell.classList.add(status);
            if (g.word && status) colorKeyboard(g.word[i], status);
          }
        }
        console.log('loadProgressAndSession - restored in-progress game');
      }
    } else {
      console.log('loadProgressAndSession - no in-progress game; empty board');
    }
  } catch (e) {
    console.error('loadProgressAndSession - error:', e);
  }
}

async function startNewGame() {
  try {
    guesses = [];
    row = 0; col = 0; currentWord = ''; gameOver = false; inputLocked = false;
    // Query resetBtn
    resetBtn = document.getElementById('resetBtn');
    
    if (resetBtn) {
      resetBtn.style.display = 'none';
    }
    
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = board.children[r].children[c];
        cell.innerText = '';
        cell.className = 'cell';
        cell.style.animation = '';
      }
    }
    document.querySelectorAll('.key').forEach(k => k.className = 'key');

    const res = await fetch('/api/session/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: currentUserId })
    });
    const data = await res.json();
    console.log('startNewGame - server response:', data);
    updateStats(data.user);
  } catch (e) {
    console.error('startNewGame - error:', e);
  }
}

function resetGame() {
  startNewGame();
}

// Make resetGame globally available for onclick handlers
window.resetGame = resetGame;

window.addEventListener('beforeunload', () => {
  saveProgress();
});

function colorKeyboard(letter, status) {
  document.querySelectorAll('.key').forEach(k => {
    if (k.innerText === letter) {
      if (status === 'correct') {
        k.className = 'key correct';
      } 
      else if (status === 'present' && !k.classList.contains('correct')) {
        k.className = 'key present';
      } 
      else if (!k.classList.contains('correct') && !k.classList.contains('present')) {
        k.className = 'key absent';
      }
    }
  });
}

function launchConfetti() {
  for (let i = 0; i < 80; i++) {
    const conf = document.createElement('div');
    conf.className = 'confetti';
    conf.style.left = Math.random() * 100 + 'vw';
    conf.style.background = randomColor();
    conf.style.animationDuration = (2 + Math.random() * 1.5) + 's';
    document.body.appendChild(conf);

    setTimeout(() => conf.remove(), 3000);
  }
}

function randomColor() {
  const colors = ['#538d4e', '#b59f3b', '#f5793a', '#85c0f9', '#ef476f'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Discord SDK Setup
async function setupDiscordSdk() {
  try {
    await discordSdk.ready();
    console.log("Discord SDK is ready");

    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: [
        "identify",
        "guilds",
        "applications.commands"
      ],
    });

    console.log("Authorization code received:", code ? "yes" : "no");

    // Retrieve an access_token from the server
    const response = await fetch("/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const { access_token } = await response.json();
    console.log("Access token received:", access_token ? "yes" : "no");

    // Authenticate with Discord client
    auth = await discordSdk.commands.authenticate({
      access_token,
    });

    if (auth == null) {
      throw new Error("Authenticate command failed");
    }

    // Set current user ID from auth
    currentUserId = auth.user.id;
    console.log("Authenticated as user:", currentUserId);

    
  } catch (error) {
    console.error("setupDiscordSdk error:", error);
    throw error;
  }
}

// Check if running in Discord (has frame_id query param)
const isInDiscord = new URLSearchParams(window.location.search).has('frame_id');

if (isInDiscord) {
  // Show loading screen while Discord auth is happening
  document.querySelector('#app').innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <h1>🎮 Discord Wordle</h1>
      <p>Loading...</p>
    </div>
  `;

  // Initialize Discord SDK only when in Discord
  discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
  console.log("Discord SDK initialized with client ID:", import.meta.env.VITE_DISCORD_CLIENT_ID);
  
  setupDiscordSdk().then(async () => {
    console.log("Discord SDK is authenticated");
    // // Initialize UI
    // initializeBoard();
    // initializeKeyboard();
    
    // // Load user progress
    // await loadProgressAndSession();

    // Display welcome message
    document.querySelector('#app').innerHTML = `
      <div>
        <h1>🎮 Discord Wordle</h1>
        <p>Welcome, ${auth.user.username}!</p>
        <div id="stats">
          <span>Total Words: <span id="total-words">0</span></span>
          <span>Total Correct: <span id="total-correct">0</span></span>
        </div>
        <div id="board"></div>
        <div id="keyboard"></div>
        <button id="resetBtn" style="display: none;">Reset</button>
      </div>
    `;
    document.getElementById('resetBtn').addEventListener('click', resetGame);
    // // Re-initialize after DOM update
    initializeBoard();
    initializeKeyboard();
    await loadProgressAndSession();
  }).catch((error) => {
    console.error("Discord SDK initialization failed:", error);
    
    // Fallback to local mode if Discord auth fails
    currentUserId = 'fallback-user';
    const errorMsg = error?.message || String(error);
    
    try {
      const appDiv = document.querySelector('#app');
      if (!appDiv) {
        console.error("Could not find #app element");
        return;
      }
      
      appDiv.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <h1>🎮 Discord Wordle</h1>
          <p style="color: red;">Discord authentication failed.....</p>
          <p style="color: red; font-size: 0.9rem; font-family: monospace;">Error: ${errorMsg}</p>
          <p>Running in fallback mode.</p>
          <div id="stats">
            <span>Total Words: <span id="total-words">0</span></span>
            <span>Total Correct: <span id="total-correct">0</span></span>
          </div>
          <div id="board"></div>
          <div id="keyboard"></div>
          <button id="resetBtn" style="display: none;">Reset</button>
        </div>
      `;
      document.getElementById('resetBtn').addEventListener('click', resetGame);
      
      initializeBoard();
      initializeKeyboard();
      loadProgressAndSession();
    } catch (fallbackError) {
      console.error("Error in fallback handler:", fallbackError);
    }
  });
} else {
  // Local development mode - run without Discord auth
  console.warn('Not running in Discord context. Using local development mode.');
  
  currentUserId = 'local-dev-user';
  
  // Initialize game UI
  document.querySelector('#app').innerHTML = `
    <div>
      <h1>🎮 Discord Wordle (Local Dev)</h1>
      <div id="stats">
        <span>Total Words: <span id="total-words">0</span></span>
        <span>Total Correct: <span id="total-correct">0</span></span>
      </div>
      <div id="board"></div>
      <div id="keyboard"></div>
      <button id="resetBtn"  style="display: none;">Reset</button>
    </div>
  `;
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  
  initializeBoard();
  initializeKeyboard();
  loadProgressAndSession();
}
