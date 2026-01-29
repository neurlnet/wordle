// ======= public/app.js =======

const USER_ID = 'neurl';

let row = 0;
let col = 0;
let currentWord = "";
let gameOver = false;
let guesses = []; // array of { word: 'APPLE', result: ['correct','present',...] }
let inputLocked = false;

const board = document.getElementById('board');
const keyboardDiv = document.getElementById('keyboard');
const resetBtn = document.getElementById('resetBtn');

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
  if (type === "flip")    { freq = 450; duration = 0.08; }
  if (type === "win")     { freq = 800; duration = 0.25; }
  if (type === "shake")   { freq = 200; duration = 0.15; }

  osc.frequency.value = freq;
  osc.type = "sine";

  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
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

// Physical keyboard
document.addEventListener('keydown', e => {
  if (gameOver) return;
  let key = e.key.toUpperCase();
  if (key === "BACKSPACE") key = "DEL";
  if (key === "ENTER") key = "ENTER";
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
  
  // Capture the word immediately to prevent race conditions
  const guessWord = currentWord;
  console.log('submitGuess - sending', guessWord, 'user', USER_ID);
  
  const res = await fetch('/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word: guessWord, user: USER_ID })
  });

  const data = await res.json();
  
  // Handle invalid word error
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

  // Record this guess locally using the captured word
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
    resetBtn.style.display = 'inline-block';
    const totalFlipTime = (5 * 350) + 900;

    setTimeout(() => {
      // Dance animation
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

    // Save final progress; keep board visible until Reset
    saveProgress();
    return;
  }

  // LOSS: 6th attempt without win
  if (row === 5) {
    gameOver = true;
    resetBtn.style.display = 'inline-block';
    gameOver = true;
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
      // Save final progress; keep board visible until Reset
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

// Save game progress to server
function saveProgress() {
  const progress = { guesses, row, gameOver };
  fetch(`/user/${USER_ID}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress })
  }).then(() => {
    console.log('saveProgress - saved', progress);
  }).catch(() => {
    console.warn('saveProgress - failed');
  });
}

// On page load: create user if not exists, load in-progress progress if exists
async function loadProgressAndSession() {
  try {
    const res = await fetch('/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: USER_ID })
    });

    const data = await res.json();
    const user = data.user;
    if (!user) {
      console.error('failed to load user');
      return;
    }
    console.log('loadProgressAndSession - user:', user);

    // If user has in-progress game (GameProgress exists), load it
    if (user.GameProgress) {
      const p = typeof user.GameProgress === 'string' ? JSON.parse(user.GameProgress) : user.GameProgress;
      if (p && p.guesses) {
        guesses = p.guesses;
        row = guesses.length;
        col = 0;
        currentWord = '';
        gameOver = !!p.gameOver;

        // If game is over, show the reset button
        if (gameOver) {
          resetBtn.style.display = 'inline-block';
        }

        // Render the board
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
      // No in-progress game; show empty board (or could show last completed game if desired)
      console.log('loadProgressAndSession - no in-progress game; empty board');
    }
  } catch (e) {
    console.error('loadProgressAndSession - error:', e);
  }
}

// Start a new game (Reset button: increments TotalWords and clears progress)
async function startNewGame() {
  try {
    // Reset UI immediately
    guesses = [];
    row = 0; col = 0; currentWord = ''; gameOver = false; inputLocked = false;
    
    // Hide reset button
    resetBtn.style.display = 'none';
    
    // Clear board
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = board.children[r].children[c];
        cell.innerText = '';
        cell.className = 'cell';
        cell.style.animation = '';
      }
    }
    // Clear keyboard colors
    document.querySelectorAll('.key').forEach(k => k.className = 'key');

    // Tell server to increment TotalWords and clear progress
    const res = await fetch('/session/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: USER_ID })
    });
    const data = await res.json();
    console.log('startNewGame - server response:', data);
  } catch (e) {
    console.error('startNewGame - error:', e);
  }
}

// Wire reset button
function resetGame() {
  startNewGame();
}

// Save progress on unload
window.addEventListener('beforeunload', () => {
  saveProgress();
});

// Initialize on load
window.addEventListener('load', () => {
  loadProgressAndSession();
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

/* ===== CONFETTI ===== */

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
