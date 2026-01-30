# Quick Start Guide - Discord Wordle Activity

## 🚀 Start the App Locally (5 minutes)

### Option 1: Using npm (Recommended for Development)

```bash
# Install all dependencies
npm install
npm --prefix client install
npm --prefix server install

# Start both server and client
npm run dev
```

The app will run at:
- **Client**: http://localhost:5173
- **Server**: http://localhost:3001

### Option 2: Using Docker

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or just run (if already built)
docker-compose up
```

The app will be available at the same ports.

### Option 3: Start Services Separately

```bash
# Terminal 1: Start server
npm --prefix server start

# Terminal 2: Start client  
npm --prefix client run dev
```

---

## 🔗 Expose to Internet (Required for Discord Testing)

For Discord to communicate with your local app, you need a public URL:

### Using cloudflared (Recommended)

```bash
# Install cloudflared (if not already)
# macOS: brew install cloudflare/cloudflare/cloudflared
# Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

cloudflared tunnel --url http://localhost:5173
```

You'll see output like:
```
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://funky-jogging-bunny.trycloudflare.com
```

### Or using ngrok

```bash
ngrok http 5173
```

**Copy this public URL** - you'll need it for Discord!

---

## ⚙️ Configure Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click on your application (or create one)
3. Go to **Activities** → **Settings** in the left sidebar
4. ✅ Enable Activities
5. Go to **Activities** → **URL Mappings**
6. Add mapping:
   - Path: `/`
   - URL: Paste your public URL from step above (e.g., `https://funky-jogging-bunny.trycloudflare.com`)
7. Save and wait a few seconds for it to update

---

## 🎮 Launch in Discord

1. **Enable Developer Mode** in Discord:
   - User Settings → Advanced → Toggle "Developer Mode"

2. Open a test server or DM

3. Open the **App Launcher** (bottom left + icon or search)

4. Find and click on your Wordle activity

5. Accept the authorization prompt

6. **Play Wordle!** 🎉

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Activity failed to load" | Check if your public tunnel is active and accessible |
| "Can't authorize with Discord" | Verify redirect URI is set to `https://127.0.0.1` in OAuth2 settings |
| SDK errors in console | Make sure Discord app ID in `.env` matches your app in Developer Portal |
| Database errors | Delete `wordle.db` and restart server |
| Ports already in use | Change ports in `docker-compose.yml` or `package.json` scripts |

---

## 📁 Project Structure

```
.
├── client/              # Vite + Discord SDK frontend
├── server/              # Express + SQLite backend
├── .env                 # Discord credentials
├── package.json         # Root scripts
├── Dockerfile           # Docker image definition
├── docker-compose.yml   # Multi-container setup
└── README.md            # Full documentation
```

---

## 🎯 What's Next?

- **Customize the game**: Edit `client/main.js` and `client/style.css`
- **Add more words**: Add 5-letter words to `valid-words.txt`
- **Deploy to production**: Use Docker or your preferred hosting
- **Read full docs**: Check `README.md` for detailed documentation

---

## 📚 Resources

- [Discord Activities Docs](https://discord.com/developers/docs/activities/overview)
- [Embedded App SDK](https://discord.com/developers/docs/developer-tools/embedded-app-sdk)
- [Getting Started Activity](https://github.com/discord/getting-started-activity)

---

## ✅ Success Checklist

- [ ] `npm install` completed without errors
- [ ] Both servers starting (`npm run dev`)
- [ ] Public tunnel active (cloudflared/ngrok)
- [ ] Activity URL mapping set in Discord Developer Portal
- [ ] Activity appears in Discord App Launcher
- [ ] Can authorize with Discord
- [ ] Game loads and is playable
- [ ] Sound effects work
- [ ] Can submit guesses
- [ ] Progress persists after reload

Enjoy your Discord Wordle! 🎮
