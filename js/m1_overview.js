/* Module 1 — Executive Overview: results first, in plain language. */
(function () {
  const A = App, D = A.D, C = A.C;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // numbers render at their final value; when motion is allowed they count up from zero on first view
  function countUp(root) {
    if (reduce) return;
    root.querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
      const fmt = v => pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')) + suf;
      const t0 = performance.now(), dur = 1100;
      const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }
  const cnt = (v, dec = 0, pre = '', suf = '') => `<span data-count="${v}" data-dec="${dec}" data-pre="${pre}" data-suf="${suf}">${pre}${dec ? (+v).toFixed(dec) : Math.round(v).toLocaleString('en-US')}${suf}</span>`;
  const conf = r => r.place.startsWith('breakout') ? ['Breakout', 'blue'] : r.top10_prob >= 0.8 ? ['Secure', 'good'] : r.top10_prob >= 0.5 ? ['Likely', 'warn'] : ['Close call', 'grey'];
  const pid = (role, name) => (D.players[role].find(p => p.player === name) || {}).player_id;

  function selList(list, role) {
    const rows = D.final.filter(r => r.list === list && r.submit === 'yes').sort((a, b) => a.rank - b.rank);
    const P = A.P[role];
    const max = role === 'bat' ? 200 : 12;
    return `<div class="sel">${rows.map((r, i) => {
      const p = P.get(r.player_id) || {};
      const pv = role === 'bat' ? p.P_SR : p.P_econ, ov = role === 'bat' ? p.O_SR : p.O_econ;
      const [cl, cc] = conf(r);
      const team = p.ipl_team_2026 ? p.ipl_team_2026 : (p.nation || '');
      const txt = role === 'bat' ? `Strike rate <b>${A.f(pv, 0)}</b> under pressure · usual ${A.f(ov, 0)}` : `Economy <b>${A.f(pv, 1)}</b> under pressure · usual ${A.f(ov, 1)}`;
      return `<div class="selrow rise" style="--d:${0.05 * i}s" onclick="App.goto('explorer','','role=${role}&player=${r.player_id}')" title="Open ${A.esc(r.player)} in the Player Explorer">
        <div class="rk ${r.rank <= 3 ? 'top3' : ''}">${r.rank}</div>
        <div class="nm">${A.esc(r.player)}<small>${A.esc(p.role_group || '')}${team ? ' · ' + A.esc(team) : ''}</small></div>
        <div class="gwrap"><div class="gbar ${role === 'bowl' ? 'blue' : ''}"><i style="width:${Math.min(100, 100 * pv / max)}%;--d:${0.05 * i + 0.15}s"></i><b style="left:${Math.min(100, 100 * ov / max)}%" title="usual level"></b></div><div class="gtxt">${txt}</div></div>
        <span class="pill ${cc}">${cl}</span></div>`;
    }).join('')}</div>`;
  }

  A.register('overview', {
    title: 'Who Performs Best Under Pressure?', sub: 'SupeRR Selector Season 2 · IPL & T20I 2022–2026 · the answer in one page',
    render(root) {
      const K = D.kpi, tb = D.tier_behaviour.find(r => r.metric === 'dismissal rate' && r.role.startsWith('batting'));
      const lift = Math.round(100 * (tb.Extreme / tb.Ordinary - 1));
      const jb = A.P.bat.get(6819), kb = A.P.bowl.get(3644);
      const frB = D.final.find(r => r.list === 'Batting' && r.rank === 1), frW = D.final.find(r => r.list === 'Bowling' && r.rank === 1);
      const secure = D.final.filter(r => r.submit === 'yes' && r.top10_prob >= 0.8).length;
      const breakouts = D.final.filter(r => r.submit === 'yes' && String(r.place).startsWith('breakout')).length;
      root.innerHTML = `
      <div class="hero rise">
        <div>
          <h2>Who delivers when the match is on the line?</h2>
          <p>We studied every ball of IPL and T20I cricket from 2022 to 2026, found the moments that decide matches, and asked one question: which players do better than an average player would in those moments?</p>
          <ul>
            <li><b>Pressure is real and measurable.</b> In the tensest moments batters are out about ${lift}% more often than in ordinary play.</li>
            <li><b>The best pressure players are mostly the best players.</b> Lifting your game above your own usual level is rare and hard to prove.</li>
            <li><b>For Rajasthan Royals the gap is bowling.</b> The batting is strong; death and middle-overs bowling need reinforcement.</li>
          </ul>
        </div>
        <div class="nums">
          <div class="num"><div class="v">${cnt(K.deliveries)}</div><div class="l">balls analysed</div></div>
          <div class="num"><div class="v">${cnt(K.ipl_matches + K.t20i_matches)}</div><div class="l">IPL and T20I matches</div></div>
          <div class="num"><div class="v">${cnt(K.eligible_bat)}</div><div class="l">batters with enough evidence to rank</div></div>
          <div class="num"><div class="v">${cnt(K.eligible_bowl)}</div><div class="l">bowlers with enough evidence to rank</div></div>
          <div class="num" style="grid-column:1/-1"><span class="live-dot"></span><b>Final selections ready</b> · the two top-10 lists below are our Unstop submission</div>
        </div>
      </div>

      <div class="grid g2">
        ${A.card('Our top 10 batters under pressure', selList('Batting', 'bat'), { cls: 'rise', tag: 'final selection', foot: 'Bar = strike rate in pressure moments; black tick = the player’s usual strike rate. Players are ranked on runs and wickets against what an average batter does in the same situations. Click a player for details.' })}
        ${A.card('Our top 10 bowlers under pressure', selList('Bowling', 'bowl'), { cls: 'rise', tag: 'final selection', foot: 'Bar = economy in pressure moments (shorter is better); black tick = the player’s usual economy. Players are ranked against what an average bowler concedes in the same situations. Click a player for details.' })}
      </div>
      <div class="small muted" style="margin:-4px 0 14px">Badges: <span class="pill good">Secure</span> in the top 10 in at least 80% of 1,000 re-runs of the data · <span class="pill warn">Likely</span> 50–80% · <span class="pill grey">Close call</span> under 50% · <span class="pill blue">Breakout</span> a place reserved for an unknown Indian player with strong but limited evidence.</div>

      <div class="grid g2">
        ${A.card('Spotlight: #1 batter', `<div class="spot"><div class="avatar">${A.initials(jb.player)}</div><div><h2 style="margin:0">${A.esc(jb.player)}</h2><div class="meta muted small">${jb.role_group} order · ${jb.ipl_team_2026 || ''} · ${A.fi(jb.n_P)} pressure balls</div></div></div>
          <div class="tiles" style="margin-top:12px">
            <div class="tile"><div class="big" style="font-size:30px;font-weight:800;color:var(--pink-600)">${cnt(jb.P_runs_above_exp_per100, 0, '+')}</div><div class="l">runs per 100 pressure balls above an average batter in the same situations</div></div>
            <div class="tile"><div class="v">${cnt(jb.P_SR, 0)} <span class="muted small">vs ${A.f(jb.O_SR, 0)}</span></div><div class="l">strike rate under pressure vs his usual</div></div>
            <div class="tile"><div class="v">${cnt(100 * frB.top10_prob, 0, '', '%')}</div><div class="l">of 1,000 re-runs keep him in the top 10</div></div></div>`, { cls: 'rise', foot: A.evLink('explorer', '', 'Full player profile →', 'role=bat&player=6819') })}
        ${A.card('Spotlight: #1 bowler', `<div class="spot"><div class="avatar" style="background:linear-gradient(135deg,var(--navy-700),var(--blue-600))">${A.initials(kb.player)}</div><div><h2 style="margin:0">${A.esc(kb.player)}</h2><div class="meta muted small">${(kb.pace_or_spin || '').toLowerCase()} · ${kb.role_group} overs · ${A.fi(kb.n_P)} pressure balls</div></div></div>
          <div class="tiles" style="margin-top:12px">
            <div class="tile"><div class="big" style="font-size:30px;font-weight:800;color:var(--blue-600)">${cnt(kb.P_runs_saved_per_over, 1)}</div><div class="l">runs per over saved against an average bowler in the same situations</div></div>
            <div class="tile"><div class="v">${cnt(kb.P_econ, 1)} <span class="muted small">vs ${A.f(kb.O_econ, 1)}</span></div><div class="l">economy under pressure vs his usual</div></div>
            <div class="tile"><div class="v">${cnt(100 * frW.top10_prob, 0, '', '%')}</div><div class="l">of 1,000 re-runs keep him in the top 10</div></div></div>`, { cls: 'rise', foot: A.evLink('explorer', '', 'Full player profile →', 'role=bowl&player=3644') })}
      </div>

      ${A.card('How we chose, in three steps', `<div class="steps3">
        <div class="step3 rise" style="--d:.05s"><div class="n">1</div><b>Find the pressure moments</b><span>A ball is high-pressure when the match is still open, the result matters (playoffs, deciders, finals) and it rests on that player.</span></div>
        <div class="step3 rise" style="--d:.15s"><div class="n">2</div><b>Compare with an average player</b><span>For every ball we ask what an average player would have done in the same situation against the same opponent, and credit only the difference.</span></div>
        <div class="step3 rise" style="--d:.25s"><div class="n">3</div><b>Keep only reliable evidence</b><span>Small samples are pulled toward average, players need enough pressure balls to be ranked, and every rank is re-tested 1,000 times.</span></div></div>`,
        { cls: 'rise', foot: `Want the detail? ${A.evLink('pressure', 'p-def', 'What pressure means →')} &nbsp; ${A.evLink('measurement', 'm-flow', 'How it was measured →')} &nbsp; ${A.evLink('rankings', 'r-top', 'Full rankings →')}` })}

      <div class="grid g2" style="margin-top:14px">
        ${A.card('What it means for Rajasthan Royals', `<ul class="small" style="padding-left:18px;line-height:1.7;margin:0">
          <li><b>Batting is strong.</b> RR already have the #1 pressure batter (Yashasvi Jaiswal) and the third-highest rated (Vaibhav Sooryavanshi).</li>
          <li><b>Bowling needs help at the death and in the middle overs.</b> No RR death bowler has enough pressure overs to judge; the best middle-overs option rates below average.</li>
          <li><b>Budget:</b> ₹${D.rr.ext.rr.purse_cr} crore, ${D.rr.ext.rr.slots} squad places, ${D.rr.ext.rr.overseas_slots} for overseas players (RR retention list, 17 Nov 2026).</li></ul>
          <h4>Players to look at</h4>
          <div class="chips">
            <span class="chip" onclick="App.goto('explorer','','role=bowl&player=${pid('bowl', 'Matheesha Pathirana')}')">Matheesha Pathirana · death overs · auction</span>
            <span class="chip" onclick="App.goto('explorer','','role=bowl&player=${pid('bowl', 'Adam Zampa')}')">Adam Zampa · middle overs · auction</span>
            <span class="chip" onclick="App.goto('explorer','','role=bowl&player=3653')">Avesh Khan · pace, Indian · auction</span>
            <span class="chip blue" onclick="App.goto('explorer','','role=bowl&player=3644')">Kuldeep Yadav · trade</span>
            <span class="chip blue" onclick="App.goto('explorer','','role=bowl&player=4219')">Krunal Pandya · trade</span></div>`, { cls: 'rise', foot: A.evLink('rr', 'rr-recs', 'Full acquisition plan →') })}
        ${A.card('How confident are we?', `<div class="tiles">
            <div class="tile"><div class="v">${cnt(secure)}</div><div class="l">of our 20 picks are secure (top 10 in at least 80% of re-runs)</div></div>
            <div class="tile"><div class="v">${cnt(breakouts)}</div><div class="l">breakout places for unknown Indian players with strong but limited evidence</div></div>
            <div class="tile"><div class="v">${cnt(100 * D.noise_share.bat, 0, '', '%')}</div><div class="l">of the differences between batters is luck, so lower ranks are close calls</div></div></div>
          <p class="small muted" style="margin:10px 0 0">The top of each list is firm. Ranks 5–10 are close, and the method says so openly rather than hiding it.</p>`, { cls: 'rise', foot: A.evLink('measurement', 'm-rel', 'Reliability evidence →') })}
      </div>`;
      this.root = root;
    },
    show() { if (!this.done) { this.done = true; if (!reduce) this.root.classList.add('animate'); countUp(this.root); } }
  });
})();
