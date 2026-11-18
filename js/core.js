/* Core: router, formatting, chart theme + plugins, tables, player lookups. */
(function () {
  const D = window.DATA;
  const C = {
    navy: '#24215a', pink: '#d6336c', pinkL: 'rgba(214,51,108,.15)', blue: '#2a78d6', blueL: 'rgba(42,120,214,.15)',
    aqua: '#1baf7a', grey: '#a8a59c', ink: '#17152e', ink2: '#4c4a63', grid: '#ecebf2',
    tiers: ['#f6efc9', '#f7c58f', '#ef8a7c', '#c43a45'], tierInk: ['#5c4a00', '#6b3a00', '#5a1610', '#ffffff'],
    good: '#1a8a55', bad: '#c43a45', warn: '#c98500'
  };
  const TIERS = ['Ordinary', 'Elevated', 'High', 'Extreme'];
  const BANDS = ['Low', 'Medium', 'High'];
  const CELL_TIER = { 'Low|Low': 0, 'Low|Medium': 0, 'Low|High': 1, 'Medium|Low': 0, 'Medium|Medium': 1, 'Medium|High': 2, 'High|Low': 1, 'High|Medium': 2, 'High|High': 3 };

  // ---------- formatting
  const isNum = v => v !== null && v !== undefined && !Number.isNaN(+v) && v !== '';
  const f = (v, d = 2) => isNum(v) ? (+v).toFixed(d) : '—';
  const fi = v => isNum(v) ? Math.round(+v).toLocaleString('en-US') : '—';
  const pct = (v, d = 1) => isNum(v) ? (100 * v).toFixed(d) + '%' : '—';
  const sg = (v, d = 2) => isNum(v) ? (v >= 0 ? '+' : '') + (+v).toFixed(d) : '—';
  const x100 = (v, d = 3) => isNum(v) ? sg(100 * v, d) : '—';
  const cls = v => isNum(v) ? (v > 0 ? 'pos' : v < 0 ? 'neg' : '') : '';
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const initials = n => String(n).split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ---------- players
  const P = { bat: new Map(), bowl: new Map() };
  D.players.bat.forEach(p => P.bat.set(p.player_id, p));
  D.players.bowl.forEach(p => P.bowl.set(p.player_id, p));
  const AGG = {};
  for (const role of ['bat', 'bowl']) {
    const a = D.agg[role], ix = Object.fromEntries(a.cols.map((c, i) => [c, i])), m = new Map();
    a.rows.forEach(r => { const id = r[ix.player_id]; if (!m.has(id)) m.set(id, []); m.get(id).push(r); });
    AGG[role] = { ix, m };
  }
  function tierStats(role, pid, comp = 'all', season = 'all') {
    const { ix, m } = AGG[role]; const rows = m.get(pid) || [];
    const out = [0, 1, 2, 3].map(() => ({ n: 0, runs: 0, xr: 0, outs: 0, legal: 0, rs: 0 }));
    rows.forEach(r => {
      if (comp !== 'all' && r[ix.competition] !== (comp === 'IPL' ? 0 : 1)) return;
      if (season !== 'all' && r[ix.season] !== +season) return;
      const t = out[r[ix.tier]]; t.n += r[ix.n]; t.runs += r[ix.runs]; t.xr += r[ix.xr]; t.outs += r[ix.outs]; t.rs += r[ix.rs];
      t.legal += ix.legal !== undefined ? r[ix.legal] : r[ix.n];
    });
    return out;
  }
  function seasonStats(role, pid, comp = 'all') {
    const { ix, m } = AGG[role]; const rows = m.get(pid) || []; const S = {};
    rows.forEach(r => {
      if (comp !== 'all' && r[ix.competition] !== (comp === 'IPL' ? 0 : 1)) return;
      const s = r[ix.season], g = r[ix.tier] >= 2 ? 'P' : r[ix.tier] === 0 ? 'O' : null; if (!g) return;
      S[s] = S[s] || { P: { n: 0, runs: 0, xr: 0, legal: 0, outs: 0 }, O: { n: 0, runs: 0, xr: 0, legal: 0, outs: 0 } };
      const t = S[s][g]; t.n += r[ix.n]; t.runs += r[ix.runs]; t.xr += r[ix.xr]; t.outs += r[ix.outs]; t.legal += ix.legal !== undefined ? r[ix.legal] : r[ix.n];
    });
    return S;
  }
  // role metric: batting strike rate; bowling economy
  const metric = (role, t) => !t || !t.n ? null : role === 'bat' ? 100 * t.runs / t.n : 6 * t.runs / Math.max(t.legal, 1);
  const vsExp = (role, t) => !t || !t.n ? null : role === 'bat' ? 100 * (t.runs - t.xr) / t.n : -6 * (t.runs - t.xr) / Math.max(t.legal, 1);
  const metricName = role => role === 'bat' ? 'Strike rate' : 'Economy (runs/over)';
  const vsExpName = role => role === 'bat' ? 'Runs vs expected per 100 balls' : 'Runs saved per over vs expected';
  const sumT = ts => ts.reduce((a, t) => ({ n: a.n + t.n, runs: a.runs + t.runs, xr: a.xr + t.xr, outs: a.outs + t.outs, legal: a.legal + t.legal, rs: a.rs + t.rs }), { n: 0, runs: 0, xr: 0, outs: 0, legal: 0, rs: 0 });

  // ---------- chart theme + plugins
  Chart.defaults.font.family = '"Segoe UI", Inter, system-ui, sans-serif';
  Chart.defaults.font.size = 11.5;
  Chart.defaults.color = C.ink2;
  Chart.defaults.borderColor = C.grid;
  Chart.defaults.plugins.legend.labels.boxWidth = 12;
  Chart.defaults.plugins.legend.labels.boxHeight = 12;
  Chart.defaults.plugins.tooltip.backgroundColor = '#1b1846';
  Chart.defaults.plugins.tooltip.padding = 9;
  Chart.defaults.plugins.tooltip.cornerRadius = 8;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.elements.bar.borderRadius = 4;
  Chart.defaults.elements.line.borderWidth = 2;
  Chart.defaults.elements.point.radius = 3;

  // error bars: dataset.errorBars = [{x0,x1,y0,y1}] aligned with data
  Chart.register({
    id: 'errorBars',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      chart.data.datasets.forEach((ds, di) => {
        if (!ds.errorBars || chart.getDatasetMeta(di).hidden) return;
        const xs = chart.scales[ds.xAxisID || 'x'], ys = chart.scales[ds.yAxisID || 'y'];
        ctx.save(); ctx.strokeStyle = ds.errorColor || 'rgba(76,74,99,.45)'; ctx.lineWidth = 1.2;
        ds.errorBars.forEach(e => {
          if (!e) return;
          if (e.x0 !== undefined && e.y !== undefined) { const y = ys.getPixelForValue(e.y); ctx.beginPath(); ctx.moveTo(xs.getPixelForValue(e.x0), y); ctx.lineTo(xs.getPixelForValue(e.x1), y); ctx.stroke(); }
          if (e.y0 !== undefined && e.x !== undefined) { const x = xs.getPixelForValue(e.x); ctx.beginPath(); ctx.moveTo(x, ys.getPixelForValue(e.y0)); ctx.lineTo(x, ys.getPixelForValue(e.y1)); ctx.stroke(); }
        });
        ctx.restore();
      });
    }
  });
  // quadrant guides: options.plugins.quadrants = {x:0, y:0, labels:[tl,tr,bl,br]}
  Chart.register({
    id: 'quadrants',
    beforeDatasetsDraw(chart, _a, o) {
      if (!o || o.x === undefined) return;
      const { ctx, chartArea: a } = chart, xs = chart.scales.x, ys = chart.scales.y;
      const px = xs.getPixelForValue(o.x), py = ys.getPixelForValue(o.y);
      ctx.save(); ctx.strokeStyle = '#8a879f'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      if (px > a.left && px < a.right) { ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke(); }
      if (py > a.top && py < a.bottom) { ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke(); }
      ctx.setLineDash([]); ctx.font = 'italic 600 11px "Segoe UI", sans-serif'; ctx.fillStyle = 'rgba(76,74,99,.75)';
      const L = o.labels || [];
      ctx.textAlign = 'left'; ctx.fillText(L[0] || '', a.left + 6, a.top + 14); ctx.fillText(L[2] || '', a.left + 6, a.bottom - 6);
      ctx.textAlign = 'right'; ctx.fillText(L[1] || '', a.right - 6, a.top + 14); ctx.fillText(L[3] || '', a.right - 6, a.bottom - 6);
      ctx.restore();
    }
  });
  // value labels on bars: options.plugins.barLabels = {fmt: fn}
  Chart.register({
    id: 'barLabels',
    afterDatasetsDraw(chart, _a, o) {
      if (!o || !o.fmt) return;
      const { ctx } = chart; ctx.save(); ctx.font = '600 10.5px "Segoe UI", sans-serif'; ctx.fillStyle = C.ink2;
      const horiz = chart.options.indexAxis === 'y';
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di); if (meta.hidden) return;
        meta.data.forEach((el, i) => {
          const v = ds.data[i]; if (v === null || v === undefined) return;
          const t = o.fmt(v, i, di);
          if (horiz) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, el.x + 4, el.y); }
          else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(t, el.x, Math.min(el.y, el.base) - 3); }
        });
      });
      ctx.restore();
    }
  });

  const charts = {};
  function chart(id, cfg) {
    const el = document.getElementById(id); if (!el) return null;
    if (charts[id]) charts[id].destroy();
    let cv = el.querySelector('canvas'); if (!cv) { cv = document.createElement('canvas'); el.appendChild(cv); }
    charts[id] = new Chart(cv, cfg); return charts[id];
  }

  // ---------- HTML helpers
  const card = (title, body, opt = {}) => `<div class="card ${opt.cls || ''}" ${opt.id ? `id="${opt.id}"` : ''}><h3>${title}${opt.tag ? `<span class="tag">${opt.tag}</span>` : ''}</h3><div class="body">${body}</div>${opt.foot ? `<div class="foot">${opt.foot}</div>` : ''}</div>`;
  const cv = (id, cls = '') => `<div class="chart ${cls}" id="${id}"></div>`;
  const seg = (id, opts, on) => `<span class="seg" id="${id}">${opts.map(([v, l]) => `<button data-v="${v}" class="${v === on ? 'on' : ''}">${l}</button>`).join('')}</span>`;
  function onSeg(id, fn) {
    const el = document.getElementById(id); if (!el) return;
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.v); });
  }
  const tierPill = t => `<span class="pill" style="background:${C.tiers[t]};color:${C.tierInk[t]}">${TIERS[t]}</span>`;
  const evLink = (page, anchor, label = 'See evidence →', params = '') => `<span class="evlink" onclick="App.goto('${page}','${anchor}','${params}')">${label}</span>`;

  /* table(container, cols, rows, opts): cols = [{k, l, num, fmt, sort}], opts.onRow(row), opts.sortKey, opts.desc */
  function table(container, cols, rows, opts = {}) {
    const el = typeof container === 'string' ? document.getElementById(container) : container; if (!el) return;
    let key = opts.sortKey, desc = opts.desc ?? true;
    const draw = () => {
      let rs = rows.slice();
      if (key) rs.sort((a, b) => { const x = a[key], y = b[key]; if (x === y) return 0; if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1; return (x > y ? 1 : -1) * (desc ? -1 : 1); });
      el.innerHTML = `<table class="t"><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''} ${c.sort === false ? '' : 'sort'}" data-k="${c.k}">${c.l}${key === c.k ? (desc ? ' ▾' : ' ▴') : ''}</th>`).join('')}</tr></thead><tbody>${rs.map((r, i) => `<tr class="${opts.onRow ? 'click' : ''} ${opts.sel && opts.sel(r) ? 'sel' : ''}" data-i="${rows.indexOf(r)}">${cols.map(c => `<td class="${c.num ? 'num' : ''} ${c.cls ? c.cls(r[c.k], r) : ''}">${c.fmt ? c.fmt(r[c.k], r) : esc(r[c.k] ?? '—')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      el.querySelectorAll('th.sort').forEach(th => th.onclick = () => { const k = th.dataset.k; if (key === k) desc = !desc; else { key = k; desc = true; } draw(); });
      if (opts.onRow) el.querySelectorAll('tbody tr').forEach(tr => tr.onclick = () => opts.onRow(rows[+tr.dataset.i]));
    };
    draw();
  }

  // ---------- router
  const pages = {};
  const inited = new Set();
  function parseHash() {
    const h = location.hash.replace(/^#/, '') || 'overview';
    const [page, q] = h.split('?'); const params = Object.fromEntries(new URLSearchParams(q || ''));
    return { page: pages[page] ? page : 'overview', params };
  }
  function render() {
    const { page, params } = parseHash();
    document.querySelectorAll('.page').forEach(s => s.classList.toggle('active', s.id === 'page-' + page));
    document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    const pg = pages[page];
    document.getElementById('pageTitle').textContent = pg.title;
    document.getElementById('pageSub').textContent = pg.sub;
    const root = document.getElementById('page-' + page);
    if (!inited.has(page)) { pg.render(root); inited.add(page); }
    root.classList.remove('enter'); void root.offsetWidth; root.classList.add('enter');
    if (pg.show) pg.show(params);
    if (params.anchor) {
      setTimeout(() => { const t = document.getElementById(params.anchor); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); } }, 120);
    } else window.scrollTo(0, 0);
  }
  function goto(page, anchor = '', params = '') {
    const q = new URLSearchParams(params); if (anchor) q.set('anchor', anchor);
    location.hash = page + (q.toString() ? '?' + q.toString() : '');
  }

  window.App = {
    D, C, TIERS, BANDS, CELL_TIER, P, f, fi, pct, sg, x100, cls, esc, initials, tierStats, seasonStats, metric, vsExp, metricName, vsExpName, sumT,
    chart, card, cv, seg, onSeg, tierPill, evLink, table, pages, goto,
    register(name, def) { pages[name] = def; },
    start() {
      document.getElementById('sidefoot').innerHTML = `<span class="indep">Independent analysis for the SupeRR Selector competition. Not an official Rajasthan Royals product.</span>Data through ${D.kpi.data_through}<br>Built ${D.built}<br>Ratings: supplied data only.<br>RR squad info: public lists, 17 Nov 2026.`;
      window.addEventListener('hashchange', render); render();
    }
  };
})();
