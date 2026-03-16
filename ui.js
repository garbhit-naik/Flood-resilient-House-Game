// ── SCREEN MANAGEMENT ──
const SCREENS = ['hs','ns','as','bs','fs','dbs'];
function showScr(id) { SCREENS.forEach(s => document.getElementById(s)?.classList.toggle('on', s===id)); }

function showPlayerToast(name, cb) {
  const t = document.getElementById('turnToast');
  const inner = document.getElementById('turnToastInner');
  inner.innerHTML = `<div style="font-size:36px;margin-bottom:10px">👤</div>
    <div style="font-size:26px;font-weight:500;margin-bottom:6px">${name}'s turn</div>
    <div style="font-size:12px;color:rgba(255,255,255,.4)">Round ${curRound} of 3</div>`;
  t.classList.add('on');
  setTimeout(() => { t.classList.remove('on'); if(cb) cb(); }, 1600);
}

// ── HOME ──
function selP(n, el) {
  numPlayers = n;
  document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  const b = document.getElementById('startBtn');
  b.disabled = false;
  b.textContent = `Start with ${n} players →`;
}
function showNameScreen() {
  const g = document.getElementById('nInputs'); g.innerHTML = '';
  for (let i=0;i<numPlayers;i++) {
    const d = document.createElement('div'); d.className = 'ncard';
    d.innerHTML = `<div class="ncard-l">Player ${i+1}</div><input class="ninput" type="text" placeholder="Enter name" maxlength="18"/>`;
    g.appendChild(d);
  }
  showScr('ns');
  setTimeout(() => document.querySelector('.ninput')?.focus(), 100);
}

// ── BUILD SCREEN ──
function renderBuild() {
  const ps = playerStates[curBI];
  const players = playerStates.filter(p => p.isPlayer);
  const pNum = players.indexOf(ps) + 1;
  const h = ps.house;

  document.getElementById('bRound').textContent = `Round ${curRound} of 3`;
  document.getElementById('bPlot').innerHTML = `<span style="color:${ps.col}">Plot ${ps.plotNum}</span>`;
  document.getElementById('bName').textContent = `${ps.name}'s turn`;
  document.getElementById('bSub').textContent  = `Player ${pNum} of ${players.length} · ${ps.zone}`;
  if (!diceRolled) {
    document.getElementById('d1').textContent = document.getElementById('d2').textContent = '?';
    document.getElementById('rRes').textContent = '';
    document.getElementById('rBtn').disabled = false;
  }

  updCoins(ps);
  renderBuildStatus(ps);
  renderPal(ps);
  updStats(ps);
  renderHUD();

  const hint = document.getElementById('bHint');
  if (!diceRolled) hint.textContent = 'Roll dice first to earn your coin budget';
  else if (!houseComplete(h)) hint.textContent = 'Drag material cards onto your plot in the 3D view';
  else hint.textContent = 'House complete — confirm when ready';

  const btn = document.getElementById('confirmBtn');
  if (!houseComplete(h)) {
    btn.disabled = true;
    if (!h.fMat || h.rooms===0)       btn.textContent = 'Place a foundation first';
    else if (!h.hasWalls)              btn.textContent = 'Add walls to all rooms';
    else if (h.extraFloor && !h.hasWalls2) btn.textContent = 'Add 2nd floor walls';
    else if (!h.hasRoof)               btn.textContent = 'Add a roof to finish';
    else                               btn.textContent = 'Complete your house first';
  } else {
    btn.disabled = false;
    btn.textContent = 'Confirm Build →';
  }
}

function updCoins(ps) {
  document.getElementById('cVal').textContent = `${ps.coins} coins`;
  const n = Math.min(ps.coins, 18);
  document.getElementById('cIcons').innerHTML =
    Array.from({length:n},()=>'<span class="ci"></span>').join('') +
    (ps.coins>18 ? `<span style="font-size:10px;color:rgba(255,255,255,.4)"> +${ps.coins-18}</span>` : '');
}

function renderBuildStatus(ps) {
  const h = ps.house;
  const floors = h.extraFloor ? 2 : 1;
  const fLabel = h.fMat ? `${gm('foundation',h.fMat).name.split(' ')[0]} ×${h.rooms}${h.extraFloor?' (×2 floors)':''}` : '—';
  const wLabel = h.wMat ? `${gm('wall',h.wMat).name.split(' ')[0]}${h.extraFloor?' (×2 floors)':''}` : (h.rooms>0?'needed':'—');
  const rLabel = h.rMat ? gm('roof',h.rMat).name.split(' ')[0] : (h.hasWalls?'needed':'—');
  const fDone  = h.rooms > 0;
  const wDone  = h.hasWalls && (!h.extraFloor || h.hasWalls2);
  const rDone  = h.hasRoof;

  document.getElementById('buildStatus').innerHTML = [
    { lbl:'Foundation', val:fLabel, done:fDone, extra:h.extraFloor?'stacked':h.rooms>1?`${h.rooms} rooms`:'', key:'rooms' },
    { lbl:'Walls',      val:wLabel, done:wDone, extra:'', key:'walls' },
    { lbl:'Roof',       val:rLabel, done:rDone, extra:'', key:'roof'  },
  ].map(b => {
    const cls = b.done ? 'done' : (b.val!=='—'&&b.val!=='needed'?'partial':'');
    const removeBtn = b.done ? `<button class="rem-btn" onclick="removeComponent(playerStates[curBI],'${b.key}')">−</button>` : '';
    return `<div class="bstat-box ${cls}">
      ${removeBtn}
      <div class="bstat-lbl">${b.lbl}</div>
      <div class="bstat-val">${b.val}</div>
      ${b.extra?`<div class="bstat-sub">${b.extra}</div>`:''}
    </div>`;
  }).join('');
}

function renderPal(ps) {
  const h = ps.house;
  [['foundation','pF'],['wall','pW'],['roof','pR']].forEach(([type, id]) => {
    document.getElementById(id).innerHTML = MATS[type].map(mat => {
      const incompat = getIncompat(type, mat.id, h);
      const locked   = !!incompat || !diceRolled;
      const hr = '♥'.repeat(mat.hearts) + '♡'.repeat(6-mat.hearts);
      return `<div class="mc ${locked?'locked':''}"
        draggable="${diceRolled && !incompat}"
        ondragstart="startDrag(event,'${type}','${mat.id}')"
        ondragend="window.sceneDragEnd()">
        <div class="mc-l">
          <div class="mc-n" style="color:${mat.col}">${mat.name}</div>
          <div class="mc-h">${hr}</div>
          ${incompat ? `<div class="mc-incompat">${incompat}</div>` : ''}
        </div>
        <div class="mc-c">${mat.cost} coins</div>
      </div>`;
    }).join('');
  });
}

function startDrag(e, type, matId) {
  if (!diceRolled) { e.preventDefault(); showHint('Roll the dice first!'); return; }
  const incompat = getIncompat(type, matId, playerStates[curBI].house);
  if (incompat) { e.preventDefault(); showHint(incompat); return; }
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', JSON.stringify({type, matId}));
  e.currentTarget.classList.add('dragging');
  window.sceneDragStart(type, matId);
}

function updStats(ps) {
  const h = ps.house;
  const hearts = totalH(ps);
  const spent  = ps.coins; // coins already deducted in place
  document.getElementById('stH').textContent = hearts > 0 ? `${hearts} ♥` : '—';
  document.getElementById('stC').textContent = houseCost(h) > 0 ? `${houseCost(h)} coins` : '—';
  document.getElementById('stL').textContent = `${ps.coins} coins`;
}

function renderHUD() {
  const htmlFn = id => playerStates.filter(p => p.isPlayer).map(p => {
    const a = p === playerStates[curBI];
    return `<div class="phud ${a?'active':''}">
      <div class="phud-dot" style="background:${p.col}"></div>
      <span class="phud-n" style="${a?'color:#378ADD':''}">${a?'▶ ':''}${p.name}</span>
      <span class="phud-h">${'♥'.repeat(Math.min(totalH(p),9))}</span>
    </div>`;
  }).join('');
  document.getElementById('lHud').innerHTML = htmlFn('lHud');
  const fh = document.getElementById('fHud');
  if (fh) fh.innerHTML = htmlFn('fHud');
}

function showHint(msg) {
  const b = document.getElementById('hintbar');
  b.innerHTML = `<span class="hlbl">Rule</span>${msg}`;
  b.className = 'hintbar on';
  clearTimeout(b._t);
  b._t = setTimeout(() => b.className = 'hintbar', 3800);
}

// ── DICE ──
function rollDice() {
  if (diceRolled) return;
  document.getElementById('rBtn').disabled = true;
  const faces = ['⚀','⚁','⚂','⚃','⚄','⚅']; let t=0,d1,d2;
  document.getElementById('d1').classList.add('spin');
  document.getElementById('d2').classList.add('spin');
  const iv = setInterval(() => {
    d1 = Math.floor(Math.random()*6)+1; d2 = Math.floor(Math.random()*6)+1;
    document.getElementById('d1').textContent = faces[d1-1];
    document.getElementById('d2').textContent = faces[d2-1];
    if (++t >= 14) {
      clearInterval(iv);
      document.getElementById('d1').classList.remove('spin');
      document.getElementById('d2').classList.remove('spin');
      const tot = d1+d2, ps = playerStates[curBI];
      ps.coins += tot; diceRolled = true;
      document.getElementById('rRes').textContent = `+${tot} coins! Total: ${ps.coins}`;
      updCoins(ps); renderPal(ps); updStats(ps);
    }
  }, 75);
}

// ── DELETE POPUP ──
let pendingDelData = null;
function openDel(what) {
  pendingDelData = what;
  document.getElementById('delT').textContent = `Remove ${what}?`;
  document.getElementById('delS').textContent = 'Coins will be refunded.';
  document.getElementById('dp').classList.add('on');
}
function confirmDelete() {
  if (pendingDelData) removeComponent(playerStates[curBI], pendingDelData);
  closeDelete();
}
function closeDelete() { pendingDelData = null; document.getElementById('dp').classList.remove('on'); }

// ── FLOOD SCREEN ──
function renderFloodScreen() {
  const meta = FLOOD_META[curRound];
  document.getElementById('fRoundTag').textContent = `Round ${curRound} of 3`;
  document.getElementById('fLevelName').textContent = meta.name;
  document.getElementById('fLevelName').style.color  = meta.col;
  document.getElementById('fLevelDesc').textContent = meta.desc;
  document.getElementById('fCards').innerHTML = playerStates.filter(p=>p.isPlayer).map(p=>damageCardHTML(p)).join('');
  renderAcePhase();
  renderHUD();
}

function damageCardHTML(ps) {
  const res = floodResults[ps.plotNum]; if (!res) return '';
  const ov  = TIERS[res.overall];
  const sc  = generateScenario(ps, res, curRound);

  const usedBadges = (ps.aceCards||[]).filter(c=>c.usedThisRound).map(c =>
    `<span style="font-size:10px;padding:2px 8px;border-radius:999px;background:${c.bg};color:${c.color};border:.5px solid ${c.color}40">${c.icon} ${c.name}</span>`).join(' ');

  // Component scenario blocks
  const scenarioBlocks = [];

  if (sc.foundText) {
    const fTier = TIERS[sc.fTier];
    scenarioBlocks.push(`
      <div class="scenario-block" style="border-color:${fTier.col}">
        <div class="scenario-title" style="color:${fTier.col}">${fTier.icon} Foundation — ${fTier.short}</div>
        <div class="scenario-text">${sc.foundText}</div>
      </div>`);
  }
  if (sc.wallText) {
    const wTier = TIERS[sc.wTier];
    scenarioBlocks.push(`
      <div class="scenario-block" style="border-color:${wTier.col}">
        <div class="scenario-title" style="color:${wTier.col}">${wTier.icon} Walls — ${wTier.short}</div>
        <div class="scenario-text">${sc.wallText}</div>
      </div>`);
  }
  if (sc.roofText) {
    const rTier = TIERS[sc.rTier];
    scenarioBlocks.push(`
      <div class="scenario-block" style="border-color:${rTier.col}">
        <div class="scenario-title" style="color:${rTier.col}">${rTier.icon} Roof — ${rTier.short}</div>
        <div class="scenario-text">${sc.roofText}</div>
      </div>`);
  }

  return `<div class="fcard" id="fcard-${ps.plotNum}">
    <div class="fcard-top" style="background:${ov.bg};border-bottom:.5px solid ${ov.col}25">
      <div class="fcard-top-row">
        <div>
          <div class="fcard-name">${ps.name}</div>
          <div class="fcard-zone" style="color:${ps.col}">Plot ${ps.plotNum} · ${ps.zone}</div>
        </div>
        <div class="fcard-verdict" style="color:${ov.col};background:rgba(0,0,0,.25);border:.5px solid ${ov.col}50">
          ${ov.icon} ${ov.label}
        </div>
      </div>
      ${usedBadges ? `<div class="ace-used-row" style="margin-top:8px">${usedBadges}</div>` : ''}
    </div>
    <div class="fcard-body">
      ${scenarioBlocks.join('')}
      <div class="scenario-insight">💡 ${sc.insight}</div>
    </div>
  </div>`;
}

// ── ACE CARD PHASE ──
function renderAcePhase() {
  const players = playerStates.filter(p => p.isPlayer);
  const panel   = document.getElementById('acePanel');

  if (acePhaseIdx >= players.length) {
    panel.innerHTML = `<div class="ace-done">
      <div class="ace-done-title">All ace cards decided</div>
      <button class="sbtn" onclick="endFloodRound()">See results &amp; continue →</button>
    </div>`;
    return;
  }

  const ps    = players[acePhaseIdx];
  const avail = (ps.aceCards||[]).filter(c => !c.used && !c.usedThisRound);

  panel.innerHTML = `
    <div class="ace-phase-tag" style="background:${ps.col}22;color:${ps.col};border:.5px solid ${ps.col}50">${ps.name} — Ace Cards</div>
    <div class="ace-phase-sub">Play a card to reduce your damage, or skip.</div>
    <div class="ace-cards-row">
      ${avail.length ? avail.map(c => {
        const v = c.valid(ps);
        return `<div class="ace-card ${v?'':'ace-locked'}" onclick="${v?`useAceCard(${ps.plotNum},'${c.id}')`:''}" >
          <div class="ace-card-icon" style="background:${c.bg};border-color:${c.color}40">${c.icon}</div>
          <div class="ace-card-name" style="color:${c.color}">${c.name}</div>
          <div class="ace-card-desc">${c.desc}</div>
          ${!v?'<div style="font-size:9px;color:rgba(232,144,32,.8);margin-top:4px;font-style:italic">Cannot apply to your current wall type.</div>':''}
        </div>`;
      }).join('') : '<div style="font-size:12px;color:rgba(255,255,255,.3);padding:6px 0">No cards available.</div>'}
    </div>
    <button class="ace-skip-btn" onclick="skipAce()">Skip →</button>`;
}

// ── DEBRIEF ──
function renderDebrief() {
  const players  = playerStates.filter(p => p.isPlayer);
  const sorted   = [...players].sort((a,b) => totalH(b)-totalH(a));
  const winner   = sorted[0];
  const allSafe  = sorted.every(p => p.lastDamage?.overall < 2);
  const learnings = getDynamicLearnings(players);

  // ── LEFT PANEL ──
  const left = document.getElementById('debriefLeft');

  const winnerHTML = winner.lastDamage?.overall === 2
    ? `<div class="winner-icon">😔</div>
       <div class="winner-name" style="color:rgba(255,255,255,.6)">All houses collapsed</div>
       <div class="winner-sub">A powerful result for discussion — what would you build differently?</div>`
    : `<div class="winner-icon">🏆</div>
       <div class="winner-name">${winner.name} wins!</div>
       <div class="winner-sub">Most hearts remaining after 3 floods · Plot ${winner.plotNum} · ${winner.zone}</div>`;

  const finalScores = sorted.map((p,i) => {
    const h = totalH(p);
    return `<div class="score-row">
      <div class="score-rank" style="color:${['#fcd462','#a0a0a0','#cd7f32','rgba(255,255,255,.4)'][Math.min(i,3)]}">#${i+1}</div>
      <div>
        <div class="score-name">${p.name}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.4)">Plot ${p.plotNum} · ${p.zone}</div>
      </div>
      <div class="score-hearts">${'♥'.repeat(Math.min(h,10))} <span style="color:rgba(255,255,255,.4);font-size:11px">${h}</span></div>
    </div>`;
  }).join('');

  // Round-by-round log
  const roundLog = [1,2,3].map(rnd => {
    const rMeta = FLOOD_META[rnd];
    const rows = players.map(pl => {
      const snap = roundHistory.find(r=>r.round===rnd);
      const res  = snap?.results[pl.plotNum];
      const h    = res?.house;
      const tier = res ? res.overall : null;
      const mats = h ? [
        h.fMat  ? gm('foundation',h.fMat).name.split(' ')[0]  : '—',
        h.wMat  ? gm('wall',h.wMat).name.split(' ')[0]        : '—',
        h.rMat  ? gm('roof',h.rMat).name.split(' ')[0]        : '—',
      ].join(' + ') : 'No data';
      const pill = tier !== null ? `<span class="pr-pill pr-pill-${tier}">${TIERS[tier].short}</span>` : '';
      return `<div class="player-result-row">
        <div class="pr-dot" style="background:${pl.col}"></div>
        <div class="pr-name" style="color:${pl.col}">${pl.name}</div>
        <div class="pr-mats">${mats}</div>
        ${pill}
      </div>`;
    }).join('');
    return `<div class="round-block">
      <div class="rb-header">
        <div class="rb-num" style="background:${rMeta.col}">${rnd}</div>
        <div><div class="rb-title">${rMeta.name}</div></div>
      </div>
      ${rows}
    </div>`;
  }).join('');

  left.innerHTML = `
    <div class="debrief-title">Game Over</div>
    <div class="debrief-sub">3 floods survived. Here's what happened and what it teaches us.</div>
    <div class="winner-block">${winnerHTML}</div>
    <div class="section-title">Final standings</div>
    <div class="final-scores" style="margin-bottom:1.5rem">${finalScores}</div>
    <div class="section-title">Round by round</div>
    ${roundLog}
    <button class="sbtn" style="margin-top:1rem" onclick="location.reload()">Play Again →</button>
  `;

  // ── RIGHT PANEL ──
  const right = document.getElementById('debriefRight');
  const learningsHTML = learnings.map(l =>
    `<div class="learning-item"><span class="learning-icon">${l.icon}</span><span>${l.text}</span></div>`).join('');
  const questionsHTML = REFLECTION_QUESTIONS.map(q =>
    `<div class="reflection-q">${q.icon} ${q.q}</div>`).join('');

  right.innerHTML = `
    <div class="section-title" style="margin-bottom:12px">Key learnings</div>
    ${learningsHTML}
    <div style="height:1px;background:rgba(255,255,255,.08);margin:1.25rem 0"></div>
    <div class="section-title" style="margin-bottom:12px">Reflection questions</div>
    <div style="font-size:11px;color:rgba(255,255,255,.3);margin-bottom:12px;line-height:1.6">Use these questions to guide a group discussion after the game.</div>
    ${questionsHTML}
  `;
}
