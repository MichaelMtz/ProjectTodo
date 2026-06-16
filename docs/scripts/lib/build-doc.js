/**
 * Shared markdown → HTML builder for SnoCountry concept docs.
 * Used by:
 *   scripts/build-deployment-html.js
 *   scripts/build-executive-plan-html.js
 *
 * Each caller supplies a config object describing source, output, page metadata,
 * and a sidebar-card map. The builder discovers numbered "## N. Title" sections,
 * renders each via markdown-it, captures any intro content above the first
 * numbered section, post-processes GFM task lists into real checkboxes, and
 * fills in the shared HTML template.
 */
const fs = require("fs");
const path = require("path");
const md = require("markdown-it")({
  html: true,
  linkify: false,
  typographer: false,
});

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// markdown-it 10 doesn't render GFM task lists ("- [ ] foo" / "- [x] foo").
// Post-process the rendered HTML to convert them into disabled checkboxes.
function renderTaskLists(html) {
  return html.replace(/<li>\[( |x|X)\]\s+/g, (_match, mark) => {
    const checked = mark.toLowerCase() === "x" ? " checked" : "";
    return `<li class="task-list-item"><input type="checkbox" disabled${checked}> `;
  });
}

/**
 * Build an HTML doc from a markdown source.
 *
 * @param {object} config
 * @param {string} config.source        Absolute path to source markdown.
 * @param {string} config.output        Absolute path to write HTML output.
 * @param {string} config.template      Absolute path to HTML template with placeholders.
 * @param {string} config.pageTitle     Page <title> + <h1> text.
 * @param {string} config.pageSubtitle  Subtitle HTML rendered below the H1.
 * @param {string} config.storageKey    localStorage key for bookmarks (must be unique per doc).
 * @param {string} config.footerNote    Footer HTML.
 * @param {Object<number, {title: string, sub: string}>} [config.sidebarMeta]
 *        Per-section sidebar card metadata, keyed by section number.
 * @returns {{ sections: Array, outputPath: string, sizeKb: string }}
 */
function buildDoc(config) {
  const {
    source,
    output,
    template,
    pageTitle,
    pageSubtitle,
    storageKey,
    footerNote,
    sidebarMeta = {},
  } = config;

  const sourceMd = fs.readFileSync(source, "utf8");
  const templateHtml = fs.readFileSync(template, "utf8");

  // Strip the H1 title — page header has its own.
  const body = sourceMd.replace(/^# [^\n]*\n+/m, "");

  // Discover sections by H2 number+title (## N. Title).
  const sectionPattern = /^## (\d+)\. (.+)$/gm;
  const sections = [];
  let m;
  while ((m = sectionPattern.exec(body)) !== null) {
    sections.push({
      num: parseInt(m[1], 10),
      title: m[2].trim(),
      startIdx: m.index,
    });
  }

  if (sections.length === 0) {
    throw new Error('No "## N. Title" sections found in ' + source);
  }

  // Slice the markdown into per-section blocks and render each.
  sections.forEach((s, i) => {
    const endIdx =
      i + 1 < sections.length ? sections[i + 1].startIdx : body.length;
    const sectionMd = body.substring(s.startIdx, endIdx).trimEnd();
    s.html = renderTaskLists(md.render(sectionMd));
  });

  // Render any intro content (between H1 and first numbered section).
  const introMd = body.substring(0, sections[0].startIdx).trim();
  const introHtml = introMd ? renderTaskLists(md.render(introMd)) : "";

  // Build sidebar cards.
  const sidebarCards = sections
    .map((s) => {
      const meta = sidebarMeta[s.num] || { title: s.title, sub: "" };
      return [
        `        <a class="prompt-card" href="#section-${s.num}" data-target="section-${s.num}">`,
        `          <div class="card-num">${s.num}</div>`,
        `          <div class="card-body">`,
        `            <div class="card-title">${escapeHtml(meta.title)}</div>`,
        `            <div class="card-sub">${escapeHtml(meta.sub)}</div>`,
        `          </div>`,
        `        </a>`,
      ].join("\n");
    })
    .join("\n");

  // Wrap each rendered section for scroll targeting.
  const article = sections
    .map((s) => `<section id="section-${s.num}">\n${s.html}\n</section>`)
    .join("\n\n");

  const html = templateHtml
    .replace(/\{\{PAGE_TITLE\}\}/g, escapeHtml(pageTitle))
    .replace(/\{\{PAGE_SUBTITLE\}\}/g, pageSubtitle)
    .replace(/\{\{STORAGE_KEY\}\}/g, storageKey)
    .replace(/\{\{INTRO\}\}/g, introHtml)
    .replace(/\{\{SIDEBAR_CARDS\}\}/g, sidebarCards)
    .replace(/\{\{ARTICLE\}\}/g, article)
    .replace(/\{\{FOOTER_NOTE\}\}/g, footerNote);

  fs.writeFileSync(output, html);

  return {
    sections,
    outputPath: output,
    sizeKb: (html.length / 1024).toFixed(1),
  };
}

module.exports = { buildDoc, escapeHtml };
