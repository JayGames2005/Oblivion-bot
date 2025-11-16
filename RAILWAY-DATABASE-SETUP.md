# Database Persistence Setup for Railway

## Problem
Railway's ephemeral storage means your SQLite database (`data/oblivion.db`) is **wiped on every deployment**, causing all your moderation cases, warnings, and settings to disappear.

## Solution
Use Railway's **PostgreSQL addon** for persistent storage that survives redeployments.

---

## Setup Instructions

### 1. Add PostgreSQL to Your Railway Project

1. Go to your Railway project: https://railway.app/project/YOUR_PROJECT_ID
2. Click **"+ New"** button in the top right
3. Select **"Database"** → **"Add PostgreSQL"**
4. Railway will automatically create a PostgreSQL database and add the `DATABASE_URL` environment variable

### 2. Verify Environment Variable

1. Go to your **bot service** (not the database service)
2. Click on **"Variables"** tab
3. Confirm you see `DATABASE_URL` with a value like:
   ```
   postgresql://postgres:password@hostname:5432/railway
   ```
4. If not present, manually add it:
   - Click **"+ New Variable"**
   - Name: `DATABASE_URL`
   - Value: Click **"Add Reference"** → Select your PostgreSQL database → Select `DATABASE_URL`

### 3. Deploy

1. Commit and push your code changes:
   ```bash
   git add .
   git commit -m "Add PostgreSQL support for persistent storage"
   git push
   ```

2. Railway will automatically redeploy

3. Check logs for confirmation:
   - You should see: `🐘 Using PostgreSQL database`
   - Then: `✅ PostgreSQL database initialized`

---

## How It Works

The bot automatically detects which database to use:

- **Railway (with `DATABASE_URL`)**: Uses PostgreSQL ✅ Persistent
- **Local development (no `DATABASE_URL`)**: Uses SQLite ✅ Convenient for testing

Your existing code continues to work without changes - the database layer handles the differences automatically.

---

## Migration (Existing Data)

If you have important data in your current SQLite database, you'll need to migrate it:

### Option 1: Start Fresh (Recommended)
Since Railway keeps wiping your data anyway, starting fresh with PostgreSQL is cleanest.

### Option 2: Manual Migration (If you have local data to preserve)

1. Export from SQLite:
   ```powershell
   npm install -g sqlite3
   sqlite3 data/oblivion.db .dump > backup.sql
   ```

2. Convert SQLite SQL to PostgreSQL:
   - Change `INTEGER PRIMARY KEY AUTOINCREMENT` to `SERIAL PRIMARY KEY`
   - Change `TEXT` to `VARCHAR` where appropriate
   - Remove SQLite-specific pragma statements

3. Import to PostgreSQL:
   ```bash
   psql $DATABASE_URL < backup.sql
   ```

---

## Testing Locally

To test PostgreSQL locally before deploying:

1. Install PostgreSQL: https://www.postgresql.org/download/windows/

2. Create a local database:
   ```powershell
   createdb oblivion_dev
   ```

3. Add to your `.env`:
   ```
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/oblivion_dev
   ```

4. Run the bot - it will use PostgreSQL instead of SQLite

---

## Troubleshooting

### Bot shows "Using SQLite" on Railway
- Check that `DATABASE_URL` environment variable exists in your bot service
- Verify it starts with `postgresql://`

### "Connection refused" error
- Ensure PostgreSQL database service is running in Railway
- Check that both services are in the same project

### Data still disappearing
- Verify logs show `🐘 Using PostgreSQL database`
- Check Railway's PostgreSQL service is not restarting frequently
- View data in Railway PostgreSQL dashboard to confirm it's persisting

---

## Monitoring

Check what database you're using in the logs:
```
💾 Using SQLite database    ← Local development
🐘 Using PostgreSQL database ← Railway production
```

---

## Benefits

✅ **Persistent Storage**: Data survives all redeployments  
✅ **Automatic Backups**: Railway backs up PostgreSQL daily  
✅ **Better Performance**: PostgreSQL handles concurrent connections better  
✅ **Scalable**: Can handle more guilds and data  
✅ **No Code Changes**: Your commands work exactly the same  

---

## Cost

Railway PostgreSQL is **$5/month** after the free trial. This is required for any production Discord bot that needs persistent data.
