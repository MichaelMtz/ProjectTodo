#!/usr/bin/env node
/**
 * Build script: convert concepts/ai-chat-executive-plan.md into a self-contained,
 * styled HTML page with sidebar navigation, bookmarks, reading progress bar,
 * and mobile drawer (mirrors the UX of deployment-plan.html and AI-on-site-concept.html).
 *
 * Usage:
 *   node scripts/build-executive-plan-html.js
 *
 * Inputs (all paths resolved relative to src/assets/ai-chat-concept/):
 *   ai-chat-executive-plan.md                source content
 *   scripts/templates/doc-template.html      shared page template
 *   scripts/lib/build-doc.js                 shared markdown -> HTML builder
 *
 * Output:
 *   ai-chat-executive-plan.html
 */

const path = require("path");
const { buildDoc } = require("./lib/build-doc");

// Build root is the ai-chat-concept folder (one level above scripts/).
const ROOT = path.resolve(__dirname, "..");

// Sidebar metadata — short title + sub for each section card.
// If a section number is missing here, we fall back to its raw H2 title.
const SIDEBAR_META = {
  1: { title: "Executive summary",      sub: "Phases, headcount, costs, gates" },
  2: { title: "POC objectives",         sub: "Four binary questions in 6 weeks" },
  3: { title: "POC budget",             sub: "Together AI + RunPod portability" },
  4: { title: "Production build",       sub: "Foundation \u2192 UI \u2192 stress test \u2192 soft launch" },
  5: { title: "Cost model",             sub: "Year-1 monthly + one-time costs" },
  6: { title: "Things you might miss",  sub: "13 one-liners — legal, partners, a11y, ops" },
};

const result = buildDoc({
  source:   path.join(ROOT, "ai-chat-executive-plan.md"),
  output:   path.join(ROOT, "ai-chat-executive-plan.html"),
  template: path.join(ROOT, "scripts", "templates", "doc-template.html"),
  pageTitle:    "AI Chat \u2014 Executive Plan",
  pageSubtitle: "10-minute exec digest of the SnoCountry AI chat plan \u2022 generated from <code>ai-chat-executive-plan.md</code>",
  storageKey:   "ai-chat-executive-plan:bookmarks:v1",
  footerNote:   "Generated from <code>ai-chat-executive-plan.md</code> via <code>scripts/build-executive-plan-html.js</code>",
  sidebarMeta:  SIDEBAR_META,
});

console.log(`Wrote ${path.relative(ROOT, result.outputPath)}`);
console.log(`  Sections: ${result.sections.length}`);
console.log(`  Output size: ${result.sizeKb} KB`);
result.sections.forEach((s) => {
  const meta = SIDEBAR_META[s.num] || { title: s.title };
  console.log(`    ${s.num.toString().padStart(2)}. ${meta.title}`);
});
