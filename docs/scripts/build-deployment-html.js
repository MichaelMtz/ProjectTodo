#!/usr/bin/env node
/**
 * Build script: convert concepts/deployment-plan.md into a self-contained,
 * styled HTML page with sidebar navigation, bookmarks, reading progress bar,
 * and mobile drawer (mirrors the UX of AI-on-site-concept.html).
 *
 * Usage:
 *   node scripts/build-deployment-html.js
 *
 * Inputs (all paths resolved relative to src/assets/ai-chat-concept/):
 *   deployment-plan.md                       source content
 *   scripts/templates/doc-template.html      shared page template
 *   scripts/lib/build-doc.js                 shared markdown -> HTML builder
 *
 * Output:
 *   deployment-plan.html
 */

const path = require("path");
const { buildDoc } = require("./lib/build-doc");

// Build root is the ai-chat-concept folder (one level above scripts/).
const ROOT = path.resolve(__dirname, "..");

// Sidebar metadata — short title + sub for each section card.
// If a section number is missing here, we fall back to its raw H2 title.
const SIDEBAR_META = {
  1:  { title: "Executive summary",         sub: "Phases, headcount, costs, gates" },
  2:  { title: "POC (6 weeks)",             sub: "Together AI baseline + fine-tune + portability" },
  3:  { title: "Production build",          sub: "Foundation \u2192 UI \u2192 stress test \u2192 soft launch" },
  4:  { title: "Continual learning",        sub: "Data collection, fine-tune cadence, A/B" },
  5:  { title: "Monitoring & operations",   sub: "Dashboards, on-call, vendor risk" },
  6:  { title: "Stress testing",            sub: "Scenarios, what to learn, caching" },
  7:  { title: "Things you might be missing", sub: "13 categories of easy-to-forget items" },
  8:  { title: "Risk register",             sub: "Likelihood, impact, mitigation, owner" },
  9:  { title: "Cost model",                sub: "Year-1 monthly + one-time" },
  10: { title: "Open decisions",            sub: "12 calls to make before kickoff" },
  11: { title: "Hand-off summary",          sub: "What to read next; companion docs" },
};

const result = buildDoc({
  source:   path.join(ROOT, "deployment-plan.md"),
  output:   path.join(ROOT, "deployment-plan.html"),
  template: path.join(ROOT, "scripts", "templates", "doc-template.html"),
  pageTitle:    "SnoCountry AI Assistant \u2014 Deployment Plan",
  pageSubtitle: "POC through production launch and ongoing iteration \u2022 generated from <code>deployment-plan.md</code>",
  storageKey:   "deployment-plan:bookmarks:v1",
  footerNote:   "Generated from <code>deployment-plan.md</code> via <code>scripts/build-deployment-html.js</code>",
  sidebarMeta:  SIDEBAR_META,
});

console.log(`Wrote ${path.relative(ROOT, result.outputPath)}`);
console.log(`  Sections: ${result.sections.length}`);
console.log(`  Output size: ${result.sizeKb} KB`);
result.sections.forEach((s) => {
  const meta = SIDEBAR_META[s.num] || { title: s.title };
  console.log(`    ${s.num.toString().padStart(2)}. ${meta.title}`);
});
