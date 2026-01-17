# Edge Functions Setup & Testing Guide

## ✅ Connection Status
Your app is now connected to Supabase!
- **URL:** https://htdaqadkqolmpvvbbmez.supabase.co
- **Tables:** All verified and accessible

## 🚀 Quick Start

### 1. Start Your App
```bash
npm start
```

Your app will now connect to the real Supabase backend instead of mock mode.

### 2. Test Authentication
- Open the app
- Sign up as a civilian or hero
- The profile will be created in Supabase automatically

## 📡 Edge Functions

You have 5 edge functions ready to deploy:
1. **create-job** - Create service requests
2. **list-jobs** - List available jobs for heroes
3. **express-interest** - Heroes express interest in jobs
4. **choose-hero** - Civilians select a hero
5. **send-chat** - Send chat messages

### Deploy Edge Functions

#### Step 1: Login to Supabase CLI
```bash
npx supabase login
```

#### Step 2: Link Your Project
```bash
npx supabase link --project-ref htdaqadkqolmpvvbbmez
```

#### Step 3: Deploy All Functions
```bash
npx supabase functions deploy create-job
npx supabase functions deploy list-jobs
npx supabase functions deploy express-interest
npx supabase functions deploy choose-hero
npx supabase functions deploy send-chat
```

Or use the PowerShell script:
```bash
npm run supabase:deploy
```

### Test Edge Functions Locally

#### Start Local Supabase
```bash
npx supabase start
```

#### Serve Functions Locally
```bash
npx supabase functions serve
```

#### Test a Function
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-job' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"title":"Test Job"}'
```

## 🧪 Testing Without Edge Functions

**Good news:** Your app works perfectly without edge functions! 

The frontend directly uses the Supabase client to:
- Create service requests
- List jobs
- Express interest
- Choose heroes
- Send chat messages

Edge functions are optional and provide:
- Additional validation
- Complex business logic
- Server-side operations
- Webhook handling

## 📊 What's Working Now

### ✅ Authentication
- Sign up (civilian/hero)
- Sign in
- Sign out
- Session management
- Role-based routing

### ✅ Profiles
- Automatic profile creation
- Profile updates
- Profile loading

### ✅ Service Requests
- Create requests (civilians)
- List requests
- Accept/reject requests (heroes)
- Cancel requests
- Complete requests

### ✅ Real-time Chat
- Send messages
- Receive messages instantly
- Message history

### ✅ Hero Discovery
- Browse heroes
- Filter by skills/rating/rate
- View hero details

### ✅ Earnings
- Track completed jobs
- Calculate earnings
- View earnings history

## 🔧 Troubleshooting

### Tables Not Found
If you get "table not found" errors, run the schema from `xz.md`:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Paste the entire content of `xz.md`
5. Run it

### RLS Policy Errors
If you get "permission denied" errors:
- Check that RLS policies are created (they're in `xz.md`)
- Make sure you're authenticated
- Verify the user has the correct role

### Connection Errors
Run the verification script:
```bash
npx ts-node scripts/verify-connection-simple.ts
```

## 🎯 Next Steps

1. **Test the app:**
   ```bash
   npm start
   ```

2. **Create test accounts:**
   - Sign up as civilian
   - Sign up as hero (different email)

3. **Test the flow:**
   - Civilian creates a request
   - Hero views available requests
   - Hero accepts request
   - Both users chat
   - Hero completes request

4. **Deploy edge functions (optional):**
   - Follow the deployment steps above
   - Update `services/edge-functions.ts` if needed

## 📝 Notes

- Your `.env` file now has real credentials
- Make sure `.env` is in `.gitignore` (it is)
- Edge functions are optional - the app works without them
- All core functionality uses direct Supabase client calls
