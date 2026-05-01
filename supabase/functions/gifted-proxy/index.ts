import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const GIFTED_BASE = "https://movieapi.giftedtech.co.ke/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GIFTED_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GIFTED_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let path = "";
    let query: Record<string, string | number> = {};

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      path = String(body.path || "");
      query = body.query || {};
    } else {
      const url = new URL(req.url);
      path = url.searchParams.get("path") || "";
      url.searchParams.forEach((v, k) => {
        if (k !== "path") query[k] = v;
      });
    }

    if (!path) {
      return new Response(JSON.stringify({ error: "path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize: only allow safe characters
    if (!/^[a-zA-Z0-9/_\-.%() ]+$/.test(path)) {
      return new Response(JSON.stringify({ error: "invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPath = path.replace(/^\/+/, "");
    const target = new URL(`${GIFTED_BASE}/${cleanPath}`);
    Object.entries(query).forEach(([k, v]) => {
      target.searchParams.set(k, String(v));
    });

    const upstream = await fetch(target.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        API_KEY: apiKey,
        Accept: "application/json",
      },
    });

    const text = await upstream.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return new Response(JSON.stringify(data), {
      status: upstream.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "proxy failure" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});