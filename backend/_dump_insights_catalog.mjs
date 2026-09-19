// Dumps the INSIGHTS_CATALOG object from /app/frontend/src/data/insightsCatalog.js
// as JSON on stdout so prerender_pages.py (Python) can iterate it and build
// static HTML snapshots at /app/frontend/public/snapshot/insights/{slug}.html.
// Wired in by prerender_pages.render_insights() via subprocess. Node is
// already present in this repo (frontend build), so no new dependency.
import { INSIGHTS_CATALOG } from "/app/frontend/src/data/insightsCatalog.js";
process.stdout.write(JSON.stringify(INSIGHTS_CATALOG));
