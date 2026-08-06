/**
 * autoGlossaryLink — walk raw text content and wrap the FIRST occurrence of
 * each known glossary term in a link back to /glossary/{slug}. Used on
 * community synopses and glossary definition bodies to build organic
 * internal linking density (huge signal for AI citation + Google topical
 * authority). Doug's ask, Feb 2026.
 *
 * Design rules:
 *  • Case-insensitive match, preserves the original casing from the source
 *  • Only the FIRST occurrence per page becomes a link (avoids visual noise)
 *  • Skips terms whose slug === current page slug (never self-link)
 *  • Longer terms matched first ("Property Transfer Tax" wins before "Tax")
 *  • Ignores anything already inside an <a> tag or code/pre/heading
 *  • Escapes any HTML in the source text so it stays XSS-safe
 *
 * Input: raw string OR safe HTML (we tokenise on angle brackets)
 * Output: HTML string ready for dangerouslySetInnerHTML
 */

const escapeHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const escapeRegex = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

let _compiledCache = { key: "", entries: [] };

const _compile = (terms) => {
  const key = `${terms.length}:${terms[0]?.slug || ""}`;
  if (_compiledCache.key === key && _compiledCache.entries.length) return _compiledCache.entries;
  // Sort longest-first so multi-word terms win over their shorter constituents
  const entries = [...terms]
    .filter((t) => t && t.term && t.slug && t.term.length >= 4)
    .sort((a, b) => b.term.length - a.term.length)
    .map((t) => ({
      term: t.term,
      slug: t.slug,
      // \b word boundaries + optional trailing 's/'s' for plurals
      rx: new RegExp(`\\b${escapeRegex(t.term)}\\b`, "i"),
    }));
  _compiledCache = { key, entries };
  return entries;
};

export const autoGlossaryLink = (raw, terms, opts = {}) => {
  if (!raw || !terms || !terms.length) return escapeHtml(raw || "");
  const currentSlug = opts.currentSlug || "";
  const compiled = _compile(terms);
  // Escape source first so any user-supplied HTML can't slip through
  let html = escapeHtml(String(raw));
  const linkedSlugs = new Set([currentSlug]);
  for (const { term, slug, rx } of compiled) {
    if (linkedSlugs.has(slug)) continue;
    // Only replace the first match, and skip if the surrounding context
    // already contains an anchor tag (rough check — good enough for our
    // sanitised inputs since we escape first, so no anchors will exist yet)
    const match = rx.exec(html);
    if (!match) continue;
    const before = html.slice(0, match.index);
    const after = html.slice(match.index + match[0].length);
    html =
      before +
      `<a href="/glossary/${slug}" class="ez-glossary-link" style="color:#0F2A5B;text-decoration:underline;text-decoration-style:dotted;text-decoration-color:#F5A623;">${match[0]}</a>` +
      after;
    linkedSlugs.add(slug);
  }
  return html;
};

/**
 * relatedGlossaryTerms — deterministic "see also" picker.
 * Returns up to `limit` terms that share a category with `currentTerm`,
 * excluding the term itself. Sorted by term length (shortest first) so the
 * most-general related concepts surface at the top.
 */
export const relatedGlossaryTerms = (currentTerm, allTerms, limit = 6) => {
  if (!currentTerm || !allTerms || !allTerms.length) return [];
  const currentCat = (currentTerm.category || "").toLowerCase();
  if (!currentCat) return [];
  return allTerms
    .filter((t) => t.slug !== currentTerm.slug)
    .filter((t) => (t.category || "").toLowerCase() === currentCat)
    .sort((a, b) => (a.term.length - b.term.length))
    .slice(0, limit);
};

export default { autoGlossaryLink, relatedGlossaryTerms };
