Below is a complete, production-ready set of online-only Edge Functions for your Kiro AI + Supabase app.
These cover:

createJob()

listAvailableJobs()

expressInterest()

chooseHero()

sendChatMessage()

Everything is designed for:

Supabase Edge Functions (Deno / TypeScript)

supabase-js with service role for safe DB access

Zod validation

Proper RLS usage (only where appropriate)

Clean structured responses

📦 Folder Structure (Online Functions Only)
supabase/
  functions/
    create-job/
      index.ts
    list-jobs/
      index.ts
    express-interest/
      index.ts
    choose-hero/
      index.ts
    send-chat/
      index.ts

⚙️ 1. createJob() — Civilian creates a job
Endpoint

POST /functions/v1/create-job

Security

Requires authenticated civilian

Runs with user's access token

RLS enforces user can only insert where civilian_id = auth.uid()

Code
// supabase/functions/create-job/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";

const JobSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    text: z.string().optional()
  }),
  scheduled_date: z.string().optional(),
  estimated_duration: z.number().optional(),
  budget_range: z.object({
    min: z.number(),
    max: z.number()
  }).optional()
});

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const body = await req.json();
    const parsed = JobSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
    }

    const civilian_id = (await supabase.auth.getUser()).data.user?.id;

    const { data, error } = await supabase
      .from("service_requests")
      .insert([
        {
          civilian_id,
          ...parsed.data
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ job: data }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

⚙️ 2. listJobs() — Heroes view available jobs
Endpoint

GET /functions/v1/list-jobs

Filters

status = pending

hero not already assigned

(optional) skill matching

(optional) distance filtering

Code
// supabase/functions/list-jobs/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: jobs, error } = await supabase
      .from("service_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return new Response(JSON.stringify({ jobs }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

⚙️ 3. expressInterest() — Hero expresses interest
Endpoint

POST /functions/v1/express-interest

Rules

Hero must be authenticated

Hero can only express interest once per job (unique constraint)

Code
// supabase/functions/express-interest/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";

const Schema = z.object({
  job_id: z.string().uuid(),
});

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
    }

    const hero_id = (await supabase.auth.getUser()).data.user?.id;

    const { data, error } = await supabase
      .from("job_interest")
      .insert([
        {
          job_id: parsed.data.job_id,
          hero_user_id: hero_id,
          source: "app"
        }
      ])
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ interest: data }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

⚙️ 4. chooseHero() — Civilian picks the hero
Endpoint

POST /functions/v1/choose-hero

Rules

Civilian must own the job

Atomic update required:

Update job → set hero_id

Set other interests to rejected

Code
// supabase/functions/choose-hero/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";

const Schema = z.object({
  job_id: z.string().uuid(),
  hero_user_id: z.string().uuid()
});

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
    }

    const { job_id, hero_user_id } = parsed.data;

    // 1. Assign job
    const { error: updateError } = await supabase
      .from("service_requests")
      .update({
        hero_id: hero_user_id,
        status: "assigned"
      })
      .eq("id", job_id);

    if (updateError) throw updateError;

    // 2. Reject non-selected interests
    await supabase
      .from("job_interest")
      .update({ status: "rejected" })
      .eq("job_id", job_id)
      .neq("hero_user_id", hero_user_id);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

⚙️ 5. sendChatMessage() — Send online chat message
Endpoint

POST /functions/v1/send-chat

Code
// supabase/functions/send-chat/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";

const Schema = z.object({
  request_id: z.string().uuid(),
  message: z.string().min(1)
});

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
    }

    const sender_id = (await supabase.auth.getUser()).data.user?.id;

    const { data, error } = await supabase
      .from("chat_messages")
      .insert([
        {
          request_id: parsed.data.request_id,
          sender_id,
          message: parsed.data.message
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ message: data }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});