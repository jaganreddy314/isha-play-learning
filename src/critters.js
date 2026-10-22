import * as THREE from 'three';

// Cute characters built from primitives. Every actor faces +Z and stands on y = 0.
const SPHERE = new THREE.SphereGeometry(1, 24, 16);
SPHERE.userData.keep = true;
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...o });

function ball(parent, material, r, x, y, z, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(SPHERE, material);
  m.position.set(x, y, z);
  m.scale.set(r * sx, r * sy, r * sz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function addEyes(parent, { y, spread, z, size }) {
  const white = std('#ffffff', { roughness: 0.25 });
  const dark = std('#1f1a2e', { roughness: 0.2 });
  return [-1, 1].map((s) => {
    const e = new THREE.Group();
    e.position.set(s * spread, y, z);
    ball(e, white, size, 0, 0, 0);
    ball(e, dark, size * 0.62, 0, -size * 0.05, size * 0.5);
    ball(e, white, size * 0.2, size * 0.2, size * 0.18, size * 1.0);
    parent.add(e);
    return e;
  });
}

function tube(parent, material, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, radius, 8), material);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function finish(root, inner, parts) {
  root.userData = { inner, phase: Math.random() * 10, talk: 0, ...parts };
  return root;
}

export function makeCritter({ body = '#c8a27c', belly = '#f7e7d3', ears = 'round', inner = '#f6b8c8', tail = null, frog = false, glasses = false, hat = null, scale = 1 } = {}) {
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const B = std(body), L = std(belly), P = std(inner);
  ball(g, B, 0.5, 0, 0.6, 0, 1, 1.05, 0.92);
  ball(g, L, 0.38, 0, 0.56, 0.2, 1, 1.05, 0.72);
  for (const s of [-1, 1]) ball(g, B, 0.16, s * 0.22, 0.1, 0.16, 1.2, 0.6, 1.5);
  const arms = [-1, 1].map((s) => ball(g, B, 0.12, s * 0.46, 0.72, 0.12, 0.9, 1.5, 0.9));

  const head = new THREE.Group();
  head.position.y = 1.38;
  g.add(head);
  ball(head, B, 0.48, 0, 0, 0, frog ? 1.3 : 1, frog ? 0.82 : 1, 0.95);
  ball(head, L, 0.22, 0, -0.12, 0.34, frog ? 1.8 : 1.3, 0.8, 0.8);
  if (!frog) ball(head, std('#e5677d'), 0.07, 0, -0.04, 0.52);
  for (const s of [-1, 1]) ball(head, std('#ff9db0'), 0.08, s * 0.3, -0.12, 0.36, 1, 0.6, 0.5);
  let eyes;
  if (frog) {
    for (const s of [-1, 1]) ball(head, B, 0.2, s * 0.27, 0.3, 0.1);
    eyes = addEyes(head, { y: 0.34, spread: 0.27, z: 0.2, size: 0.15 });
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16, Math.PI), std('#2d6a4f'));
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.08, 0.5);
    head.add(smile);
  } else {
    eyes = addEyes(head, { y: 0.08, spread: 0.17, z: 0.38, size: 0.11 });
  }

  const earParts = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    if (ears === 'long') {
      e.position.set(s * 0.18, 0.4, -0.04);
      e.rotation.z = -s * 0.18;
      ball(e, B, 0.13, 0, 0.42, 0, 1, 3.3, 0.6);
      ball(e, P, 0.08, 0, 0.42, 0.06, 1, 3, 0.4);
    } else if (ears === 'round') {
      e.position.set(s * 0.34, 0.36, -0.04);
      ball(e, B, 0.2, 0, 0, 0, 1, 1, 0.45);
      ball(e, P, 0.12, 0, 0, 0.05, 1, 1, 0.3);
    } else if (ears === 'pointy') {
      e.position.set(s * 0.27, 0.4, 0);
      e.rotation.z = -s * 0.35;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 4), B);
      c.castShadow = true;
      e.add(c);
      const ci = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.24, 4), P);
      ci.position.set(0, -0.04, 0.08);
      e.add(ci);
    } else continue;
    head.add(e);
    earParts.push(e);
  }

  if (tail === 'puff') ball(g, L, 0.16, 0, 0.42, -0.5);
  if (tail === 'long') tube(g, B, [[0, 0.35, -0.42], [0.25, 0.4, -0.75], [0.35, 0.9, -0.85], [0.2, 1.15, -0.7]], 0.07);
  if (tail === 'thin') tube(g, P, [[0, 0.3, -0.42], [-0.2, 0.25, -0.8], [-0.45, 0.45, -0.95]], 0.035);
  if (tail === 'bushy') {
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      ball(g, B, 0.22 + 0.1 * Math.sin(t * Math.PI), 0, 0.4 + t * 1.15, -0.55 - Math.sin(t * Math.PI) * 0.35);
    }
  }
  if (glasses) {
    const gm = std('#3d405b', { metalness: 0.4 });
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 20), gm);
      r.position.set(s * 0.17, 0.08, 0.5);
      head.add(r);
    }
  }
  if (hat === 'chef') {
    const w = std('#ffffff');
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.26, 16), w);
    band.position.y = 0.48;
    head.add(band);
    ball(head, w, 0.3, 0, 0.7, 0, 1, 0.7, 1);
  }
  if (hat === 'miner') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std('#ffbe0b'));
    helm.position.y = 0.05;
    head.add(helm);
    ball(head, std('#fff6c2', { emissive: '#ffe066', emissiveIntensity: 1.5 }), 0.09, 0, 0.32, 0.42);
  }
  if (hat === 'bow') {
    const red = std('#e63946');
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), red);
      c.rotation.z = s * Math.PI / 2;
      c.position.set(s * 0.1, 0.98, 0.42);
      g.add(c);
    }
  }
  root.scale.setScalar(scale);
  return finish(root, g, { head, eyes, arms, ears: earParts });
}

export function makeBird({ body = '#b07d4f', belly = '#f3dfbf', beak = '#f4a340', tufts = false, crown = false, scale = 1 } = {}) {
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const B = std(body), L = std(belly);
  ball(g, B, 0.6, 0, 0.75, 0, 1, 1.12, 0.95);
  ball(g, L, 0.45, 0, 0.66, 0.24, 1, 1.05, 0.7);
  for (const s of [-1, 1]) ball(g, std(beak), 0.1, s * 0.2, 0.06, 0.2, 1.4, 0.5, 1.6);
  const head = new THREE.Group();
  head.position.y = 1.42;
  g.add(head);
  ball(head, B, 0.44, 0, 0, 0);
  for (const s of [-1, 1]) ball(head, L, 0.19, s * 0.17, 0.03, 0.3, 1, 1, 0.45);
  const eyes = addEyes(head, { y: 0.05, spread: 0.17, z: 0.36, size: 0.12 });
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 8), std(beak));
  bk.rotation.x = Math.PI / 2;
  bk.position.set(0, -0.12, 0.46);
  head.add(bk);
  if (tufts) {
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 6), B);
      c.position.set(s * 0.26, 0.4, 0);
      c.rotation.z = -s * 0.45;
      head.add(c);
    }
  }
  if (crown) {
    const gold = std('#ffd166', { metalness: 0.6, roughness: 0.3 });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 10), gold);
    band.position.y = 0.45;
    head.add(band);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), gold);
      c.position.set(Math.sin(a) * 0.17, 0.58, Math.cos(a) * 0.17);
      head.add(c);
    }
  }
  const wings = [-1, 1].map((s) => {
    const w = new THREE.Group();
    w.position.set(s * 0.55, 1.0, 0);
    ball(w, B, 0.3, s * 0.08, -0.28, -0.02, 0.35, 1.1, 0.8);
    g.add(w);
    w.userData.side = s;
    return w;
  });
  root.scale.setScalar(scale);
  return finish(root, g, { head, eyes, wings });
}

export function makeKid(shirt = '#ff6b9a') {
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const skin = std('#e7b58c'), hair = std('#3b2418'), pants = std('#3a5a99');
  const shirtMat = std(shirt);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10), pants);
    leg.position.set(s * 0.14, 0.24, 0);
    leg.castShadow = true;
    g.add(leg);
    ball(g, std('#ffffff'), 0.13, s * 0.14, 0.05, 0.06, 1, 0.6, 1.4);
  }
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.72, 16), shirtMat);
  torso.position.y = 0.8;
  torso.castShadow = true;
  g.add(torso);
  const arms = [-1, 1].map((s) => ball(g, shirtMat, 0.12, s * 0.4, 0.86, 0, 0.9, 1.9, 0.9));
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.48, 0.2), std('#ffd166'));
  pack.position.set(0, 0.85, -0.36);
  g.add(pack);
  const head = new THREE.Group();
  head.position.y = 1.5;
  g.add(head);
  ball(head, skin, 0.42, 0, 0, 0);
  ball(head, hair, 0.445, 0, 0.09, -0.07, 1, 0.95, 1);
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Group();
    e.position.set(s * 0.14, 0, 0.39);
    ball(e, std('#2b2118'), 0.06, 0, 0, 0);
    head.add(e);
    return e;
  });
  for (const s of [-1, 1]) ball(head, std('#ff9db0'), 0.07, s * 0.24, -0.1, 0.33, 1, 0.6, 0.5);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12, Math.PI), std('#8c3b3b'));
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.13, 0.4);
  head.add(smile);
  return finish(root, g, { head, eyes, arms, shirt: shirtMat });
}

export function animateActor(a, t, dt) {
  const u = a.userData;
  const p = u.phase + t;
  u.talk = Math.max(0, u.talk - dt);
  const talking = u.talk > 0;
  u.inner.position.y = (u.hover || 0) + Math.abs(Math.sin(p * (talking ? 9 : 2))) * (talking ? 0.09 : 0.03);
  u.inner.rotation.z = Math.sin(p * 1.3) * 0.03;
  if (u.head) {
    u.head.rotation.z = talking ? Math.sin(p * 7) * 0.12 : Math.sin(p * 0.8) * 0.05;
    u.head.rotation.x = talking ? Math.sin(p * 5) * 0.05 : 0;
  }
  const blink = p % 4 < 0.12 ? 0.15 : 1;
  for (const e of u.eyes || []) e.scale.y = blink;
  for (const [i, e] of (u.ears || []).entries()) e.rotation.x = Math.sin(p * 3 + i) * 0.08;
  if (u.wings) {
    const flap = u.flying || talking ? Math.sin(p * 16) * 0.7 : Math.sin(p * 2) * 0.08;
    for (const w of u.wings) w.rotation.z = w.userData.side * (0.15 + flap);
  }
  if (u.arms && talking) u.arms[1].rotation.z = Math.sin(p * 8) * 0.4 - 0.3;
  else if (u.arms) u.arms[1].rotation.z = 0;
}
