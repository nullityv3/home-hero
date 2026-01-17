# HomeHeroes - Quick Start Guide

## ✅ Credentials Configured

Your Supabase credentials are already set up in `.env`:
- Project: `htdaqadkqolmpvvbbmez`
- URL: `https://htdaqadkqolmpvvbbmez.supabase.co`

## 🚀 Get Started in 3 Steps

### 1. Verify Setup
```bash
npm run verify:credentials
```

### 2. Deploy Edge Functions
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref htdaqadkqolmpvvbbmez

# Set secrets (get service role key from Supabase dashboard)
supabase secrets set SUPABASE_URL=https://htdaqadkqolmpvvbbmez.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZGFxYWRrcW9sbXB2dmJibWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4OTU2NzYsImV4cCI6MjA4MDQ3MTY3Nn0.XKRtpnAuzPekjBuiUILDcMLQ49JoiBaNUYSXTAY7EBY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Deploy all functions
npm run supabase:deploy
```

### 3. Start Development
```bash
npm start
```

## 📱 Test Accounts

Development test accounts (mock mode):
- Civilian: `civilian@test.com` / `password123`
- Hero: `hero@test.com` / `password123`

## 📚 Documentation

- **Setup Details:** [docs/CREDENTIALS_SETUP.md](docs/CREDENTIALS_SETUP.md)
- **Edge Functions:** [docs/EDGE_FUNCTIONS_INTEGRATION.md](docs/EDGE_FUNCTIONS_INTEGRATION.md)
- **Deployment:** [supabase/DEPLOYMENT_CHECKLIST.md](supabase/DEPLOYMENT_CHECKLIST.md)
- **Full Setup:** [SETUP.md](SETUP.md)

## 🛠️ Useful Commands

```bash
# Verify credentials
npm run verify:credentials

# Test connection
npm run verify:connection

# Deploy edge functions
npm run supabase:deploy

# Deploy single function
npm run supabase:deploy:function create-job

# View function logs
npm run supabase:logs

# Run tests
npm test

# Start app
npm start
```

## 🔗 Quick Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/htdaqadkqolmpvvbbmez)
- [API Settings](https://supabase.com/dashboard/project/htdaqadkqolmpvvbbmez/settings/api)
- [Edge Functions](https://supabase.com/dashboard/project/htdaqadkqolmpvvbbmez/functions)

## ⚠️ Important Notes

1. Get your **service role key** from the Supabase dashboard (API settings)
2. Never commit the service role key to git
3. Edge functions need secrets set before deployment
4. RLS policies are enabled - test with real users

## 🎯 Next Steps

1. ✅ Credentials configured
2. ⏳ Deploy edge functions
3. ⏳ Test the app
4. ⏳ Create real user accounts
5. ⏳ Test all features

Need help? Check the documentation links above!
