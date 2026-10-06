// First-touch lead-source attribution. Captures UTM params + landing path +
// external referrer on the visitor's first page and persists them for the
// session, so whichever lead form they eventually submit carries the source
// (e.g. a link dropped in the Social Agent Community tagged ?utm_source=socialagent).
const KEY = "eztf_attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export function captureAttribution() {
  try {
    const existing = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (existing) return existing; // first-touch wins — never overwrite
    const params = new URLSearchParams(window.location.search);
    const data = {};
    let hasUtm = false;
    UTM_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) { data[k] = v.slice(0, 120); hasUtm = true; }
    });
    const ref = (document.referrer || "").slice(0, 300);
    const externalRef = ref && !ref.includes(window.location.host);
    data.referrer_url = ref;
    data.landing_path = (window.location.pathname + window.location.search).slice(0, 300);
    if (hasUtm || externalRef) sessionStorage.setItem(KEY, JSON.stringify(data));
    return data;
  } catch (e) {
    return {};
  }
}

export function getAttribution() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(KEY) || "null");
    return stored || captureAttribution();
  } catch (e) {
    return {};
  }
}
