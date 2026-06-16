const cardData = {
  user: {
    title: 'User Browser',
    color: '#3b82f6',
    bg: '#eff6ff',
    badge: { text: 'Entry Point', color: '#dbeafe', textColor: '#1d4ed8' },
    desc: 'The visitor interacts with the AI Chat bot on the SnoCountry.com website. Snow Chat logic deconstructs the user query, retrieves relevant context from the RAG pipeline, and generates a response. The browser opens a persistent WebSocket or SSE connection to receive streaming token responses from the LLM in real time.',
    stack: ['Chrome / Safari', 'WebSocket / SSE', 'JavaScript'],
    details: [
      { label: 'Protocol', value: 'HTTPS + WebSocket' },
      { label: 'Auth', value: 'Session token (cookie)' },
      { label: 'Input', value: 'Natural language query' },
    ]
  },
  website: {
    title: 'SnoCountry.com Website',
    color: '#6366f1',
    bg: '#f5f3ff',
    badge: { text: 'AI Chat Bot', color: '#e0e7ff', textColor: '#4338ca' },
    desc: 'AI Chat bot loaded on home, state, resort pages. User messages are sent to the backend API with session context. The chat UI renders markdown responses and streams tokens as they arrive.',
    stack: ['Netlify', 'HTML / CSS', 'Tailwind CSS', 'JavaScript'],
    details: [
      { label: 'Deployment', value: 'Netlify CDN' },
      { label: 'AI Chat Bot', value: 'Home, state, resort pages' },
      { label: 'Context', value: 'Page URL + user session' },
    ]
  },
apiweb: {
    title: 'SnoCountry.com API Endpoints',
    color: '#6366f1',
    bg: '#f5f3ff',
    badge: { text: 'Web snow conditions', color: '#e0e7ff', textColor: '#4338ca' },
    desc: 'Legacy conditions distribution for feeds and web. Currently a mix of data retrieved from AWS (Home, state) + Convex (resort) ',
    stack: ['AWS', 'Convex' ],
    details: [
      { label: 'Web', value: 'Snow conditions for web' },
      { label: 'Feed', value: 'Snow conditions for Sno feed' },
    ]
  },
apillm: {
    title: 'AI chat bot API Endpoints',
    color: '#6366f1',
    bg: '#f5f3ff',
    badge: { text: 'LLM conditions/article data', color: '#e0e7ff', textColor: '#4338ca' },
    desc: "RAG = Retrieval-Augmented Generation. It's just a fancy name for: before asking the LLM a question, fetch the current relevant facts (latest snow conditions) and paste them into the prompt.  <br/><br/> The goal of RAG isn't to give the model a lot of information. It's to give it exactly the right small amount.  ",
    stack: ['Convex','Fast', 'Typescript' ],
    details: [
      { label: 'Conditions', value: 'Compact to relavant fields ' },
      { label: 'Resort overview', value: 'Pre-render summaries for LLM' },
      { label: 'News', value: 'Vector search' },
    ]
  },
  api: {
    title: 'API Gateway / Router',
    color: '#22c55e',
    bg: '#f0fdf4',
    badge: { text: 'Infrastructure', color: '#dcfce7', textColor: '#15803d' },
    desc: 'FastAPI handles authentication, rate limiting, and request routing. It orchestrates the RAG pipeline steps sequentially and opens a streaming response back to the client as LLM tokens are generated.',
    stack: ['FastAPI', 'Python 3.12', 'JWT Auth', 'asyncio'],
    details: [
      { label: 'Rate Limit', value: '20 req/min per user' },
      { label: 'Timeout', value: '30s hard limit' },
      { label: 'Output', value: 'SSE token stream' },
    ]
  },
  embed: {
    title: 'Query Embedding',
    color: '#eab308',
    bg: '#fefce8',
    badge: { text: 'RAG — Step 1', color: '#fef9c3', textColor: '#a16207' },
    desc: 'Identify context relevant to the user query and fetch appropriate data from the conditions feed.',
    stack: ['Convex', 'Python', 'JSON'],
    details: [
      { label: 'Relevancy', value: 'Resort / State snow conditions' },
      { label: 'Current', value: 'Live data' },
      { label: 'Latency', value: '~40–80ms' },
    ]
  },
  vector: {
    title: 'Resort Overview',
    color: '#a855f7',
    bg: '#fdf4ff',
    badge: { text: 'RAG — Step 2', color: '#f3e8ff', textColor: '#7e22ce' },
    desc: 'Retrieved chunks are ranked by relevance score, optionally re-ranked with a cross-encoder, then assembled into a structured context block that will be injected into the LLM prompt.',
    stack: ['Data Feed + pgvector', 'HNSW index', 'Top-K=5'],
    details: [
      { label: 'Index', value: 'HNSW (cosine)' },
      { label: 'Top-K', value: '5 chunks returned' },
      { label: 'Chunk size', value: '512 tokens / 50 overlap' },
    ]
  },
  context: {
    title: 'News / Articles Retrieval',
    color: '#f97316',
    bg: '#fff7ed',
    badge: { text: 'RAG — Step 3', color: '#ffedd5', textColor: '#c2410c' },
    desc: 'The raw user query is converted into a dense vector representation using a local embedding model (nomic-embed-text via Ollama). This vector captures semantic meaning to enable similarity-based retrieval.',

    stack: ['Re-ranking', 'Score threshold 0.7', 'Deduplication'],
    details: [
      { label: 'Re-ranker', value: 'Cross-encoder (optional)' },
      { label: 'Min score', value: '0.70 cosine similarity' },
      { label: 'Output', value: 'Ordered context string' },
    ]
  },
  prompt: {
    title: 'Prompt Builder',
    color: '#f43f5e',
    bg: '#fff1f2',
    badge: { text: 'Prompt Assembly', color: '#ffe4e6', textColor: '#be123c' },
    desc: 'Combines three components into the final LLM prompt: (1) a system prompt defining the assistant\'s persona and SnoCountry.com brand voice, (2) injected RAG context chunks, and (3) the original user query. Manages token budget to stay within context window.',
    stack: ['System Prompt', 'RAG Context Injection', 'Token counting'],
    details: [
      { label: 'System prompt', value: 'SnoCountry.com brand persona' },
      { label: 'Max context', value: '8,192 tokens total' },
      { label: 'Format', value: 'ChatML template' },
    ]
  },
  finetune: {
    title: 'Fine-Tune Layer',
    color: '#16a34a',
    bg: '#f0fdf4',
    badge: { text: 'Domain Adaptation', color: '#dcfce7', textColor: '#15803d' },
    desc: 'Goal is for responses to be like a local is giving you inside advice. OTS chatbot is providing generic tips. We want to beat what OTS is offering, not first but better. Fine-tuned LoRA adapter trained on SnoCountry.com-specific data: snow conditions, resort overviews, news articles and ski resort terminology. Layered on top of the base model for domain accuracy.',
    stack: ['LoRA adapter', 'Unsloth / PEFT', 'JSONL training data'],
    details: [
      { label: 'Base model', value: 'llama3.2:3b' },
      { label: 'Method', value: 'LoRA (r=16, α=32)' },
      { label: 'Training data', value: '~5,000 Q&A pairs' },
    ]
  },
  llm: {
    title: 'Together.ai - API / LLM Inference',
    color: '#6366f1',
    bg: '#f5f3ff',
    badge: { text: 'Together.ai - Serverless', color: '#e0e7ff', textColor: '#4338ca' },
    desc: 'High-performance inference, powered by Together.ai in-house research. No infrastructure to manage, no long-term commitments. runs the quantized LLaMA 3.2 model locally, keeping all inference private with no external API calls. Tokens are streamed back via SSE. GPU acceleration via Metal (macOS) or CUDA (Linux) reduces TTFT.',
    stack: ['Together.ai', 'llama3.2:3b-q4_K_M', 'API'],
  },
  response: {
    title: 'AI Response → User',
    color: '#22c55e',
    bg: '#f0fdf4',
    badge: { text: 'Output — Streaming', color: '#dcfce7', textColor: '#15803d' },
    desc: 'Tokens are streamed back through the API Gateway to the chat widget in real time. The UI renders markdown as it arrives. Response includes source citations from RAG chunks. Conversation history is persisted for follow-up questions.',
    stack: ['SSE token stream', 'Markdown render', 'Source citations'],
    details: [
      { label: 'Format', value: 'Markdown + citations' },
      { label: 'History', value: 'Redis session store' },
      { label: 'Follow-ups', value: 'Full context window' },
    ]
  }
};

let activeCard = null;
let panelCloseAnim = null;

function openCardPanel() {
  const panel = document.getElementById('card-details');
  const wasHidden = panel.classList.contains('hidden-panel');
  panel.classList.remove('hidden-panel');

  if (panelCloseAnim) { panelCloseAnim.cancel?.(); panelCloseAnim = null; }
  if (!window.__motion) return;
  const { animate } = window.__motion;

  // Cubic-bezier with overshoot — mimics a spring without needing motion's spring()
  const springish = [0.34, 1.56, 0.5, 1];

  if (wasHidden) {
    animate(panel,
      { opacity: [0, 1], x: [40, 0], scale: [0.96, 1] },
      { duration: 0.45, easing: springish }
    );
  } else {
    animate(panel,
      { scale: [0.97, 1.005, 1], opacity: [0.85, 1, 1] },
      { duration: 0.28, easing: 'ease-out' }
    );
  }
}

function selectCard(id) {
  if (activeCard) {
    document.getElementById('card-' + activeCard)?.classList.remove('active');
    document.querySelectorAll('.flow-path-step').forEach(s => {
      s.classList.remove('text-blue-600', 'font-semibold');
      s.querySelector('.step-num').style.background = '';
      s.querySelector('.step-num').style.color = '';
      s.querySelector('.step-num').style.border = '';
    });
  }

  if (activeCard === id) {
    activeCard = null;
    closePanel();
    return;
  }

  activeCard = id;
  document.getElementById('card-' + id)?.classList.add('active');

  const d = cardData[id];
  if (!d) return;

  openCardPanel();

  document.getElementById('panel-title').textContent = d.title;
  document.getElementById('panel-icon').style.background = d.bg;
  document.getElementById('panel-icon').innerHTML = `<svg width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="${d.color}" stroke-width="1.8"/><path d="M12 8v4M12 16h.01" stroke="${d.color}" stroke-width="2" stroke-linecap="round"/></svg>`;

  document.getElementById('panel-badge').innerHTML = `<span class="badge" style="background:${d.badge.color};color:${d.badge.textColor}">${d.badge.text}</span>`;
  document.getElementById('panel-desc').textContent = d.desc;

  document.getElementById('panel-stack').innerHTML = `
    <div class="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1.5">Tech Stack</div>
    <div class="flex flex-wrap gap-1.5">${d.stack.map(s => `<span class="tech-chip">${s}</span>`).join('')}</div>
  `;

  document.getElementById('panel-details').innerHTML = `
    <div class="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1.5">Details</div>
    ${d.details.map(det => `
      <div class="flex justify-between items-center py-1.5 border-b border-slate-50">
        <span class="text-xs text-slate-400">${det.label}</span>
        <span class="text-xs font-medium text-slate-600">${det.value}</span>
      </div>
    `).join('')}
  `;

  const stepMap = {
    user: 'user', website: 'website', apillm: 'apillm',
    embed: 'embed', vector: 'vector', context: 'context',
    prompt: 'prompt', finetune: 'llm', llm: 'llm', response: 'response'
  };
  const targetStep = stepMap[id];
  document.querySelectorAll('.flow-path-step').forEach(s => {
    if (s.dataset.step === targetStep) {
      s.classList.add('text-blue-600', 'font-semibold');
      const num = s.querySelector('.step-num');
      num.style.background = '#dbeafe';
      num.style.color = '#2563eb';
      num.style.border = '1.5px solid #93c5fd';
    }
  });
}

function drawConnectors() {
  console.log('drawConnectors');
  const svg = document.getElementById('connector-svg');
  const canvas = document.getElementById('diagram-canvas');
  svg.querySelectorAll('.conn-path').forEach(el => el.remove());

  const cr = canvas.getBoundingClientRect();

  function pt(id, edge) {
    const el = document.getElementById(id);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const x0 = r.left - cr.left, y0 = r.top - cr.top;
    // Edge midpoints
    if (edge === 'top')    return [x0 + r.width / 2, y0];
    if (edge === 'bottom') return [x0 + r.width / 2, y0 + r.height];
    if (edge === 'left')   return [x0, y0 + r.height / 2];
    if (edge === 'right')  return [x0 + r.width, y0 + r.height / 2];
    // Corners — accept "top-left" or "top left", in any order
    const tokens = String(edge).toLowerCase().split(/[\s-]+/);
    const hasTop    = tokens.includes('top');
    const hasBottom = tokens.includes('bottom');
    const hasLeft   = tokens.includes('left');
    const hasRight  = tokens.includes('right');
    if ((hasTop || hasBottom) && (hasLeft || hasRight)) {
      const x = hasLeft ? x0 : x0 + r.width;
      const y = hasTop  ? y0 : y0 + r.height;
      return [x, y];
    }
    return null;
  }

  function addPath(from, to, cls) {
    if (!from || !to) return;
    const [fx, fy] = from, [tx, ty] = to;
    const dx = Math.abs(tx - fx), dy = Math.abs(ty - fy);
    let d;
    if (dy >= dx) {
      const my = (fy + ty) / 2;
      d = `M ${fx} ${fy} C ${fx} ${my} ${tx} ${my} ${tx} ${ty}`;
    } else {
      const mx = (fx + tx) / 2;
      d = `M ${fx} ${fy} C ${mx} ${fy} ${mx} ${ty} ${tx} ${ty}`;
    }
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', cls + ' conn-path');
    const marker = cls.includes('solid') ? 'url(#arrow-solid)' : 'url(#arrow)';
    path.setAttribute('marker-end', marker);
    svg.appendChild(path);
  }

  // User ↔ Website (vertical, solid — distinct from main data flow)
  addPath(pt('card-website',    'bottom'),    pt('card-user', 'top'), 'flow-line-solid');
  // User ↔ API endpoints (web + llm) — solid connection
  addPath(pt('card-user', 'left'), pt('card-apiweb',  'right'), 'flow-line');
  addPath(pt('card-user', 'left'), pt('card-apillm',  'right'), 'flow-line');
  addPath(pt('card-user', 'right'), pt('card-prompt',  'left'), 'flow-line');
  addPath(pt('card-apiweb', 'right'), pt('card-user',  'left'), 'flow-line');
  addPath(pt('card-apillm', 'right'), pt('card-user',  'left'), 'flow-line');
  addPath(pt('card-apillm', 'bottom'), pt('card-embed',  'top'), 'flow-line');


  // Main data flow (dashed)
  addPath(pt('card-user',    'bottom'), pt('card-api',     'top'),    'flow-line');
  addPath(pt('card-api',     'bottom'), pt('card-embed',   'top'),    'flow-line');
  // RAG pipeline internal steps (solid)
  addPath(pt('card-embed',   'bottom'),  pt('card-vector',  'top'),   'flow-line-solid');
  addPath(pt('card-vector',  'bottom'),  pt('card-context', 'top'),   'flow-line-solid');
  // RAG out → Prompt Builder
  addPath(pt('card-context', 'left'), pt('card-apillm',  'left'),    'flow-line');
  // Fine-tune feeds into LLM (solid)
  addPath(pt('card-finetune','left'),  pt('card-llm',     'right'),   'flow-line-solid');
  // Prompt → LLM → Response
  addPath(pt('card-prompt',  'bottom'), pt('card-llm',     'top'),    'flow-line');
  addPath(pt('card-llm',     'bottom'), pt('card-response','top'),    'flow-line');
  addPath(pt('card-response','top-left'), pt('card-user','bottom-left'),    'flow-line');

}

window.addEventListener('load', () => setTimeout(drawConnectors, 900));
window.addEventListener('resize', drawConnectors);

function toggleDerek() {
  const legend = document.getElementById('legend-derek');
  const on = legend.classList.toggle('legend-active');
  document.querySelectorAll('.flow-card.derek').forEach(card => {
    card.classList.toggle('derek-active', on);
  });
}

const planContent = {
  timeline: {
    title: 'Timeline (kickoff Mon, May 18, 2026)',
    html: `
      <table>
        <thead>
          <tr><th>Phase</th><th>Dates</th><th>Wks</th><th>Headcount</th><th>What happens</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>POC (proof of concept)</strong></td>
            <td>May 18 – Jun 26</td>
            <td>1–6</td>
            <td>1 dev + 1 LLM designer + ¼ PM</td>
            <td>Prove the bot can answer well, fast, and cheap on real SnoCountry data. Test fine-tuning. Test portability across providers. Explore third party (api) vs dedicated system decision.</td>
          </tr>
          <tr>
            <td><strong>Production build</strong></td>
            <td>Jun 29 – Sep 18</td>
            <td>7–18</td>
            <td>1 dev + 1 LLM designer + ¼ PM</td>
            <td>Build the production engine end-to-end: chat panel, "smart cards" for resorts/articles/sponsors, five-layer safety guardrails, monitoring, partner integrations.</td>
          </tr>
          <tr>
            <td><strong>Stress + infra decision</strong></td>
            <td>Aug 31 – Sep 18</td>
            <td>16–18</td>
            <td>1 LLM designer <em>(overlaps build team)</em></td>
            <td>Load-test under programmable 200-user bursts. Confirm caps. Decide pay-per-use AI service vs dedicated GPU. Default: stay pay-per-use.</td>
          </tr>
          <tr>
            <td><strong>Soft launch</strong></td>
            <td>Sep 21 – Oct 2</td>
            <td>19–20</td>
            <td>SnoCountry team rotation reviewing conversations</td>
            <td>Quietly ship to one resort page, internal live testing, ramp 10% → 100% of canary traffic, expand to 3 pages, watch every conversation.</td>
          </tr>
          <tr>
            <td><strong>Public launch</strong></td>
            <td><strong>Mon, Oct 5, 2026</strong></td>
            <td>21+</td>
            <td>1 dev sustaining </td>
            <td>Roll out site-wide. Continual learning + monthly fine-tuning kick in.</td>
          </tr>
        </tbody>
      </table>
      <h3>Four milestones</h3>
      <ol>
        <li><strong>Fri, Jun 5</strong> <em>(end of Week 3)</em> — early quality check on the stock model. Fine-tuning calibration path.</li>
        <li><strong>Fri, Jun 26</strong> <em>(end of Week 6)</em> — POC knowledge: start production build, Identify model/provider.</li>
        <li><strong>Fri, Sep 11</strong> <em>(end of Week 17)</em> — pay-per-use vs dedicated GPU decision based on load test traffic data.</li>
        <li><strong>Fri, Oct 5</strong> <em>(end of Week 20)</em> — public launch decision based on soft-launch metrics.</li>
      </ol>
    `
  },
  cost: {
    title: 'Cost',
    html: `
      <table>
        <thead>
          <tr><th>Bucket</th><th>Amount</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>POC cloud spend</strong> (Weeks 1–6)</td>
            <td>~$700</td>
            <td>Together AI tokens, fine-tuning, RunPod portability test</td>
          </tr>
          <tr>
            <td><strong>Production build cloud</strong> (Weeks 7–18)</td>
            <td>~$800</td>
            <td>Together AI inference + embeddings + ~$50 fine-tunes</td>
          </tr>
          <tr>
            <td><strong>Year-1 monthly run rate</strong> (cloud)</td>
            <td>$20–$920/mo</td>
            <td>Scales with traffic: ~$20 at 5k turns/mo (~800 chat users), ~$920 at 250k turns/mo (~42k chat users)</td>
          </tr>
          <tr>
            <td><strong>Legal review</strong> (one-time)</td>
            <td>~$250</td>
            <td>Terms of Service (ToS) + privacy update</td>
          </tr>
          <tr>
            <td><strong>Initial content corpus</strong> (one-time)</td>
            <td>~ xx hours</td>
            <td>50 hand-authored resort overviews</td>
          </tr>
          <tr>
            <td><strong>Engineering</strong></td>
            <td>~18 dev-weeks</td>
            <td>1 LLM designer for POC + production; (Lead Dev (MIM) salaried)</td>
          </tr>
        </tbody>
      </table>
      <p class="mt-3"><strong>Total v1 launch budget: ~$1,500 cloud + ~$250 legal + ~18 dev-weeks of labor.</strong></p>
    `
  },
  outcomes: {
    title: 'Outcomes + Benefits',
    html: `
      <h3>What we get at launch (outcomes)</h3>
      <ul>
        <li><strong>A first-of-its-kind feature for SnoCountry</strong> — the first AI chat on the site, embedded on resort and snow-report pages. Visible product win, story for press and partners.</li>
        <li><strong>Competitive parity</strong> — With existing OnTheSnow and Perplexity-style "answer engines" This project places SnoCountry in a competitive position.</li>
        <li><strong>An elegant, hardened experience</strong> — not the ChatGPT bolt-on that OTS offers. On-brand tone (Real Skiers and Riders who know the snow),  five-layer safety guardrails, jailbreak test suite, refusal copy reviewed by content lead, sponsor disclosure built in.</li>
        <li><strong>Smart cards alongside answers</strong> — ask about Copper Mountain, get the chat answer <em>plus</em> a live conditions card, lift status, an upcoming event, a relevant article, and a sponsor card — all from existing SnoCountry endpoints.</li>
        <li><strong>Operational maturity from day one</strong> — monitoring dashboards, on-call runbook, cost alerts, instant kill-switch (feature flag), vendor-failover plan. Built <em>before</em> a crisis, not after.</li>
        <li><strong>A reusable backbone</strong> — the Retrieval-Augmented Generation (RAG) corpus + chat orchestrator becomes the foundation for every future AI feature, internal or external. One investment, many surfaces.</li>
      </ul>
      <h3>What it enables (benefits)</h3>
      <ul>
        <li><strong>Deeper user engagement</strong> — Q&amp;A invites longer sessions, more engagement, more entity-card clicks (each click is a measurable revenue surface).</li>
        <li><strong>Embeddable partner widget</strong> <em>(planned v1.5)</em> — ship the chat as a <code>&lt;script&gt;</code> snippet that radio stations, resort partners, and ski shops drop onto their own sites. Each carries a <code>partnerId</code> for traffic attribution and ad-revenue share. <strong>Partner sites become SnoCountry traffic sources.</strong></li>
        <li><strong>First-party data signal</strong> — every conversation tells us what users actually want to know. Gaps in current content surface immediately. Informs the editorial roadmap and SEO priorities.</li>
        <li><strong>New sponsor / ad inventory</strong> — sponsor cards in the entity panel are a fresh ad surface. Existing <code>/api/track/ad-impression</code> and <code>/api/track/ad-click</code> endpoints already separate chat-driven from organic, so attribution is built in.</li>
        <li><strong>Trip-planning conversion</strong> — bot can recommend resorts and link to current conditions, articles, and events — driving deeper engagement with paid partners and Epic / Ikon / Indy pass affiliations.</li>
        <li><strong>Multi-language path</strong> <em>(v1.5)</em> — English v1; Spanish + French planned. Opens Latin America and Quebec markets with mostly system-prompt work, no model retraining.</li>
        <li><strong>Brand authority</strong> — positions SnoCountry as the trusted, AI-augmented authority on North American skiing. Press-friendly launch story.</li>
      </ul>
    `
  },
  traffic: {
    title: 'SnoCountry Traffic',
    html: `
      <div class="flex flex-col gap-4">
        <figure class="m-0">
          <figcaption class="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Monthly traffic — Oct 1, 2025 → May 5, 2026</figcaption>
          <img src="Traffic-Monthly.png" alt="SnoCountry monthly traffic dashboard" class="w-full rounded-xl border border-slate-200" />
        </figure>
        <figure class="m-0">
          <figcaption class="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Daily traffic — geographic + hour-of-week heatmap</figcaption>
          <img src="Traffic-Daily.png" alt="SnoCountry daily traffic by region and hour" class="w-full rounded-xl border border-slate-200" />
        </figure>
      </div>
    `
  },
  weights: {
    title: 'Open vs Closed weight LLMs',
    html: `
      <div id="OpenWeightCodingModels" class="flow-card p-3 bg-slate-50/60">
        <div class="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Open-weight coding models</div>
        <div class="grid grid-cols-2 gap-2">

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#f5f3ff;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#6366f1" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Alibaba</div>
                <div class="text-xs font-semibold text-slate-700">Qwen 3 Coder (32B)</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">32B</span>
              <span class="tech-chip">14B</span>
              <span class="tech-chip">7B</span>
              <span class="tech-chip">1.5B</span>
              <span class="tech-chip">MoE 2.5</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release Date (Latest Flagship)</span><span class="font-medium text-slate-600 text-right">Late 2025 / Early 2026</span></div>
              <div class="flex justify-between gap-2"><span class="text-slate-400">Knowledge date</span><span class="font-medium text-slate-600">Late 2025</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Local open-weight benchmark leader — Apache-licensed, near-frontier coding on prosumer hardware.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#dcfce7;color:#15803d">Open</div>
          </div>

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#f5f3ff;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#6366f1" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Moonshot AI</div>
                <div class="text-xs font-semibold text-slate-700">Kimi K2.6</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">K2.6</span>
              <span class="tech-chip">K2</span>
              <span class="tech-chip">K1</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release Date (Latest Flagship)</span><span class="font-medium text-slate-600 text-right">Early 2026</span></div>
              <div class="flex justify-between gap-2"><span class="text-slate-400">Knowledge date</span><span class="font-medium text-slate-600">Late 2025</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Massive sub-agent swarms — parallel multi-file refactoring via native tool calling.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#dcfce7;color:#15803d">Open</div>
          </div>

        </div>
      </div>

      <div id="CodingModels" class="flow-card p-3 bg-slate-50/60 mt-4">
        <div class="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Closed API coding models</div>
        <div class="grid grid-cols-3 gap-2">

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#fff1f2;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#be123c" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Anthropic</div>
                <div class="text-xs font-semibold text-slate-700">Claude Opus 4.7</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">Opus 4.7</span>
              <span class="tech-chip">Sonnet 4.6</span>
              <span class="tech-chip">Haiku 4.5</span>
              <span class="tech-chip">128k output</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release Date (Latest Flagship)</span><span class="font-medium text-slate-600 text-right">April 2026</span></div>
              <div class="flex justify-between gap-2"><span class="text-slate-400">Knowledge date</span><span class="font-medium text-slate-600">January 2026</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Adaptive Thinking — dynamic compute depth; giant multi-file outputs without truncation.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#fee2e2;color:#b91c1c">Closed</div>
          </div>

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#fff1f2;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#be123c" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">OpenAI</div>
                <div class="text-xs font-semibold text-slate-700">GPT-5.4 Thinking</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">GPT-5.4</span>
              <span class="tech-chip">5.3-Codex</span>
              <span class="tech-chip">Codex-Mini</span>
              <span class="tech-chip">Computer use</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release Date (Latest Flagship)</span><span class="font-medium text-slate-600 text-right">March 2026</span></div>
              <div class="flex justify-between gap-2"><span class="text-slate-400">Knowledge date</span><span class="font-medium text-slate-600">Late 2025</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Unified Codex + GPT stack — sandboxes, execute, and auto-debug its own scripts.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#fee2e2;color:#b91c1c">Closed</div>
          </div>

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#fff1f2;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#be123c" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Google</div>
                <div class="text-xs font-semibold text-slate-700">Gemini 3.5 Flash</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">3.5 Flash</span>
              <span class="tech-chip">3.1 Pro</span>
              <span class="tech-chip">2.5 Pro</span>
              <span class="tech-chip">1M+ ctx</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release Date (Latest Flagship)</span><span class="font-medium text-slate-600 text-right">May 2026</span></div>
              <div class="flex justify-between gap-2"><span class="text-slate-400">Knowledge date</span><span class="font-medium text-slate-600">Early 2026</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Speed-agent hyper-velocity — ~4× faster than 3.1; repo-scale ingestion at 1M+ context.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#fee2e2;color:#b91c1c">Closed</div>
          </div>

        </div>
      </div>
      
      <div id="IDEModels" class="flow-card p-3 bg-slate-50/60 mt-4">
        <div class="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">AI IDE &amp; agent platforms</div>
        <div class="grid grid-cols-2 gap-2">

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#e0e7ff;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#4338ca" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Cursor</div>
                <div class="text-xs font-semibold text-slate-700">Anysphere / xAI</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">Claude 4.7</span>
              <span class="tech-chip">GPT-5.5</span>
              <span class="tech-chip">Composer 2.5</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release &amp; milestones</span><span class="font-medium text-slate-600 text-right">Apr/May 2026</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Cursor 3.5 &amp; Composer 2.5 shipped; xAI/SpaceX acquisition (&gt;$50B). Parallel cloud agents from Slack/Jira — fix code, run sandboxes, push PRs async.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#e0e7ff;color:#4338ca">Forked VS Code</div>
          </div>

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#e0e7ff;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#4338ca" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Windsurf</div>
                <div class="text-xs font-semibold text-slate-700">Cognition</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">GPT-5.5</span>
              <span class="tech-chip">Claude 4.7</span>
              <span class="tech-chip">SWE-1.5</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release &amp; milestones</span><span class="font-medium text-slate-600 text-right">May 2026</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Windsurf 2.0 (Agent Command Center); native Devin integration. Cascade Flow — continuous indexing and handoff to autonomous Devin web-agents.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#e0e7ff;color:#4338ca">VS Code + JetBrains</div>
          </div>

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#e0e7ff;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#4338ca" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">GitHub Copilot</div>
                <div class="text-xs font-semibold text-slate-700">Workspace · Microsoft</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">GPT-5.5</span>
              <span class="tech-chip">GPT-5.4 Mini</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release &amp; milestones</span><span class="font-medium text-slate-600 text-right">Early 2026</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Graduated preview into Azure/GitHub Enterprise. Natural-language repos — issue → plan → multi-file code → CI/CD tests.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#e0e7ff;color:#4338ca">Cloud platform</div>
          </div>

          <div class="flow-card p-3 flex flex-col">
            <div class="flex items-center gap-2.5 mb-1.5">
              <div class="icon-pill" style="background:#e0e7ff;width:28px;height:28px;border-radius:8px">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10" stroke="#4338ca" stroke-width="1.8" stroke-linecap="round"/></svg>
              </div>
              <div>
                <div class="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Replit Agent</div>
                <div class="text-xs font-semibold text-slate-700">Replit</div>
              </div>
            </div>
            <div class="flex gap-1 flex-wrap mb-2">
              <span class="tech-chip">Replit LM</span>
              <span class="tech-chip">Custom orchestrators</span>
            </div>
            <div class="space-y-1 mb-2 text-[10px] text-slate-500">
              <div class="flex justify-between gap-2"><span class="text-slate-400">Release &amp; milestones</span><span class="font-medium text-slate-600 text-right">Late 2025 / Early 2026</span></div>
            </div>
            <p class="text-[10px] text-slate-500 leading-snug mb-2">Full-stack mobile generation and direct-to-cloud deploy. Zero-setup prototyping — DB, env, and production deploy from one prompt.</p>
            <div class="mt-auto text-center text-[11px] font-semibold uppercase tracking-wide py-1.5 rounded-md" style="background:#e0e7ff;color:#4338ca">Browser cloud IDE</div>
          </div>

        </div>
      </div>

    `
  },
  projects: {
    title: 'Project List',
    html: `
      <div class="ml-1.5 space-y-1.5">
        <div id="plan-detail-title" class=" text-xs font-semibold text-slate-400 uppercase tracking-wide">Summer Projects</div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div><span><strong>AI Chat bot</strong> <span class="text-slate-400">— 18 weeks</span></span></div>
        <div class="flex items-start gap-2 mt-2"><div class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div><span><strong>Summer resort page refactor</strong> <span class="text-slate-400">— 3–5 days</span></span></div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div><span><strong>Snow scraping</strong> <span class="text-slate-400">— timeline ongoing</span></span></div>
        <div class="ml-5 space-y-1 text-slate-500">
          <div class="flex items-start gap-2"><div class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></div><span>Expand: Midwest + additional regions</span></div>
          <div class="flex items-start gap-2"><div class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></div><span>Tweak display</span></div>
          <div class="flex items-start gap-2"><div class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></div><span>Incorporate new AI scraping tech</span></div>
        </div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div><span><strong>New CMS</strong> (News / Article generation) <span class="text-slate-400">— 2 weeks</span></span></div>
        <div class="ml-5 space-y-1 text-slate-500">
          <div class="flex items-start gap-2"><div class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></div><span>Authors, publishers</span></div>
          <div class="flex items-start gap-2"><div class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></div><span>Import existing article database</span></div>
        </div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0"></div><span><strong>Search + News / Articles</strong> (after New CMS) <span class="text-slate-400">— 1 day</span></span></div>

        <div id="plan-detail-title" class="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Fall Projects</div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div><span><strong>State conditions pull from faster API</strong> <span class="text-slate-400">— 1 week</span></span></div>
        <div class="ml-5 space-y-1 text-slate-500">
          <div class="flex items-start gap-2"><div class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></div><span>Normalize to build on client (JS)</span></div>
        </div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div><span><strong>Replace radio / news server</strong> <span class="text-slate-400">— 1 week</span></span></div>
        <div class="ml-5 space-y-1 text-slate-500">
          <div class="flex items-start gap-2"><div class="w-1 h-1 rounded-full bg-slate-300 mt-1.5 flex-shrink-0"></div><span>Add FTP radio capability on cheaper server</span></div>
        </div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div><span><strong>Systems Admin panel</strong> (UI for logging errors, long latency calls) <span class="text-slate-400">— 1 week</span></span></div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div><span><strong>SnoCountry.com mobile: AI refactor</strong> <span class="text-slate-400">— 1 week</span></span></div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div><span><strong>SnoCountry.com desktop: AI refactor cleanup</strong> <span class="text-slate-400">— 1 week</span></span></div>

        <div class="flex items-start gap-2 mt-2"><div class="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0"></div><span><strong>Home page conditions pull from faster API</strong> <span class="text-slate-400">— 1 day</span></span></div>
        
        <div id="plan-detail-title" class="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Winter Projects</div>
        <div class="flex items-start gap-2"><div class="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div><span><strong>Refactor Resort backdoor / admin area</strong> <span class="text-slate-400">— 2 weeks</span> <span class="text-slate-400 italic">(ready for 27–28 season)</span></span></div>

        <div class="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
          <div class="flex items-center gap-1.5">Complexity:</div>
          <div class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-red-400"></div>High</div>
          <div class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-blue-400"></div>Medium</div>
          <div class="flex items-center gap-1.5"><div class="w-1.5 h-1.5 rounded-full bg-green-400"></div>Small</div>
        </div>
      </div>
    `
  }
};

let activePlan = null;

function renderPlanDetail(key) {
  const data = planContent[key];
  const titleEl = document.getElementById('plan-detail-title');
  const bodyEl = document.getElementById('plan-detail-body');
  if (data) {
    titleEl.textContent = data.title;
    bodyEl.innerHTML = data.html;
  } else {
    const chip = document.querySelector(`.plan-chip[data-plan="${key}"]`);
    titleEl.textContent = chip ? chip.textContent : key;
    bodyEl.innerHTML = '<p class="text-slate-400 italic">Content coming soon.</p>';
  }
}

function showPlanDetail(key) {
  if (activePlan === key) {
    closePlanDetail();
    return;
  }

  const detail = document.getElementById('plan-detail');

  document.querySelectorAll('.plan-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.plan === key);
  });

  if (activePlan !== null) {
    // Panel already open — fade out, swap content, fade in
    detail.classList.remove('plan-detail-visible');
    detail.classList.add('plan-detail-hiding');
    detail.addEventListener('animationend', () => {
      detail.classList.remove('plan-detail-hiding');
      renderPlanDetail(key);
      detail.classList.add('plan-detail-visible');
    }, { once: true });
  } else {
    renderPlanDetail(key);
    detail.classList.remove('plan-detail-hiding');
    detail.classList.add('plan-detail-visible');
    setTimeout(() => detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  activePlan = key;
}

function closePlanDetail() {
  const detail = document.getElementById('plan-detail');
  detail.classList.remove('plan-detail-visible');
  detail.classList.add('plan-detail-hiding');
  detail.addEventListener('animationend', () => {
    detail.classList.remove('plan-detail-hiding');
  }, { once: true });
  document.querySelectorAll('.plan-chip').forEach(c => c.classList.remove('active'));
  activePlan = null;
}

function closePanel() {
  const panel = document.getElementById('card-details');
  if (window.__motion && !panel.classList.contains('hidden-panel')) {
    const { animate } = window.__motion;
    panelCloseAnim = animate(panel,
      { opacity: [1, 0], scale: [1, 0.92], y: [0, 6] },
      { duration: 0.18, easing: [0.4, 0, 1, 1] }
    );
    panelCloseAnim.finished.then(() => {
      panel.classList.add('hidden-panel');
      panel.style.opacity = '';
      panel.style.transform = '';
    }).catch(() => {});
  } else {
    panel.classList.add('hidden-panel');
  }
  if (activeCard) {
    document.getElementById('card-' + activeCard)?.classList.remove('active');
    activeCard = null;
  }
  document.querySelectorAll('.flow-path-step').forEach(s => {
    s.classList.remove('text-blue-600', 'font-semibold');
    const num = s.querySelector('.step-num');
    num.style.background = '';
    num.style.color = '';
    num.style.border = '';
  });
}
