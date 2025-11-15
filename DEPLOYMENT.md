# Deployment Guide for Oblivion Bot

This guide covers multiple ways to deploy your Oblivion Discord bot to the cloud or keep it running locally.

## Table of Contents
- [Cloud Hosting](#cloud-hosting)
  - [Railway (Recommended)](#railway-recommended)
  - [Heroku](#heroku)
  - [DigitalOcean](#digitalocean)
- [Local Hosting](#local-hosting)
  - [Desktop with Custom Domain](#desktop-with-custom-domain)
  - [24/7 Local Server](#247-local-server)
- [Process Management](#process-management)

---

## Cloud Hosting

### Railway (Recommended)

**Pros:**
- ✅ Free $5 credit (no credit card required)
- ✅ Automatic deploys from GitHub
- ✅ Free custom domains
- ✅ Simple setup (3 minutes)
- ✅ Built-in metrics and logs

**Cons:**
- ❌ After free credit: ~$5-10/month
- ❌ Requires credit card after trial

#### Steps:

1. **Push code to GitHub** (skip if already done):
   ```powershell
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YourUsername/oblivion-bot.git
   git push -u origin main
   ```

2. **Sign up for Railway**:
   - Go to: https://railway.app
   - Click "Login with GitHub"
   - Authorize Railway

3. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `oblivion-bot` repository
   - Railway will auto-detect Node.js

4. **Add environment variables**:
   - Click on your deployment
   - Go to "Variables" tab
   - Add these variables:

   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_client_id_here
   CLIENT_SECRET=your_client_secret_here
   CALLBACK_URL=https://your-project.up.railway.app/auth/callback
   SESSION_SECRET=your-random-secret-here
   PORT=3000
   ```

5. **Get your Railway domain**:
   - Click "Settings" tab
   - Under "Domains", click "Generate Domain"
   - Copy the URL (e.g., `oblivion-bot-production.up.railway.app`)

6. **Update Discord OAuth2**:
   - Go to Discord Developer Portal
   - Add redirect: `https://your-railway-url/auth/callback`
   - Update `CALLBACK_URL` variable on Railway

7. **Deploy**:
   - Railway auto-deploys on every git push!
   - Check logs for any errors

#### Custom Domain on Railway:
```
1. Go to Settings → Domains
2. Click "Custom Domain"
3. Enter: www.oblivion.software
4. Add CNAME record in your DNS:
   - Type: CNAME
   - Name: www
   - Value: your-project.up.railway.app
```

---

### Heroku

**Pros:**
- ✅ Reliable and stable
- ✅ Add-ons for databases, monitoring, etc.
- ✅ Free SSL certificates

**Cons:**
- ❌ No free tier (starts at $7/month)
- ❌ More complex setup

#### Steps:

1. **Install Heroku CLI**:
   ```powershell
   winget install Heroku.HerokuCLI
   ```

2. **Login**:
   ```powershell
   heroku login
   ```

3. **Create app**:
   ```powershell
   heroku create oblivion-bot
   ```

4. **Add environment variables**:
   ```powershell
   heroku config:set DISCORD_TOKEN=your_discord_bot_token_here
   heroku config:set CLIENT_ID=your_client_id_here
   heroku config:set CLIENT_SECRET=your_client_secret_here
   heroku config:set CALLBACK_URL=https://oblivion-bot.herokuapp.com/auth/callback
   heroku config:set SESSION_SECRET=your-random-secret-here
   heroku config:set PORT=3000
   ```

5. **Deploy**:
   ```powershell
   git push heroku main
   ```

6. **View logs**:
   ```powershell
   heroku logs --tail
   ```

#### Custom Domain on Heroku:
```powershell
heroku domains:add www.oblivion.software
```
Then add DNS record as instructed.

---

### DigitalOcean

**Best for:** Advanced users who want full control

**Cost:** $6/month (1GB RAM droplet)

#### Quick Setup:

1. **Create droplet**:
   - Go to: https://www.digitalocean.com
   - Create Ubuntu 22.04 droplet ($6/month)
   - Add SSH key

2. **SSH into server**:
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```

4. **Clone your repository**:
   ```bash
   git clone https://github.com/YourUsername/oblivion-bot.git
   cd oblivion-bot
   npm install
   ```

5. **Create .env file**:
   ```bash
   nano .env
   ```
   Paste your environment variables:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_client_id_here
   CLIENT_SECRET=your_client_secret_here
   CALLBACK_URL=http://localhost:3000/auth/callback
   SESSION_SECRET=your-random-secret-here
   PORT=3000
   ```

6. **Install PM2** (process manager):
   ```bash
   sudo npm install -g pm2
   pm2 start index.js --name oblivion-bot
   pm2 startup
   pm2 save
   ```

7. **Setup Nginx** (reverse proxy):
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/oblivion
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name www.oblivion.software;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   Enable and restart:
   ```bash
   sudo ln -s /etc/nginx/sites-available/oblivion /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Setup SSL** (free with Let's Encrypt):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d www.oblivion.software
   ```

---

## Local Hosting

### Desktop with Custom Domain

**Best for:** Testing, personal use, low cost

See `CUSTOM-DOMAIN-SETUP.md` for full Cloudflare Tunnel guide!

**Quick summary:**
```powershell
# Install
winget install --id Cloudflare.cloudflared

# Login and create tunnel
cloudflared tunnel login
cloudflared tunnel create oblivion-bot
cloudflared tunnel route dns oblivion-bot www.oblivion.software

# Run
cloudflared tunnel run oblivion-bot
```

**Pros:**
- ✅ Free (no hosting costs)
- ✅ Full control
- ✅ Custom domain

**Cons:**
- ❌ Requires PC to be on 24/7
- ❌ Depends on home internet
- ❌ Not ideal for production

---

### 24/7 Local Server

Use an old laptop or Raspberry Pi:

1. **Install Node.js** on the device
2. **Clone your repository**
3. **Create .env file** with your credentials
4. **Install PM2**:
   ```bash
   npm install -g pm2
   pm2 start index.js --name oblivion-bot
   pm2 startup
   pm2 save
   ```
5. **Use Cloudflare Tunnel** for custom domain

**Benefits:**
- Dedicated machine (doesn't affect your main PC)
- Lower power consumption than desktop
- Can hide in a corner somewhere

---

## Process Management

### PM2 (Recommended)

**Why use PM2?**
- ✅ Auto-restart on crash
- ✅ Auto-start on system reboot
- ✅ Log management
- ✅ Multiple instances
- ✅ Zero-downtime restarts

#### Install:
```powershell
npm install -g pm2
```

#### Basic commands:
```powershell
# Start bot
pm2 start index.js --name oblivion-bot

# View logs
pm2 logs oblivion-bot

# Restart
pm2 restart oblivion-bot

# Stop
pm2 stop oblivion-bot

# Delete
pm2 delete oblivion-bot

# List all processes
pm2 list

# View monitoring dashboard
pm2 monit
```

#### Auto-start on boot:
```powershell
pm2 startup
pm2 save
```

#### Configuration file (ecosystem.config.js):
```javascript
module.exports = {
  apps: [{
    name: 'oblivion-bot',
    script: './index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

Start with config:
```powershell
pm2 start ecosystem.config.js
```

---

## Comparison Table

| Solution | Cost/Month | Uptime | Setup Difficulty | Best For |
|----------|------------|--------|------------------|----------|
| **Railway** | Free/$5+ | 99.9% | Easy | Quick deployment |
| **Heroku** | $7+ | 99.9% | Medium | Reliable hosting |
| **DigitalOcean** | $6+ | 99.99% | Hard | Full control |
| **Desktop + Tunnel** | Free | Depends on you | Easy | Testing |
| **Raspberry Pi** | Free | High | Medium | Home server |

---

## Environment Variables

All hosting methods need these variables:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
CALLBACK_URL=http://localhost:3000/auth/callback  # Change to your domain
SESSION_SECRET=your-random-secret-here
PORT=3000
```

**Important:** Never commit `.env` to GitHub!

---

## Monitoring and Logs

### Check if bot is online:
- Discord: Look for green status
- Dashboard: Visit your domain
- Logs: Check for errors

### Railway logs:
```
Dashboard → Your Project → Logs tab
```

### Heroku logs:
```powershell
heroku logs --tail
```

### PM2 logs:
```powershell
pm2 logs oblivion-bot
```

### DigitalOcean logs:
```bash
pm2 logs oblivion-bot
# or
journalctl -u oblivion-bot -f
```

---

## Troubleshooting

### Bot offline after deployment:
- ✅ Check logs for errors
- ✅ Verify environment variables
- ✅ Ensure Discord token is valid
- ✅ Check if process is running

### Dashboard not loading:
- ✅ Verify PORT is set correctly
- ✅ Check firewall rules
- ✅ Ensure OAuth2 callback matches

### "ECONNREFUSED" errors:
- ✅ Database file path might be wrong
- ✅ Check SQLite is installed
- ✅ Verify file permissions

### High memory usage:
- ✅ Restart the bot regularly
- ✅ Increase RAM on hosting plan
- ✅ Check for memory leaks in code

---

## Updating Your Bot

### Railway (auto-deploy):
```powershell
git add .
git commit -m "Update bot"
git push
```
Railway deploys automatically!

### Heroku:
```powershell
git push heroku main
```

### DigitalOcean/PM2:
```bash
git pull
npm install
pm2 restart oblivion-bot
```

---

## Security Checklist

- ✅ Never commit .env to GitHub
- ✅ Use strong SESSION_SECRET
- ✅ Enable 2FA on Discord account
- ✅ Rotate bot token if compromised
- ✅ Keep dependencies updated
- ✅ Use HTTPS for dashboard
- ✅ Monitor logs for suspicious activity

---

## Getting Help

- **Railway**: https://railway.app/help
- **Heroku**: https://devcenter.heroku.com
- **DigitalOcean**: https://docs.digitalocean.com
- **PM2**: https://pm2.keymetrics.io/docs
- **Cloudflare**: https://developers.cloudflare.com

---

**That's it! Choose the method that fits your needs and budget. Good luck!** 🚀
