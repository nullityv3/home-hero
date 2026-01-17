// supabase/functions/create-job/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
