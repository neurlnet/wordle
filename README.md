# Discord Wordle Activity

A fully functional Wordle game integrated as a Discord Activity, built following Discord's getting-started-activity pattern.

## Project Structure

```
discord-wordle/
├── client/                 # Frontend - Vite + Discord SDK
│   ├── index.html
│   ├── main.js
│   ├── style.css
│   ├── package.json
│   └── vite.config.js
├── server/                 # Backend - Express + SQLite
│   ├── server.js
│   └── package.json
├── .env                    # Environment variables (Discord credentials)
├── .dockerignore
├── Dockerfile              # Multi-stage Docker build
├── docker-compose.yml      # Docker Compose orchestration
├── package.json            # Root package with scripts
└── valid-words.txt         # Wordle word list
```

## Features

- **Discord Integration**: Fully integrated with Discord's Embedded App SDK
- **OAuth2 Authentication**: Secure user authentication via Discord
- **Game Persistence**: Game progress saved per user using SQLite
- **Real-time Feedback**: Letter color feedback (correct, present, absent)
- **Sound Effects**: Audio feedback for game actions
- **Animations**: Smooth flip and confetti animations on win
- **Responsive Design**: Works across different screen sizes

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional, for containerized setup)
- Discord Developer Application with Activity enabled

## Local Development Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install client dependencies
npm --prefix client install

# Install server dependencies
npm --prefix server install
```

### 2. Configure Environment Variables

The `.env` file is already configured with dummy credentials. For development, you can use these as-is. For production, replace with your actual Discord app credentials.

```bash
# .env file already contains:
VITE_DISCORD_CLIENT_ID=1466320396910592103
DISCORD_CLIENT_SECRET=XHvks8SCPf4wUEsUe8g7UcVoCnE7byPJ
VITE_API_URL=/api
```

### 3. Start Development Servers

Using npm concurrently:

```bash
npm run dev
```

This will start both client (Vite dev server on port 5173) and server (Express on port 3001) in parallel.

Alternatively, start separately:

```bash
# Terminal 1: Start server
npm --prefix server start

# Terminal 2: Start client
npm --prefix client run dev
```

### 4. Set Up Public Endpoint for Discord

You need to expose your local server to the internet for Discord to communicate with it:

```bash
# Using cloudflared (recommended)
cloudflared tunnel --url http://localhost:5173
```

Or use ngrok:

```bash
ngrok http 5173
```

### 5. Configure Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select or create your application
3. Enable Activities in the settings
4. Set the Activity URL mapping to your public URL from step 4 (e.g., `https://funky-jogging-bunny.trycloudflare.com`)
5. Add redirect URI: `https://127.0.0.1` (placeholder for OAuth)

### 6. Test in Discord

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Open a test server or DM
3. Use the App Launcher to find and launch your Wordle activity
4. The activity should load with Discord SDK authentication

## Docker Setup

### Build and Run with Docker Compose

```bash
# Build and start the application
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### Build Standalone Docker Image

```bash
# Build the image
docker build -t discord-wordle:latest .

# Run the container
docker run -p 3001:3001 -p 5173:5173 \
  -e VITE_DISCORD_CLIENT_ID=1466320396910592103 \
  -e DISCORD_CLIENT_SECRET=XHvks8SCPf4wUEsUe8g7UcVoCnE7byPJ \
  discord-wordle:latest
```

The application will be available at:
- Client: `http://localhost:5173`
- Server: `http://localhost:3001`

## API Endpoints

### OAuth Token Exchange
- **POST** `/api/token` - Exchange authorization code for access token
  - Body: `{ code: string }`
  - Response: `{ access_token: string }`

### Game Endpoints
- **POST** `/api/guess` - Submit a word guess
  - Body: `{ word: string, user: string }`
  - Response: `{ result: ['correct'|'present'|'absent'][] }`

- **POST** `/api/session/start` - Initialize/load user session
  - Body: `{ user: string }`
  - Response: `{ user: UserRecord }`

- **POST** `/api/session/end` - End session and start new game
  - Body: `{ user: string }`
  - Response: `{ user: UserRecord }`

- **POST** `/api/user/:user/progress` - Save game progress
  - Body: `{ progress: GameProgressObject }`
  - Response: `{ progress: GameProgressObject }`

- **GET** `/api/user/:user/progress` - Load game progress
  - Response: `{ progress: GameProgressObject }`

- **GET** `/api/user/:user` - Get user stats
  - Response: `{ user: UserRecord }`

## Game Features

### Gameplay
- Guess a 5-letter word in 6 attempts
- Get feedback on each guess:
  - 🟩 Green: Letter in correct position
  - 🟨 Yellow: Letter in word but wrong position
  - ⬜ Gray: Letter not in word
- Win by guessing the word within 6 attempts
- Keyboard input or on-screen keyboard

### User Persistence
- Each user's progress is saved to a SQLite database
- Game state persists across sessions
- Stats tracked: Total games, correct guesses

### Animations
- Letter pop animation when typed
- Flip animation for feedback
- Dance animation on win
- Shake animation on invalid word or loss
- Confetti on victory

## Environment Variables

```
VITE_DISCORD_CLIENT_ID    - Discord application client ID
DISCORD_CLIENT_SECRET     - Discord application client secret (server-only)
VITE_API_URL              - API base URL (default: /api)
NODE_ENV                  - Node environment (development/production)
```

## File Descriptions

- **client/main.js**: Discord SDK setup, game logic, and UI interaction
- **client/style.css**: Game styling and animations
- **server/server.js**: Express server, OAuth handling, game logic, database
- **valid-words.txt**: List of valid 5-letter words for Wordle

## Database Schema

### users table
```sql
CREATE TABLE users (
  User TEXT PRIMARY KEY,              -- Discord user ID
  CurrentWord TEXT,                   -- Secret word for current game
  TotalWords INTEGER DEFAULT 0,       -- Total games played
  TotalCorrect INTEGER DEFAULT 0,     -- Total games won
  GameProgress TEXT                   -- JSON: { guesses: [], row: number, gameOver: boolean }
)
```

## Troubleshooting

### SDK Not Ready
- Ensure Discord Developer Mode is enabled
- Verify activity URL mapping is set correctly
- Check that public tunnel is active and accessible

### Database Errors
- Delete `wordle.db` to reset the database
- Ensure write permissions in the server directory

### CORS Issues
- Vite proxy configuration in `client/vite.config.js` routes `/api` to server
- Make sure server is running on port 3001

### Port Already in Use
- Change ports in `docker-compose.yml` or run commands
- Or kill existing processes: `lsof -ti:3001 | xargs kill -9`

## Production Deployment

For production deployment:

1. Build the client: `npm --prefix client run build`
2. Update `.env` with production Discord credentials
3. Configure a production database path
4. Use a process manager like PM2 or systemd
5. Set up a reverse proxy (Nginx/Apache) for HTTPS
6. Update Activity URL mapping in Discord Developer Portal

## License

MIT

## References

- [Discord Activities Documentation](https://discord.com/developers/docs/activities/overview)
- [Discord Embedded App SDK](https://discord.com/developers/docs/developer-tools/embedded-app-sdk)
- [Getting Started Activity](https://github.com/discord/getting-started-activity)
