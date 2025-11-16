# Quick Setup Guide - PostgreSQL on Railway

## What You Need To Do NOW

Your bot's data is being wiped on every Railway deployment because it uses ephemeral storage. Follow these steps to fix it:

### Step 1: Add PostgreSQL Database (2 minutes)

1. Go to: https://railway.app
2. Open your "Oblivion-bot-production" project
3. Click the **"+ New"** button (top right corner)
4. Select **"Database"**
5. Click **"Add PostgreSQL"**
6. Wait 30 seconds for it to provision

### Step 2: Connect Database to Bot (1 minute)

1. Click on your **bot service** (the one with your code, NOT the database)
2. Click the **"Variables"** tab
3. Look for `DATABASE_URL` - it should already be there automatically
4. If you DON'T see it:
   - Click **"New Variable"**
   - Variable name: `DATABASE_URL`
   - Click the **reference icon** (looks like `$`)
   - Select your PostgreSQL database
   - Select `DATABASE_URL` from the dropdown
   - Click **"Add"**

### Step 3: Redeploy (Happens Automatically)

Railway will automatically redeploy your bot with the new database connection. This takes ~2 minutes.

### Step 4: Verify It's Working

1. Click on your bot service
2. Click **"Deployments"** tab
3. Click the most recent deployment
4. Click **"View Logs"**
5. Look for this line:
   ```
   🐘 Using PostgreSQL database
   ✅ PostgreSQL database initialized
   ```

If you see those lines, **you're done!** Your data will now persist through all deployments.

---

## Testing

After setup, test it:

1. Use `/settings modlog` to set a mod log channel
2. Use `/warn @someone test` to create a case
3. Use `/cases` to see the case
4. Go to Railway and redeploy your bot (Settings → Redeploy)
5. Wait for redeploy to finish
6. Use `/cases` again - **the case should still be there!**

---

## Cost

PostgreSQL on Railway costs **$5/month** after your free credits run out. This is standard for any production Discord bot that needs data persistence.

---

## If You Need Help

Check `RAILWAY-DATABASE-SETUP.md` for detailed troubleshooting and migration options.
