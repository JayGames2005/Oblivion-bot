# Custom Domain Setup for Oblivion Bot

This guide will help you set up your custom domain (www.oblivion.software) to access your locally-hosted Oblivion bot dashboard.

## Why Use Cloudflare Tunnel?

Since you want to run the bot on your desktop and access it via your custom domain, you need a way to expose your local server (localhost:3000) to the internet. Netlify doesn't support Discord bots (Node.js servers) - it's only for static sites.

**Cloudflare Tunnel** is the best free solution:
- ✅ **Free forever** (no bandwidth limits)
- ✅ **Custom domains** (works with any domain you own)
- ✅ **Automatic HTTPS** (secure connections)
- ✅ **No port forwarding** (works behind routers/firewalls)
- ✅ **DDoS protection** (Cloudflare's network)

## Prerequisites

- Your domain (www.oblivion.software) must be using **Cloudflare nameservers**
- Bot must be running on your desktop
- Admin access to your computer

## Step 1: Install Cloudflare Tunnel

### On Windows (PowerShell):
```powershell
winget install --id Cloudflare.cloudflared
```

### Verify Installation:
```powershell
cloudflared --version
```

If `cloudflared` is not recognized, restart PowerShell or your computer.

## Step 2: Login to Cloudflare

```powershell
cloudflared tunnel login
```

This will:
1. Open your browser
2. Ask you to select your domain (oblivion.software)
3. Authorize the tunnel
4. Save credentials to your computer

## Step 3: Create a Tunnel

```powershell
cloudflared tunnel create oblivion-bot
```

This creates a tunnel named "oblivion-bot" and generates a unique ID. Save this ID - you'll need it!

Example output:
```
Tunnel credentials written to: C:\Users\YourName\.cloudflared\<TUNNEL-ID>.json
Created tunnel oblivion-bot with id <TUNNEL-ID>
```

## Step 4: Configure DNS

Route your subdomain to the tunnel:

```powershell
cloudflared tunnel route dns oblivion-bot www.oblivion.software
```

This creates a CNAME record pointing www.oblivion.software → your tunnel.

## Step 5: Create Tunnel Configuration

Create a file at: `C:\Users\YourName\.cloudflared\config.yml`

```yaml
tunnel: <YOUR-TUNNEL-ID>
credentials-file: C:\Users\YourName\.cloudflared\<YOUR-TUNNEL-ID>.json

ingress:
  - hostname: www.oblivion.software
    service: http://localhost:3000
  - service: http_status:404
```

Replace:
- `<YOUR-TUNNEL-ID>` with the tunnel ID from Step 3
- `YourName` with your Windows username

## Step 6: Update Your .env File

Edit `D:\Oblivion\.env`:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_client_id_here
CLIENT_SECRET=your_client_secret_here
CALLBACK_URL=https://www.oblivion.software/auth/callback
SESSION_SECRET=your-random-secret-here
PORT=3000
```

⚠️ **Important**: Change `CALLBACK_URL` from `localhost` to your domain!

## Step 7: Update Discord OAuth2 Settings

1. Go to: https://discord.com/developers/applications/1439272590802817216/oauth2
2. Under **Redirects**, add:
   ```
   https://www.oblivion.software/auth/callback
   ```
3. Keep the localhost one too (for local testing):
   ```
   http://localhost:3000/auth/callback
   ```
4. Click **Save Changes**

## Step 8: Start Everything

You need **TWO terminals**:

### Terminal 1 - Start the Tunnel:
```powershell
cd D:\Oblivion
cloudflared tunnel run oblivion-bot
```

Keep this running! It connects your local server to Cloudflare.

### Terminal 2 - Start the Bot:
```powershell
cd D:\Oblivion
npm start
```

## Step 9: Test Your Domain

1. Open browser: `https://www.oblivion.software`
2. You should see the Oblivion dashboard!
3. Click "Login with Discord"
4. Authorize the bot
5. Manage your servers!

## Troubleshooting

### "Tunnel not found"
- Check tunnel ID in `config.yml` matches Step 3
- Run: `cloudflared tunnel list` to see all tunnels

### "Page not loading"
- Make sure BOTH terminals are running
- Check bot is running: `http://localhost:3000`
- Verify DNS: `nslookup www.oblivion.software`

### "OAuth2 callback error"
- Check `.env` has correct `CALLBACK_URL`
- Verify Discord OAuth2 redirects include your domain
- Make sure protocol is `https://` (not `http://`)

### "Permission denied" errors
- Run PowerShell as Administrator
- Check firewall isn't blocking `cloudflared.exe`

## Run at Startup (Optional)

To make the tunnel start automatically when Windows boots:

### 1. Install as Windows Service:
```powershell
cloudflared service install
```

### 2. Start the service:
```powershell
cloudflared service start
```

Now you only need to run `npm start` in one terminal!

## Alternative Solutions

### Ngrok (Free tier limitations):
```powershell
winget install --id Ngrok.Ngrok
ngrok http 3000
```
- ❌ URL changes on restart
- ❌ 40 connections/minute limit
- ❌ Custom domains require paid plan ($8/month)

### Tailscale Funnel (Good for private use):
```powershell
winget install --id Tailscale.Tailscale
tailscale funnel 3000
```
- ✅ Free custom domains
- ❌ Only works for Tailscale users
- ❌ Not truly public

## Cost Comparison

| Solution | Cost | Custom Domain | Public Access |
|----------|------|---------------|---------------|
| **Cloudflare Tunnel** | Free | ✅ Yes | ✅ Yes |
| Ngrok Free | Free | ❌ No | ✅ Yes |
| Ngrok Paid | $8/mo | ✅ Yes | ✅ Yes |
| Railway | $5/mo | ✅ Yes | ✅ Yes |
| Heroku | $7/mo | ✅ Yes | ✅ Yes |

## Security Tips

1. **Never commit .env to GitHub** (it's in .gitignore)
2. **Rotate your bot token** if it gets exposed
3. **Enable 2FA** on Discord Developer Portal
4. **Monitor Cloudflare logs** for suspicious activity

## Keeping Your Bot Running 24/7

Your bot will stop when you:
- Close the terminal
- Shut down your PC
- Restart Windows

To keep it running 24/7, consider:
1. **Cloud hosting** (Railway, Heroku, VPS)
2. **Dedicated computer** (old laptop, Raspberry Pi)
3. **PM2 process manager** (auto-restart on crash)

See `DEPLOYMENT.md` for cloud hosting options!

---

## Summary

✅ Install cloudflared  
✅ Login to Cloudflare  
✅ Create tunnel  
✅ Configure DNS  
✅ Update .env  
✅ Update Discord OAuth2  
✅ Run tunnel + bot  
✅ Access at https://www.oblivion.software  

Need help? Check Cloudflare's docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
