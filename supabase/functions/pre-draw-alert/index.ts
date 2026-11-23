// The historical cron assumed every day at 19:00 BRT was a draw and sent a
// fabricated "2h" warning with a statistical pressure claim. No verified
// upcoming schedule exists in this dataset. Fail closed rather than notify
// users about a draw that may not be scheduled. Keep the service-key gate so
// public callers cannot probe or trigger future versions of this endpoint.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-service-key",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST" || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      req.headers.get("x-service-key") !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  // Scheduled invocations succeed without sending anything; there is no
  // trustworthy next-draw timestamp to compare against the clock.
  return new Response(JSON.stringify({ success: true, notified: 0, suspended: true,
    reason: "verified_upcoming_draw_schedule_unavailable" }), { headers: corsHeaders });
});
