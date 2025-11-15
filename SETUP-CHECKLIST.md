# ✅ Quick Setup Checklist

## 📋 What You Need to Do:

### 1. Create GitHub Repository
- Go to https://github.com/new
- Name: `oblivion-bot`
- Make it **Private** (to protect your bot token)
- Don't initialize with README
- Click "Create repository"

### 2. Push Code to GitHub
Run these commands in the terminal:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/oblivion-bot.git
git branch -M main
git push -u origin main
```

### 3. Update Discord Developer Portal
Go to: https://discord.com/developers/applications/1439272590802817216/oauth2

Add this redirect URL:
```
https://www.oblivion.software/auth/callback
```

### 4. Update .env File
Edit your `.env` file and change:
```env
CALLBACK_URL=https://www.oblivion.software/auth/callback
```

### 5. Install Cloudflare Tunnel
Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

Or install via winget:
```powershell
winget install --id Cloudflare.cloudflared
```

### 6. Setup Cloudflare Tunnel
```powershell
cloudflared tunnel login
cloudflared tunnel create oblivion-bot
cloudflared tunnel route dns oblivion-bot www.oblivion.software
```

### 7. Run Everything

**Terminal 1 - Start Cloudflare Tunnel:**
```powershell
cloudflared tunnel run oblivion-bot
```

**Terminal 2 - Start Bot:**
```powershell
cd D:\Oblivion
npm start
```

### 8. Access Your Bot Dashboard
Visit: **https://www.oblivion.software**

---

## 🎉 You're Done!

Your bot will be:
- ✅ Running on your desktop
- ✅ Accessible at www.oblivion.software
- ✅ Secure with HTTPS
- ✅ Free forever (Cloudflare Tunnel is free)

---

## 📝 Notes:

- Keep both terminals running (tunnel + bot)
- Your desktop must stay on for the bot to work
- Use PM2 to auto-restart the bot if it crashes
- Consider setting up auto-start on Windows boot

---

## 🔄 Optional: Auto-Start on Boot

Install PM2:
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
cd D:\Oblivion
pm2 start index.js --name oblivion-bot
pm2 save
```

Then Cloudflare tunnel can run as a Windows service:
```powershell
cloudflared service install
```

---

## 🆘 Need Help?

Check the detailed guides:
- `CUSTOM-DOMAIN-SETUP.md` - Full domain setup guide
- `DEPLOYMENT.md` - Alternative deployment options
- `README.md` - Bot features and commands
