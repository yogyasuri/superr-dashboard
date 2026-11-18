/* Module 3 — Measurement & Validation */
(function () {
  const A = App, D = A.D, C = A.C;
  let role = 'bat', inn = '2';
  const STEPS = [
    ['Ball-by-ball data', '193,988 IPL + T20I deliveries; pre-ball state for every ball'],
    ['Next-ball outcome model', 'Multinomial logistic, 9 outcomes; simplest within 1% of the best (XGBoost)'],
    ['Win probability', 'WASP-style recursion (chase) + remaining-runs distribution (1st innings)'],
    ['Leverage', 'Expected |ΔWP| on the ball ÷ league mean (closeness gate built in)'],
    ['Stakes', 'IPL playoff swing (4,000 sims); T20I series state and stage'],
    ['Personal accountability', '±1 tier: crisis on arrival, last recognised batter, final over'],
    ['Pressure classification', 'P = LI × C → Ordinary / Elevated / High / Extreme'],
    ['Expected performance', 'Same state + same prior-rated opponent → average player'],
    ['Runs & wicket channels', 'Residual split into two channels, valued in win-probability units ÷ leverage'],
    ['Level & Clutch', 'Level: pressure balls vs average; Clutch: within-season change vs own ordinary'],
    ['Empirical Bayes', 'DerSimonian–Laird per channel; player-specific errors; role-group prior'],
    ['F16 rating', 'Rating = 0.5·z(Level) + 0.5·z(Clutch); w by prediction + tie rule'],
    ['Bootstrap uncertainty', '1,000 match resamples → P(top 10), 90% rank interval; jackknife']
  ];

  A.register('measurement', {
    title: 'Measurement & Validation', sub: 'The statistical engine, how it was validated, and where it falls short',
    render(root) {
      const f0 = D.f0.summary;
      root.innerHTML = `
      <div class="toolbar"><label>Role ${A.seg('mRole', [['bat', 'Batting'], ['bowl', 'Bowling']], 'bat')}</label><span class="note">Role-specific exhibits update with this switch.</span></div>
      ${A.card('End-to-end workflow', `<div class="flow">${STEPS.map((s, i) => `<div class="step ${i === STEPS.length - 1 ? 'out' : ''}"><b>${s[0]}</b>${s[1]}</div>`).join('')}</div>`, { id: 'm-flow' })}
      <div class="grid g3" id="m-models" style="margin-top:14px">
        ${A.card('Next-ball model: holdout log loss', A.cv('mF0'), { tag: '2025–26 holdout', foot: `Chosen: ${f0.chosen} (${A.f(f0.chosen_logloss, 4)}), ${A.f(100 * (f0.chosen_logloss / f0.best_logloss - 1), 2)}% behind the best. Grouped CV ${A.f(f0.cv_mean_logistic, 4)} vs null ${A.f(f0.cv_mean_null, 4)}.` })}
        ${A.card('Win probability: recursion vs direct models', '<div id="mF1"></div>', { foot: 'Lower is better for log loss and calibration error; slope 1 = perfectly calibrated. First innings is over-confident (slope 0.76): a stated limitation.' })}
        ${A.card('Calibration curve', `<div style="margin-bottom:6px">${A.seg('mInn', [['1', 'Innings 1'], ['2', 'Innings 2']], '2')}</div>${A.cv('mCal', 'short')}`, { foot: 'Points on the dashed diagonal = predicted equals observed.' })}
      </div>
      <div class="grid g2" id="m-ch">
        ${A.card('Why the original residual (F8) was replaced', `${A.cv('mChan')}
          <div class="callout red" style="margin-top:8px"><b>Negative finding, kept visible.</b> The raw win-probability residual had split-half reliability near zero for batters. A wicket swings win probability far more than a run, and over a few hundred balls dismissals are close to pure chance, so the noisy wicket part drowned the reliable runs part. The residual is now split into a runs channel and a wicket channel, each shrunk by its own reliability.</div>`, { tag: 'split-half r, pressure balls' })}
        ${A.card('Actual vs expected under pressure', A.cv('mAvE', 'tall'), { id: 'm-ave', foot: 'Each dot is an eligible player; above the diagonal = better than an average player in the same states against the same opponents.' })}
      </div>
      <div class="grid g2">
        ${A.card('Level decomposition: runs vs wicket channel (submitted top 10)', A.cv('mDec', 'tall'), { id: 'm-dec', foot: 'Shrunk Level ×100. For batters the wicket channel has no detectable skill, so it is shrunk entirely to the role-group average: the same value for every player in a role. Differences between batters therefore come from the runs channel.' })}
        ${A.card('Shrinkage: raw vs shrunk Level', A.cv('mShr', 'tall'), { id: 'm-shr', foot: 'Points are pulled toward their role average in proportion to noise; small samples move most. Pink = eligible.' })}
      </div>
      <div class="grid g2" id="m-rel">
        ${A.card('Is it repeatable? Stability tests', A.cv('mStab', 'tall'), { foot: 'Runs-channel Level repeats modestly (split-half p &lt; 0.05); the wicket channel does not; Clutch repeats weakly for bowlers only.' })}
        ${A.card('Bootstrap 90% intervals: shrunk Level (evidence top 15)', A.cv('mBoot', 'tall'), { id: 'm-boot', foot: '1,000 match-level resamples, shrinkage re-estimated in each.' })}
      </div>
      <div class="grid g3" id="m-sens">
        ${A.card('Sensitivity of the top 10 to method settings', A.cv('mSens', 'tall'), { foot: 'Players shared with the default top 10 under each alternative setting.' })}
        ${A.card('Alternative ratings compared', '<div id="mAlt"></div>', { id: 'm-alt', foot: 'No alternative beats the framework rating by more than noise, except raw death economy for bowlers (a role and skill measure, not a pressure response).' })}
        ${A.card('Choosing w by out-of-period prediction', A.cv('mW'), { foot: 'Curve is flat (differences within one SE), so the pre-registered tie rule picks w = 0.5.' })}
      </div>
      <div class="grid g2" id="m-limits">
        ${A.card('Key methodological decisions', `<table class="t"><tbody>
          <tr><td><b>Runs + wicket channels</b></td><td class="small">Raw residual failed reliability; channels keep the match-impact valuation (correlation 0.93 with raw WPA) but let each be shrunk by its own reliability.</td></tr>
          <tr><td><b>Empirical Bayes shrinkage</b></td><td class="small">DerSimonian–Laird between-player variance; Level shrinks to the role-group mean, Clutch to zero.</td></tr>
          <tr><td><b>Player-specific errors</b></td><td class="small">Each player’s own ball variance (30-ball pooled prior) × match-cluster design effect, because players differ in how many low-leverage balls they see.</td></tr>
          <tr><td><b>Competition-season centring</b></td><td class="small">Scores centred within competition × season × tier, so 0 = an average player in that kind of moment in that league-year.</td></tr>
          <tr><td><b>Match-cluster bootstrap</b></td><td class="small">Matches, not balls, are resampled, because balls within a match are not independent.</td></tr>
          <tr><td><b>Eligibility amendment</b></td><td class="small">Bar from the runs channel (254 bat / 390 bowl); adopted after the frozen-rule list was inspected, and disclosed.</td></tr></tbody></table>`)}
        ${A.card('Limitations (stated, not hidden)', `<ul class="small" style="line-height:1.6;margin:0;padding-left:18px">
          <li>The rating does not out-predict simple benchmarks out of period (all differences within about one SE).</li>
          <li>About 85% of the spread in batting pressure Level is sampling noise; ranks 5–15 overlap heavily.</li>
          <li>First-innings win probability is over-confident (calibration slope 0.76).</li>
          <li>Our pressure index loses Check 2 on raw behaviour trend; kept because rival indices put 49–88% of their top decile in decided games.</li>
          <li>Stakes values for T20I series and knockouts are judgements, tested only through sensitivity.</li>
          <li>Venue, partners, field settings and captaincy are not modelled; personal stakes and scrutiny are unobservable.</li>
          <li>Booster search was 22 trials rather than 160; the simplest-within-1% rule already chose the logistic model.</li></ul>
          <div class="tiles" style="margin-top:10px" id="mMixed"></div>`)}
      </div>`;
      const best = D.f0.best.sort((a, b) => a.holdout_logloss - b.holdout_logloss);
      const famL = { logistic: 'Logistic + splines', lightgbm: 'LightGBM (14 trials)', xgboost: 'XGBoost (8 trials)', null: 'Null: frequencies' };
      A.chart('mF0', { type: 'bar', data: { labels: best.map(b => famL[b.family]), datasets: [{ data: best.map(b => b.holdout_logloss), backgroundColor: best.map(b => b.family === 'logistic' ? C.pink : '#b9b6d0') }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false }, barLabels: { fmt: v => v.toFixed(4) } }, scales: { x: { min: 1.615, max: 1.67, title: { display: true, text: 'multiclass log loss (lower is better)' } }, y: { grid: { display: false } } } } });
      A.table('mF1', [{ k: 'innings', l: 'Inn' }, { k: 'model', l: 'Model', fmt: v => v.replace(' (F0 -> F1)', '') }, { k: 'logloss', l: 'Log loss', num: true, fmt: v => A.f(v, 3) },
        { k: 'ece', l: 'Calib. error', num: true, fmt: v => A.f(v, 3) }, { k: 'calib_slope', l: 'Slope', num: true, fmt: v => A.f(v) }], D.f1.table, {});
      A.onSeg('mInn', v => { inn = v; this.drawCal(); });
      A.onSeg('mRole', v => { role = v; this.drawRole(); });
      // channel reliability
      const chans = ['Raw WPA residual (original F8)', 'Runs channel', 'Wicket channel', 'Runs + wickets (revised F8)'];
      A.chart('mChan', { type: 'bar', data: { labels: chans.map(c => c.replace(' (original F8)', ' (orig.)').replace(' (revised F8)', '')), datasets: ['bat', 'bowl'].map((r, i) => ({ label: r === 'bat' ? 'Batters' : 'Bowlers', backgroundColor: i ? C.pink : C.blue,
        data: chans.map(c => D.channel_reliability.find(x => x.role === r && x.channel === c).r) })) },
        options: { plugins: { barLabels: { fmt: v => v.toFixed(2) } }, scales: { y: { title: { display: true, text: 'split-half correlation' }, suggestedMin: -0.1, suggestedMax: 0.4 }, x: { grid: { display: false } } } } });
      const mx = D.mixed;
      document.getElementById('mMixed').innerHTML = [['bat', 'Batters'], ['bowl', 'Bowlers']].map(([r, l]) =>
        `<div class="tile"><div class="v">${A.f(mx[r].spearman_u1_vs_clutch_hat)}</div><div class="l">${l}: mixed-model random slope vs Clutch (Spearman)</div></div><div class="tile"><div class="v">${A.f(mx[r].spearman_u0_vs_ord_hat)}</div><div class="l">${l}: random intercept vs usual level</div></div>`).join('');
      this.drawCal(); this.drawRole();
    },
    drawCal() {
      const a = D.f1.calib[`${inn}_WASP-style`], b = D.f1.calib[`${inn}_Direct`];
      A.chart('mCal', { type: 'scatter', data: { datasets: [
        { label: 'Recursion (chosen)', data: a.map(r => ({ x: r.p, y: r.y })), showLine: true, borderColor: C.pink, backgroundColor: C.pink },
        { label: 'Direct XGBoost', data: b.map(r => ({ x: r.p, y: r.y })), showLine: true, borderColor: C.blue, backgroundColor: C.blue },
        { label: 'Perfect', data: [{ x: 0, y: 0 }, { x: 1, y: 1 }], showLine: true, borderColor: '#9a97ad', borderDash: [5, 5], pointRadius: 0, borderWidth: 1 }] },
        options: { scales: { x: { min: 0, max: 1, title: { display: true, text: 'predicted win probability' } }, y: { min: 0, max: 1, title: { display: true, text: 'observed win share' } } } } });
    },
    drawRole() {
      const ps = D.players[role], el = ps.filter(p => p.eligible);
      const subl = D.final.filter(r => r.list === (role === 'bat' ? 'Batting' : 'Bowling') && r.submit === 'yes').sort((a, b) => a.rank - b.rank);
      // actual vs expected
      const pts = el.map(p => role === 'bat' ? { x: p.P_SR - p.P_runs_above_exp_per100, y: p.P_SR, n: p.player } : { x: p.P_econ + p.P_runs_saved_per_over, y: p.P_econ, n: p.player });
      const lo = Math.min(...pts.map(p => Math.min(p.x, p.y))) - 3, hi = Math.max(...pts.map(p => Math.max(p.x, p.y))) + 3;
      const lab = role === 'bat' ? 'strike rate' : 'economy';
      A.chart('mAvE', { type: 'scatter', data: { datasets: [
        { label: 'Eligible players', data: pts, backgroundColor: 'rgba(42,120,214,.7)', pointRadius: 4 },
        { label: 'Actual = expected', data: [{ x: lo, y: lo }, { x: hi, y: hi }], showLine: true, borderColor: '#9a97ad', borderDash: [5, 5], pointRadius: 0, borderWidth: 1 }] },
        options: { plugins: { tooltip: { callbacks: { label: c => c.raw.n ? `${c.raw.n}: actual ${c.raw.y.toFixed(1)}, expected ${c.raw.x.toFixed(1)}` : '' } } },
          scales: { x: { title: { display: true, text: `expected pressure ${lab} (average player, same states & opponents)` } }, y: { title: { display: true, text: `actual pressure ${lab}` } } } } });
      // decomposition
      const top = subl.map(r => ({ r, p: A.P[role].get(r.player_id) })).filter(x => x.p);
      A.chart('mDec', { type: 'bar', data: { labels: top.map(x => `${x.r.rank}. ${x.p.player}`), datasets: [
        { label: 'Runs channel', data: top.map(x => 100 * x.p.Level_r_hat), backgroundColor: C.blue, stack: 'l' },
        { label: 'Wicket channel', data: top.map(x => 100 * x.p.Level_w_hat), backgroundColor: C.pink, stack: 'l' },
        { label: 'Clutch (own-baseline change)', data: top.map(x => 100 * x.p.Clutch_hat), backgroundColor: '#1baf7a', stack: 'c' }] },
        options: { indexAxis: 'y', scales: { x: { stacked: true, title: { display: true, text: 'shrunk value ×100 (WP points per leverage-adjusted ball)' } }, y: { stacked: true, grid: { display: false } } } } });
      // shrinkage
      const sp = ps.filter(p => p.n_P >= 100);
      A.chart('mShr', { type: 'scatter', data: { datasets: [
        { label: 'Not eligible', data: sp.filter(p => !p.eligible).map(p => ({ x: 100 * p.Level, y: 100 * p.Level_hat, n: p.player, b: p.n_P })), backgroundColor: 'rgba(168,165,156,.55)', pointRadius: 3 },
        { label: 'Eligible', data: sp.filter(p => p.eligible).map(p => ({ x: 100 * p.Level, y: 100 * p.Level_hat, n: p.player, b: p.n_P })), backgroundColor: 'rgba(214,51,108,.8)', pointRadius: 4 }] },
        options: { plugins: { tooltip: { callbacks: { label: c => `${c.raw.n}: raw ${c.raw.x.toFixed(3)} → shrunk ${c.raw.y.toFixed(3)} (${c.raw.b} P-balls)` } } },
          scales: { x: { title: { display: true, text: 'raw Level ×100' } }, y: { title: { display: true, text: 'shrunk Level ×100' } } } } });
      // stability
      const st = D.stability[role], keys = [['splithalf_Level_r', 'Level (runs), split-half'], ['period_Level_r', 'Level (runs), 22–23 vs 24–26'], ['splithalf_Level_w', 'Level (wickets), split-half'],
        ['splithalf_Clutch_r', 'Clutch (runs), split-half'], ['period_Clutch_r', 'Clutch (runs), 22–23 vs 24–26'], ['period_Ord', 'Usual level, 22–23 vs 24–26'], ['ipl_vs_t20i_Level', 'Level, IPL vs T20I'], ['ipl_vs_t20i_Clutch', 'Clutch, IPL vs T20I']];
      A.chart('mStab', { type: 'bar', data: { labels: keys.map(k => k[1]), datasets: [{ data: keys.map(k => st[k[0]].r), backgroundColor: keys.map(k => st[k[0]].p < 0.05 ? C.pink : '#b9b6d0') }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false }, barLabels: { fmt: (v, i) => `${v.toFixed(2)} (p ${st[keys[i][0]].p.toFixed(2)})` }, tooltip: { callbacks: { label: c => `r = ${c.parsed.x.toFixed(3)}, n = ${st[keys[c.dataIndex][0]].n}` } } },
          scales: { x: { min: -0.2, max: 0.5, title: { display: true, text: 'correlation (pink = p < 0.05)' } }, y: { grid: { display: false } } } } });
      // bootstrap forest
      const ev = el.filter(p => p.rank >= 1 && p.rank <= 15).sort((a, b) => a.rank - b.rank);
      A.chart('mBoot', { type: 'scatter', data: { datasets: [{ label: 'Shrunk Level', data: ev.map((p, i) => ({ x: 100 * p.Level_hat, y: i, n: p.player })), backgroundColor: ev.map(p => p.rank <= 10 ? C.pink : '#9a97ad'), pointRadius: 5,
        errorBars: ev.map((p, i) => ({ x0: 100 * p.Level_lo90, x1: 100 * p.Level_hi90, y: i })) }] },
        options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${ev[c.dataIndex].player}: ${c.raw.x.toFixed(3)} [${(100 * ev[c.dataIndex].Level_lo90).toFixed(3)}, ${(100 * ev[c.dataIndex].Level_hi90).toFixed(3)}]` } } },
          scales: { y: { reverse: true, min: -0.5, max: ev.length - 0.5, afterBuildTicks: ax => { ax.ticks = ev.map((_, i) => ({ value: i })); }, ticks: { autoSkip: false, callback: v => ev[v] ? `${ev[v].rank}. ${ev[v].player}` : '' }, grid: { display: false } }, x: { suggestedMin: Math.min(...ev.map(p => 100 * p.Level_lo90)), suggestedMax: Math.max(...ev.map(p => 100 * p.Level_hi90)), title: { display: true, text: 'shrunk Level ×100 with 90% interval (evidence ranking)' } } } } });
      // sensitivity
      const se = D.sensitivity[role];
      A.chart('mSens', { type: 'bar', data: { labels: se.map(s => s.setting), datasets: [{ data: se.map(s => s.top10_overlap), backgroundColor: C.blue }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false }, barLabels: { fmt: (v, i) => `${v}/10 · ρ ${(se[i].spearman ?? 0).toFixed(2)}` } }, scales: { x: { min: 0, max: 13, title: { display: true, text: 'players shared with default top 10' } }, y: { grid: { display: false } } } } });
      A.table('mAlt', [{ k: 'rating', l: 'Candidate', fmt: v => v.replace(', close games', '') }, { k: 'predictive_r', l: 'Predictive r', num: true, fmt: v => A.f(v) },
        { k: 'split_half_r', l: 'Split-half r', num: true, fmt: v => A.f(v) }, { k: 'top10_overlap_with_R1', l: 'Top-10 overlap', num: true }], D.check4[role], {});
      const w = D.wsel[role].curve;
      A.chart('mW', { type: 'line', data: { labels: w.map(x => x.w.toFixed(1)), datasets: [
        { label: 'r with future pressure Level', data: w.map(x => x.r), borderColor: C.pink, backgroundColor: C.pink },
        { label: '± 1 bootstrap SE', data: w.map(x => x.r + x.se), borderColor: 'rgba(214,51,108,.25)', pointRadius: 0, borderDash: [3, 3], fill: false },
        { label: '', data: w.map(x => x.r - x.se), borderColor: 'rgba(214,51,108,.25)', pointRadius: 0, borderDash: [3, 3], fill: false }] },
        options: { plugins: { legend: { labels: { filter: i => i.text !== '' } } }, scales: { x: { title: { display: true, text: 'w (weight on Level)' } }, y: { title: { display: true, text: 'correlation' } } } } });
    }
  });
})();
