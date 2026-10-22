import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeCritter, makeBird, makeKid, animateActor } from './critters.js';
import { tween, updateTweens, ease } from './tween.js';
import { textSprite } from './text.js';

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
export const riverZ = (x) => -9 + Math.sin(x * 0.16) * 2.2;

// Places on the island. `face` turns the scene so its front looks at the camera.
export const LOCS = {
  village: { name: 'Sunny Village', x: 0, z: 19, face: 0, r: 7.5, color: '#ffd166' },
  market: { name: 'Merry Market', x: -16, z: 9, face: -0.55, r: 6, color: '#ff6b6b' },
  library: { name: 'Whisper Library', x: 16, z: 9, face: 0.55, r: 6, color: '#4cc9f0' },
  forest: { name: 'Sharing Forest', x: -21, z: -1, face: -1.0, r: 6, color: '#80ed99' },
  garden: { name: 'Word Garden', x: 21, z: -1, face: 1.0, r: 6, color: '#f15bb5' },
  river: { name: 'Number River', x: 0, z: -9, face: 0.25, r: 0, color: '#00bbf9' },
  clocktower: { name: 'Clock Tower', x: -13, z: -19, face: -0.3, r: 6, color: '#9b5de5' },
  cave: { name: 'Crystal Cave', x: 14, z: -19, face: 0.3, r: 6, color: '#00f5d4' },
  castle: { name: "Raven's Roost", x: 0, z: -26, face: 0, r: 6.5, color: '#7b2cbf' },
};

export const CHARACTERS = {
  hoot: { name: 'Hoot', emoji: '🦉', make: () => makeBird({ body: '#b07d4f', belly: '#f3dfbf', tufts: true }) },
  bun: { name: 'Baker Bun', emoji: '🐰', loc: 'market', make: () => makeCritter({ body: '#f5efe6', belly: '#ffffff', ears: 'long', tail: 'puff', hat: 'chef' }) },
  whiskers: { name: 'Miss Whiskers', emoji: '🐱', loc: 'library', make: () => makeCritter({ body: '#f4a261', belly: '#fde2c8', ears: 'pointy', tail: 'long', glasses: true }) },
  petal: { name: 'Petal', emoji: '🐭', loc: 'garden', make: () => makeCritter({ body: '#f7b2c4', belly: '#fff0f5', ears: 'round', tail: 'thin', scale: 0.9 }) },
  nutty: { name: 'Nutty', emoji: '🐿️', loc: 'forest', make: () => makeCritter({ body: '#c97b47', belly: '#f6d7b0', ears: 'pointy', tail: 'bushy' }) },
  tock: { name: 'Tock', emoji: '🐻', loc: 'clocktower', make: () => makeCritter({ body: '#9c6b4e', belly: '#e9c9a8', ears: 'round', hat: 'bow', scale: 1.15 }) },
  freddie: { name: 'Freddie', emoji: '🐸', loc: 'river', make: () => makeCritter({ body: '#7ed957', belly: '#d8f5b0', ears: 'none', frog: true }) },
  pebble: { name: 'Pebble', emoji: '🐹', loc: 'cave', make: () => makeCritter({ body: '#e9b872', belly: '#fff1d6', ears: 'round', hat: 'miner', scale: 0.9 }) },
  rascal: { name: 'Rascal', emoji: '🐦', loc: 'castle', make: () => makeBird({ body: '#3d3466', belly: '#7a6fb5', beak: '#ffbe0b', crown: true, scale: 1.1 }) },
  narrator: { name: '', emoji: '📜' },
  you: { name: '', emoji: '🧒' },
};

function baseHeight(x, z) {
  const r = Math.hypot(x / 34, z / 36);
  const a = Math.atan2(z, x);
  const edge = 1 + 0.07 * Math.sin(a * 3 + 1.3) + 0.04 * Math.sin(a * 7 + 0.4);
  const land = 1 - smooth(0.8 * edge, 1.0 * edge, r);
  const bumps = 0.45 * Math.sin(x * 0.23 + 1.1) * Math.cos(z * 0.19 - 0.6) + 0.25 * Math.sin(x * 0.51 + z * 0.37);
  let h = -2.6 + land * (3.7 + bumps);
  const dc = Math.hypot(x, z + 26);
  h += land * 4.2 * Math.exp(-(dc * dc) / 70);
  const river = 1 - smooth(1.7, 3.3, Math.abs(z - riverZ(x)));
  return mix(h, Math.min(h, -0.7), river);
}
for (const l of Object.values(LOCS)) l.y = l.r ? Math.max(baseHeight(l.x, l.z), 0.5) : 0;

export function height(x, z) {
  let h = baseHeight(x, z);
  for (const l of Object.values(LOCS)) {
    if (!l.r) continue;
    const t = 1 - smooth(l.r * 0.55, l.r, Math.hypot(x - l.x, z - l.z));
    if (t > 0) h = mix(h, l.y, t);
  }
  return h;
}
const groundY = (x, z) => Math.max(height(x, z), 0.04);

// ---------- small mesh helpers ----------
const matCache = new Map();
function M(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...opts }));
  return matCache.get(key);
}
function add(parent, geo, color, x, y, z, opts) {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? M(color, opts) : color);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (p, w, h, d, c, x, y, z, o) => add(p, new THREE.BoxGeometry(w, h, d), c, x, y, z, o);
const cyl = (p, rt, rb, h, c, x, y, z, seg = 12, o) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, o);
const cone = (p, r, h, c, x, y, z, seg = 8, o) => add(p, new THREE.ConeGeometry(r, h, seg), c, x, y, z, o);
const sph = (p, r, c, x, y, z, o) => add(p, new THREE.SphereGeometry(r, 14, 10), c, x, y, z, o);

function stripeTexture(color) {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 8;
  const g = cv.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#ffffff' : color;
    g.fillRect(i * 16, 0, 16, 8);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function clockFaceTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#fffaf0';
  g.beginPath();
  g.arc(128, 128, 126, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3d2c5a';
  g.font = '700 34px Fredoka, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let k = 1; k <= 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    g.fillText(String(k), 128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const SKY_VERT = /* glsl */ `
  varying vec3 vP;
  void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SKY_FRAG = /* glsl */ `
  varying vec3 vP;
  void main() {
    float y = vP.y;
    vec3 top = vec3(0.32, 0.62, 0.98), mid = vec3(0.62, 0.84, 1.0), hor = vec3(1.0, 0.95, 0.85);
    vec3 col = mix(hor, mid, smoothstep(-0.02, 0.22, y));
    col = mix(col, top, smoothstep(0.22, 0.9, y));
    vec3 sd = normalize(vec3(0.5, 0.42, 0.35));
    float s = max(dot(vP, sd), 0.0);
    col += vec3(1.0, 0.9, 0.6) * pow(s, 90.0) * 0.9 + vec3(1.0, 0.85, 0.6) * pow(s, 6.0) * 0.14;
    gl_FragColor = vec4(col, 1.0);
  }
`;
const WATER_VERT = /* glsl */ `
  varying vec3 vW;
  void main() { vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }
`;
const WATER_FRAG = /* glsl */ `
  uniform float uTime; uniform vec3 uFar; varying vec3 vW;
  void main() {
    float r = length(vec2(vW.x / 34.0, vW.z / 36.0));
    vec3 shallow = vec3(0.42, 0.88, 0.93), deep = vec3(0.12, 0.5, 0.85);
    vec3 col = mix(shallow, deep, smoothstep(0.85, 1.5, r));
    float w = sin(vW.x * 0.9 + uTime * 1.3) * sin(vW.z * 0.8 - uTime * 1.1) + 0.5 * sin((vW.x + vW.z) * 0.4 + uTime * 0.7);
    col += smoothstep(1.05, 1.45, w) * 0.25;
    float a = mix(0.55, 0.93, smoothstep(0.8, 1.2, r));
    col = mix(col, uFar, smoothstep(90.0, 230.0, length(vW.xz - cameraPosition.xz)));
    gl_FragColor = vec4(col, a);
  }
`;

const CRYSTAL_GEO = new THREE.OctahedronGeometry(0.7, 0);

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.autoClear = false;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#d6ecff', 110, 320);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1200);
    this.camera.position.set(0, 60, 70);
    this.lookAt = new THREE.Vector3(0, 0, 0);
    this.mode = 'orbit';
    this.camId = 0;
    this.time = 0;
    this.actors = [];
    this.labels = [];
    this.edges = new Map();
    this.crystals = new Map();
    this.spinners = [];
    this.insets = { top: 0, bottom: 0, left: 0, right: 0 };

    this.buildEnvironment();
    this.buildTerrain();
    this.buildLocations();
    this.buildActors();
    this.buildStage();

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      canvas.addEventListener(type, (e) => this.onPointer(type, e));
    }
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    this.clock = new THREE.Clock();
    r.setAnimationLoop(() => this.frame());
  }

  // ---------- environment ----------
  buildEnvironment() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#e3f4ff', '#8bb26a', 1.5));
    const sun = (this.sun = new THREE.DirectionalLight('#fff1d6', 2.6));
    sun.position.set(30, 48, 26);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -46;
    sc.right = sc.top = 46;
    sc.near = 1;
    sc.far = 140;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    s.add(sun);

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 32, 16),
      new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false })
    );
    s.add(this.sky);

    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.ShaderMaterial({
        vertexShader: WATER_VERT,
        fragmentShader: WATER_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uFar: { value: new THREE.Color('#e9f4ff') } },
      })
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.renderOrder = 1;
    s.add(this.water);

    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true, emissive: '#ffffff', emissiveIntensity: 0.25 });
    const puff = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 12; i++) {
      const c = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const m = new THREE.Mesh(puff, cloudMat);
        m.position.set((k - 2) * 1.6 + Math.random(), Math.random() * 0.8, Math.random() * 1.5);
        m.scale.setScalar(1.2 + Math.random() * 1.3);
        c.add(m);
      }
      c.userData = { a: (i / 12) * Math.PI * 2, r: 30 + Math.random() * 50, y: 15 + Math.random() * 7, v: 0.01 + Math.random() * 0.012 };
      c.scale.setScalar(1 + Math.random());
      s.add(c);
      this.clouds.push(c);
    }
  }

  buildTerrain() {
    const geo = new THREE.PlaneGeometry(110, 110, 150, 150);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const sand = new THREE.Color('#f2dfa2'), wet = new THREE.Color('#d6c189'), deep = new THREE.Color('#4fb7b3');
    const grassA = new THREE.Color('#8fd16a'), grassB = new THREE.Color('#5fb447'), hill = new THREE.Color('#a79fc6');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = height(x, z);
      pos.setY(i, h);
      if (h < -0.15) c.copy(wet).lerp(deep, smooth(-0.3, -2.4, h));
      else if (h < 0.42) c.copy(sand);
      else {
        c.copy(grassA).lerp(grassB, 0.5 + 0.5 * Math.sin(x * 0.31) * Math.cos(z * 0.27));
        if (h > 3.4) c.lerp(hill, smooth(3.4, 5.2, h));
      }
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }));
    land.receiveShadow = true;
    this.scene.add(land);
  }

  // ---------- places ----------
  locGroup(id) {
    const l = LOCS[id];
    const g = new THREE.Group();
    g.position.set(l.x, l.y, l.z);
    g.rotation.y = l.face;
    this.scene.add(g);
    return g;
  }

  // Convert a spot in a location's local frame (front = +z) to a world position on the ground.
  spot(id, lx, lz, lift = 0) {
    const l = LOCS[id];
    const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), l.face);
    v.x += l.x;
    v.z += l.z;
    v.y = groundY(v.x, v.z) + lift;
    return v;
  }

  buildLocations() {
    this.buildVillage(this.locGroup('village'));
    this.buildMarket(this.locGroup('market'));
    this.buildLibrary(this.locGroup('library'));
    this.buildForest(this.locGroup('forest'));
    this.buildGarden(this.locGroup('garden'));
    this.buildRiver(this.locGroup('river'));
    this.buildClockTower(this.locGroup('clocktower'));
    this.buildCave(this.locGroup('cave'));
    this.buildCastle(this.locGroup('castle'));
    this.buildTrees();
    for (const [id, l] of Object.entries(LOCS)) {
      const sp = textSprite(l.name, 1.5, { color: '#ffffff', stroke: '#3d2c5a', weight: 700 });
      sp.position.set(l.x, l.y + (id === 'clocktower' ? 11.5 : id === 'castle' ? 9 : 6.5), l.z);
      sp.userData.id = id;
      this.scene.add(sp);
      this.labels.push(sp);
    }
  }

  buildVillage(g) {
    const houses = [
      [-3.6, -1.4, 0.35, '#ffb4a2', '#e76f51'], [0, -3.4, 0, '#fff1b8', '#4361ee'], [3.6, -1.4, -0.35, '#cdeac0', '#9d4edd'],
      [-6.3, 1.4, 0.8, '#bde0fe', '#f15bb5'], [6.3, 1.4, -0.8, '#ffd6a5', '#2a9d8f'],
    ];
    for (const [x, z, rot, wall, roof] of houses) {
      const h = new THREE.Group();
      h.position.set(x, 0, z);
      h.rotation.y = rot;
      g.add(h);
      box(h, 2, 1.6, 1.8, wall, 0, 0.8, 0);
      const rf = cone(h, 1.75, 1.3, roof, 0, 2.25, 0, 4);
      rf.rotation.y = Math.PI / 4;
      box(h, 0.5, 0.85, 0.06, '#7f5539', 0, 0.43, 0.91);
      for (const s of [-1, 1]) box(h, 0.42, 0.42, 0.06, '#fff3b0', s * 0.62, 1.0, 0.91, { emissive: '#ffe08a', emissiveIntensity: 0.4 });
      box(h, 0.3, 0.7, 0.3, '#b5838d', 0.55, 2.5, -0.3);
    }
    const w = new THREE.Group();
    w.position.set(2.6, 0, 2.4);
    g.add(w);
    cyl(w, 0.6, 0.65, 0.6, '#b8b8c8', 0, 0.3, 0, 14);
    cyl(w, 0.5, 0.5, 0.05, '#3fa7d6', 0, 0.6, 0, 14);
    for (const s of [-1, 1]) box(w, 0.08, 1.1, 0.08, '#8d5a3b', s * 0.5, 0.9, 0);
    cone(w, 0.85, 0.55, '#e76f51', 0, 1.65, 0, 4).rotation.y = Math.PI / 4;
  }

  buildMarket(g) {
    const stalls = [[-3, -0.6, 0.35, '#ff6b6b'], [0, -2.2, 0, '#ffd166'], [3, -0.6, -0.35, '#4cc9f0']];
    const goods = ['#ef476f', '#f9a03f', '#80b918', '#ff8fab'];
    stalls.forEach(([x, z, rot, color], si) => {
      const s = new THREE.Group();
      s.position.set(x, 0, z);
      s.rotation.y = rot;
      g.add(s);
      box(s, 2.2, 0.9, 1, '#c08552', 0, 0.45, 0);
      for (const [px, pz] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) cyl(s, 0.05, 0.05, 2.3, '#8d5a3b', px, 1.15, pz, 6);
      const awning = add(s, new THREE.BoxGeometry(2.5, 0.12, 1.5), new THREE.MeshStandardMaterial({ map: stripeTexture(color), roughness: 0.8 }), 0, 2.3, 0.1);
      awning.rotation.x = 0.15;
      for (let k = 0; k < 6; k++) {
        if (si === 1) {
          cyl(s, 0.14, 0.11, 0.16, '#f4a261', -0.8 + k * 0.32, 0.98, 0.15, 8);
          sph(s, 0.14, '#ff8fab', -0.8 + k * 0.32, 1.1, 0.15);
        } else sph(s, 0.13, goods[(k + si) % 4], -0.8 + k * 0.32, 1.02, 0.15);
      }
    });
    for (let k = 0; k < 4; k++) cyl(g, 0.3, 0.3, 0.55, '#a47148', -4.5 + k * 0.7, 0.28, 2.2, 10);
  }

  buildLibrary(g) {
    box(g, 6, 3.2, 3.6, '#f4ecd8', 0, 1.6, -1.4);
    box(g, 6.6, 0.3, 4.2, '#c9b79c', 0, 3.35, -1.4);
    for (const x of [-2.1, -0.7, 0.7, 2.1]) cyl(g, 0.18, 0.2, 2.9, '#ffffff', x, 1.55, 0.6, 10);
    const roof = cone(g, 4.4, 1.5, '#e63946', 0, 4.25, -1.4, 4);
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = 0.7;
    box(g, 1.1, 1.7, 0.1, '#6d4c41', 0, 0.85, 0.42);
    box(g, 3.2, 0.16, 0.9, '#e0d6c2', 0, 0.08, 1.0);
    const book = (this.libraryBook = new THREE.Group());
    book.position.set(0, 6.0, -1.0);
    g.add(book);
    for (const s of [-1, 1]) {
      const page = box(book, 1.5, 0.06, 2.0, '#fffdf5', s * 0.72, 0.2, 0);
      page.rotation.z = -s * 0.3;
      const cover = box(book, 1.6, 0.05, 2.1, '#7b2cbf', s * 0.74, 0.14, 0);
      cover.rotation.z = -s * 0.3;
    }
    for (let k = 0; k < 5; k++) box(g, 0.25, 0.9, 0.7, ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#9b5de5'][k], 2.6 + k * 0.28, 0.45, 1.4);
  }

  buildForest(g) {
    cyl(g, 0.7, 0.95, 3.4, '#8d5a3b', 0, 1.7, -2.6, 10);
    for (const [x, y, z, r] of [[0, 4.2, -2.6, 2.1], [-1.4, 3.6, -2.2, 1.4], [1.4, 3.7, -2.4, 1.5], [0, 5.2, -2.9, 1.4]]) {
      add(g, new THREE.IcosahedronGeometry(r, 0), '#3fa34d', x, y, z);
    }
    add(g, new THREE.CircleGeometry(0.42, 16), '#4a2c1a', 0, 0.9, -1.69);
    for (const [x, z] of [[2, 0.5], [-2.3, 0.8], [2.8, -1], [-1.6, 2]]) {
      cyl(g, 0.07, 0.09, 0.3, '#fff3e0', x, 0.15, z, 6);
      add(g, new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#e63946', x, 0.28, z);
    }
  }

  buildGarden(g) {
    const arch = add(g, new THREE.TorusGeometry(2, 0.14, 8, 28, Math.PI), '#52b788', 0, 0, -1.4);
    arch.castShadow = true;
    const n = 70;
    const palette = ['#f15bb5', '#fee440', '#00bbf9', '#ff6b6b', '#9b5de5', '#ffffff', '#ff9f1c'];
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 5), M('#2d6a4f'), n);
    const heads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.24, 0), new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), n);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    this.flowers = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 1.8 + Math.random() * 3.6;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (z > 1.2 && Math.abs(x) < 2) continue;
      this.flowers.push({ x, z, i, s: 0.8 + Math.random() * 0.5 });
      heads.setColorAt(i, col.set(palette[i % palette.length]));
    }
    stems.count = heads.count = n;
    for (let i = 0; i < n; i++) {
      d.scale.setScalar(0);
      d.updateMatrix();
      stems.setMatrixAt(i, d.matrix);
      heads.setMatrixAt(i, d.matrix);
    }
    stems.castShadow = heads.castShadow = true;
    g.add(stems, heads);
    this.flowerMeshes = { stems, heads, d };
    this.setBloom(0.45);
  }

  setBloom(k) {
    this.bloom = k;
    const { stems, heads, d } = this.flowerMeshes;
    for (const f of this.flowers) {
      const s = f.s * k;
      d.position.set(f.x, 0.35 * s, f.z);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, s, 1);
      d.updateMatrix();
      stems.setMatrixAt(f.i, d.matrix);
      d.position.y = 0.72 * s;
      d.scale.setScalar(s);
      d.updateMatrix();
      heads.setMatrixAt(f.i, d.matrix);
    }
    stems.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  }

  buildRiver(g) {
    const bank = this.spot('river', 0, 4.2);
    const dock = new THREE.Group();
    dock.position.set(0, bank.y + 0.12 - g.position.y, 3.6);
    g.add(dock);
    for (let k = 0; k < 6; k++) box(dock, 2.6, 0.12, 0.34, k % 2 ? '#b07d4f' : '#c69060', 0, 0, -k * 0.38);
    for (const s of [-1, 1]) cyl(dock, 0.1, 0.1, 1.2, '#7f5539', s * 1.2, -0.3, -1.9, 6);
    for (let k = 0; k < 9; k++) {
      const pad = add(g, new THREE.CylinderGeometry(0.45 + Math.random() * 0.3, 0.45, 0.05, 14, 1, false, 0, Math.PI * 1.8), '#40916c', -6 + k * 1.5 + Math.random(), 0.03, (Math.random() - 0.5) * 2.6);
      pad.rotation.y = Math.random() * 6;
    }
  }

  buildClockTower(g) {
    box(g, 3.4, 1, 3.4, '#d9c6a5', 0, 0.5, -1);
    box(g, 2.4, 7, 2.4, '#f6d7a7', 0, 4.5, -1);
    box(g, 2.7, 0.3, 2.7, '#c9a227', 0, 8.1, -1);
    const roof = cone(g, 2.2, 2.6, '#5a189a', 0, 9.5, -1, 4);
    roof.rotation.y = Math.PI / 4;
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.95, 40), new THREE.MeshStandardMaterial({ map: clockFaceTexture(), roughness: 0.6 }));
    face.position.set(0, 6.6, 0.22);
    g.add(face);
    add(g, new THREE.TorusGeometry(0.98, 0.08, 8, 40), '#c9a227', 0, 6.6, 0.22);
    const hand = (len, w, color, z) => {
      const p = new THREE.Group();
      p.position.set(0, 6.6, z);
      const m = box(p, w, len, 0.04, color, 0, len / 2 - 0.08, 0);
      m.castShadow = false;
      g.add(p);
      return p;
    };
    this.towerHands = { hour: hand(0.5, 0.09, '#ef476f', 0.26), minute: hand(0.78, 0.06, '#118ab2', 0.29), running: false };
    this.towerHands.hour.rotation.z = -2.6;
    this.towerHands.minute.rotation.z = -4.4;
    box(g, 0.9, 1.4, 0.1, '#6d4c41', 0, 1.7, 0.22);
    const gear = new THREE.Group();
    gear.position.set(1.25, 3.5, -1);
    gear.rotation.y = Math.PI / 2;
    g.add(gear);
    add(gear, new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16), '#c9a227', 0, 0, 0).rotation.x = Math.PI / 2;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const t = box(gear, 0.22, 0.3, 0.15, '#c9a227', Math.sin(a) * 0.8, Math.cos(a) * 0.8, 0);
      t.rotation.z = -a;
    }
    this.gear = gear;
  }

  buildCave(g) {
    for (const [x, y, z, r] of [[-2, 1, -2, 2.4], [1.8, 1.1, -2.4, 2.6], [0, 2.6, -3.2, 2.5], [-3.7, 0.5, -0.6, 1.5], [3.6, 0.5, -0.8, 1.6], [0, 1.2, -4.5, 3]]) {
      add(g, new THREE.DodecahedronGeometry(r, 0), '#8e8aa8', x, y, z).rotation.set(x, y, z);
    }
    const mouth = add(g, new THREE.SphereGeometry(1.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#231a33', 0, 0, -0.75);
    mouth.scale.set(1, 1.35, 0.55);
    const colors = ['#00f5d4', '#f15bb5', '#fee440', '#4cc9f0', '#9b5de5'];
    for (let k = 0; k < 9; k++) {
      const a = -0.4 + (k / 8) * (Math.PI + 0.8);
      const c = add(g, new THREE.OctahedronGeometry(0.3 + Math.random() * 0.35, 0), colors[k % 5], Math.cos(a) * 3.3, 0.4 + Math.random() * 2.4, -Math.sin(a) * 2.2 - 0.6, {
        emissive: colors[k % 5], emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.2,
      });
      c.scale.y = 1.6;
      this.spinners.push(c);
    }
  }

  buildCastle(g) {
    const stone = '#b9b4d6', roofC = '#5a189a';
    box(g, 7.2, 0.4, 5.4, '#9d97bf', 0, 0.2, -2);
    box(g, 7, 2.4, 0.6, stone, 0, 1.4, 0);
    for (const s of [-1, 1]) box(g, 0.6, 2.4, 4.6, stone, s * 3.3, 1.4, -2.2);
    for (let k = 0; k < 7; k++) box(g, 0.5, 0.45, 0.6, stone, -3 + k, 2.8, 0);
    box(g, 1.5, 1.9, 0.1, '#2b1d3f', 0, 0.95, 0.31);
    box(g, 3.2, 4.8, 3, '#a8a2cc', 0, 2.6, -2.8);
    cone(g, 2.4, 2.4, roofC, 0, 6.2, -2.8, 4).rotation.y = Math.PI / 4;
    this.flags = [];
    for (const [x, z] of [[-3.5, 0], [3.5, 0], [-3.5, -4.4], [3.5, -4.4]]) {
      cyl(g, 0.9, 0.95, 4.6, stone, x, 2.3, z, 12);
      cone(g, 1.15, 2, roofC, x, 5.6, z, 12);
      cyl(g, 0.04, 0.04, 1.2, '#4a4e69', x, 7.1, z, 5);
      const f = add(g, new THREE.PlaneGeometry(0.9, 0.5), new THREE.MeshStandardMaterial({ color: '#f15bb5', side: THREE.DoubleSide }), x + 0.45, 7.4, z);
      this.flags.push(f);
    }
  }

  buildTrees() {
    const spots = [];
    const forest = LOCS.forest;
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 3.8 + Math.random() * 5;
      const lx = Math.cos(a) * rr, lz = Math.sin(a) * rr;
      if (lz > 1.5 && Math.abs(lx) < 4) continue;
      const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), forest.face);
      spots.push([forest.x + v.x, forest.z + v.z]);
    }
    for (let i = 0; i < 400 && spots.length < 140; i++) {
      const x = (Math.random() - 0.5) * 66, z = (Math.random() - 0.5) * 70;
      const h = height(x, z);
      if (h < 0.7 || h > 4) continue;
      if (Object.values(LOCS).some((l) => Math.hypot(x - l.x, z - l.z) < (l.r || 4) + 3)) continue;
      if (Math.abs(z - riverZ(x)) < 4) continue;
      spots.push([x, z]);
    }
    this.treeSpots = spots;
  }

  // Trees are placed after paths so they never block a trail.
  plantTrees() {
    const keep = this.treeSpots.filter(([x, z]) => {
      for (const e of this.edges.values()) if (!e.air && e.points.some((p) => Math.hypot(p.x - x, p.z - z) < 2.2)) return false;
      return true;
    });
    const n = keep.length;
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.14, 0.22, 1.2, 6), M('#8d5a3b'), n);
    const pines = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.4, 7), M('#2d9a4e'), n);
    const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.1, 0), M('#4cb963'), n);
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    keep.forEach(([x, z], i) => {
      const y = height(x, z);
      const s = 0.7 + Math.random() * 0.6;
      d.position.set(x, y + 0.6 * s, z);
      d.rotation.set(0, Math.random() * 6, 0);
      d.scale.setScalar(s);
      d.updateMatrix();
      trunks.setMatrixAt(i, d.matrix);
      const pine = i % 3 !== 0;
      d.position.y = y + (pine ? 2.1 : 1.9) * s;
      d.updateMatrix();
      (pine ? pines : blobs).setMatrixAt(i, d.matrix);
      d.scale.setScalar(0);
      d.updateMatrix();
      (pine ? blobs : pines).setMatrixAt(i, d.matrix);
      col.setHSL(0.3 + Math.random() * 0.06, 0.55, 0.38 + Math.random() * 0.12);
      pines.setColorAt(i, col);
      blobs.setColorAt(i, col);
    });
    for (const m of [trunks, pines, blobs]) {
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
  }

  // Stepping-stone trails between story places. `air` edges (balloon, tunnel…) get no stones.
  buildPaths(edges) {
    const stones = [];
    for (const { from, to, air } of edges) {
      const key = [from, to].sort().join('>');
      if (this.edges.has(key)) continue;
      const a = LOCS[from], b = LOCS[to];
      const A = new THREE.Vector3(a.x, 0, a.z), B = new THREE.Vector3(b.x, 0, b.z);
      const mid = A.clone().lerp(B, 0.5);
      const n = new THREE.Vector3(-(B.z - A.z), 0, B.x - A.x).normalize().multiplyScalar((Math.random() - 0.5) * 5);
      const curve = new THREE.CatmullRomCurve3([A, A.clone().lerp(B, 0.25).add(n.clone().multiplyScalar(0.6)), mid.add(n), A.clone().lerp(B, 0.75).add(n.clone().multiplyScalar(0.6)), B]);
      const len = curve.getLength();
      const points = curve.getSpacedPoints(Math.ceil(len / 0.5)).map((p) => {
        p.y = groundY(p.x, p.z);
        return p;
      });
      this.edges.set(key, { from, to, air, points });
      if (air) continue;
      for (let i = 0; i < points.length; i += 2) {
        const p = points[i];
        if (Math.hypot(p.x - a.x, p.z - a.z) < 3 || Math.hypot(p.x - b.x, p.z - b.z) < 3) continue;
        stones.push(p);
      }
    }
    const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.36, 0.14, 7), M('#f3e2c0'), stones.length);
    const d = new THREE.Object3D();
    stones.forEach((p, i) => {
      d.position.set(p.x + (Math.random() - 0.5) * 0.3, p.y + 0.04, p.z + (Math.random() - 0.5) * 0.3);
      d.rotation.y = Math.random() * 3;
      d.scale.setScalar(0.8 + Math.random() * 0.4);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    });
    m.receiveShadow = true;
    this.scene.add(m);
    this.plantTrees();
  }

  // ---------- characters ----------
  buildActors() {
    this.chars = {};
    for (const [id, c] of Object.entries(CHARACTERS)) {
      if (!c.loc) continue;
      const a = c.make();
      a.position.copy(this.spot(c.loc, 2.4, 3.2));
      a.rotation.y = LOCS[c.loc].face - 0.4;
      this.scene.add(a);
      this.actors.push(a);
      this.chars[id] = a;
    }
    this.hoot = this.chars.hoot = CHARACTERS.hoot.make();
    this.hoot.scale.setScalar(0.8);
    this.hoot.userData.hover = 1.4;
    this.kid = makeKid();
    this.kid.scale.setScalar(0.95);
    this.balloon = new THREE.Group();
    const env = add(this.balloon, new THREE.SphereGeometry(1.4, 20, 14), new THREE.MeshStandardMaterial({ map: stripeTexture('#ff6b6b'), roughness: 0.6 }), 0, 4.2, 0);
    env.scale.y = 1.2;
    for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) cyl(this.balloon, 0.015, 0.015, 2.2, '#5c4033', x * 1.1, 2.4, z * 1.1, 4);
    this.balloon.visible = false;
    this.kid.add(this.balloon);
    this.scene.add(this.hoot, this.kid);
    this.actors.push(this.hoot, this.kid);
    this.placeParty('village');
  }

  placeParty(id) {
    this.kid.position.copy(this.spot(id, -1.3, 3.8));
    this.kid.rotation.y = LOCS[id].face + 0.35;
    this.hoot.position.copy(this.spot(id, -2.7, 2.9));
    this.hoot.rotation.y = LOCS[id].face + 0.5;
    this.kid.visible = true;
    this.at = id;
  }

  setShirt(color) {
    this.kid.userData.shirt.color.set(color);
  }

  talk(who, seconds = 2.2) {
    const a = who === 'you' ? this.kid : this.chars[who];
    if (a) a.userData.talk = seconds;
  }

  // ---------- camera ----------
  viewFor(id) {
    const l = LOCS[id];
    const tall = id === 'clocktower' ? 1.6 : id === 'castle' ? 1.2 : 0;
    return { pos: this.spot(id, 0, 12.5, 5.2 + tall * 1.5), target: new THREE.Vector3(l.x, l.y + 1.8 + tall, l.z) };
  }

  setView(pos, target) {
    this.camera.position.copy(pos);
    this.lookAt.copy(target);
    this.camera.lookAt(this.lookAt);
  }

  async flyTo(id, duration = 2) {
    const cam = ++this.camId;
    this.mode = 'fixed';
    const { pos, target } = this.viewFor(id);
    const p0 = this.camera.position.clone(), t0 = this.lookAt.clone();
    const lift = Math.min(12, p0.distanceTo(pos) * 0.25);
    await tween(duration, (k) => {
      if (cam !== this.camId) return;
      this.camera.position.lerpVectors(p0, pos, k);
      this.camera.position.y += Math.sin(Math.PI * k) * lift;
      this.lookAt.lerpVectors(t0, target, k);
    });
  }

  orbit() {
    this.camId++;
    this.mode = 'orbit';
  }

  async travel(from, to, mode = 'walk') {
    const key = [from, to].sort().join('>');
    const e = this.edges.get(key);
    let pts = e ? (e.from === from ? e.points : [...e.points].reverse()) : null;
    if (!pts) {
      const a = this.spot(from, 0, 0), b = this.spot(to, 0, 0);
      pts = new THREE.CatmullRomCurve3([a, a.clone().lerp(b, 0.5), b]).getSpacedPoints(60);
    }
    const start = this.kid.position.clone(), end = this.spot(to, -1.3, 3.8);
    const curve = new THREE.CatmullRomCurve3([start, ...pts.slice(3, -3), end]);
    const len = curve.getLength();
    const air = mode === 'balloon' || mode === 'fly';
    const dur = Math.min(6, Math.max(2.8, len / (air ? 7 : 5.5)));
    const cam = ++this.camId;
    this.mode = 'follow';
    this.balloon.visible = mode === 'balloon';
    this.hoot.userData.flying = true;
    const tunnel = mode === 'tunnel';
    const tmp = new THREE.Vector3(), ahead = new THREE.Vector3();
    await tween(dur, (k) => {
      if (cam !== this.camId) return;
      curve.getPointAt(k, tmp);
      curve.getPointAt(Math.min(1, k + 0.02), ahead);
      const hop = air ? Math.sin(Math.PI * k) * 9 : Math.abs(Math.sin(k * len * 1.6)) * 0.15;
      this.kid.position.set(tmp.x, tmp.y + hop, tmp.z);
      if (ahead.distanceToSquared(tmp) > 1e-6) this.kid.rotation.y = Math.atan2(ahead.x - tmp.x, ahead.z - tmp.z);
      this.kid.visible = !tunnel || k < 0.08 || k > 0.92;
      this.hoot.position.set(tmp.x - 1.2, tmp.y + hop + 1.2 + Math.sin(k * 20) * 0.2, tmp.z + 0.6);
      this.hoot.rotation.y = this.kid.rotation.y;
    }, ease.inOut);
    this.balloon.visible = false;
    this.hoot.userData.flying = false;
    if (cam !== this.camId) return;
    this.placeParty(to);
    await this.flyTo(to, 1.6);
  }

  // ---------- progress effects ----------
  setCrystals(ids) {
    for (const id of ids) {
      if (this.crystals.has(id)) continue;
      const l = LOCS[id];
      const c = new THREE.Mesh(CRYSTAL_GEO, new THREE.MeshStandardMaterial({ color: l.color, emissive: l.color, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0.3, flatShading: true }));
      c.position.set(l.x, l.y + (id === 'clocktower' ? 11 : id === 'castle' ? 9.5 : 5.5), l.z);
      c.scale.set(1, 1.5, 1);
      this.scene.add(c);
      this.crystals.set(id, c);
      if (id === 'clocktower') this.towerHands.running = true;
      if (id === 'garden') tween(2, (k) => this.setBloom(0.45 + 0.55 * k), ease.out);
    }
  }

  resetCrystals() {
    for (const c of this.crystals.values()) this.scene.remove(c);
    this.crystals.clear();
    this.towerHands.running = false;
    this.setBloom(0.45);
    if (this.rainbow) this.rainbow.visible = false;
  }

  showRainbow() {
    if (!this.rainbow) {
      this.rainbow = new THREE.Group();
      ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].forEach((c, i) => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(26 - i * 0.9, 0.45, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.75, fog: false }));
        this.rainbow.add(m);
      });
      this.rainbow.position.set(0, 0, -12);
      this.scene.add(this.rainbow);
    }
    this.rainbow.visible = true;
    this.rainbow.scale.setScalar(0.01);
    return tween(2.5, (k) => this.rainbow.scale.setScalar(Math.max(0.01, k)), ease.out);
  }

  // ---------- puzzle stage (rendered on top, attached to the camera) ----------
  buildStage() {
    const s = (this.stageScene = new THREE.Scene());
    this.stageCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
    this.stageCam.position.z = 2000;
    this.stageRoot = new THREE.Group();
    s.add(this.stageRoot);
    this.stage = new THREE.Group();
    this.stageRoot.add(this.stage);
    this.stageRoot.add(new THREE.HemisphereLight('#ffffff', '#b8c4ff', 1.6));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(3, 6, 4);
    this.stage.add(key);
    key.target.position.set(0, 0, 0);
    this.stage.add(key.target);

    const shape = new THREE.Shape();
    const w = 10.8, h = 7.6, r = 0.7;
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    this.backdrop = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: '#fffaf0', transparent: true, opacity: 0.94, depthWrite: false, toneMapped: false }));
    this.backdrop.position.z = -1.6;
    this.backdrop.renderOrder = -1;
    this.backdrop.visible = false;
    this.stage.add(this.backdrop);

    this.confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 0.22), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), 160);
    this.confetti.frustumCulled = false;
    this.confettiParts = [];
    const palette = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f15bb5'];
    const col = new THREE.Color();
    for (let i = 0; i < 160; i++) {
      this.confetti.setColorAt(i, col.set(palette[i % palette.length]));
      this.confettiParts.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), life: 0 });
    }
    this.stage.add(this.confetti);
    this.updateConfetti(0);
  }

  setInsets(insets) {
    this.insets = insets;
    this.fitStage();
  }

  // The stage uses an orthographic camera in screen pixels, so puzzles never get perspective-skewed.
  fitStage() {
    const W = this.canvas.clientWidth || 1, H = this.canvas.clientHeight || 1;
    const cam = this.stageCam;
    cam.left = -W / 2;
    cam.right = W / 2;
    cam.top = H / 2;
    cam.bottom = -H / 2;
    cam.updateProjectionMatrix();
    const { top, bottom, left, right } = this.insets;
    const aw = Math.max(40, W - left - right), ah = Math.max(40, H - top - bottom);
    const cx = left + aw / 2, cy = top + ah / 2;
    this.stage.position.set(cx - W / 2, H / 2 - cy, 0);
    this.stage.scale.setScalar(Math.min(aw / 11.2, ah / 8));
    this.stageBase = this.stage.position.clone();
  }

  setPuzzle(p) {
    this.clearPuzzle();
    this.puzzle = p;
    if (!p) return;
    this.backdrop.visible = true;
    this.stage.add(p.group);
    p.group.scale.setScalar(0.8);
    tween(0.45, (k) => p.group.scale.setScalar(0.8 + 0.2 * k), ease.back);
  }

  clearPuzzle() {
    if (this.puzzle) {
      this.stage.remove(this.puzzle.group);
      this.puzzle.dispose();
      this.puzzle = null;
    }
    this.backdrop.visible = false;
  }

  burst(n = 90) {
    let made = 0;
    for (const c of this.confettiParts) {
      if (c.life > 0) continue;
      c.p.set((Math.random() - 0.5) * 2, -0.5 + Math.random(), 0.5);
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 5;
      c.v.set(Math.cos(a) * sp, 4 + Math.random() * 5, Math.random() * 2);
      c.r.set(Math.random() * 6, Math.random() * 6, 0);
      c.life = 1.6 + Math.random() * 0.8;
      if (++made >= n) break;
    }
  }

  updateConfetti(dt) {
    const d = new THREE.Object3D();
    this.confettiParts.forEach((c, i) => {
      if (c.life > 0) {
        c.life -= dt;
        c.v.y -= 9 * dt;
        c.v.multiplyScalar(1 - dt * 0.8);
        c.p.addScaledVector(c.v, dt);
        c.r.x += dt * 6;
        c.r.y += dt * 4;
      }
      d.position.copy(c.p);
      d.rotation.copy(c.r);
      d.scale.setScalar(c.life > 0 ? Math.min(1, c.life * 2) : 0);
      d.updateMatrix();
      this.confetti.setMatrixAt(i, d.matrix);
    });
    this.confetti.instanceMatrix.needsUpdate = true;
  }

  shake() {
    const base = this.stageBase.clone();
    return tween(0.45, (k) => {
      this.stage.position.x = base.x + Math.sin(k * Math.PI * 6) * (1 - k) * 0.25 * this.stage.scale.x;
    }, ease.linear);
  }

  onPointer(type, e) {
    if (!this.puzzle) return;
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.stageCam);
    const handled = this.puzzle.pointer(type === 'pointercancel' ? 'up' : type.slice(7), this.raycaster);
    if (type === 'pointerdown' && handled) this.canvas.setPointerCapture?.(e.pointerId);
  }

  // ---------- loop ----------
  resize() {
    const W = this.canvas.clientWidth, H = this.canvas.clientHeight;
    if (!W || !H) return;
    this.renderer.setSize(W, H, false);
    this.camera.aspect = W / H;
    this.camera.fov = W / H < 0.75 ? 55 : 45;
    this.camera.updateProjectionMatrix();
    this.fitStage();
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = (this.time += dt);
    updateTweens(dt);
    this.water.material.uniforms.uTime.value = t;
    for (const a of this.actors) animateActor(a, t, dt);
    for (const c of this.clouds) {
      const u = c.userData;
      u.a += u.v * dt;
      c.position.set(Math.cos(u.a) * u.r, u.y, Math.sin(u.a) * u.r);
    }
    for (const s of this.spinners) s.rotation.y += dt * 0.8;
    for (const c of this.crystals.values()) {
      c.rotation.y += dt * 1.5;
      c.position.y += Math.sin(t * 2) * 0.004;
    }
    if (this.libraryBook) this.libraryBook.position.y = 6 + Math.sin(t * 1.5) * 0.25;
    this.flags?.forEach((f, i) => (f.rotation.y = Math.sin(t * 3 + i) * 0.4));
    if (this.towerHands.running) {
      this.towerHands.minute.rotation.z -= dt * 1.2;
      this.towerHands.hour.rotation.z -= dt * 0.1;
      this.gear.rotation.z += dt;
    }

    if (this.mode === 'orbit') {
      const a = t * 0.05;
      this.camera.position.set(Math.sin(a) * 62, 40, Math.cos(a) * 62);
      this.lookAt.set(0, 0, -2);
    } else if (this.mode === 'follow') {
      const want = this.kid.position.clone().add(new THREE.Vector3(0, 13, 15));
      this.camera.position.lerp(want, 1 - Math.exp(-dt * 3));
      this.lookAt.lerp(this.kid.position, 1 - Math.exp(-dt * 4));
    }
    this.camera.lookAt(this.lookAt);
    this.sky.position.copy(this.camera.position);
    for (const l of this.labels) l.visible = this.camera.position.distanceTo(l.position) > 24 && !this.puzzle;

    this.camera.updateMatrixWorld();
    this.puzzle?.update(dt, t);
    this.updateConfetti(dt);

    const r = this.renderer;
    r.clear();
    r.render(this.scene, this.camera);
    r.clearDepth();
    r.render(this.stageScene, this.stageCam);
  }
}
