/* Module 5 — Player Rankings & Selection */
(function () {
  const A = App, D = A.D, C = A.C;
  let role = 'bat', selId = null;
  const L = () => role === 'bat' ? 'Batting' : 'Bowling';

  A.register('rankings', {
    title: 'Player Rankings & Selection', sub: 'The approved F16 rating: Rating = 0.5·z(shrunk Level) + 0.5·z(shrunk Clutch), with uncertainty',
    render(root) {
      root.innerHTML = `
      <div class="toolbar"><label>List ${A.seg('rRole', [['bat', 'Batters'], ['bowl', 'Bowlers']], 'bat')}</label>
        <span class="note">Eligibility: batters ≥ ${D.kpi.bar_bat}, bowlers ≥ ${D.kpi.bar_bowl} High + Extreme balls, over ≥ 10 matches. Player profiles exist for many more players than are eligible to be ranked.</span></div>
      <div class="grid g21" id="r-top">
        ${A.card('Submitted top 10', '<div id="rTop"></div>', { tag: 'Unstop submission', foot: 'Ranks 1–8 on evidence; ranks 9–10 are breakout places for unknown Indian players (see below). Click a row for its rank distribution.' })}
        ${A.card('Bootstrap rank distribution', `<div id="rDistT" class="small muted" style="margin-bottom:4px"></div>${A.cv('rDist', 'tall')}`, { foot: 'Share of 1,000 match resamples in which the player took each rank.' })}
      </div>
      <div class="grid g21">
        ${A.card('Full leaderboard: every eligible player', `<input type="search" id="rSearch" placeholder="Search a player…" style="margin-bottom:8px;min-width:240px"><div id="rAll" class="scroll"></div>`, { id: 'r-all', foot: 'Sortable. Click a row to see the player in the Explorer.' })}
        ${A.card('Rank uncertainty: evidence top 15', A.cv('rUnc', 'xtall'), { id: 'r-unc', foot: 'Dot = rank; bar = 90% bootstrap rank interval.' })}
      </div>
      <div class="grid g2" id="r-stab">
        ${A.card('Ranking stability: evidence top 10', A.cv('rStab', 'tall'), { foot: 'Settings survived (of 10 alternatives) and the largest rank change when one match is removed.' })}
        ${A.card('Official vs frozen-rule list', '<div id="rRule"></div>', { foot: 'The eligibility bar was amended to the runs-channel κ after the frozen-rule ranking was inspected (disclosed). Batting is unchanged.' })}
      </div>
      <div class="grid g2" id="r-near">
        ${A.card('Near-miss players', '<div id="rNear"></div>', { foot: 'Strong numbers but below the sample bar. Shrinkage already discounts them; they are not ranked officially.' })}
        ${A.card('Reserves', '<div id="rRes"></div>', { foot: 'Use if a name is missing from the Unstop dropdown.' })}
      </div>
      <div id="r-breakout">
        <div class="grid g2">
          ${A.card('Breakout places: unknown Indian players', '<div id="rBo"></div>', { tag: 'ranks 9–10', foot: '<b>Why:</b> no unknown Indian (no India T20I cap in 2022–26, fewer than 40 IPL matches) reaches the sample bar, because they play only IPL. The places reward strength of evidence rather than volume. This is a disclosed fairness policy, not a pure performance ranking.' })}
          ${A.card('The access gap and how stable the picks are', '<div id="rBoFair"></div><h4>Picks under other settings</h4><div id="rBoRob" class="scroll s300"></div>')}
        </div>
      </div>`;
      A.onSeg('rRole', v => { role = v; selId = null; this.draw(); });
      document.getElementById('rSearch').oninput = () => this.drawAll();
    },
    show(p) { if (p.role && p.role !== role) { role = p.role; document.querySelectorAll('#rRole button').forEach(b => b.classList.toggle('on', b.dataset.v === role)); } this.draw(); },
    draw() {
      const fr = D.final.filter(r => r.list === L());
      const top = fr.filter(r => r.submit === 'yes').sort((a, b) => a.rank - b.rank).map(r => ({ ...(A.P[role].get(r.player_id) || {}), ...r, Level_hat: (A.P[role].get(r.player_id) || {}).Level_hat }));
      if (!selId) selId = top[0].player_id;
      A.table('rTop', [
        { k: 'rank', l: '#', num: true }, { k: 'player', l: 'Player', fmt: (v, r) => `<b>${A.esc(v)}</b>${r.place.startsWith('breakout') ? ' <span class="pill pink">breakout</span>' : ''}` },
        { k: 'ipl_team_2026', l: 'Franchise', fmt: v => v || '—' }, { k: 'rating', l: 'Rating', num: true, fmt: v => A.f(v) },
        { k: 'Level_hat', l: 'Level', num: true, fmt: v => A.x100(v) }, { k: 'Clutch_hat', l: 'Clutch', num: true, fmt: v => A.x100(v) },
        { k: 'n_P', l: 'P-balls', num: true, fmt: A.fi }, { k: 'P_matches', l: 'Matches', num: true, fmt: A.fi },
        { k: 'top10_prob', l: 'P(top 10)', num: true, fmt: (v, r) => r.place.startsWith('breakout') ? `<span class="muted">P(>avg) ${A.f(r.p_above_average)}</span>` : A.f(v) },
        { k: 'rank_interval_90', l: '90% rank', fmt: v => v || '—' }, { k: 'evidence_tier', l: 'Evidence', fmt: v => v || '—' }], top,
        { sortKey: 'rank', desc: false, onRow: r => { selId = r.player_id; this.drawDist(); this.draw(); }, sel: r => r.player_id === selId });
      this.drawDist(); this.drawAll();
      // uncertainty
      const ev = D.players[role].filter(p => p.eligible && p.rank <= 15).sort((a, b) => a.rank - b.rank);
      A.chart('rUnc', { type: 'scatter', data: { datasets: [{ data: ev.map((p, i) => ({ x: p.rank, y: i })), backgroundColor: ev.map(p => p.rank <= 10 ? C.pink : '#9a97ad'), pointRadius: 5,
        errorBars: ev.map((p, i) => ({ x0: p.rank_lo90, x1: p.rank_hi90, y: i })), errorColor: 'rgba(36,33,90,.5)' }] },
        options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${ev[c.dataIndex].player}: rank ${ev[c.dataIndex].rank}, 90% ${Math.round(ev[c.dataIndex].rank_lo90)}–${Math.ceil(ev[c.dataIndex].rank_hi90)}, P(top 10) ${ev[c.dataIndex].top10_prob.toFixed(2)}` } } },
          scales: { y: { reverse: true, min: -0.5, max: ev.length - 0.5, afterBuildTicks: ax => { ax.ticks = ev.map((_, i) => ({ value: i })); }, ticks: { autoSkip: false, callback: v => ev[v] ? `${ev[v].rank}. ${ev[v].player}` : '' }, grid: { display: false } }, x: { min: 0, suggestedMax: Math.ceil(Math.max(...ev.map(p => p.rank_hi90))) + 1, title: { display: true, text: 'rank (evidence ranking)' } } } } });
      // stability
      const t10 = ev.filter(p => p.rank <= 10);
      A.chart('rStab', { type: 'bar', data: { labels: t10.map(p => `${p.rank}. ${p.player}`), datasets: [
        { label: 'Settings survived (of 10)', data: t10.map(p => p.sens_survival), backgroundColor: C.blue },
        { label: 'Max rank change, one match dropped', data: t10.map(p => p.jackknife_max_rank_change), backgroundColor: C.pink }] },
        options: { indexAxis: 'y', plugins: { barLabels: { fmt: v => v } }, scales: { x: { min: 0, max: 11 }, y: { grid: { display: false } } } } });
      // rule comparison
      A.table('rRule', [{ k: 'rank', l: '#', num: true }, { k: 'official_amended_rule', l: 'Official (amended eligibility)' }, { k: 'frozen_rule', l: 'Frozen rule', fmt: (v, r) => v === r.official_amended_rule ? `<span class="muted">${A.esc(v)}</span>` : `<b>${A.esc(v)}</b>` }],
        D.rule_comparison.filter(r => r.discipline === L()), { sortKey: 'rank', desc: false });
      // near-miss
      if (role === 'bat') {
        const bs = D.bar_sens_bat, rules = [...new Set(bs.map(r => r.rule))];
        const rows = Array.from({ length: 10 }, (_, i) => Object.fromEntries([['rank', i + 1], ...rules.map(ru => [ru, (bs.find(r => r.rule === ru && r.rank === i + 1) || {}).player])]));
        A.table('rNear', [{ k: 'rank', l: '#', num: true }, ...rules.map(ru => ({ k: ru, l: ru.replace(' (runs-channel kappa)', ''), fmt: (v, r) => rules.indexOf(ru) && !rows.some(x => x[rules[0]] === v) ? `<b style="color:${C.pink}">${A.esc(v)}</b>` : A.esc(v) }))], rows, { sortKey: 'rank', desc: false });
        document.getElementById('rNear').insertAdjacentHTML('afterbegin', '<p class="small muted" style="margin-top:0">Batting top 10 recomputed at 90% and 80% of the 254-ball bar (pink = would enter). Karthik has not played since 2024; Tripathi did not play in 2026.</p>');
      } else {
        const nm = D.players.bowl.filter(p => p.evidence_tier === 'Near-eligible').sort((a, b) => b.Rating - a.Rating).slice(0, 10);
        A.table('rNear', [{ k: 'player', l: 'Player' }, { k: 'n_P', l: 'P-balls', num: true }, { k: 'Rating', l: 'Rating', num: true, fmt: v => A.f(v) }, { k: 'pool_rank_by_rating', l: 'Would rank', num: true }, { k: 'status_2027', l: '2027 status', fmt: v => `<span class="small">${A.esc(v)}</span>` }], nm, { sortKey: 'Rating' });
      }
      A.table('rRes', [{ k: 'rank', l: '#', num: true }, { k: 'player', l: 'Player' }, { k: 'place', l: 'Note' }, { k: 'rating', l: 'Rating', num: true, fmt: v => A.f(v) }, { k: 'top10_prob', l: 'P(top 10)', num: true, fmt: v => A.f(v) }],
        fr.filter(r => r.submit === 'reserve'), { sortKey: 'rank', desc: false });
      // breakout
      const bo = D.breakout.filter(r => r.discipline === L() && r.breakout_order > 0 && r.breakout_order <= 2);
      document.getElementById('rBo').innerHTML = bo.map(r => `
        <div class="callout" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px">${r.breakout_order + 8}. ${A.esc(r.player)}</b><span class="pill blue">P(above average) ${A.f(r.p_above_average)}</span></div>
          <div class="small" style="margin-top:4px">${r.role_group} · ${A.esc(r.franchise_history_2022_26)} · ${A.esc(r.status_2027)}</div>
          <div class="tiles" style="margin-top:8px"><div class="tile"><div class="v">${A.f(r.Rating)}</div><div class="l">pressure rating (would rank ~${r.would_rank_by_rating} among eligible)</div></div>
          <div class="tile"><div class="v">${r.n_P}</div><div class="l">pressure balls over ${r.P_matches} matches</div></div>
          <div class="tile"><div class="v">${r.ipl_matches_2022_26}</div><div class="l">IPL matches 2022–26 · ${r.matches_2026} in 2026</div></div></div></div>`).join('') +
        `<h4>Next in line</h4>` + D.breakout.filter(r => r.discipline === L() && r.breakout_order > 2).slice(0, 3).map(r => `<div class="small">${r.breakout_order}. ${A.esc(r.player)} — rating ${A.f(r.Rating)}, P(above avg) ${A.f(r.p_above_average)}, ${A.esc(r.status_2027)}</div>`).join('');
      A.table('rBoFair', [{ k: 'group', l: 'Group' }, { k: 'share_eligible', l: 'Reach the bar', num: true, fmt: v => A.pct(v) }, { k: 'median_pressure_balls', l: 'Median P-balls', num: true, fmt: A.fi }, { k: 'in_evidence_top10', l: 'In top 10', num: true }],
        D.breakout_fair.filter(r => r.discipline === L()), {});
      A.table('rBoRob', [{ k: 'gate', l: 'Gate', num: true, fmt: v => A.f(v, 1) }, { k: 'min_pressure_balls', l: 'Min balls', num: true }, { k: 'picks', l: 'Two picks' }], D.breakout_rob.filter(r => r.discipline === L()), {});
    },
    drawDist() {
      const rows = D.rankdist.filter(r => r.discipline === L() && r.player_id === selId);
      const p = A.P[role].get(selId);
      const t = document.getElementById('rDistT');
      if (!rows.length) { t.textContent = `${p ? p.player : 'This player'} is a breakout pick: not eligible, so no bootstrap rank exists. See the breakout section.`; A.chart('rDist', { type: 'bar', data: { labels: [], datasets: [] } }); return; }
      t.innerHTML = `<b>${A.esc(p.player)}</b> · rank ${p.rank} · P(top 10) ${A.f(p.top10_prob)} · 90% interval ${Math.round(p.rank_lo90)}–${Math.ceil(p.rank_hi90)}`;
      const mx = Math.max(...rows.map(r => r.boot_rank), 20), lab = Array.from({ length: mx }, (_, i) => i + 1);
      A.chart('rDist', { type: 'bar', data: { labels: lab, datasets: [{ data: lab.map(k => 100 * ((rows.find(r => r.boot_rank === k) || {}).share || 0)), backgroundColor: lab.map(k => k <= 10 ? C.pink : '#b9b6d0') }] },
        options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `rank ${c.label}: ${c.parsed.y.toFixed(1)}% of resamples` } } }, scales: { x: { title: { display: true, text: 'bootstrap rank (pink = top 10)' }, grid: { display: false } }, y: { title: { display: true, text: '% of resamples' } } } } });
    },
    drawAll() {
      const q = (document.getElementById('rSearch').value || '').toLowerCase();
      const el = D.players[role].filter(p => p.eligible && p.player.toLowerCase().includes(q));
      A.table('rAll', [{ k: 'rank', l: '#', num: true }, { k: 'player', l: 'Player' }, { k: 'role_group', l: 'Role' }, { k: 'ipl_team_2026', l: 'Franchise', fmt: v => v || '—' },
        { k: 'Rating', l: 'Rating', num: true, fmt: v => A.f(v) }, { k: 'Level_hat', l: 'Level', num: true, fmt: v => A.x100(v), cls: v => A.cls(v) }, { k: 'Clutch_hat', l: 'Clutch', num: true, fmt: v => A.x100(v), cls: v => A.cls(v) },
        { k: 'n_P', l: 'P-balls', num: true, fmt: A.fi }, { k: 'P_matches', l: 'Matches', num: true }, { k: 'top10_prob', l: 'P(top 10)', num: true, fmt: v => A.f(v) },
        { k: 'rank_lo90', l: '90% rank', fmt: (v, r) => `${Math.round(v)}–${Math.ceil(r.rank_hi90)}` }, { k: 'response_type', l: 'Type' }], el,
        { sortKey: 'rank', desc: false, onRow: r => A.goto('explorer', '', `role=${role}&player=${r.player_id}`) });
    }
  });
})();
