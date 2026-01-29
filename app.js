// ======= app.js =======

import express from 'express';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

const db = new (sqlite3.verbose()).Database('./wordle.db', (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
  } else {
    console.log('Opened SQLite database at ./wordle.db');
  }
});

// Load valid words list
let validWords = new Set();
try {
  const wordList = fs.readFileSync('./valid-words.txt', 'utf-8');
  const words = wordList.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);
  validWords = new Set(words);
  console.log(`Loaded ${validWords.size} valid Wordle words`);
} catch (err) {
  console.error('Failed to load valid words list:', err.message);
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    User TEXT PRIMARY KEY,
    CurrentWord TEXT,
    TotalWords INTEGER DEFAULT 0,
    TotalCorrect INTEGER DEFAULT 0,
    GameProgress TEXT
  )`, (err) => {
    if (err) console.error('Failed to create users table:', err.message);
  });

  // Ensure GameProgress column exists (for older DBs)
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) return;
    const hasProgress = rows.some(r => r.name === 'GameProgress');
    if (!hasProgress) {
      db.run('ALTER TABLE users ADD COLUMN GameProgress TEXT', (err) => {
        if (err) console.error('Failed to add GameProgress column:', err.message);
      });
    }
  });
});

const WORDS = ["APPLE", "GRAPE", "PLANT", "STONE", "CHAIR", "BRAIN", "LIGHT"];
let SECRET = WORDS[Math.floor(Math.random() * WORDS.length)];

app.use(express.json());
app.use(express.static('public'));

// Simple request logger
app.use((req, res, next) => {
  console.log(`REQ ${req.method} ${req.path} body=${JSON.stringify(req.body)}`);
  next();
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Guess endpoint - evaluate guess and increment TotalCorrect if correct
app.post('/guess', (req, res) => {
  const guess = (req.body.word || '').toUpperCase();
  const activeUser = req.body.user || 'neurl';
  console.log(`/guess - received guess='${guess}' from user='${activeUser}'`);

  // Validate guess is in word list
  if (!validWords.has(guess)) {
    return res.status(400).json({ error: 'Not a valid Wordle word' });
  }

  db.get('SELECT CurrentWord FROM users WHERE User = ?', [activeUser], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    const secretWord = (row && row.CurrentWord) ? row.CurrentWord : SECRET;
    const result = Array(5).fill('absent');

    const secretArr = secretWord.split('');

    // Pass 1: greens
    for (let i = 0; i < 5; i++) {
      if (guess[i] === secretArr[i]) {
        result[i] = 'correct';
        secretArr[i] = null;
      }
    }

    // Pass 2: yellows
    for (let i = 0; i < 5; i++) {
      if (result[i] === 'correct') continue;
      const index = secretArr.indexOf(guess[i]);
      if (index !== -1) {
        result[i] = 'present';
        secretArr[index] = null;
      }
    }

    const isCorrect = result.every(r => r === 'correct');

    // If correct, increment TotalCorrect
    if (isCorrect) {
      console.log(`/guess - correct guess! incrementing TotalCorrect for user='${activeUser}'`);
      db.run('UPDATE users SET TotalCorrect = TotalCorrect + 1 WHERE User = ?', [activeUser], function (err) {
        if (err) console.error('/guess - failed to increment TotalCorrect:', err.message);
        else console.log('/guess - TotalCorrect incremented');
        res.json({ result });
      });
    } else {
      res.json({ result });
    }
  });
});

// Session start: on page load, create user if not exists, load existing progress
app.post('/session/start', (req, res) => {
  const user = req.body.user || 'neurl';
  const newSecret = WORDS[Math.floor(Math.random() * WORDS.length)];
  console.log('session/start - user:', user);

  // Create user if not exists with TotalWords=1
  db.run(
    'INSERT OR IGNORE INTO users(User, CurrentWord, TotalWords, TotalCorrect, GameProgress) VALUES(?, ?, 1, 0, NULL)',
    [user, newSecret],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Return full user row
      db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('session/start - user row:', row);
        res.json({ user: row });
      });
    }
  );
});

// Save game progress for a user (JSON). Body: { progress: { ... } }
app.post('/user/:user/progress', (req, res) => {
  const user = req.params.user;
  const progress = req.body.progress ? JSON.stringify(req.body.progress) : null;
  console.log('/user/:user/progress - saving progress for', user, 'progress:', req.body.progress);
  db.run('UPDATE users SET GameProgress = ? WHERE User = ?', [progress, user], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'not found' });
    db.get('SELECT GameProgress FROM users WHERE User = ?', [user], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log('/user/:user/progress - saved progress row:', row);
      res.json({ progress: row ? (row.GameProgress ? JSON.parse(row.GameProgress) : null) : null });
    });
  });
});

// Load game progress for a user
app.get('/user/:user/progress', (req, res) => {
  const user = req.params.user;
  db.get('SELECT GameProgress FROM users WHERE User = ?', [user], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    console.log('/user/:user/progress - loaded progress for', user, row);
    res.json({ progress: row.GameProgress ? JSON.parse(row.GameProgress) : null });
  });
});

// Reset endpoint
app.post('/reset', (req, res) => {
  SECRET = WORDS[Math.floor(Math.random() * WORDS.length)];
  res.json({ status: 'reset' });
});

// Reset: increment TotalWords, clear progress, set new word
app.post('/session/end', (req, res) => {
  const user = (req.body && req.body.user) ? req.body.user : 'neurl';
  const newSecret = WORDS[Math.floor(Math.random() * WORDS.length)];
  console.log('session/end - user:', user, 'new secret:', newSecret);

  // Always increment TotalWords on Reset, clear progress, set new word
  db.run(
    'UPDATE users SET CurrentWord = ?, TotalWords = TotalWords + 1, GameProgress = NULL WHERE User = ?',
    [newSecret, user],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('session/end - updated user row:', row);
        res.json({ user: row, newSecret });
      });
    }
  );
});



// Get user
app.get('/user/:user', (req, res) => {
  const user = req.params.user;
  db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json({ user: row });
  });
});

app.listen(PORT, () => {
  console.log(`Wordle running on http://localhost:${PORT}`);
});
