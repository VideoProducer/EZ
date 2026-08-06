/**
 * EZtoFind.ca — Cloudflare Worker: Bot Prerender Router
 * ------------------------------------------------------
 * Route bindings (in Cloudflare dashboard → Workers → Routes):
 *   eztofind.ca/*
 *   www.eztofind.ca/*
 *
 * Behaviour
 *   1. Inspect the incoming User-Agent.
 *   2. If it matches a known LLM / search-engine crawler:
 *        → fetch prerendered HTML from `${ORIGIN}/api/bot/{path}`
 *        → return that HTML (adds X-Prerender: HIT header)
 *   3. Otherwise:
 *        → pass through unchanged to the origin SPA.
 *
 * Deployment notes
 *   • ORIGIN must be your production origin (the FastAPI + SPA pod).
 *     Do NOT point ORIGIN back at eztofind.ca or you'll loop.
 *   • This Worker adds ~5ms overhead on human requests (regex on UA).
 *   • Blocklisted paths (/api, /admin, /my-account, /favorites,
 *     /consultation/status, uploads, downloads) are ALWAYS passed
 *     through — PIPA-compliant, no PII ever cached in prerender.
 *   • No cloaking: bots see the same content humans see, just server-
 *     rendered.  Google's guidelines explicitly allow this pattern.
 *
 * Compliance references
 *   • BCFSA: rendered HTML carries the site-wide disclosure footer.
 *   • CASL:  no form state is prerendered (server strips cookies).
 *   • PIPA:  blocklist below MUST match /app/backend/services/prerender_service.py.
 *   • CREA/GVR: listing pages carry MLS® attribution + last-updated stamp.
 */

const ORIGIN = "https://ORIGIN-HOSTNAME.example.com"; // ← REPLACE at deploy

const BOT_UA = new RegExp(
  "(" +
    "googlebot|google-inspectiontool|google-extended|bingbot|slurp|" +
    "duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|" +
    "gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|" +
    "perplexitybot|perplexity-user|" +
    "ccbot|amazonbot|applebot|bytespider|meta-externalagent|" +
    "facebookexternalhit|twitterbot|linkedinbot|slackbot|telegrambot|" +
    "discordbot|whatsapp|pinterestbot|redditbot|" +
    "mj12bot|semrushbot|ahrefsbot|dotbot|petalbot" +
  ")",
  "i"
);

const BLOCKLIST = [
  "/api", "/admin", "/my-account", "/account", "/favorites",
  "/dashboard", "/login", "/signup", "/signin", "/logout", "/auth",
  "/consultation/status", "/consultation-status", "/doogie/upload",
  "/uploads", "/download", "/snapshot", "/static", "/assets",
];

function isBlocklisted(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return BLOCKLIST.some(p => clean === p || clean.startsWith(p + "/"));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";

    // Pass-through: non-GET, blocklisted paths, or non-bot traffic.
    if (request.method !== "GET" || isBlocklisted(url.pathname) || !BOT_UA.test(ua)) {
      return fetch(request);
    }

    // Bot request → fetch prerendered HTML from the origin's bot endpoint.
    const proxyUrl = new URL(ORIGIN);
    proxyUrl.pathname = "/api/bot" + url.pathname;
    proxyUrl.search = url.search;

    try {
      const resp = await fetch(proxyUrl.toString(), {
        method: "GET",
        headers: {
          "user-agent": ua,
          "x-forwarded-host": url.hostname,
          "x-forwarded-proto": "https",
          "accept": "text/html",
        },
        cf: { cacheTtl: 300, cacheEverything: true },
      });
      // If the prerender endpoint failed, fall back to the SPA (safety net).
      if (!resp.ok) {
        return fetch(request);
      }
      const headers = new Headers(resp.headers);
      headers.set("X-Prerender", "HIT");
      headers.set("Cache-Control", "public, max-age=300, s-maxage=600");
      return new Response(resp.body, { status: resp.status, headers });
    } catch (e) {
      // Any error → serve the SPA.  Never break the site for a crawler.
      return fetch(request);
    }
  },
};
