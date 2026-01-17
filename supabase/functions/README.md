# Supabase Edge Functions

This directory contains the Supabase Edge Functions for the HomeHeroes app.

## Functions

1. **create-job** - Civilian creates a new service request
2. **list-jobs** - Heroes view available jobs
3. **express-interest** - Hero expresses interest in a job
4. **choose-hero** - Civilian selects a hero for their job
5. **send-chat** - Send chat messages between users

## Deployment

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Logged in: `supabase login`
- Linked to your project: `supabase link --project-ref your-project-ref`

### Deploy All Functions
```bash
supabase functions deploy create-job
supabase functions deploy list-jobs
supabase functions deploy express-interest
supabase functions deploy choose-hero
supabase functions deploy send-chat
```

### Deploy Single Function
```bash
supabase functions deploy <function-name>
```

## Testing Locally

### Start Local Supabase
```bash
supabase start
```

### Serve Functions Locally
```bash
supabase functions serve
```

### Test a Function
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-job' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"title":"Test Job","location":{"lat":40.7128,"lng":-74.0060}}'
```

## Environment Variables

Set secrets for your functions:
```bash
supabase secrets set SUPABASE_URL=your-url
supabase secrets set SUPABASE_ANON_KEY=your-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

## Function Details

### create-job
- **Method**: POST
- **Auth**: Required (civilian)
- **Body**: `{ title, description?, category?, location: {lat, lng, text?}, scheduled_date?, estimated_duration?, budget_range?: {min, max} }`

### list-jobs
- **Method**: GET
- **Auth**: Required (hero)
- **Returns**: Array of pending jobs

### express-interest
- **Method**: POST
- **Auth**: Required (hero)
- **Body**: `{ job_id }`

### choose-hero
- **Method**: POST
- **Auth**: Required (civilian, job owner)
- **Body**: `{ job_id, hero_user_id }`

### send-chat
- **Method**: POST
- **Auth**: Required
- **Body**: `{ request_id, message }`
