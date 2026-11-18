/* Module 7 — Seven Questions and Evidence (framework question tree 1.1–7.4) */
(function () {
  const A = App, D = A.D, C = A.C;
  const tb = (m, r = 'batting (balls faced)') => D.tier_behaviour.find(x => x.metric === m && x.role === r);
  const st = D.stability, si = D.shrink_info, f1 = D.f1.table, K = D.kpi;
  const dc = (inn, ov) => D.dot_cost.find(x => x.innings === inn && x.over === ov);
  const verdict = { Yes: 'good', 'Yes, with gaps': 'warn', Mostly: 'warn', 'Only partly': 'bad', 'Yes, with role caveats': 'warn', 'Yes, with limits': 'warn' };

  const Q = [
    { n: 1, t: 'Can we identify a pressure moment?', v: 'Yes', chart: 'q1',
      stats: [[A.f(K.li_balanced) + ' vs ' + A.f(K.li_decided), 'leverage: balanced vs decided states'], [A.pct(tb('dismissal rate').Ordinary) + ' → ' + A.pct(tb('dismissal rate').Extreme), 'dismissal rate, Ordinary → Extreme'], [A.pct(D.decided.share), 'balls in decided games, excluded']],
      subs: [['1.1', 'Is the result still open, judged only from information before the ball?', `Yes. Win probability comes from a WASP-style recursion over the pre-ball state; leverage is the expected swing in win probability on the ball (${A.f(K.li_balanced)} when WP is 40–60%, ${A.f(K.li_decided)} when it is below 5% or above 95%). Rival indices put 49–88% of their top decile in decided games; ours 1.2%.`, ['pressure', 'p-valid']],
        ['1.2', 'Does the result matter, in IPL (points table) and in T20Is (stage, series)?', `Yes, per team. IPL stakes = playoff-probability swing from 4,000 simulations (mean ${A.f(D.shift.ipl_importance_mean)}; ${A.pct(D.shift.ipl_dead_share)} of team-matches dead). T20I: dead rubber 0.6 → decider 1.5, finals 2.0. Situation moves outcomes more than stakes do.`, ['pressure', 'p-m3']],
        ['1.3', 'Does the moment rest on this player: striker or non-striker, final over or spare over?', `Yes, through a ±1 tier shift: crisis on arrival (${A.pct(D.shift.bat.crisis_on_arrival)} of balls), last recognised batter (${A.pct(D.shift.bat.last_recognised)}), bowler’s final over of quota (${A.pct(D.shift.bowl.final_over_of_quota)}). Only the striker’s balls are rated. T20I has no “spare over”.`, ['pressure', 'p-drivers']],
        ['1.4', 'Is pressure a scale, where do its tiers break, and does behaviour change steadily?', `Tiers break at the 50th/75th/90th percentiles of leverage × stakes. Dismissal (trend z ${A.f(tb('dismissal rate').trend_z, 1)}), boundary and wide/no-ball rates rise steadily; the dot rate peaks in Elevated.`, ['pressure', 'p-valid']],
        ['1.5', 'Is the label free of hindsight and of the player’s own earlier performance?', 'Yes. Every state variable is pre-ball, opponent ratings use earlier matches only, and the player’s own dot streak is excluded from the index.', ['measurement', 'm-flow']]],
      interp: 'The framework identifies pressure ball by ball and keeps lost causes out, the main failure of simpler required-rate indices.',
      biz: 'RR can tag every ball of its own games by pressure tier and judge selections on the moments that decide matches.' },
    { n: 2, t: 'What counts as performing in that moment?', v: 'Yes', chart: 'q2',
      stats: [[A.f(Math.abs(dc(2, 19).dot), 1) + ' vs ' + A.f(Math.abs(dc(2, 3).dot), 1), 'WP points lost to a dot: over 19 vs over 3 of a chase'], ['0.93', 'correlation of the two channels with raw WPA'], ['≈ 10 runs', 'value of a wicket in High-tier moments']],
      subs: [['2.1', 'What is the job: score at the rate, survive, restrict or take a wicket?', 'Set by the state, not chosen by us: each ball is valued by how much it moves the result, so the runs-vs-wickets trade-off adjusts automatically (a wicket ≈ 10 runs in High-tier moments, ≈ 7 in Extreme ones).', ['measurement', 'm-dec']],
        ['2.2', 'Is each outcome valued by runs, or by how much it moves the result?', 'By how much it moves the result (win probability added), linearised into a runs channel and a wicket channel (0.93 correlation with raw WPA). Cards also report runs and wickets against expected.', ['measurement', 'm-ch']],
        ['2.3', 'Is a dot in the 3rd over worth the same as a dot in the 19th?', `No. In a live chase a dot costs ${A.f(Math.abs(dc(2, 3).dot), 2)} WP points in over 3 and ${A.f(Math.abs(dc(2, 19).dot), 2)} in over 19 (${A.f(Math.abs(dc(2, 20).dot), 1)} in over 20).`, ['questions', 'q-sec-2']],
        ['2.4', 'Which failures does the scorecard hide: playing safe, wides, a drop in pace?', `Playing safe = dots carry negative value when the rate climbs; wides/no-balls rise from ${A.pct(tb('wide/no-ball rate', 'bowling (all balls)').Ordinary)} to ${A.pct(tb('wide/no-ball rate', 'bowling (all balls)').Extreme)} of deliveries (the over-monitoring signature); pace change is reported where the tracker is valid (61% of balls).`, ['pressure', 'p-valid']]],
      interp: 'Valuing balls by match impact makes a late dot or a wide expensive and an early one cheap, as cricket intuition says.',
      biz: 'Selection should reward players whose value comes in high-leverage overs, not just aggregate strike rates.' },
    { n: 3, t: 'What should we have expected?', v: 'Yes, with gaps', chart: 'q3',
      stats: [[A.f(f1[3].ece, 3), '2nd-innings WP calibration error (holdout)'], [A.f(f1[0].calib_slope), '1st-innings calibration slope (over-confident)'], [A.f(D.f0.summary.kappa_q, 0) + ' balls', 'prior strength for opponent quality']],
      subs: [['3.1', 'Expected for whom: an average player, or this player on an ordinary day?', 'Both, kept separate: Level compares with an average player in the same High/Extreme moments; Clutch compares with the player’s own ordinary level within each season. The rating weights them 50/50.', ['explorer', 'x-scatter']],
        ['3.2', 'Expected given what: state, opponent quality, venue, competition and season?', `State, opponent (prior-only quality improved holdout log loss from ${A.f(D.f0.summary.chosen_logloss, 4)} to ${A.f(Math.min(...D.f0.kappa.map(k => k.holdout_logloss)), 4)}), competition and season. Venue is not modelled (difficulty, and no reliable venue baseline).`, ['measurement', 'm-models']],
        ['3.3', 'How do we separate the job changing from the mind changing?', 'The bowling-machine design: state holds the job constant (attacking at 14 an over when 14 is needed is expected), opponent quality holds the delivery constant; only the residual is credited.', ['measurement', 'm-ave']],
        ['3.4', 'Is the expectation itself accurate across situations?', `Second innings yes (calibration error ${A.f(f1[3].ece, 3)}, slope ${A.f(f1[3].calib_slope)}); first innings over-confident (slope ${A.f(f1[0].calib_slope)}). The recursion beats direct logistic and XGBoost in both innings.`, ['measurement', 'm-models']]],
      interp: 'The expectation is fair where it matters most (chases) and openly imperfect in first innings.',
      biz: 'Treat first-innings pressure ratings with a little more caution than chase ratings.' },
    { n: 4, t: 'Is the gap the player’s, and is it pressure’s?', v: 'Mostly', chart: 'q4',
      stats: [['within season', 'Clutch compares pressure with ordinary in the same season'], [A.f(D.check3.bat.corr_level_clutch) + ' / ' + A.f(D.check3.bowl.corr_level_clutch), 'Level–Clutch correlation (bat / bowl): distinct'], ['−0.32 / −0.42', 'pressure exposure vs usual level (bat / bowl)']],
      subs: [['4.1', 'How much depends on partners, field settings and captaincy?', 'Not separable in ball-by-ball data; expectations condition on the state the partnership created and on the bowler faced. Stated as a limitation.', ['measurement', 'm-limits']],
        ['4.2', 'Does the gap appear only in pressure moments, or also in ordinary ones (form, slump)?', 'Separated by design: Clutch is computed within each season, so a slump lowers both sides and cancels out.', ['explorer', 'x-seas']],
        ['4.3', 'Does captains’ trust distort who faces pressure moments?', 'Exposure is uneven (players who see more pressure have lower usual levels: ρ −0.32 batting, −0.42 bowling), but being trusted with hard overs earns nothing by itself; only beating the situation’s expectation does.', ['rankings', 'r-all']],
        ['4.4', 'Is a player who is excellent everywhere a pressure player, or simply a good player?', 'Both views are shown. Level and Clutch load on different components. Bumrah saves 1.86 runs/over vs expected under pressure, but has the best usual level of any bowler, so his Clutch is negative and the 50/50 rating leaves him mid-pack.', ['explorer', 'x-scatter', 'role=bowl&player=2933']]],
      interp: 'The rating isolates the player’s own contribution relative to the moment, except for partnership and captaincy effects.',
      biz: 'Read Level and Clutch separately: Level says who is good under pressure, Clutch says who lifts relative to themselves.' },
    { n: 5, t: 'Is it real and repeatable?', v: 'Only partly', chart: 'q5',
      stats: [[A.pct(D.noise_share.bat, 0), 'of batting Level spread is noise'], [A.f(st.bat.splithalf_Level_r.r) + ' / ' + A.f(st.bowl.splithalf_Level_r.r), 'split-half, runs-channel Level (bat / bowl)'], [`${K.survive_all_bat} / ${K.survive_all_bowl}`, 'top-10 players surviving all 10 settings']],
      subs: [['5.1', 'How much of the gap would luck alone produce, and how many balls are needed?', `Most of it: ${A.pct(D.noise_share.bat, 0)} of batting and ${A.pct(D.noise_share.bowl, 0)} of bowling Level spread is noise. Own data carries half the weight only after ${K.bar_bat} (bat) / ${K.bar_bowl} (bowl) pressure balls. Batters’ dismissal-under-pressure skill is indistinguishable from luck.`, ['measurement', 'm-shr']],
        ['5.2', 'Does pressure performance in 2022–23 predict 2024–26?', `Weakly. Runs-channel Level r = ${A.f(st.bat.period_Level_r.r)} (bat), Clutch r = ${A.f(st.bat.period_Clutch_r.r)} / ${A.f(st.bowl.period_Clutch_r.r)}; split-half on runs-channel Level ${A.f(st.bat.splithalf_Level_r.r)} / ${A.f(st.bowl.splithalf_Level_r.r)} (p < 0.05). Real but small, as in the baseball clutch literature.`, ['measurement', 'm-rel']],
        ['5.3', 'Does it carry across IPL and T20I, and across league and knockout?', `Partly across competitions (Clutch IPL vs T20I r = ${A.f(st.bat.ipl_vs_t20i_Clutch.r)} bat, ${A.f(st.bowl.ipl_vs_t20i_Clutch.r)} bowl); knockouts supply about 10% of pressure balls, too few for a knockout-only rating.`, ['measurement', 'm-rel']],
        ['5.4', 'Does any rating rest on a handful of moments or one match?', 'Not for the leaders: dropping any match moves Jaiswal, Nissanka, Kuldeep, Krunal and Hosein by 0 places. Some later names move 8–9 places.', ['rankings', 'r-stab']],
        ['5.5', 'How certain is each player’s rank?', 'Certain at the top, uncertain below: 1,000 match-level bootstrap resamples give each player a top-10 probability and 90% rank interval.', ['rankings', 'r-unc']]],
      interp: 'This is the binding constraint: pressure performance is real but noisy, and genuine “clutch” skill beyond being good is small.',
      biz: 'Lead with players whose top-10 probability is high; treat ranks 5–15 as interchangeable and decide on fit and price.' },
    { n: 6, t: 'Is the comparison fair?', v: 'Yes, with role caveats', chart: 'q6',
      stats: [[A.pct(D.fairness.bat.competitions.IPL.pressure_share_of_live_balls) + ' / ' + A.pct(D.fairness.bat.competitions.T20I.pressure_share_of_live_balls), 'IPL / T20I balls reaching pressure tiers'], [String(D.fairness.bat.roles.finisher.eligible_players), 'eligible finishers'], ['0 of 62', 'unknown Indians reaching the bar']],
      subs: [['6.1', 'Do all players get enough comparable pressure moments, or do finishers dominate?', `Top-order batters dominate exposure (${A.pct(D.fairness.bat.roles.top.share_of_pressure_balls, 0)} of batting pressure balls); only ${D.fairness.bat.roles.finisher.eligible_players} finishers and 1 death bowler reach the bar. Role rankings are provided.`, ['rankings', 'r-near']],
        ['6.2', 'Are IPL and T20I, full-member and associate games, and seasons comparable?', 'Yes after centring: expectations and centring are per league-year; associate games are their own context and weaker opposition is priced through opponent quality.', ['measurement', 'm-limits']],
        ['6.3', 'Should players be compared within roles, and can all-rounders appear in both lists?', 'Overall lists with role checks; Level shrinks toward the role-group mean. No player appears in both top 10s.', ['rankings', 'r-all']],
        ['6.4', 'Who is eligible, and does the Unstop dropdown limit the list?', `${K.eligible_bat} batters and ${K.eligible_bowl} bowlers (≥ ${K.bar_bat} / ${K.bar_bowl} pressure balls, ≥ 10 matches; bar amended to the runs channel and disclosed). Ranks 9–10 are breakout places for unknown Indian players. The dropdown was not available; reserves are listed.`, ['rankings', 'r-breakout']]],
      interp: 'Comparisons are fair across competitions and seasons; the sample bar is the main source of unfairness, addressed by role views and breakout places.',
      biz: 'For finishers and death specialists, use the role rankings rather than the overall list.' },
    { n: 7, t: 'So what?', v: 'Yes, with limits', chart: 'q7',
      stats: [['₹' + D.rr.ext.rr.purse_cr + ' cr', 'RR purse · ' + D.rr.ext.rr.slots + ' slots · ' + D.rr.ext.rr.overseas_slots + ' overseas'], ['2 High needs', 'death and middle-overs bowling'], [A.f(D.wsel.bat.info.best_r) + ' / ' + A.f(D.wsel.bowl.info.best_r), 'out-of-period predictive r (bat / bowl)']],
      subs: [['7.1', 'What decision does the ranking inform: death overs, chase batting order, auction targets?', 'For RR: IPL 2027 auction and trade targets. Batting is covered; the High needs are death bowling (Pathirana in the pool) and middle overs (Zampa, Hasaranga at auction; Kuldeep, Krunal, Axar by trade).', ['rr', 'rr-recs']],
        ['7.2', 'Does the rating predict future pressure performance better than overall averages?', 'No, not out of period: differences are within about one SE, and raw death economy predicts bowlers’ future pressure Level better (0.16 vs 0.06). Ratings describe who has performed, with uncertainty.', ['measurement', 'm-alt']],
        ['7.3', 'Where is each top-10 player most reliable?', 'Each player’s home cell and pressure ceiling on the 3×3, and who-carries type on the 2×2, are in the Explorer.', ['explorer', 'x-heat']],
        ['7.4', 'Which result will surprise the panel, and does the evidence hold?', 'Kuldeep, Krunal and Hosein lead the bowling, not Bumrah (holds: P(top 10) ≥ 0.92, jackknife 0). Kohli 34th: pressure SR 143 vs 149 ordinary on 735 balls (holds). Getting out is not a measurable pressure skill (robust).', ['rankings', 'r-top', 'role=bowl']]],
      interp: 'Useful for separating close candidates and for targeting RR’s bowling gaps; weak as a stand-alone forecaster.',
      biz: 'Shortlist on squad need and overall value first; use pressure ratings to separate otherwise-close options.' }
  ];

  A.register('questions', {
    title: 'Seven Questions — Answers and Evidence', sub: 'The framework’s question tree (1.1–7.4): verdicts, statistics, charts and business implications',
    render(root) {
      root.innerHTML = `<div class="callout blue" style="margin-bottom:14px"><b>The governing claim</b> — “player X performs best under pressure” — holds only if branches 1–6 hold; branch 7 asks whether it is useful. Branch 5 (repeatability) is the binding constraint. Click a branch to open it; every answer links to its evidence.</div>` +
        Q.map(q => `<div class="qsec ${q.n === 1 ? 'open' : ''}" id="q-sec-${q.n}"><div class="qhead"><span class="qn">Q${q.n}</span><span class="qt">${q.t}</span><span class="pill ${verdict[q.v]}">${q.v}</span></div>
          <div class="qbody"><div class="grid g2" style="margin:0">
            <div><div class="tiles">${q.stats.map(s => `<div class="tile"><div class="v">${s[0]}</div><div class="l">${s[1]}</div></div>`).join('')}</div>
              ${q.subs.map(s => `<div class="sub"><div class="id">${s[0]}</div><div><div class="q">${s[1]}</div><div class="a">${s[2]} ${A.evLink(s[3][0], s[3][1], 'Evidence →', s[3][2] || '')}</div></div></div>`).join('')}</div>
            <div>${A.cv('qc' + q.n, 'tall')}<div class="callout" style="margin-top:10px"><b>Interpretation.</b> ${q.interp}</div><div class="callout blue" style="margin-top:8px"><b>Business implication.</b> ${q.biz}</div></div>
          </div></div></div>`).join('');
      root.querySelectorAll('.qhead').forEach(h => h.onclick = () => { const s = h.parentElement; s.classList.toggle('open'); if (s.classList.contains('open')) this.drawChart(+s.id.split('-')[2]); });
      this.drawChart(1);
    },
    show(p) { if (p.anchor && p.anchor.startsWith('q-sec-')) { const s = document.getElementById(p.anchor); s.classList.add('open'); this.drawChart(+p.anchor.split('-')[2]); } },
    drawChart(n) {
      const id = 'qc' + n;
      const bar = (labels, data, colors, ytxt, fmt) => A.chart(id, { type: 'bar', data: { labels, datasets: [{ data, backgroundColor: colors }] }, options: { plugins: { legend: { display: false }, barLabels: { fmt } }, scales: { y: { title: { display: true, text: ytxt }, grace: '12%' }, x: { grid: { display: false } } } } });
      if (n === 1) bar(A.TIERS, A.TIERS.map(t => 100 * tb('dismissal rate')[t]), C.tiers, 'dismissal % per ball faced', v => v.toFixed(2) + '%');
      if (n === 2) { const ov = [1, 3, 6, 10, 15, 17, 19, 20]; A.chart(id, { type: 'line', data: { labels: ov.map(o => 'over ' + o), datasets: [
        { label: 'Chase: WP cost of a dot', data: ov.map(o => -dc(2, o).dot), borderColor: C.pink, backgroundColor: C.pink },
        { label: '1st innings: WP cost of a dot', data: ov.map(o => -dc(1, o).dot), borderColor: C.blue, backgroundColor: C.blue }] },
        options: { scales: { y: { title: { display: true, text: 'win-probability points lost (live balls)' } } } } }); }
      if (n === 3) A.chart(id, { type: 'bar', data: { labels: ['Innings 1', 'Innings 2'], datasets: ['WASP-style recursion (F0 -> F1)', 'Direct logistic with splines', 'Direct XGBoost, monotone'].map((m, i) => ({ label: m.replace(' (F0 -> F1)', ''), backgroundColor: [C.pink, '#b9b6d0', C.blue][i], data: [1, 2].map(k => f1.find(r => r.innings === k && r.model === m).ece) })) },
        options: { plugins: { barLabels: { fmt: v => v.toFixed(3) } }, scales: { y: { title: { display: true, text: 'calibration error on 2025–26 holdout (lower is better)' } }, x: { grid: { display: false } } } } });
      if (n === 4) { const types = ['Big-match performer', 'Pressure riser', 'Fade under pressure', 'Struggler']; A.chart(id, { type: 'bar', data: { labels: types, datasets: ['bat', 'bowl'].map((r, i) => ({ label: r === 'bat' ? 'Batters' : 'Bowlers', backgroundColor: i ? C.pink : C.blue, data: types.map(t => D.players[r].filter(p => p.eligible && p.response_type === t).length) })) },
        options: { plugins: { barLabels: { fmt: v => v } }, scales: { y: { title: { display: true, text: 'eligible players (usual level × Clutch)' }, ticks: { precision: 0 } }, x: { grid: { display: false } } } } }); }
      if (n === 5) { const ks = [['splithalf_Level_r', 'Level runs, split-half'], ['splithalf_Level_w', 'Level wickets, split-half'], ['splithalf_Clutch_r', 'Clutch, split-half'], ['period_Clutch_r', 'Clutch, 22–23 vs 24–26']];
        A.chart(id, { type: 'bar', data: { labels: ks.map(k => k[1]), datasets: ['bat', 'bowl'].map((r, i) => ({ label: r === 'bat' ? 'Batters' : 'Bowlers', backgroundColor: i ? C.pink : C.blue, data: ks.map(k => st[r][k[0]].r) })) },
          options: { plugins: { barLabels: { fmt: v => v.toFixed(2) } }, scales: { y: { title: { display: true, text: 'correlation between halves' } }, x: { grid: { display: false } } } } }); }
      if (n === 6) { const rl = ['top', 'middle', 'finisher']; const fr = D.fairness.bat.roles;
        A.chart(id, { type: 'bar', data: { labels: rl, datasets: [{ label: 'Share of batting pressure balls (%)', data: rl.map(r => 100 * fr[r].share_of_pressure_balls), backgroundColor: C.blue }, { label: 'Eligible batters', data: rl.map(r => fr[r].eligible_players), backgroundColor: C.pink }] },
          options: { plugins: { barLabels: { fmt: v => Math.round(v) } }, scales: { x: { grid: { display: false } } } } }); }
      if (n === 7) { const c = ['bat', 'bowl'].flatMap(r => D.check4[r].map(x => ({ ...x, r })));
        A.chart(id, { type: 'bar', data: { labels: D.check4.bat.map(x => x.rating.split(' (')[0].replace(', close games', '')), datasets: ['bat', 'bowl'].map((r, i) => ({ label: r === 'bat' ? 'Batters' : 'Bowlers', backgroundColor: i ? C.pink : C.blue, data: D.check4[r].map(x => x.predictive_r) })) },
          options: { plugins: { barLabels: { fmt: v => v.toFixed(2) } }, scales: { y: { title: { display: true, text: 'r with 2024–26 pressure Level' } }, x: { grid: { display: false } } } } }); }
    }
  });
})();
