# Supabase Credentials Setup

Your Supabase credentials are now configured across the project.

## ✅ Configured Files

### 1. Environment Variables (`.env`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://htdaqadkqolmpvvbbmez.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Status:** ✅ Configured and ready

### 2. React Native App (`services/supabase.ts`)
The Supabase client automatically reads from environment variables:
```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

**Status:** ✅ Configured and ready

### 3. Edge Functions (`supabase/functions/`)
Edge functions use Supabase secrets (not environment variables).

**Status:** ⚠️ Needs deployment secrets

## 🚀 Next Steps

### Step 1: Verify Credentials
Run the verification script to ensure everything is configured correctly:

```bash
npm run verify:credentials
```

This will check:
- Environment variables are set
- URL and key formats are valid
- Connection to Supabase works

### Step 2: Deploy Edge Functions

First, install Supabase CLI if you haven't:
```bash
npm install -g supabase
```

Login to Supabase:
```bash
supabase login
```

Link your project:
```bash
supabase link --project-ref htdaqadkqolmpvvbbmez
```

Set edge function secrets:
```bash
supabase secrets set SUPABASE_URL=https://htdaqadkqolmpvvbbmez.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZGFxYWRrcW9sbXB2dmJibWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4OTU2NzYsImV4cCI6MjA4MDQ3MTY3Nn0.XKRtpnAuzPekjBuiUILDcMLQ49JoiBaNUYSXTAY7EBY
```

**Important:** You also need the service role key for the `choose-hero` function:
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get your service role key from:
https://supabase.com/dashboard/project/htdaqadkqolmpvvbbmez/settings/api

⚠️ **Warning:** The service role key bypasses RLS. Keep it secret!

Deploy all functions:
```bash
npm run supabase:deploy
```

### Step 3: Test Your Setup

Test the connection:
```bash
npm run verify:connection
```

Test edge functions:
```bash
npx ts-node scripts/test-edge-functions.ts
```

Start your app:
```bash
npm start
```

## 📋 Project Configuration Summary

### Your Supabase Project
- **Project ID:** htdaqadkqolmpvvbbmez
- **Project URL:** https://htdaqadkqolmpvvbbmez.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/htdaqadkqolmpvvbbmez

### Configured Components

#### React Native App
- ✅ Supabase client (`services/supabase.ts`)
- ✅ Edge functions wrapper (`services/edge-functions.ts`)
- ✅ Auth store (`stores/auth.ts`)
- ✅ All other stores using Supabase

#### Edge Functions
- ✅ `create-job` - Create service requests
- ✅ `list-jobs` - List available jobs
- ✅ `express-interest` - Express interest in jobs
- ✅ `choose-hero` - Select hero for job
- ✅ `send-chat` - Send chat messages

#### Testing & Verification
- ✅ Credential verification script
- ✅ Connection test script
- ✅ Edge function test suite

## 🔒 Security Notes

### Public Keys (Safe to Commit)
- ✅ `EXPO_PUBLIC_SUPABASE_URL` - Project URL
- ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Anon/public key

These are safe to commit because:
- They're meant to be public (used in client apps)
- Protected by Row Level Security (RLS)
- Rate limited by Supabase

### Secret Keys (NEVER Commit)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - Service role key

This must NEVER be committed because:
- Bypasses all RLS policies
- Has full database access
- Should only be used in secure server environments

### Best Practices
1. ✅ `.env` is in `.gitignore`
2. ✅ Service role key only in Supabase secrets
3. ✅ RLS policies enabled on all tables
4. ✅ Input validation in edge functions
5. ✅ Rate limiting implemented

## 🐛 Troubleshooting

### "Missing Supabase credentials"
- Check `.env` file exists
- Verify environment variables are set
- Restart your development server

### "Connection failed"
- Check your internet connection
- Verify URL is correct
- Check Supabase project is active

### "Edge function not found"
- Deploy functions: `npm run supabase:deploy`
- Check function names match exactly
- Verify project is linked: `supabase link`

### "Authentication failed"
- Check anon key is correct
- Verify user is logged in
- Check RLS policies allow the operation

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](./EDGE_FUNCTIONS_INTEGRATION.md)
- [Deployment Checklist](../supabase/DEPLOYMENT_CHECKLIST.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)

## ✅ Quick Verification Checklist

- [ ] `.env` file has correct credentials
- [ ] `npm run verify:credentials` passes
- [ ] Supabase CLI installed and logged in
- [ ] Project linked with `supabase link`
- [ ] Edge function secrets set
- [ ] All functions deployed
- [ ] `npm run verify:connection` passes
- [ ] App starts without errors
- [ ] Can sign up/login in the app

Once all items are checked, your Supabase integration is complete! 🎉
