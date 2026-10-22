import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Puzzle, std, BRIGHTS } from './common.js';
import { textMesh } from '../text.js';
import { tween, ease } from '../tween.js';
import { shuffle } from '../questions/util.js';
import { sfx } from '../sound.js';

// Spelling with floating letter blocks: tap blocks to drop them into the slots, tap again to take one back.
export class LetterPuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    const word = (this.word = this.v.word.toLowerCase());
    let letters;
    do letters = shuffle([...word, ...(this.v.decoys || [])]);
    while (letters.join('') === word && word.length > 1);

    const n = word.length;
    const sw = (this.sw = Math.min(1.0, 9.4 / n));
    this.slotPos = [];
    for (let i = 0; i < n; i++) {
      const p = new THREE.Vector3((i - (n - 1) / 2) * sw, -2.3, 0);
      const slot = new THREE.Mesh(new RoundedBoxGeometry(sw * 0.86, sw * 0.86, 0.1, 2, 0.08), std('#e9ecef'));
      slot.position.copy(p).setZ(-0.1);
      const line = new THREE.Mesh(new THREE.BoxGeometry(sw * 0.6, 0.05, 0.05), std('#adb5bd'));
      line.position.set(p.x, p.y - sw * 0.32, 0);
      this.group.add(slot, line);
      this.slotPos.push(p.setZ(0.35));
    }

    const perRow = letters.length > 7 ? Math.ceil(letters.length / 2) : letters.length;
    const spacing = Math.min(1.3, 9.4 / perRow);
    this.cs = Math.min(0.95, spacing * 0.8);
    this.cubes = letters.map((ch, i) => {
      const row = Math.floor(i / perRow);
      const inRow = row === 0 ? Math.min(perRow, letters.length) : letters.length - perRow;
      const j = i % perRow;
      const home = new THREE.Vector3((j - (inRow - 1) / 2) * spacing, 1.9 - row * 1.4 + (Math.random() - 0.5) * 0.2, 0);
      const cube = new THREE.Group();
      cube.position.copy(home);
      const inner = new THREE.Group();
      cube.add(inner);
      const mat = std(BRIGHTS[i % BRIGHTS.length], { roughness: 0.4 });
      const m = new THREE.Mesh(new RoundedBoxGeometry(this.cs, this.cs, this.cs, 3, this.cs * 0.18), mat);
      const t = textMesh(ch, this.cs * 0.95, { color: '#ffffff', stroke: 'rgba(0,0,0,0.25)', weight: 700 });
      t.position.z = this.cs / 2 + 0.01;
      inner.add(m, t);
      cube.userData = { letter: ch, home, slot: -1, inner, mat, phase: Math.random() * 6 };
      this.group.add(cube);
      return cube;
    });
    this.slots = new Array(n).fill(null);
  }

  update(dt) {
    super.update(dt);
    for (const c of this.cubes) {
      const u = c.userData;
      const floating = u.slot < 0;
      u.inner.position.y = floating ? Math.sin(this.time * 2 + u.phase) * 0.08 : 0;
      u.inner.rotation.y = floating ? Math.sin(this.time * 1.3 + u.phase) * 0.35 : 0;
      const glow = this.glow === c ? 1 + Math.abs(Math.sin(this.time * 6)) * 0.2 : 1;
      u.inner.scale.setScalar(glow);
      u.mat.emissive.set(this.glow === c ? '#ffd60a' : '#000000');
      u.mat.emissiveIntensity = this.glow === c ? 0.5 + 0.4 * Math.sin(this.time * 6) : 0;
    }
  }

  move(cube, to, scale) {
    const from = cube.position.clone();
    const s0 = cube.scale.x;
    return tween(0.32, (k) => {
      cube.position.lerpVectors(from, to, k);
      cube.position.z += Math.sin(Math.PI * k) * 0.6;
      cube.scale.setScalar(s0 + (scale - s0) * k);
    }, ease.out);
  }

  place(cube, i) {
    this.slots[i] = cube;
    cube.userData.slot = i;
    if (this.glow === cube) this.glow = null;
    sfx.pop();
    return this.move(cube, this.slotPos[i], Math.min(1, (this.sw * 0.82) / this.cs));
  }

  unplace(cube) {
    this.slots[cube.userData.slot] = null;
    cube.userData.slot = -1;
    return this.move(cube, cube.userData.home, 1);
  }

  pointer(type, ray) {
    if (type !== 'down' || this.locked) return false;
    const hit = ray.intersectObjects(this.cubes, true)[0];
    if (!hit) return false;
    let cube = hit.object;
    while (cube && !this.cubes.includes(cube)) cube = cube.parent;
    if (!cube) return false;
    if (cube.userData.slot >= 0) {
      this.unplace(cube);
      sfx.tap();
    } else {
      const i = this.slots.indexOf(null);
      if (i < 0) return true;
      this.place(cube, i).then(() => {
        if (!this.slots.includes(null) && !this.locked) this.ctx.onComplete?.();
      });
    }
    this.ctx.onChange?.();
    return true;
  }

  clear() {
    for (const c of this.cubes) if (c.userData.slot >= 0) this.unplace(c);
  }

  value() {
    return this.slots.includes(null) ? null : this.slots.map((c) => c.userData.letter).join('');
  }

  hint() {
    const i = this.slots.findIndex((c, k) => c?.userData.letter !== this.word[k]);
    if (i < 0) return;
    for (let k = i; k < this.slots.length; k++) if (this.slots[k]) this.unplace(this.slots[k]);
    this.glow = this.cubes.find((c) => c.userData.slot < 0 && c.userData.letter === this.word[i]) || null;
  }

  async reveal() {
    this.locked = true;
    this.glow = null;
    this.slots.forEach((c, k) => {
      if (c && c.userData.letter !== this.word[k]) this.unplace(c);
    });
    for (let k = 0; k < this.word.length; k++) {
      if (this.slots[k]) continue;
      const c = this.cubes.find((x) => x.userData.slot < 0 && x.userData.letter === this.word[k]);
      if (c) await this.place(c, k);
    }
  }
}
