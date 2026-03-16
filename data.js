// ── MATERIALS ──
const MATS = {
  foundation: [
    { id:'mud_plinth',  name:'Raised Mud Plinth',     cost:1, hearts:2, col:'#8B6914' },
    { id:'stone_mud',   name:'Stone & Mud Plinth',     cost:2, hearts:3, col:'#7A7060' },
    { id:'concrete_f',  name:'Concrete Foundation',    cost:4, hearts:6, col:'#9A9A9A' },
  ],
  wall: [
    { id:'mud_wall',    name:'Mud Walls',              cost:1, hearts:2, col:'#C07838' },
    { id:'bamboo_mud',  name:'Bamboo & Mud Walls',     cost:2, hearts:3, col:'#B89050' },
    { id:'brick_wall',  name:'Brick & Cement Walls',   cost:4, hearts:6, col:'#D0D0D0' },
  ],
  roof: [
    { id:'thatch',      name:'Thatch Roof',            cost:1, hearts:2, col:'#8B5E14', shape:'slope' },
    { id:'metal',       name:'Corrugated Metal Sheets',cost:2, hearts:4, col:'#C0392B', shape:'slope' },
    { id:'concrete_r',  name:'Concrete Roof',          cost:4, hearts:5, col:'#BCBCBC', shape:'flat'  },
  ],
};
Object.values(MATS).flat().forEach(m => m.colH = parseInt(m.col.slice(1), 16));
const gm = (type, id) => MATS[type].find(m => m.id === id);

// ── DAMAGE TABLES — [safe%, repairs%, destroyed%] per flood level ──
const DP = {
  foundation: {
    concrete_f: { 1:[78,18,4],  2:[52,36,12], 3:[30,48,22] },
    stone_mud:  { 1:[72,22,6],  2:[38,42,20], 3:[14,45,41] },
    mud_plinth: { 1:[68,24,8],  2:[22,45,33], 3:[5,28,67]  },
  },
  wall: {
    brick_wall: { 1:[75,20,5],  2:[48,38,14], 3:[25,50,25] },
    bamboo_mud: { 1:[65,28,7],  2:[35,42,23], 3:[15,45,40] },
    mud_wall:   { 1:[38,35,27], 2:[12,35,53], 3:[3,18,79]  },
  },
  roof: {
    concrete_r: { 1:[92,6,2],   2:[83,13,4],  3:[70,25,5]  },
    metal:      { 1:[82,13,5],  2:[64,25,11], 3:[45,42,13] },
    thatch:     { 1:[62,28,10], 2:[38,32,30], 3:[15,40,45] },
  },
};

const TIERS = [
  { label:'Safe',           short:'Safe',      icon:'✓', col:'#22c84a', bg:'rgba(34,200,74,.13)'   },
  { label:'Repairs Needed', short:'Repairs',   icon:'⚠', col:'#e89020', bg:'rgba(232,144,32,.13)'  },
  { label:'Destroyed',      short:'Destroyed', icon:'✕', col:'#e82020', bg:'rgba(232,32,32,.13)'   },
];

// ── ACE CARDS ──
const ACE_POOL = [
  { id:'sandbag',  name:'Sandbag Wall',               icon:'🛡', color:'#185FA5', bg:'rgba(24,95,165,.18)',
    desc:'Reduce all flood damage probabilities by 50%.',
    apply: m => { m.fMod*=.5; m.wMod*=.5; m.rMod*=.5; }, valid: () => true },
  { id:'drainage', name:'Drainage Channel',           icon:'💧', color:'#0F6E56', bg:'rgba(15,110,86,.18)',
    desc:'Reduce foundation damage probability by 50%.',
    apply: m => { m.fMod*=.5; }, valid: () => true },
  { id:'lime_mud', name:'Lime Stabilised Mud Walls',  icon:'🪵', color:'#854F0B', bg:'rgba(133,79,11,.18)',
    desc:'Reduce wall damage by 75%. Cannot apply to brick & cement walls.',
    apply: m => { m.wMod*=.25; }, valid: ps => ps.house.wMat && ps.house.wMat !== 'brick_wall' },
  { id:'elevated', name:'Elevated Platform',          icon:'🏠', color:'#534AB7', bg:'rgba(83,74,183,.18)',
    desc:'Walls and roof are completely safe this round.',
    apply: m => { m.wForced=true; m.rForced=true; }, valid: () => true },
];

// ── PLOT & SCENE DATA ──
const PLOT_DATA = [
  { num:1, zone:'Very Risky', col:'#cc2020' },
  { num:2, zone:'Very Risky', col:'#cc2020' },
  { num:3, zone:'Risky',      col:'#d88018' },
  { num:4, zone:'Risky',      col:'#d88018' },
  { num:5, zone:'Moderate',   col:'#78b018' },
  { num:6, zone:'Safe',       col:'#20b838' },
];
const NPC_NAMES = ['Amara','Kofi','Fatima','Jean','Maria','Ravi'];
const PLOT_POS  = { 1:[-10,24], 2:[14,24], 3:[-22,14], 4:[28,14], 5:[-4,6], 6:[-22,-20] };
const PLOT_COL  = { 1:0xcc2020, 2:0xcc2020, 3:0xd88018, 4:0xd88018, 5:0x78b018, 6:0x20b838 };
const FLOOD_META = {
  1: { name:'Knee-Height Flood',  desc:'A swift but shallow surge. Low-lying plots face the first real test.',       waterY:1.8, col:'#378ADD' },
  2: { name:'Waist-Height Flood', desc:'Rising waters reach waist level. Structural pressure increases significantly.',waterY:4.2, col:'#185FA5' },
  3: { name:'Head-Height Flood',  desc:'A devastating surge. Only the best-built and best-positioned houses survive.', waterY:7.5, col:'#0C447C' },
};

// ── DAMAGE SCENARIO LIBRARY ──
const F_SCENARIOS = {
  concrete_f: {
    0: {
      1: "The reinforced concrete slab distributed the flood load evenly across its full footprint. At knee height, the investment was almost unnecessary — but it held without any compromise.",
      2: "Waist-height hydrostatic pressure pushed hard against the slab edges, but the reinforcement did its job. The foundation emerged intact, confirming the value of proper engineering.",
      3: "Even at head height, the concrete slab held its structural integrity. Surrounding soil saturated significantly, but the slab's mass and reinforcement resisted differential settlement."
    },
    1: {
      1: "Knee-height water found a hairline crack at one of the construction joints — evidence of a minor pour defect. Seepage has begun and the joint must be resealed before the next flood.",
      2: "Prolonged waist-height exposure caused micro-cracking where the slab meets the ground beam. The foundation remains structurally sound but urgent repointing is needed.",
      3: "Head-height hydrostatic pressure opened a pre-existing weakness in the slab. The concrete did not fail catastrophically, but the cracks require immediate repair."
    },
    2: {
      2: "Sustained waist-height flooding saturated the surrounding soil until it lost bearing capacity. Differential settlement cracked the slab in two places — even strong concrete cannot compensate for unstable ground underneath.",
      3: "Head-height flooding over an extended period caused the subsoil to approach liquefaction. The slab tilted and fractured. A critical lesson: material strength is only as good as the ground it sits on."
    }
  },
  stone_mud: {
    0: {
      1: "The rough stone outer face deflected knee-height water around the base. The mud binder stayed dry and the plinth held its form throughout.",
      2: "Waist-height water pressured the stone face but the interlocked stones channeled flow around the perimeter. The core mud remained largely protected.",
      3: "Surprisingly, the stone-mud plinth survived head height. The stones locked tighter under pressure — a traditional technique that proved more resilient than expected."
    },
    1: {
      1: "Knee-height moisture wicked into the mud binder between the outer stones. Two stones shifted noticeably and need re-setting before the next flood event.",
      2: "Waist-height water softened the mud bonding agent significantly. Several stones displaced and the plinth has visible cracks — structural concern if left unrepaired.",
      3: "Head-height flooding saturated the mud binder almost completely. Multiple stones shifted. The plinth is unstable and must be rebuilt before Round 2."
    },
    2: {
      2: "Sustained waist-height immersion dissolved the mud binder holding the stones together. Without it, the stones lost all cohesion and the plinth collapsed under its own weight.",
      3: "Head-height water saturated the plinth long enough to dissolve all mud between the stones. The plinth disintegrated — stone-mud composite cannot survive extended deep flooding."
    }
  },
  mud_plinth: {
    0: {
      1: "The mud plinth sat just above the knee-high flood line. Elevation — not material quality — was the decisive factor here. The base stayed completely dry throughout.",
      2: "The plinth submerged under waist-height water but drained fast enough to prevent full saturation. A fortunate outcome — the next flood may not be so forgiving.",
      3: "Against the odds, the mud plinth survived head height. The flood receded quicker than usual before structural saturation could set in. Lucky conditions saved this house."
    },
    1: {
      1: "Although technically above the knee-height flood line, moisture wicked upward through the earthen base. Visible erosion at the edges needs patching before the next round.",
      2: "Waist-height flooding submerged and saturated the plinth. The base has softened, cracked, and lost some height — repair is urgent.",
      3: "Head-height flooding soaked through the plinth completely. The damage is significant, though the structure is technically still standing."
    },
    2: {
      1: "Even knee-high water was enough to dissolve this mud plinth. Its construction quality was poor and moisture broke down the earthen base before the flood fully receded.",
      2: "Waist-height flooding dissolved the mud plinth. With no stone or concrete reinforcement, the earthen base had no resistance once fully submerged.",
      3: "As expected at this flood depth, the mud plinth was destroyed. Head-height flooding gave the unprotected earth no chance — it dissolved within the first hour of the surge."
    }
  },
};

const W_SCENARIOS = {
  brick_wall: {
    cascade: "The collapsed foundation transmitted catastrophic stress upward through the masonry. Even the strongest brick cannot stand without a stable base — the walls were lost before the flood even reached them.",
    weakF:   "With the foundation already weakened, the brick walls absorbed additional stress at their base. The damage propagated upward, cracking several course joints.",
    0: "Brick and cement walls resisted water absorption completely. The mortar joints held firm under sustained pressure — masonry construction proved highly reliable.",
    1: "Water infiltrated a weak mortar joint in the lower courses. Hairline cracking is visible but the wall remains structurally sound — repointing required before the next flood.",
    2: "High hydrostatic pressure, compounded by foundation instability, stressed the masonry beyond its limit. The walls cracked along multiple joint lines and partially collapsed."
  },
  bamboo_mud: {
    cascade: "The foundation collapse brought the bamboo framework down with it. The poles could not resist the lateral force once the base was lost.",
    weakF:   "The weakened foundation allowed the base of the bamboo frame to shift. With the poles no longer plumb, the walls lost lateral rigidity.",
    0: "Bamboo's natural flexibility absorbed the flood pressure without cracking — a counter-intuitive advantage over rigid materials. The walls bent slightly and sprang back.",
    1: "The mud infill between bamboo poles softened under immersion. The framework held but the infill crumbled in several sections — patching and re-packing required.",
    2: "Extended flooding dissolved the mud infill completely. The bamboo poles remained standing but without infill the walls provided no structural function or protection."
  },
  mud_wall: {
    cascade: "The foundation gave way and the unsupported mud walls collapsed within minutes. Mud walls depend entirely on their base remaining stable.",
    weakF:   "The weakened foundation allowed groundwater to wick straight into the base of the mud walls. They softened from below and the damage spread rapidly upward.",
    0: "The mud walls survived — the flood was brief enough that the earth did not fully saturate. A narrow escape that demonstrates how flood duration matters as much as flood height.",
    1: "Significant moisture absorption cracked the mud walls throughout. The structure is weakened and requires thorough patching and waterproofing — mud is highly vulnerable to prolonged contact.",
    2: "Sustained flooding fully saturated the mud walls. They lost all structural cohesion and collapsed inward — mud has virtually no resistance once completely immersed."
  },
};

const R_SCENARIOS = {
  concrete_r: {
    0: "The concrete roof slab showed no signs of water ingress or movement. Its significant mass actually added downward stability during the flood surge, pressing the wall tops together.",
    1: "A joint between the roof slab and the top wall course allowed minor water penetration during peak surge. Resealing with flexible waterproof mortar will fix this.",
    2: "The combination of foundation movement and wall cracking removed support from the roof slab. The heavy concrete became a liability when its bearing points failed."
  },
  metal: {
    0: "Corrugated metal sheets shed water efficiently throughout. All fixings remained tight and no sheets lifted — the lightweight material worked in its favour.",
    1: "One sheet lifted under flood-driven wind pressure at peak surge. The fixing point pulled out of the wall top and needs re-drilling and reinforcing.",
    2: "Multiple sheets were torn loose by the lateral force of flood surge. Lightweight metal cannot resist moving water at this depth — the roof covering was lost."
  },
  thatch: {
    0: "The thatch stayed fully above the waterline and was undamaged. Its natural insulation and drainage properties kept the interior dry despite the flood below.",
    1: "Water splash and driven rain reached the lower thatch courses during peak surge. The bottom layer has begun to rot and must be replaced before it compromises the whole roof.",
    2: "Flood water sustained contact with the thatch base for too long. Organic material rots rapidly under immersion — the roof covering collapsed within hours."
  },
};

function generateScenario(ps, result, floodLevel) {
  const h = ps.house;
  const fTier = result.fDmg;
  const wTier = result.wDmg;
  const rTier = result.rDmg;
  const stacked = h.extraFloor;
  const floodName = ['knee-height','waist-height','head-height'][floodLevel - 1];

  let foundText = '', wallText = '', roofText = '', insight = '';

  // Foundation narrative
  if (h.fMat) {
    const fBank = F_SCENARIOS[h.fMat];
    foundText = (fBank[fTier][floodLevel] || fBank[fTier][1]) || '';
  } else {
    foundText = 'No structure was built on this plot — the flood passed over empty ground.';
  }

  // Wall narrative
  if (h.wMat) {
    const wBank = W_SCENARIOS[h.wMat];
    if (fTier === 2) {
      wallText = wBank.cascade;
    } else if (fTier === 1) {
      wallText = wBank.weakF + ' ' + wBank[Math.min(wTier + 1, 2)];
    } else {
      wallText = wBank[wTier] || '';
    }
    // Stacking bonus note
    if (stacked && floodLevel < 3) {
      wallText += ` The second floor sat entirely above the ${floodName} flood line — those walls were never touched.`;
    }
  }

  // Roof narrative (assessed all rounds but especially relevant at level 3)
  if (h.rMat && ps.roof) {
    roofText = R_SCENARIOS[h.rMat][rTier] || '';
  }

  // Insight
  const insightPool = [];
  if (h.fMat === 'mud_plinth' && fTier === 0 && floodLevel === 1)
    insightPool.push('Elevation matters more than material quality at low flood levels — a well-positioned mud plinth can outperform concrete.');
  if (h.fMat === 'concrete_f' && fTier === 2)
    insightPool.push('Concrete fails when soil beneath it fails. Material strength and ground conditions are equally important.');
  if (h.wMat === 'bamboo_mud' && wTier === 0 && fTier === 0)
    insightPool.push("Bamboo's flexibility is a structural advantage under flood pressure — it bends where brick cracks.");
  if (h.wMat === 'mud_wall' && wTier === 2)
    insightPool.push('Mud walls offer almost no resistance to prolonged immersion. The key lesson: flood duration is as dangerous as flood height.');
  if (fTier === 2 && wTier === 2)
    insightPool.push('Foundation failure cascades upward — the wall material never got a fair test. Always invest first in your foundation.');
  if (stacked && floodLevel < 3)
    insightPool.push('Stacking floors is a proven flood resilience strategy — it lifts living space above the flood line without needing to change materials.');
  if (h.rooms > 1 && result.overall === 0)
    insightPool.push('A wider house spreads the load across more foundation — extra rooms add structural stability as well as living space.');

  insight = insightPool[0] || 'Every flood reveals something new — the interaction of material choice, plot position, and flood duration creates unique outcomes each time.';

  return { foundText, wallText, roofText, insight, fTier, wTier, rTier, floodName };
}

// ── DEBRIEF CONTENT ──
const REFLECTION_QUESTIONS = [
  { icon:'🎲', q:'Which material choice surprised you most — something you expected to fail that survived, or vice versa?' },
  { icon:'🏗', q:'Did building extra rooms or stacking floors change your outcome? When did it help most?' },
  { icon:'📍', q:'How much did your plot position matter compared to your material choices?' },
  { icon:'🃏', q:'Did you use your ace card at the right moment, or did you save it too long?' },
  { icon:'💧', q:'What would you build differently if you played again — and why?' },
];

const KEY_LEARNINGS = [
  { icon:'📐', text:'Elevation is often more powerful than material quality at low flood levels. Raising a building above the flood line is the most cost-effective resilience strategy.' },
  { icon:'🪨', text:'Foundation failure cascades — walls and roof never get a fair chance if the base gives way. Foundation investment should come before material upgrades.' },
  { icon:'🌿', text:"Bamboo walls outperform brick in some flood conditions. Bamboo flexes and springs back; brick can crack under lateral pressure. 'Weaker' materials sometimes behave better." },
  { icon:'⏱', text:'Flood duration matters as much as flood height. A shorter knee-height flood can be less damaging than a slower waist-height surge.' },
  { icon:'🏠', text:'Stacking floors lifts living space above the flood line. This is exactly what communities in flood-prone areas have done for centuries.' },
  { icon:'🌊', text:'No house is flood-proof — only flood-resilient. The goal is not to prevent all damage, but to reduce it to a level that can be repaired and recovered from.' },
];

function getDynamicLearnings(playerStates) {
  const triggered = new Set();
  const all = [...KEY_LEARNINGS];

  playerStates.filter(p => p.isPlayer).forEach(p => {
    const h = p.house;
    if (h.fMat === 'mud_plinth' && p.lastDamage?.fDmg === 0)
      triggered.add(0); // elevation learning
    if (p.lastDamage?.fDmg === 2 && p.lastDamage?.wDmg === 2)
      triggered.add(1); // cascade learning
    if (h.wMat === 'bamboo_mud' && p.lastDamage?.wDmg === 0 && p.lastDamage?.fDmg === 0)
      triggered.add(2); // bamboo learning
    if (h.extraFloor)
      triggered.add(4); // stacking learning
  });

  // Return triggered learnings first, then remaining
  const sorted = [...triggered].map(i => all[i]);
  all.forEach((l, i) => { if (!triggered.has(i)) sorted.push(l); });
  return sorted.slice(0, 4);
}
