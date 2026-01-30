# Discord Wordle Activity - Setup Summary

## ✅ What's Been Done

Your Wordle application has been completely restructured as a Discord Activity following Discord's official getting-started-activity pattern.

### Project Architecture

```
/Wordle (root)
├── .env                          # Discord credentials (VITE_DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET)
├── package.json                  # Root package with concurrently scripts
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Docker Compose for easy orchestration
├── QUICKSTART.md                 # Quick start guide (read this first!)
├── README.md                     # Full documentation
├── start.sh                      # Startup helper script
│
├── client/                       # 🎨 Frontend (Vite + Discord SDK)
│   ├── index.html                # Entry point
│   ├── main.js                   # Wordle game logic + Discord SDK integration
│   ├── style.css                 # Complete game styling
│   ├── package.json              # Frontend dependencies
│   └── vite.config.js            # Vite config with /api proxy
│
├── server/                       # 🖥️  Backend (Express + SQLite)
│   ├── server.js                 # Express server with all game endpoints
│   └── package.json              # Backend dependencies
│
├── valid-words.txt               # Wordle word list
└── (old files: app.js, public/*, etc.) # Can be deleted
```

## 🎯 Key Features Implemented

### Client (Frontend)
- ✅ Discord SDK integration with OAuth authentication
- ✅ Full Wordle game UI (board, keyboard, feedback)
- ✅ Sound effects for all actions (type, delete, flip, win, shake)
- ✅ Smooth animations (pop, flip, dance, confetti, shake)
- ✅ Responsive design with Vite hot module reloading
- ✅ Game state persistence across sessions
- ✅ Real-time API communication with server

### Server (Backend)
- ✅ OAuth token exchange with Discord
- ✅ SQLite database for user management
- ✅ Game endpoints (guess, session start/end, progress save/load)
- ✅ Word validation against 5-letter word list
- ✅ User stats tracking (total games, wins)
- ✅ Health check endpoint for Docker monitoring
- ✅ All requests use `/api` prefix for clean routing

### DevOps
- ✅ Dockerfile with multi-stage build (optimized image size)
- ✅ docker-compose.yml for easy orchestration
- ✅ Volume mounts for development hot-reload
- ✅ Health checks configured
- ✅ .dockerignore for efficient builds
- ✅ Concurrent server/client startup scripts

## 🚀 Quick Start

### Option 1: Local Development (Recommended)
```bash
cd /Users/saumilagrawal/Documents/Code/Wordle

# Install and start everything
npm install
npm --prefix client install
npm --prefix server install
npm run dev
```

Or use the helper script:
```bash
bash start.sh
```

### Option 2: Docker
```bash
cd /Users/saumilagrawal/Documents/Code/Wordle
docker-compose up --build
```

Both options will start:
- Client (Vite): http://localhost:5173
- Server (Express): http://localhost:3001

## 🔗 Discord Setup Steps

1. **Create/Select Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application or use existing one

2. **Configure OAuth2**
   - Go to OAuth2 section
   - Add Redirect URI: `https://127.0.0.1`
   - Copy Client ID and Client Secret (already in .env)

3. **Enable Activities**
   - Go to Activities → Settings
   - Toggle "Enable Activities" ON
   - This creates default "Launch" command

4. **Set Public URL**
   - You need to expose localhost to internet first:
   ```bash
   cloudflared tunnel --url http://localhost:5173
   # or
   ngrok http 5173
   ```
   - Then go to Activities → URL Mappings
   - Add mapping: `/` → your public URL (e.g., https://funky-jogging-bunny.trycloudflare.com)

5. **Test in Discord**
   - Enable Developer Mode (User Settings → Advanced)
   - Open a test server/DM
   - Open App Launcher
   - Find your Wordle activity
   - Click to launch
   - Authorize with Discord
   - Play! 🎮

## 📊 API Endpoints

All endpoints are prefixed with `/api`:

```
POST /api/token              # OAuth token exchange
POST /api/guess              # Submit word guess
POST /api/session/start      # Initialize user session
POST /api/session/end        # End game & start new
POST /api/user/:user/progress    # Save game progress
GET  /api/user/:user/progress    # Load game progress
GET  /api/user/:user         # Get user stats
GET  /api/health             # Health check
```

## 🗄️ Database Schema

SQLite database automatically created with users table:
```sql
users (
  User TEXT PRIMARY KEY,           -- Discord user ID
  CurrentWord TEXT,                -- Secret word
  TotalWords INTEGER,              -- Games played
  TotalCorrect INTEGER,            -- Games won
  GameProgress TEXT                -- JSON progress object
)
```

## 📦 Dependencies

### Client
- `@discord/embedded-app-sdk`: ^2.4.0 - Discord SDK
- `vite`: ^5.0.8 - Build tool

### Server
- `express`: ^4.18.2 - Web framework
- `sqlite3`: ^5.1.7 - Database
- `dotenv`: ^17.0.0 - Environment variables
- `node-fetch`: ^3.3.2 - HTTP requests

### Root
- `concurrently`: ^8.2.0 - Run multiple npm scripts

## 🐳 Docker Details

### Dockerfile Strategy
1. **Stage 1**: Build client with Vite
2. **Stage 2**: Runtime with Node
   - Copies built client from stage 1
   - Installs server dependencies
   - Exposes ports 3001 (server) and 5173 (client)

### docker-compose.yml
- Mounts `client/` and `server/` for hot-reload during development
- Environment variables for Discord credentials
- Volume management for node_modules
- Health check configured

## 🔐 Environment Variables

```env
VITE_DISCORD_CLIENT_ID=1466320396910592103
DISCORD_CLIENT_SECRET=XHvks8SCPf4wUEsUe8g7UcVoCnE7byPJ
VITE_API_URL=/api
NODE_ENV=development
```

**Note**: These are dummy/test credentials. For production, replace with your actual Discord app credentials.

## 🎮 Game Features

- **Guess Display**: Real-time board with 6x5 grid
- **Keyboard**: On-screen QWERTY keyboard with Backspace/Enter
- **Feedback Colors**:
  - 🟩 Green (correct): Letter in right position
  - 🟨 Yellow (present): Letter in word, wrong position
  - ⬜ Gray (absent): Letter not in word
- **Win Condition**: Match word within 6 attempts
- **Animations**: Pop on type, flip on guess, dance on win
- **Sound**: Audio feedback for all actions
- **Persistence**: Progress saved after each guess
- **Stats**: Tracks total games and correct wins

## 📝 Files Overview

| File | Purpose |
|------|---------|
| `client/main.js` | Discord SDK setup, game logic, UI interactions |
| `client/style.css` | All game styling and animations |
| `server/server.js` | Express routes, OAuth, game logic, database |
| `.env` | Discord credentials and configuration |
| `Dockerfile` | Container image definition |
| `docker-compose.yml` | Multi-service orchestration |
| `package.json` | Root-level npm scripts and dependencies |
| `valid-words.txt` | 5-letter word list for validation |

## 🔄 Development Workflow

1. **Make changes** to `client/main.js` or `client/style.css`
2. **Vite auto-reloads** in browser (http://localhost:5173)
3. **Make changes** to `server/server.js`
4. **Restart server** manually or use nodemon (modify package.json if needed)
5. **Test in Discord** through App Launcher
6. **Commit changes** (will exclude .env and node_modules via .gitignore)

## 🚨 Troubleshooting

### "Activity not found in Discord"
- Ensure Activities is enabled in Developer Portal
- Confirm URL Mapping is set correctly
- Wait 5-10 seconds after saving URL Mapping

### SDK authentication fails
- Check if Discord Developer Mode is enabled
- Verify Redirect URI is set to `https://127.0.0.1`
- Check browser console for specific error

### Database errors
- Delete `wordle.db` to reset
- Ensure write permissions in server directory

### Port conflicts
- Change ports in `docker-compose.yml`
- Or kill existing processes: `lsof -ti:3001 | xargs kill -9`

## 🎓 Learning Resources

- [Discord Activities Overview](https://discord.com/developers/docs/activities/overview)
- [Embedded App SDK Docs](https://discord.com/developers/docs/developer-tools/embedded-app-sdk)
- [Getting Started Activity Repo](https://github.com/discord/getting-started-activity)
- [Wordle Rules](https://www.nytimes.com/games/wordle/)

## 📚 Next Steps

1. **Read QUICKSTART.md** for step-by-step setup
2. **Run `npm run dev`** to start locally
3. **Set up public tunnel** with cloudflared
4. **Configure Discord Developer Portal**
5. **Test in Discord** through App Launcher
6. **Customize**: Add more words, change colors, add features
7. **Deploy**: Use Docker or your preferred hosting

---

**Setup completed on:** January 30, 2026

Your Wordle Activity is ready to use! Follow QUICKSTART.md to get started. 🎮
