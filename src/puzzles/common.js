import * as THREE from 'three';

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
export const PASTELS = ['#ffd6e0', '#d0f4de', '#cde7ff', '#fff1c1', '#e4d4ff', '#ffe0c7'];
export const BRIGHTS = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f15bb5', '#00bbf9'];

export function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
    for (const m of [].concat(o.material || [])) {
      m.map?.dispose();
      m.dispose();
    }
  });
}

// Base class for the 3D visual behind a question. `ctx` has onChange() and onComplete() callbacks.
export class Puzzle {
  constructor(q, ctx = {}) {
    this.q = q;
    this.v = q.visual || {};
    this.ctx = ctx;
    this.group = new THREE.Group();
    this.time = 0;
    this.locked = false;
  }
  update(dt) {
    this.time += dt;
  }
  pointer() {
    return false;
  }
  hint() {}
  reveal() {}
  value() {
    return null;
  }
  dispose() {
    disposeTree(this.group);
  }
}

function starGeometry(outer = 0.42, inner = 0.19) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
  g.center();
  return g;
}

// Countable objects, each made of parts drawn with one InstancedMesh per part.
export function itemParts(kind) {
  switch (kind) {
    case 'muffin':
      return [
        { geo: new THREE.CylinderGeometry(0.3, 0.22, 0.34, 12), color: '#f4a261', y: -0.12 },
        { geo: new THREE.SphereGeometry(0.33, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), color: '#ff8fab', y: 0.05, vary: ['#ff8fab', '#ffd6a5', '#cdb4db', '#a0e7e5'] },
      ];
    case 'gem':
      return [{ geo: new THREE.OctahedronGeometry(0.38), color: '#4cc9f0', vary: ['#4cc9f0', '#f72585', '#7209b7', '#80ed99', '#ffd166'], spin: true, flat: true }];
    case 'star':
      return [{ geo: starGeometry(), color: '#ffc43d' }];
    case 'berry':
      return [{ geo: new THREE.SphereGeometry(0.3, 14, 10), color: '#9b5de5', vary: ['#9b5de5', '#7b2cbf', '#c77dff'] }];
    case 'acorn':
      return [
        { geo: new THREE.SphereGeometry(0.26, 12, 10), color: '#c58940', y: -0.06, sy: 1.2 },
        { geo: new THREE.SphereGeometry(0.29, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), color: '#6f4518', y: 0.06 },
      ];
    case 'cookie':
      return [{ geo: new THREE.CylinderGeometry(0.34, 0.34, 0.12, 18).rotateX(Math.PI / 2), color: '#e9b872' }];
    default:
      return [
        { geo: new THREE.SphereGeometry(0.33, 14, 10), color: '#ef476f', vary: ['#ef476f', '#e63946', '#80b918'] },
        { geo: new THREE.CylinderGeometry(0.03, 0.03, 0.18, 5), color: '#6b4226', y: 0.34 },
      ];
  }
}

// Instanced set of `count` items. Positions/scales live in plain arrays; call sync() after changing them.
export class ItemSet {
  constructor(kind, count, parent) {
    this.count = count;
    this.pos = Array.from({ length: count }, () => new THREE.Vector3());
    this.scale = new Float32Array(count);
    this.spin = new Float32Array(count).map(() => Math.random() * 6);
    this.base = [];
    this.parts = itemParts(kind).map((p) => {
      const mesh = new THREE.InstancedMesh(p.geo, std(p.color, { flatShading: !!p.flat, metalness: p.flat ? 0.2 : 0 }), count);
      mesh.frustumCulled = false;
      const col = new THREE.Color();
      if (p.vary) {
        for (let i = 0; i < count; i++) mesh.setColorAt(i, col.set(p.vary[i % p.vary.length]));
      }
      parent.add(mesh);
      return { ...p, mesh };
    });
    this.d = new THREE.Object3D();
    this.meshes = this.parts.map((p) => p.mesh);
  }
  setColor(i, color) {
    const p = this.parts.find((x) => x.vary) || this.parts[0];
    if (!p.mesh.instanceColor) {
      const c = new THREE.Color(p.color);
      for (let k = 0; k < this.count; k++) p.mesh.setColorAt(k, c);
    }
    p.mesh.setColorAt(i, new THREE.Color(color ?? (p.vary ? p.vary[i % p.vary.length] : p.color)));
    p.mesh.instanceColor.needsUpdate = true;
  }
  sync(time = 0) {
    const d = this.d;
    for (let i = 0; i < this.count; i++) {
      const s = this.scale[i];
      for (const p of this.parts) {
        d.position.set(this.pos[i].x, this.pos[i].y + (p.y || 0) * s, this.pos[i].z);
        d.rotation.set(0, p.spin ? time * 1.2 + this.spin[i] : Math.sin(time + this.spin[i]) * 0.3, 0);
        d.scale.set(s, s * (p.sy || 1), s);
        d.updateMatrix();
        p.mesh.setMatrixAt(i, d.matrix);
      }
    }
    for (const p of this.parts) p.mesh.instanceMatrix.needsUpdate = true;
  }
}
