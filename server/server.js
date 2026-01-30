import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs";
import sqlite3 from "sqlite3";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
  const wordList = fs.readFileSync('./valid-words.txt', 'utf-8');
  const words = wordList.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length === 5);
  validWords = new Set(words);
  console.log(`Loaded ${validWords.size} valid Wordle words`);
} catch (err) {
  console.error('Failed to load valid words list:', err.message);
}

let userWords = {};
try {
  const userWordsData = fs.readFileSync('./user_words.json', 'utf-8');
  userWords = JSON.parse(userWordsData);
} catch (err) {
  if (err.code === 'ENOENT') {
    fs.writeFileSync('./user_words.json', JSON.stringify({}));
  } else {
    console.error('Failed to load user words list:', err.message);
  }
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
  console.log('/api/token - attempting token exchange');
  console.log('  client_id set:', !!process.env.VITE_DISCORD_CLIENT_ID);
  console.log('  client_secret set:', !!process.env.DISCORD_CLIENT_SECRET);
  console.log('  code present:', !!req.body.code);

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
      redirect_uri: process.env.VITE_REDIRECT_URI || 'http://localhost:3001',
    }),
  });

  const data = await response.json();
  console.log('/api/token - response status:', response.status);
  console.log('/api/token - response data keys:', Object.keys(data));

  if (!response.ok) {
    console.error('/api/token - error:', data);
    return res.status(400).json({ error: 'Token exchange failed', details: data });
  }

  // Retrieve the access_token from the response
  const { access_token } = data;

  if (!access_token) {
    console.error('/api/token - no access_token in response:', data);
    return res.status(400).json({ error: 'No access token provided', details: data });
  }

  // Return the access_token to our client as { access_token: "..."}
  res.send({access_token});
});

app.post('/api/word', (req, res) => {
  const { word, user } = req.body;
  const upperWord = word.toUpperCase();

  let opponent;
  if (user === '905476337056227329') {
    opponent = '858314898630770698';
  } else if (user === '858314898630770698') {
    opponent = '905476337056227329';
  } else {
    return res.status(400).json({ error: 'Invalid user' });
  }

  if (!validWords.has(upperWord)) {
    return res.status(400).json({ error: 'Not a valid Wordle word' });
  }

  if (!userWords[opponent]) {
    userWords[opponent] = [];
  }
  userWords[opponent].push(upperWord);

  fs.writeFileSync('./user_words.json', JSON.stringify(userWords, null, 2));

  res.json({ message: 'Word submitted successfully!' });
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
    const secretWord = (row && row.CurrentWord) ? row.CurrentWord : null;

    if (!secretWord) {
      return res.status(400).json({ error: "No word assigned to you." });
    }
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
      db.run('UPDATE users SET TotalCorrect = TotalCorrect + 1, CurrentWord = NULL WHERE User = ?', [activeUser], function (err) {
        if (err) console.error('/api/guess - failed to increment TotalCorrect:', err.message);
        else console.log('/api/guess - TotalCorrect incremented');
        res.json({ "result":result ,"secret":secretWord });
      });
    } else {
      res.json({ "result":result, "secret":secretWord });
    }
  });
});

// Session start: on page load, create user if not exists, load existing progress
app.post('/api/session/start', (req, res) => {
  const user = req.body.user || 'unknown';

  console.log('/api/session/start - user:', user);

  // First, check if user exists and has an ongoing game
  db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    // If user has a current word (ongoing game), return existing data
    if (row && row.CurrentWord) {
      console.log('/api/session/start - user has ongoing game, returning existing data');
      return res.json({ user: row });
    }

    // No ongoing game, try to assign new word
    let opponent;
    if (user === '905476337056227329') {
      opponent = '858314898630770698';
    } else if (user === '858314898630770698') {
      opponent = '905476337056227329';
    }

    let newSecret = null;
    if (opponent && userWords[user] && userWords[user].length > 0) {
      newSecret = userWords[user].shift();
      fs.writeFileSync('./user_words.json', JSON.stringify(userWords, null, 2));
    }

    if (newSecret) {
      // Create or update user with new word
      db.run(
        'INSERT OR REPLACE INTO users(User, CurrentWord, TotalWords, TotalCorrect, GameProgress) VALUES(?, ?, COALESCE((SELECT TotalWords FROM users WHERE User = ?), 0) + 1, COALESCE((SELECT TotalCorrect FROM users WHERE User = ?), 0), NULL)',
        [user, newSecret, user, user],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            console.log('/api/session/start - assigned new word, user row:', row);
            res.json({ user: row });
          });
        }
      );
    } else {
      // No new word available, but return existing user data if exists
      if (row) {
        console.log('/api/session/start - no new word available, returning existing user data');
        res.json({ user: row });
      } else {
        // Create user with no word
        db.run(
          'INSERT INTO users(User, CurrentWord, TotalWords, TotalCorrect, GameProgress) VALUES(?, NULL, 0, 0, NULL)',
          [user],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.get('SELECT * FROM users WHERE User = ?', [user], (err, row) => {
              if (err) return res.status(500).json({ error: err.message });
              console.log('/api/session/start - created user with no word');
              res.json({ user: row });
            });
          }
        );
      }
    }
  });
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

  let opponent;
  if (user === '905476337056227329') {
    opponent = '858314898630770698';
  } else if (user === '858314898630770698') {
    opponent = '905476337056227329';
  }

  let newSecret;
  if (opponent && userWords[user] && userWords[user].length > 0) {
    newSecret = userWords[user].shift();
    fs.writeFileSync('./user_words.json', JSON.stringify(userWords, null, 2));
  } else {
    return res.status(400).json({ error: "The Other User hasn't assigned any more words" });
  }

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

// Serve static files from the client dist directory
app.use(express.static(join(__dirname, '../client/dist')));

// Serve the client app for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Wordle server listening at http://localhost:${port}`);
});
