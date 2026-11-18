/* Module 2 — Pressure Intelligence */
(function () {
  const A = App, D = A.D, C = A.C;
  const status = s => ({ M: '<span class="pill good">Measured</span>', P: '<span class="pill warn">Partly observable</span>', X: '<span class="pill grey">Excluded by design</span>', N: '<span class="pill bad">Not observable</span>' }[s]);
  const DRIVERS = {
    'Contextual — does the match matter? (Consequence)': [
      ['Tournament stakes', 'IPL: playoff-probability swing from 4,000 simulations of the remaining fixtures', 'M'],
      ['Stage of tournament', 'Knockouts fixed at 1.5–2.0 (Qualifier 1 < Eliminator/Q2 < Final)', 'M'],
      ['Timing in the season', 'Captured by the playoff swing: late games split into must-win and dead', 'M'],
      ['Prestige of the event', 'Multi-team finals 2.0, Super 4 1.25; bilateral series state (dead 0.6 → decider 1.5)', 'P'],
      ['Personal stakes', 'Contracts, selection: not in the data', 'N']],
    'Situational — is the contest open and close? (Uncertainty)': [
      ['Closeness of the contest', 'Leverage Index from the win-probability recursion (the central driver)', 'M'],
      ['Scoring demand', 'Required rate inside the next-ball model', 'M'],
      ['Wickets in hand', 'State variable in the model', 'M'],
      ['Balls remaining', 'State variable; recursion over balls left', 'M'],
      ['Phase of the innings', 'Through balls left and leverage', 'M'],
      ['Innings context', 'Separate first-innings and chase engines', 'M']],
    'Personal — is it on this player? (Accountability)': [
      ['Irreplaceability', 'Last recognised batter; bowler’s final over of quota; overs 19–20 live → +1 tier', 'M'],
      ['Crisis on arrival', 'New batter (< 6 balls) with ≥ 2 wickets in the last 18 balls → +1 tier', 'M'],
      ['Team dependence', 'Tail-ender beside a set partner → −1 tier', 'P'],
      ['Self-created deficit', 'Own dot streak / balls since boundary: excluded to avoid circularity', 'X'],
      ['Expectation', 'Handled through each player’s own baseline (Clutch)', 'P'],
      ['Scrutiny', 'Crowd, media: not in the data', 'N']]
  };
  const REJECTED = [['Pitch and conditions', 'Makes runs harder without changing consequence, uncertainty or accountability → difficulty'],
    ['Opponent strength', 'Difficulty: handled in the expectation (prior opponent quality), not the pressure index'],
    ['Being new at the crease', 'An adjustment problem; counts only with a crisis on arrival'],
    ['Fatigue and workload', 'Physical condition, unrelated to consequences'],
    ['Winning or losing', 'The outcome after the pressure, never a cause']];
  const QMAP = { Batting: { 'own crisis': 'Batting crisis', 'mutual': 'Mutual pressure', 'other crisis': 'Bowling crisis', 'neutral': 'Neutral' },
                 Bowling: { 'own crisis': 'Bowling crisis', 'mutual': 'Mutual pressure', 'other crisis': 'Batting crisis', 'neutral': 'Neutral' } };
  let m3metric = 'dismissal', m3sel = 'High|High', q2sel = 'Mutual pressure', q2disc = 'Batting';

  A.register('pressure', {
    title: 'Pressure Intelligence', sub: 'How pressure is defined, identified and classified — and evidence that it is pressure, not difficulty',
    render(root) {
      const sh = D.shift;
      root.innerHTML = `
      <div class="grid g2" id="p-def">
        ${A.card('Definition: three root conditions must all be present', `
          <p class="lead">Pressure is the mental weight a player feels when they must perform in a moment whose outcome <b>matters</b>, is <b>still undecided</b>, and is seen as <b>depending on them</b>.</p>
          <table class="t"><thead><tr><th>Root condition</th><th>The question the player feels</th><th>Segment</th><th>Measured as</th></tr></thead><tbody>
            <tr><td><b>Consequence</b></td><td>Is there something to lose?</td><td>Contextual</td><td>Stakes multiplier C (per team, per match)</td></tr>
            <tr><td><b>Uncertainty</b></td><td>Is it still undecided?</td><td>Situational</td><td>Leverage Index (every ball)</td></tr>
            <tr><td><b>Accountability</b></td><td>Is it on me?</td><td>Personal</td><td>±1 tier shift (by player and role)</td></tr></tbody></table>
          <p class="small muted">Pressure index P = Leverage × Stakes, banded at the 50th / 75th / 90th percentiles of live balls into Ordinary, Elevated, High and Extreme, then shifted ±1 tier for accountability.</p>`)}
        ${A.card('Pressure is not difficulty', `
          <table class="t"><thead><tr><th>Concept</th><th>What it is</th><th>How the model treats it</th></tr></thead><tbody>
            <tr><td><b>Pressure</b></td><td>A result that matters, still open, resting on the player</td><td>The pressure index (who faced it, when)</td></tr>
            <tr><td><b>Difficulty</b></td><td>A seaming pitch, a great bowler, a big required rate</td><td>Inside the <i>expectation</i>: an average player in the same state against the same opponent</td></tr>
            <tr><td><b>Nerves</b></td><td>The body’s reaction to pressure</td><td>Not measured; inferred only through performance</td></tr>
            <tr><td><b>Choking</b></td><td>Performing worse than one’s own skill predicts</td><td>Clutch &lt; 0, judged within season</td></tr>
            <tr><td><b>Slump</b></td><td>A long run of poor form with no trigger</td><td>Cancelled by within-season comparison</td></tr></tbody></table>
          <div class="callout" style="margin-top:10px">A required rate of 14 makes slogging <i>expected</i>; the model rewards only beating what an average player does in that same state.</div>`)}
      </div>
      <div class="grid g3" id="p-drivers">
        ${Object.entries(DRIVERS).map(([h, rows]) => A.card(h.split(' — ')[0] + ' drivers', `<p class="small muted" style="margin-top:0">${h.split(' — ')[1]}</p><table class="t"><tbody>${rows.map(r => `<tr><td><b>${r[0]}</b><div class="tiny muted">${r[1]}</div></td><td>${status(r[2])}</td></tr>`).join('')}</tbody></table>`)).join('')}
      </div>
      <div class="grid g12">
        ${A.card('Candidates rejected as drivers', `<table class="t"><tbody>${REJECTED.map(r => `<tr><td><b>${r[0]}</b></td><td class="small">${r[1]}</td></tr>`).join('')}</tbody></table>`)}
        ${A.card('Stakes and accountability as measured', `<div class="twocol"><div><h4 style="margin-top:0">Stakes multiplier by match context</h4><div id="pStakes" class="scroll s300"></div></div>
          <div><h4 style="margin-top:0">Accountability shifts (share of balls)</h4><div class="tiles">
          <div class="tile"><div class="v">${A.pct(sh.bat.crisis_on_arrival)}</div><div class="l">Batter: crisis on arrival (+1)</div></div>
          <div class="tile"><div class="v">${A.pct(sh.bat.last_recognised)}</div><div class="l">Batter: last recognised batter (+1)</div></div>
          <div class="tile"><div class="v">${A.pct(sh.bat.tail_beside_set_partner)}</div><div class="l">Batter: tail beside a set partner (−1)</div></div>
          <div class="tile"><div class="v">${A.pct(sh.bowl.final_over_of_quota)}</div><div class="l">Bowler: final over of quota (+1)</div></div>
          <div class="tile"><div class="v">${A.pct(sh.bowl.overs_19_20_live)}</div><div class="l">Bowler: overs 19–20 of a live game (+1)</div></div>
          <div class="tile"><div class="v">${A.f(sh.ipl_importance_mean)}</div><div class="l">Mean IPL playoff swing; ${A.pct(sh.ipl_dead_share)} of team-matches dead</div></div></div></div></div>`)}
      </div>
      <div class="grid g21" id="p-m3">
        ${A.card('Interactive 3×3 matrix: Contextual × Situational pressure', `
          <div class="toolbar" style="box-shadow:none;padding:0 0 10px;margin:0"><label>Colour shows tier · value shows ${A.seg('m3m', [['dismissal', 'Dismissal %'], ['rpb', 'Runs / ball'], ['boundary', 'Boundary %'], ['dot', 'Dot %'], ['balls', 'Balls'], ['li', 'Mean leverage']], 'dismissal')}</label></div>
          <div id="m3grid"></div>
          <div class="legend">${A.TIERS.map((t, i) => `<span><i style="background:${C.tiers[i]}"></i>${t}</span>`).join('')}<span class="muted">Rows: stakes band (dead/low-importance · regular · knockout or must-win). Columns: leverage band (below 50th · 50th–85th · above 85th percentile).</span></div>`, { tag: 'live balls faced' })}
        ${A.card('Cell detail', '<div id="m3detail"></div>')}
      </div>
      <div class="grid g21" id="p-q2">
        ${A.card('Interactive 2×2: who carries the pressure?', `
          <p class="lead">Each ball gets a quadrant from the batter’s tier and the bowler’s tier (High or Extreme = “carries pressure”). The 3×3 says <i>how much</i> pressure a moment holds; the 2×2 says <i>who</i> carries it.</p>
          <div id="q2grid"></div>`, { tag: 'league-wide, balls faced' })}
        ${A.card('Who performs best in this quadrant', `<div style="margin-bottom:8px">${A.seg('q2d', [['Batting', 'Batters'], ['Bowling', 'Bowlers']], 'Batting')}</div><div id="q2detail"></div>`, { foot: 'Shrunk performance vs expected (×100), players with ≥ 40 balls in the quadrant.' })}
      </div>
      <div id="p-valid">
        <div class="grid g4">${[['dismissal rate', 'batting (balls faced)', 'Dismissal rate'], ['dot-ball rate', 'batting (balls faced)', 'Dot-ball rate'], ['boundary rate', 'batting (balls faced)', 'Boundary rate'], ['wide/no-ball rate', 'bowling (all balls)', 'Wides + no-balls']]
          .map((m, i) => A.card(m[2] + ' by tier', A.cv('pv' + i, 'short'), { foot: `Cochran–Armitage trend z = ${A.f(D.tier_behaviour.find(r => r.metric === m[0] && r.role === m[1]).trend_z, 1)}` })).join('')}</div>
        <div class="grid g3">
          ${A.card('Leverage distribution (live balls)', A.cv('pvLi'), { foot: 'LI = 1 is an average ball; a long right tail of decisive moments.' })}
          ${A.card('The closeness gate: leverage vs win probability', A.cv('pvGate'), { foot: `Mean leverage ${A.f(D.kpi.li_balanced)} in balanced states vs ${A.f(D.kpi.li_decided)} when WP &lt; 5% or &gt; 95% (${A.f(D.kpi.li_dead)} in dead chases).` })}
          ${A.card('Decided-game exclusion & index comparison', `<div class="tiles" style="margin-bottom:10px"><div class="tile"><div class="v">${A.pct(D.decided.share)}</div><div class="l">of deliveries are in decided games (WP outside 2–98% or a dead chase) and are excluded</div></div></div><div id="pvC2"></div>`, { foot: 'Simpler indices rank lost causes as maximum pressure; ours keeps them out.' })}
        </div>
      </div>`;

      A.table('pStakes', [{ k: 'label', l: 'Context' }, { k: 'mean', l: 'Raw C', num: true, fmt: v => A.f(v) }, { k: 'size', l: 'Team-matches', num: true }],
        Object.entries(sh.context_labels).map(([label, v]) => ({ label, ...v })), { sortKey: 'mean' });
      A.onSeg('m3m', v => { m3metric = v; this.drawM3(); });
      A.onSeg('q2d', v => { q2disc = v; this.drawQ2(); });
      this.drawM3(); this.drawQ2();
      // validation charts
      const metrics = [['dismissal rate', 'batting (balls faced)'], ['dot-ball rate', 'batting (balls faced)'], ['boundary rate', 'batting (balls faced)'], ['wide/no-ball rate', 'bowling (all balls)']];
      metrics.forEach((m, i) => {
        const r = D.tier_behaviour.find(x => x.metric === m[0] && x.role === m[1]);
        A.chart('pv' + i, { type: 'bar', data: { labels: A.TIERS, datasets: [{ data: A.TIERS.map(t => 100 * r[t]), backgroundColor: C.tiers, borderColor: ['#d9cf9c', ...C.tiers.slice(1)], borderWidth: 1 }] },
          options: { plugins: { legend: { display: false }, barLabels: { fmt: v => v.toFixed(1) + '%' } }, scales: { y: { beginAtZero: false, grace: '15%', ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } } } });
      });
      A.chart('pvLi', { type: 'bar', data: { labels: D.li_hist.labels, datasets: [{ data: D.li_hist.counts, backgroundColor: C.blue }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'Leverage Index' }, grid: { display: false } }, y: { title: { display: true, text: 'balls' } } } } });
      A.chart('pvGate', { type: 'line', data: { labels: D.li_by_wp.x.map(x => (100 * x).toFixed(0) + '%'), datasets: [
        { label: 'Mean leverage', data: D.li_by_wp.mean, borderColor: C.blue, backgroundColor: C.blue },
        { label: '90th percentile', data: D.li_by_wp.p90, borderColor: C.pink, backgroundColor: C.pink }] },
        options: { scales: { x: { title: { display: true, text: 'Pre-ball win probability of the batting side' } }, y: { title: { display: true, text: 'Leverage Index' } } } } });
      const c2 = D.check2.filter(r => r.scope === 'live balls only');
      A.table('pvC2', [{ k: 'index', l: 'Index', fmt: v => v.split(' (')[0] }, { k: 'mean_abs_rho', l: 'Trend |ρ|', num: true, fmt: v => A.f(v) },
        { k: 'share_top_decile_decided', l: 'Top decile in decided games', num: true, fmt: v => A.pct(v, 0) }], c2, {});
    },
    show(p) { if (p.cell && p.cell !== m3sel) { m3sel = p.cell; this.drawM3(); } },
    drawM3() {
      const fmtV = { dismissal: v => A.pct(v), rpb: v => A.f(v), boundary: v => A.pct(v), dot: v => A.pct(v), balls: v => A.fi(v), li: v => A.f(v) };
      let h = '<div class="m3"><div></div>' + A.BANDS.map(s => `<div class="ax">${s}<br><span class="tiny muted">situation</span></div>`).join('');
      [...A.BANDS].reverse().forEach(c => {
        h += `<div class="ax">${c}<br>stakes</div>`;
        A.BANDS.forEach(s => {
          const m = D.matrix3.find(x => x.cband === c && x.sband === s), t = A.CELL_TIER[c + '|' + s], k = c + '|' + s;
          h += `<div class="cell t${t} ${k === m3sel ? 'on' : ''}" data-k="${k}"><div class="tn">${A.TIERS[t]}</div><div class="tv">${fmtV[m3metric](m[m3metric])}</div><div class="tb">${A.fi(m.balls)} balls</div></div>`;
        });
      });
      const g = document.getElementById('m3grid'); g.innerHTML = h + '</div>';
      g.querySelectorAll('.cell').forEach(el => el.onclick = () => { m3sel = el.dataset.k; this.drawM3(); });
      const [c, s] = m3sel.split('|'), m = D.matrix3.find(x => x.cband === c && x.sband === s), t = A.CELL_TIER[m3sel];
      const tot = D.matrix3.reduce((a, x) => a + x.balls, 0);
      const plist = arr => arr.length ? `<table class="t"><tbody>${arr.map(p => `<tr><td>${A.esc(p.player)}</td><td class="num ${A.cls(p.value)}">${A.sg(p.value, 3)}</td><td class="num muted">${p.balls} b</td></tr>`).join('')}</tbody></table>` : '<p class="muted small">No player with ≥ 40 balls in this cell.</p>';
      document.getElementById('m3detail').innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">${A.tierPill(t)}<b>${c} stakes × ${s} situation</b></div>
        <div class="tiles"><div class="tile"><div class="v">${A.fi(m.balls)}</div><div class="l">balls faced (${A.pct(m.balls / tot)} of live)</div></div>
          <div class="tile"><div class="v">${A.pct(m.dismissal)}</div><div class="l">dismissal rate</div></div>
          <div class="tile"><div class="v">${A.f(m.rpb)}</div><div class="l">runs per ball</div></div>
          <div class="tile"><div class="v">${A.pct(m.boundary)}</div><div class="l">boundary rate</div></div>
          <div class="tile"><div class="v">${A.pct(m.dot)}</div><div class="l">dot-ball rate</div></div>
          <div class="tile"><div class="v">${A.pct(m.extras)}</div><div class="l">wides / no-balls</div></div></div>
        <h4>Match examples (most balls in this cell)</h4><ul class="small" style="margin:0;padding-left:18px">${m.examples.map(e => `<li>${A.esc(e.match)} — ${e.balls} balls</li>`).join('')}</ul>
        <div class="twocol"><div><h4>Best batters here</h4>${plist(m.top_bat)}</div><div><h4>Best bowlers here</h4>${plist(m.top_bowl)}</div></div>
        <p class="tiny muted">Player values: shrunk performance vs expected ×100 in this cell.</p>`;
    },
    drawQ2() {
      const q = l => D.quad2.find(x => x.label === l);
      const box = l => { const x = q(l); return `<div class="qc ${l === q2sel ? 'on' : ''}" data-l="${l}"><div class="h">${l}</div><div class="s">${A.pct(x.share)} of balls · ${A.fi(x.balls)}</div><div class="s">dismissal ${A.pct(x.dismissal)} · ${A.f(x.rpb)} runs/ball · boundary ${A.pct(x.boundary)}</div></div>`; };
      document.getElementById('q2grid').innerHTML = `<div class="q2"><div class="ax small" style="display:flex;align-items:center">Batter<br>high</div>${box('Batting crisis')}${box('Mutual pressure')}
        <div class="ax small" style="display:flex;align-items:center">Batter<br>low</div>${box('Neutral')}${box('Bowling crisis')}
        <div></div><div class="ax small" style="text-align:center">Bowler low</div><div class="ax small" style="text-align:center">Bowler high</div></div>`;
      document.querySelectorAll('#q2grid .qc').forEach(el => el.onclick = () => { q2sel = el.dataset.l; this.drawQ2(); });
      const key = Object.entries(QMAP[q2disc]).find(([, v]) => v === q2sel)[0];
      const rows = D.quad2_top[q2disc][key] || [];
      document.getElementById('q2detail').innerHTML = `<b>${q2sel}</b> — ${q2disc === 'Batting' ? 'batters' : 'bowlers'}<table class="t" style="margin-top:6px"><tbody>${rows.map(p => `<tr><td>${A.esc(p.player)}</td><td class="num ${A.cls(p.value)}">${A.sg(p.value, 3)}</td><td class="num muted">${p.balls} b</td></tr>`).join('') || '<tr><td class="muted">No player with ≥ 40 balls.</td></tr>'}</tbody></table>`;
    }
  });
})();
