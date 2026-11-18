/* Module 6 — Rajasthan Royals Acquisition Intelligence */
(function () {
  const A = App, D = A.D, C = A.C, X = D.rr.ext;
  const NEEDV = { High: 2, Moderate: 1, Covered: 0 };
  const plan = new Map();   // player key -> {row, price}
  let fDisc = 'all', fRoute = 'all', fOs = 'all';
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } } };

  // league percentile of rating, within discipline, among players with >= 150 pressure balls
  const pct = {};
  for (const role of ['bat', 'bowl']) { const v = D.players[role].filter(p => p.n_P >= 150).map(p => p.Rating).sort((a, b) => a - b); pct[role] = r => v.filter(x => x <= r).length / v.length; }
  // unified shortlist rows
  function rows() {
    const out = [];
    const add = (r, disc, need, prioSrc) => {
      const role = disc === 'Batting' ? 'bat' : 'bowl', p = A.P[role].get(r.player_id) || {};
      const pc = pct[role](r.Rating), nd = need || 'n/a', auction = (r.route_for_rr || p.route_for_rr) === 'auction';
      const active = (p.matches_2026 || 0) > 0;
      const cls = !active ? 'Low' : auction && NEEDV[nd] >= 1 && pc >= 0.7 ? 'High' : (auction && pc >= 0.5) || (!auction && NEEDV[nd] >= 1 && pc >= 0.7) ? 'Medium' : 'Low';
      out.push({ key: disc + r.player_id, discipline: disc, player: r.player, player_id: r.player_id, role: r.role_group, need: nd, Rating: r.Rating, pctile: pc, franchise: p.ipl_team_2026 || '—',
        status: p.status_2027 || r.status_2027, route: auction ? 'Auction' : 'Trade', overseas: !!p.overseas_for_ipl, nation: p.nation, evidence: p.evidence_tier, n_P: p.n_P, former_rr: !!p.former_rr,
        active, priority: cls, src: prioSrc, death_share: p.death_share });
    };
    D.rr.targets.filter(r => r.discipline === 'Bowling').forEach(r => add(r, 'Bowling', r.rr_need, r.priority));
    D.rr.bat_targets.forEach(r => add({ ...r, player_id: (D.players.bat.find(p => p.player === r.player) || {}).player_id }, 'Batting', r.rr_need, r.priority));
    D.rr.bat_trade.forEach(r => { const p = D.players.bat.find(x => x.player === r.player); if (p) add({ ...r, player_id: p.player_id, role_group: r.role_group, route_for_rr: 'trade only' }, 'Batting', (D.rr.needs_bat.find(n => n.role === r.role_group) || {}).need, 'trade'); });
    return out.filter(r => r.player_id);
  }

  A.register('rr', {
    title: 'Rajasthan Royals — Acquisition Intelligence', sub: 'From pressure ratings to IPL 2027 auction and trade decisions',
    render(root) {
      const R = X.rr;
      root.innerHTML = `
      <div class="ext" id="rr-ext" style="margin-bottom:14px"><b>Two kinds of information on this page.</b> Pressure ratings come only from the supplied ball-by-ball data. Squad, purse, retention and trade facts are external: ${X.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${A.esc(s.name.split(',')[0])}</a> (${s.published})`).join(' · ')}. No auction prices exist in either source, and none are invented.</div>
      <div class="kpis">
        <div class="kpi"><div><div class="v">₹${R.purse_cr} cr</div><div class="l">Purse remaining (external)</div></div></div>
        <div class="kpi"><div><div class="v">${R.slots}</div><div class="l">Open squad slots</div></div></div>
        <div class="kpi"><div><div class="v">${R.overseas_slots}</div><div class="l">Overseas slots</div></div></div>
        <div class="kpi"><div><div class="v">${R.squad_after_retention}</div><div class="l">Squad after retention</div></div></div>
        <div class="kpi"><div><div class="v">${R.traded_in.length} in · ${R.traded_out.length} out</div><div class="l">Trades: ${R.traded_in.join(', ')} ↔ ${R.traded_out.join(', ')}</div></div></div>
        <div class="kpi"><div><div class="v">${R.released.length}</div><div class="l">Released (incl. Hetmyer, Deshpande)</div></div></div>
      </div>
      <div class="grid g2" id="rr-squad">
        ${A.card('Current squad (2027, after retention)', '<div id="rrSquad" class="scroll"></div>', { foot: 'Pressure ratings by discipline; “usable” = at least 150 pressure balls. Pool rank = position among all rated players by rating.' })}
        ${A.card('Role-wise gap analysis', `${A.cv('rrGap', 'tall')}<div id="rrGapT" style="margin-top:8px"></div>`, { id: 'rr-gaps', foot: 'RR’s best usable player per role vs the league’s top-quartile rating in that role.' })}
      </div>
      ${A.card('Acquisition shortlist', `<div class="toolbar" style="box-shadow:none;padding:0 0 10px;margin:0">
          <label>Discipline ${A.seg('fDisc', [['all', 'All'], ['Bowling', 'Bowling'], ['Batting', 'Batting']], 'all')}</label>
          <label>Route ${A.seg('fRoute', [['all', 'All'], ['Auction', 'Auction'], ['Trade', 'Trade']], 'all')}</label>
          <label>Overseas ${A.seg('fOs', [['all', 'All'], ['no', 'Indian'], ['yes', 'Overseas']], 'all')}</label>
          <span class="note">Tick players to add them to the squad plan below.</span></div><div id="rrShort" class="scroll"></div>`,
        { id: 'rr-short', foot: 'Priority class: <b>High</b> = auction route, fills a High/Moderate RR need, rating in the league’s top 30% and active in 2026; <b>Medium</b> = auction with an above-median rating, or a trade target in the top 30% for a need role; <b>Low</b> = otherwise. Percentile among players with ≥ 150 pressure balls.' })}
      <div class="grid g2" style="margin-top:14px">
        ${A.card('Acquisition priority matrix', A.cv('rrMat', 'xtall'), { id: 'rr-matrix', foot: 'x = league percentile of pressure rating; y = how much RR needs that role; circle = auction, triangle = trade; size = pressure balls. Hover for details.' })}
        ${A.card('Squad constraint check: build a plan', '<div id="rrPlan"></div>', { id: 'rr-cons', foot: 'Prices are not in the data. Enter your own estimates (₹ crore) to test the plan against the purse; they are stored only in this browser.' })}
      </div>
      ${A.card('Final acquisition recommendations', '<div id="rrRecs"></div>', { id: 'rr-recs' })}`;
      A.onSeg('fDisc', v => { fDisc = v; this.drawShort(); });
      A.onSeg('fRoute', v => { fRoute = v; this.drawShort(); });
      A.onSeg('fOs', v => { fOs = v; this.drawShort(); });
      const saved = store.get('rrPlan') || {};
      this.all = rows();
      Object.entries(saved).forEach(([k, price]) => { const r = this.all.find(x => x.key === k); if (r) plan.set(k, { row: r, price }); });
      this.drawSquad(); this.drawGap(); this.drawShort(); this.drawMat(); this.drawPlan(); this.drawRecs();
    },
    drawSquad() {
      const sq = D.rr.squad.map(r => ({ ...r, nation: ((r.discipline === 'Batting' ? A.P.bat : A.P.bowl).get(r.player_id) || {}).nation }));
      A.table('rrSquad', [{ k: 'discipline', l: 'List' }, { k: 'player', l: 'Player' }, { k: 'role_group', l: 'Role' }, { k: 'n_P', l: 'P-balls', num: true, fmt: A.fi },
        { k: 'Rating', l: 'Rating', num: true, fmt: v => A.f(v), cls: v => A.cls(v) }, { k: 'pool_rank', l: 'Pool rank', num: true, fmt: A.fi },
        { k: 'evidence', l: 'Evidence', fmt: v => v.startsWith('usable') ? '<span class="pill good">usable</span>' : '<span class="pill grey">thin</span>' }],
        sq.filter(r => r.n_P >= 30), { sortKey: 'Rating', onRow: r => A.goto('explorer', '', `role=${r.discipline === 'Batting' ? 'bat' : 'bowl'}&player=${r.player_id}`) });
    },
    drawGap() {
      const g = [...D.rr.needs_bowl.filter(r => r.discipline === 'Bowling').map(r => ({ role: 'Bowling · ' + r.role_group, best: r.rr_best_usable_rating, q: r.league_top_quartile_rating, who: r.rr_best_player, need: r.need_level })),
        ...D.rr.needs_bat.map(r => ({ role: 'Batting · ' + r.role, best: r.rr_best, q: r.league_top_quartile, who: r.rr_best_player, need: r.need }))];
      A.chart('rrGap', { type: 'bar', data: { labels: g.map(r => r.role), datasets: [
        { label: 'RR best usable', data: g.map(r => r.best ?? null), backgroundColor: C.pink },
        { label: 'League top quartile', data: g.map(r => r.q), backgroundColor: '#b9b6d0' }] },
        options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { afterBody: c => `RR best: ${g[c[0].dataIndex].who} · need: ${g[c[0].dataIndex].need}` } } }, scales: { x: { title: { display: true, text: 'pressure rating (z units)' } }, y: { grid: { display: false } } } } });
      document.getElementById('rrGapT').innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:6px">${g.map(r => `<span class="pill ${r.need === 'High' ? 'bad' : r.need === 'Moderate' ? 'warn' : 'good'}">${r.role}: ${r.need}${r.best == null ? ' (no usable player)' : ''}</span>`).join('')}</div>`;
    },
    visible() { return this.all.filter(r => (fDisc === 'all' || r.discipline === fDisc) && (fRoute === 'all' || r.route === fRoute) && (fOs === 'all' || (fOs === 'yes') === r.overseas)); },
    drawShort() {
      const pr = { High: 0, Medium: 1, Low: 2 };
      const rs = this.visible().map(r => ({ ...r, prio: pr[r.priority] }));
      A.table('rrShort', [
        { k: 'key', l: 'Plan', sort: false, fmt: (v) => `<input type="checkbox" data-k="${v}" ${plan.has(v) ? 'checked' : ''}>` },
        { k: 'prio', l: 'Priority', fmt: (v, r) => `<span class="pill ${r.priority === 'High' ? 'pink' : r.priority === 'Medium' ? 'blue' : 'grey'}">${r.priority}</span>` },
        { k: 'player', l: 'Player', fmt: (v, r) => `<b>${A.esc(v)}</b>${r.former_rr ? ' <span class="pill warn">ex-RR</span>' : ''}` }, { k: 'discipline', l: 'List' }, { k: 'role', l: 'Role' },
        { k: 'need', l: 'RR need', fmt: v => `<span class="pill ${v === 'High' ? 'bad' : v === 'Moderate' ? 'warn' : 'good'}">${v}</span>` },
        { k: 'Rating', l: 'Rating', num: true, fmt: v => A.f(v) }, { k: 'pctile', l: 'League pct.', num: true, fmt: v => A.pct(v, 0) },
        { k: 'franchise', l: 'IPL 2026' }, { k: 'status', l: 'Availability (2027)', fmt: v => `<span class="small">${A.esc(v)}</span>` }, { k: 'route', l: 'Route' },
        { k: 'overseas', l: 'Overseas', fmt: v => v ? 'Yes' : 'No' }, { k: 'evidence', l: 'Evidence' }], rs, { sortKey: 'prio', desc: false });
      document.querySelectorAll('#rrShort input[type=checkbox]').forEach(cb => cb.onclick = e => { e.stopPropagation(); const k = cb.dataset.k; if (cb.checked) plan.set(k, { row: this.all.find(x => x.key === k), price: null }); else plan.delete(k); this.save(); this.drawPlan(); });
    },
    drawMat() {
      const shape = r => r.route === 'Auction' ? 'circle' : 'triangle', colr = { High: C.pink, Medium: C.blue, Low: '#a8a59c' };
      const ds = ['High', 'Medium', 'Low'].map(p => ({ label: p + ' priority', data: this.all.filter(r => r.priority === p).map(r => ({ x: 100 * r.pctile, y: NEEDV[r.need] ?? 0 + (r.discipline === 'Batting' ? -0.15 : 0.15), r })),
        backgroundColor: colr[p] + 'cc', borderColor: colr[p], pointStyle: this.all.filter(r => r.priority === p).map(shape), pointRadius: this.all.filter(r => r.priority === p).map(r => 4 + Math.sqrt(r.n_P || 0) / 4), pointHoverRadius: 10 }));
      ds.forEach(d => d.data.forEach((pt, i) => { pt.y = (NEEDV[pt.r.need] ?? 0) + (pt.r.discipline === 'Batting' ? -0.18 : 0.18) + ((i % 5) - 2) * 0.04; }));
      A.chart('rrMat', { type: 'scatter', data: { datasets: ds },
        options: { plugins: { tooltip: { callbacks: { label: c => { const r = c.raw.r; return [`${r.player} (${r.discipline}, ${r.role})`, `rating ${r.Rating.toFixed(2)} · ${Math.round(100 * r.pctile)}th pct · need ${r.need}`, `${r.route} · ${r.status}`]; } } } },
          scales: { x: { min: 0, max: 100, title: { display: true, text: 'league percentile of pressure rating' } },
            y: { min: -0.6, max: 2.6, ticks: { stepSize: 1, callback: v => ({ 0: 'Covered', 1: 'Moderate need', 2: 'High need' }[v] || '') }, title: { display: true, text: 'RR role need (batting below, bowling above each line)' } } } } });
    },
    save() { store.set('rrPlan', Object.fromEntries([...plan].map(([k, v]) => [k, v.price]))); },
    drawPlan() {
      const R = X.rr, items = [...plan.values()];
      const os = items.filter(i => i.row.overseas).length, priced = items.filter(i => i.price != null && i.price !== '');
      const spend = priced.reduce((a, i) => a + (+i.price || 0), 0);
      const warn = [];
      if (items.length > R.slots) warn.push(`${items.length} players exceed the ${R.slots} open slots`);
      if (os > R.overseas_slots) warn.push(`${os} overseas players exceed the ${R.overseas_slots} overseas slots`);
      if (priced.length && spend > R.purse_cr) warn.push(`estimated spend ₹${spend.toFixed(2)} cr exceeds the ₹${R.purse_cr} cr purse`);
      const roles = {}; items.forEach(i => { const k = `${i.row.discipline} · ${i.row.role}`; roles[k] = (roles[k] || 0) + 1; });
      document.getElementById('rrPlan').innerHTML = `
        <div class="tiles"><div class="tile"><div class="v">${items.length} / ${R.slots}</div><div class="l">slots used</div><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, 100 * items.length / R.slots)}%"></i></div></div>
          <div class="tile"><div class="v">${os} / ${R.overseas_slots}</div><div class="l">overseas slots used</div><div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, 100 * os / R.overseas_slots)}%"></i></div></div>
          <div class="tile"><div class="v">${priced.length ? '₹' + spend.toFixed(2) + ' cr' : '—'}</div><div class="l">your price estimates vs ₹${R.purse_cr} cr purse</div></div></div>
        ${warn.length ? `<div class="callout red" style="margin-top:8px">${warn.join('<br>')}</div>` : items.length ? '<div class="callout blue" style="margin-top:8px">Plan fits the slot and overseas limits.</div>' : '<p class="muted small">Tick players in the shortlist to build a plan.</p>'}
        <table class="t" style="margin-top:8px"><tbody>${items.map(i => `<tr><td><b>${A.esc(i.row.player)}</b><div class="tiny muted">${i.row.discipline} · ${i.row.role} · ${i.row.route}${i.row.overseas ? ' · overseas' : ''}</div></td>
          <td class="num"><input type="number" min="0" step="0.05" placeholder="₹ cr" value="${i.price ?? ''}" data-k="${i.row.key}" style="width:84px;padding:5px;border:1px solid #d8d6e4;border-radius:6px"></td>
          <td><span class="evlink" data-rm="${i.row.key}">remove</span></td></tr>`).join('')}</tbody></table>
        ${items.length ? `<div class="small muted" style="margin-top:6px">Roles covered: ${Object.entries(roles).map(([k, v]) => `${k} (${v})`).join(', ')}</div>` : ''}`;
      document.querySelectorAll('#rrPlan input[type=number]').forEach(inp => inp.onchange = () => { plan.get(inp.dataset.k).price = inp.value === '' ? null : +inp.value; this.save(); this.drawPlan(); });
      document.querySelectorAll('#rrPlan [data-rm]').forEach(b => b.onclick = () => { plan.delete(b.dataset.rm); this.save(); this.drawPlan(); this.drawShort(); });
    },
    drawRecs() {
      const g = (role, n) => (D.players[role].find(p => p.player === n) || {});
      const line = (role, n, why) => { const p = g(role, n); return `<li><b>${n}</b> <span class="muted small">(${p.role_group || ''}${p.nation ? ', ' + A.esc(p.nation) : ''}; rating ${A.f(p.Rating)}; ${A.esc(p.status_2027 || '')})</span> — ${why}</li>`; };
      const pat = g('bowl', 'Matheesha Pathirana');
      document.getElementById('rrRecs').innerHTML = `<div class="grid g4" style="margin:0">
        <div><h4 style="margin-top:0;color:${C.pink}">Priority auction targets</h4><ul class="small" style="padding-left:16px;line-height:1.55">
          ${line('bowl', 'Matheesha Pathirana', `the only strong death-overs profile in the pool (${A.pct(pat.death_share, 0)} of balls at the death); fills RR’s High death need`)}
          ${line('bowl', 'Adam Zampa', 'middle-overs wrist spin; ex-RR; near-eligible sample')}
          ${line('bowl', 'Avesh Khan', 'evidence-ranked bowler, Indian, so no overseas slot used; ex-RR')}
          ${line('bowl', 'Wanindu Hasaranga', 'middle-overs alternative; ex-RR; eligible, average rating')}</ul></div>
        <div><h4 style="margin-top:0;color:${C.pink}">Trade opportunities</h4><ul class="small" style="padding-left:16px;line-height:1.55">
          ${line('bowl', 'Kuldeep Yadav', 'top-rated bowler in the data; middle overs (now LSG)')}
          ${line('bowl', 'Krunal Pandya', 'bowling #2; middle overs (RCB)')}
          ${line('bowl', 'Axar Patel', 'bowling #5; middle overs (DC)')}
          ${line('bat', 'Heinrich Klaasen', 'middle-order gap; near-eligible (SRH)')}
          ${line('bat', 'Ashutosh Sharma', 'finisher gap; Indian; breakout place (DC)')}</ul></div>
        <div><h4 style="margin-top:0;color:${C.pink}">Under-recognised talent</h4><ul class="small" style="padding-left:16px;line-height:1.55">
          ${line('bat', 'Reeza Hendricks', 'batting #3 on T20I evidence; not in an IPL squad; no 2026 matches (risk)')}
          ${line('bowl', 'Mujeeb Ur Rahman', 'powerplay spin; possible auction entrant')}
          ${line('bat', 'Kyle Mayers', 'eligible top-order batter outside the IPL')}
          ${line('bat', 'Pathum Nissanka', 'batting #2; released by DC; needs an overseas slot')}</ul></div>
        <div><h4 style="margin-top:0;color:${C.pink}">Strategic rationale</h4><ul class="small" style="padding-left:16px;line-height:1.55">
          <li>Batting is covered: Jaiswal (#1) and Sooryavanshi (3rd-highest rating) lead the top order.</li>
          <li>The two High needs are bowling: death (no usable RR player) and middle overs (best usable −0.84).</li>
          <li>With 3 overseas slots, a death bowler plus a middle-overs spinner leave one, which Nissanka, Boult and Theekshana would compete for.</li>
          <li>Middle-order and finisher batting gaps have no reliable auction fix: trade.</li>
          <li>Ratings separate close candidates; price, fitness and fit remain the auction team’s call.</li></ul></div></div>`;
    }
  });
})();
