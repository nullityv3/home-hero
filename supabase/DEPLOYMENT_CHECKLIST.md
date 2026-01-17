# Edge Functions Deployment Checklist

Follow this checklist to deploy your edge functions to Supabase.

## Prerequisites

- [ ] Supabase CLI installed: `npm install -g supabase`
- [ ] Logged into Supabase: `supabase login`
- [ ] Project linked: `supabase link --project-ref YOUR_PROJECT_REF`

## Environment Setup

### 1. Get Your Credentials

From Supabase Dashboard → Settings → API:

- [ ] Copy Project URL
- [ ] Copy `anon` public key
- [ ] Copy `service_role` secret key (keep this secure!)

### 2. Set Secrets

```bash
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Verify secrets are set:
```bash
supabase secrets list
```

## Deployment

### Deploy All Functions

```bash
npm run supabase:deploy
```

Or manually:
```bash
supabase functions deploy create-job
supabase functions deploy list-jobs
supabase functions deploy express-interest
supabase functions deploy choose-hero
supabase functions deploy send-chat
```

### Verify Deployment

Check function status in Supabase Dashboard → Edge Functions

Or via CLI:
```bash
supabase functions list
```

## Testing

### 1. Get a Test User Token

```typescript
// In your app or via Supabase Dashboard
const { data: { session } } = await supabase.auth.getSession();
console.log(session.access_token);
```

### 2. Test Each Function

#### Test create-job
```bash
curl -i --location --request POST \
  'https://your-project.supabase.co/functions/v1/create-job' \
  --header 'Authorization: Bearer YOUR_USER_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "title": "Test Job",
    "location": {"lat": 40.7128, "lng": -74.0060}
  }'
```

#### Test list-jobs
```bash
curl -i --location --request GET \
  'https://your-project.supabase.co/functions/v1/list-jobs' \
  --header 'Authorization: Bearer YOUR_USER_TOKEN'
```

#### Test express-interest
```bash
curl -i --location --request POST \
  'https://your-project.supabase.co/functions/v1/express-interest' \
  --header 'Authorization: Bearer YOUR_USER_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"job_id": "YOUR_JOB_UUID"}'
```

#### Test choose-hero
```bash
curl -i --location --request POST \
  'https://your-project.supabase.co/functions/v1/choose-hero' \
  --header 'Authorization: Bearer YOUR_USER_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "job_id": "YOUR_JOB_UUID",
    "hero_user_id": "HERO_USER_UUID"
  }'
```

#### Test send-chat
```bash
curl -i --location --request POST \
  'https://your-project.supabase.co/functions/v1/send-chat' \
  --header 'Authorization: Bearer YOUR_USER_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "request_id": "YOUR_REQUEST_UUID",
    "message": "Hello!"
  }'
```

## Monitoring

### View Logs

```bash
# All functions
npm run supabase:logs

# Specific function
supabase functions logs create-job --tail
```

### Check Function Health

In Supabase Dashboard:
- [ ] Navigate to Edge Functions
- [ ] Check invocation count
- [ ] Review error rates
- [ ] Monitor execution time

## Troubleshooting

### Function Not Found
- Verify deployment: `supabase functions list`
- Check function name matches exactly
- Redeploy: `supabase functions deploy function-name`

### Authentication Errors
- Verify user token is valid
- Check RLS policies on tables
- Ensure user has correct role (civilian/hero)

### Database Errors
- Check table names match schema
- Verify column names are correct
- Review RLS policies
- Check foreign key constraints

### Environment Variable Issues
- List secrets: `supabase secrets list`
- Reset secrets if needed
- Verify no typos in secret names

## Post-Deployment

- [ ] Update `.env` in your React Native app with function URLs
- [ ] Test all functions from the mobile app
- [ ] Monitor logs for first 24 hours
- [ ] Set up error alerting (optional)
- [ ] Document any custom configurations

## Rollback

If you need to rollback:

1. Check previous versions:
```bash
supabase functions list --version
```

2. Deploy specific version:
```bash
supabase functions deploy function-name --version VERSION_NUMBER
```

## Security Checklist

- [ ] Service role key is set as secret (not in code)
- [ ] RLS policies are enabled on all tables
- [ ] Input validation is working (Zod schemas)
- [ ] Error messages don't leak sensitive data
- [ ] Rate limiting is configured (if needed)
- [ ] CORS is properly configured

## Success Criteria

- [ ] All 5 functions deployed successfully
- [ ] All functions return 200 status for valid requests
- [ ] Authentication works correctly
- [ ] Database operations complete successfully
- [ ] Logs show no errors
- [ ] Mobile app can call all functions
- [ ] Error handling works as expected

## Next Steps

1. Integrate functions into your stores (`stores/requests.ts`, `stores/chat.ts`)
2. Update UI components to use edge functions
3. Add loading states and error handling
4. Test offline behavior
5. Monitor production usage
