// conversionAnalytics — small, dependency-free helper for the standard
// conversion event set required by the Phase B brief. Fires into
// window.dataLayer (GA4/GTM) AND `posthog.capture` when available so
// we don't couple the pages to any one analytics vendor.
//
// Standard event set (matches the brief):
//   form_view, form_start, field_error, step_complete, form_submit,
//   article_16_block, thank_you_view, phone_click, calendar_click,
//   doogie_after_submit_use
//
// Every event automatically carries: route, landing_page, utm_*, referral
// source, device_type (mobile vs desktop). Callers only need to pass
// the event-specific fields.

const _readUtm = () => {
  try {
    const sp = new URLSearchParams(window.location.search);
    const utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
      const v = sp.get(k);
      if (v) utm[k] = v;
    });
    return utm;
  } catch { return {}; }
};

const _readReferrer = () => {
  try { return document.referrer || ""; } catch { return ""; }
};

const _readDevice = () => {
  try {
    const w = window.innerWidth || 1024;
    if (w < 480) return "mobile";
    if (w < 900) return "tablet";
    return "desktop";
  } catch { return "unknown"; }
};

const _readLandingPage = () => {
  try {
    // Persist the first landing page in sessionStorage so multi-step
    // journeys still attribute back to the original entry route.
    const k = "ez_landing_page";
    const existing = sessionStorage.getItem(k);
    if (existing) return existing;
    const initial = window.location.pathname + window.location.search;
    sessionStorage.setItem(k, initial);
    return initial;
  } catch { return window.location.pathname; }
};

const _baseContext = () => ({
  route: window.location.pathname,
  landing_page: _readLandingPage(),
  referrer: _readReferrer(),
  device_type: _readDevice(),
  ..._readUtm(),
  ts: new Date().toISOString(),
});

export const trackFormEvent = (event, params = {}) => {
  const payload = { ..._baseContext(), ...params };
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...payload });
  } catch { /* dataLayer not available */ }
  try {
    if (window.posthog && typeof window.posthog.capture === "function") {
      window.posthog.capture(event, payload);
    }
  } catch { /* posthog not available */ }
  // Console breadcrumb during preview builds so QA can watch events
  // fire in the browser devtools without opening the analytics panel.
  try { if (process.env.NODE_ENV !== "production") console.debug("[conv]", event, payload); } catch { /* no-op */ }
};

// Convenience wrappers so pages stay readable.
export const trackFormView       = (route)               => trackFormEvent("form_view", { form_route: route });
export const trackFormStart      = (route)               => trackFormEvent("form_start", { form_route: route });
export const trackFieldError     = (route, field, error) => trackFormEvent("field_error", { form_route: route, field, error });
export const trackStepComplete   = (route, step)         => trackFormEvent("step_complete", { form_route: route, step });
export const trackFormSubmit     = (route, params)       => trackFormEvent("form_submit", { form_route: route, ...params });
export const trackArticle16Block = (route, reason)       => trackFormEvent("article_16_block", { form_route: route, reason: reason || "self_declared_represented" });
export const trackThankYouView   = (route)               => trackFormEvent("thank_you_view", { form_route: route });
export const trackPhoneClick     = (route)               => trackFormEvent("phone_click", { form_route: route });
export const trackCalendarClick  = (route)               => trackFormEvent("calendar_click", { form_route: route });
export const trackDoogieAfterSubmitUse = (route)         => trackFormEvent("doogie_after_submit_use", { form_route: route });

// Enrich a CRM payload with landing_page + UTM + referrer + device so
// every high-intent lead in the CRM has the same attribution shape.
export const withConversionContext = (formPayload = {}, extras = {}) => ({
  ...formPayload,
  landing_page: _readLandingPage(),
  current_route: window.location.pathname,
  referrer: _readReferrer(),
  device_type: _readDevice(),
  ..._readUtm(),
  ...extras,
});
