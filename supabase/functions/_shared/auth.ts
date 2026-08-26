// Shared access-key gate for all Vidz edge functions. Vidz has no login
// system, and the Supabase anon key is meant to be public (it's baked into
// the frontend bundle by design) — this is the one check standing between
// "anyone with the URL" and calling functions that cost real Anthropic API
// money or touch the clips/rule_sets data.

const VIDZ_ACCESS_KEY = Deno.env.get("VIDZ_ACCESS_KEY");

export function checkAccessKey(req: Request, corsHeaders: Record<string, string>): Response | null {
  if (!VIDZ_ACCESS_KEY) {
    return new Response(JSON.stringify({ error: "Server misconfigured: missing VIDZ_ACCESS_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  const provided = req.headers.get("x-vidz-key");
  if (provided !== VIDZ_ACCESS_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  return null;
}
