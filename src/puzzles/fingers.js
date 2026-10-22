import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Puzzle, std } from './common.js';
import { textMesh } from '../text.js';
import { tween, ease } from '../tween.js';
import { sfx } from '../sound.js';

const SKIN = '#ffcf9e', TENS = '#4cc9f0', ONES = '#ff8fab', DOWN = '#c9b8a6';
// pinky → thumb for the left hand: x on the palm, length, tilt
const LEFT = [[-0.78, 1.2, 0.12], [-0.27, 1.55, 0.04], [0.25, 1.75, 0], [0.75, 1.55, -0.06], [1.2, 1.15, -0.5]];

// The 9s finger trick: fold finger n; fingers before it are tens, fingers after it are ones.
export class FingersPuzzle extends Puzzle {
  constructor(q, ctx) {
    super(q, ctx);
    this.n = this.v.n || 4;
    this.folded = null;
    this.fingers = [];
    for (const side of [-1, 1]) {
      const hand = new THREE.Group();
      hand.position.set(side * 2.75, -1.1, 0);
      const palm = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.9, 0.5, 3, 0.35), std(SKIN));
      hand.add(palm);
      this.group.add(hand);
      // numbered 1–10 left to right: left hand pinky → thumb, right hand (mirrored) thumb → pinky
      const order = side < 0 ? LEFT : [...LEFT].reverse();
      order.forEach(([x, len, tilt], j) => {
        const pivot = new THREE.Group();
        pivot.position.set(-side * x, len < 1.2 ? 0.25 : 0.8, 0);
        pivot.rotation.z = -side * tilt;
        const mat = std(SKIN);
        const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, len - 0.46, 4, 10), mat);
        f.position.y = len / 2;
        pivot.add(f);
        const num = textMesh(String(this.fingers.length + 1), 0.42, { color: '#5a4636', weight: 700 });
        num.position.set(0, len - 0.25, 0.3);
        pivot.add(num);
        hand.add(pivot);
        this.fingers.push({ pivot, mesh: f, mat, len, hand, j });
      });
    }
    this.hitMeshes = this.fingers.map((f) => f.mesh);
    this.tens = textMesh(' ', 0.62, { color: '#ffffff', bg: '#1b98c9', weight: 700 });
    this.ones = textMesh(' ', 0.62, { color: '#ffffff', bg: '#e85d8c', weight: 700 });
    this.result = textMesh(' ', 0.8, { color: '#ffffff', bg: '#06a77d', weight: 700 });
    this.result.position.set(0, 3.1, 0.3);
    for (const m of [this.tens, this.ones, this.result]) {
      m.visible = false;
      this.group.add(m);
    }
  }

  fold(n) {
    if (this.folded === n) return;
    const prev = this.folded;
    this.folded = n;
    this.fingers.forEach((f, i) => {
      const target = i + 1 === n ? 0.25 : 1;
      const from = f.pivot.scale.y;
      if (from !== target) tween(0.35, (k) => f.pivot.scale.set(1, from + (target - from) * k, 1), ease.back);
      f.mat.color.set(i + 1 === n ? DOWN : i + 1 < n ? TENS : ONES);
    });
    if (prev == null) sfx.pop();
    else sfx.tick();
    this.group.updateMatrixWorld(true);
    const t = n - 1, o = 10 - n;
    const avg = (from, to) => {
      const xs = [];
      for (let i = from; i < to; i++) xs.push(this.fingers[i].hand.position.x + this.fingers[i].pivot.position.x);
      return xs.length ? xs.reduce((a, b) => a + b) / xs.length : null;
    };
    const foldX = this.fingers[n - 1].hand.position.x + this.fingers[n - 1].pivot.position.x;
    this.tens.setText(`${t} ten${t === 1 ? '' : 's'}`);
    this.ones.setText(`${o} one${o === 1 ? '' : 's'}`);
    this.tens.position.set(Math.max(-4.6, avg(0, n - 1) ?? foldX - 1.2), 2.05, 0.3);
    this.ones.position.set(Math.min(4.6, avg(n, 10) ?? foldX + 1.2), 2.05, 0.3);
    if (Math.abs(this.ones.position.x - this.tens.position.x) < 2.2) {
      this.tens.position.x = foldX - 1.15;
      this.ones.position.x = foldX + 1.15;
    }
    this.tens.visible = this.ones.visible = true;
    if (this.result.visible) this.showResult();
  }

  showResult() {
    this.result.visible = true;
    this.result.setText(`9 × ${this.folded} = ${9 * this.folded}`);
  }

  pointer(type, ray) {
    if (type !== 'down' || this.locked) return false;
    const hit = ray.intersectObjects(this.hitMeshes)[0];
    if (!hit) return false;
    this.fold(this.hitMeshes.indexOf(hit.object) + 1);
    this.showResult();
    return true;
  }

  hint() {
    this.fold(this.n);
  }

  reveal() {
    if (this.folded == null) this.fold(this.n);
    this.showResult();
  }
}
