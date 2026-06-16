#!/usr/bin/env node
/**
 * Build script: convert ai-chat-one-page.md into a self-contained, print-friendly
 * HTML page (no sidebar, no bookmarks — it's a one-pager).
 *
 * Usage:
 *   node scripts/build-one-page-html.js
 *
 * Inputs (resolved relative to src/assets/ai-chat-concept/):
 *   ai-chat-one-page.md                          source content
 *   scripts/templates/one-page-template.html     page template
 *
 * Output:
 *   ai-chat-one-page.html
 */

const fs = require("fs");
const path = require("path");
const md = require("markdown-it")({
  html: true,
  linkify: false,
  typographer: false,
});

// One level above scripts/ (= src/assets/ai-chat-concept/).
const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "ai-chat-one-page.md");
const TEMPLATE = path.join(ROOT, "scripts", "templates", "one-page-template.html");
const OUTPUT = path.join(ROOT, "ai-chat-one-page.html");

const PAGE_TITLE = "AI Chat for SnoCountry — One-Page";
const PAGE_SUBTITLE =
  "Executive Elevator summary \u2022 Web page generated from <code>ai-chat-one-page.md</code>";
const FOOTER_NOTE =
  "Generated from <code>ai-chat-one-page.md</code> via <code>scripts/build-one-page-html.js</code>";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function main() {
  const sourceMd = fs.readFileSync(SOURCE, "utf8");
  const template = fs.readFileSync(TEMPLATE, "utf8");

  // Strip the H1 — the page header has its own title.
  const body = sourceMd.replace(/^# [^\n]*\n+/m, "");

  // Render the whole body as one HTML blob (no per-section wrapping).
  const article = md.render(body);

  const html = template
    .replace(/\{\{PAGE_TITLE\}\}/g, escapeHtml(PAGE_TITLE))
    .replace(/\{\{PAGE_SUBTITLE\}\}/g, PAGE_SUBTITLE)
    .replace(/\{\{ARTICLE\}\}/g, article)
    .replace(/\{\{FOOTER_NOTE\}\}/g, FOOTER_NOTE);

  fs.writeFileSync(OUTPUT, html);

  console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
  console.log(`  Source size:  ${(sourceMd.length / 1024).toFixed(1)} KB`);
  console.log(`  Output size:  ${(html.length / 1024).toFixed(1)} KB`);
}

main();
