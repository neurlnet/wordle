import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import sqlite3 from "sqlite3";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config({ path: "../.env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Allow express to parse JSON bodies
app.use(express.json());

// Initialize database
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
  const wordList = fs.readFileSync('../valid-words.txt', 'utf-8');
  const words = wordList.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);
  validWords = new Set(words);
  console.log(`Loaded ${validWords.size} valid Wordle words`);
} catch (err) {
  console.error('Failed to load valid words list:', err.message);
}

// Create database schema
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

const WORDS = ["APPLE", "GRAPE", "PLANT", "STONE", "CHAIR", "BRAIN", "LIGHT", "BOOKS", "WATER", "MUSIC"];
let SECRET = WORDS[Math.floor(Math.random() * WORDS.length)];

// OAuth Token endpoint
app.post("/api/token", async (req, res) => {
  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: req.body.code,
    }),
  });
  // Retrieve the access_token from the response
  const { access_token } = await response.json();
  // Return the access_token to our client as { access_token: "..."}
  res.send({access_token});
});

// Guess endpoint - evaluate guess and increment TotalCorrect if correct
app.post('/api/guess', (req, res) => {
  const guess = (req.body.word || '').toUpperCase();
  const activeUser = req.body.user || 'unknown';
  console.log(`/api/guess - received guess='${guess}' from user='${activeUser}'`);

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
      console.log(`/api/guess - correct guess! incrementing TotalCorrect for user='${activeUser}'`);
      db.run('UPDATE users SET TotalCorrect = TotalCorrect + 1 WHERE User = ?', [activeUser], function (err) {
        if (err) console.error('/api/guess - failed to increment TotalCorrect:', err.message);
        else console.log('/api/guess - TotalCorrect incremented');
        res.json({ result });
      });
    } else {
      res.json({ result });
    }
  });
});

// Session start: on page load, create user if not exists, load existing progress
app.post('/api/session/start', (req, res) => {
  const user = req.body.user || 'unknown';
  const newSecret = WORDS[Math.floor(Math.random() * WORDS.length)];
  console.log('/api/session/start - user:', user);

  // Create user if not exists with TotalWords=1
  db.run(
    'INSERT OR IGNORE INTO users(User, CurrentWord, TotalWords, TotalCorrect, GameProgress) VALUES(?, ?, 1, 0, NULL)',
    [user, newSecret],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Return full user row
      db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('/api/session/start - user row:', row);
        res.json({ user: row });
      });
    }
  );
});

// Save game progress for a user (JSON). Body: { progress: { ... } }
app.post('/api/user/:user/progress', (req, res) => {
  const user = req.params.user;
  const progress = req.body.progress ? JSON.stringify(req.body.progress) : null;
  console.log('/api/user/:user/progress - saving progress for', user, 'progress:', req.body.progress);
  db.run('UPDATE users SET GameProgress = ? WHERE User = ?', [progress, user], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'not found' });
    db.get('SELECT GameProgress FROM users WHERE User = ?', [user], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      console.log('/api/user/:user/progress - saved progress row:', row);
      res.json({ progress: row ? (row.GameProgress ? JSON.parse(row.GameProgress) : null) : null });
    });
  });
});

// Load game progress for a user
app.get('/api/user/:user/progress', (req, res) => {
  const user = req.params.user;
  db.get('SELECT GameProgress FROM users WHERE User = ?', [user], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    console.log('/api/user/:user/progress - loaded progress for', user, row);
    res.json({ progress: row.GameProgress ? JSON.parse(row.GameProgress) : null });
  });
});

// Reset: increment TotalWords, clear progress, set new word
app.post('/api/session/end', (req, res) => {
  const user = (req.body && req.body.user) ? req.body.user : 'unknown';
  const newSecret = WORDS[Math.floor(Math.random() * WORDS.length)];
  console.log('/api/session/end - user:', user, 'new secret:', newSecret);

  // Always increment TotalWords on Reset, clear progress, set new word
  db.run(
    'UPDATE users SET CurrentWord = ?, TotalWords = TotalWords + 1, GameProgress = NULL WHERE User = ?',
    [newSecret, user],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log('/api/session/end - updated user row:', row);
        res.json({ user: row, newSecret });
      });
    }
  );
});

// Get user
app.get('/api/user/:user', (req, res) => {
  const user = req.params.user;
  db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json({ user: row });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Wordle server is running' });
});

app.listen(port, () => {
  console.log(`Wordle server listening at http://localhost:${port}`);
});
