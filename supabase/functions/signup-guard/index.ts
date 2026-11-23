// Legacy IP-based signup limiter suspended: a shared IP is not an identity,
// and the public check/register endpoints could reserve a slot without a
// completed signup. Keep a compatible no-write response for older clients.
// Re-enable abuse controls only after provider-level rate limits/CAPTCHA and
// legitimate shared-network cases have been tested in staging.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  return new Response(JSON.stringify({ allowed: true, suspended: true }), { headers: corsHeaders });
});
