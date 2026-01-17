# Edge Functions Integration Guide

This guide shows how to call the Supabase Edge Functions from your React Native app.

## Setup

All edge functions are deployed to Supabase and accessible via the Supabase client.

## Function Endpoints

Base URL: `https://your-project-ref.supabase.co/functions/v1/`

## Usage Examples

### 1. Create Job (Civilian)

```typescript
import { supabase } from '@/services/supabase';

async function createJob(jobData: {
  title: string;
  description?: string;
  category?: string;
  location: { lat: number; lng: number; text?: string };
  scheduled_date?: string;
  estimated_duration?: number;
  budget_range?: { min: number; max: number };
}) {
  const { data, error } = await supabase.functions.invoke('create-job', {
    body: jobData
  });

  if (error) throw error;
  return data.job;
}
```

### 2. List Available Jobs (Hero)

```typescript
async function listJobs() {
  const { data, error } = await supabase.functions.invoke('list-jobs', {
    method: 'GET'
  });

  if (error) throw error;
  return data.jobs;
}
```

### 3. Express Interest (Hero)

```typescript
async function expressInterest(jobId: string) {
  const { data, error } = await supabase.functions.invoke('express-interest', {
    body: { job_id: jobId }
  });

  if (error) throw error;
  return data.interest;
}
```

### 4. Choose Hero (Civilian)

```typescript
async function chooseHero(jobId: string, heroUserId: string) {
  const { data, error } = await supabase.functions.invoke('choose-hero', {
    body: {
      job_id: jobId,
      hero_user_id: heroUserId
    }
  });

  if (error) throw error;
  return data.success;
}
```

### 5. Send Chat Message

```typescript
async function sendChatMessage(requestId: string, message: string) {
  const { data, error } = await supabase.functions.invoke('send-chat', {
    body: {
      request_id: requestId,
      message
    }
  });

  if (error) throw error;
  return data.message;
}
```

## Integration with Stores

### Update `stores/requests.ts`

```typescript
// Add to your requests store
createRequest: async (requestData) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-job', {
      body: requestData
    });
    
    if (error) throw error;
    
    set((state) => ({
      requests: [...state.requests, data.job]
    }));
    
    return data.job;
  } catch (error) {
    console.error('Failed to create request:', error);
    throw error;
  }
}
```

### Update `stores/chat.ts`

```typescript
// Add to your chat store
sendMessage: async (requestId: string, message: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-chat', {
      body: { request_id: requestId, message }
    });
    
    if (error) throw error;
    
    set((state) => ({
      messages: [...state.messages, data.message]
    }));
    
    return data.message;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw error;
  }
}
```

## Error Handling

All edge functions return errors in this format:

```typescript
{
  error: string | object
}
```

Handle them consistently:

```typescript
try {
  const result = await supabase.functions.invoke('function-name', { body });
  return result.data;
} catch (error) {
  if (error.message) {
    // Handle specific error
    console.error('Function error:', error.message);
  }
  throw error;
}
```

## Authentication

All functions require authentication. The Supabase client automatically includes the user's JWT token in the `Authorization` header.

Make sure users are logged in before calling these functions:

```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  throw new Error('User must be logged in');
}
```

## Testing Edge Functions

### Using curl

```bash
# Get your anon key from Supabase dashboard
export SUPABASE_URL="https://your-project.supabase.co"
export ANON_KEY="your-anon-key"
export USER_TOKEN="user-jwt-token"

# Test create-job
curl -i --location --request POST "$SUPABASE_URL/functions/v1/create-job" \
  --header "Authorization: Bearer $USER_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "Fix leaky faucet",
    "description": "Kitchen sink is dripping",
    "category": "plumbing",
    "location": {
      "lat": 40.7128,
      "lng": -74.0060,
      "text": "New York, NY"
    }
  }'
```

### Using Postman

1. Set method to POST/GET as appropriate
2. URL: `https://your-project.supabase.co/functions/v1/function-name`
3. Headers:
   - `Authorization: Bearer YOUR_USER_JWT_TOKEN`
   - `Content-Type: application/json`
4. Body: JSON payload

## Deployment

### Deploy All Functions

```bash
npm run supabase:deploy
```

### Deploy Single Function

```bash
npm run supabase:deploy:function create-job
```

### View Logs

```bash
npm run supabase:logs create-job
```

## Environment Variables

Edge functions need these environment variables set in Supabase:

```bash
supabase secrets set SUPABASE_URL=your-url
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these values from your Supabase project settings.

## Next Steps

1. Deploy the functions: `npm run supabase:deploy`
2. Update your stores to use the edge functions
3. Test each function with real data
4. Monitor logs for any issues
5. Set up proper error handling in your UI
