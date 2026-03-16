// ── RENDERER ──
const cv = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ab8dc);
scene.fog = new THREE.Fog(0xaad4ee, 160, 340);
const cam = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 500);

// ── LIGHTS ──
scene.add(new THREE.AmbientLight(0xd0e8ff, 0.6));
const sun = new THREE.DirectionalLight(0xfff5d0, 1.4);
sun.position.set(40, 80, -10); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left:-80, right:80, top:80, bottom:-80, far:220 });
sun.shadow.bias = -0.001; scene.add(sun);
scene.add(new THREE.HemisphereLight(0xc8e8ff, 0x5a7830, 0.5));

// ── HEIGHT ──
function getY(x, z) {
  return Math.max(0.05, (36 - z) * 0.26
    + Math.sin(x * 0.09) * 0.45 + Math.cos(z * 0.08) * 0.35
    + Math.sin(x * 0.18 + z * 0.13) * 0.2 + Math.cos(x * 0.05 - z * 0.06) * 0.55);
}

// ── TERRAIN ──
const tgeo = new THREE.PlaneGeometry(220, 160, 120, 120);
tgeo.rotateX(-Math.PI / 2);
const tp = tgeo.attributes.position, vc = [];
for (let i = 0; i < tp.count; i++) {
  const x = tp.getX(i), z = tp.getZ(i);
  tp.setY(i, getY(x, z));
  const j = () => (Math.random() - 0.5) * 0.05;
  let r, g, b;
  if      (z < -12) { r=.20+j(); g=.48+j(); b=.18+j(); }
  else if (z <   4) { r=.32+j(); g=.56+j(); b=.14+j(); }
  else if (z <  18) { r=.56+j(); g=.44+j(); b=.10+j(); }
  else if (z <  30) { r=.52+j(); g=.28+j(); b=.08+j(); }
  else              { r=.44+j(); g=.30+j(); b=.10+j(); }
  vc.push(r, g, b);
}
tgeo.setAttribute('color', new THREE.Float32BufferAttribute(vc, 3));
tgeo.computeVertexNormals();
const terrainMesh = new THREE.Mesh(tgeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
terrainMesh.receiveShadow = true; scene.add(terrainMesh);

// ── RIVER ──
const riverMat = new THREE.MeshLambertMaterial({ color: 0x2a78c8, transparent: true, opacity: 0.82 });
const riverMesh = new THREE.Mesh(new THREE.PlaneGeometry(220, 40), riverMat);
riverMesh.rotation.x = -Math.PI / 2; riverMesh.position.set(0, 0.1, 52); scene.add(riverMesh);
const bankM = new THREE.Mesh(new THREE.PlaneGeometry(220, 8), new THREE.MeshLambertMaterial({ color: 0x7a5528 }));
bankM.rotation.x = -Math.PI / 2; bankM.position.set(0, 0.08, 36); scene.add(bankM);

// ── MESH HELPER ──
const rndN = (a, b) => a + Math.random() * (b - a);
function mkM(geo, col) {
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: col }));
  m.castShadow = true; m.receiveShadow = true; return m;
}

// ── CLAY HOUSE ──
function makeHouse(x, z, wc, rc = 0x5a2808, sc = 1, ry = 0) {
  const y = getY(x, z), g = new THREE.Group();
  const f = mkM(new THREE.BoxGeometry(4.8*sc, 0.4, 4.2*sc), 0x9a8060); f.position.y = 0.2; g.add(f);
  const w = mkM(new THREE.BoxGeometry(4.6*sc, 2.8*sc, 4.0*sc), wc);    w.position.y = 1.8*sc; g.add(w);
  const rf = mkM(new THREE.ConeGeometry(3.4*sc, 2.2*sc, 4), rc);
  rf.position.y = (1.8+1.4+1.1)*sc; rf.rotation.y = Math.PI/4; g.add(rf);
  const ch = mkM(new THREE.BoxGeometry(0.4, 1.2, 0.4), 0x8a5830); ch.position.set(sc, (1.8+2.8+0.2)*sc, 0.5*sc); g.add(ch);
  const wm = new THREE.MeshLambertMaterial({ color: 0xb0d8f0 });
  [[-2.31*sc,1.9*sc,0.7*sc],[-2.31*sc,1.9*sc,-0.7*sc],[2.31*sc,1.9*sc,0]].forEach(([px,py,pz]) => {
    const wi = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8*sc, 0.75*sc), wm); wi.position.set(px,py,pz); g.add(wi);
  });
  mkM(new THREE.BoxGeometry(0.08, 1.4*sc, 0.7*sc), 0x4a2e10).position.set(-2.31*sc, 0.7*sc, 0); g.add(g.children[g.children.length-1]);
  const dr = mkM(new THREE.BoxGeometry(0.08, 1.4*sc, 0.7*sc), 0x4a2e10); dr.position.set(-2.31*sc, 0.7*sc, 0); g.add(dr);
  g.rotation.y = ry; g.position.set(x, y, z); scene.add(g);
}

function makeConcreteHouse(x, z, sc = 1, ry = 0) {
  const y = getY(x, z), g = new THREE.Group(), ww = 5.8*sc, wd = 5*sc, wh = 2.7*sc, oh = sc;
  mkM(new THREE.BoxGeometry(ww+0.4, 0.38, wd+0.4), 0x9a9a88).position.y = 0.19; g.add(g.children[g.children.length-1]);
  const f = mkM(new THREE.BoxGeometry(ww+0.4, 0.38, wd+0.4), 0x9a9a88); f.position.y = 0.19; g.add(f);
  const w = mkM(new THREE.BoxGeometry(ww, wh, wd), 0xC8C8C0); w.position.y = wh/2+0.38; g.add(w);
  const rf = mkM(new THREE.BoxGeometry(ww+oh*2, 0.3, wd+oh*2), 0xAAAAAA); rf.position.y = wh+0.53; g.add(rf);
  const wm2 = new THREE.MeshLambertMaterial({ color: 0x90B8CC });
  [[-ww/2-0.05,wh*0.55+0.38,0.6*sc],[-ww/2-0.05,wh*0.55+0.38,-0.6*sc],[ww/2+0.05,wh*0.55+0.38,0]].forEach(([px,py,pz]) => {
    const wi = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8*sc, 0.7*sc), wm2); wi.position.set(px,py,pz); g.add(wi);
  });
  const dr = mkM(new THREE.BoxGeometry(0.08, 1.4*sc, 0.72*sc), 0x4a4030); dr.position.set(-ww/2-0.05, wh*0.28+0.38, 0); g.add(dr);
  g.rotation.y = ry; g.position.set(x, y, z); scene.add(g);
}

function makeTree(x, z, h = 5, pine = false) {
  const y = getY(x, z), g = new THREE.Group(), th = h * 0.38;
  const tr = mkM(new THREE.CylinderGeometry(h*0.025, h*0.04, th, 6), 0x4a3010); tr.position.y = th/2; g.add(tr);
  const lc = new THREE.Color().setHSL(0.27+rndN(-0.03,0.06), 0.55, 0.20+rndN(0,0.08));
  const lm = new THREE.MeshLambertMaterial({ color: lc });
  if (pine) {
    [new THREE.ConeGeometry(h*0.32,h*0.65,8), new THREE.ConeGeometry(h*0.22,h*0.45,7)].forEach((geo,i) => {
      const c = new THREE.Mesh(geo,lm); c.position.y = th+h*(0.3+i*0.28); c.castShadow=true; g.add(c);
    });
  } else {
    [[0,th+h*0.38,0,h*0.38],[h*0.16,th+h*0.52,h*0.14,h*0.26],[-h*0.18,th+h*0.48,-h*0.12,h*0.22]].forEach(([px,py,pz,r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r,8,6),lm); s.position.set(px,py,pz); s.castShadow=true; g.add(s);
    });
  }
  g.position.set(x, y, z); g.rotation.y = rndN(0, Math.PI*2); scene.add(g);
}

function makeBush(x, z) {
  const y = getY(x, z), g = new THREE.Group();
  const bc = new THREE.Color().setHSL(0.3+rndN(-0.04,0.05), 0.5, 0.22+rndN(-0.03,0.06));
  const bm = new THREE.MeshLambertMaterial({ color: bc });
  [[0,0.35,0,0.55],[0.32,0.22,0.22,0.38],[-0.28,0.18,-0.18,0.34]].forEach(([ox,oy,oz,r]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(r,6,5),bm); b.position.set(ox,oy,oz); b.castShadow=true; g.add(b);
  });
  g.position.set(x, y, z); scene.add(g);
}

// ── ROADS ──
const rdMat = new THREE.MeshLambertMaterial({ color: 0xc8a840, side: THREE.DoubleSide });
function buildRoad(pts, w = 2.6) {
  const samps = [];
  for (let i = 0; i < pts.length-1; i++) {
    const [x1,z1]=pts[i], [x2,z2]=pts[i+1];
    const st = Math.max(6, Math.ceil(Math.hypot(x2-x1,z2-z1)/0.8));
    for (let s=0;s<st;s++){const t=s/st;samps.push([x1+(x2-x1)*t,z1+(z2-z1)*t]);}
  }
  samps.push(pts[pts.length-1]);
  const verts=[], idx=[];
  for (let i=0;i<samps.length;i++){
    const [cx,cz]=samps[i]; let dx,dz;
    if(i<samps.length-1){dx=samps[i+1][0]-cx;dz=samps[i+1][1]-cz;}
    else{dx=cx-samps[i-1][0];dz=cz-samps[i-1][1];}
    const l=Math.hypot(dx,dz)||1; dx/=l;dz/=l;
    const px=-dz,pz2=dx,h=w*0.5;
    verts.push(cx-px*h,getY(cx-px*h,cz-pz2*h)+0.07,cz-pz2*h, cx+px*h,getY(cx+px*h,cz+pz2*h)+0.07,cz+pz2*h);
  }
  for(let i=0;i<samps.length-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,rdMat); m.receiveShadow=true; scene.add(m);
}

// ── PLOT MARKERS ──
function makePlot(x, z, col) {
  const y = getY(x, z);
  const pg = mkM(new THREE.BoxGeometry(7, 0.24, 6), 0xbfa060); pg.position.set(x, y+0.12, z); scene.add(pg);
  const post = mkM(new THREE.CylinderGeometry(0.1,0.13,3,7),0x6a4820); post.position.set(x,y+1.5,z); scene.add(post);
  const sign = mkM(new THREE.BoxGeometry(1.5,1.1,0.14), col); sign.position.set(x,y+3.1,z); scene.add(sign);
}
Object.keys(PLOT_POS).forEach(n => { const[x,z]=PLOT_POS[n]; makePlot(x,z,PLOT_COL[n]); });

// ── POPULATE SCENE ──
makeHouse(-34,-30,0xc07838,0x5a2808,1.0,0.3); makeHouse(24,-28,0xb06830,0x622e0a,0.9,-0.2);
makeHouse(-8,-24,0xc88040,0x5a2808,1.05,0.5); makeHouse(36,-20,0xa06030,0x6a3010,0.88,0.1);
makeHouse(30,-8,0x986030,0x622e0a,1.0,0.2);   makeHouse(-20,-34,0xca8048,0x5a2808,0.85,0.6);
makeHouse(12,-32,0xa86838,0x6a3010,0.92,-0.1); makeHouse(-2,-14,0xb07240,0x5a2808,0.82,0.8);
makeHouse(18,-18,0x9a6238,0x622e0a,0.9,-0.35); makeConcreteHouse(-38,-12,1.0,-0.4);

[[-42,-36],[-36,-40],[-46,-26],[-22,-36],[-8,-34],[14,-32],[32,-34],[42,-32],[-42,-18],[-48,-34],[-12,-42],[48,-36],[46,-24],[18,-42],[28,-38],[4,-38],[38,-14],[-30,-14],[6,-20],[-16,-28],[22,-12],[-44,-8],[46,-14],[0,-38],[-26,-40],[34,-40],[10,-22],[-4,-28],[-50,-22],[52,-14]].forEach(([x,z])=>makeTree(x,z,4+rndN(0,2.5),Math.random()>0.75));
[[-46,-4],[46,-6],[-34,2],[38,0],[16,-11],[-16,-2],[2,-8],[22,0],[-28,4],[32,-5]].forEach(([x,z])=>makeTree(x,z,3+rndN(0,1.4)));
[[-44,12],[46,14],[-36,18],[42,8],[-26,8],[32,6],[0,14],[-14,10],[18,12]].forEach(([x,z])=>makeTree(x,z,2+rndN(0,1)));
[[-46,24],[46,26],[-38,20],[40,22]].forEach(([x,z])=>makeTree(x,z,1.5+rndN(0,0.8)));
[[-28,-36],[-14,-16],[8,-26],[36,-26],[-6,-34],[20,-24],[-38,-4],[28,-12],[42,-6],[-22,-8],[4,-16],[-10,-8],[16,-4],[-30,6],[26,2],[-20,10],[10,8],[-4,6],[32,10]].forEach(([x,z])=>makeBush(x,z));
buildRoad([[-58,-2],[58,-2]]); buildRoad([[-58,-2],[-44,-24],[-36,-32]],2.2); buildRoad([[58,-2],[44,-20],[36,-28]],2.2);
buildRoad([[-22,-2],[-14,14],[-10,24]],2.0); buildRoad([[18,-2],[16,12],[14,24]],2.0);
buildRoad([[-4,-2],[-4,6]],1.8); buildRoad([[-30,-2],[-28,8],[-22,14]],1.8);
buildRoad([[22,-2],[24,8],[28,14]],1.8); buildRoad([[-20,-2],[-22,-20]],1.6);

// ── PLAYER HOUSE 3D ──
const FLH = 2.8, FDH = 0.4;
const ROOM_SPACING = 1.35;
const pHouseObjs = {};

function roomX(ri, total, px) {
  return px + (ri - (total - 1) / 2) * ROOM_SPACING;
}

function updateHouse3D(ps) {
  const pn = ps.plotNum;
  (pHouseObjs[pn] || []).forEach(o => scene.remove(o));
  const objs = []; pHouseObjs[pn] = objs;
  const h = ps.house;
  if (!h.fMat || h.rooms === 0) return;
  const [px, pz] = PLOT_POS[pn];
  const baseY = getY(px, pz) + 0.25;
  const floors = h.extraFloor ? 2 : 1;

  for (let r = 0; r < h.rooms; r++) {
    const rx = roomX(r, h.rooms, px);
    let cy = baseY;

    for (let fl = 0; fl < floors; fl++) {
      const hasWalls = fl === 0 ? h.hasWalls : h.hasWalls2;
      // Foundation slab per floor
      const fm = gm('foundation', h.fMat);
      const fslab = mkM(new THREE.BoxGeometry(1.1, FDH, 1.0), fm.colH);
      fslab.position.set(rx, cy + FDH/2, pz); scene.add(fslab); objs.push(fslab); cy += FDH;

      // Walls
      if (hasWalls) {
        const wm = gm('wall', h.wMat);
        const wall = mkM(new THREE.BoxGeometry(1.0, FLH, 1.0), wm.colH);
        wall.position.set(rx, cy + FLH/2, pz); scene.add(wall); objs.push(wall);
        const wim = new THREE.MeshLambertMaterial({ color: 0xB0D8F0 });
        [[-0.51, cy+FLH*0.55, 0],[0.51, cy+FLH*0.55, 0]].forEach(([wx,wy,wz]) => {
          const wi = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.55), wim);
          wi.position.set(wx, wy, wz); scene.add(wi); objs.push(wi);
        });
        if (fl === 0 && r === 0) {
          const dr = mkM(new THREE.BoxGeometry(0.08, 0.9, 0.45), 0x4a2e10);
          dr.position.set(-0.51, cy + 0.45, 0); scene.add(dr); objs.push(dr);
        }
        cy += FLH;
      }
    }

    // Roof (placed once per room, on top of last floor)
    if (h.hasRoof && h.rMat) {
      const rm = gm('roof', h.rMat);
      if (rm.shape === 'flat') {
        const oh = 0.25;
        const rf = mkM(new THREE.BoxGeometry(1.0+oh*2, 0.28, 1.0+oh*2), rm.colH);
        rf.position.set(rx, cy + 0.14, pz); scene.add(rf); objs.push(rf);
      } else {
        const cone = mkM(new THREE.ConeGeometry(0.82, 1.1, 4), rm.colH);
        cone.position.set(rx, cy + 0.55, pz); cone.rotation.y = Math.PI/4;
        scene.add(cone); objs.push(cone);
      }
    }
  }
}

// ── 3D DRAG-DROP GHOST SYSTEM ──
const ghostGroup = new THREE.Group(); scene.add(ghostGroup);
const ghostMat = new THREE.MeshLambertMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.42, depthWrite: false });
const ghostEdgeMat = new THREE.LineBasicMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.7 });
const slotRingGroup = new THREE.Group(); scene.add(slotRingGroup);
let currentDrag = null;
let pendingSlot = null;
let lastDropped = null;

function getDropSlots(ps) {
  if (!currentDrag) return [];
  const h = ps.house;
  const [px, pz] = PLOT_POS[ps.plotNum];
  const baseY = getY(px, pz) + 0.25;
  const floors = h.extraFloor ? 2 : 1;
  const slots = [];

  if (currentDrag.type === 'foundation') {
    if (h.rooms === 0) {
      slots.push({ x:px, y:baseY, z:pz, kind:'found-new', label:'Place foundation' });
    } else if (h.rooms < 3) {
      const nx = roomX(h.rooms, h.rooms+1, px);
      slots.push({ x:nx, y:baseY, z:pz, kind:'found-side', label:'Add room' });
    }
    // Stack option: add second floor if walls done
    if (h.rooms > 0 && h.hasWalls && !h.extraFloor) {
      const topY = baseY + FDH + FLH;
      slots.push({ x:px, y:topY, z:pz, kind:'found-stack', label:'Stack floor', isStack:true });
    }
  } else if (currentDrag.type === 'wall') {
    if (h.rooms > 0 && !h.hasWalls) {
      slots.push({ x:px, y:baseY + FDH, z:pz, kind:'wall-f1', label:'Add walls' });
    } else if (h.extraFloor && !h.hasWalls2) {
      const f2Y = baseY + FDH + FLH + FDH;
      slots.push({ x:px, y:f2Y, z:pz, kind:'wall-f2', label:'Add 2nd floor walls' });
    }
  } else if (currentDrag.type === 'roof') {
    if ((h.hasWalls || h.hasWalls2) && !h.hasRoof) {
      const topY = baseY + floors * (FDH + FLH);
      slots.push({ x:px, y:topY, z:pz, kind:'roof', label:'Place roof' });
    }
  }
  return slots;
}

function showSlotRings(slots) {
  while (slotRingGroup.children.length) slotRingGroup.remove(slotRingGroup.children[0]);
  slots.forEach(slot => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.9, 24),
      new THREE.MeshBasicMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(slot.x, slot.y + 0.05, slot.z);
    slotRingGroup.add(ring);
  });
}

function clearSlotRings() {
  while (slotRingGroup.children.length) slotRingGroup.remove(slotRingGroup.children[0]);
}

function showGhost(slot) {
  while (ghostGroup.children.length) ghostGroup.remove(ghostGroup.children[0]);
  if (!currentDrag || !slot) { ghostGroup.visible = false; return; }

  const ps = playerStates[curBI];
  const h = ps.house;
  const [px, pz] = PLOT_POS[ps.plotNum];
  const rooms = slot.kind === 'found-new' ? 1 : slot.kind === 'found-side' ? h.rooms + 1 : h.rooms;

  const addGhostBox = (w, ht, d, x, y, z) => {
    const geo = new THREE.BoxGeometry(w, ht, d);
    const mesh = new THREE.Mesh(geo, ghostMat);
    mesh.position.set(x, y + ht/2, z); ghostGroup.add(mesh);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), ghostEdgeMat);
    edges.position.copy(mesh.position); ghostGroup.add(edges);
  };

  if (slot.kind === 'found-new' || slot.kind === 'found-side') {
    for (let r = 0; r < rooms; r++) {
      const rx = roomX(r, rooms, px);
      addGhostBox(1.1, FDH, 1.0, rx, slot.y, pz);
    }
  } else if (slot.kind === 'found-stack') {
    for (let r = 0; r < h.rooms; r++) {
      const rx = roomX(r, h.rooms, px);
      addGhostBox(1.1, FDH, 1.0, rx, slot.y, pz);
    }
  } else if (slot.kind.startsWith('wall')) {
    for (let r = 0; r < h.rooms; r++) {
      const rx = roomX(r, h.rooms, px);
      addGhostBox(1.0, FLH, 1.0, rx, slot.y, pz);
    }
  } else if (slot.kind === 'roof') {
    const mat = gm('roof', currentDrag.matId);
    for (let r = 0; r < h.rooms; r++) {
      const rx = roomX(r, h.rooms, px);
      if (mat && mat.shape === 'flat') {
        addGhostBox(1.5, 0.28, 1.5, rx, slot.y, pz);
      } else {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.1, 4), ghostMat);
        cone.position.set(rx, slot.y + 0.55, pz); cone.rotation.y = Math.PI/4;
        ghostGroup.add(cone);
      }
    }
  }
  ghostGroup.visible = true;
}

function clearGhost() {
  while (ghostGroup.children.length) ghostGroup.remove(ghostGroup.children[0]);
  ghostGroup.visible = false;
  pendingSlot = null;
}

// Canvas drag-over: raycast → snap ghost to nearest slot
const raycaster = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
cv.addEventListener('dragover', e => {
  e.preventDefault();
  if (!currentDrag) return;
  const rect = cv.getBoundingClientRect();
  const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera({ x:mx, y:my }, cam);
  const hit = new THREE.Vector3();
  raycaster.ray.intersectPlane(groundPlane, hit);
  if (!hit) return;

  const ps = playerStates[curBI];
  const slots = getDropSlots(ps);
  let closest = null, minDist = Infinity;
  slots.forEach(slot => {
    const d = Math.hypot(hit.x - slot.x, hit.z - slot.z);
    if (d < minDist && d < 8) { minDist = d; closest = slot; }
  });
  pendingSlot = closest;
  showGhost(closest);
});

cv.addEventListener('dragleave', () => { clearGhost(); });

cv.addEventListener('drop', e => {
  e.preventDefault();
  if (currentDrag && pendingSlot) {
    lastDropped = { ...currentDrag, slot: pendingSlot };
    if (window.onBlockDropped) window.onBlockDropped(lastDropped);
  }
  currentDrag = null; clearGhost(); clearSlotRings();
});

// Exposed drag API
window.sceneDragStart = (type, matId) => {
  currentDrag = { type, matId };
  const ps = playerStates[curBI];
  if (ps) showSlotRings(getDropSlots(ps));
};
window.sceneDragEnd = () => {
  currentDrag = null; clearGhost(); clearSlotRings();
};

// ── FLOOD WATER ──
let floodWaterMesh = null;
function showFloodWater(level) {
  if (floodWaterMesh) scene.remove(floodWaterMesh);
  const geo = new THREE.PlaneGeometry(220, 110);
  geo.rotateX(-Math.PI / 2);
  floodWaterMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x1a5fa8, transparent: true, opacity: 0 }));
  floodWaterMesh.position.set(0, FLOOD_META[level].waterY, 0);
  scene.add(floodWaterMesh);
  let op = 0;
  const iv = setInterval(() => { op = Math.min(0.52, op+0.03); floodWaterMesh.material.opacity = op; if(op>=0.52)clearInterval(iv); }, 40);
}
function hideFloodWater() {
  if (floodWaterMesh) { scene.remove(floodWaterMesh); floodWaterMesh = null; }
}

// ── CAMERA ──
let theta=0.3, phi=0.72, rad=130;
let thetaGoal=0.3, phiGoal=0.72, radGoal=130;
let orbX=0, orbZ=2, orbXGoal=0, orbZGoal=2;
let drag=false, lx=0, ly=0;

function zoomToPlot(plotNum) {
  const [px, pz] = PLOT_POS[plotNum];
  orbXGoal = px * 0.7;
  orbZGoal = pz * 0.7;
  radGoal  = 28;
  phiGoal  = 0.68;
}
function zoomOut() {
  orbXGoal = 0; orbZGoal = 2; radGoal = 130; phiGoal = 0.72;
}

function updCam() {
  const ox = orbX, oz = orbZ;
  cam.position.set(
    ox + rad * Math.sin(phi) * Math.sin(theta),
    rad * Math.cos(phi) + 3,
    oz + rad * Math.sin(phi) * Math.cos(theta)
  );
  cam.lookAt(ox, 3, oz);
}
updCam();

cv.addEventListener('mousedown', e => { drag=true; lx=e.clientX; ly=e.clientY; });
window.addEventListener('mouseup', () => drag=false);
window.addEventListener('mousemove', e => {
  if (!drag || currentDrag) return;
  theta -= (e.clientX-lx)*0.007;
  phi = Math.max(0.15, Math.min(1.45, phi+(e.clientY-ly)*0.006));
  lx=e.clientX; ly=e.clientY;
  thetaGoal=theta; phiGoal=phi;
  updCam();
});
cv.addEventListener('wheel', e => {
  radGoal = Math.max(15, Math.min(160, radGoal+e.deltaY*0.08));
  e.preventDefault();
}, { passive: false });

const clock = new THREE.Clock();
(function loop() {
  requestAnimationFrame(loop);
  // Smooth camera lerp
  const k = 0.055;
  orbX += (orbXGoal - orbX) * k; orbZ += (orbZGoal - orbZ) * k;
  theta += (thetaGoal - theta) * k; phi += (phiGoal - phi) * k;
  rad   += (radGoal   - rad  ) * k;
  updCam();
  // River animation
  riverMesh.material.opacity = 0.78 + Math.sin(clock.getElapsedTime() * 0.8) * 0.06;
  // Ring pulse
  slotRingGroup.children.forEach((r, i) => {
    r.material.opacity = 0.4 + Math.sin(clock.getElapsedTime() * 2.5 + i) * 0.25;
  });
  renderer.render(scene, cam);
})();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  cam.aspect = window.innerWidth / window.innerHeight;
  cam.updateProjectionMatrix();
});
