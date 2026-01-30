# 📖 Documentation Index

Welcome to the Discord Wordle Activity project! This file helps you navigate the documentation.

## 🚀 Start Here

**If you're new, read these in order:**

1. **[SETUP_SUMMARY.txt](SETUP_SUMMARY.txt)** - Overview of what was done (2 min read)
2. **[QUICKSTART.md](QUICKSTART.md)** - Get running in 5 minutes (essential!)
3. **[README.md](README.md)** - Complete documentation with all details

## 📚 Documentation Files

### For Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** ⭐ START HERE
  - Quick 5-minute setup
  - Discord configuration steps
  - Troubleshooting
  - What's next

- **[SETUP_SUMMARY.txt](SETUP_SUMMARY.txt)** 
  - Project overview
  - What changed
  - File structure
  - Checklist

### For Detailed Information
- **[README.md](README.md)**
  - Full project documentation
  - All features listed
  - API endpoint reference
  - Database schema
  - Environment variables
  - Production deployment

- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)**
  - Technical architecture
  - Dependencies breakdown
  - Docker details
  - Development workflow

## 🛠️ Utility Scripts

- **[start.sh](start.sh)** - Helper script to start everything
  ```bash
  bash start.sh
  ```

- **[verify-setup.sh](verify-setup.sh)** - Check project structure
  ```bash
  bash verify-setup.sh
  ```

## 📁 Project Structure

```
discord-wordle/
├── 📖 DOCUMENTATION
│   ├── INDEX.md (this file)
│   ├── QUICKSTART.md ⭐ START HERE
│   ├── README.md
│   ├── SETUP_COMPLETE.md
│   └── SETUP_SUMMARY.txt
│
├── 🎨 CLIENT (Vite + Discord SDK)
│   ├── main.js - Game logic
│   ├── style.css - Styling
│   ├── index.html - HTML
│   ├── package.json - Dependencies
│   └── vite.config.js - Config
│
├── 🖥️ SERVER (Express + SQLite)
│   ├── server.js - Backend
│   └── package.json - Dependencies
│
├── 🐳 DOCKER
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── 🔧 CONFIGURATION
│   ├── .env - Credentials
│   ├── .gitignore
│   ├── .dockerignore
│   └── package.json - Root
│
└── 📊 DATA
    └── valid-words.txt - Word list
```

## 🎯 Quick Commands

### Setup & Installation
```bash
# Install all dependencies
npm install && npm --prefix client install && npm --prefix server install

# Or one at a time
npm install
npm --prefix client install
npm --prefix server install
```

### Running the App
```bash
# Option 1: Run both together
npm run dev

# Option 2: Using helper script
bash start.sh

# Option 3: Run separately
npm --prefix server start
npm --prefix client run dev

# Option 4: Docker
docker-compose up --build
```

### Verification
```bash
# Check setup is complete
bash verify-setup.sh
```

## 🔗 Discord Setup

1. Create/configure Discord app in [Developer Portal](https://discord.com/developers/applications)
2. Enable Activities
3. Set redirect URI to `https://127.0.0.1`
4. Create public tunnel: `cloudflared tunnel --url http://localhost:5173`
5. Add URL Mapping in Activities → URL Mappings
6. Test in Discord App Launcher

**See [QUICKSTART.md](QUICKSTART.md) for detailed steps**

## 📚 Important Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `client/main.js` | Game logic & SDK | Change gameplay, add features |
| `client/style.css` | Styling & animations | Change colors, animations |
| `server/server.js` | Backend & database | Change API, game rules |
| `.env` | Discord credentials | Production setup |
| `valid-words.txt` | Word list | Add/remove valid words |
| `Dockerfile` | Docker build | Advanced deployment |

## 🎮 Features Overview

- ✅ Discord OAuth authentication
- ✅ Full Wordle game with UI
- ✅ Sound effects & animations
- ✅ Game persistence (SQLite)
- ✅ User stats tracking
- ✅ Docker containerization
- ✅ Hot-reload development

## ❓ FAQ

**Q: How do I start?**
A: Read QUICKSTART.md and run `npm run dev`

**Q: How do I run in Docker?**
A: Run `docker-compose up --build`

**Q: Where are the credentials?**
A: In `.env` file (test credentials included)

**Q: How do I add more words?**
A: Edit `valid-words.txt` (one word per line, 5 letters)

**Q: Can I deploy this?**
A: Yes! See README.md Production Deployment section

**Q: Where's the game code?**
A: `client/main.js` (logic) and `server/server.js` (backend)

## 🔗 External Resources

- [Discord Activities Documentation](https://discord.com/developers/docs/activities/overview)
- [Embedded App SDK](https://discord.com/developers/docs/developer-tools/embedded-app-sdk)
- [Getting Started Activity (reference)](https://github.com/discord/getting-started-activity)
- [Vite Documentation](https://vitejs.dev/)
- [Express Documentation](https://expressjs.com/)

## 📞 Troubleshooting

**Problem: Activity not showing in Discord**
- See QUICKSTART.md Troubleshooting section
- Or README.md Troubleshooting section

**Problem: SDK errors**
- Ensure public tunnel is running
- Verify URL Mapping is set correctly
- Wait 5-10 seconds after saving

**Problem: Can't guess words**
- Make sure server is running on port 3001
- Check browser console for errors
- Delete `wordle.db` to reset database

**Problem: Ports in use**
- Kill existing processes
- Or use Docker (different isolation)

See **[QUICKSTART.md](QUICKSTART.md)** for full troubleshooting guide

## ✅ What's Included

- ✅ Complete client app (Vite + Discord SDK)
- ✅ Complete server app (Express + SQLite)
- ✅ Docker configuration
- ✅ Comprehensive documentation
- ✅ Helper scripts
- ✅ Word list with 5-letter words
- ✅ Environment configuration
- ✅ Git configuration

## 🎯 Next Steps

1. **Right Now**: Open [QUICKSTART.md](QUICKSTART.md)
2. **In 5 minutes**: Have app running locally
3. **In 15 minutes**: Have public tunnel & Discord setup
4. **In 20 minutes**: Playing Wordle in Discord! 🎮

---

**📖 START HERE:** [QUICKSTART.md](QUICKSTART.md)  
**📚 LEARN MORE:** [README.md](README.md)  
**🔧 TECHNICAL:** [SETUP_COMPLETE.md](SETUP_COMPLETE.md)

Happy coding! 🚀
