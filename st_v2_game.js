// ── GAME STATE ──
let numPlayers   = 2;
let playerStates = [];
let curBI        = 0;
let curRound     = 1;
let diceRolled   = false;
let pendingDel   = null;
let floodResults = {};
let acePhaseIdx  = 0;
let roundHistory = []; // per-round summary for debrief

// ── HOUSE STATE HELPERS ──
function newHouse() {
  return { fMat:null, wMat:null, rMat:null, rooms:0, extraFloor:false, hasWalls:false, hasWalls2:false, hasRoof:false };
}

function houseCost(h) {
  if (!h.fMat) return 0;
  const fc = gm('foundation',h.fMat).cost;
  const wc = h.wMat ? gm('wall',h.wMat).cost : 0;
  const rc = h.rMat ? gm('roof',h.rMat).cost : 0;
  const floors = h.extraFloor ? 2 : 1;
  return fc * h.rooms * floors
       + (h.hasWalls  ? wc * h.rooms : 0)
       + (h.hasWalls2 ? wc * h.rooms : 0)
       + (h.hasRoof   ? rc * h.rooms : 0);
}

function houseComplete(h) {
  if (h.rooms === 0 || !h.fMat || !h.wMat || !h.rMat) return false;
  if (!h.hasWalls) return false;
  if (h.extraFloor && !h.hasWalls2) return false;
  return h.hasRoof;
}

function totalH(ps) {
  if (!ps.house.fMat) return 0;
  const h = ps.house;
  const fm = gm('foundation',h.fMat).hearts;
  const wm = h.wMat ? gm('wall',h.wMat).hearts : 0;
  const rm = h.rMat ? gm('roof',h.rMat).hearts : 0;
  const floors = h.extraFloor ? 2 : 1;
  const base = (fm + wm) * h.rooms * floors + (h.hasRoof ? rm : 0);
  return base;
}

// ── COMBINATION RULES ──
const wallOk = (fid, wid) => fid === 'mud_plinth' ? (wid==='mud_wall'||wid==='bamboo_mud') : true;
const roofOk = (wid, rid) => (wid==='mud_wall'||wid==='bamboo_mud') ? (rid==='thatch'||rid==='metal') : true;

function getIncompat(type, matId, h) {
  if (type === 'wall' && h.fMat && !wallOk(h.fMat, matId))
    return 'Cannot place on ' + gm('foundation',h.fMat).name;
  if (type === 'roof' && h.wMat && !roofOk(h.wMat, matId))
    return 'Cannot place on ' + gm('wall',h.wMat).name;
  return null;
}

function canAfford(ps, type, matId) {
  const mat = gm(type, matId);
  const h = ps.house;
  const floors = type === 'foundation' && h.extraFloor ? 0 : 1; // simplified
  let addCost = mat.cost;
  if (type === 'foundation' && h.rooms > 0 && !h.extraFloor) {
    // adding a side room: cost * existing floors
    addCost = mat.cost * (h.extraFloor ? 2 : 1);
  }
  if (type === 'foundation' && h.hasWalls) {
    // stacking: new floor = fMat + wMat per room
    addCost = mat.cost * h.rooms;
  }
  if (type === 'wall') addCost = mat.cost * h.rooms;
  if (type === 'roof')  addCost = mat.cost * h.rooms;
  return ps.coins >= addCost;
}

// ── PLACE BLOCK FROM 3D DROP ──
window.onBlockDropped = function(dropped) {
  const ps = playerStates[curBI];
  const h  = ps.house;
  const { type, matId, slot } = dropped;

  const incompat = getIncompat(type, matId, h);
  if (incompat) { showHint(incompat); return; }

  const mat = gm(type, matId);
  if (!mat) return;

  let cost = 0;

  if (type === 'foundation') {
    if (slot.kind === 'found-new') {
      cost = mat.cost;
      h.fMat  = matId;
      h.rooms = 1;
    } else if (slot.kind === 'found-side') {
      if (h.fMat && h.fMat !== matId) { showHint('All rooms must use the same foundation material.'); return; }
      cost = mat.cost * (h.extraFloor ? 2 : 1);
      h.fMat  = matId;
      h.rooms++;
      // Adjust wall count costs if walls already placed
    } else if (slot.kind === 'found-stack') {
      cost = mat.cost * h.rooms;
      h.fMat       = matId;
      h.extraFloor = true;
    }
  } else if (type === 'wall') {
    if (h.rooms === 0) { showHint('Place a foundation first.'); return; }
    if (h.wMat && h.wMat !== matId && !slot.kind.includes('f2')) {
      showHint('All rooms must use the same wall material. Remove existing walls first.'); return;
    }
    if (!roofOk(matId, h.rMat || 'thatch') && h.hasRoof) {
      showHint('Incompatible with existing roof — remove roof first.'); return;
    }
    cost = mat.cost * h.rooms;
    if (slot.kind === 'wall-f1') {
      h.wMat     = matId;
      h.hasWalls = true;
    } else if (slot.kind === 'wall-f2') {
      h.hasWalls2 = true;
    }
  } else if (type === 'roof') {
    if (!h.hasWalls) { showHint('Add walls before placing a roof.'); return; }
    if (!roofOk(h.wMat, matId)) {
      showHint(getIncompat('roof', matId, h)); return;
    }
    cost = mat.cost * h.rooms;
    h.rMat    = matId;
    h.hasRoof = true;
  }

  if (ps.coins < cost) { showHint(`Not enough coins — need ${cost}, have ${ps.coins}.`); return; }
  ps.coins -= cost;

  updateHouse3D(ps);
  renderBuild();
};

// Remove component
function removeComponent(ps, what) {
  const h = ps.house;
  let refund = 0;

  if (what === 'roof' && h.hasRoof) {
    refund = gm('roof',h.rMat).cost * h.rooms;
    h.hasRoof = false; h.rMat = null;
  } else if (what === 'walls2' && h.hasWalls2) {
    refund = gm('wall',h.wMat).cost * h.rooms;
    h.hasWalls2 = false;
    h.extraFloor = false; // removing 2nd floor walls collapses extra floor
  } else if (what === 'walls' && h.hasWalls) {
    if (h.hasRoof) { showHint('Remove roof first.'); return; }
    if (h.hasWalls2) { showHint('Remove 2nd floor walls first.'); return; }
    refund = gm('wall',h.wMat).cost * h.rooms * (h.extraFloor ? 1 : 1);
    h.hasWalls = false; h.wMat = null;
  } else if (what === 'extraFloor') {
    if (h.hasWalls2) { showHint('Remove 2nd floor walls first.'); return; }
    refund = gm('foundation',h.fMat).cost * h.rooms;
    h.extraFloor = false;
  } else if (what === 'rooms') {
    if (h.hasWalls || h.hasRoof) { showHint('Remove walls and roof first.'); return; }
    if (h.rooms <= 1) { // remove all foundation
      refund = gm('foundation',h.fMat).cost;
      h.rooms = 0; h.fMat = null;
    } else {
      refund = gm('foundation',h.fMat).cost;
      h.rooms--;
    }
  }

  if (refund > 0) ps.coins += refund;
  updateHouse3D(ps);
  renderBuild();
}

// ── DAMAGE CALC ──
function adjP(base, ft) {
  if (!ft) return [...base];
  const pen = ft===1?18:38; let[s,r,c]=base;
  s = Math.max(2,s-pen); const sh=base[0]-s;
  r += Math.round(sh*0.55); c += Math.round(sh*0.45);
  const tot=s+r+c, ns=Math.round(s/tot*100), nr=Math.round(r/tot*100);
  return [ns, nr, 100-ns-nr];
}
function shiftP(base, mod) {
  if (mod >= 1) return [...base];
  let[s,r,c]=base; r=Math.round(r*mod); c=Math.round(c*mod);
  return [100-r-c, r, c];
}
const rollD = p => { const r=Math.random()*100; return r<p[0]?0:r<p[0]+p[1]?1:2; };

function calcDamage(ps, level) {
  const h = ps.house;
  const mods = { fMod:1, wMod:1, rMod:1, wForced:false, rForced:false };
  (ps.aceCards||[]).filter(c=>c.usedThisRound).forEach(c=>c.apply(mods));

  // Foundation
  let fProbs = shiftP([...DP.foundation[h.fMat||'mud_plinth'][level]], mods.fMod);
  if (h.extraFloor && level < 3) fProbs = shiftP(fProbs, 0.75); // stacking bonus for foundation
  const fDmg = h.fMat ? rollD(fProbs) : 2;

  // Wall
  let wDmg = 0;
  if (!h.hasWalls) { wDmg = 2; }
  else if (mods.wForced) { wDmg = 0; }
  else {
    let wp = adjP([...DP.wall[h.wMat||'mud_wall'][level]], fDmg);
    wp = shiftP(wp, mods.wMod);
    // Stacking bonus: 2nd floor walls protected at levels 1-2
    if (h.extraFloor && h.hasWalls2 && level < 3) wp = shiftP(wp, 0.6);
    wDmg = rollD(wp);
    if (fDmg === 2) wDmg = 2; // cascade
  }

  // Roof
  let rDmg = 0;
  if (h.hasRoof && h.rMat) {
    if (mods.rForced) { rDmg = 0; }
    else {
      let rp = adjP([...DP.roof[h.rMat][level]], wDmg);
      rp = shiftP(rp, mods.rMod);
      rDmg = rollD(rp);
    }
  }

  const overall = Math.max(fDmg, wDmg, rDmg);
  return { fDmg, wDmg, rDmg, overall };
}

// ── ASSIGN PLOTS ──
function doAssign() {
  const names = Array.from(document.querySelectorAll('.ninput')).map((inp,i)=>inp.value.trim()||`Player ${i+1}`);
  const shuffled = PLOT_DATA.slice().sort(() => Math.random()-0.5);
  let ni = 0;
  playerStates = shuffled.map((p,i) => ({
    name:      i < names.length ? names[i] : NPC_NAMES[ni++],
    plotNum:   p.num, zone: p.zone, col: p.col,
    isPlayer:  i < names.length,
    coins:     0, house: newHouse(),
    aceCards:  [],
    lastDamage:null,
  }));
  playerStates.sort((a,b) => a.plotNum-b.plotNum);

  // NPC villagers: basic mud house
  playerStates.filter(p => !p.isPlayer).forEach(p => {
    p.house = { fMat:'mud_plinth', wMat:'mud_wall', rMat:'thatch', rooms:1, extraFloor:false, hasWalls:true, hasWalls2:false, hasRoof:true };
    updateHouse3D(p);
  });

  // Deal ace cards
  playerStates.filter(p => p.isPlayer).forEach(p => {
    p.aceCards = ACE_POOL.slice().sort(()=>Math.random()-0.5).slice(0,2).map(c=>({...c,used:false,usedThisRound:false}));
  });

  // Render assign cards
  document.getElementById('aGrid').innerHTML = playerStates.map(a =>
    `<div class="acard ${a.isPlayer?'pc':''}">
      <div class="atop" style="background:${a.col}">Plot ${a.plotNum} · ${a.zone}</div>
      <div class="abody">
        <div class="aname">${a.name}</div>
        <div class="azone" style="color:${a.col}">${a.zone} zone</div>
        <span class="atag ${a.isPlayer?'':'npc'}">${a.isPlayer?'Player':'Villager'}</span>
      </div></div>`).join('');

  // Show ace card preview for players
  const preview = document.getElementById('acePreview');
  preview.innerHTML = '<div class="section-title" style="text-align:center;margin-bottom:10px">Your ace cards</div>'
    + playerStates.filter(p=>p.isPlayer).map(p =>
    `<div style="margin-bottom:8px;font-size:11px;color:rgba(255,255,255,.6)">
      <span style="color:${p.col};font-weight:600">${p.name}:</span>
      <span class="ace-preview-row" style="display:inline-flex;gap:4px;margin-left:6px">
        ${p.aceCards.map(c=>`<span class="ace-pip">${c.icon} ${c.name}</span>`).join('')}
      </span>
    </div>`).join('');

  showScr('as');
}

// ── BUILD FLOW ──
function startBuilding() {
  curBI = playerStates.findIndex(p => p.isPlayer);
  showScr('bs');
  zoomToPlot(playerStates[curBI].plotNum);
  renderBuild();
}

function confirmBuild() {
  const ps = playerStates[curBI];
  const players = playerStates.filter(p => p.isPlayer);
  const pi = players.indexOf(ps);

  // Save round snapshot for debrief
  if (!ps.roundLog) ps.roundLog = [];
  ps.roundLog.push({ round: curRound, house: JSON.parse(JSON.stringify(ps.house)) });

  if (pi < players.length - 1) {
    const next = players[pi + 1];
    curBI = playerStates.indexOf(next);
    // Show brief player toast (no full handoff screen)
    showPlayerToast(next.name, () => {
      zoomToPlot(next.plotNum);
      renderBuild();
    });
  } else {
    startFlood();
  }
}

function startNextTurn() { showScr('bs'); renderBuild(); }

// ── FLOOD PHASE ──
function startFlood() {
  playerStates.forEach(ps => (ps.aceCards||[]).forEach(c => c.usedThisRound=false));
  floodResults = {};
  playerStates.filter(p => p.isPlayer).forEach(p => {
    floodResults[p.plotNum] = calcDamage(p, curRound);
  });
  acePhaseIdx = 0;
  showFloodWater(curRound);
  zoomOut();
  showScr('fs');
  renderFloodScreen();
}

function useAceCard(plotNum, cardId) {
  const ps = playerStates.find(p => p.plotNum === plotNum);
  const card = (ps.aceCards||[]).find(c => c.id === cardId);
  if (!card || !card.valid(ps)) return;
  card.used = true; card.usedThisRound = true;
  floodResults[plotNum] = calcDamage(ps, curRound);
  const el = document.getElementById(`fcard-${plotNum}`);
  if (el) el.outerHTML = damageCardHTML(ps);
  acePhaseIdx++;
  renderAcePhase();
}

function skipAce() { acePhaseIdx++; renderAcePhase(); }

function endFloodRound() {
  const roundSnap = { round: curRound, results: {} };
  playerStates.filter(p => p.isPlayer).forEach(ps => {
    ps.lastDamage = floodResults[ps.plotNum] || null;
    roundSnap.results[ps.plotNum] = { ...ps.lastDamage, house: JSON.parse(JSON.stringify(ps.house)) };
    if (ps.lastDamage) applyDamage(ps, ps.lastDamage);
  });
  roundHistory.push(roundSnap);
  hideFloodWater();

  if (curRound < 3) {
    curRound++;
    const fi = playerStates.findIndex(p => p.isPlayer);
    curBI = fi;
    zoomToPlot(playerStates[fi].plotNum);
    // Collapsed players get free starter house
    playerStates.filter(p => p.isPlayer && p.lastDamage?.overall === 2).forEach(p => {
      p.house = { fMat:'mud_plinth', wMat:'mud_wall', rMat:'thatch', rooms:1, extraFloor:false, hasWalls:true, hasWalls2:false, hasRoof:true };
      updateHouse3D(p);
    });
    showScr('bs');
    diceRolled = false;
    renderBuild();
  } else {
    showDebrief();
  }
}

function applyDamage(ps, res) {
  const h = ps.house;
  if (res.fDmg === 2) { ps.house = newHouse(); updateHouse3D(ps); return; }
  if (res.wDmg === 2) { h.hasWalls=false; h.wMat=null; h.hasWalls2=false; h.hasRoof=false; h.rMat=null; h.extraFloor=false; }
  if (res.rDmg === 2) { h.hasRoof=false; h.rMat=null; }
  updateHouse3D(ps);
}

function showDebrief() {
  zoomOut();
  showScr('dbs');
  renderDebrief();
}
