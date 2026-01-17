// supabase/functions/choose-hero/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
