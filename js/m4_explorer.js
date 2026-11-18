/* Module 4 — Player Explorer */
(function () {
  const A = App, D = A.D, C = A.C;
  const S = { role: 'bat', a: 6819, b: 6931, comp: 'all', season: 'all', mode: 'single' };
  const DEF = { bat: [6819, 6931], bowl: [3644, 4219] };
  const COL = [C.pink, C.blue];
  const roleName = r => r === 'bat' ? 'Batter' : 'Bowler';
  const byName = (role, n) => D.players[role].find(p => p.player.toLowerCase() === String(n).trim().toLowerCase());

  A.register('explorer', {
    title: 'Player Explorer', sub: 'How an individual performs under pressure compared with their own baseline and with the league',
    render(root) {
      const opts = r => D.players[r].slice().sort((a, b) => b.n_P - a.n_P).map(p => `<option value="${A.esc(p.player)}">`).join('');
      root.innerHTML = `
      <datalist id="dl-bat">${opts('bat')}</datalist><datalist id="dl-bowl">${opts('bowl')}</datalist>
      <div class="toolbar">
        <label>Role ${A.seg('xRole', [['bat', 'Batter'], ['bowl', 'Bowler']], 'bat')}</label>
        <label class="picker">Player <input id="xA" type="search" list="dl-bat" placeholder="Type a name"></label>
        <label>Competition <select id="xComp"><option value="all">All (IPL + T20I)</option><option value="IPL">IPL</option><option value="T20I">T20I</option></select></label>
        <label>Season <select id="xSeason"><option value="all">2022–2026</option>${[2022, 2023, 2024, 2025, 2026].map(s => `<option>${s}</option>`).join('')}</select></label>
        <label>Mode ${A.seg('xMode', [['single', 'Individual'], ['compare', 'Compare players']], 'single')}</label>
        <label class="picker hidden" id="xBwrap">vs <input id="xB" type="search" list="dl-bat" placeholder="Second player"></label>
        <span class="note">Competition and season filter the cricket charts; Level, Clutch and rating are always over all 2022–26 data.</span>
      </div>
      <div class="grid g2" id="xProfiles"></div>
      <div class="grid g2">
        ${A.card('Ordinary vs pressure performance', `<div class="twocol">${A.cv('xOvP')}${A.cv('xOvE')}</div>`, { id: 'x-ovp', foot: '<span id="xOvPnote"></span>' })}
        ${A.card('Performance across the four pressure tiers', A.cv('xTier'), { id: 'x-tier', foot: 'Bars = role metric per tier; labels = balls in that tier for the current filters.' })}
      </div>
      <div class="grid g2">
        ${A.card('Season by season: pressure vs ordinary', A.cv('xSeas'), { id: 'x-seas', foot: 'Seasons with fewer than 12 pressure balls are hidden.' })}
        ${A.card('Sample size and certainty', '<div id="xSample"></div>', { id: 'x-sample' })}
      </div>
      <div class="grid g2">
        ${A.card('Individual 3×3 pressure profile', '<div id="xHeat"></div>', { id: 'x-heat', foot: 'Shrunk performance vs expected ×100 per cell (blue above, red below); number = balls; framed cell = home cell. All competitions and seasons.' })}
        ${A.card('Individual 2×2: who carries the pressure', '<div id="xQuad"></div>', { id: 'x-quad', foot: 'Shrunk performance vs expected ×100 in each quadrant (≥ 1 ball).' })}
      </div>
      ${A.card('Level vs Clutch: every eligible player', `<div style="display:flex;gap:14px;align-items:center;margin-bottom:6px"><label class="small"><input type="checkbox" id="xCI"> Show intervals for all players</label><span class="small muted">Bubble size = High + Extreme balls · hollow = Clutch interval crosses zero · click a bubble to open that player</span></div>${A.cv('xScatter', 'xtall')}`, { id: 'x-scatter' })}
      <div class="grid g2" style="margin-top:14px" id="xCmpWrap">${A.card('Side-by-side comparison', '<div id="xCmp"></div>', { id: 'x-cmp' })}</div>`;
      const $ = id => document.getElementById(id);
      A.onSeg('xRole', v => { S.role = v; [S.a, S.b] = DEF[v]; $('xA').setAttribute('list', 'dl-' + v); $('xB').setAttribute('list', 'dl-' + v); this.draw(); });
      A.onSeg('xMode', v => { S.mode = v; $('xBwrap').classList.toggle('hidden', v !== 'compare'); this.draw(); });
      $('xComp').onchange = e => { S.comp = e.target.value; this.draw(); };
      $('xSeason').onchange = e => { S.season = e.target.value; this.draw(); };
      $('xCI').onchange = () => this.drawScatter();
      const pick = (inp, key) => inp.addEventListener('change', () => { const p = byName(S.role, inp.value); if (p) { S[key] = p.player_id; this.draw(); } });
      pick($('xA'), 'a'); pick($('xB'), 'b');
    },
    show(p) {
      if (p.role && p.role !== S.role) { S.role = p.role; [S.a, S.b] = DEF[p.role]; document.querySelectorAll('#xRole button').forEach(b => b.classList.toggle('on', b.dataset.v === p.role)); document.getElementById('xA').setAttribute('list', 'dl-' + p.role); document.getElementById('xB').setAttribute('list', 'dl-' + p.role); }
      if (p.player && A.P[S.role].has(+p.player)) S.a = +p.player;
      if (p.vs && A.P[S.role].has(+p.vs)) { S.b = +p.vs; S.mode = 'compare'; document.querySelectorAll('#xMode button').forEach(b => b.classList.toggle('on', b.dataset.v === 'compare')); document.getElementById('xBwrap').classList.remove('hidden'); }
      this.draw();
    },
    sel() { return (S.mode === 'compare' ? [S.a, S.b] : [S.a]).map(id => A.P[S.role].get(id)).filter(Boolean); },
    draw() {
      const ps = this.sel(); if (!ps.length) return;
      document.getElementById('xA').value = ps[0].player; if (ps[1]) document.getElementById('xB').value = ps[1].player;
      document.getElementById('xProfiles').style.gridTemplateColumns = ps.length > 1 ? '' : '1fr';
      document.getElementById('xProfiles').innerHTML = ps.map((p, i) => this.profile(p, i)).join('');
      document.getElementById('xCmpWrap').classList.toggle('hidden', ps.length < 2);
      const role = S.role, mN = A.metricName(role);
      const T = ps.map(p => A.tierStats(role, p.player_id, S.comp, S.season));
      // ordinary vs pressure
      const grp = t => ({ O: t[0], P: A.sumT([t[2], t[3]]) });
      const G = T.map(grp);
      const mkOv = (id, title, f) => A.chart(id, { type: 'bar', data: { labels: ['Ordinary', 'High + Extreme'],
        datasets: ps.map((p, i) => ({ label: p.player, backgroundColor: COL[i], data: [f(G[i].O), f(G[i].P)] })) },
        options: { plugins: { legend: { display: ps.length > 1 }, title: { display: true, text: title, align: 'start', color: '#17152e', font: { weight: 700 } }, barLabels: { fmt: v => v.toFixed(1) } },
          scales: { y: { grace: '15%' }, x: { grid: { display: false } } } } });
      mkOv('xOvP', mN, t => A.metric(role, t));
      mkOv('xOvE', A.vsExpName(role), t => A.vsExp(role, t));
      document.getElementById('xOvPnote').innerHTML = ps.map((p, i) => `${A.esc(p.player)}: ${A.fi(G[i].O.n)} ordinary vs ${A.fi(G[i].P.n)} pressure balls`).join(' · ') + (role === 'bowl' ? ' · lower economy is better' : '');
      // tiers
      A.chart('xTier', { type: 'bar', data: { labels: A.TIERS, datasets: ps.map((p, i) => ({ label: p.player, data: T[i].map(t => A.metric(role, t)), backgroundColor: ps.length > 1 ? COL[i] : C.tiers, borderColor: ps.length > 1 ? COL[i] : ['#d9cf9c', ...C.tiers.slice(1)], borderWidth: 1 })) },
        options: { plugins: { legend: { display: ps.length > 1 }, barLabels: { fmt: (v, i, di) => `${v.toFixed(1)} · ${T[di][i].n}b` } }, scales: { y: { title: { display: true, text: mN }, grace: '12%' }, x: { grid: { display: false } } } } });
      // seasons
      const seasons = [2022, 2023, 2024, 2025, 2026];
      const SS = ps.map(p => A.seasonStats(role, p.player_id, S.comp));
      const ds = [];
      ps.forEach((p, i) => {
        ds.push({ label: `${p.player}: pressure`, data: seasons.map(s => SS[i][s] && SS[i][s].P.n >= 12 ? A.metric(role, SS[i][s].P) : null), borderColor: COL[i], backgroundColor: COL[i], spanGaps: true });
        ds.push({ label: `${p.player}: ordinary`, data: seasons.map(s => SS[i][s] && SS[i][s].O.n >= 12 ? A.metric(role, SS[i][s].O) : null), borderColor: COL[i], backgroundColor: '#fff', borderDash: [5, 4], spanGaps: true });
      });
      A.chart('xSeas', { type: 'line', data: { labels: seasons, datasets: ds }, options: { scales: { y: { title: { display: true, text: mN } } } } });
      // sample + certainty
      const bar = role === 'bat' ? D.kpi.bar_bat : D.kpi.bar_bowl;
      document.getElementById('xSample').innerHTML = ps.map((p, i) => `
        <div style="margin-bottom:12px"><b style="color:${COL[i]}">${A.esc(p.player)}</b> <span class="small muted">· ${p.evidence_tier}${p.eligible ? ` · rank ${p.rank}` : ''}</span>
        <div class="small" style="margin:6px 0 3px">High + Extreme balls: <b>${A.fi(p.n_P)}</b> of ${bar} needed for eligibility · ${A.fi(p.P_matches)} matches with pressure balls</div>
        <div class="bar"><i style="width:${Math.min(100, 100 * p.n_P / bar)}%;background:${COL[i]}"></i></div>
        <table class="t" style="margin-top:8px"><tbody>
          <tr><td>Shrunk Level ×100 (90% interval)</td><td class="num ${A.cls(p.Level_hat)}">${A.x100(p.Level_hat)}</td><td class="num muted">[${A.x100(p.Level_lo90)}, ${A.x100(p.Level_hi90)}]</td></tr>
          <tr><td>Shrunk Clutch ×100 (90% interval)</td><td class="num ${A.cls(p.Clutch_hat)}">${A.x100(p.Clutch_hat)}</td><td class="num muted">[${A.x100(p.Clutch_lo90)}, ${A.x100(p.Clutch_hi90)}]</td></tr>
          <tr><td>Rank / P(top 10) / 90% rank interval</td><td class="num">${p.eligible ? p.rank : '—'}</td><td class="num muted">${p.eligible ? `${A.f(p.top10_prob)} · ${Math.round(p.rank_lo90)}–${Math.ceil(p.rank_hi90)}` : 'not eligible'}</td></tr>
          <tr><td>Largest rank change, one match dropped</td><td class="num">${p.eligible ? p.jackknife_max_rank_change : '—'}</td><td class="num muted">${p.eligible ? `survives ${p.sens_survival}/10 settings` : ''}</td></tr>
        </tbody></table></div>`).join('');
      this.drawHeat(ps); this.drawQuad(ps); this.drawScatter(); if (ps.length > 1) this.drawCmp(ps);
    },
    profile(p, i) {
      const role = S.role;
      const fr = D.final.find(r => r.player_id === p.player_id && r.list === (role === 'bat' ? 'Batting' : 'Bowling'));
      const place = fr ? (fr.submit === 'yes' ? `Submitted #${fr.rank}${fr.place.startsWith('breakout') ? ' (breakout place)' : ''}` : `Reserve #${fr.rank}`) : (p.eligible ? `Evidence rank ${p.rank}` : 'Not eligible');
      const t = A.tierStats(role, p.player_id), O = t[0], Pr = A.sumT([t[2], t[3]]);
      return A.card(`${roleName(role)} profile${S.mode === 'compare' ? ` <span class="pill" style="background:${COL[i]};color:#fff;margin-left:6px">${i ? 'B' : 'A'}</span>` : ''}`, `
        <div class="prof"><div class="avatar" style="background:linear-gradient(135deg,var(--navy-700),${COL[i]})">${A.initials(p.player)}</div>
          <div><h2>${A.esc(p.player)}</h2><div class="meta">${roleName(role)} · ${p.role_group}${role === 'bowl' && p.pace_or_spin ? ' · ' + p.pace_or_spin : ''} · ${A.esc(p.nation)} · ${p.ipl_team_2026 ? 'IPL 2026: ' + p.ipl_team_2026 : 'no IPL 2026 squad'}</div>
          <div class="meta">${A.esc(p.franchise_history_2022_26 || '')}</div>
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill pink">${place}</span><span class="pill blue">${p.evidence_tier}</span><span class="pill grey">${A.esc(p.response_type)}</span>${p.status_2027 ? `<span class="pill warn">${A.esc(p.status_2027)}</span>` : ''}</div></div></div>
        <div class="stats">
          <div class="stat"><div class="v">${A.fi(p.matches_all)}</div><div class="l">matches (live balls)</div></div>
          <div class="stat"><div class="v">${A.fi(p.n_O)}</div><div class="l">ordinary balls</div></div>
          <div class="stat"><div class="v">${A.fi(p.n_P)}</div><div class="l">High + Extreme balls</div></div>
          <div class="stat hl"><div class="v">${A.f(p.Rating)}</div><div class="l">final rating (F16)</div></div>
          <div class="stat"><div class="v">${A.f(A.metric(role, O), 1)}</div><div class="l">${role === 'bat' ? 'SR' : 'economy'}: ordinary</div></div>
          <div class="stat"><div class="v">${A.f(A.metric(role, Pr), 1)}</div><div class="l">${role === 'bat' ? 'SR' : 'economy'}: pressure</div></div>
          <div class="stat"><div class="v ${A.cls(p.Level_hat)}">${A.x100(p.Level_hat)}</div><div class="l">Level (shrunk ×100)</div></div>
          <div class="stat"><div class="v ${A.cls(p.Clutch_hat)}">${A.x100(p.Clutch_hat)}</div><div class="l">Clutch (shrunk ×100)</div></div>
        </div>
        <div class="small muted" style="margin-top:8px">Home cell: ${A.esc(p.home_cell || '—')} · Pressure ceiling: ${A.esc(p.pressure_ceiling || '—')} · ${A.esc(p.who_carries_type || '')}</div>`);
    },
    drawHeat(ps) {
      const role = S.role, disc = role === 'bat' ? 'Batting' : 'Bowling';
      const vals = D.prof3.filter(r => r.discipline === disc && ps.some(p => p.player_id === r.player_id));
      const vmax = Math.max(0.05, ...vals.map(r => Math.abs(100 * r.shr)));
      const col = v => { const a = Math.min(1, Math.abs(v) / vmax); return v >= 0 ? `rgba(42,120,214,${0.12 + 0.78 * a})` : `rgba(196,58,69,${0.12 + 0.78 * a})`; };
      document.getElementById('xHeat').innerHTML = `<div class="${ps.length > 1 ? 'twocol' : ''}">` + ps.map((p, i) => {
        const rows = vals.filter(r => r.player_id === p.player_id);
        let h = `<div><b style="color:${COL[i]}">${A.esc(p.player)}</b><div class="heat" style="margin-top:6px"><div></div>${A.BANDS.map(s => `<div class="hx">${s} sit.</div>`).join('')}`;
        [...A.BANDS].reverse().forEach(c => {
          h += `<div class="hx">${c} stakes</div>`;
          A.BANDS.forEach(s => { const r = rows.find(x => x.cband === c && x.sband === s); const home = (p.home_cell || '') === `${c} stakes / ${s} situation`;
            h += r ? `<div class="hc" style="background:${col(100 * r.shr)};color:${Math.abs(100 * r.shr) / vmax > .55 ? '#fff' : '#17152e'};${home ? 'outline:2.5px solid #17152e;' : ''}"><b>${A.sg(100 * r.shr, 3)}</b><span class="tiny">${r.size} b</span></div>` : '<div class="hc" style="background:#f3f2f8">—</div>'; });
        });
        return h + '</div></div>';
      }).join('') + '</div>';
    },
    drawQuad(ps) {
      const disc = S.role === 'bat' ? 'Batting' : 'Bowling';
      const NAME = S.role === 'bat' ? { 'own crisis': 'Batting crisis (bowler on top)', 'mutual': 'Mutual pressure (close finish)', 'other crisis': 'Bowling crisis (batters cruising)', 'neutral': 'Neutral' }
        : { 'own crisis': 'Bowling crisis (batters cruising)', 'mutual': 'Mutual pressure (close finish)', 'other crisis': 'Batting crisis (bowler on top)', 'neutral': 'Neutral' };
      const qs = ['own crisis', 'mutual', 'other crisis', 'neutral'];
      A.chart && document.getElementById('xQuad') && (document.getElementById('xQuad').innerHTML = A.cv('xQuadC'));
      A.chart('xQuadC', { type: 'bar', data: { labels: qs.map(q => NAME[q]), datasets: ps.map((p, i) => ({ label: p.player, backgroundColor: COL[i],
        data: qs.map(q => { const r = D.prof2.find(x => x.discipline === disc && x.player_id === p.player_id && x.quad === q); return r ? 100 * r.shr : null; }) })) },
        options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: c => { const r = D.prof2.find(x => x.discipline === disc && x.player_id === ps[c.datasetIndex].player_id && x.quad === qs[c.dataIndex]); return `${c.dataset.label}: ${c.parsed.x.toFixed(3)} (${r ? r.size : 0} balls)`; } } } },
          scales: { x: { title: { display: true, text: 'shrunk performance vs expected ×100' } }, y: { grid: { display: false } } } } });
    },
    drawScatter() {
      const role = S.role, ps = this.sel(), ids = new Set(ps.map(p => p.player_id));
      const all = D.players[role].filter(p => p.eligible || ids.has(p.player_id));
      const showCI = document.getElementById('xCI').checked;
      const pt = p => ({ x: 100 * p.Level_hat, y: 100 * p.Clutch_hat, r: 3 + Math.sqrt(p.n_P) / 3, n: p.player, id: p.player_id });
      const crosses = p => p.Clutch_lo90 <= 0 && p.Clutch_hi90 >= 0;
      const others = all.filter(p => !ids.has(p.player_id));
      const ds = [{ label: 'Eligible players', data: others.map(pt), backgroundColor: others.map(p => crosses(p) ? 'rgba(255,255,255,0)' : 'rgba(42,120,214,.55)'), borderColor: 'rgba(42,120,214,.85)', borderWidth: 1.2,
        errorBars: showCI ? others.flatMap(p => [{ x0: 100 * p.Level_lo90, x1: 100 * p.Level_hi90, y: 100 * p.Clutch_hat }, { y0: 100 * p.Clutch_lo90, y1: 100 * p.Clutch_hi90, x: 100 * p.Level_hat }]) : null, errorColor: 'rgba(42,120,214,.25)' }];
      ps.forEach((p, i) => ds.push({ label: p.player, data: [pt(p)], backgroundColor: crosses(p) ? '#fff' : COL[i], borderColor: COL[i], borderWidth: 2.5,
        errorBars: [{ x0: 100 * p.Level_lo90, x1: 100 * p.Level_hi90, y: 100 * p.Clutch_hat }, { y0: 100 * p.Clutch_lo90, y1: 100 * p.Clutch_hi90, x: 100 * p.Level_hat }], errorColor: COL[i] }));
      const c = A.chart('xScatter', { type: 'bubble', data: { datasets: ds },
        options: { plugins: { quadrants: { x: 0, y: 0, labels: ['Pressure riser', 'Big-match performer', 'Struggler', 'Fade under pressure'] },
          tooltip: { callbacks: { label: c => `${c.raw.n}: Level ${c.raw.x.toFixed(3)}, Clutch ${c.raw.y.toFixed(3)}` } } },
          scales: { x: { title: { display: true, text: 'Shrunk Level ×100 (pressure performance vs an average player)' } }, y: { title: { display: true, text: 'Shrunk Clutch ×100 (change vs own ordinary level)' } } },
          onClick: (e, els) => { if (!els.length) return; const r = c.data.datasets[els[0].datasetIndex].data[els[0].index]; S.a = r.id; this.draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); } } });
    },
    drawCmp(ps) {
      const [a, b] = ps, role = S.role;
      const rows = [['Final rating', 'Rating', v => A.f(v), 1], ['Shrunk Level ×100', 'Level_hat', v => A.x100(v), 1], ['Shrunk Clutch ×100', 'Clutch_hat', v => A.x100(v), 1],
        ['Usual level ×100', 'Ord_hat', v => A.x100(v), 1], ['High + Extreme balls', 'n_P', A.fi, 1], ['Extreme balls', 'n_Extreme', A.fi, 1], ['Matches with pressure balls', 'P_matches', A.fi, 1],
        ['Evidence rank', 'rank', v => v ? v : '—', -1], ['P(top 10)', 'top10_prob', v => A.f(v), 1], ['Consistency (pressure innings above exp.)', 'consistency', v => A.pct(v, 0), 1],
        ...(role === 'bat' ? [['Pressure strike rate', 'P_SR', v => A.f(v, 1), 1], ['Runs vs expected / 100 pressure balls', 'P_runs_above_exp_per100', v => A.sg(v, 1), 1]]
          : [['Pressure economy', 'P_econ', v => A.f(v), -1], ['Runs saved / over vs expected', 'P_runs_saved_per_over', v => A.sg(v), 1], ['Wickets vs expected / 24 balls', 'P_wkts_above_exp_per24', v => A.sg(v), 1]]),
        ['Response type', 'response_type', v => v, 0], ['Home cell', 'home_cell', v => v || '—', 0]];
      const better = (k, dir) => { const x = a[k], y = b[k]; if (!dir || x == null || y == null || x === y || (k === 'rank' && (!x || !y))) return [0, 0]; return (x > y) === (dir > 0) ? [1, 0] : [0, 1]; };
      document.getElementById('xCmp').innerHTML = `<table class="t"><thead><tr><th>Measure</th><th class="num" style="color:${COL[0]}">${A.esc(a.player)}</th><th class="num" style="color:${COL[1]}">${A.esc(b.player)}</th></tr></thead><tbody>${rows.map(([l, k, fm, dir]) => { const w = better(k, dir); return `<tr><td>${l}</td><td class="num" style="${w[0] ? 'font-weight:800;color:' + COL[0] : ''}">${fm(a[k])}</td><td class="num" style="${w[1] ? 'font-weight:800;color:' + COL[1] : ''}">${fm(b[k])}</td></tr>`; }).join('')}</tbody></table>`;
    }
  });
})();
